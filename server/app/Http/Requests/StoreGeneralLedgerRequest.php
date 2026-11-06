<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreGeneralLedgerRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() && in_array($this->user()->role, ['Administrator', 'Staff']);
    }

    public function rules(): array
    {
        return [
            'account_code' => 'required|string|max:50',
            'account_title' => 'required|string|max:150',
            'transaction_date' => 'required|date',
            'reference_number' => 'required|string|max:100',
            'debit' => 'required|numeric|min:0',
            'credit' => 'required|numeric|min:0',
            'source_module' => 'nullable|string|max:100',
            'description' => 'nullable|string',
        ];
    }

    public function withValidator($validator): void
    {
        $validator->after(function ($validator) {
            $debit = (float)$this->input('debit', 0);
            $credit = (float)$this->input('credit', 0);

            if ($debit <= 0 && $credit <= 0) {
                $validator->errors()->add('debit', 'Either Debit or Credit amount must be greater than zero.');
            }

            if ($debit > 0 && $credit > 0) {
                $validator->errors()->add('credit', 'A single ledger line cannot have both Debit and Credit amounts. Record separate entries for Debit and Credit.');
            }
        });
    }
}
