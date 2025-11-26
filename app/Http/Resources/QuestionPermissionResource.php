<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class QuestionPermissionResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'questionnaire_id' => $this->questionnaire_id,
            'questionnaire' => $this->whenLoaded('questionnaire', fn () => [
                'id' => $this->questionnaire->id,
                'title' => $this->questionnaire->title,
                'code' => $this->questionnaire->code,
            ]),
            'question_name' => $this->question_name,
            'institution_id' => $this->institution_id,
            'institution' => $this->whenLoaded('institution', fn () => [
                'id' => $this->institution->id,
                'name' => $this->institution->name,
                'code' => $this->institution->code,
            ]),
            'department_id' => $this->department_id,
            'department' => $this->whenLoaded('department', fn () => [
                'id' => $this->department->id,
                'name' => $this->department->name,
                'code' => $this->department->code,
            ]),
            'permission_type' => $this->permission_type,
            'created_at' => $this->created_at->toISOString(),
            'updated_at' => $this->updated_at->toISOString(),
        ];
    }
}
