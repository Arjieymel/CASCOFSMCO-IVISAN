<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreCashRegisterRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() && $this->user()->role === 'Administrator';
    }

    public function rules(): array
    {
        return [
            'date' => 'required|date',
            'reference_no' => 'nullable|string|max:100|unique:cash_register_books,reference_no',
            'description' => 'required|string',
            'cash_in' => 'required|numeric|min:0',
            'cash_out' => 'required|numeric|min:0',
            'remarks' => 'nullable|string',
        ];
    }
}
