<?php

namespace Database\Factories;

use App\Models\Institution;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Institution>
 */
class InstitutionFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'name' => fake()->company(),
            'code' => strtoupper(fake()->unique()->bothify('INS-###??')),
            'level' => fake()->randomElement(['central', 'province', 'district']),
            'is_active' => true,
        ];
    }

    /**
     * Indicate that the institution is inactive.
     */
    public function inactive(): static
    {
        return $this->state(fn (array $attributes) => [
            'is_active' => false,
        ]);
    }

    /**
     * Indicate that the institution is at central level.
     */
    public function central(): static
    {
        return $this->state(fn (array $attributes) => [
            'level' => 'central',
        ]);
    }

    /**
     * Indicate that the institution is at province level.
     */
    public function province(): static
    {
        return $this->state(fn (array $attributes) => [
            'level' => 'province',
        ]);
    }

    /**
     * Indicate that the institution is at district level.
     */
    public function district(): static
    {
        return $this->state(fn (array $attributes) => [
            'level' => 'district',
        ]);
    }
}
