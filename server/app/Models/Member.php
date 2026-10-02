<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Member extends Model
{
    use HasFactory;

    protected $fillable = [
        'member_code',
        'firstname',
        'lastname',
        'gender',
        'birthdate',
        'address',
        'contact_number',
        'email',
        'membership_date',
        'status',
        'profile_picture',
        'subscribed_shares',
        'share_par_value',
        'subscribed_capital',
        'paid_up_capital',
        'cbu_balance',
        'membership_fee_status',
        'membership_fee_amount',
        'membership_fee_or',
        'membership_fee_date',
    ];

    protected $casts = [
        'birthdate' => 'date',
        'membership_date' => 'date',
        'subscribed_shares' => 'integer',
        'share_par_value' => 'decimal:2',
        'subscribed_capital' => 'decimal:2',
        'paid_up_capital' => 'decimal:2',
        'cbu_balance' => 'decimal:2',
        'membership_fee_amount' => 'decimal:2',
        'membership_fee_date' => 'date:Y-m-d',
    ];

    protected $appends = [
        'full_name',
        'total_equity',
        'unpaid_subscribed_capital',
    ];

    /**
     * Get the member's full name.
     */
    public function getFullNameAttribute(): string
    {
        return "{$this->firstname} {$this->lastname}";
    }

    /**
     * Get the member's age.
     */
    public function getAgeAttribute(): int
    {
        return $this->birthdate ? now()->diffInYears(\Carbon\Carbon::parse($this->birthdate)) : 0;
    }

    /**
     * Get total member equity (Paid-up Share Capital + CBU Balance).
     */
    public function getTotalEquityAttribute(): float
    {
        return (float)($this->paid_up_capital ?? 0) + (float)($this->cbu_balance ?? 0);
    }

    /**
     * Get unpaid portion of subscribed share capital.
     */
    public function getUnpaidSubscribedCapitalAttribute(): float
    {
        $sub = (float)($this->subscribed_capital ?? 0);
        $paid = (float)($this->paid_up_capital ?? 0);
        return max(0.00, $sub - $paid);
    }

    /**
     * Relationship with production records.
     */
    public function productions(): HasMany
    {
        return $this->hasMany(Production::class, 'member_id');
    }

    /**
     * Relationship with share capital transactions.
     */
    public function shareCapitalTransactions(): HasMany
    {
        return $this->hasMany(ShareCapitalTransaction::class, 'member_id')->orderBy('transaction_date', 'desc')->orderBy('id', 'desc');
    }

    /**
     * Relationship with member loan applications.
     */
    public function loans(): HasMany
    {
        return $this->hasMany(MemberLoan::class, 'member_id')->orderBy('application_date', 'desc')->orderBy('id', 'desc');
    }

    /**
     * Relationship with loan repayments (denormalized on loan_repayments table).
     */
    public function loanRepayments(): HasMany
    {
        return $this->hasMany(LoanRepayment::class, 'member_id')->orderBy('payment_date', 'desc');
    }
}
