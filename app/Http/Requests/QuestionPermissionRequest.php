<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class QuestionPermissionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'questionnaire_id' => ['required', 'exists:questionnaires,id'],
            'question_name' => ['required', 'string', 'max:255'],
            'institution_id' => ['required', 'exists:institutions,id'],
            'department_id' => ['required', 'exists:departments,id'],
            'permission_type' => ['nullable', 'in:edit,view'],
        ];
    }
}
