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
        'remarks',
    ];

    protected $casts = [
        'receipt_date' => 'date:Y-m-d',
        'amount_received' => 'decimal:2',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }
}
