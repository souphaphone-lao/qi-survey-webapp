<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class QuestionnaireResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'code' => $this->code,
            'version' => $this->version,
            'title' => $this->title,
            'description' => $this->description,
            'surveyjs_json' => $this->surveyjs_json,
            'is_active' => $this->is_active,
            'parent_version_id' => $this->parent_version_id,
            'published_at' => $this->published_at?->toISOString(),
            'deprecated_at' => $this->deprecated_at?->toISOString(),
            'version_notes' => $this->version_notes,
            'breaking_changes' => $this->breaking_changes,
            'submissions_count' => $this->submissions()->count(),
            'created_by' => $this->whenLoaded('createdBy', fn () => [
                'id' => $this->createdBy->id,
                'name' => $this->createdBy->name,
            ]),
            'updated_by' => $this->whenLoaded('updatedBy', fn () => $this->updatedBy ? [
                'id' => $this->updatedBy->id,
                'name' => $this->updatedBy->name,
            ] : null),
            'created_at' => $this->created_at->toISOString(),
            'updated_at' => $this->updated_at->toISOString(),
        ];
    }
}
