<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Sale;
use App\Models\ActivityLog;
use Illuminate\Http\Request;
use Carbon\Carbon;

class SaleController extends Controller
{
    /**
     * Display a listing of sales.
     */
    public function index(Request $request)
    {
        $query = Sale::query();

        // Search
        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function($q) use ($search) {
                $q->where('invoice_no', 'like', "%{$search}%")
                  ->orWhere('buyer', 'like', "%{$search}%")
                  ->orWhere('product', 'like', "%{$search}%")
                  ->orWhere('remarks', 'like', "%{$search}%");
            });
        }

        // Filters
        if ($request->filled('payment_method')) {
            $query->where('payment_method', $request->payment_method);
        }

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        if ($request->filled('start_date') && $request->filled('end_date')) {
            $query->whereBetween('sale_date', [$request->start_date, $request->end_date]);
        }

        // Sorting
        $sortColumn = $request->input('sort_by', 'sale_date');
        $sortDirection = $request->input('order', 'desc');
        
        $allowedSorts = ['id', 'invoice_no', 'buyer', 'product', 'quantity', 'unit_price', 'total_amount', 'payment_method', 'status', 'sale_date'];
        if (in_array($sortColumn, $allowedSorts)) {
            $query->orderBy($sortColumn, $sortDirection);
        } else {
            $query->orderBy('sale_date', 'desc');
        }

        $perPage = $request->input('per_page', 10);
        $sales = $query->paginate($perPage);

        return response()->json($sales);
    }

    /**
     * Store a newly created sale in storage.
     */
    public function store(Request $request)
    {
        $request->validate([
            'buyer' => 'required|string|max:150',
            'product' => 'required|string|max:100',
            'quantity' => 'required|numeric|min:0.01',
            'unit' => 'required|string|max:20',
            'unit_price' => 'required|numeric|min:0.01',
            'payment_method' => 'required|string|in:Cash,GCash,Bank Transfer,Check',
            'remarks' => 'nullable|string',
            'status' => 'required|string|in:Paid,Pending,Cancelled',
            'sale_date' => 'required|date',
        ]);

        // Auto calculate total
        $totalAmount = $request->quantity * $request->unit_price;

        // Auto-generate invoice number (INV-YYYY-XXXX)
        $year = Carbon::parse($request->sale_date)->year;
        $latestSale = Sale::where('invoice_no', 'like', "INV-{$year}-%")->orderBy('id', 'desc')->first();
        if ($latestSale) {
            $parts = explode('-', $latestSale->invoice_no);
            $seq = (int)end($parts);
            $newSeq = $seq + 1;
        } else {
            $newSeq = 1;
        }
        $invoiceNo = sprintf("INV-%d-%04d", $year, $newSeq);

        $data = $request->all();
        $data['invoice_no'] = $invoiceNo;
        $data['total_amount'] = $totalAmount;

        $sale = Sale::create($data);

        // Log action
        ActivityLog::create([
            'user_id' => $request->user()?->id,
            'username' => $request->user()?->username,
            'action' => "Recorded Sale: Invoice {$invoiceNo} to {$sale->buyer} (Total: ₱" . number_format($totalAmount, 2) . ")",
            'ip_address' => $request->ip()
        ]);

        return response()->json([
            'message' => 'Sales record created successfully',
            'sale' => $sale
        ], 201);
    }

    /**
     * Display the specified sale.
     */
    public function show($id)
    {
        $sale = Sale::find($id);

        if (!$sale) {
            return response()->json(['message' => 'Sales record not found'], 404);
        }

        return response()->json($sale);
    }

    /**
     * Update the specified sale in storage.
     */
    public function update(Request $request, $id)
    {
        $sale = Sale::find($id);

        if (!$sale) {
            return response()->json(['message' => 'Sales record not found'], 404);
        }

        $request->validate([
            'buyer' => 'required|string|max:150',
            'product' => 'required|string|max:100',
            'quantity' => 'required|numeric|min:0.01',
            'unit' => 'required|string|max:20',
            'unit_price' => 'required|numeric|min:0.01',
            'payment_method' => 'required|string|in:Cash,GCash,Bank Transfer,Check',
            'remarks' => 'nullable|string',
            'status' => 'required|string|in:Paid,Pending,Cancelled',
            'sale_date' => 'required|date',
        ]);

        // Auto calculate total
        $totalAmount = $request->quantity * $request->unit_price;

        $data = $request->all();
        $data['total_amount'] = $totalAmount;

        $sale->update($data);

        // Log action
        ActivityLog::create([
            'user_id' => $request->user()?->id,
            'username' => $request->user()?->username,
            'action' => "Updated Sale ID {$id} (Invoice {$sale->invoice_no}) to {$sale->buyer} (Total: ₱" . number_format($totalAmount, 2) . ")",
            'ip_address' => $request->ip()
        ]);

        return response()->json([
            'message' => 'Sales record updated successfully',
            'sale' => $sale
        ]);
    }

    /**
     * Remove the specified sale from storage.
     */
    public function destroy(Request $request, $id)
    {
        $sale = Sale::find($id);

        if (!$sale) {
            return response()->json(['message' => 'Sales record not found'], 404);
        }

        // Log action
        ActivityLog::create([
            'user_id' => $request->user()?->id,
            'username' => $request->user()?->username,
            'action' => "Deleted Sale: Invoice {$sale->invoice_no} to {$sale->buyer}",
            'ip_address' => $request->ip()
        ]);

        $sale->delete();

        return response()->json([
            'message' => 'Sales record deleted successfully'
        ]);
    }
}
