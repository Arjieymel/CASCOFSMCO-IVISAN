<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateCashDisbursementRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() && $this->user()->role === 'Administrator';
    }

    public function rules(): array
    {
        $id = $this->route('id');
        return [
            'voucher_number' => ['required', 'string', 'max:100', Rule::unique('cash_disbursement_journals', 'voucher_number')->ignore($id)],
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
