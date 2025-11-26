<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;

class UserRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $userId = $this->route('user')?->id;

        $rules = [
            'name' => ['required', 'string', 'max:255'],
            'email' => [
                'required',
                'email',
                'max:255',
                Rule::unique('users')->ignore($userId),
            ],
            'institution_id' => ['required', 'exists:institutions,id'],
            'is_active' => ['boolean'],
            'role' => ['required', 'string', Rule::in(['admin', 'enumerator', 'viewer'])],
        ];

        // Password is required only on create
        if ($this->isMethod('POST')) {
            $rules['password'] = ['required', 'string', Password::defaults()];
        } else {
            $rules['password'] = ['nullable', 'string', Password::defaults()];
        }

        return $rules;
    }
}
