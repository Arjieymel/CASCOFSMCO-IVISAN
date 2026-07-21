<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class GeneralLedger extends Model
{
    use HasFactory;

    protected $fillable = [
        'account_code',
        'account_title',
        'transaction_date',
        'reference_number',
        'debit',
        'credit',
        'running_balance',
        'source_module',
        'description',
    ];

    protected $casts = [
        'transaction_date' => 'date:Y-m-d',
        'debit' => 'decimal:2',
        'credit' => 'decimal:2',
        'running_balance' => 'decimal:2',
    ];
}
