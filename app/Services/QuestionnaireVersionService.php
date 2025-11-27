<?php

namespace App\Services;

use App\Models\Questionnaire;
use App\Models\QuestionPermission;
use Illuminate\Support\Facades\DB;

class QuestionnaireVersionService
{
    /**
     * Duplicate a questionnaire as a new version.
     */
    public function duplicateAsNewVersion(
        Questionnaire $questionnaire,
        ?string $versionNotes = null,
        bool $breakingChanges = false,
        bool $copyPermissions = false
    ): Questionnaire {
        return DB::transaction(function () use ($questionnaire, $versionNotes, $breakingChanges, $copyPermissions) {
            // Create the new version using the model's duplicate method
            $newVersion = $questionnaire->duplicate();

            // Update version notes and breaking changes flag
            $newVersion->version_notes = $versionNotes;
            $newVersion->breaking_changes = $breakingChanges;
            $newVersion->save();

            // Optionally copy question permissions from previous version
            if ($copyPermissions) {
                $this->copyPermissions($questionnaire, $newVersion);
            }

            return $newVersion;
        });
    }

    /**
     * Activate a questionnaire version (deactivate others with same code).
     */
    public function activateVersion(Questionnaire $questionnaire): Questionnaire
    {
        return DB::transaction(function () use ($questionnaire) {
            // Deactivate all other versions with the same code
            Questionnaire::where('code', $questionnaire->code)
                ->where('id', '!=', $questionnaire->id)
                ->update([
                    'is_active' => false,
                    'deprecated_at' => now(),
                ]);

            // Activate this version
            $questionnaire->is_active = true;
            $questionnaire->published_at = now();
            $questionnaire->deprecated_at = null;
            $questionnaire->save();

            return $questionnaire;
        });
    }

    /**
     * Deprecate a questionnaire version.
     */
    public function deprecateVersion(Questionnaire $questionnaire): Questionnaire
    {
        $questionnaire->is_active = false;
        $questionnaire->deprecated_at = now();
        $questionnaire->save();

        return $questionnaire;
    }

    /**
     * Get all versions of a questionnaire by code.
     */
    public function getVersionsByCode(string $code)
    {
        return Questionnaire::where('code', $code)
            ->orderBy('version', 'desc')
            ->get();
    }

    /**
     * Compare two questionnaire versions.
     */
    public function compareVersions(Questionnaire $version1, Questionnaire $version2): array
    {
        return [
            'version1' => [
                'id' => $version1->id,
                'version' => $version1->version,
                'title' => $version1->title,
                'description' => $version1->description,
                'is_active' => $version1->is_active,
                'published_at' => $version1->published_at,
                'deprecated_at' => $version1->deprecated_at,
                'version_notes' => $version1->version_notes,
                'breaking_changes' => $version1->breaking_changes,
                'question_count' => count($version1->extractQuestionNames()),
                'questions' => $version1->extractQuestionNames(),
            ],
            'version2' => [
                'id' => $version2->id,
                'version' => $version2->version,
                'title' => $version2->title,
                'description' => $version2->description,
                'is_active' => $version2->is_active,
                'published_at' => $version2->published_at,
                'deprecated_at' => $version2->deprecated_at,
                'version_notes' => $version2->version_notes,
                'breaking_changes' => $version2->breaking_changes,
                'question_count' => count($version2->extractQuestionNames()),
                'questions' => $version2->extractQuestionNames(),
            ],
            'differences' => $this->calculateDifferences($version1, $version2),
        ];
    }

    /**
     * Copy question permissions from one questionnaire to another.
     */
    private function copyPermissions(Questionnaire $source, Questionnaire $target): void
    {
        $sourcePermissions = QuestionPermission::where('questionnaire_id', $source->id)->get();

        foreach ($sourcePermissions as $permission) {
            QuestionPermission::create([
                'questionnaire_id' => $target->id,
                'question_name' => $permission->question_name,
                'institution_id' => $permission->institution_id,
                'department_id' => $permission->department_id,
                'permission_type' => $permission->permission_type,
            ]);
        }
    }

    /**
     * Calculate differences between two questionnaire versions.
     */
    private function calculateDifferences(Questionnaire $version1, Questionnaire $version2): array
    {
        $questions1 = $version1->extractQuestionNames();
        $questions2 = $version2->extractQuestionNames();

        return [
            'added_questions' => array_values(array_diff($questions2, $questions1)),
            'removed_questions' => array_values(array_diff($questions1, $questions2)),
            'common_questions' => array_values(array_intersect($questions1, $questions2)),
            'title_changed' => $version1->title !== $version2->title,
            'description_changed' => $version1->description !== $version2->description,
        ];
    }
}
