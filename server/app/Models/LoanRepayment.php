<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LoanRepayment extends Model
{
    use HasFactory;

    protected $fillable = [
        'loan_id',
        'member_id',
        'or_number',
        'cash_receipt_id',
        'payment_date',
        'amount_paid',
        'principal_paid',
        'interest_paid',
        'balance_after_payment',
        'payment_method',
        'remarks',
        'user_id',
        'recorded_by',
    ];

    protected $casts = [
        'payment_date'          => 'date:Y-m-d',
        'amount_paid'           => 'decimal:2',
        'principal_paid'        => 'decimal:2',
        'interest_paid'         => 'decimal:2',
        'balance_after_payment' => 'decimal:2',
    ];

    // ---------------------------------------------------------------------------
    // Relationships — all reuse existing models
    // ---------------------------------------------------------------------------

    public function loan(): BelongsTo
    {
        return $this->belongsTo(MemberLoan::class, 'loan_id');
    }

    /**
     * Reuses existing Member model.
     */
    public function member(): BelongsTo
    {
        return $this->belongsTo(Member::class, 'member_id');
    }

    /**
     * Reuses existing CashReceiptsJournal model (Books of Accounts).
     */
    public function cashReceipt(): BelongsTo
    {
        return $this->belongsTo(CashReceiptsJournal::class, 'cash_receipt_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }
}
