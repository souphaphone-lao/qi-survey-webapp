<?php

namespace App\Services;

use App\Models\QuestionPermission;
use App\Models\Submission;
use App\Models\User;

class QuestionPermissionService
{
    /**
     * Get editable questions for user on submission
     */
    public function getEditableQuestions(User $user, Submission $submission): array
    {
        // Admin can edit all questions
        if ($user->hasRole('admin')) {
            return $this->getAllQuestions($submission);
        }

        // Get question permissions for user's institution and department
        $permissions = QuestionPermission::where('questionnaire_id', $submission->questionnaire_id)
            ->where('institution_id', $user->institution_id)
            ->where('department_id', $user->department_id)
            ->where('permission_type', 'edit')
            ->pluck('question_name')
            ->toArray();

        // If no specific permissions are configured, allow all questions (default-allow)
        if (empty($permissions)) {
            return $this->getAllQuestions($submission);
        }

        return $permissions;
    }

    /**
     * Check if user can edit specific question
     */
    public function canEditQuestion(User $user, Submission $submission, string $questionName): bool
    {
        // Admin can edit all questions
        if ($user->hasRole('admin')) {
            return true;
        }

        // Check if user has permission for this specific question
        return QuestionPermission::where('questionnaire_id', $submission->questionnaire_id)
            ->where('institution_id', $user->institution_id)
            ->where('department_id', $user->department_id)
            ->where('question_name', $questionName)
            ->where('permission_type', 'edit')
            ->exists();
    }

    /**
     * Get permission map for frontend (question_name => can_edit boolean)
     */
    public function getPermissionsMap(User $user, Submission $submission): array
    {
        $allQuestions = $this->getAllQuestions($submission);
        $editableQuestions = $this->getEditableQuestions($user, $submission);

        $map = [];
        foreach ($allQuestions as $questionName) {
            $map[$questionName] = in_array($questionName, $editableQuestions);
        }

        return $map;
    }

    /**
     * Validate answers against permissions (returns invalid question names)
     */
    public function validateAnswers(User $user, Submission $submission, array $answers): array
    {
        // Admin can edit all questions
        if ($user->hasRole('admin')) {
            return [];
        }

        $editableQuestions = $this->getEditableQuestions($user, $submission);
        $invalidQuestions = [];

        foreach (array_keys($answers) as $questionName) {
            if (!in_array($questionName, $editableQuestions)) {
                $invalidQuestions[] = $questionName;
            }
        }

        return $invalidQuestions;
    }

    /**
     * Get all questions from questionnaire schema
     */
    private function getAllQuestions(Submission $submission): array
    {
        $questionnaire = $submission->questionnaire;
        $schema = $questionnaire->surveyjs_json;

        $questions = [];

        // Extract question names from SurveyJS JSON schema
        if (isset($schema['pages'])) {
            foreach ($schema['pages'] as $page) {
                if (isset($page['elements'])) {
                    foreach ($page['elements'] as $element) {
                        if (isset($element['name'])) {
                            $questions[] = $element['name'];
                        }
                    }
                }
            }
        } elseif (isset($schema['elements'])) {
            foreach ($schema['elements'] as $element) {
                if (isset($element['name'])) {
                    $questions[] = $element['name'];
                }
            }
        }

        return $questions;
    }
}
