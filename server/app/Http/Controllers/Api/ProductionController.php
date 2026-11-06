<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Production;
use App\Models\ProductionPayment;
use App\Models\CashDisbursementJournal;
use App\Models\Member;
use App\Models\Setting;
use App\Models\ShareCapitalTransaction;
use App\Models\ActivityLog;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class ProductionController extends Controller
{
    /**
     * Display a listing of productions.
     */
    public function index(Request $request)
    {
        $query = Production::with(['member', 'cbuTransaction', 'payments.cashDisbursement']);

        // Search
        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function($q) use ($search) {
                $q->where('product_type', 'like', "%{$search}%")
                  ->orWhere('source', 'like', "%{$search}%")
                  ->orWhere('remarks', 'like', "%{$search}%")
                  ->orWhere('payment_status', 'like', "%{$search}%")
                  ->orWhereHas('member', function($mq) use ($search) {
                      $mq->where('firstname', 'like', "%{$search}%")
                         ->orWhere('lastname', 'like', "%{$search}%")
                         ->orWhere('member_code', 'like', "%{$search}%");
                  })
                  ->orWhereHas('payments', function($pq) use ($search) {
                      $pq->where('voucher_number', 'like', "%{$search}%");
                  });
            });
        }

        // Filters
        if ($request->filled('member_id')) {
            $query->where('member_id', $request->member_id);
        }

        if ($request->filled('product_type')) {
            $query->where('product_type', $request->product_type);
        }

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        if ($request->filled('payment_status')) {
            $query->where('payment_status', $request->payment_status);
        }

        if ($request->filled('start_date') && $request->filled('end_date')) {
            $query->whereBetween('production_date', [$request->start_date, $request->end_date]);
        }

        // Sorting
        $sortColumn = $request->input('sort_by', 'production_date');
        $sortDirection = $request->input('order', 'desc');
        
        $allowedSorts = [
            'id', 'production_date', 'quantity', 'product_type', 'source', 
            'status', 'gross_amount', 'net_amount', 'payment_status', 
            'paid_amount', 'remaining_balance'
        ];
        if (in_array($sortColumn, $allowedSorts)) {
            $query->orderBy($sortColumn, $sortDirection);
        } else {
            $query->orderBy('production_date', 'desc');
        }

        $perPage = $request->input('per_page', 10);
        $productions = $query->paginate($perPage);

        return response()->json($productions);
    }

    /**
     * Store a newly created production in storage.
     * Enforces official server-side purchase and CBU computation and connects to Member Share Capital / CBU.
     * Separates Production Recording from Member Payment (no disbursement created at this stage).
     */
    public function store(Request $request)
    {
        $request->validate([
            'member_id' => 'required|exists:members,id',
            'product_type' => 'required|string|max:100',
            'quantity' => 'required|numeric|min:0.01',
            'unit' => 'required|string|max:20',
            'unit_price' => 'nullable|numeric|min:0',
            'purchase_price' => 'nullable|numeric|min:0',
            'source' => 'required|string|max:255',
            'remarks' => 'nullable|string',
            'production_date' => 'required|date',
            'status' => 'required|string|in:Pending,Approved,Completed,Cancelled',
        ]);

        $production = null;

        DB::transaction(function () use ($request, &$production) {
            // Lock member row for consistent CBU balance calculation
            $member = Member::where('id', $request->member_id)->lockForUpdate()->firstOrFail();

            // 1. Quantity & Purchase Price
            $quantity = (float) $request->quantity;
            $purchasePrice = $request->filled('purchase_price') 
                ? (float) $request->purchase_price 
                : ($request->filled('unit_price') ? (float) $request->unit_price : 0.00);

            // 2. Official server calculation: Gross Amount = Quantity × Purchase Price
            $grossAmount = round($quantity * $purchasePrice, 2);

            // 3. Official CBU Rate retrieved from existing cooperative system settings/policy (never hard-coded)
            $approvedCbuRate = (float) Setting::getVal('cbu_rate_per_kg', 0.50);

            // 4. Official server calculation: CBU Deduction = Quantity × Approved CBU Rate
            $cbuDeduction = $approvedCbuRate > 0 ? round($quantity * $approvedCbuRate, 2) : 0.00;

            // 5. Official server calculation: Net Amount Payable = Gross Amount − CBU Deduction
            $netAmount = max(0.00, round($grossAmount - $cbuDeduction, 2));

            // Initial Payment Status
            $paymentStatus = ($netAmount <= 0.00) ? 'Paid' : 'Unpaid';
            $paidAmount = 0.00;
            $remainingBalance = $netAmount;

            // 6. Save the production transaction (Recording phase only, no cash disbursement)
            $data = [
                'member_id' => $member->id,
                'product_type' => $request->product_type,
                'quantity' => $quantity,
                'unit' => $request->unit,
                'unit_price' => $purchasePrice,
                'gross_amount' => $grossAmount,
                'cbu_rate_per_kg' => $approvedCbuRate,
                'cbu_deduction' => $cbuDeduction,
                'net_amount' => $netAmount,
                'cbu_deducted' => false,
                'cbu_deducted_at' => null,
                'cbu_transaction_id' => null,
                'source' => $request->source,
                'remarks' => $request->remarks,
                'production_date' => $request->production_date,
                'status' => $request->status,
                'payment_status' => $paymentStatus,
                'paid_amount' => $paidAmount,
                'remaining_balance' => $remainingBalance,
            ];

            $production = Production::create($data);

            // 7. If CBU deduction > 0 and status is not Cancelled, record traceable CBU transaction and credit member accumulated CBU
            if ($cbuDeduction > 0 && $production->status !== 'Cancelled') {
                $previousCbu = (float) ($member->cbu_balance ?? 0);
                $accumulatedCbu = $previousCbu + $cbuDeduction;

                // Update member's accumulated CBU balance
                $member->cbu_balance = $accumulatedCbu;
                $member->save();

                // Generate reference number for CBU ledger
                $year = Carbon::parse($production->production_date)->year;
                $refNo = sprintf("CBU-PRD-%d-%04d", $year, $production->id);

                // Create traceable Share Capital / CBU transaction entry
                $cbuTransaction = ShareCapitalTransaction::create([
                    'member_id' => $member->id,
                    'production_id' => $production->id,
                    'transaction_type' => 'CBU Contribution',
                    'transaction_date' => $production->production_date,
                    'reference_no' => $refNo,
                    'amount' => $cbuDeduction,
                    'balance_after' => $accumulatedCbu,
                    'kilograms' => $quantity,
                    'unit_price' => $purchasePrice,
                    'gross_amount' => $grossAmount,
                    'cbu_rate_per_kg' => $approvedCbuRate,
                    'net_amount' => $netAmount,
                    'source' => "Production Delivery ({$production->product_type})",
                    'payment_method' => 'Production Retention',
                    'remarks' => "CBU deduction retention from {$quantity}{$production->unit} of {$production->product_type} @ ₱" . number_format($approvedCbuRate, 4) . "/{$production->unit}",
                    'user_id' => $request->user()?->id,
                    'recorded_by' => $request->user()?->username ?: 'admin',
                ]);

                // Link CBU transaction to production record
                $production->update([
                    'cbu_deducted' => true,
                    'cbu_deducted_at' => Carbon::now(),
                    'cbu_transaction_id' => $cbuTransaction->id,
                ]);
            }

            // Synchronize General Ledger
            \App\Services\AccountingService::syncGeneralLedger();

            // Log activity
            $priceSummary = $purchasePrice > 0 ? " @ ₱" . number_format($purchasePrice, 2) . "/{$production->unit} (Gross: ₱" . number_format($grossAmount, 2) . ", CBU: ₱" . number_format($cbuDeduction, 2) . ", Net: ₱" . number_format($netAmount, 2) . ")" : "";
            ActivityLog::create([
                'user_id' => $request->user()?->id,
                'username' => $request->user()?->username ?: 'admin',
                'action' => "Recorded Production: {$production->quantity}{$production->unit} of {$production->product_type} for member {$member->firstname} {$member->lastname}{$priceSummary}. Payment Status: {$paymentStatus}.",
                'ip_address' => $request->ip()
            ]);
        });

        return response()->json([
            'message' => 'Production record created successfully',
            'production' => $production->fresh()->load('member', 'cbuTransaction', 'payments.cashDisbursement')
        ], 201);
    }

    /**
     * Display the specified production.
     */
    public function show($id)
    {
        $production = Production::with(['member', 'cbuTransaction', 'payments.cashDisbursement'])->find($id);

        if (!$production) {
            return response()->json(['message' => 'Production record not found'], 404);
        }

        return response()->json($production);
    }

    /**
     * Update the specified production in storage.
     * Enforces official server-side Gross Amount, CBU Deduction, and Net Amount recalculation with CBU ledger synchronization.
     */
    public function update(Request $request, $id)
    {
        $production = Production::find($id);

        if (!$production) {
            return response()->json(['message' => 'Production record not found'], 404);
        }

        $request->validate([
            'member_id' => 'required|exists:members,id',
            'product_type' => 'required|string|max:100',
            'quantity' => 'required|numeric|min:0.01',
            'unit' => 'required|string|max:20',
            'unit_price' => 'nullable|numeric|min:0',
            'purchase_price' => 'nullable|numeric|min:0',
            'source' => 'required|string|max:255',
            'remarks' => 'nullable|string',
            'production_date' => 'required|date',
            'status' => 'required|string|in:Pending,Approved,Completed,Cancelled',
        ]);

        DB::transaction(function () use ($request, $production) {
            $oldMemberId = $production->member_id;
            $newMemberId = $request->member_id;

            // Lock member row
            $member = Member::where('id', $newMemberId)->lockForUpdate()->firstOrFail();

            // 1. Quantity & Purchase Price
            $quantity = (float) $request->quantity;
            $purchasePrice = $request->filled('purchase_price') 
                ? (float) $request->purchase_price 
                : ($request->filled('unit_price') ? (float) $request->unit_price : 0.00);

            // 2. Official server calculation: Gross Amount = Quantity × Purchase Price
            $grossAmount = round($quantity * $purchasePrice, 2);

            // 3. Official CBU Rate retrieved from existing system settings/policy (never hardcoded)
            $approvedCbuRate = (float) Setting::getVal('cbu_rate_per_kg', 0.50);

            // 4. Official server calculation: CBU Deduction = Quantity × Approved CBU Rate
            $cbuDeduction = $approvedCbuRate > 0 ? round($quantity * $approvedCbuRate, 2) : 0.00;

            // 5. Official server calculation: Net Amount Payable = Gross Amount − CBU Deduction
            $netAmount = max(0.00, round($grossAmount - $cbuDeduction, 2));

            // Find existing CBU transaction linked to this production
            $existingCbu = ShareCapitalTransaction::where('production_id', $production->id)->first();

            // Handle member change if member_id was modified
            if ($oldMemberId != $newMemberId && $existingCbu) {
                $oldMember = Member::where('id', $oldMemberId)->lockForUpdate()->first();
                if ($oldMember) {
                    $oldMember->cbu_balance = max(0.00, (float)($oldMember->cbu_balance ?? 0) - (float)$existingCbu->amount);
                    $oldMember->save();
                }
            } elseif ($existingCbu) {
                // Revert previous CBU deduction from current member before recalculating
                $member->cbu_balance = max(0.00, (float)($member->cbu_balance ?? 0) - (float)$existingCbu->amount);
            }

            $cbuTransactionId = null;
            $cbuDeducted = false;
            $cbuDeductedAt = null;

            if ($cbuDeduction > 0 && $request->status !== 'Cancelled') {
                $accumulatedCbu = (float)($member->cbu_balance ?? 0) + $cbuDeduction;
                $member->cbu_balance = $accumulatedCbu;
                $member->save();

                $year = Carbon::parse($request->production_date)->year;
                $refNo = sprintf("CBU-PRD-%d-%04d", $year, $production->id);

                if ($existingCbu) {
                    $existingCbu->update([
                        'member_id' => $member->id,
                        'transaction_date' => $request->production_date,
                        'reference_no' => $refNo,
                        'amount' => $cbuDeduction,
                        'balance_after' => $accumulatedCbu,
                        'kilograms' => $quantity,
                        'unit_price' => $purchasePrice,
                        'gross_amount' => $grossAmount,
                        'cbu_rate_per_kg' => $approvedCbuRate,
                        'net_amount' => $netAmount,
                        'source' => "Production Delivery ({$request->product_type})",
                        'remarks' => "Updated CBU deduction retention from {$quantity}{$request->unit} of {$request->product_type} @ ₱" . number_format($approvedCbuRate, 4) . "/{$request->unit}",
                    ]);
                    $cbuTransactionId = $existingCbu->id;
                } else {
                    $newCbuTx = ShareCapitalTransaction::create([
                        'member_id' => $member->id,
                        'production_id' => $production->id,
                        'transaction_type' => 'CBU Contribution',
                        'transaction_date' => $request->production_date,
                        'reference_no' => $refNo,
                        'amount' => $cbuDeduction,
                        'balance_after' => $accumulatedCbu,
                        'kilograms' => $quantity,
                        'unit_price' => $purchasePrice,
                        'gross_amount' => $grossAmount,
                        'cbu_rate_per_kg' => $approvedCbuRate,
                        'net_amount' => $netAmount,
                        'source' => "Production Delivery ({$request->product_type})",
                        'payment_method' => 'Production Retention',
                        'remarks' => "CBU deduction retention from {$quantity}{$request->unit} of {$request->product_type} @ ₱" . number_format($approvedCbuRate, 4) . "/{$request->unit}",
                        'user_id' => $request->user()?->id,
                        'recorded_by' => $request->user()?->username ?: 'admin',
                    ]);
                    $cbuTransactionId = $newCbuTx->id;
                }

                $cbuDeducted = true;
                $cbuDeductedAt = Carbon::now();
            } else {
                // If Cancelled or CBU deduction is zero, delete existing CBU transaction
                if ($existingCbu) {
                    $existingCbu->delete();
                }
                $member->save();
            }

            // Recalculate remaining balance and payment status with existing payments
            $currentPaid = (float) $production->paid_amount;
            $newRemaining = max(0.00, round($netAmount - $currentPaid, 2));
            if ($newRemaining <= 0.005) {
                $paymentStatus = 'Paid';
            } elseif ($currentPaid > 0) {
                $paymentStatus = 'Partially Paid';
            } else {
                $paymentStatus = 'Unpaid';
            }

            // Update production record
            $data = [
                'member_id' => $member->id,
                'product_type' => $request->product_type,
                'quantity' => $quantity,
                'unit' => $request->unit,
                'unit_price' => $purchasePrice,
                'gross_amount' => $grossAmount,
                'cbu_rate_per_kg' => $approvedCbuRate,
                'cbu_deduction' => $cbuDeduction,
                'net_amount' => $netAmount,
                'cbu_deducted' => $cbuDeducted,
                'cbu_deducted_at' => $cbuDeductedAt,
                'cbu_transaction_id' => $cbuTransactionId,
                'source' => $request->source,
                'remarks' => $request->remarks,
                'production_date' => $request->production_date,
                'status' => $request->status,
                'payment_status' => $paymentStatus,
                'remaining_balance' => $newRemaining,
            ];

            $production->update($data);

            // Synchronize General Ledger
            \App\Services\AccountingService::syncGeneralLedger();

            // Log action
            $priceSummary = $purchasePrice > 0 ? " @ ₱" . number_format($purchasePrice, 2) . "/{$production->unit} (Net: ₱" . number_format($netAmount, 2) . ", Rem: ₱" . number_format($newRemaining, 2) . ")" : "";
            ActivityLog::create([
                'user_id' => $request->user()?->id,
                'username' => $request->user()?->username ?: 'admin',
                'action' => "Updated Production ID {$production->id}: {$production->quantity}{$production->unit} of {$production->product_type} for member {$member->firstname} {$member->lastname}{$priceSummary}.",
                'ip_address' => $request->ip()
            ]);
        });

        return response()->json([
            'message' => 'Production record updated successfully',
            'production' => $production->fresh()->load('member', 'cbuTransaction', 'payments.cashDisbursement')
        ]);
    }

    /**
     * Record actual member payment for a production.
     * Integrates with Cash Disbursement Journal and updates Current Cash Balance strictly by the amount paid.
     * Prevents duplicate payments and accounting entries.
     */
    public function recordPayment(Request $request, $id)
    {
        $request->validate([
            'amount' => 'required|numeric|min:0.01',
            'payment_date' => 'required|date',
            'payment_method' => 'required|string|in:Cash,Check,Bank Transfer,GCash',
            'voucher_number' => 'nullable|string|max:100',
            'approved_by' => 'nullable|string|max:100',
            'expense_account' => 'nullable|string|max:150',
            'remarks' => 'nullable|string',
        ]);

        $payment = null;
        $production = null;

        DB::transaction(function () use ($request, $id, &$payment, &$production) {
            // Lock production row to prevent race conditions & duplicate payments
            $production = Production::with('member')->where('id', $id)->lockForUpdate()->firstOrFail();

            // 1. Prevent payment on cancelled production
            if ($production->status === 'Cancelled') {
                abort(422, 'Cannot record payment for a cancelled production batch.');
            }

            // 2. Prevent payment if already fully paid (Duplicate Payment Prevention)
            if ($production->remaining_balance <= 0.00 || $production->payment_status === 'Paid') {
                abort(422, 'This production batch has already been fully paid.');
            }

            $payAmount = round((float) $request->amount, 2);
            $remaining = (float) $production->remaining_balance;

            // 3. Prevent overpayment
            if ($payAmount > ($remaining + 0.005)) {
                abort(422, "Payment amount (₱" . number_format($payAmount, 2) . ") cannot exceed remaining balance (₱" . number_format($remaining, 2) . ").");
            }

            // 4. Generate or validate unique Cash Disbursement Voucher (CDV)
            $voucherNumber = $request->voucher_number ? trim($request->voucher_number) : null;
            $year = Carbon::parse($request->payment_date)->year;

            if (empty($voucherNumber)) {
                $latest = CashDisbursementJournal::where('voucher_number', 'like', "CDV-{$year}-%")
                    ->orderBy('id', 'desc')
                    ->first();
                $seq = 1;
                if ($latest) {
                    $parts = explode('-', $latest->voucher_number);
                    $seq = ((int)end($parts)) + 1;
                }
                do {
                    $candidate = sprintf("CDV-%d-%04d", $year, $seq);
                    $exists = CashDisbursementJournal::where('voucher_number', $candidate)->exists();
                    if (!$exists) break;
                    $seq++;
                } while ($exists);
                $voucherNumber = $candidate;
            } else {
                // Ensure manual voucher is unique
                if (CashDisbursementJournal::where('voucher_number', $voucherNumber)->exists()) {
                    abort(422, "Disbursement voucher number '{$voucherNumber}' has already been recorded.");
                }
            }

            $member = $production->member;
            $memberName = $member ? "{$member->firstname} {$member->lastname}" : 'Member';
            $expenseAccount = $request->input('expense_account', 'Copra Procurement Expenses');
            $approvedBy = $request->input('approved_by', 'General Manager');

            // 5. Record actual payment in Cash Disbursement Journal (Cash Outflow)
            // This strictly decrements Current Cash Balance by exactly $payAmount
            $disbursement = CashDisbursementJournal::create([
                'voucher_number' => $voucherNumber,
                'disbursement_date' => $request->payment_date,
                'payee' => $memberName,
                'description' => "Member Payment for Production #{$production->id} ({$production->quantity}{$production->unit} {$production->product_type})",
                'expense_account' => $expenseAccount,
                'amount' => $payAmount,
                'payment_method' => $request->payment_method,
                'approved_by' => $approvedBy,
                'user_id' => $request->user()?->id,
                'production_id' => $production->id,
                'remarks' => $request->remarks ?: "Member payment for Production #{$production->id}",
            ]);

            // 6. Record payment history record
            $payment = ProductionPayment::create([
                'production_id' => $production->id,
                'cash_disbursement_id' => $disbursement->id,
                'member_id' => $production->member_id,
                'voucher_number' => $voucherNumber,
                'payment_date' => $request->payment_date,
                'amount' => $payAmount,
                'payment_method' => $request->payment_method,
                'approved_by' => $approvedBy,
                'remarks' => $request->remarks,
                'user_id' => $request->user()?->id,
                'recorded_by' => $request->user()?->username ?: 'admin',
            ]);

            // 7. Update production payment status and balance
            $newPaid = round((float)$production->paid_amount + $payAmount, 2);
            $newRemaining = max(0.00, round((float)$production->net_amount - $newPaid, 2));

            $production->paid_amount = $newPaid;
            $production->remaining_balance = $newRemaining;
            $production->payment_status = ($newRemaining <= 0.005) ? 'Paid' : 'Partially Paid';
            $production->save();

            // Synchronize General Ledger
            \App\Services\AccountingService::syncGeneralLedger();

            // 8. Log activity
            ActivityLog::create([
                'user_id' => $request->user()?->id,
                'username' => $request->user()?->username ?: 'admin',
                'action' => "Recorded Member Payment of ₱" . number_format($payAmount, 2) . " for Production #{$production->id} (Member: {$memberName}, Voucher: {$voucherNumber}, Remaining Balance: ₱" . number_format($newRemaining, 2) . ")",
                'ip_address' => $request->ip()
            ]);
        });

        return response()->json([
            'message' => 'Member payment recorded successfully',
            'payment' => $payment->load('cashDisbursement'),
            'production' => $production->fresh()->load('member', 'cbuTransaction', 'payments.cashDisbursement')
        ], 201);
    }

    /**
     * Get payment history for a specific production.
     */
    public function payments($id)
    {
        $production = Production::find($id);

        if (!$production) {
            return response()->json(['message' => 'Production record not found'], 404);
        }

        $payments = ProductionPayment::with(['cashDisbursement', 'user'])
            ->where('production_id', $id)
            ->orderBy('payment_date', 'desc')
            ->orderBy('id', 'desc')
            ->get();

        return response()->json([
            'production_id' => $production->id,
            'net_amount' => (float)$production->net_amount,
            'paid_amount' => (float)$production->paid_amount,
            'remaining_balance' => (float)$production->remaining_balance,
            'payment_status' => $production->payment_status,
            'payments' => $payments
        ]);
    }

    /**
     * Remove the specified production from storage.
     */
    public function destroy(Request $request, $id)
    {
        $production = Production::find($id);

        if (!$production) {
            return response()->json(['message' => 'Production record not found'], 404);
        }

        DB::transaction(function () use ($production, $request, $id) {
            $member = Member::where('id', $production->member_id)->lockForUpdate()->first();
            $existingCbu = ShareCapitalTransaction::where('production_id', $production->id)->first();

            // If CBU transaction was credited, reverse it from member's CBU balance
            if ($existingCbu && $member) {
                $member->cbu_balance = max(0.00, (float)($member->cbu_balance ?? 0) - (float)$existingCbu->amount);
                $member->save();
                $existingCbu->delete();
            }

            // Remove linked CashDisbursementJournal records and production payments
            $payments = ProductionPayment::where('production_id', $production->id)->get();
            foreach ($payments as $pmt) {
                if ($pmt->cash_disbursement_id) {
                    CashDisbursementJournal::where('id', $pmt->cash_disbursement_id)->delete();
                }
                $pmt->delete();
            }

            $memberName = $member ? "{$member->firstname} {$member->lastname}" : 'Unknown Member';

            // Log action
            ActivityLog::create([
                'user_id' => $request->user()?->id,
                'username' => $request->user()?->username ?: 'admin',
                'action' => "Deleted Production ID {$id}: {$production->quantity}{$production->unit} of {$production->product_type} for member {$memberName}.",
                'ip_address' => $request->ip()
            ]);

            $production->delete();

            // Synchronize General Ledger
            \App\Services\AccountingService::syncGeneralLedger();
        });

        return response()->json([
            'message' => 'Production record deleted successfully'
        ]);
    }
}
