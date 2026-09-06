<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateJournalVoucherRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() && in_array($this->user()->role, ['Administrator', 'Staff']);
    }

    public function rules(): array
    {
        $id = $this->route('id');
        return [
            'voucher_number' => ['required', 'string', 'max:100', Rule::unique('journal_vouchers', 'voucher_number')->ignore($id)],
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
