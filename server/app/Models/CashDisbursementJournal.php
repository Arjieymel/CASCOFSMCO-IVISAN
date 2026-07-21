<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CashDisbursementJournal extends Model
{
    use HasFactory;

    protected $fillable = [
        'voucher_number',
        'disbursement_date',
        'payee',
        'description',
        'expense_account',
        'amount',
        'payment_method',
        'approved_by',
        'user_id',
        'remarks',
    ];

    protected $casts = [
        'disbursement_date' => 'date:Y-m-d',
        'amount' => 'decimal:2',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }
}
