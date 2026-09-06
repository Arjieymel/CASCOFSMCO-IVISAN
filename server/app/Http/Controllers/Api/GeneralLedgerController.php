<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\GeneralLedger;
use App\Models\CashRegisterBook;
use App\Models\CashDisbursementJournal;
use App\Models\CashSalesBook;
use App\Models\CashReceiptsJournal;
use App\Models\JournalVoucher;
use App\Models\ActivityLog;
use App\Http\Requests\StoreGeneralLedgerRequest;
use App\Http\Requests\UpdateGeneralLedgerRequest;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class GeneralLedgerController extends Controller
{
    /**
     * Display a listing of General Ledger entries (unified & standalone).
     */
    public function index(Request $request)
    {
        $query = GeneralLedger::query();

        // Search
        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function($q) use ($search) {
                $q->where('account_code', 'like', "%{$search}%")
                  ->orWhere('account_title', 'like', "%{$search}%")
                  ->orWhere('reference_number', 'like', "%{$search}%")
                  ->orWhere('description', 'like', "%{$search}%")
                  ->orWhere('source_module', 'like', "%{$search}%");
            });
        }

        // Account Filter
        if ($request->filled('account_code')) {
            $query->where('account_code', $request->account_code);
        }

        if ($request->filled('account_title')) {
            $query->where('account_title', 'like', "%{$request->account_title}%");
        }

        // Date Filter
        if ($request->filled('start_date') && $request->filled('end_date')) {
            $query->whereBetween('transaction_date', [$request->start_date, $request->end_date]);
        }

        $sortColumn = $request->input('sort_by', 'transaction_date');
        $sortDirection = $request->input('order', 'desc');
        $allowedSorts = ['id', 'account_code', 'account_title', 'transaction_date', 'reference_number', 'debit', 'credit', 'running_balance'];

        if (in_array($sortColumn, $allowedSorts)) {
            $query->orderBy($sortColumn, $sortDirection);
        } else {
            $query->orderBy('transaction_date', 'desc');
        }

        $perPage = $request->input('per_page', 10);
        $records = $query->paginate($perPage);

        // Get distinct accounts list for dropdown filters
        $accounts = GeneralLedger::select('account_code', 'account_title')
            ->distinct()
            ->orderBy('account_code', 'asc')
            ->get();

        return response()->json([
            'records' => $records,
            'accounts' => $accounts
        ]);
    }

    /**
     * Sync / Rebuild General Ledger from all Books of Accounts.
     */
    public function syncLedger(Request $request)
    {
        // Require Admin or Staff
        if ($request->user()->role !== 'Administrator' && $request->user()->role !== 'Staff') {
            return response()->json(['message' => 'Unauthorized access.'], 403);
        }

        try {
            Log::info('Initiating General Ledger synchronization by user ID: ' . $request->user()->id);

            DB::transaction(function() {
                // Delete existing records (using delete instead of truncate to prevent DDL implicit commits in MySQL transaction)
                GeneralLedger::query()->delete();

                $entries = [];

                // 1. Cash Register Books (Account 1010 - Cash on Hand)
                $cashRegisters = CashRegisterBook::all();
                foreach ($cashRegisters as $cr) {
                    $entries[] = [
                        'account_code' => '1010',
                        'account_title' => 'Cash on Hand',
                        'transaction_date' => $cr->date ? \Carbon\Carbon::parse($cr->date)->format('Y-m-d') : date('Y-m-d'),
                        'reference_number' => $cr->reference_no ?? '',
                        'debit' => (float)($cr->cash_in ?? 0),
                        'credit' => (float)($cr->cash_out ?? 0),
                        'running_balance' => (float)($cr->running_balance ?? 0),
                        'source_module' => 'Cash Register',
                        'description' => $cr->description ?? '',
                        'created_at' => $cr->created_at,
                        'updated_at' => $cr->updated_at,
                    ];
                }

                // 2. Cash Disbursement Journals (Account 5010 - Operating Expenses / Cash Outflow)
                $disbursements = CashDisbursementJournal::all();
                foreach ($disbursements as $cd) {
                    $entries[] = [
                        'account_code' => '5010',
                        'account_title' => 'Disbursements & Expenses (' . ($cd->expense_account ?? 'General') . ')',
                        'transaction_date' => $cd->disbursement_date ? \Carbon\Carbon::parse($cd->disbursement_date)->format('Y-m-d') : date('Y-m-d'),
                        'reference_number' => $cd->voucher_number ?? '',
                        'debit' => (float)($cd->amount ?? 0),
                        'credit' => 0.00,
                        'running_balance' => 0.00,
                        'source_module' => 'Cash Disbursement',
                        'description' => "Payee: {$cd->payee} - {$cd->description}",
                        'created_at' => $cd->created_at,
                        'updated_at' => $cd->updated_at,
                    ];
                }

                // 3. Cash Sales Books (Account 4010 - Sales Revenue)
                $sales = CashSalesBook::all();
                foreach ($sales as $sb) {
                    $entries[] = [
                        'account_code' => '4010',
                        'account_title' => 'Cooperative Sales Revenue',
                        'transaction_date' => $sb->sale_date ? \Carbon\Carbon::parse($sb->sale_date)->format('Y-m-d') : date('Y-m-d'),
                        'reference_number' => $sb->invoice_number ?? '',
                        'debit' => 0.00,
                        'credit' => (float)($sb->total_amount ?? 0),
                        'running_balance' => 0.00,
                        'source_module' => 'Sales Book',
                        'description' => "Customer: {$sb->customer} - {$sb->product} ({$sb->quantity} @ ₱{$sb->unit_price})",
                        'created_at' => $sb->created_at,
                        'updated_at' => $sb->updated_at,
                    ];
                }

                // 4. Cash Receipts Journals (Account 1020 - Cash Receipts & Income)
                $receipts = CashReceiptsJournal::all();
                foreach ($receipts as $crj) {
                    $entries[] = [
                        'account_code' => '1020',
                        'account_title' => 'Income & Receipts (' . ($crj->source_of_income ?? 'General') . ')',
                        'transaction_date' => $crj->receipt_date ? \Carbon\Carbon::parse($crj->receipt_date)->format('Y-m-d') : date('Y-m-d'),
                        'reference_number' => $crj->or_number ?? '',
                        'debit' => (float)($crj->amount_received ?? 0),
                        'credit' => 0.00,
                        'running_balance' => 0.00,
                        'source_module' => 'Cash Receipts',
                        'description' => "From: {$crj->received_from} - {$crj->description}",
                        'created_at' => $crj->created_at,
                        'updated_at' => $crj->updated_at,
                    ];
                }

                // 5. Journal Vouchers (Account 3010 / Adjustment Accounts)
                $vouchers = JournalVoucher::where('status', 'Posted')->orWhere('status', 'Approved')->get();
                foreach ($vouchers as $jv) {
                    $entries[] = [
                        'account_code' => '3010',
                        'account_title' => "Debit: {$jv->debit_account} / Credit: {$jv->credit_account}",
                        'transaction_date' => $jv->voucher_date ? \Carbon\Carbon::parse($jv->voucher_date)->format('Y-m-d') : date('Y-m-d'),
                        'reference_number' => $jv->voucher_number ?? '',
                        'debit' => (float)($jv->amount ?? 0),
                        'credit' => (float)($jv->amount ?? 0),
                        'running_balance' => 0.00,
                        'source_module' => 'Journal Voucher',
                        'description' => $jv->description ?? '',
                        'created_at' => $jv->created_at,
                        'updated_at' => $jv->updated_at,
                    ];
                }

                // Sort entries chronologically and calculate running balances
                usort($entries, function($a, $b) {
                    return strcmp($a['transaction_date'], $b['transaction_date']);
                });

                $runningBal = 0.00;
                foreach ($entries as &$e) {
                    $runningBal += ($e['debit'] - $e['credit']);
                    $e['running_balance'] = $runningBal;
                }

                foreach ($entries as $e) {
                    GeneralLedger::create($e);
                }
            });

            ActivityLog::create([
                'user_id' => $request->user()->id,
                'username' => $request->user()->username,
                'action' => 'Synchronized General Ledger with all Books of Accounts.',
                'ip_address' => $request->ip()
            ]);

            return response()->json([
                'message' => 'General Ledger synchronized successfully.'
            ]);
        } catch (\Throwable $e) {
            Log::error('General Ledger synchronization failed: ' . $e->getMessage(), [
                'exception' => $e,
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'message' => 'Failed to synchronize General Ledger: ' . $e->getMessage()
            ], 500);
        }
    }

    public function store(StoreGeneralLedgerRequest $request)
    {
        $data = $request->validated();
        if (empty($data['source_module'])) {
            $data['source_module'] = 'General Ledger';
        }

        $lastEntry = GeneralLedger::orderBy('transaction_date', 'desc')->orderBy('id', 'desc')->first();
        $prevBal = $lastEntry ? (float)$lastEntry->running_balance : 0.00;
        $data['running_balance'] = $prevBal + (float)$data['debit'] - (float)$data['credit'];

        $record = GeneralLedger::create($data);

        ActivityLog::create([
            'user_id' => $request->user()->id,
            'username' => $request->user()->username,
            'action' => "Added General Ledger entry: Ref {$record->reference_number} ({$record->account_title})",
            'ip_address' => $request->ip()
        ]);

        return response()->json([
            'message' => 'General Ledger entry created successfully',
            'data' => $record
        ], 201);
    }

    public function show($id)
    {
        $record = GeneralLedger::find($id);

        if (!$record) {
            return response()->json(['message' => 'General Ledger record not found'], 404);
        }

        return response()->json($record);
    }

    public function update(UpdateGeneralLedgerRequest $request, $id)
    {
        $record = GeneralLedger::find($id);

        if (!$record) {
            return response()->json(['message' => 'General Ledger record not found'], 404);
        }

        $data = $request->validated();
        $record->update($data);

        ActivityLog::create([
            'user_id' => $request->user()->id,
            'username' => $request->user()->username,
            'action' => "Updated General Ledger entry ID {$id}: Ref {$record->reference_number}",
            'ip_address' => $request->ip()
        ]);

        return response()->json([
            'message' => 'General Ledger entry updated successfully',
            'data' => $record
        ]);
    }

    public function destroy(Request $request, $id)
    {
        $record = GeneralLedger::find($id);

        if (!$record) {
            return response()->json(['message' => 'General Ledger record not found'], 404);
        }

        $ref = $record->reference_number;
        $record->delete();

        ActivityLog::create([
            'user_id' => $request->user()->id,
            'username' => $request->user()->username,
            'action' => "Deleted General Ledger entry: Ref {$ref}",
            'ip_address' => $request->ip()
        ]);

        return response()->json([
            'message' => 'General Ledger record deleted successfully'
        ]);
    }
}
