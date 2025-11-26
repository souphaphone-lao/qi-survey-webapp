<?php

use App\Models\Department;
use App\Models\Institution;
use App\Models\QuestionPermission;
use App\Models\Questionnaire;
use App\Models\User;
use Database\Seeders\RoleAndPermissionSeeder;

beforeEach(function () {
    $this->seed(RoleAndPermissionSeeder::class);
});

test('admin can create question permission', function () {
    $admin = User::factory()->create();
    $admin->assignRole('admin');

    $questionnaire = Questionnaire::factory()->create();
    $institution = Institution::factory()->create();
    $department = Department::factory()->create(['institution_id' => $institution->id]);

    $response = $this->actingAs($admin)->postJson('/api/question-permissions', [
        'questionnaire_id' => $questionnaire->id,
        'question_name' => 'question15',
        'institution_id' => $institution->id,
        'department_id' => $department->id,
        'permission_type' => 'edit',
    ]);

    $response->assertStatus(201);

    $this->assertDatabaseHas('question_permissions', [
        'questionnaire_id' => $questionnaire->id,
        'question_name' => 'question15',
        'institution_id' => $institution->id,
        'department_id' => $department->id,
    ]);
});

test('admin can delete question permission', function () {
    $admin = User::factory()->create();
    $admin->assignRole('admin');

    $permission = QuestionPermission::factory()->create();

    $response = $this->actingAs($admin)->deleteJson("/api/question-permissions/{$permission->id}");

    $response->assertStatus(200);

    $this->assertDatabaseMissing('question_permissions', ['id' => $permission->id]);
});

test('admin can bulk create question permissions', function () {
    $admin = User::factory()->create();
    $admin->assignRole('admin');

    $questionnaire = Questionnaire::factory()->create();
    $institution = Institution::factory()->create();
    $department1 = Department::factory()->create(['institution_id' => $institution->id]);
    $department2 = Department::factory()->create(['institution_id' => $institution->id]);

    $response = $this->actingAs($admin)->postJson('/api/question-permissions/bulk', [
        'permissions' => [
            [
                'questionnaire_id' => $questionnaire->id,
                'question_name' => 'question15',
                'institution_id' => $institution->id,
                'department_id' => $department1->id,
                'permission_type' => 'edit',
            ],
            [
                'questionnaire_id' => $questionnaire->id,
                'question_name' => 'question16',
                'institution_id' => $institution->id,
                'department_id' => $department2->id,
                'permission_type' => 'edit',
            ],
        ],
    ]);

    $response->assertStatus(200)
        ->assertJsonFragment(['created_count' => 2]);

    $this->assertDatabaseHas('question_permissions', [
        'question_name' => 'question15',
        'department_id' => $department1->id,
    ]);

    $this->assertDatabaseHas('question_permissions', [
        'question_name' => 'question16',
        'department_id' => $department2->id,
    ]);
});

test('bulk create updates existing permissions', function () {
    $admin = User::factory()->create();
    $admin->assignRole('admin');

    $questionnaire = Questionnaire::factory()->create();
    $institution = Institution::factory()->create();
    $department = Department::factory()->create(['institution_id' => $institution->id]);

    // Create initial permission
    $permission = QuestionPermission::factory()->create([
        'questionnaire_id' => $questionnaire->id,
        'question_name' => 'question15',
        'institution_id' => $institution->id,
        'department_id' => $department->id,
        'permission_type' => 'view',
    ]);

    // Update via bulk
    $response = $this->actingAs($admin)->postJson('/api/question-permissions/bulk', [
        'permissions' => [
            [
                'questionnaire_id' => $questionnaire->id,
                'question_name' => 'question15',
                'institution_id' => $institution->id,
                'department_id' => $department->id,
                'permission_type' => 'edit',
            ],
        ],
    ]);

    $response->assertStatus(200)
        ->assertJsonFragment(['updated_count' => 1, 'created_count' => 0]);

    $this->assertDatabaseHas('question_permissions', [
        'id' => $permission->id,
        'permission_type' => 'edit',
    ]);
});

test('unique constraint prevents duplicate permissions', function () {
    $admin = User::factory()->create();
    $admin->assignRole('admin');

    $questionnaire = Questionnaire::factory()->create();
    $institution = Institution::factory()->create();
    $department = Department::factory()->create(['institution_id' => $institution->id]);

    QuestionPermission::factory()->create([
        'questionnaire_id' => $questionnaire->id,
        'question_name' => 'question15',
        'institution_id' => $institution->id,
        'department_id' => $department->id,
    ]);

    // Trying to create duplicate should fail with unique constraint (use bulk update for updates)
    $response = $this->actingAs($admin)->postJson('/api/question-permissions', [
        'questionnaire_id' => $questionnaire->id,
        'question_name' => 'question15',
        'institution_id' => $institution->id,
        'department_id' => $department->id,
        'permission_type' => 'view',
    ]);

    $response->assertStatus(500); // Database constraint violation
});

test('can get permissions by questionnaire', function () {
    $admin = User::factory()->create();
    $admin->assignRole('admin');

    $questionnaire1 = Questionnaire::factory()->create();
    $questionnaire2 = Questionnaire::factory()->create();

    QuestionPermission::factory()->count(3)->create(['questionnaire_id' => $questionnaire1->id]);
    QuestionPermission::factory()->create(['questionnaire_id' => $questionnaire2->id]);

    $response = $this->actingAs($admin)->getJson("/api/questionnaires/{$questionnaire1->id}/permissions");

    $response->assertStatus(200)
        ->assertJsonCount(3, 'data'); // Response wraps in 'data' key
});

test('enumerator cannot create question permissions', function () {
    $enumerator = User::factory()->create();
    $enumerator->assignRole('enumerator');

    $questionnaire = Questionnaire::factory()->create();
    $institution = Institution::factory()->create();
    $department = Department::factory()->create(['institution_id' => $institution->id]);

    $response = $this->actingAs($enumerator)->postJson('/api/question-permissions', [
        'questionnaire_id' => $questionnaire->id,
        'question_name' => 'question15',
        'institution_id' => $institution->id,
        'department_id' => $department->id,
    ]);

    $response->assertStatus(403);
});

test('enumerator cannot delete question permissions', function () {
    $enumerator = User::factory()->create();
    $enumerator->assignRole('enumerator');

    $permission = QuestionPermission::factory()->create();

    $response = $this->actingAs($enumerator)->deleteJson("/api/question-permissions/{$permission->id}");

    $response->assertStatus(403);
});
