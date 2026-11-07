<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Sale;
use App\Models\SalePayment;
use App\Models\CashReceiptsJournal;
use App\Models\ActivityLog;
use App\Services\AccountingService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class SaleController extends Controller
{
    /**
     * Display a listing of sales.
     */
    public function index(Request $request)
    {
        $query = Sale::query()->with(['cashReceipt', 'payments']);

        // Search
        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function($q) use ($search) {
                $q->where('invoice_no', 'like', "%{$search}%")
                  ->orWhere('buyer', 'like', "%{$search}%")
                  ->orWhere('product', 'like', "%{$search}%")
                  ->orWhere('unit', 'like', "%{$search}%")
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
        
        $allowedSorts = [
            'id', 'invoice_no', 'buyer', 'product', 'quantity', 'unit_price',
            'total_amount', 'paid_amount', 'remaining_balance', 'payment_method', 'status', 'sale_date'
        ];
        if (in_array($sortColumn, $allowedSorts)) {
            $query->orderBy($sortColumn, $sortDirection)->orderBy('id', 'desc');
        } else {
            $query->orderBy('sale_date', 'desc')->orderBy('id', 'desc');
        }

        $perPage = $request->input('per_page', 10);
        $sales = $query->paginate($perPage);

        return response()->json($sales);
    }

    /**
     * Store a newly created sale in storage.
     * Automatically integrates with Cash Receipts Journal and updates Cash/Bank Balance.
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
            'status' => 'required|string|in:Paid,Pending,Credit,Partially Paid,Cancelled',
            'sale_date' => 'required|date',
            'amount_received' => 'nullable|numeric|min:0',
            'or_number' => 'nullable|string|max:100',
        ]);

        $totalAmount = round((float)$request->quantity * (float)$request->unit_price, 2);

        // Determine paid amount and remaining balance based on status & payment collection
        $statusInput = $request->status;
        $amountReceivedInput = $request->filled('amount_received') ? (float)$request->amount_received : null;

        if ($statusInput === 'Paid') {
            $paidAmount = ($amountReceivedInput !== null) ? $amountReceivedInput : $totalAmount;
            if ($paidAmount >= $totalAmount) {
                $paidAmount = $totalAmount;
                $remainingBalance = 0.00;
                $finalStatus = 'Paid';
            } elseif ($paidAmount > 0) {
                $remainingBalance = round($totalAmount - $paidAmount, 2);
                $finalStatus = 'Partially Paid';
            } else {
                $paidAmount = 0.00;
                $remainingBalance = $totalAmount;
                $finalStatus = 'Pending';
            }
        } elseif ($statusInput === 'Pending' || $statusInput === 'Credit') {
            if ($amountReceivedInput !== null && $amountReceivedInput > 0) {
                $paidAmount = min($amountReceivedInput, $totalAmount);
                $remainingBalance = max(0.00, round($totalAmount - $paidAmount, 2));
                $finalStatus = ($remainingBalance <= 0) ? 'Paid' : 'Partially Paid';
            } else {
                $paidAmount = 0.00;
                $remainingBalance = $totalAmount;
                $finalStatus = $statusInput;
            }
        } elseif ($statusInput === 'Partially Paid') {
            $paidAmount = ($amountReceivedInput !== null) ? min($amountReceivedInput, $totalAmount) : 0.00;
            $remainingBalance = max(0.00, round($totalAmount - $paidAmount, 2));
            $finalStatus = ($remainingBalance <= 0) ? 'Paid' : 'Partially Paid';
        } else { // Cancelled
            $paidAmount = 0.00;
            $remainingBalance = 0.00;
            $finalStatus = 'Cancelled';
        }

        $sale = null;
        $cashReceipt = null;

        DB::transaction(function() use ($request, $totalAmount, $paidAmount, $remainingBalance, $finalStatus, &$sale, &$cashReceipt) {
            // Auto-generate invoice number (INV-YYYY-XXXX)
            $year = Carbon::parse($request->sale_date)->year;
            $latestSale = Sale::where('invoice_no', 'like', "INV-{$year}-%")->orderBy('id', 'desc')->first();
            $seq = 1;
            if ($latestSale) {
                $parts = explode('-', $latestSale->invoice_no);
                $seq = ((int)end($parts)) + 1;
            }
            $invoiceNo = sprintf("INV-%d-%04d", $year, $seq);

            $data = $request->except(['amount_received', 'or_number']);
            $data['invoice_no'] = $invoiceNo;
            $data['total_amount'] = $totalAmount;
            $data['paid_amount'] = $paidAmount;
            $data['remaining_balance'] = $remainingBalance;
            $data['status'] = $finalStatus;

            $sale = Sale::create($data);

            // Automatically record in Cash Receipts Journal ONLY if cash was actually received
            if ($paidAmount > 0 && $finalStatus !== 'Cancelled') {
                $orNumber = $request->or_number ? trim($request->or_number) : AccountingService::generateOrNumber($request->sale_date);

                $cleanRemarks = trim(preg_replace('/^\[Method:\s*[^\]]+\]\s*/', '', $request->remarks ?: ''));
                $receiptRemarks = trim("[Method: {$request->payment_method}] " . ($cleanRemarks ?: "Wholesale sales payment for {$invoiceNo}"));

                $cashReceipt = CashReceiptsJournal::create([
                    'or_number' => $orNumber,
                    'receipt_date' => $request->sale_date,
                    'received_from' => $sale->buyer,
                    'description' => "Sales Invoice: {$invoiceNo} - {$sale->product} ({$sale->quantity} {$sale->unit})",
                    'source_of_income' => 'Sales',
                    'amount_received' => $paidAmount,
                    'recorded_by' => $request->user()?->username ?: 'admin',
                    'user_id' => $request->user()?->id,
                    'sale_id' => $sale->id,
                    'remarks' => $receiptRemarks,
                ]);

                SalePayment::create([
                    'sale_id' => $sale->id,
                    'cash_receipt_id' => $cashReceipt->id,
                    'or_number' => $orNumber,
                    'payment_date' => $request->sale_date,
                    'amount' => $paidAmount,
                    'payment_method' => $request->payment_method,
                    'remarks' => $receiptRemarks,
                    'user_id' => $request->user()?->id,
                    'recorded_by' => $request->user()?->username ?: 'admin',
                ]);

                $sale->cash_receipt_id = $cashReceipt->id;
                $sale->saveQuietly();
            }

            // Synchronize General Ledger
            AccountingService::syncGeneralLedger();

            // Log action
            ActivityLog::create([
                'user_id' => $request->user()?->id,
                'username' => $request->user()?->username ?: 'admin',
                'action' => "Recorded Sale: Invoice {$invoiceNo} to {$sale->buyer} (Total: ₱" . number_format($totalAmount, 2) . ", Paid: ₱" . number_format($paidAmount, 2) . ", Status: {$finalStatus})",
                'ip_address' => $request->ip()
            ]);
        });

        $sale->load(['cashReceipt', 'payments']);

        return response()->json([
            'message' => 'Sales record created successfully' . ($paidAmount > 0 ? ' and cash balance updated.' : ' (credit/pending sale recorded without cash balance increase).'),
            'sale' => $sale
        ], 201);
    }

    /**
     * Collect full or partial payment on an existing sale (Credit / Pending / Partially Paid).
     */
    public function collectPayment(Request $request, $id)
    {
        $request->validate([
            'payment_amount' => 'required|numeric|min:0.01',
            'payment_date' => 'required|date',
            'payment_method' => 'required|string|in:Cash,GCash,Bank Transfer,Check',
            'or_number' => 'nullable|string|max:100',
            'remarks' => 'nullable|string',
        ]);

        $sale = null;
        $payment = null;

        DB::transaction(function() use ($request, $id, &$sale, &$payment) {
            $sale = Sale::lockForUpdate()->findOrFail($id);

            if ($sale->status === 'Cancelled') {
                abort(422, 'Cannot collect payment on a cancelled sale.');
            }

            if ((float)$sale->remaining_balance <= 0.005) {
                abort(422, 'This sales invoice has already been fully paid.');
            }

            $currentRemaining = (float)$sale->remaining_balance;
            $payAmount = round(min((float)$request->payment_amount, $currentRemaining), 2);

            $orNumber = $request->or_number ? trim($request->or_number) : AccountingService::generateOrNumber($request->payment_date);

            $cleanRemarks = trim(preg_replace('/^\[Method:\s*[^\]]+\]\s*/', '', $request->remarks ?: ''));
            $receiptRemarks = trim("[Method: {$request->payment_method}] " . ($cleanRemarks ?: "Payment collection for Invoice {$sale->invoice_no}"));

            // 1. Record in Cash Receipts Journal
            $cashReceipt = CashReceiptsJournal::create([
                'or_number' => $orNumber,
                'receipt_date' => $request->payment_date,
                'received_from' => $sale->buyer,
                'description' => "Sales Payment for {$sale->invoice_no} - {$sale->product}",
                'source_of_income' => 'Sales',
                'amount_received' => $payAmount,
                'recorded_by' => $request->user()?->username ?: 'admin',
                'user_id' => $request->user()?->id,
                'sale_id' => $sale->id,
                'remarks' => $receiptRemarks,
            ]);

            // 2. Record payment transaction
            $payment = SalePayment::create([
                'sale_id' => $sale->id,
                'cash_receipt_id' => $cashReceipt->id,
                'or_number' => $orNumber,
                'payment_date' => $request->payment_date,
                'amount' => $payAmount,
                'payment_method' => $request->payment_method,
                'remarks' => $receiptRemarks,
                'user_id' => $request->user()?->id,
                'recorded_by' => $request->user()?->username ?: 'admin',
            ]);

            // 3. Update Sale paid amount, remaining balance, and status
            $newPaid = round((float)$sale->paid_amount + $payAmount, 2);
            $newRemaining = max(0.00, round((float)$sale->total_amount - $newPaid, 2));
            $newStatus = ($newRemaining <= 0.005) ? 'Paid' : 'Partially Paid';

            $sale->paid_amount = $newPaid;
            $sale->remaining_balance = $newRemaining;
            $sale->status = $newStatus;
            if (!$sale->cash_receipt_id) {
                $sale->cash_receipt_id = $cashReceipt->id;
            }
            $sale->save();

            // 4. Synchronize General Ledger
            AccountingService::syncGeneralLedger();

            // 5. Activity log
            ActivityLog::create([
                'user_id' => $request->user()?->id,
                'username' => $request->user()?->username ?: 'admin',
                'action' => "Collected payment for Sale Invoice {$sale->invoice_no} (Amount: ₱" . number_format($payAmount, 2) . ", Method: {$request->payment_method}, OR: {$orNumber})",
                'ip_address' => $request->ip()
            ]);
        });

        $sale->load(['cashReceipt', 'payments']);

        return response()->json([
            'message' => 'Payment collected successfully and cash balance updated.',
            'sale' => $sale,
            'payment' => $payment
        ], 200);
    }

    /**
     * Display the specified sale.
     */
    public function show($id)
    {
        $sale = Sale::with(['cashReceipt', 'payments.cashReceipt'])->find($id);

        if (!$sale) {
            return response()->json(['message' => 'Sales record not found'], 404);
        }

        return response()->json($sale);
    }

    /**
     * Get payment history for a specific sale.
     */
    public function payments($id)
    {
        $sale = Sale::find($id);
        if (!$sale) {
            return response()->json(['message' => 'Sales record not found'], 404);
        }

        $payments = SalePayment::with('cashReceipt')
            ->where('sale_id', $id)
            ->orderBy('payment_date', 'asc')
            ->orderBy('id', 'asc')
            ->get();

        return response()->json($payments);
    }

    /**
     * Update the specified sale in storage.
     */
    public function update(Request $request, $id)
    {
        $request->validate([
            'buyer' => 'required|string|max:150',
            'product' => 'required|string|max:100',
            'quantity' => 'required|numeric|min:0.01',
            'unit' => 'required|string|max:20',
            'unit_price' => 'required|numeric|min:0.01',
            'payment_method' => 'required|string|in:Cash,GCash,Bank Transfer,Check',
            'remarks' => 'nullable|string',
            'status' => 'required|string|in:Paid,Pending,Credit,Partially Paid,Cancelled',
            'sale_date' => 'required|date',
        ]);

        $sale = null;

        DB::transaction(function() use ($request, $id, &$sale) {
            $sale = Sale::lockForUpdate()->findOrFail($id);

            $oldStatus = $sale->status;
            $newStatus = $request->status;
            $newTotal = round((float)$request->quantity * (float)$request->unit_price, 2);

            $data = $request->all();
            $data['total_amount'] = $newTotal;

            // Handle status transitions
            if ($newStatus === 'Cancelled') {
                // If cancelled, remove all linked cash receipts and payments
                $linkedReceipts = CashReceiptsJournal::where('sale_id', $sale->id)->get();
                foreach ($linkedReceipts as $cr) {
                    $cr->delete();
                }
                SalePayment::where('sale_id', $sale->id)->delete();

                $data['paid_amount'] = 0.00;
                $data['remaining_balance'] = 0.00;
                $data['cash_receipt_id'] = null;
            } elseif ($newStatus === 'Paid') {
                $existingPaymentsCount = SalePayment::where('sale_id', $sale->id)->count();

                if ($existingPaymentsCount === 0) {
                    // Create primary cash receipt and payment for the full amount
                    $orNumber = AccountingService::generateOrNumber($request->sale_date);
                    $cleanRemarks = trim(preg_replace('/^\[Method:\s*[^\]]+\]\s*/', '', $request->remarks ?: ''));
                    $receiptRemarks = trim("[Method: {$request->payment_method}] " . ($cleanRemarks ?: "Wholesale sales payment for {$sale->invoice_no}"));

                    $cashReceipt = CashReceiptsJournal::create([
                        'or_number' => $orNumber,
                        'receipt_date' => $request->sale_date,
                        'received_from' => $request->buyer,
                        'description' => "Sales Invoice: {$sale->invoice_no} - {$request->product} ({$request->quantity} {$request->unit})",
                        'source_of_income' => 'Sales',
                        'amount_received' => $newTotal,
                        'recorded_by' => $request->user()?->username ?: 'admin',
                        'user_id' => $request->user()?->id,
                        'sale_id' => $sale->id,
                        'remarks' => $receiptRemarks,
                    ]);

                    SalePayment::create([
                        'sale_id' => $sale->id,
                        'cash_receipt_id' => $cashReceipt->id,
                        'or_number' => $orNumber,
                        'payment_date' => $request->sale_date,
                        'amount' => $newTotal,
                        'payment_method' => $request->payment_method,
                        'remarks' => $receiptRemarks,
                        'user_id' => $request->user()?->id,
                        'recorded_by' => $request->user()?->username ?: 'admin',
                    ]);

                    $data['paid_amount'] = $newTotal;
                    $data['remaining_balance'] = 0.00;
                    $data['cash_receipt_id'] = $cashReceipt->id;
                } else {
                    // Update the primary receipt if only 1 payment existed
                    if ($existingPaymentsCount === 1) {
                        $payment = SalePayment::where('sale_id', $sale->id)->first();
                        $cashReceipt = CashReceiptsJournal::find($payment->cash_receipt_id);
                        if ($cashReceipt) {
                            $cleanRemarks = trim(preg_replace('/^\[Method:\s*[^\]]+\]\s*/', '', $request->remarks ?: ''));
                            $receiptRemarks = trim("[Method: {$request->payment_method}] " . ($cleanRemarks ?: "Wholesale sales payment for {$sale->invoice_no}"));

                            $cashReceipt->update([
                                'received_from' => $request->buyer,
                                'description' => "Sales Invoice: {$sale->invoice_no} - {$request->product} ({$request->quantity} {$request->unit})",
                                'amount_received' => $newTotal,
                                'remarks' => $receiptRemarks,
                            ]);

                            $payment->update([
                                'amount' => $newTotal,
                                'payment_method' => $request->payment_method,
                                'remarks' => $receiptRemarks,
                            ]);
                        }
                    }
                    $data['paid_amount'] = $newTotal;
                    $data['remaining_balance'] = 0.00;
                }
            } elseif ($newStatus === 'Pending' || $newStatus === 'Credit') {
                if ($oldStatus === 'Paid') {
                    // Status downgraded from Paid to Pending without payment: remove cash receipts
                    $linkedReceipts = CashReceiptsJournal::where('sale_id', $sale->id)->get();
                    foreach ($linkedReceipts as $cr) {
                        $cr->delete();
                    }
                    SalePayment::where('sale_id', $sale->id)->delete();

                    $data['paid_amount'] = 0.00;
                    $data['remaining_balance'] = $newTotal;
                    $data['cash_receipt_id'] = null;
                } else {
                    $paid = (float)$sale->paid_amount;
                    $data['paid_amount'] = $paid;
                    $data['remaining_balance'] = max(0.00, round($newTotal - $paid, 2));
                }
            }

            $sale->update($data);

            // Synchronize General Ledger
            AccountingService::syncGeneralLedger();

            // Log action
            ActivityLog::create([
                'user_id' => $request->user()?->id,
                'username' => $request->user()?->username ?: 'admin',
                'action' => "Updated Sale ID {$id} (Invoice {$sale->invoice_no}) to {$sale->buyer} (Total: ₱" . number_format($newTotal, 2) . ", Status: {$sale->status})",
                'ip_address' => $request->ip()
            ]);
        });

        $sale->load(['cashReceipt', 'payments']);

        return response()->json([
            'message' => 'Sales record updated successfully',
            'sale' => $sale
        ]);
    }

    /**
     * Remove the specified sale from storage.
     * Reverses all associated Cash Receipts and updates cash balances.
     */
    public function destroy(Request $request, $id)
    {
        DB::transaction(function() use ($request, $id) {
            $sale = Sale::lockForUpdate()->find($id);

            if (!$sale) {
                abort(404, 'Sales record not found');
            }

            $invoiceNo = $sale->invoice_no;
            $buyer = $sale->buyer;

            // Delete linked Cash Receipts and Sale Payments
            $linkedReceipts = CashReceiptsJournal::where('sale_id', $sale->id)->get();
            foreach ($linkedReceipts as $cr) {
                $cr->delete();
            }
            SalePayment::where('sale_id', $sale->id)->delete();

            $sale->delete();

            // Re-sync General Ledger
            AccountingService::syncGeneralLedger();

            // Log action
            ActivityLog::create([
                'user_id' => $request->user()?->id,
                'username' => $request->user()?->username ?: 'admin',
                'action' => "Deleted Sale: Invoice {$invoiceNo} to {$buyer} (and reversed any linked cash receipts)",
                'ip_address' => $request->ip()
            ]);
        });

        return response()->json([
            'message' => 'Sales record and associated cash receipt entries deleted successfully'
        ]);
    }
}
