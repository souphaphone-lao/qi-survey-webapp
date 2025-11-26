<?php

use App\Models\User;
use App\Models\Institution;

test('isLocked returns true when account is locked', function () {
    $user = User::factory()->make([
        'locked_until' => now()->addMinutes(15),
    ]);

    expect($user->isLocked())->toBeTrue();
});

test('isLocked returns false when account is not locked', function () {
    $user = User::factory()->make([
        'locked_until' => null,
    ]);

    expect($user->isLocked())->toBeFalse();
});

test('isLocked returns false when lock has expired', function () {
    $user = User::factory()->make([
        'locked_until' => now()->subMinute(),
    ]);

    expect($user->isLocked())->toBeFalse();
});

test('incrementFailedLoginAttempts increments counter', function () {
    $institution = Institution::factory()->create();
    $user = User::factory()->create([
        'institution_id' => $institution->id,
        'failed_login_attempts' => 0,
    ]);

    $user->incrementFailedLoginAttempts();

    expect($user->fresh()->failed_login_attempts)->toBe(1);
});

test('incrementFailedLoginAttempts locks account after 5 attempts', function () {
    $institution = Institution::factory()->create();
    $user = User::factory()->create([
        'institution_id' => $institution->id,
        'failed_login_attempts' => 4,
    ]);

    $user->incrementFailedLoginAttempts();

    $user->refresh();
    expect($user->failed_login_attempts)->toBe(5);
    expect($user->locked_until)->not->toBeNull();
    expect($user->isLocked())->toBeTrue();
});

test('incrementFailedLoginAttempts sets lock for 15 minutes', function () {
    $institution = Institution::factory()->create();
    $user = User::factory()->create([
        'institution_id' => $institution->id,
        'failed_login_attempts' => 4,
    ]);

    $beforeIncrement = now();
    $user->incrementFailedLoginAttempts();
    $user->refresh();

    expect($user->locked_until)->not->toBeNull();
    expect($user->locked_until->greaterThan($beforeIncrement->addMinutes(14)))->toBeTrue();
    expect($user->locked_until->lessThan($beforeIncrement->addMinutes(16)))->toBeTrue();
});

test('resetFailedLoginAttempts resets counter to zero', function () {
    $institution = Institution::factory()->create();
    $user = User::factory()->create([
        'institution_id' => $institution->id,
        'failed_login_attempts' => 3,
    ]);

    $user->resetFailedLoginAttempts();

    expect($user->fresh()->failed_login_attempts)->toBe(0);
});

test('resetFailedLoginAttempts clears locked_until', function () {
    $institution = Institution::factory()->create();
    $user = User::factory()->locked()->create([
        'institution_id' => $institution->id,
    ]);

    $user->resetFailedLoginAttempts();

    $user->refresh();
    expect($user->failed_login_attempts)->toBe(0);
    expect($user->locked_until)->toBeNull();
    expect($user->isLocked())->toBeFalse();
});

test('resetFailedLoginAttempts sets last_login_at', function () {
    $institution = Institution::factory()->create();
    $user = User::factory()->create([
        'institution_id' => $institution->id,
        'last_login_at' => null,
    ]);

    $before = now();
    $user->resetFailedLoginAttempts();
    $user->refresh();

    expect($user->last_login_at)->not->toBeNull();
    expect($user->last_login_at->greaterThanOrEqualTo($before->floorSecond()))->toBeTrue();
});

test('user has institution relationship', function () {
    $institution = Institution::factory()->create();
    $user = User::factory()->create([
        'institution_id' => $institution->id,
    ]);

    expect($user->institution)->not->toBeNull();
    expect($user->institution->id)->toBe($institution->id);
});

test('user has submissions relationship', function () {
    $institution = Institution::factory()->create();
    $user = User::factory()->create([
        'institution_id' => $institution->id,
    ]);

    expect($user->submissions)->toBeInstanceOf(Illuminate\Database\Eloquent\Collection::class);
});

test('user casts is_active to boolean', function () {
    $user = User::factory()->make([
        'is_active' => 1,
    ]);

    expect($user->is_active)->toBeTrue();
    expect($user->is_active)->toBeBool();
});

test('user casts locked_until to datetime', function () {
    $user = User::factory()->make([
        'locked_until' => now(),
    ]);

    expect($user->locked_until)->toBeInstanceOf(Carbon\Carbon::class);
});

test('user hides password in array', function () {
    $institution = Institution::factory()->create();
    $user = User::factory()->create([
        'institution_id' => $institution->id,
        'password' => bcrypt('secret'),
    ]);

    $array = $user->toArray();

    expect($array)->not->toHaveKey('password');
});

test('user hides remember_token in array', function () {
    $institution = Institution::factory()->create();
    $user = User::factory()->create([
        'institution_id' => $institution->id,
    ]);

    $array = $user->toArray();

    expect($array)->not->toHaveKey('remember_token');
});

test('user password is automatically hashed', function () {
    $institution = Institution::factory()->create();
    $user = User::factory()->create([
        'institution_id' => $institution->id,
        'password' => 'plain-password',
    ]);

    expect($user->password)->not->toBe('plain-password');
    expect(strlen($user->password))->toBeGreaterThan(20);
});

test('user can be soft deleted', function () {
    $institution = Institution::factory()->create();
    $user = User::factory()->create([
        'institution_id' => $institution->id,
    ]);

    $userId = $user->id;
    $user->delete();

    expect(User::find($userId))->toBeNull();
    expect(User::withTrashed()->find($userId))->not->toBeNull();
});

test('locked user with future locked_until is locked', function () {
    $user = User::factory()->make([
        'locked_until' => now()->addHour(),
    ]);

    expect($user->isLocked())->toBeTrue();
});

test('user with locked_until in past is not locked', function () {
    $user = User::factory()->make([
        'locked_until' => now()->subHour(),
    ]);

    expect($user->isLocked())->toBeFalse();
});

test('incrementing beyond 5 attempts keeps lock', function () {
    $institution = Institution::factory()->create();
    $user = User::factory()->create([
        'institution_id' => $institution->id,
        'failed_login_attempts' => 5,
        'locked_until' => now()->addMinutes(15),
    ]);

    $user->incrementFailedLoginAttempts();

    $user->refresh();
    expect($user->failed_login_attempts)->toBe(6);
    expect($user->isLocked())->toBeTrue();
});
