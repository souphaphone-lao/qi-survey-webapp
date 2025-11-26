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

        // Create permissions
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
            Permission::create(['name' => $permission]);
        }

        // Create roles and assign permissions
        $adminRole = Role::create(['name' => 'admin']);
        $adminRole->givePermissionTo(Permission::all());

        $enumeratorRole = Role::create(['name' => 'enumerator']);
        $enumeratorRole->givePermissionTo([
            'institutions.view',
            'questionnaires.view',
            'submissions.view',
            'submissions.create',
            'submissions.update',
            'submissions.delete',
            'dashboard.view',
        ]);

        $viewerRole = Role::create(['name' => 'viewer']);
        $viewerRole->givePermissionTo([
            'institutions.view',
            'questionnaires.view',
            'submissions.view',
            'dashboard.view',
        ]);
    }
}
