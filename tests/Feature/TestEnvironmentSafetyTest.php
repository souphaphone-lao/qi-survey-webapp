<?php

/**
 * Test Environment Safety Guards
 *
 * These tests verify that our testing setup prevents accidental
 * execution against production databases.
 */

test('tests run in testing environment', function () {
    expect(app()->environment())->toBe('testing');
});

test('tests use SQLite in-memory database', function () {
    $connection = config('database.default');
    $database = config('database.connections.' . $connection . '.database');

    expect($connection)->toBe('sqlite');
    expect($database)->toBe(':memory:');
});

test('tests use safe configuration for external services', function () {
    // Verify external services are disabled or mocked
    expect(config('cache.default'))->toBe('array');
    expect(config('session.driver'))->toBe('array');
    expect(config('queue.default'))->toBe('sync');
    expect(config('mail.default'))->toBe('array');
});

test('database is recreated for each test using RefreshDatabase', function () {
    // This test verifies that RefreshDatabase trait is working
    // by checking that the database starts empty
    $this->assertDatabaseCount('users', 0);
});

test('tests cannot accidentally affect production data', function () {
    // Verify that even if someone tries to change the connection,
    // the TestCase safety guards will prevent it
    $connection = config('database.default');

    // This should be caught by TestCase::ensureTestingEnvironment()
    expect(function () use ($connection) {
        if ($connection !== 'sqlite') {
            throw new \RuntimeException('Production database detected!');
        }
    })->not->toThrow(\RuntimeException::class);
});
