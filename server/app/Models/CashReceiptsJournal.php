<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CashReceiptsJournal extends Model
{
    use HasFactory;

    protected $fillable = [
        'or_number',
        'receipt_date',
        'received_from',
        'description',
        'source_of_income',
        'amount_received',
        'recorded_by',
        'user_id',
        'sale_id',
        'remarks',
    ];

    protected $casts = [
        'receipt_date' => 'date:Y-m-d',
        'amount_received' => 'decimal:2',
    ];

    protected $appends = [
        'payment_method',
    ];

    public function getPaymentMethodAttribute(): string
    {
        if ($this->remarks && preg_match('/^\[Method:\s*([^\]]+)\]/', $this->remarks, $matches)) {
            return trim($matches[1]);
        }
        return 'Cash';
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function sale(): BelongsTo
    {
        return $this->belongsTo(Sale::class, 'sale_id');
    }
}
