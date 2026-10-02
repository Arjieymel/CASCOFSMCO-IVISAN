<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

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
}
