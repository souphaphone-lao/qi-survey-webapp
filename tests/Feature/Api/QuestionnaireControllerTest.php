<?php

use App\Models\User;
use App\Models\Institution;
use App\Models\Questionnaire;
use Database\Seeders\RoleAndPermissionSeeder;

beforeEach(function () {
    $this->seed(RoleAndPermissionSeeder::class);
});

test('authenticated user can list questionnaires', function () {
    $institution = Institution::factory()->create();
    $user = User::factory()->create(['institution_id' => $institution->id]);
    $user->assignRole('viewer');

    Questionnaire::factory()->count(5)->create();

    $token = $user->createToken('test-token')->plainTextToken;

    $response = $this->withHeader('Authorization', "Bearer {$token}")
        ->getJson('/api/questionnaires');

    $response->assertOk()
        ->assertJsonStructure([
            'data' => [
                '*' => ['id', 'code', 'title', 'description', 'is_active'],
            ],
        ])
        ->assertJsonCount(5, 'data');
});

test('admin can create questionnaire', function () {
    $institution = Institution::factory()->create();
    $admin = User::factory()->create(['institution_id' => $institution->id]);
    $admin->assignRole('admin');

    $token = $admin->createToken('test-token')->plainTextToken;

    $questionnaireData = [
        'code' => 'QST-001',
        'version' => 1,
        'title' => 'New Questionnaire',
        'description' => 'Test description',
        'surveyjs_json' => [
            'pages' => [
                [
                    'name' => 'page1',
                    'elements' => [
                        [
                            'type' => 'text',
                            'name' => 'question1',
                            'title' => 'What is your name?',
                        ],
                    ],
                ],
            ],
        ],
        'is_active' => true,
    ];

    $response = $this->withHeader('Authorization', "Bearer {$token}")
        ->postJson('/api/questionnaires', $questionnaireData);

    $response->assertCreated()
        ->assertJson([
            'data' => [
                'code' => 'QST-001',
                'title' => 'New Questionnaire',
            ],
        ]);

    $this->assertDatabaseHas('questionnaires', [
        'code' => 'QST-001',
        'title' => 'New Questionnaire',
    ]);
});

test('non-admin cannot create questionnaire', function () {
    $institution = Institution::factory()->create();
    $enumerator = User::factory()->create(['institution_id' => $institution->id]);
    $enumerator->assignRole('enumerator');

    $token = $enumerator->createToken('test-token')->plainTextToken;

    $questionnaireData = [
        'code' => 'QST-001',
        'title' => 'New Questionnaire',
        'description' => 'Test description',
        'surveyjs_json' => ['pages' => []],
    ];

    $response = $this->withHeader('Authorization', "Bearer {$token}")
        ->postJson('/api/questionnaires', $questionnaireData);

    $response->assertForbidden();
});

test('user can view questionnaire details', function () {
    $institution = Institution::factory()->create();
    $user = User::factory()->create(['institution_id' => $institution->id]);
    $user->assignRole('viewer');

    $questionnaire = Questionnaire::factory()->create();

    $token = $user->createToken('test-token')->plainTextToken;

    $response = $this->withHeader('Authorization', "Bearer {$token}")
        ->getJson("/api/questionnaires/{$questionnaire->id}");

    $response->assertOk()
        ->assertJson([
            'data' => [
                'id' => $questionnaire->id,
                'title' => $questionnaire->title,
                'code' => $questionnaire->code,
            ],
        ])
        ->assertJsonStructure([
            'data' => ['id', 'code', 'title', 'description', 'surveyjs_json'],
        ]);
});

test('admin can update questionnaire', function () {
    $institution = Institution::factory()->create();
    $admin = User::factory()->create(['institution_id' => $institution->id]);
    $admin->assignRole('admin');

    $questionnaire = Questionnaire::factory()->create();

    $token = $admin->createToken('test-token')->plainTextToken;

    $updateData = [
        'code' => $questionnaire->code,
        'title' => 'Updated Questionnaire',
        'description' => 'Updated description',
        'surveyjs_json' => [
            'pages' => [
                [
                    'name' => 'page1',
                    'elements' => [
                        [
                            'type' => 'text',
                            'name' => 'question1',
                            'title' => 'Updated question',
                        ],
                    ],
                ],
            ],
        ],
    ];

    $response = $this->withHeader('Authorization', "Bearer {$token}")
        ->putJson("/api/questionnaires/{$questionnaire->id}", $updateData);

    $response->assertOk()
        ->assertJson([
            'data' => [
                'title' => 'Updated Questionnaire',
                'description' => 'Updated description',
            ],
        ]);

    $this->assertDatabaseHas('questionnaires', [
        'id' => $questionnaire->id,
        'title' => 'Updated Questionnaire',
    ]);
});

test('non-admin cannot update questionnaire', function () {
    $institution = Institution::factory()->create();
    $enumerator = User::factory()->create(['institution_id' => $institution->id]);
    $enumerator->assignRole('enumerator');

    $questionnaire = Questionnaire::factory()->create();

    $token = $enumerator->createToken('test-token')->plainTextToken;

    $response = $this->withHeader('Authorization', "Bearer {$token}")
        ->putJson("/api/questionnaires/{$questionnaire->id}", [
            'title' => 'Updated',
        ]);

    $response->assertForbidden();
});

test('admin can delete questionnaire', function () {
    $institution = Institution::factory()->create();
    $admin = User::factory()->create(['institution_id' => $institution->id]);
    $admin->assignRole('admin');

    $questionnaire = Questionnaire::factory()->create();

    $token = $admin->createToken('test-token')->plainTextToken;

    $response = $this->withHeader('Authorization', "Bearer {$token}")
        ->deleteJson("/api/questionnaires/{$questionnaire->id}");

    $response->assertOk();

    $this->assertDatabaseMissing('questionnaires', [
        'id' => $questionnaire->id,
    ]);
});

test('non-admin cannot delete questionnaire', function () {
    $institution = Institution::factory()->create();
    $enumerator = User::factory()->create(['institution_id' => $institution->id]);
    $enumerator->assignRole('enumerator');

    $questionnaire = Questionnaire::factory()->create();

    $token = $enumerator->createToken('test-token')->plainTextToken;

    $response = $this->withHeader('Authorization', "Bearer {$token}")
        ->deleteJson("/api/questionnaires/{$questionnaire->id}");

    $response->assertForbidden();
});

test('create questionnaire validates required fields', function () {
    $institution = Institution::factory()->create();
    $admin = User::factory()->create(['institution_id' => $institution->id]);
    $admin->assignRole('admin');

    $token = $admin->createToken('test-token')->plainTextToken;

    $response = $this->withHeader('Authorization', "Bearer {$token}")
        ->postJson('/api/questionnaires', []);

    $response->assertStatus(422)
        ->assertJsonValidationErrors(['code', 'title', 'surveyjs_json']);
});

test('create questionnaire validates surveyjs_json is array', function () {
    $institution = Institution::factory()->create();
    $admin = User::factory()->create(['institution_id' => $institution->id]);
    $admin->assignRole('admin');

    $token = $admin->createToken('test-token')->plainTextToken;

    $questionnaireData = [
        'code' => 'QST-001',
        'title' => 'New Questionnaire',
        'surveyjs_json' => 'invalid-json',
    ];

    $response = $this->withHeader('Authorization', "Bearer {$token}")
        ->postJson('/api/questionnaires', $questionnaireData);

    $response->assertStatus(422)
        ->assertJsonValidationErrors(['surveyjs_json']);
});

test('can filter active questionnaires', function () {
    $institution = Institution::factory()->create();
    $user = User::factory()->create(['institution_id' => $institution->id]);
    $user->assignRole('viewer');

    Questionnaire::factory()->count(3)->active()->create();
    Questionnaire::factory()->count(2)->inactive()->create();

    $token = $user->createToken('test-token')->plainTextToken;

    $response = $this->withHeader('Authorization', "Bearer {$token}")
        ->getJson('/api/questionnaires?is_active=1');

    $response->assertOk()
        ->assertJsonCount(3, 'data');
});

test('can filter questionnaires by code', function () {
    $institution = Institution::factory()->create();
    $user = User::factory()->create(['institution_id' => $institution->id]);
    $user->assignRole('viewer');

    $questionnaire = Questionnaire::factory()->create(['code' => 'QST-SPECIFIC']);
    Questionnaire::factory()->count(3)->create();

    $token = $user->createToken('test-token')->plainTextToken;

    $response = $this->withHeader('Authorization', "Bearer {$token}")
        ->getJson('/api/questionnaires?code=QST-SPECIFIC');

    $response->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJson([
            'data' => [
                ['code' => 'QST-SPECIFIC'],
            ],
        ]);
});

test('admin can activate questionnaire', function () {
    $institution = Institution::factory()->create();
    $admin = User::factory()->create(['institution_id' => $institution->id]);
    $admin->assignRole('admin');

    $questionnaire = Questionnaire::factory()->inactive()->create();

    $token = $admin->createToken('test-token')->plainTextToken;

    $response = $this->withHeader('Authorization', "Bearer {$token}")
        ->postJson("/api/questionnaires/{$questionnaire->id}/activate");

    $response->assertOk();

    $this->assertDatabaseHas('questionnaires', [
        'id' => $questionnaire->id,
        'is_active' => true,
    ]);
});

test('admin can deactivate questionnaire', function () {
    $institution = Institution::factory()->create();
    $admin = User::factory()->create(['institution_id' => $institution->id]);
    $admin->assignRole('admin');

    $questionnaire = Questionnaire::factory()->active()->create();

    $token = $admin->createToken('test-token')->plainTextToken;

    $response = $this->withHeader('Authorization', "Bearer {$token}")
        ->postJson("/api/questionnaires/{$questionnaire->id}/deactivate");

    $response->assertOk();

    $this->assertDatabaseHas('questionnaires', [
        'id' => $questionnaire->id,
        'is_active' => false,
    ]);
});

test('non-admin cannot activate questionnaire', function () {
    $institution = Institution::factory()->create();
    $enumerator = User::factory()->create(['institution_id' => $institution->id]);
    $enumerator->assignRole('enumerator');

    $questionnaire = Questionnaire::factory()->inactive()->create();

    $token = $enumerator->createToken('test-token')->plainTextToken;

    $response = $this->withHeader('Authorization', "Bearer {$token}")
        ->postJson("/api/questionnaires/{$questionnaire->id}/activate");

    $response->assertForbidden();
});

test('admin can duplicate questionnaire', function () {
    $institution = Institution::factory()->create();
    $admin = User::factory()->create(['institution_id' => $institution->id]);
    $admin->assignRole('admin');

    $questionnaire = Questionnaire::factory()->create([
        'code' => 'QST-001',
        'version' => 1,
    ]);

    $token = $admin->createToken('test-token')->plainTextToken;

    $response = $this->withHeader('Authorization', "Bearer {$token}")
        ->postJson("/api/questionnaires/{$questionnaire->id}/duplicate");

    $response->assertCreated()
        ->assertJson([
            'data' => [
                'code' => 'QST-001',
                'version' => 2,
            ],
        ]);

    $this->assertDatabaseHas('questionnaires', [
        'code' => 'QST-001',
        'version' => 2,
    ]);
});

test('enumerator can list only active questionnaires', function () {
    $institution = Institution::factory()->create();
    $enumerator = User::factory()->create(['institution_id' => $institution->id]);
    $enumerator->assignRole('enumerator');

    Questionnaire::factory()->count(3)->active()->create();
    Questionnaire::factory()->count(2)->inactive()->create();

    $token = $enumerator->createToken('test-token')->plainTextToken;

    $response = $this->withHeader('Authorization', "Bearer {$token}")
        ->getJson('/api/questionnaires');

    $response->assertOk();

    // Enumerators should only see active questionnaires
    $data = $response->json('data');
    foreach ($data as $item) {
        expect($item['is_active'])->toBeTrue();
    }
});
