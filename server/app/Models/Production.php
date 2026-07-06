<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Production extends Model
{
    use HasFactory;

    protected $fillable = [
        'member_id',
        'product_type',
        'quantity',
        'unit',
        'source',
        'remarks',
        'production_date',
        'status',
    ];

    protected $casts = [
        'quantity' => 'decimal:2',
        'production_date' => 'date',
    ];

    /**
     * Relationship with the member who produced it.
     */
    public function member(): BelongsTo
    {
        return $this->belongsTo(Member::class, 'member_id');
    }
}
