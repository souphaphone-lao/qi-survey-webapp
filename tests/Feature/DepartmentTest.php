<?php

use App\Models\Department;
use App\Models\Institution;
use App\Models\User;
use Database\Seeders\RoleAndPermissionSeeder;

beforeEach(function () {
    $this->seed(RoleAndPermissionSeeder::class);
});

test('admin can list departments', function () {
    $admin = User::factory()->create();
    $admin->assignRole('admin');

    $institution = Institution::factory()->create();
    Department::factory()->count(3)->create(['institution_id' => $institution->id]);

    $response = $this->actingAs($admin)->getJson('/api/departments');

    $response->assertStatus(200)
        ->assertJsonStructure([
            'data' => [
                '*' => ['id', 'name', 'code', 'institution_id', 'is_active'],
            ],
        ]);
});

test('admin can create department', function () {
    $admin = User::factory()->create();
    $admin->assignRole('admin');

    $institution = Institution::factory()->create();

    $response = $this->actingAs($admin)->postJson('/api/departments', [
        'name' => 'Finance Department',
        'code' => 'FIN',
        'institution_id' => $institution->id,
        'description' => 'Handles financial matters',
        'is_active' => true,
    ]);

    $response->assertStatus(201)
        ->assertJsonFragment(['name' => 'Finance Department']);

    $this->assertDatabaseHas('departments', [
        'name' => 'Finance Department',
        'code' => 'FIN',
    ]);
});

test('admin can update department', function () {
    $admin = User::factory()->create();
    $admin->assignRole('admin');

    $institution = Institution::factory()->create();
    $department = Department::factory()->create(['institution_id' => $institution->id]);

    $response = $this->actingAs($admin)->putJson("/api/departments/{$department->id}", [
        'name' => 'Updated Name',
        'code' => $department->code,
        'institution_id' => $institution->id,
        'is_active' => false,
    ]);

    $response->assertStatus(200);

    $this->assertDatabaseHas('departments', [
        'id' => $department->id,
        'name' => 'Updated Name',
        'is_active' => false,
    ]);
});

test('admin can delete department without users', function () {
    $admin = User::factory()->create();
    $admin->assignRole('admin');

    $department = Department::factory()->create();

    $response = $this->actingAs($admin)->deleteJson("/api/departments/{$department->id}");

    $response->assertStatus(200);

    $this->assertSoftDeleted('departments', ['id' => $department->id]);
});

test('cannot delete department with associated users', function () {
    $admin = User::factory()->create();
    $admin->assignRole('admin');

    $department = Department::factory()->create();
    User::factory()->create(['department_id' => $department->id]);

    $response = $this->actingAs($admin)->deleteJson("/api/departments/{$department->id}");

    $response->assertStatus(422)
        ->assertJsonFragment(['message' => 'Cannot delete department with associated users']);

    $this->assertDatabaseHas('departments', ['id' => $department->id]);
});

test('department code must be unique per institution', function () {
    $admin = User::factory()->create();
    $admin->assignRole('admin');

    $institution = Institution::factory()->create();
    Department::factory()->create([
        'code' => 'FIN',
        'institution_id' => $institution->id,
    ]);

    $response = $this->actingAs($admin)->postJson('/api/departments', [
        'name' => 'Another Finance Dept',
        'code' => 'FIN',
        'institution_id' => $institution->id,
    ]);

    $response->assertStatus(422);
});

test('same department code can exist in different institutions', function () {
    $admin = User::factory()->create();
    $admin->assignRole('admin');

    $institution1 = Institution::factory()->create();
    $institution2 = Institution::factory()->create();

    Department::factory()->create([
        'code' => 'FIN',
        'institution_id' => $institution1->id,
    ]);

    $response = $this->actingAs($admin)->postJson('/api/departments', [
        'name' => 'Finance Dept',
        'code' => 'FIN',
        'institution_id' => $institution2->id,
    ]);

    $response->assertStatus(201);
});

test('enumerator can view departments', function () {
    $enumerator = User::factory()->create();
    $enumerator->assignRole('enumerator');

    Department::factory()->count(2)->create();

    $response = $this->actingAs($enumerator)->getJson('/api/departments');

    $response->assertStatus(200);
});

test('enumerator cannot create department', function () {
    $enumerator = User::factory()->create();
    $enumerator->assignRole('enumerator');

    $institution = Institution::factory()->create();

    $response = $this->actingAs($enumerator)->postJson('/api/departments', [
        'name' => 'Test Dept',
        'code' => 'TEST',
        'institution_id' => $institution->id,
    ]);

    $response->assertStatus(403);
});

test('can filter departments by institution', function () {
    $admin = User::factory()->create();
    $admin->assignRole('admin');

    $institution1 = Institution::factory()->create();
    $institution2 = Institution::factory()->create();

    Department::factory()->count(2)->create(['institution_id' => $institution1->id]);
    Department::factory()->create(['institution_id' => $institution2->id]);

    $response = $this->actingAs($admin)->getJson("/api/departments?institution_id={$institution1->id}");

    $response->assertStatus(200)
        ->assertJsonCount(2, 'data');
});

test('can get all departments via list endpoint', function () {
    $admin = User::factory()->create();
    $admin->assignRole('admin');

    $institution = Institution::factory()->create();
    Department::factory()->count(5)->create(['institution_id' => $institution->id]);

    $response = $this->actingAs($admin)->getJson('/api/departments/list');

    $response->assertStatus(200)
        ->assertJsonCount(5);
});
