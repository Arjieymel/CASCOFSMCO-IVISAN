<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class MemberLoan extends Model
{
    use HasFactory;

    protected $fillable = [
        'member_id',
        'paid_up_capital_at_application',
        'loan_multiplier_at_application',
        'maximum_eligible_loan',
        'loan_reference_no',
        'requested_amount',
        'application_date',
        'loan_purpose',
        'loan_type',
        'status',
        'approved_amount',
        'approval_date',
        'approved_by',
        'release_date',
        'release_payment_method',
        'release_voucher_number',
        'disbursement_journal_id',
        'term_months',
        'interest_rate',
        'monthly_amortization',
        'total_amount_paid',
        'outstanding_balance',
        'remarks',
        'user_id',
        'recorded_by',
    ];

    protected $casts = [
        'paid_up_capital_at_application' => 'decimal:2',
        'loan_multiplier_at_application' => 'decimal:4',
        'maximum_eligible_loan'          => 'decimal:2',
        'requested_amount'               => 'decimal:2',
        'application_date'               => 'date:Y-m-d',
        'approved_amount'                => 'decimal:2',
        'approval_date'                  => 'date:Y-m-d',
        'release_date'                   => 'date:Y-m-d',
        'interest_rate'                  => 'decimal:4',
        'monthly_amortization'           => 'decimal:2',
        'total_amount_paid'              => 'decimal:2',
        'outstanding_balance'            => 'decimal:2',
    ];

    protected $appends = [
        'remaining_eligibility',
        'eligibility_status',
        'due_date',
        'total_interest',
        'total_payable',
    ];

    // ---------------------------------------------------------------------------
    // Relationships — reuse existing models, no duplication
    // ---------------------------------------------------------------------------

    /**
     * The member this loan belongs to (reuses existing Member model).
     */
    public function member(): BelongsTo
    {
        return $this->belongsTo(Member::class, 'member_id');
    }

    /**
     * The staff/admin who recorded the loan.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    /**
     * The disbursement entry in the Cash Disbursement Journal (Books of Accounts).
     */
    public function disbursementJournal(): BelongsTo
    {
        return $this->belongsTo(CashDisbursementJournal::class, 'disbursement_journal_id');
    }

    /**
     * All repayments for this loan.
     */
    public function repayments(): HasMany
    {
        return $this->hasMany(LoanRepayment::class, 'loan_id')->orderBy('payment_date')->orderBy('id');
    }

    // ---------------------------------------------------------------------------
    // Computed Attributes
    // ---------------------------------------------------------------------------

    /**
     * Remaining eligibility = maximum_eligible_loan − outstanding_balance of all ACTIVE loans
     * for this member. Displayed on the eligibility card.
     *
     * At the individual loan level this is: max_eligible − approved_amount (when Approved/Active).
     */
    public function getRemainingEligibilityAttribute(): float
    {
        return max(0.00, (float)$this->maximum_eligible_loan - (float)$this->requested_amount);
    }

    /**
     * Eligibility status: Eligible | Exceeds Limit | Pending Multiplier Config
     */
    public function getEligibilityStatusAttribute(): string
    {
        if ((float)$this->loan_multiplier_at_application <= 0) {
            return 'Pending Multiplier Config';
        }
        if ((float)$this->requested_amount <= (float)$this->maximum_eligible_loan) {
            return 'Eligible';
        }
        return 'Exceeds Limit';
    }

    public function getDueDateAttribute(): ?string
    {
        if (!$this->release_date || !$this->term_months) {
            return null;
        }
        return \Carbon\Carbon::parse($this->release_date)
            ->addMonths((int)$this->term_months)
            ->format('Y-m-d');
    }

    /**
     * Calculated Flat Interest
     */
    public function getTotalInterestAttribute(): float
    {
        if (!$this->term_months || $this->interest_rate === null) {
            return 0.00;
        }
        $principal = (float)($this->approved_amount ?? $this->requested_amount);
        return round($principal * (float)$this->interest_rate * ((int)$this->term_months / 12), 2);
    }

    /**
     * Calculated Total Payable (Principal + Flat Interest)
     */
    public function getTotalPayableAttribute(): float
    {
        $principal = (float)($this->approved_amount ?? $this->requested_amount);
        return round($principal + $this->total_interest, 2);
    }
}
