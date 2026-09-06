<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreCashDisbursementRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() && in_array($this->user()->role, ['Administrator', 'Staff']);
    }

    public function rules(): array
    {
        return [
            'voucher_number' => 'nullable|string|max:100|unique:cash_disbursement_journals,voucher_number',
            'disbursement_date' => 'required|date',
            'payee' => 'required|string|max:150',
            'description' => 'required|string',
            'expense_account' => 'required|string|max:150',
            'amount' => 'required|numeric|min:0.01',
            'payment_method' => 'required|string|max:50',
            'approved_by' => 'required|string|max:100',
            'remarks' => 'nullable|string',
        ];
    }
}
