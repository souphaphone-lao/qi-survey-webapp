<?php

namespace App\Notifications;

use App\Models\Submission;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class SubmissionCreated extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(public Submission $submission)
    {
    }

    public function via(object $notifiable): array
    {
        $channels = [];
        if ($notifiable->wantsEmailNotification('submission_created')) {
            $channels[] = 'mail';
        }
        if ($notifiable->wantsInAppNotification('submission_created')) {
            $channels[] = 'database';
        }
        return $channels;
    }

    public function toMail(object $notifiable): MailMessage
    {
        $url = url("/submissions/{$this->submission->id}");
        return (new MailMessage)
            ->subject("Submission Created: {$this->submission->questionnaire->title}")
            ->greeting("Hello {$notifiable->name},")
            ->line("Your submission has been created:")
            ->line("Questionnaire: {$this->submission->questionnaire->title}")
            ->line("Institution: {$this->submission->institution->name}")
            ->action('View Submission', $url);
    }

    public function toArray(object $notifiable): array
    {
        return [
            'type' => 'submission_created',
            'submission_id' => $this->submission->id,
            'questionnaire_title' => $this->submission->questionnaire->title,
            'institution_name' => $this->submission->institution->name,
            'url' => "/submissions/{$this->submission->id}",
        ];
    }
}
