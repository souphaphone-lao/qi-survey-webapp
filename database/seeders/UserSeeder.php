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

        $admin = User::create([
            'name' => 'System Administrator',
            'email' => 'admin@example.com',
            'password' => Hash::make('password'),
            'institution_id' => $centralInstitution?->id,
            'is_active' => true,
        ]);

        $admin->assignRole('admin');

        $enumerator = User::create([
            'name' => 'Test Enumerator',
            'email' => 'enumerator@example.com',
            'password' => Hash::make('password'),
            'institution_id' => $centralInstitution?->id,
            'is_active' => true,
        ]);

        $enumerator->assignRole('enumerator');

        $viewer = User::create([
            'name' => 'Test Viewer',
            'email' => 'viewer@example.com',
            'password' => Hash::make('password'),
            'institution_id' => $centralInstitution?->id,
            'is_active' => true,
        ]);

        $viewer->assignRole('viewer');
    }
}
