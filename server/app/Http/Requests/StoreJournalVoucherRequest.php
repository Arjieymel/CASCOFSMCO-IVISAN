<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreJournalVoucherRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() && $this->user()->role === 'Administrator';
    }

    public function rules(): array
    {
        return [
            'voucher_number' => 'nullable|string|max:100|unique:journal_vouchers,voucher_number',
            'voucher_date' => 'required|date',
            'description' => 'required|string',
            'debit_account' => 'required|string|max:150',
            'credit_account' => 'required|string|max:150',
            'amount' => 'required|numeric|min:0.01',
            'prepared_by' => 'nullable|string|max:100',
            'approved_by' => 'required|string|max:100',
            'status' => 'required|string|in:Draft,Posted,Approved,Cancelled',
        ];
    }
}
