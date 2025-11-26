<?php

use App\Models\User;
use App\Models\Institution;
use Database\Seeders\RoleAndPermissionSeeder;

beforeEach(function () {
    // Seed roles and permissions
    $this->seed(RoleAndPermissionSeeder::class);
});

test('admin can list all users', function () {
    $institution = Institution::factory()->create();
    $admin = User::factory()->create(['institution_id' => $institution->id]);
    $admin->assignRole('admin');

    User::factory()->count(5)->create(['institution_id' => $institution->id]);

    $token = $admin->createToken('test-token')->plainTextToken;

    $response = $this->withHeader('Authorization', "Bearer {$token}")
        ->getJson('/api/users');

    $response->assertOk()
        ->assertJsonStructure([
            'data' => [
                '*' => ['id', 'name', 'email', 'is_active', 'roles'],
            ],
        ])
        ->assertJsonCount(6, 'data'); // 5 created + 1 admin
});

test('non-admin cannot list users', function () {
    $institution = Institution::factory()->create();
    $enumerator = User::factory()->create(['institution_id' => $institution->id]);
    $enumerator->assignRole('enumerator');

    $token = $enumerator->createToken('test-token')->plainTextToken;

    $response = $this->withHeader('Authorization', "Bearer {$token}")
        ->getJson('/api/users');

    $response->assertForbidden();
});

test('admin can create user with role', function () {
    $institution = Institution::factory()->create();
    $admin = User::factory()->create(['institution_id' => $institution->id]);
    $admin->assignRole('admin');

    $token = $admin->createToken('test-token')->plainTextToken;

    $userData = [
        'name' => 'New User',
        'email' => 'newuser@example.com',
        'password' => 'Password123!',
        'password_confirmation' => 'Password123!',
        'institution_id' => $institution->id,
        'role' => 'enumerator',
        'is_active' => true,
    ];

    $response = $this->withHeader('Authorization', "Bearer {$token}")
        ->postJson('/api/users', $userData);

    $response->assertCreated()
        ->assertJsonStructure([
            'data' => ['id', 'name', 'email', 'roles'],
        ]);

    $this->assertDatabaseHas('users', [
        'email' => 'newuser@example.com',
        'name' => 'New User',
    ]);

    $user = User::where('email', 'newuser@example.com')->first();
    expect($user->hasRole('enumerator'))->toBeTrue();
});

test('admin can view user details', function () {
    $institution = Institution::factory()->create();
    $admin = User::factory()->create(['institution_id' => $institution->id]);
    $admin->assignRole('admin');

    $user = User::factory()->create(['institution_id' => $institution->id]);
    $user->assignRole('viewer');

    $token = $admin->createToken('test-token')->plainTextToken;

    $response = $this->withHeader('Authorization', "Bearer {$token}")
        ->getJson("/api/users/{$user->id}");

    $response->assertOk()
        ->assertJson([
            'data' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
            ],
        ])
        ->assertJsonStructure([
            'data' => ['id', 'name', 'email', 'roles', 'institution'],
        ]);
});

test('admin can update user', function () {
    $institution = Institution::factory()->create();
    $admin = User::factory()->create(['institution_id' => $institution->id]);
    $admin->assignRole('admin');

    $user = User::factory()->create(['institution_id' => $institution->id]);

    $token = $admin->createToken('test-token')->plainTextToken;

    $updateData = [
        'name' => 'Updated Name',
        'email' => $user->email,
        'institution_id' => $institution->id,
        'role' => 'viewer',
        'is_active' => false,
    ];

    $response = $this->withHeader('Authorization', "Bearer {$token}")
        ->putJson("/api/users/{$user->id}", $updateData);

    $response->assertOk()
        ->assertJson([
            'data' => [
                'name' => 'Updated Name',
                'is_active' => false,
            ],
        ]);

    $this->assertDatabaseHas('users', [
        'id' => $user->id,
        'name' => 'Updated Name',
        'is_active' => false,
    ]);
});

test('admin can update user role', function () {
    $institution = Institution::factory()->create();
    $admin = User::factory()->create(['institution_id' => $institution->id]);
    $admin->assignRole('admin');

    $user = User::factory()->create(['institution_id' => $institution->id]);
    $user->assignRole('viewer');

    $token = $admin->createToken('test-token')->plainTextToken;

    $updateData = [
        'name' => $user->name,
        'email' => $user->email,
        'institution_id' => $institution->id,
        'role' => 'enumerator',
    ];

    $response = $this->withHeader('Authorization', "Bearer {$token}")
        ->putJson("/api/users/{$user->id}", $updateData);

    $response->assertOk();

    $user->refresh();
    expect($user->hasRole('enumerator'))->toBeTrue();
    expect($user->hasRole('viewer'))->toBeFalse();
});

test('admin can delete user', function () {
    $institution = Institution::factory()->create();
    $admin = User::factory()->create(['institution_id' => $institution->id]);
    $admin->assignRole('admin');

    $user = User::factory()->create(['institution_id' => $institution->id]);

    $token = $admin->createToken('test-token')->plainTextToken;

    $response = $this->withHeader('Authorization', "Bearer {$token}")
        ->deleteJson("/api/users/{$user->id}");

    $response->assertOk();

    $this->assertSoftDeleted('users', [
        'id' => $user->id,
    ]);
});

test('admin cannot delete themselves', function () {
    $institution = Institution::factory()->create();
    $admin = User::factory()->create(['institution_id' => $institution->id]);
    $admin->assignRole('admin');

    $token = $admin->createToken('test-token')->plainTextToken;

    $response = $this->withHeader('Authorization', "Bearer {$token}")
        ->deleteJson("/api/users/{$admin->id}");

    $response->assertForbidden(); // Policy prevents self-deletion
});

test('create user validates required fields', function () {
    $institution = Institution::factory()->create();
    $admin = User::factory()->create(['institution_id' => $institution->id]);
    $admin->assignRole('admin');

    $token = $admin->createToken('test-token')->plainTextToken;

    $response = $this->withHeader('Authorization', "Bearer {$token}")
        ->postJson('/api/users', []);

    $response->assertStatus(422)
        ->assertJsonValidationErrors(['name', 'email', 'password', 'institution_id']);
});

test('create user validates unique email', function () {
    $institution = Institution::factory()->create();
    $admin = User::factory()->create(['institution_id' => $institution->id]);
    $admin->assignRole('admin');

    $existingUser = User::factory()->create(['institution_id' => $institution->id]);

    $token = $admin->createToken('test-token')->plainTextToken;

    $userData = [
        'name' => 'New User',
        'email' => $existingUser->email,
        'password' => 'Password123!',
        'password_confirmation' => 'Password123!',
        'institution_id' => $institution->id,
        'role' => 'enumerator',
    ];

    $response = $this->withHeader('Authorization', "Bearer {$token}")
        ->postJson('/api/users', $userData);

    $response->assertStatus(422)
        ->assertJsonValidationErrors(['email']);
});

test('create user validates valid role', function () {
    $institution = Institution::factory()->create();
    $admin = User::factory()->create(['institution_id' => $institution->id]);
    $admin->assignRole('admin');

    $token = $admin->createToken('test-token')->plainTextToken;

    $userData = [
        'name' => 'New User',
        'email' => 'newuser@example.com',
        'password' => 'Password123!',
        'password_confirmation' => 'Password123!',
        'institution_id' => $institution->id,
        'role' => 'invalid-role',
    ];

    $response = $this->withHeader('Authorization', "Bearer {$token}")
        ->postJson('/api/users', $userData);

    $response->assertStatus(422)
        ->assertJsonValidationErrors(['role']);
});

test('enumerator can view their own profile', function () {
    $institution = Institution::factory()->create();
    $enumerator = User::factory()->create(['institution_id' => $institution->id]);
    $enumerator->assignRole('enumerator');

    $token = $enumerator->createToken('test-token')->plainTextToken;

    $response = $this->withHeader('Authorization', "Bearer {$token}")
        ->getJson("/api/users/{$enumerator->id}");

    $response->assertOk()
        ->assertJson([
            'data' => [
                'id' => $enumerator->id,
            ],
        ]);
});

test('enumerator cannot view other users', function () {
    $institution = Institution::factory()->create();
    $enumerator = User::factory()->create(['institution_id' => $institution->id]);
    $enumerator->assignRole('enumerator');

    $otherUser = User::factory()->create(['institution_id' => $institution->id]);

    $token = $enumerator->createToken('test-token')->plainTextToken;

    $response = $this->withHeader('Authorization', "Bearer {$token}")
        ->getJson("/api/users/{$otherUser->id}");

    $response->assertForbidden();
});

test('enumerator cannot update other users', function () {
    $institution = Institution::factory()->create();
    $enumerator = User::factory()->create(['institution_id' => $institution->id]);
    $enumerator->assignRole('enumerator');

    $otherUser = User::factory()->create(['institution_id' => $institution->id]);

    $token = $enumerator->createToken('test-token')->plainTextToken;

    $response = $this->withHeader('Authorization', "Bearer {$token}")
        ->putJson("/api/users/{$otherUser->id}", [
            'name' => 'Updated Name',
            'email' => $otherUser->email,
            'institution_id' => $institution->id,
            'role' => 'viewer',
        ]);

    $response->assertForbidden();
});

test('user can filter by institution', function () {
    $institution1 = Institution::factory()->create();
    $institution2 = Institution::factory()->create();

    $admin = User::factory()->create(['institution_id' => $institution1->id]);
    $admin->assignRole('admin');

    User::factory()->count(3)->create(['institution_id' => $institution1->id]);
    User::factory()->count(2)->create(['institution_id' => $institution2->id]);

    $token = $admin->createToken('test-token')->plainTextToken;

    $response = $this->withHeader('Authorization', "Bearer {$token}")
        ->getJson("/api/users?institution_id={$institution1->id}");

    $response->assertOk()
        ->assertJsonCount(4, 'data'); // 3 created + 1 admin
});

test('user can filter by role', function () {
    $institution = Institution::factory()->create();
    $admin = User::factory()->create(['institution_id' => $institution->id]);
    $admin->assignRole('admin');

    $users = User::factory()->count(3)->create(['institution_id' => $institution->id]);
    foreach ($users as $user) {
        $user->assignRole('enumerator');
    }

    User::factory()->count(2)->create(['institution_id' => $institution->id])
        ->each(fn($user) => $user->assignRole('viewer'));

    $token = $admin->createToken('test-token')->plainTextToken;

    $response = $this->withHeader('Authorization', "Bearer {$token}")
        ->getJson('/api/users?role=enumerator');

    $response->assertOk()
        ->assertJsonCount(3, 'data');
});
