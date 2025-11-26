<?php

use App\Models\User;
use App\Models\Institution;

test('protected routes require authentication', function () {
    $routes = [
        ['method' => 'get', 'url' => '/api/user'],
        ['method' => 'post', 'url' => '/api/logout'],
        ['method' => 'get', 'url' => '/api/users'],
        ['method' => 'post', 'url' => '/api/users'],
        ['method' => 'get', 'url' => '/api/institutions'],
        ['method' => 'post', 'url' => '/api/institutions'],
        ['method' => 'get', 'url' => '/api/questionnaires'],
        ['method' => 'post', 'url' => '/api/questionnaires'],
        ['method' => 'get', 'url' => '/api/submissions'],
    ];

    foreach ($routes as $route) {
        $response = $this->{$route['method'] . 'Json'}($route['url']);
        $response->assertUnauthorized();
    }
});

test('authenticated user can access protected routes', function () {
    $institution = Institution::factory()->create();
    $user = User::factory()->create([
        'institution_id' => $institution->id,
    ]);
    $token = $user->createToken('test-token')->plainTextToken;

    $response = $this->withHeader('Authorization', "Bearer {$token}")
        ->getJson('/api/user');

    $response->assertOk();
});

test('invalid token returns unauthorized', function () {
    $response = $this->withHeader('Authorization', 'Bearer invalid-token')
        ->getJson('/api/user');

    $response->assertUnauthorized();
});

test('expired token returns unauthorized', function () {
    $institution = Institution::factory()->create();
    $user = User::factory()->create([
        'institution_id' => $institution->id,
    ]);
    $token = $user->createToken('test-token', ['*'], now()->subHour());

    $response = $this->withHeader('Authorization', "Bearer {$token->plainTextToken}")
        ->getJson('/api/user');

    $response->assertUnauthorized();
});

test('missing authorization header returns unauthorized', function () {
    $response = $this->getJson('/api/user');

    $response->assertUnauthorized();
});

test('malformed authorization header returns unauthorized', function () {
    $response = $this->withHeader('Authorization', 'InvalidFormat')
        ->getJson('/api/user');

    $response->assertUnauthorized();
});
