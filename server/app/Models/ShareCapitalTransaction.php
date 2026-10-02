<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ShareCapitalTransaction extends Model
{
    use HasFactory;

    protected $fillable = [
        'member_id',
        'production_id',
        'sale_id',
        'transaction_type',
        'transaction_date',
        'reference_no',
        'amount',
        'balance_after',
        'kilograms',
        'unit_price',
        'gross_amount',
        'cbu_rate_per_kg',
        'net_amount',
        'source',
        'payment_method',
        'cash_receipt_id',
        'remarks',
        'user_id',
        'recorded_by',
    ];

    protected $casts = [
        'transaction_date' => 'date:Y-m-d',
        'amount' => 'decimal:2',
        'balance_after' => 'decimal:2',
        'kilograms' => 'decimal:2',
        'unit_price' => 'decimal:2',
        'gross_amount' => 'decimal:2',
        'cbu_rate_per_kg' => 'decimal:4',
        'net_amount' => 'decimal:2',
    ];

    /**
     * Relationship to the member.
     */
    public function member(): BelongsTo
    {
        return $this->belongsTo(Member::class, 'member_id');
    }

    /**
     * Relationship to the production record.
     */
    public function production(): BelongsTo
    {
        return $this->belongsTo(Production::class, 'production_id');
    }

    /**
     * Relationship to the user who recorded the transaction.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    /**
     * Relationship to the Cash Receipts Journal entry in Books of Accounts.
     */
    public function cashReceipt(): BelongsTo
    {
        return $this->belongsTo(CashReceiptsJournal::class, 'cash_receipt_id');
    }
}
