<?php

namespace App\Services;

use App\Models\Institution;
use App\Models\Submission;
use App\Models\User;
use App\Notifications\SubmissionApproved;
use App\Notifications\SubmissionCreated;
use App\Notifications\SubmissionRejected;
use App\Notifications\SubmissionSubmitted;
use Illuminate\Support\Collection;

class NotificationService
{
    /**
     * Notify when submission created
     */
    public function notifySubmissionCreated(Submission $submission): void
    {
        $creator = $submission->creator;

        if ($creator) {
            $creator->notify(new SubmissionCreated($submission));
        }
    }

    /**
     * Notify parent institution admins when submitted for review
     */
    public function notifySubmissionSubmitted(Submission $submission): void
    {
        $admins = $this->getInstitutionAdminsInHierarchy($submission->institution_id);

        foreach ($admins as $admin) {
            $admin->notify(new SubmissionSubmitted($submission));
        }
    }

    /**
     * Notify creator when approved
     */
    public function notifySubmissionApproved(Submission $submission): void
    {
        $creator = $submission->creator;

        if ($creator) {
            $creator->notify(new SubmissionApproved($submission));
        }

        // Also notify institution admins
        $admins = $this->getInstitutionAdminsInHierarchy($submission->institution_id);
        foreach ($admins as $admin) {
            if ($admin->id !== $creator?->id) {
                $admin->notify(new SubmissionApproved($submission));
            }
        }
    }

    /**
     * Notify creator when rejected (with comments)
     */
    public function notifySubmissionRejected(Submission $submission): void
    {
        $creator = $submission->creator;

        if ($creator) {
            $creator->notify(new SubmissionRejected($submission));
        }
    }

    /**
     * Get institution admins in hierarchy (self + ancestors)
     */
    private function getInstitutionAdminsInHierarchy(int $institutionId): Collection
    {
        $institutions = collect([$institutionId]);

        // Get parent institutions up the hierarchy
        $currentInstitution = Institution::find($institutionId);

        while ($currentInstitution && $currentInstitution->parent_institution_id) {
            $institutions->push($currentInstitution->parent_institution_id);
            $currentInstitution = $currentInstitution->parent;
        }

        // Get all admins from these institutions
        return User::whereIn('institution_id', $institutions)
            ->whereHas('roles', function ($query) {
                $query->where('name', 'admin');
            })
            ->where('is_active', true)
            ->get();
    }
}
