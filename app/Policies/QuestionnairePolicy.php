<?php

namespace App\Policies;

use App\Models\Questionnaire;
use App\Models\User;

class QuestionnairePolicy
{
    public function viewAny(User $user): bool
    {
        return $user->hasPermissionTo('questionnaires.view');
    }

    public function view(User $user, Questionnaire $questionnaire): bool
    {
        return $user->hasPermissionTo('questionnaires.view');
    }

    public function create(User $user): bool
    {
        return $user->hasPermissionTo('questionnaires.create');
    }

    public function update(User $user, Questionnaire $questionnaire): bool
    {
        return $user->hasPermissionTo('questionnaires.update');
    }

    public function delete(User $user, Questionnaire $questionnaire): bool
    {
        return $user->hasPermissionTo('questionnaires.delete');
    }
}
