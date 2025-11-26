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

        // Enumerators can only update their own submissions
        // (Controller will validate if submission can be edited based on status)
        return $submission->created_by === $user->id;
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

    public function submit(User $user, Submission $submission): bool
    {
        return $submission->isDraft()
            && $submission->created_by === $user->id;
    }

    public function approve(User $user, Submission $submission): bool
    {
        // Must be submitted
        if (!$submission->isSubmitted()) {
            return false;
        }

        // Admin can approve all
        if ($user->hasRole('admin')) {
            return true;
        }

        // Check if user has approval permission
        if (!$user->hasPermissionTo('submissions.approve')) {
            return false;
        }

        // Institution admin can approve if submission is from child institution
        if (!$user->institution_id) {
            return false;
        }

        $submissionInstitution = $submission->institution;
        return $submissionInstitution->isDescendantOf($user->institution);
    }

    public function reject(User $user, Submission $submission): bool
    {
        return $this->approve($user, $submission);
    }
}
