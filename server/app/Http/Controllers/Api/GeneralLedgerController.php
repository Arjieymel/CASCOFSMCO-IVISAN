<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\GeneralLedger;
use App\Models\CashDisbursementJournal;
use App\Models\CashReceiptsJournal;
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
            $query->orderBy($sortColumn, $sortDirection)->orderBy('id', $sortDirection);
        } else {
            $query->orderBy('transaction_date', 'desc')->orderBy('id', 'desc');
        }

        $perPage = $request->input('per_page', 10);

        // Calculate accurate query totals for double-entry verification BEFORE paginate
        // (paginate() adds limit/offset to the query builder, which would make sum() only cover one page)
        $totalDebit = (clone $query)->sum('debit');
        $totalCredit = (clone $query)->sum('credit');

        $records = $query->paginate($perPage);

        // Get distinct accounts list for dropdown filters
        $accounts = GeneralLedger::select('account_code', 'account_title')
            ->distinct()
            ->orderBy('account_code', 'asc')
            ->get();

        // Overall general ledger balance across all accounts
        $overallDebit = GeneralLedger::sum('debit');
        $overallCredit = GeneralLedger::sum('credit');
        $isOverallBalanced = abs((float)$overallDebit - (float)$overallCredit) < 0.01;

        $hasAccountFilter = $request->filled('account_code') || $request->filled('account_title');
        $isBalanced = $hasAccountFilter ? $isOverallBalanced : (abs((float)$totalDebit - (float)$totalCredit) < 0.01);

        return response()->json([
            'records' => $records,
            'accounts' => $accounts,
            'totals' => [
                'total_debit' => round((float)$totalDebit, 2),
                'total_credit' => round((float)$totalCredit, 2),
                'is_balanced' => $isBalanced,
                'overall_debit' => round((float)$overallDebit, 2),
                'overall_credit' => round((float)$overallCredit, 2),
                'is_overall_balanced' => $isOverallBalanced,
            ]
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

            \App\Services\AccountingService::syncGeneralLedger();

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

        $record = null;
        DB::transaction(function () use ($data, &$record, $request) {
            $record = GeneralLedger::create($data);
            \App\Services\AccountingService::syncGeneralLedger();

            ActivityLog::create([
                'user_id' => $request->user()->id,
                'username' => $request->user()->username,
                'action' => "Added General Ledger entry: Ref {$record->reference_number} ({$record->account_title})",
                'ip_address' => $request->ip()
            ]);
        });

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
        DB::transaction(function () use ($record, $data, $id, $request) {
            $record->update($data);
            \App\Services\AccountingService::syncGeneralLedger();

            ActivityLog::create([
                'user_id' => $request->user()->id,
                'username' => $request->user()->username,
                'action' => "Updated General Ledger entry ID {$id}: Ref {$record->reference_number}",
                'ip_address' => $request->ip()
            ]);
        });

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
        DB::transaction(function () use ($record, $ref, $request) {
            $record->delete();
            \App\Services\AccountingService::syncGeneralLedger();

            ActivityLog::create([
                'user_id' => $request->user()->id,
                'username' => $request->user()->username,
                'action' => "Deleted General Ledger entry: Ref {$ref}",
                'ip_address' => $request->ip()
            ]);
        });

        return response()->json([
            'message' => 'General Ledger record deleted successfully'
        ]);
    }
}
