<?php

use App\Models\User;
use App\Models\Institution;
use Database\Seeders\RoleAndPermissionSeeder;

beforeEach(function () {
    $this->seed(RoleAndPermissionSeeder::class);
});

test('user can login with valid credentials', function () {
    $institution = Institution::factory()->create();
    $user = User::factory()->create([
        'email' => 'test@example.com',
        'password' => bcrypt('password'),
        'institution_id' => $institution->id,
    ]);
    $user->assignRole('enumerator');

    $response = $this->postJson('/api/login', [
        'email' => 'test@example.com',
        'password' => 'password',
    ]);

    $response->assertOk()
        ->assertJsonStructure([
            'user' => ['id', 'name', 'email', 'roles'],
            'token',
        ]);

    // Verify failed login attempts are reset
    expect($user->fresh()->failed_login_attempts)->toBe(0);
    expect($user->fresh()->last_login_at)->not->toBeNull();
});

test('user cannot login with invalid email', function () {
    $response = $this->postJson('/api/login', [
        'email' => 'nonexistent@example.com',
        'password' => 'password',
    ]);

    $response->assertStatus(422)
        ->assertJsonPath('errors.email.0', 'The provided credentials are incorrect.');
});

test('user cannot login with invalid password', function () {
    $institution = Institution::factory()->create();
    $user = User::factory()->create([
        'email' => 'test@example.com',
        'password' => bcrypt('password'),
        'institution_id' => $institution->id,
    ]);

    $response = $this->postJson('/api/login', [
        'email' => 'test@example.com',
        'password' => 'wrong-password',
    ]);

    $response->assertStatus(422)
        ->assertJsonPath('errors.email.0', 'The provided credentials are incorrect.');

    // Verify failed login attempts are incremented
    expect($user->fresh()->failed_login_attempts)->toBe(1);
});

test('account is locked after 5 failed login attempts', function () {
    $institution = Institution::factory()->create();
    $user = User::factory()->create([
        'email' => 'test@example.com',
        'password' => bcrypt('password'),
        'institution_id' => $institution->id,
    ]);

    // Make 5 failed login attempts
    for ($i = 0; $i < 5; $i++) {
        $this->postJson('/api/login', [
            'email' => 'test@example.com',
            'password' => 'wrong-password',
        ]);
    }

    $user->refresh();
    expect($user->failed_login_attempts)->toBe(5);
    expect($user->isLocked())->toBeTrue();
    expect($user->locked_until)->not->toBeNull();

    // Attempt to login with correct password should fail due to account lock
    $response = $this->postJson('/api/login', [
        'email' => 'test@example.com',
        'password' => 'password',
    ]);

    $response->assertStatus(422)
        ->assertJsonPath('errors.email.0', 'Account is temporarily locked. Please try again later.');
});

test('locked account can login after lock period expires', function () {
    $institution = Institution::factory()->create();
    $user = User::factory()->locked()->create([
        'email' => 'test@example.com',
        'password' => bcrypt('password'),
        'institution_id' => $institution->id,
        'locked_until' => now()->subMinute(), // Lock expired
    ]);
    $user->assignRole('enumerator');

    $response = $this->postJson('/api/login', [
        'email' => 'test@example.com',
        'password' => 'password',
    ]);

    $response->assertOk()
        ->assertJsonStructure([
            'user',
            'token',
        ]);

    // Verify lock is cleared
    $user->refresh();
    expect($user->failed_login_attempts)->toBe(0);
    expect($user->locked_until)->toBeNull();
});

test('inactive user cannot login', function () {
    $institution = Institution::factory()->create();
    $user = User::factory()->inactive()->create([
        'email' => 'test@example.com',
        'password' => bcrypt('password'),
        'institution_id' => $institution->id,
    ]);

    $response = $this->postJson('/api/login', [
        'email' => 'test@example.com',
        'password' => 'password',
    ]);

    $response->assertStatus(422)
        ->assertJsonPath('errors.email.0', 'Your account has been deactivated.');
});

test('user can logout', function () {
    $institution = Institution::factory()->create();
    $user = User::factory()->create([
        'institution_id' => $institution->id,
    ]);
    $token = $user->createToken('test-token')->plainTextToken;

    $response = $this->withHeader('Authorization', "Bearer {$token}")
        ->postJson('/api/logout');

    $response->assertOk()
        ->assertJson([
            'message' => 'Successfully logged out',
        ]);

    // Verify token is revoked
    expect($user->tokens()->count())->toBe(0);
});

test('logout requires authentication', function () {
    $response = $this->postJson('/api/logout');

    $response->assertUnauthorized();
});

test('user endpoint returns authenticated user data', function () {
    $institution = Institution::factory()->create();
    $user = User::factory()->create([
        'institution_id' => $institution->id,
    ]);
    $user->assignRole('admin');
    $token = $user->createToken('test-token')->plainTextToken;

    $response = $this->withHeader('Authorization', "Bearer {$token}")
        ->getJson('/api/user');

    $response->assertOk()
        ->assertJson([
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
        ])
        ->assertJsonStructure([
            'id',
            'name',
            'email',
            'roles',
            'institution',
        ]);
});

test('user endpoint requires authentication', function () {
    $response = $this->getJson('/api/user');

    $response->assertUnauthorized();
});
