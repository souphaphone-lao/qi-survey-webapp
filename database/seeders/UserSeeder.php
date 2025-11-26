<?php

namespace Database\Seeders;

use App\Models\Institution;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class UserSeeder extends Seeder
{
    public function run(): void
    {
        $centralInstitution = Institution::where('code', 'CENTRAL')->first();

        $admin = User::updateOrCreate(
            ['email' => 'admin@example.com'],
            [
                'name' => 'System Administrator',
                'password' => Hash::make('password'),
                'institution_id' => $centralInstitution?->id,
                'is_active' => true,
            ]
        );

        $admin->syncRoles(['admin']);

        $enumerator = User::updateOrCreate(
            ['email' => 'enumerator@example.com'],
            [
                'name' => 'Test Enumerator',
                'password' => Hash::make('password'),
                'institution_id' => $centralInstitution?->id,
                'is_active' => true,
            ]
        );

        $enumerator->syncRoles(['enumerator']);

        $viewer = User::updateOrCreate(
            ['email' => 'viewer@example.com'],
            [
                'name' => 'Test Viewer',
                'password' => Hash::make('password'),
                'institution_id' => $centralInstitution?->id,
                'is_active' => true,
            ]
        );

        $viewer->syncRoles(['viewer']);
    }
}
