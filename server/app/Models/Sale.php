<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Sale extends Model
{
    use HasFactory;

    protected $fillable = [
        'invoice_no',
        'buyer',
        'member_id',
        'product',
        'quantity',
        'unit',
        'unit_price',
        'total_amount',
        'paid_amount',
        'remaining_balance',
        'cash_receipt_id',
        'cbu_rate_per_kg',
        'cbu_deduction',
        'net_amount',
        'cbu_deducted',
        'cbu_deducted_at',
        'payment_method',
        'remarks',
        'status',
        'sale_date',
    ];

    protected $casts = [
        'quantity' => 'decimal:2',
        'unit_price' => 'decimal:2',
        'total_amount' => 'decimal:2',
        'paid_amount' => 'decimal:2',
        'remaining_balance' => 'decimal:2',
        'cbu_rate_per_kg' => 'decimal:4',
        'cbu_deduction' => 'decimal:2',
        'net_amount' => 'decimal:2',
        'cbu_deducted' => 'boolean',
        'cbu_deducted_at' => 'datetime',
        'sale_date' => 'date',
    ];

    /**
     * Relationship with the member (if sale is associated with a member).
     */
    public function member(): BelongsTo
    {
        return $this->belongsTo(Member::class, 'member_id');
    }

    /**
     * Primary cash receipt created for this sale.
     */
    public function cashReceipt(): BelongsTo
    {
        return $this->belongsTo(CashReceiptsJournal::class, 'cash_receipt_id');
    }

    /**
     * All cash receipts generated for this sale.
     */
    public function cashReceipts(): HasMany
    {
        return $this->hasMany(CashReceiptsJournal::class, 'sale_id');
    }

    /**
     * Payment collection records for this sale.
     */
    public function payments(): HasMany
    {
        return $this->hasMany(SalePayment::class, 'sale_id');
    }
}
