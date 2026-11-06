<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Production extends Model
{
    use HasFactory;

    protected $fillable = [
        'member_id',
        'product_type',
        'quantity',
        'unit',
        'unit_price',
        'gross_amount',
        'cbu_rate_per_kg',
        'cbu_deduction',
        'net_amount',
        'cbu_deducted',
        'cbu_deducted_at',
        'cbu_transaction_id',
        'source',
        'remarks',
        'production_date',
        'status',
        'payment_status',
        'paid_amount',
        'remaining_balance',
    ];

    protected $casts = [
        'quantity' => 'decimal:2',
        'unit_price' => 'decimal:2',
        'gross_amount' => 'decimal:2',
        'cbu_rate_per_kg' => 'decimal:4',
        'cbu_deduction' => 'decimal:2',
        'net_amount' => 'decimal:2',
        'cbu_deducted' => 'boolean',
        'cbu_deducted_at' => 'datetime',
        'production_date' => 'date',
        'paid_amount' => 'decimal:2',
        'remaining_balance' => 'decimal:2',
    ];

    /**
     * Relationship with the member who produced it.
     */
    public function member(): BelongsTo
    {
        return $this->belongsTo(Member::class, 'member_id');
    }

    /**
     * Relationship to the CBU share capital transaction.
     */
    public function cbuTransaction(): BelongsTo
    {
        return $this->belongsTo(ShareCapitalTransaction::class, 'cbu_transaction_id');
    }

    /**
     * Relationship to the member payment records.
     */
    public function payments(): HasMany
    {
        return $this->hasMany(ProductionPayment::class, 'production_id');
    }
}
