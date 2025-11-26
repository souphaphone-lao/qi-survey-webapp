<?php

namespace App\Policies;

use App\Models\Submission;
use App\Models\User;

class SubmissionPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->hasPermissionTo('submissions.view');
    }

    public function view(User $user, Submission $submission): bool
    {
        if (!$user->hasPermissionTo('submissions.view')) {
            return false;
        }

        // Admin can view all submissions
        if ($user->hasRole('admin')) {
            return true;
        }

        // Non-admin users can only view submissions from their institution
        return $user->institution_id === $submission->institution_id;
    }

    public function create(User $user): bool
    {
        return $user->hasPermissionTo('submissions.create');
    }

    public function update(User $user, Submission $submission): bool
    {
        if (!$user->hasPermissionTo('submissions.update')) {
            return false;
        }

        // Admin can update any submission
        if ($user->hasRole('admin')) {
            return true;
        }

        // Enumerators can only update their own submissions that are draft or rejected
        if ($submission->created_by === $user->id && $submission->canBeEdited()) {
            return true;
        }

        return false;
    }

    public function delete(User $user, Submission $submission): bool
    {
        if (!$user->hasPermissionTo('submissions.delete')) {
            return false;
        }

        // Admin can delete any submission
        if ($user->hasRole('admin')) {
            return true;
        }

        // Enumerators can only delete their own draft submissions
        if ($submission->created_by === $user->id && $submission->isDraft()) {
            return true;
        }

        return false;
    }

    public function approve(User $user, Submission $submission): bool
    {
        return $user->hasPermissionTo('submissions.approve');
    }

    public function reject(User $user, Submission $submission): bool
    {
        return $user->hasPermissionTo('submissions.approve');
    }
}
