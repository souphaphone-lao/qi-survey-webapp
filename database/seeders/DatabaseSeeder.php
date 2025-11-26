<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // Minimal production seed data
        $this->call([
            RoleAndPermissionSeeder::class,
            InstitutionSeeder::class,
            UserSeeder::class,
        ]);
    }
}
