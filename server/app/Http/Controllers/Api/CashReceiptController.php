<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CashReceiptsJournal;
use App\Models\ActivityLog;
use App\Http\Requests\StoreCashReceiptRequest;
use App\Http\Requests\UpdateCashReceiptRequest;
use Illuminate\Http\Request;
use Carbon\Carbon;

class CashReceiptController extends Controller
{
    public function index(Request $request)
    {
        $query = CashReceiptsJournal::with('user');

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function($q) use ($search) {
                $q->where('or_number', 'like', "%{$search}%")
                  ->orWhere('received_from', 'like', "%{$search}%")
                  ->orWhere('description', 'like', "%{$search}%")
                  ->orWhere('source_of_income', 'like', "%{$search}%")
                  ->orWhere('recorded_by', 'like', "%{$search}%")
                  ->orWhere('remarks', 'like', "%{$search}%");
            });
        }

        if ($request->filled('start_date') && $request->filled('end_date')) {
            $query->whereBetween('receipt_date', [$request->start_date, $request->end_date]);
        }

        $sortColumn = $request->input('sort_by', 'receipt_date');
        $sortDirection = $request->input('order', 'desc');
        $allowedSorts = ['id', 'or_number', 'receipt_date', 'received_from', 'source_of_income', 'amount_received', 'recorded_by'];

        if (in_array($sortColumn, $allowedSorts)) {
            $query->orderBy($sortColumn, $sortDirection);
        } else {
            $query->orderBy('receipt_date', 'desc');
        }

        $perPage = $request->input('per_page', 10);
        $records = $query->paginate($perPage);

        return response()->json($records);
    }

    public function store(StoreCashReceiptRequest $request)
    {
        $data = $request->validated();

        if (empty($data['or_number'])) {
            $year = Carbon::parse($data['receipt_date'])->year;
            $latest = CashReceiptsJournal::where('or_number', 'like', "OR-{$year}-%")->orderBy('id', 'desc')->first();
            $seq = 1;
            if ($latest) {
                $parts = explode('-', $latest->or_number);
                $seq = ((int)end($parts)) + 1;
            }
            $data['or_number'] = sprintf("OR-%d-%04d", $year, $seq);
        }

        $data['user_id'] = $request->user()->id;
        $data['recorded_by'] = $request->user()->username;

        $record = CashReceiptsJournal::create($data);

        ActivityLog::create([
            'user_id' => $request->user()->id,
            'username' => $request->user()->username,
            'action' => "Recorded Cash Receipt: OR {$record->or_number} from {$record->received_from} (Amount: ₱{$record->amount_received})",
            'ip_address' => $request->ip()
        ]);

        return response()->json([
            'message' => 'Cash receipt recorded successfully',
            'data' => $record
        ], 201);
    }

    public function show($id)
    {
        $record = CashReceiptsJournal::with('user')->find($id);

        if (!$record) {
            return response()->json(['message' => 'Cash Receipt record not found'], 404);
        }

        return response()->json($record);
    }

    public function update(UpdateCashReceiptRequest $request, $id)
    {
        $record = CashReceiptsJournal::find($id);

        if (!$record) {
            return response()->json(['message' => 'Cash Receipt record not found'], 404);
        }

        $data = $request->validated();
        $record->update($data);

        ActivityLog::create([
            'user_id' => $request->user()->id,
            'username' => $request->user()->username,
            'action' => "Updated Cash Receipt OR: {$record->or_number}",
            'ip_address' => $request->ip()
        ]);

        return response()->json([
            'message' => 'Cash receipt updated successfully',
            'data' => $record
        ]);
    }

    public function destroy(Request $request, $id)
    {
        $record = CashReceiptsJournal::find($id);

        if (!$record) {
            return response()->json(['message' => 'Cash Receipt record not found'], 404);
        }

        $or = $record->or_number;
        $record->delete();

        ActivityLog::create([
            'user_id' => $request->user()->id,
            'username' => $request->user()->username,
            'action' => "Deleted Cash Receipt OR: {$or}",
            'ip_address' => $request->ip()
        ]);

        return response()->json([
            'message' => 'Cash receipt record deleted successfully'
        ]);
    }
}
