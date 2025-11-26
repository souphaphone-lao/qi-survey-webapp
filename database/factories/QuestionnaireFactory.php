<?php

namespace Database\Factories;

use App\Models\Questionnaire;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Questionnaire>
 */
class QuestionnaireFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'code' => strtoupper(fake()->unique()->bothify('QST-###')),
            'version' => 1,
            'title' => fake()->sentence(),
            'description' => fake()->paragraph(),
            'surveyjs_json' => [
                'pages' => [
                    [
                        'name' => 'page1',
                        'elements' => [
                            [
                                'type' => 'text',
                                'name' => 'question1',
                                'title' => 'Sample Question',
                            ],
                        ],
                    ],
                ],
            ],
            'is_active' => true,
        ];
    }

    /**
     * Indicate that the questionnaire is inactive.
     */
    public function inactive(): static
    {
        return $this->state(fn (array $attributes) => [
            'is_active' => false,
        ]);
    }

    /**
     * Indicate that the questionnaire is active.
     */
    public function active(): static
    {
        return $this->state(fn (array $attributes) => [
            'is_active' => true,
        ]);
    }
}
