<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Sale extends Model
{
    use HasFactory;

    protected $fillable = [
        'invoice_no',
        'buyer',
        'product',
        'quantity',
        'unit',
        'unit_price',
        'total_amount',
        'payment_method',
        'remarks',
        'status',
        'sale_date',
    ];

    protected $casts = [
        'quantity' => 'decimal:2',
        'unit_price' => 'decimal:2',
        'total_amount' => 'decimal:2',
        'sale_date' => 'date',
    ];
}
