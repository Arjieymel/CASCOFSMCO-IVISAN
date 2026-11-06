<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CashDisbursementJournal;
use App\Models\ActivityLog;
use App\Http\Requests\StoreCashDisbursementRequest;
use App\Http\Requests\UpdateCashDisbursementRequest;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class CashDisbursementController extends Controller
{
    public function index(Request $request)
    {
        $query = CashDisbursementJournal::with('user');

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function($q) use ($search) {
                $q->where('voucher_number', 'like', "%{$search}%")
                  ->orWhere('payee', 'like', "%{$search}%")
                  ->orWhere('description', 'like', "%{$search}%")
                  ->orWhere('expense_account', 'like', "%{$search}%")
                  ->orWhere('payment_method', 'like', "%{$search}%")
                  ->orWhere('approved_by', 'like', "%{$search}%");
            });
        }

        if ($request->filled('expense_account')) {
            $query->where('expense_account', $request->expense_account);
        }

        if ($request->filled('start_date') && $request->filled('end_date')) {
            $query->whereBetween('disbursement_date', [$request->start_date, $request->end_date]);
        }

        $sortColumn = $request->input('sort_by', 'disbursement_date');
        $sortDirection = $request->input('order', 'desc');
        $allowedSorts = ['id', 'voucher_number', 'disbursement_date', 'payee', 'expense_account', 'amount', 'payment_method'];

        if (in_array($sortColumn, $allowedSorts)) {
            $query->orderBy($sortColumn, $sortDirection);
        } else {
            $query->orderBy('disbursement_date', 'desc');
        }

        $perPage = $request->input('per_page', 10);
        $records = $query->paginate($perPage);

        return response()->json($records);
    }

    public function store(StoreCashDisbursementRequest $request)
    {
        $data = $request->validated();

        if (empty($data['voucher_number'])) {
            $year = Carbon::parse($data['disbursement_date'])->year;
            $latest = CashDisbursementJournal::where('voucher_number', 'like', "CDV-{$year}-%")->orderBy('id', 'desc')->first();
            $seq = 1;
            if ($latest) {
                $parts = explode('-', $latest->voucher_number);
                $seq = ((int)end($parts)) + 1;
            }
            $data['voucher_number'] = sprintf("CDV-%d-%04d", $year, $seq);
        }

        $data['user_id'] = $request->user()->id;

        $record = null;
        DB::transaction(function () use ($data, &$record, $request) {
            $record = CashDisbursementJournal::create($data);
            \App\Services\AccountingService::syncGeneralLedger();

            ActivityLog::create([
                'user_id' => $request->user()->id,
                'username' => $request->user()->username,
                'action' => "Recorded Cash Disbursement: Voucher {$record->voucher_number} to {$record->payee} (Amount: ₱{$record->amount})",
                'ip_address' => $request->ip()
            ]);
        });

        return response()->json([
            'message' => 'Disbursement recorded successfully',
            'data' => $record
        ], 201);
    }

    public function show($id)
    {
        $record = CashDisbursementJournal::with('user')->find($id);

        if (!$record) {
            return response()->json(['message' => 'Cash Disbursement record not found'], 404);
        }

        return response()->json($record);
    }

    public function update(UpdateCashDisbursementRequest $request, $id)
    {
        $record = CashDisbursementJournal::find($id);

        if (!$record) {
            return response()->json(['message' => 'Cash Disbursement record not found'], 404);
        }

        $data = $request->validated();
        DB::transaction(function () use ($record, $data, $request) {
            $record->update($data);
            \App\Services\AccountingService::syncGeneralLedger();

            ActivityLog::create([
                'user_id' => $request->user()->id,
                'username' => $request->user()->username,
                'action' => "Updated Cash Disbursement Voucher: {$record->voucher_number}",
                'ip_address' => $request->ip()
            ]);
        });

        return response()->json([
            'message' => 'Disbursement updated successfully',
            'data' => $record
        ]);
    }

    public function destroy(Request $request, $id)
    {
        $record = CashDisbursementJournal::find($id);

        if (!$record) {
            return response()->json(['message' => 'Cash Disbursement record not found'], 404);
        }

        $vn = $record->voucher_number;
        DB::transaction(function () use ($record, $vn, $request) {
            $record->delete();
            \App\Services\AccountingService::syncGeneralLedger();

            ActivityLog::create([
                'user_id' => $request->user()->id,
                'username' => $request->user()->username,
                'action' => "Deleted Cash Disbursement Voucher: {$vn}",
                'ip_address' => $request->ip()
            ]);
        });

        return response()->json([
            'message' => 'Disbursement voucher deleted successfully'
        ]);
    }
}
