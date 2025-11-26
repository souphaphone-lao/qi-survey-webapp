<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class SubmissionRequest extends FormRequest
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

        $rules = [
            'answers_json' => ['nullable', 'array'],
            'status' => ['nullable', 'string', Rule::in(['draft', 'submitted'])],
        ];

        // Required fields on create
        if ($this->isMethod('POST')) {
            $rules['questionnaire_id'] = ['required', 'exists:questionnaires,id'];
            $rules['institution_id'] = ['required', 'exists:institutions,id'];
        }

        return $rules;
    }
}
