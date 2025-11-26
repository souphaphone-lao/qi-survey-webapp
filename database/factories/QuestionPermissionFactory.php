<?php

namespace Database\Factories;

use App\Models\Department;
use App\Models\Institution;
use App\Models\QuestionPermission;
use App\Models\Questionnaire;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\QuestionPermission>
 */
class QuestionPermissionFactory extends Factory
{
    protected $model = QuestionPermission::class;

    public function definition(): array
    {
        return [
            'questionnaire_id' => Questionnaire::factory(),
            'question_name' => 'question' . fake()->numberBetween(1, 50),
            'institution_id' => Institution::factory(),
            'department_id' => Department::factory(),
            'permission_type' => fake()->randomElement(['edit', 'view']),
        ];
    }

    public function edit(): static
    {
        return $this->state(fn (array $attributes) => [
            'permission_type' => 'edit',
        ]);
    }

    public function view(): static
    {
        return $this->state(fn (array $attributes) => [
            'permission_type' => 'view',
        ]);
    }
}
