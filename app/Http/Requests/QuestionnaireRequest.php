<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class QuestionnaireRequest extends FormRequest
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
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'surveyjs_json' => ['required', 'array'],
            'is_active' => ['boolean'],
        ];

        // Code is required only on create
        if ($this->isMethod('POST')) {
            $rules['code'] = ['required', 'string', 'max:50'];
        }

        return $rules;
    }

    public function withValidator($validator): void
    {
        $validator->after(function ($validator) {
            // Validate SurveyJS JSON structure
            $json = $this->surveyjs_json;

            if (!is_array($json)) {
                $validator->errors()->add('surveyjs_json', 'Invalid SurveyJS JSON format.');
                return;
            }

            // Check for required SurveyJS structure
            if (!isset($json['pages']) && !isset($json['elements'])) {
                $validator->errors()->add('surveyjs_json', 'SurveyJS JSON must contain pages or elements.');
            }
        });
    }
}
