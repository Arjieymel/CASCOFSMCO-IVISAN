<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateCashRegisterRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() && $this->user()->role === 'Administrator';
    }

    public function rules(): array
    {
        $id = $this->route('id');
        return [
            'date' => 'required|date',
            'reference_no' => ['required', 'string', 'max:100', Rule::unique('cash_register_books', 'reference_no')->ignore($id)],
            'description' => 'required|string',
            'cash_in' => 'required|numeric|min:0',
            'cash_out' => 'required|numeric|min:0',
            'remarks' => 'nullable|string',
        ];
    }
}
