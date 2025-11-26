<?php

namespace App\Notifications;

use App\Models\Submission;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class SubmissionRejected extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(public Submission $submission)
    {
    }

    public function via(object $notifiable): array
    {
        $channels = [];
        if ($notifiable->wantsEmailNotification('submission_rejected')) {
            $channels[] = 'mail';
        }
        if ($notifiable->wantsInAppNotification('submission_rejected')) {
            $channels[] = 'database';
        }
        return $channels;
    }

    public function toMail(object $notifiable): MailMessage
    {
        $url = url("/submissions/{$this->submission->id}");
        $comments = $this->submission->rejection_comments ?? 'No comments provided';

        return (new MailMessage)
            ->subject("Submission Rejected: {$this->submission->questionnaire->title}")
            ->greeting("Hello {$notifiable->name},")
            ->line("Your submission has been rejected:")
            ->line("Questionnaire: {$this->submission->questionnaire->title}")
            ->line("Institution: {$this->submission->institution->name}")
            ->line("Rejection comments: {$comments}")
            ->action('View Submission', $url);
    }

    public function toArray(object $notifiable): array
    {
        return [
            'type' => 'submission_rejected',
            'submission_id' => $this->submission->id,
            'questionnaire_title' => $this->submission->questionnaire->title,
            'institution_name' => $this->submission->institution->name,
            'rejection_comments' => $this->submission->rejection_comments,
            'url' => "/submissions/{$this->submission->id}",
        ];
    }
}
