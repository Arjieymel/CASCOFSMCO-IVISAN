<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateCashSalesBookRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() && $this->user()->role === 'Administrator';
    }

    public function rules(): array
    {
        $id = $this->route('id');
        return [
            'invoice_number' => ['required', 'string', 'max:100', Rule::unique('cash_sales_books', 'invoice_number')->ignore($id)],
            'sale_date' => 'required|date',
            'customer' => 'required|string|max:150',
            'product' => 'required|string|max:100',
            'quantity' => 'required|numeric|min:0.01',
            'unit_price' => 'required|numeric|min:0.01',
            'payment_method' => 'required|string|max:50',
        ];
    }
}
