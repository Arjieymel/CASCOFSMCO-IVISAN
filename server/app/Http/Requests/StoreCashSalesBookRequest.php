<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreCashSalesBookRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() && in_array($this->user()->role, ['Administrator', 'Staff']);
    }

    public function rules(): array
    {
        return [
            'invoice_number' => 'nullable|string|max:100|unique:cash_sales_books,invoice_number',
            'sale_date' => 'required|date',
            'customer' => 'required|string|max:150',
            'product' => 'required|string|max:100',
            'quantity' => 'required|numeric|min:0.01',
            'unit_price' => 'required|numeric|min:0.01',
            'payment_method' => 'required|string|max:50',
        ];
    }
}
