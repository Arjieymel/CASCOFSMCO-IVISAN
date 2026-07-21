<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\JournalVoucher;
use App\Models\ActivityLog;
use App\Http\Requests\StoreJournalVoucherRequest;
use App\Http\Requests\UpdateJournalVoucherRequest;
use Illuminate\Http\Request;
use Carbon\Carbon;

class JournalVoucherController extends Controller
{
    public function index(Request $request)
    {
        $query = JournalVoucher::with('user');

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function($q) use ($search) {
                $q->where('voucher_number', 'like', "%{$search}%")
                  ->orWhere('description', 'like', "%{$search}%")
                  ->orWhere('debit_account', 'like', "%{$search}%")
                  ->orWhere('credit_account', 'like', "%{$search}%")
                  ->orWhere('prepared_by', 'like', "%{$search}%")
                  ->orWhere('approved_by', 'like', "%{$search}%");
            });
        }

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        if ($request->filled('start_date') && $request->filled('end_date')) {
            $query->whereBetween('voucher_date', [$request->start_date, $request->end_date]);
        }

        $sortColumn = $request->input('sort_by', 'voucher_date');
        $sortDirection = $request->input('order', 'desc');
        $allowedSorts = ['id', 'voucher_number', 'voucher_date', 'debit_account', 'credit_account', 'amount', 'status'];

        if (in_array($sortColumn, $allowedSorts)) {
            $query->orderBy($sortColumn, $sortDirection);
        } else {
            $query->orderBy('voucher_date', 'desc');
        }

        $perPage = $request->input('per_page', 10);
        $records = $query->paginate($perPage);

        return response()->json($records);
    }

    public function store(StoreJournalVoucherRequest $request)
    {
        $data = $request->validated();

        if (empty($data['voucher_number'])) {
            $year = Carbon::parse($data['voucher_date'])->year;
            $latest = JournalVoucher::where('voucher_number', 'like', "JV-{$year}-%")->orderBy('id', 'desc')->first();
            $seq = 1;
            if ($latest) {
                $parts = explode('-', $latest->voucher_number);
                $seq = ((int)end($parts)) + 1;
            }
            $data['voucher_number'] = sprintf("JV-%d-%04d", $year, $seq);
        }

        if (empty($data['prepared_by'])) {
            $data['prepared_by'] = $request->user()->username;
        }

        $data['user_id'] = $request->user()->id;

        $record = JournalVoucher::create($data);

        ActivityLog::create([
            'user_id' => $request->user()->id,
            'username' => $request->user()->username,
            'action' => "Created Journal Voucher: {$record->voucher_number} (Amount: ₱{$record->amount}, Status: {$record->status})",
            'ip_address' => $request->ip()
        ]);

        return response()->json([
            'message' => 'Journal Voucher created successfully',
            'data' => $record
        ], 201);
    }

    public function show($id)
    {
        $record = JournalVoucher::with('user')->find($id);

        if (!$record) {
            return response()->json(['message' => 'Journal Voucher not found'], 404);
        }

        return response()->json($record);
    }

    public function update(UpdateJournalVoucherRequest $request, $id)
    {
        $record = JournalVoucher::find($id);

        if (!$record) {
            return response()->json(['message' => 'Journal Voucher not found'], 404);
        }

        $data = $request->validated();
        $record->update($data);

        ActivityLog::create([
            'user_id' => $request->user()->id,
            'username' => $request->user()->username,
            'action' => "Updated Journal Voucher: {$record->voucher_number}",
            'ip_address' => $request->ip()
        ]);

        return response()->json([
            'message' => 'Journal Voucher updated successfully',
            'data' => $record
        ]);
    }

    public function destroy(Request $request, $id)
    {
        $record = JournalVoucher::find($id);

        if (!$record) {
            return response()->json(['message' => 'Journal Voucher not found'], 404);
        }

        $vn = $record->voucher_number;
        $record->delete();

        ActivityLog::create([
            'user_id' => $request->user()->id,
            'username' => $request->user()->username,
            'action' => "Deleted Journal Voucher: {$vn}",
            'ip_address' => $request->ip()
        ]);

        return response()->json([
            'message' => 'Journal Voucher deleted successfully'
        ]);
    }
}
