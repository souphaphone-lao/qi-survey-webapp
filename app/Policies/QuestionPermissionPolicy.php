<?php

namespace App\Policies;

use App\Models\QuestionPermission;
use App\Models\User;

class QuestionPermissionPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->hasRole('admin');
    }

    public function view(User $user, QuestionPermission $questionPermission): bool
    {
        return $user->hasRole('admin');
    }

    public function create(User $user): bool
    {
        return $user->hasRole('admin');
    }

    public function update(User $user, QuestionPermission $questionPermission): bool
    {
        return $user->hasRole('admin');
    }

    public function delete(User $user, QuestionPermission $questionPermission): bool
    {
        return $user->hasRole('admin');
    }
}
