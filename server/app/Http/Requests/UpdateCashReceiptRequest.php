<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateCashReceiptRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() && $this->user()->role === 'Administrator';
    }

    public function rules(): array
    {
        $id = $this->route('id');
        return [
            'or_number' => ['required', 'string', 'max:100', Rule::unique('cash_receipts_journals', 'or_number')->ignore($id)],
            'receipt_date' => 'required|date',
            'received_from' => 'required|string|max:150',
            'description' => 'required|string',
            'source_of_income' => 'required|string|max:150',
            'amount_received' => 'required|numeric|min:0.01',
            'remarks' => 'nullable|string',
        ];
    }
}
