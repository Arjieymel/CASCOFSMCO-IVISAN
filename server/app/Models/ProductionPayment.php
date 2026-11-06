<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ProductionPayment extends Model
{
    use HasFactory;

    protected $fillable = [
        'production_id',
        'cash_disbursement_id',
        'member_id',
        'voucher_number',
        'payment_date',
        'amount',
        'payment_method',
        'approved_by',
        'remarks',
        'user_id',
        'recorded_by',
    ];

    protected $casts = [
        'payment_date' => 'date',
        'amount' => 'decimal:2',
    ];

    public function production(): BelongsTo
    {
        return $this->belongsTo(Production::class, 'production_id');
    }

    public function cashDisbursement(): BelongsTo
    {
        return $this->belongsTo(CashDisbursementJournal::class, 'cash_disbursement_id');
    }

    public function member(): BelongsTo
    {
        return $this->belongsTo(Member::class, 'member_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }
}
