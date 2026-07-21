<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CashSalesBook;
use App\Models\ActivityLog;
use App\Http\Requests\StoreCashSalesBookRequest;
use App\Http\Requests\UpdateCashSalesBookRequest;
use Illuminate\Http\Request;
use Carbon\Carbon;

class CashSalesBookController extends Controller
{
    public function index(Request $request)
    {
        $query = CashSalesBook::with('user');

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function($q) use ($search) {
                $q->where('invoice_number', 'like', "%{$search}%")
                  ->orWhere('customer', 'like', "%{$search}%")
                  ->orWhere('product', 'like', "%{$search}%")
                  ->orWhere('payment_method', 'like', "%{$search}%")
                  ->orWhere('recorded_by', 'like', "%{$search}%");
            });
        }

        if ($request->filled('start_date') && $request->filled('end_date')) {
            $query->whereBetween('sale_date', [$request->start_date, $request->end_date]);
        }

        $sortColumn = $request->input('sort_by', 'sale_date');
        $sortDirection = $request->input('order', 'desc');
        $allowedSorts = ['id', 'invoice_number', 'sale_date', 'customer', 'product', 'quantity', 'unit_price', 'total_amount', 'payment_method'];

        if (in_array($sortColumn, $allowedSorts)) {
            $query->orderBy($sortColumn, $sortDirection);
        } else {
            $query->orderBy('sale_date', 'desc');
        }

        $perPage = $request->input('per_page', 10);
        $records = $query->paginate($perPage);

        return response()->json($records);
    }

    public function store(StoreCashSalesBookRequest $request)
    {
        $data = $request->validated();

        if (empty($data['invoice_number'])) {
            $year = Carbon::parse($data['sale_date'])->year;
            $latest = CashSalesBook::where('invoice_number', 'like', "CRSB-{$year}-%")->orderBy('id', 'desc')->first();
            $seq = 1;
            if ($latest) {
                $parts = explode('-', $latest->invoice_number);
                $seq = ((int)end($parts)) + 1;
            }
            $data['invoice_number'] = sprintf("CRSB-%d-%04d", $year, $seq);
        }

        $data['total_amount'] = (float)$data['quantity'] * (float)$data['unit_price'];
        $data['user_id'] = $request->user()->id;
        $data['recorded_by'] = $request->user()->username;

        $record = CashSalesBook::create($data);

        ActivityLog::create([
            'user_id' => $request->user()->id,
            'username' => $request->user()->username,
            'action' => "Recorded Sales Book entry: Invoice {$record->invoice_number} to {$record->customer} (Total: ₱{$record->total_amount})",
            'ip_address' => $request->ip()
        ]);

        return response()->json([
            'message' => 'Sales record created successfully',
            'data' => $record
        ], 201);
    }

    public function show($id)
    {
        $record = CashSalesBook::with('user')->find($id);

        if (!$record) {
            return response()->json(['message' => 'Sales record not found'], 404);
        }

        return response()->json($record);
    }

    public function update(UpdateCashSalesBookRequest $request, $id)
    {
        $record = CashSalesBook::find($id);

        if (!$record) {
            return response()->json(['message' => 'Sales record not found'], 404);
        }

        $data = $request->validated();
        $data['total_amount'] = (float)$data['quantity'] * (float)$data['unit_price'];

        $record->update($data);

        ActivityLog::create([
            'user_id' => $request->user()->id,
            'username' => $request->user()->username,
            'action' => "Updated Sales Book entry: Invoice {$record->invoice_number}",
            'ip_address' => $request->ip()
        ]);

        return response()->json([
            'message' => 'Sales record updated successfully',
            'data' => $record
        ]);
    }

    public function destroy(Request $request, $id)
    {
        $record = CashSalesBook::find($id);

        if (!$record) {
            return response()->json(['message' => 'Sales record not found'], 404);
        }

        $inv = $record->invoice_number;
        $record->delete();

        ActivityLog::create([
            'user_id' => $request->user()->id,
            'username' => $request->user()->username,
            'action' => "Deleted Sales Book entry: Invoice {$inv}",
            'ip_address' => $request->ip()
        ]);

        return response()->json([
            'message' => 'Sales record deleted successfully'
        ]);
    }
}
