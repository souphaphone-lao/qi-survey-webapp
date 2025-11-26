<?php

namespace Database\Factories;

use App\Models\Institution;
use App\Models\Questionnaire;
use App\Models\Submission;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Submission>
 */
class SubmissionFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'questionnaire_id' => Questionnaire::factory(),
            'institution_id' => Institution::factory(),
            'status' => 'draft',
            'answers_json' => [
                'question1' => fake()->sentence(),
            ],
        ];
    }

    /**
     * Indicate that the submission is a draft.
     */
    public function draft(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => 'draft',
            'submitted_at' => null,
            'approved_at' => null,
            'rejected_at' => null,
        ]);
    }

    /**
     * Indicate that the submission has been submitted.
     */
    public function submitted(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => 'submitted',
            'submitted_at' => now(),
        ]);
    }

    /**
     * Indicate that the submission has been approved.
     */
    public function approved(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => 'approved',
            'submitted_at' => now()->subDays(2),
            'approved_at' => now(),
            'approved_by' => User::factory(),
        ]);
    }

    /**
     * Indicate that the submission has been rejected.
     */
    public function rejected(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => 'rejected',
            'submitted_at' => now()->subDays(2),
            'rejected_at' => now(),
            'rejected_by' => User::factory(),
            'rejection_comments' => fake()->sentence(),
        ]);
    }
}
