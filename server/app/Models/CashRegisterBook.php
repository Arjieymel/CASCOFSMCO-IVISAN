<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CashRegisterBook extends Model
{
    use HasFactory;

    protected $fillable = [
        'date',
        'reference_no',
        'description',
        'cash_in',
        'cash_out',
        'running_balance',
        'recorded_by',
        'user_id',
        'remarks',
    ];

    protected $casts = [
        'date' => 'date:Y-m-d',
        'cash_in' => 'decimal:2',
        'cash_out' => 'decimal:2',
        'running_balance' => 'decimal:2',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }
}
