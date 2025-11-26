<?php

namespace App\Listeners;

use App\Events\SubmissionStatusChanged;
use App\Services\NotificationService;

class SendSubmissionNotifications
{
    /**
     * Create the event listener.
     */
    public function __construct(
        private NotificationService $notificationService
    ) {
    }

    /**
     * Handle the event.
     */
    public function handle(SubmissionStatusChanged $event): void
    {
        match ($event->newStatus) {
            'submitted' => $this->notificationService->notifySubmissionSubmitted($event->submission),
            'approved' => $this->notificationService->notifySubmissionApproved($event->submission),
            'rejected' => $this->notificationService->notifySubmissionRejected($event->submission),
            default => null,
        };
    }
}
