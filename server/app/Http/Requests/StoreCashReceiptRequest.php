<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreCashReceiptRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() && in_array($this->user()->role, ['Administrator', 'Staff']);
    }

    public function rules(): array
    {
        return [
            'or_number' => 'nullable|string|max:100|unique:cash_receipts_journals,or_number',
            'receipt_date' => 'required|date',
            'received_from' => 'required|string|max:150',
            'description' => 'required|string',
            'source_of_income' => 'required|string|max:150',
            'amount_received' => 'required|numeric|min:0.01',
            'payment_method' => 'nullable|string|max:50',
            'remarks' => 'nullable|string',
        ];
    }
}
