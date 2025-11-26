<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

class RoleAndPermissionSeeder extends Seeder
{
    public function run(): void
    {
        // Reset cached roles and permissions
        app()[\Spatie\Permission\PermissionRegistrar::class]->forgetCachedPermissions();

        // Create or update permissions
        $permissions = [
            // User permissions
            'users.view',
            'users.create',
            'users.update',
            'users.delete',

            // Institution permissions
            'institutions.view',
            'institutions.create',
            'institutions.update',
            'institutions.delete',

            // Department permissions
            'departments.view',
            'departments.create',
            'departments.update',
            'departments.delete',

            // Questionnaire permissions
            'questionnaires.view',
            'questionnaires.create',
            'questionnaires.update',
            'questionnaires.delete',

            // Submission permissions
            'submissions.view',
            'submissions.create',
            'submissions.update',
            'submissions.delete',
            'submissions.approve',

            // Dashboard permissions
            'dashboard.view',
        ];

        foreach ($permissions as $permission) {
            Permission::firstOrCreate(['name' => $permission]);
        }

        // Create or update roles and assign permissions
        $adminRole = Role::firstOrCreate(['name' => 'admin']);
        $adminRole->syncPermissions(Permission::all());

        $enumeratorRole = Role::firstOrCreate(['name' => 'enumerator']);
        $enumeratorRole->syncPermissions([
            'institutions.view',
            'departments.view',
            'questionnaires.view',
            'submissions.view',
            'submissions.create',
            'submissions.update',
            'submissions.delete',
            'dashboard.view',
        ]);

        $viewerRole = Role::firstOrCreate(['name' => 'viewer']);
        $viewerRole->syncPermissions([
            'institutions.view',
            'departments.view',
            'questionnaires.view',
            'submissions.view',
            'dashboard.view',
        ]);
    }
}
