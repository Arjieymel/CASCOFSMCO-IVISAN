<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CashRegisterBook;
use App\Models\ActivityLog;
use App\Http\Requests\StoreCashRegisterRequest;
use App\Http\Requests\UpdateCashRegisterRequest;
use Illuminate\Http\Request;
use Carbon\Carbon;

class CashRegisterController extends Controller
{
    /**
     * Recalculate running balances for cash register records chronologically.
     */
    private function recalculateRunningBalances()
    {
        $records = CashRegisterBook::orderBy('date', 'asc')->orderBy('id', 'asc')->get();
        $balance = 0.00;
        foreach ($records as $record) {
            $balance = $balance + (float)$record->cash_in - (float)$record->cash_out;
            $record->running_balance = $balance;
            $record->saveQuietly();
        }
    }

    public function index(Request $request)
    {
        $query = CashRegisterBook::with('user');

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function($q) use ($search) {
                $q->where('reference_no', 'like', "%{$search}%")
                  ->orWhere('description', 'like', "%{$search}%")
                  ->orWhere('recorded_by', 'like', "%{$search}%")
                  ->orWhere('remarks', 'like', "%{$search}%");
            });
        }

        if ($request->filled('start_date') && $request->filled('end_date')) {
            $query->whereBetween('date', [$request->start_date, $request->end_date]);
        }

        $sortColumn = $request->input('sort_by', 'date');
        $sortDirection = $request->input('order', 'desc');
        $allowedSorts = ['id', 'date', 'reference_no', 'cash_in', 'cash_out', 'running_balance', 'recorded_by'];

        if (in_array($sortColumn, $allowedSorts)) {
            $query->orderBy($sortColumn, $sortDirection);
        } else {
            $query->orderBy('date', 'desc');
        }

        $perPage = $request->input('per_page', 10);
        $records = $query->paginate($perPage);

        return response()->json($records);
    }

    public function store(StoreCashRegisterRequest $request)
    {
        $data = $request->validated();

        if (empty($data['reference_no'])) {
            $year = Carbon::parse($data['date'])->year;
            $latest = CashRegisterBook::where('reference_no', 'like', "CR-{$year}-%")->orderBy('id', 'desc')->first();
            $seq = 1;
            if ($latest) {
                $parts = explode('-', $latest->reference_no);
                $seq = ((int)end($parts)) + 1;
            }
            $data['reference_no'] = sprintf("CR-%d-%04d", $year, $seq);
        }

        $data['user_id'] = $request->user()->id;
        $data['recorded_by'] = $request->user()->username;

        $record = CashRegisterBook::create($data);
        $this->recalculateRunningBalances();
        $record->refresh();

        ActivityLog::create([
            'user_id' => $request->user()->id,
            'username' => $request->user()->username,
            'action' => "Added Cash Register entry: Ref {$record->reference_no} (In: ₱{$record->cash_in}, Out: ₱{$record->cash_out})",
            'ip_address' => $request->ip()
        ]);

        return response()->json([
            'message' => 'Cash Register entry added successfully',
            'data' => $record
        ], 201);
    }

    public function show($id)
    {
        $record = CashRegisterBook::with('user')->find($id);

        if (!$record) {
            return response()->json(['message' => 'Cash Register record not found'], 404);
        }

        return response()->json($record);
    }

    public function update(UpdateCashRegisterRequest $request, $id)
    {
        $record = CashRegisterBook::find($id);

        if (!$record) {
            return response()->json(['message' => 'Cash Register record not found'], 404);
        }

        $data = $request->validated();
        $record->update($data);
        $this->recalculateRunningBalances();
        $record->refresh();

        ActivityLog::create([
            'user_id' => $request->user()->id,
            'username' => $request->user()->username,
            'action' => "Updated Cash Register entry: Ref {$record->reference_no}",
            'ip_address' => $request->ip()
        ]);

        return response()->json([
            'message' => 'Cash Register entry updated successfully',
            'data' => $record
        ]);
    }

    public function destroy(Request $request, $id)
    {
        $record = CashRegisterBook::find($id);

        if (!$record) {
            return response()->json(['message' => 'Cash Register record not found'], 404);
        }

        $ref = $record->reference_no;
        $record->delete();
        $this->recalculateRunningBalances();

        ActivityLog::create([
            'user_id' => $request->user()->id,
            'username' => $request->user()->username,
            'action' => "Deleted Cash Register entry: Ref {$ref}",
            'ip_address' => $request->ip()
        ]);

        return response()->json([
            'message' => 'Cash Register record deleted successfully'
        ]);
    }
}
