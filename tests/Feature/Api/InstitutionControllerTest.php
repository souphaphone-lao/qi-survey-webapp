<?php

use App\Models\User;
use App\Models\Institution;
use Database\Seeders\RoleAndPermissionSeeder;

beforeEach(function () {
    $this->seed(RoleAndPermissionSeeder::class);
});

test('authenticated user can list institutions', function () {
    $institution = Institution::factory()->create();
    $user = User::factory()->create(['institution_id' => $institution->id]);
    $user->assignRole('viewer');

    Institution::factory()->count(5)->create();

    $token = $user->createToken('test-token')->plainTextToken;

    $response = $this->withHeader('Authorization', "Bearer {$token}")
        ->getJson('/api/institutions');

    $response->assertOk()
        ->assertJsonStructure([
            'data' => [
                '*' => ['id', 'name', 'code', 'level', 'is_active'],
            ],
        ])
        ->assertJsonCount(6, 'data'); // 5 created + 1 for user
});

test('admin can create institution', function () {
    $institution = Institution::factory()->create();
    $admin = User::factory()->create(['institution_id' => $institution->id]);
    $admin->assignRole('admin');

    $token = $admin->createToken('test-token')->plainTextToken;

    $institutionData = [
        'name' => 'New Institution',
        'code' => 'INS-001',
        'level' => 'central',
        'is_active' => true,
    ];

    $response = $this->withHeader('Authorization', "Bearer {$token}")
        ->postJson('/api/institutions', $institutionData);

    $response->assertCreated()
        ->assertJson([
            'data' => [
                'name' => 'New Institution',
                'code' => 'INS-001',
                'level' => 'central',
            ],
        ]);

    $this->assertDatabaseHas('institutions', [
        'name' => 'New Institution',
        'code' => 'INS-001',
    ]);
});

test('non-admin cannot create institution', function () {
    $institution = Institution::factory()->create();
    $enumerator = User::factory()->create(['institution_id' => $institution->id]);
    $enumerator->assignRole('enumerator');

    $token = $enumerator->createToken('test-token')->plainTextToken;

    $institutionData = [
        'name' => 'New Institution',
        'code' => 'INS-001',
        'level' => 'central',
    ];

    $response = $this->withHeader('Authorization', "Bearer {$token}")
        ->postJson('/api/institutions', $institutionData);

    $response->assertForbidden();
});

test('user can view institution details', function () {
    $institution = Institution::factory()->create();
    $user = User::factory()->create(['institution_id' => $institution->id]);
    $user->assignRole('viewer');

    $token = $user->createToken('test-token')->plainTextToken;

    $response = $this->withHeader('Authorization', "Bearer {$token}")
        ->getJson("/api/institutions/{$institution->id}");

    $response->assertOk()
        ->assertJson([
            'data' => [
                'id' => $institution->id,
                'name' => $institution->name,
                'code' => $institution->code,
            ],
        ]);
});

test('admin can update institution', function () {
    $institution = Institution::factory()->create();
    $admin = User::factory()->create(['institution_id' => $institution->id]);
    $admin->assignRole('admin');

    $institutionToUpdate = Institution::factory()->create();

    $token = $admin->createToken('test-token')->plainTextToken;

    $updateData = [
        'name' => 'Updated Institution',
        'code' => $institutionToUpdate->code,
        'level' => 'province',
        'is_active' => false,
    ];

    $response = $this->withHeader('Authorization', "Bearer {$token}")
        ->putJson("/api/institutions/{$institutionToUpdate->id}", $updateData);

    $response->assertOk()
        ->assertJson([
            'data' => [
                'name' => 'Updated Institution',
                'level' => 'province',
                'is_active' => false,
            ],
        ]);

    $this->assertDatabaseHas('institutions', [
        'id' => $institutionToUpdate->id,
        'name' => 'Updated Institution',
    ]);
});

test('non-admin cannot update institution', function () {
    $institution = Institution::factory()->create();
    $enumerator = User::factory()->create(['institution_id' => $institution->id]);
    $enumerator->assignRole('enumerator');

    $token = $enumerator->createToken('test-token')->plainTextToken;

    $response = $this->withHeader('Authorization', "Bearer {$token}")
        ->putJson("/api/institutions/{$institution->id}", [
            'name' => 'Updated',
            'code' => $institution->code,
            'level' => $institution->level,
        ]);

    $response->assertForbidden();
});

test('admin can delete institution', function () {
    $institution = Institution::factory()->create();
    $admin = User::factory()->create(['institution_id' => $institution->id]);
    $admin->assignRole('admin');

    $institutionToDelete = Institution::factory()->create();

    $token = $admin->createToken('test-token')->plainTextToken;

    $response = $this->withHeader('Authorization', "Bearer {$token}")
        ->deleteJson("/api/institutions/{$institutionToDelete->id}");

    $response->assertOk();

    $this->assertDatabaseMissing('institutions', [
        'id' => $institutionToDelete->id,
        'deleted_at' => null,
    ]);
});

test('non-admin cannot delete institution', function () {
    $institution = Institution::factory()->create();
    $enumerator = User::factory()->create(['institution_id' => $institution->id]);
    $enumerator->assignRole('enumerator');

    $institutionToDelete = Institution::factory()->create();

    $token = $enumerator->createToken('test-token')->plainTextToken;

    $response = $this->withHeader('Authorization', "Bearer {$token}")
        ->deleteJson("/api/institutions/{$institutionToDelete->id}");

    $response->assertForbidden();
});

test('create institution validates required fields', function () {
    $institution = Institution::factory()->create();
    $admin = User::factory()->create(['institution_id' => $institution->id]);
    $admin->assignRole('admin');

    $token = $admin->createToken('test-token')->plainTextToken;

    $response = $this->withHeader('Authorization', "Bearer {$token}")
        ->postJson('/api/institutions', []);

    $response->assertStatus(422)
        ->assertJsonValidationErrors(['name', 'code', 'level']);
});

test('create institution validates unique code', function () {
    $institution = Institution::factory()->create();
    $admin = User::factory()->create(['institution_id' => $institution->id]);
    $admin->assignRole('admin');

    $existingInstitution = Institution::factory()->create();

    $token = $admin->createToken('test-token')->plainTextToken;

    $institutionData = [
        'name' => 'New Institution',
        'code' => $existingInstitution->code,
        'level' => 'central',
    ];

    $response = $this->withHeader('Authorization', "Bearer {$token}")
        ->postJson('/api/institutions', $institutionData);

    $response->assertStatus(422)
        ->assertJsonValidationErrors(['code']);
});

test('create institution validates valid level', function () {
    $institution = Institution::factory()->create();
    $admin = User::factory()->create(['institution_id' => $institution->id]);
    $admin->assignRole('admin');

    $token = $admin->createToken('test-token')->plainTextToken;

    $institutionData = [
        'name' => 'New Institution',
        'code' => 'INS-001',
        'level' => 'invalid-level',
    ];

    $response = $this->withHeader('Authorization', "Bearer {$token}")
        ->postJson('/api/institutions', $institutionData);

    $response->assertStatus(422)
        ->assertJsonValidationErrors(['level']);
});

test('can filter institutions by level', function () {
    // Create a non-central institution for the user
    $institution = Institution::factory()->province()->create();
    $user = User::factory()->create(['institution_id' => $institution->id]);
    $user->assignRole('viewer');

    Institution::factory()->count(3)->central()->create();
    Institution::factory()->count(2)->province()->create();
    Institution::factory()->count(1)->district()->create();

    $token = $user->createToken('test-token')->plainTextToken;

    $response = $this->withHeader('Authorization', "Bearer {$token}")
        ->getJson('/api/institutions?level=central');

    $response->assertOk()
        ->assertJsonCount(3, 'data');
});

test('can filter active institutions', function () {
    $institution = Institution::factory()->create();
    $user = User::factory()->create(['institution_id' => $institution->id]);
    $user->assignRole('viewer');

    Institution::factory()->count(3)->create(['is_active' => true]);
    Institution::factory()->count(2)->inactive()->create();

    $token = $user->createToken('test-token')->plainTextToken;

    $response = $this->withHeader('Authorization', "Bearer {$token}")
        ->getJson('/api/institutions?is_active=1');

    $response->assertOk()
        ->assertJsonCount(4, 'data'); // 3 active + 1 for user
});

test('can create institution with parent', function () {
    $institution = Institution::factory()->create();
    $admin = User::factory()->create(['institution_id' => $institution->id]);
    $admin->assignRole('admin');

    $parentInstitution = Institution::factory()->central()->create();

    $token = $admin->createToken('test-token')->plainTextToken;

    $institutionData = [
        'name' => 'Child Institution',
        'code' => 'INS-CHILD',
        'level' => 'province',
        'parent_institution_id' => $parentInstitution->id,
    ];

    $response = $this->withHeader('Authorization', "Bearer {$token}")
        ->postJson('/api/institutions', $institutionData);

    $response->assertCreated();

    $this->assertDatabaseHas('institutions', [
        'code' => 'INS-CHILD',
        'parent_institution_id' => $parentInstitution->id,
    ]);
});

test('institution response includes parent relationship', function () {
    $parentInstitution = Institution::factory()->central()->create();
    $childInstitution = Institution::factory()->province()->create([
        'parent_institution_id' => $parentInstitution->id,
    ]);

    $user = User::factory()->create(['institution_id' => $childInstitution->id]);
    $user->assignRole('viewer');

    $token = $user->createToken('test-token')->plainTextToken;

    $response = $this->withHeader('Authorization', "Bearer {$token}")
        ->getJson("/api/institutions/{$childInstitution->id}");

    $response->assertOk()
        ->assertJsonStructure([
            'data' => [
                'id',
                'name',
                'parent' => ['id', 'name', 'code'],
            ],
        ]);
});
