<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreGeneralLedgerRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() && $this->user()->role === 'Administrator';
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
}
