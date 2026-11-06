<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use App\Models\CashDisbursementJournal;
use App\Models\CashReceiptsJournal;
use App\Models\LoanRepayment;
use App\Models\Member;
use App\Models\MemberLoan;
use App\Models\Setting;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class LoanController extends Controller
{
    // =========================================================================
    // 1. ELIGIBILITY CHECK
    //    GET /loans/eligibility/{memberId}
    //    Returns the eligibility panel data for a given member.
    //    Reads from existing Member model and Setting model — no duplication.
    // =========================================================================

    public function eligibility($memberId)
    {
        $member = Member::find($memberId);

        if (!$member) {
            return response()->json(['message' => 'Member not found.'], 404);
        }

        // Fetch multiplier from the shared cooperative Setting (already managed in SettingController)
        $multiplier = (float) Setting::getVal('loan_eligibility_multiplier', 2.0);

        $paidUpCapital   = (float) $member->paid_up_capital;
        $cbuBalance      = (float) ($member->cbu_balance ?? 0);
        $totalEquity     = (float) ($member->total_equity ?? ($paidUpCapital + $cbuBalance));
        // Use total equity (Paid-Up Capital + CBU Balance) as the base for loan eligibility
        $maxEligibleLoan = $multiplier > 0 ? round($totalEquity * $multiplier, 2) : 0.00;

        // Sum of outstanding balances for all ACTIVE / Approved loans
        $totalOutstanding = (float) MemberLoan::where('member_id', $memberId)
            ->whereIn('status', ['Approved', 'Released', 'Active'])
            ->sum('outstanding_balance');

        $remainingEligibility = max(0.00, $maxEligibleLoan - $totalOutstanding);

        return response()->json([
            'member'                 => [
                'id'          => $member->id,
                'member_code' => $member->member_code,
                'full_name'   => $member->full_name,
                'status'      => $member->status,
            ],
            'paid_up_capital'        => $paidUpCapital,
            'cbu_balance'            => $cbuBalance,
            'total_equity'           => $totalEquity,
            'approved_multiplier'    => $multiplier,
            'maximum_eligible_loan'  => $maxEligibleLoan,
            'total_outstanding'      => $totalOutstanding,
            'remaining_eligibility'  => $remainingEligibility,
            'eligibility_status'     => $multiplier <= 0
                ? 'Pending Multiplier Config'
                : ($remainingEligibility > 0 ? 'Eligible' : 'Limit Reached'),
        ]);
    }

    // =========================================================================
    // 2. LIST LOANS
    //    GET /loans
    //    Paginated list with optional filters.
    // =========================================================================

    public function index(Request $request)
    {
        $query = MemberLoan::with([
            'member:id,member_code,firstname,lastname,paid_up_capital,cbu_balance',
            'user:id,username',
        ]);

        if ($request->filled('member_id')) {
            $query->where('member_id', $request->member_id);
        }

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('loan_reference_no', 'like', "%{$search}%")
                  ->orWhere('loan_purpose', 'like', "%{$search}%")
                  ->orWhereHas('member', function ($mq) use ($search) {
                      $mq->where('firstname', 'like', "%{$search}%")
                         ->orWhere('lastname', 'like', "%{$search}%")
                         ->orWhere('member_code', 'like', "%{$search}%");
                  });
            });
        }

        if ($request->filled('start_date') && $request->filled('end_date')) {
            $query->whereBetween('application_date', [$request->start_date, $request->end_date]);
        }

        $allowedSorts = ['id', 'loan_reference_no', 'application_date', 'requested_amount',
                         'approved_amount', 'status', 'outstanding_balance'];
        $sortCol  = in_array($request->input('sort_by'), $allowedSorts) ? $request->input('sort_by') : 'application_date';
        $sortDir  = $request->input('order', 'desc') === 'asc' ? 'asc' : 'desc';
        $query->orderBy($sortCol, $sortDir)->orderBy('id', 'desc');

        $perPage = $request->input('per_page', 10);
        $loans   = $query->paginate($perPage);

        // Aggregate totals for dashboard widgets
        $totals = [
            'total_loans'              => MemberLoan::count(),
            'total_pending'            => MemberLoan::where('status', 'Pending')->count(),
            'total_active'             => MemberLoan::whereIn('status', ['Approved', 'Released', 'Active'])->count(),
            'total_outstanding_amount' => (float) MemberLoan::whereIn('status', ['Approved', 'Released', 'Active'])
                ->sum('outstanding_balance'),
            'total_released_amount'    => (float) MemberLoan::whereIn('status', ['Released', 'Active', 'Fully Paid'])
                ->sum('approved_amount'),
        ];

        return response()->json([
            'loans'  => $loans,
            'totals' => $totals,
        ]);
    }

    // =========================================================================
    // 3. SUBMIT LOAN APPLICATION
    //    POST /loans
    //    Validates eligibility, prevents duplicate PENDING applications.
    // =========================================================================

    public function store(Request $request)
    {
        $request->validate([
            'member_id'       => 'required|exists:members,id',
            'requested_amount'=> 'required|numeric|min:1',
            'application_date'=> 'required|date',
            'loan_purpose'    => 'nullable|string|max:500',
            'loan_type'       => 'nullable|string|in:Regular,Emergency,Agricultural,Special|max:100',
            'term_months'     => 'nullable|integer|min:1|max:360',
            'interest_rate'   => 'nullable|numeric|min:0|max:1',
            'remarks'         => 'nullable|string|max:1000',
        ]);

        $member = Member::findOrFail($request->member_id);

        // --- Guard: No duplicate PENDING application for same member ---
        $existingPending = MemberLoan::where('member_id', $member->id)
            ->whereIn('status', ['Pending'])
            ->exists();
        if ($existingPending) {
            return response()->json([
                'message' => 'This member already has a pending loan application. '
                           . 'Resolve the existing application before submitting a new one.',
            ], 422);
        }

        // --- Eligibility validation ---
        $multiplier      = (float) Setting::getVal('loan_eligibility_multiplier', 2.0);
        $paidUpCapital   = (float) $member->paid_up_capital;
        $cbuBalance      = (float) ($member->cbu_balance ?? 0);
        $totalEquity     = (float) ($member->total_equity ?? ($paidUpCapital + $cbuBalance));
        // Use total equity (Paid-Up Capital + CBU Balance) as the base for loan eligibility
        $maxEligibleLoan = $multiplier > 0 ? round($totalEquity * $multiplier, 2) : 0.00;

        // Also account for outstanding balances on active loans
        $totalOutstanding = (float) MemberLoan::where('member_id', $member->id)
            ->whereIn('status', ['Approved', 'Released', 'Active'])
            ->sum('outstanding_balance');
        $remainingEligibility = max(0.00, $maxEligibleLoan - $totalOutstanding);

        $requestedAmount = (float) $request->requested_amount;

        if ($multiplier <= 0) {
            return response()->json([
                'message' => 'Loan eligibility multiplier is not configured. '
                           . 'Please set it in System Settings before accepting applications.',
            ], 422);
        }

        if ($requestedAmount > $remainingEligibility) {
            return response()->json([
                'message'              => 'Requested amount exceeds the member\'s remaining loan eligibility.',
                'paid_up_capital'      => $paidUpCapital,
                'approved_multiplier'  => $multiplier,
                'maximum_eligible_loan'=> $maxEligibleLoan,
                'total_outstanding'    => $totalOutstanding,
                'remaining_eligibility'=> $remainingEligibility,
                'requested_amount'     => $requestedAmount,
            ], 422);
        }

        // --- Generate loan reference number ---
        $year     = Carbon::parse($request->application_date)->year;
        $lastLoan = MemberLoan::where('loan_reference_no', 'like', "LN-{$year}-%")->count();
        $seq      = $lastLoan + 1;
        do {
            $refNo    = sprintf('LN-%d-%04d', $year, $seq);
            $refExists = MemberLoan::where('loan_reference_no', $refNo)->exists();
            if (!$refExists) break;
            $seq++;
        } while ($refExists);

        $loan = null;

        DB::transaction(function () use (
            $member, $request, $paidUpCapital, $totalEquity, $multiplier, $maxEligibleLoan,
            $requestedAmount, $refNo, &$loan
        ) {
            $loan = MemberLoan::create([
                'member_id'                      => $member->id,
                'paid_up_capital_at_application' => $totalEquity,  // stores total equity at time of application
                'loan_multiplier_at_application' => $multiplier,
                'maximum_eligible_loan'          => $maxEligibleLoan,
                'loan_reference_no'              => $refNo,
                'requested_amount'               => $requestedAmount,
                'application_date'               => $request->application_date,
                'loan_purpose'                   => $request->loan_purpose,
                'loan_type'                      => $request->loan_type ?? 'Regular',
                'status'                         => 'Pending',
                'term_months'                    => $request->term_months,
                'interest_rate'                  => $request->interest_rate,
                'total_amount_paid'              => 0.00,
                'outstanding_balance'            => 0.00,
                'remarks'                        => $request->remarks,
                'user_id'                        => $request->user()?->id,
                'recorded_by'                    => $request->user()?->username ?: 'admin',
            ]);

            ActivityLog::create([
                'user_id'    => $request->user()?->id,
                'username'   => $request->user()?->username ?: 'admin',
                'action'     => "Submitted loan application {$refNo} for {$member->full_name} ({$member->member_code})"
                              . " — Requested: ₱" . number_format($requestedAmount, 2)
                              . " | Max Eligible: ₱" . number_format($maxEligibleLoan, 2)
                              . " | Total Equity: ₱" . number_format($totalEquity, 2),
                'ip_address' => $request->ip(),
            ]);
        });

        return response()->json([
            'message' => 'Loan application submitted successfully.',
            'loan'    => $loan->load('member:id,member_code,firstname,lastname'),
        ], 201);
    }

    // =========================================================================
    // 4. VIEW SINGLE LOAN (with repayments)
    //    GET /loans/{id}
    // =========================================================================

    public function show($id)
    {
        $loan = MemberLoan::with([
            'member:id,member_code,firstname,lastname,paid_up_capital,cbu_balance',
            'user:id,username',
            'repayments.user:id,username',
        ])->find($id);

        if (!$loan) {
            return response()->json(['message' => 'Loan record not found.'], 404);
        }

        // Fetch fresh eligibility for the member (live multiplier from settings)
        $multiplier      = (float) Setting::getVal('loan_eligibility_multiplier', 0);
        $paidUpCapital   = (float) $loan->member->paid_up_capital;
        $cbuBalance      = (float) ($loan->member->cbu_balance ?? 0);
        $totalEquity     = (float) ($loan->member->total_equity ?? ($paidUpCapital + $cbuBalance));
        // Use total equity (Paid-Up Capital + CBU Balance) as the base for loan eligibility
        $maxEligibleLoan = $multiplier > 0 ? round($totalEquity * $multiplier, 2) : 0.00;

        // Outstanding from OTHER active loans
        $otherOutstanding = (float) MemberLoan::where('member_id', $loan->member_id)
            ->where('id', '!=', $loan->id)
            ->whereIn('status', ['Approved', 'Released', 'Active'])
            ->sum('outstanding_balance');

        return response()->json([
            'loan'            => $loan,
            'live_eligibility'=> [
                'paid_up_capital'       => $paidUpCapital,
                'cbu_balance'           => $cbuBalance,
                'total_equity'          => $totalEquity,
                'approved_multiplier'   => $multiplier,
                'maximum_eligible_loan' => $maxEligibleLoan,
                'other_outstanding'     => $otherOutstanding,
                'remaining_eligibility' => max(0.00, $maxEligibleLoan - $otherOutstanding - (float)($loan->outstanding_balance ?? 0)),
            ],
            'repayment_summary' => [
                'total_payments'    => $loan->repayments->count(),
                'total_paid'        => (float) $loan->total_amount_paid,
                'outstanding_balance'=> (float) $loan->outstanding_balance,
            ],
        ]);
    }

    // =========================================================================
    // 5. APPROVE / REJECT LOAN
    //    POST /loans/{id}/approve   OR   POST /loans/{id}/reject
    // =========================================================================

    public function approve(Request $request, $id)
    {
        $loan = MemberLoan::with('member')->find($id);
        if (!$loan) {
            return response()->json(['message' => 'Loan record not found.'], 404);
        }
        if ($loan->status !== 'Pending') {
            return response()->json(['message' => "Loan is already '{$loan->status}'. Only Pending loans can be approved."], 422);
        }

        $request->validate([
            'approved_amount' => 'required|numeric|min:1',
            'approval_date'   => 'required|date',
            'approved_by'     => 'nullable|string|max:150',
            'loan_type'       => 'nullable|string|in:Regular,Emergency,Agricultural,Special|max:100',
            'term_months'     => 'nullable|integer|min:1|max:360',
            'interest_rate'   => 'nullable|numeric|min:0|max:1',
            'remarks'         => 'nullable|string|max:1000',
        ]);

        // Guard: approved amount must not exceed maximum_eligible_loan at time of application
        $approvedAmount = (float) $request->approved_amount;
        if ($approvedAmount > (float) $loan->maximum_eligible_loan) {
            return response()->json([
                'message'               => 'Approved amount exceeds the member\'s maximum eligible loan.',
                'maximum_eligible_loan' => (float) $loan->maximum_eligible_loan,
                'approved_amount'       => $approvedAmount,
            ], 422);
        }

        DB::transaction(function () use ($loan, $request, $approvedAmount) {
            $termMonths  = $request->term_months ?? $loan->term_months;
            $interestRate = $request->interest_rate ?? $loan->interest_rate;

            // Calculate Flat-Interest Monthly Payment
            $monthlyAmort = null;
            $totalPayable = $approvedAmount;

            if ($termMonths && $interestRate !== null) {
                $annualRate = (float) $interestRate;
                // Flat Interest = Principal × Annual Rate × (Term in Months / 12)
                $totalInterest = $approvedAmount * $annualRate * ($termMonths / 12);
                $totalPayable = $approvedAmount + $totalInterest;
                
                $monthlyAmort = round($totalPayable / $termMonths, 2);
            } elseif ($termMonths) {
                $monthlyAmort = round($approvedAmount / $termMonths, 2);
            }

            $loan->update([
                'status'               => 'Approved',
                'approved_amount'      => $approvedAmount,
                'approval_date'        => $request->approval_date,
                'approved_by'          => $request->approved_by ?? ($request->user()?->username ?: 'admin'),
                'loan_type'            => $request->loan_type ?? $loan->loan_type,
                'term_months'          => $termMonths,
                'interest_rate'        => $interestRate,
                'monthly_amortization' => $monthlyAmort,
                'outstanding_balance'  => $totalPayable,   // set to total payable (principal + interest)
                'remarks'              => $request->remarks ?? $loan->remarks,
            ]);

            ActivityLog::create([
                'user_id'    => $request->user()?->id,
                'username'   => $request->user()?->username ?: 'admin',
                'action'     => "Approved loan {$loan->loan_reference_no} for {$loan->member->full_name}"
                              . " ({$loan->member->member_code})"
                              . " — Approved Amount: ₱" . number_format($approvedAmount, 2),
                'ip_address' => $request->ip(),
            ]);
        });

        return response()->json([
            'message' => 'Loan approved successfully.',
            'loan'    => $loan->fresh()->load('member:id,member_code,firstname,lastname'),
        ]);
    }

    public function reject(Request $request, $id)
    {
        $loan = MemberLoan::with('member')->find($id);
        if (!$loan) {
            return response()->json(['message' => 'Loan record not found.'], 404);
        }
        if ($loan->status !== 'Pending') {
            return response()->json(['message' => "Only Pending loans can be rejected."], 422);
        }

        $request->validate([
            'remarks' => 'nullable|string|max:1000',
        ]);

        DB::transaction(function () use ($loan, $request) {
            $loan->update([
                'status'  => 'Rejected',
                'remarks' => $request->remarks ?? $loan->remarks,
            ]);

            ActivityLog::create([
                'user_id'    => $request->user()?->id,
                'username'   => $request->user()?->username ?: 'admin',
                'action'     => "Rejected loan {$loan->loan_reference_no} for {$loan->member->full_name} ({$loan->member->member_code})",
                'ip_address' => $request->ip(),
            ]);
        });

        return response()->json([
            'message' => 'Loan rejected.',
            'loan'    => $loan->fresh()->load('member:id,member_code,firstname,lastname'),
        ]);
    }

    // =========================================================================
    // 6. RELEASE LOAN (Disburse Funds)
    //    POST /loans/{id}/release
    //    Creates entry in Cash Disbursement Journal (Books of Accounts) — reuses
    //    existing CashDisbursementJournal model, no new accounting tables.
    // =========================================================================

    public function release(Request $request, $id)
    {
        $loan = MemberLoan::with('member')->find($id);
        if (!$loan) {
            return response()->json(['message' => 'Loan record not found.'], 404);
        }
        if ($loan->status !== 'Approved') {
            return response()->json(['message' => "Only Approved loans can be released. Current status: {$loan->status}."], 422);
        }

        $request->validate([
            'release_date'          => 'required|date',
            'release_payment_method'=> 'required|string|in:Cash,GCash,Bank Transfer,Check',
            'approved_by'           => 'nullable|string|max:150',
            'remarks'               => 'nullable|string|max:1000',
        ]);

        $disbursement = null;

        DB::transaction(function () use ($loan, $request, &$disbursement) {
            $member         = $loan->member;
            $approvedAmount = (float) $loan->approved_amount;
            $releaseDate    = $request->release_date;
            $method         = $request->release_payment_method;

            // Generate voucher number for Cash Disbursement Journal
            $year   = Carbon::parse($releaseDate)->year;
            $lastVn = CashDisbursementJournal::where('voucher_number', 'like', "DV-{$year}-%")->count();
            $seq    = $lastVn + 1;
            do {
                $voucherNo = sprintf('DV-%d-%04d', $year, $seq);
                $vnExists  = CashDisbursementJournal::where('voucher_number', $voucherNo)->exists();
                if (!$vnExists) break;
                $seq++;
            } while ($vnExists);

            // Integrate into Books of Accounts — Cash Disbursement Journal
            $disbursement = CashDisbursementJournal::create([
                'voucher_number'    => $voucherNo,
                'disbursement_date' => $releaseDate,
                'payee'             => $member->full_name,
                'description'       => "Loan Release — Ref: {$loan->loan_reference_no} | [{$member->member_code}] {$member->full_name}",
                'expense_account'   => 'Loans Receivable',
                'amount'            => $approvedAmount,
                'payment_method'    => $method,
                'approved_by'       => $request->approved_by ?? ($request->user()?->username ?: 'admin'),
                'user_id'           => $request->user()?->id,
                'remarks'           => $request->remarks
                    ?: "Loan disbursement for {$loan->loan_reference_no}",
            ]);

            // Update loan status
            $loan->update([
                'status'                  => 'Released',
                'release_date'            => $releaseDate,
                'release_payment_method'  => $method,
                'release_voucher_number'  => $voucherNo,
                'disbursement_journal_id' => $disbursement->id,
                // outstanding_balance is preserved as totalPayable from approval
                'remarks'                 => $request->remarks ?? $loan->remarks,
            ]);

            ActivityLog::create([
                'user_id'    => $request->user()?->id,
                'username'   => $request->user()?->username ?: 'admin',
                'action'     => "Released loan {$loan->loan_reference_no} to {$member->full_name} ({$member->member_code})"
                              . " — Amount: ₱" . number_format($approvedAmount, 2)
                              . " | Voucher: {$voucherNo}",
                'ip_address' => $request->ip(),
            ]);

            \App\Services\AccountingService::syncGeneralLedger();
        });

        return response()->json([
            'message'     => 'Loan released and recorded in Cash Disbursement Journal.',
            'loan'        => $loan->fresh()->load('member:id,member_code,firstname,lastname'),
            'disbursement'=> $disbursement,
        ]);
    }

    // =========================================================================
    // 7. RECORD REPAYMENT
    //    POST /loans/{id}/repayments
    //    Creates entry in Cash Receipts Journal (Books of Accounts) — reuses
    //    existing CashReceiptsJournal model.
    //    Updates MemberLoan.outstanding_balance and marks Fully Paid when done.
    // =========================================================================

    public function recordRepayment(Request $request, $id)
    {
        $loan = MemberLoan::with('member')->find($id);
        if (!$loan) {
            return response()->json(['message' => 'Loan record not found.'], 404);
        }
        if (!in_array($loan->status, ['Released', 'Active'])) {
            return response()->json([
                'message' => "Repayments can only be recorded for Released or Active loans. Current status: {$loan->status}.",
            ], 422);
        }

        $request->validate([
            'payment_date'   => 'required|date',
            'amount_paid'    => 'required|numeric|min:0.01',
            'principal_paid' => 'nullable|numeric|min:0',
            'interest_paid'  => 'nullable|numeric|min:0',
            'payment_method' => 'required|string|in:Cash,GCash,Bank Transfer,Check',
            'or_number'      => 'nullable|string|max:100',
            'remarks'        => 'nullable|string|max:500',
            'sync_cash_receipt' => 'nullable|boolean',
        ]);

        $member      = $loan->member;
        $amountPaid  = (float) $request->amount_paid;
        $outstanding = (float) $loan->outstanding_balance;

        if ($amountPaid > $outstanding + 0.01) { // 1-cent tolerance
            return response()->json([
                'message'             => 'Payment amount exceeds outstanding balance.',
                'outstanding_balance' => $outstanding,
                'amount_paid'         => $amountPaid,
            ], 422);
        }

        $repayment  = null;

        DB::transaction(function () use (
            $loan, $member, $request, $amountPaid, $outstanding, &$repayment
        ) {
            $syncReceipt = $request->boolean('sync_cash_receipt', true);
            $date        = $request->payment_date;
            $method      = $request->payment_method;
            $remarks     = $request->remarks ?: '';

            // Generate OR number
            $orNumber = $request->or_number;
            if (empty($orNumber)) {
                $year   = Carbon::parse($date)->year;
                $allOrs = CashReceiptsJournal::where('or_number', 'like', "OR-{$year}-%")->pluck('or_number');
                $maxSeq = 0;
                foreach ($allOrs as $existingOr) {
                    $parts = explode('-', $existingOr);
                    $num   = (int) end($parts);
                    if ($num > $maxSeq) {
                        $maxSeq = $num;
                    }
                }
                $seq = $maxSeq + 1;
                do {
                    $candidate = sprintf('OR-%d-%04d', $year, $seq);
                    $exists    = CashReceiptsJournal::where('or_number', $candidate)->exists();
                    if (!$exists) break;
                    $seq++;
                } while ($exists);
                $orNumber = $candidate;
            }

            // 1. Integrate into Books of Accounts — Cash Receipts Journal
            $cashReceipt = null;
            if ($syncReceipt) {
                $cleanRemarks   = trim(preg_replace('/^\[Method:\s*[^\]]+\]\s*/', '', $remarks));
                $receiptRemarks = trim("[Method: {$method}] "
                    . ($cleanRemarks ?: "Loan Repayment for {$loan->loan_reference_no} — {$member->full_name}"));

                $cashReceipt = CashReceiptsJournal::create([
                    'or_number'       => $orNumber,
                    'receipt_date'    => $date,
                    'received_from'   => $member->full_name,
                    'description'     => "Loan Repayment — Ref: {$loan->loan_reference_no} | [{$member->member_code}] {$member->full_name}",
                    'source_of_income'=> 'Loan Payment',
                    'amount_received' => $amountPaid,
                    'recorded_by'     => $request->user()?->username ?: 'admin',
                    'user_id'         => $request->user()?->id,
                    'remarks'         => $receiptRemarks,
                ]);
            }

            // 2. Compute new outstanding balance
            $newOutstanding = max(0.00, round($outstanding - $amountPaid, 2));

            // Breakdown principal/interest
            $interestPaid = $request->filled('interest_paid')
                ? (float) $request->interest_paid
                : 0.00;
            $principalPaid = $request->filled('principal_paid')
                ? (float) $request->principal_paid
                : max(0.00, round($amountPaid - $interestPaid, 2));

            // Ensure principal + interest equals amount_paid exactly
            if (abs(($principalPaid + $interestPaid) - $amountPaid) > 0.01) {
                $principalPaid = max(0.00, round($amountPaid - $interestPaid, 2));
            }

            // 3. Create repayment record
            $repayment = LoanRepayment::create([
                'loan_id'               => $loan->id,
                'member_id'             => $member->id,
                'or_number'             => $orNumber,
                'cash_receipt_id'       => $cashReceipt?->id,
                'payment_date'          => $date,
                'amount_paid'           => $amountPaid,
                'principal_paid'        => $principalPaid,
                'interest_paid'         => $interestPaid,
                'balance_after_payment' => $newOutstanding,
                'payment_method'        => $method,
                'remarks'               => $remarks,
                'user_id'               => $request->user()?->id,
                'recorded_by'           => $request->user()?->username ?: 'admin',
            ]);

            // 4. Update loan running totals and status
            $newTotalPaid = (float) $loan->total_amount_paid + $amountPaid;
            $newStatus    = $newOutstanding <= 0 ? 'Fully Paid' : 'Active';

            $loan->update([
                'status'              => $newStatus,
                'total_amount_paid'   => $newTotalPaid,
                'outstanding_balance' => $newOutstanding,
            ]);

            ActivityLog::create([
                'user_id'    => $request->user()?->id,
                'username'   => $request->user()?->username ?: 'admin',
                'action'     => "Recorded repayment of ₱" . number_format($amountPaid, 2)
                              . " for loan {$loan->loan_reference_no} — {$member->full_name} ({$member->member_code})"
                              . " | Remaining Balance: ₱" . number_format($newOutstanding, 2)
                              . " | OR: {$orNumber}",
                'ip_address' => $request->ip(),
            ]);

            \App\Services\AccountingService::syncGeneralLedger();
        });

        return response()->json([
            'message'   => 'Repayment recorded and integrated into Cash Receipts Journal.',
            'repayment' => $repayment,
            'loan'      => $loan->fresh()->load('member:id,member_code,firstname,lastname'),
        ], 201);
    }

    // =========================================================================
    // 8. LIST REPAYMENTS FOR A LOAN
    //    GET /loans/{id}/repayments
    // =========================================================================

    public function repayments(Request $request, $id)
    {
        $loan = MemberLoan::with('member:id,member_code,firstname,lastname')->find($id);
        if (!$loan) {
            return response()->json(['message' => 'Loan record not found.'], 404);
        }

        $repayments = LoanRepayment::where('loan_id', $id)
            ->with('user:id,username')
            ->orderBy('payment_date')
            ->orderBy('id')
            ->paginate($request->input('per_page', 25));

        $totalPrincipal = \App\Models\LoanRepayment::where('loan_id', $id)->sum('principal_paid');
        $totalInterest = \App\Models\LoanRepayment::where('loan_id', $id)->sum('interest_paid');

        return response()->json([
            'loan'       => $loan,
            'repayments' => $repayments,
            'summary'    => [
                'total_paid'           => (float) $loan->total_amount_paid,
                'total_principal_paid' => (float) $totalPrincipal,
                'total_interest_paid'  => (float) $totalInterest,
                'outstanding_balance'  => (float) $loan->outstanding_balance,
                'loan_status'          => $loan->status,
            ],
        ]);
    }

    // =========================================================================
    // 9. CANCEL LOAN
    //    POST /loans/{id}/cancel
    // =========================================================================

    public function cancel(Request $request, $id)
    {
        $loan = MemberLoan::with('member')->find($id);
        if (!$loan) {
            return response()->json(['message' => 'Loan record not found.'], 404);
        }
        if (!in_array($loan->status, ['Pending', 'Approved'])) {
            return response()->json(['message' => "Only Pending or Approved loans can be cancelled."], 422);
        }

        $request->validate(['remarks' => 'nullable|string|max:1000']);

        DB::transaction(function () use ($loan, $request) {
            $loan->update([
                'status'  => 'Cancelled',
                'remarks' => $request->remarks ?? $loan->remarks,
            ]);

            ActivityLog::create([
                'user_id'    => $request->user()?->id,
                'username'   => $request->user()?->username ?: 'admin',
                'action'     => "Cancelled loan {$loan->loan_reference_no} for {$loan->member->full_name} ({$loan->member->member_code})",
                'ip_address' => $request->ip(),
            ]);
        });

        return response()->json([
            'message' => 'Loan cancelled.',
            'loan'    => $loan->fresh(),
        ]);
    }
}
