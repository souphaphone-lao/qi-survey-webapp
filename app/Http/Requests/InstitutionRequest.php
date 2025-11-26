<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class InstitutionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        // No validation needed for DELETE requests
        if ($this->isMethod('DELETE')) {
            return [];
        }

        $institutionId = $this->route('institution')?->id;

        return [
            'name' => ['required', 'string', 'max:255'],
            'code' => [
                'required',
                'string',
                'max:50',
                Rule::unique('institutions')->ignore($institutionId),
            ],
            'level' => ['required', 'string', Rule::in(['central', 'province', 'district'])],
            'parent_institution_id' => ['nullable', 'exists:institutions,id'],
            'is_active' => ['boolean'],
        ];
    }

    public function withValidator($validator): void
    {
        $validator->after(function ($validator) {
            // Prevent setting itself as parent
            if ($this->route('institution') &&
                $this->parent_institution_id === $this->route('institution')->id) {
                $validator->errors()->add('parent_institution_id', 'An institution cannot be its own parent.');
            }
        });
    }
}
