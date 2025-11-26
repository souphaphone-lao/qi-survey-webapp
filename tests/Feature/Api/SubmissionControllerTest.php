<?php

use App\Models\User;
use App\Models\Institution;
use App\Models\Questionnaire;
use App\Models\Submission;
use Database\Seeders\RoleAndPermissionSeeder;
use Spatie\Permission\PermissionRegistrar;

beforeEach(function () {
    $this->seed(RoleAndPermissionSeeder::class);

    // Clear cached permissions after seeding to ensure fresh permission checks
    app()[PermissionRegistrar::class]->forgetCachedPermissions();
});

test('enumerator can list their own submissions', function () {
    $institution = Institution::factory()->create();
    $enumerator = User::factory()->create(['institution_id' => $institution->id]);
    $enumerator->assignRole('enumerator');

    $questionnaire = Questionnaire::factory()->create();

    // Create submissions for this enumerator
    Submission::factory()->count(3)->create([
        'questionnaire_id' => $questionnaire->id,
        'institution_id' => $institution->id,
        'created_by' => $enumerator->id,
    ]);

    // Create submissions for other users
    Submission::factory()->count(2)->create([
        'questionnaire_id' => $questionnaire->id,
    ]);

    $token = $enumerator->createToken('test-token')->plainTextToken;

    $response = $this->withHeader('Authorization', "Bearer {$token}")
        ->getJson('/api/submissions');

    $response->assertOk()
        ->assertJsonCount(3, 'data');
});

test('admin can list all submissions', function () {
    $institution = Institution::factory()->create();
    $admin = User::factory()->create(['institution_id' => $institution->id]);
    $admin->assignRole('admin');

    $questionnaire = Questionnaire::factory()->create();

    Submission::factory()->count(5)->create([
        'questionnaire_id' => $questionnaire->id,
    ]);

    $token = $admin->createToken('test-token')->plainTextToken;

    $response = $this->withHeader('Authorization', "Bearer {$token}")
        ->getJson('/api/submissions');

    $response->assertOk()
        ->assertJsonCount(5, 'data');
});

test('enumerator can create draft submission', function () {
    $institution = Institution::factory()->create();
    $enumerator = User::factory()->create(['institution_id' => $institution->id]);
    $enumerator->assignRole('enumerator');

    $questionnaire = Questionnaire::factory()->active()->create();

    $token = $enumerator->createToken('test-token')->plainTextToken;

    $submissionData = [
        'questionnaire_id' => $questionnaire->id,
        'institution_id' => $institution->id,
        'status' => 'draft',
        'answers_json' => [
            'question1' => 'Answer 1',
            'question2' => 'Answer 2',
        ],
    ];

    $response = $this->withHeader('Authorization', "Bearer {$token}")
        ->postJson('/api/submissions', $submissionData);

    $response->assertCreated()
        ->assertJson([
            'data' => [
                'questionnaire_id' => $questionnaire->id,
                'status' => 'draft',
            ],
        ]);

    $this->assertDatabaseHas('submissions', [
        'questionnaire_id' => $questionnaire->id,
        'institution_id' => $institution->id,
        'status' => 'draft',
        'created_by' => $enumerator->id,
    ]);
});

test('enumerator can view their own submission', function () {
    $institution = Institution::factory()->create();
    $enumerator = User::factory()->create(['institution_id' => $institution->id]);
    $enumerator->assignRole('enumerator');

    $questionnaire = Questionnaire::factory()->create();
    $submission = Submission::factory()->create([
        'questionnaire_id' => $questionnaire->id,
        'institution_id' => $institution->id,
        'created_by' => $enumerator->id,
    ]);

    $token = $enumerator->createToken('test-token')->plainTextToken;

    $response = $this->withHeader('Authorization', "Bearer {$token}")
        ->getJson("/api/submissions/{$submission->id}");

    $response->assertOk()
        ->assertJson([
            'data' => [
                'id' => $submission->id,
                'status' => $submission->status,
            ],
        ])
        ->assertJsonStructure([
            'data' => ['id', 'questionnaire', 'institution', 'status', 'answers_json'],
        ]);
});

test('enumerator cannot view other users submission', function () {
    $institution = Institution::factory()->create();
    $enumerator = User::factory()->create(['institution_id' => $institution->id]);
    $enumerator->assignRole('enumerator');

    $questionnaire = Questionnaire::factory()->create();
    $otherUser = User::factory()->create();
    $submission = Submission::factory()->create([
        'questionnaire_id' => $questionnaire->id,
        'created_by' => $otherUser->id,
    ]);

    $token = $enumerator->createToken('test-token')->plainTextToken;

    $response = $this->withHeader('Authorization', "Bearer {$token}")
        ->getJson("/api/submissions/{$submission->id}");

    $response->assertForbidden();
});

test('admin can view any submission', function () {
    $institution = Institution::factory()->create();
    $admin = User::factory()->create(['institution_id' => $institution->id]);
    $admin->assignRole('admin');

    $questionnaire = Questionnaire::factory()->create();
    $submission = Submission::factory()->create([
        'questionnaire_id' => $questionnaire->id,
    ]);

    $token = $admin->createToken('test-token')->plainTextToken;

    $response = $this->withHeader('Authorization', "Bearer {$token}")
        ->getJson("/api/submissions/{$submission->id}");

    $response->assertOk();
});

test('enumerator can update their own draft submission', function () {
    $institution = Institution::factory()->create();
    $enumerator = User::factory()->create(['institution_id' => $institution->id]);
    $enumerator->assignRole('enumerator');

    $questionnaire = Questionnaire::factory()->create();
    $submission = Submission::factory()->draft()->create([
        'questionnaire_id' => $questionnaire->id,
        'institution_id' => $institution->id,
        'created_by' => $enumerator->id,
    ]);

    $token = $enumerator->createToken('test-token')->plainTextToken;

    $updateData = [
        'answers_json' => [
            'question1' => 'Updated Answer',
        ],
    ];

    $response = $this->withHeader('Authorization', "Bearer {$token}")
        ->putJson("/api/submissions/{$submission->id}", $updateData);

    $response->assertOk()
        ->assertJson([
            'data' => [
                'answers_json' => [
                    'question1' => 'Updated Answer',
                ],
            ],
        ]);
});

test('enumerator cannot update submitted submission', function () {
    $institution = Institution::factory()->create();
    $enumerator = User::factory()->create(['institution_id' => $institution->id]);
    $enumerator->assignRole('enumerator');

    $questionnaire = Questionnaire::factory()->create();
    $submission = Submission::factory()->submitted()->create([
        'questionnaire_id' => $questionnaire->id,
        'institution_id' => $institution->id,
        'created_by' => $enumerator->id,
    ]);

    $token = $enumerator->createToken('test-token')->plainTextToken;

    $response = $this->withHeader('Authorization', "Bearer {$token}")
        ->putJson("/api/submissions/{$submission->id}", [
            'answers_json' => ['question1' => 'Updated'],
        ]);

    $response->assertStatus(422)
        ->assertJson([
            'message' => 'Cannot edit a submission that has been submitted or approved',
        ]);
});

test('enumerator can update rejected submission', function () {
    $institution = Institution::factory()->create();
    $enumerator = User::factory()->create(['institution_id' => $institution->id]);
    $enumerator->assignRole('enumerator');

    $questionnaire = Questionnaire::factory()->create();
    $submission = Submission::factory()->rejected()->create([
        'questionnaire_id' => $questionnaire->id,
        'institution_id' => $institution->id,
        'created_by' => $enumerator->id,
    ]);

    $token = $enumerator->createToken('test-token')->plainTextToken;

    $updateData = [
        'answers_json' => [
            'question1' => 'Corrected Answer',
        ],
    ];

    $response = $this->withHeader('Authorization', "Bearer {$token}")
        ->putJson("/api/submissions/{$submission->id}", $updateData);

    $response->assertOk();
});

test('enumerator can submit draft submission', function () {
    $institution = Institution::factory()->create();
    $enumerator = User::factory()->create(['institution_id' => $institution->id]);
    $enumerator->assignRole('enumerator');

    $questionnaire = Questionnaire::factory()->create();
    $submission = Submission::factory()->draft()->create([
        'questionnaire_id' => $questionnaire->id,
        'institution_id' => $institution->id,
        'created_by' => $enumerator->id,
    ]);

    $token = $enumerator->createToken('test-token')->plainTextToken;

    $response = $this->withHeader('Authorization', "Bearer {$token}")
        ->postJson("/api/submissions/{$submission->id}/submit");

    $response->assertOk()
        ->assertJson([
            'data' => [
                'status' => 'submitted',
            ],
        ]);

    $submission->refresh();
    expect($submission->isSubmitted())->toBeTrue();
    expect($submission->submitted_at)->not->toBeNull();
});

test('enumerator cannot submit already submitted submission', function () {
    $institution = Institution::factory()->create();
    $enumerator = User::factory()->create(['institution_id' => $institution->id]);
    $enumerator->assignRole('enumerator');

    $questionnaire = Questionnaire::factory()->create();
    $submission = Submission::factory()->submitted()->create([
        'questionnaire_id' => $questionnaire->id,
        'institution_id' => $institution->id,
        'created_by' => $enumerator->id,
    ]);

    $token = $enumerator->createToken('test-token')->plainTextToken;

    $response = $this->withHeader('Authorization', "Bearer {$token}")
        ->postJson("/api/submissions/{$submission->id}/submit");

    $response->assertStatus(422)
        ->assertJson([
            'message' => 'Cannot submit a submission that has already been submitted or approved',
        ]);
});

test('admin can approve submitted submission', function () {
    $institution = Institution::factory()->create();
    $admin = User::factory()->create(['institution_id' => $institution->id]);
    $admin->assignRole('admin');

    $questionnaire = Questionnaire::factory()->create();
    $submission = Submission::factory()->submitted()->create([
        'questionnaire_id' => $questionnaire->id,
    ]);

    $token = $admin->createToken('test-token')->plainTextToken;

    $response = $this->withHeader('Authorization', "Bearer {$token}")
        ->postJson("/api/submissions/{$submission->id}/approve");

    $response->assertOk()
        ->assertJson([
            'data' => [
                'status' => 'approved',
            ],
        ]);

    $submission->refresh();
    expect($submission->isApproved())->toBeTrue();
    expect($submission->approved_at)->not->toBeNull();
    expect($submission->approved_by)->toBe($admin->id);
});

test('non-admin cannot approve submission', function () {
    $institution = Institution::factory()->create();
    $enumerator = User::factory()->create(['institution_id' => $institution->id]);
    $enumerator->assignRole('enumerator');

    $questionnaire = Questionnaire::factory()->create();
    $submission = Submission::factory()->submitted()->create([
        'questionnaire_id' => $questionnaire->id,
    ]);

    $token = $enumerator->createToken('test-token')->plainTextToken;

    $response = $this->withHeader('Authorization', "Bearer {$token}")
        ->postJson("/api/submissions/{$submission->id}/approve");

    $response->assertForbidden();
});

test('admin can reject submitted submission', function () {
    $institution = Institution::factory()->create();
    $admin = User::factory()->create(['institution_id' => $institution->id]);
    $admin->assignRole('admin');

    $questionnaire = Questionnaire::factory()->create();
    $submission = Submission::factory()->submitted()->create([
        'questionnaire_id' => $questionnaire->id,
    ]);

    $token = $admin->createToken('test-token')->plainTextToken;

    $response = $this->withHeader('Authorization', "Bearer {$token}")
        ->postJson("/api/submissions/{$submission->id}/reject", [
            'rejection_comments' => 'Data is incomplete',
        ]);

    $response->assertOk()
        ->assertJson([
            'data' => [
                'status' => 'rejected',
                'rejection_comments' => 'Data is incomplete',
            ],
        ]);

    $submission->refresh();
    expect($submission->isRejected())->toBeTrue();
    expect($submission->rejected_at)->not->toBeNull();
    expect($submission->rejected_by)->toBe($admin->id);
    expect($submission->rejection_comments)->toBe('Data is incomplete');
});

test('rejection requires comments', function () {
    $institution = Institution::factory()->create();
    $admin = User::factory()->create(['institution_id' => $institution->id]);
    $admin->assignRole('admin');

    $questionnaire = Questionnaire::factory()->create();
    $submission = Submission::factory()->submitted()->create([
        'questionnaire_id' => $questionnaire->id,
    ]);

    $token = $admin->createToken('test-token')->plainTextToken;

    $response = $this->withHeader('Authorization', "Bearer {$token}")
        ->postJson("/api/submissions/{$submission->id}/reject", []);

    $response->assertStatus(422)
        ->assertJsonValidationErrors(['rejection_comments']);
});

test('non-admin cannot reject submission', function () {
    $institution = Institution::factory()->create();
    $enumerator = User::factory()->create(['institution_id' => $institution->id]);
    $enumerator->assignRole('enumerator');

    $questionnaire = Questionnaire::factory()->create();
    $submission = Submission::factory()->submitted()->create([
        'questionnaire_id' => $questionnaire->id,
    ]);

    $token = $enumerator->createToken('test-token')->plainTextToken;

    $response = $this->withHeader('Authorization', "Bearer {$token}")
        ->postJson("/api/submissions/{$submission->id}/reject", [
            'rejection_comments' => 'Test',
        ]);

    $response->assertForbidden();
});

test('enumerator can delete their own draft submission', function () {
    $institution = Institution::factory()->create();
    $enumerator = User::factory()->create(['institution_id' => $institution->id]);
    $enumerator->assignRole('enumerator');

    $questionnaire = Questionnaire::factory()->create();
    $submission = Submission::factory()->draft()->create([
        'questionnaire_id' => $questionnaire->id,
        'institution_id' => $institution->id,
        'created_by' => $enumerator->id,
    ]);

    $token = $enumerator->createToken('test-token')->plainTextToken;

    $response = $this->withHeader('Authorization', "Bearer {$token}")
        ->deleteJson("/api/submissions/{$submission->id}");

    $response->assertOk();

    $this->assertSoftDeleted('submissions', [
        'id' => $submission->id,
    ]);
});

test('enumerator cannot delete submitted submission', function () {
    $institution = Institution::factory()->create();
    $enumerator = User::factory()->create(['institution_id' => $institution->id]);
    $enumerator->assignRole('enumerator');

    $questionnaire = Questionnaire::factory()->create();
    $submission = Submission::factory()->submitted()->create([
        'questionnaire_id' => $questionnaire->id,
        'institution_id' => $institution->id,
        'created_by' => $enumerator->id,
    ]);

    $token = $enumerator->createToken('test-token')->plainTextToken;

    $response = $this->withHeader('Authorization', "Bearer {$token}")
        ->deleteJson("/api/submissions/{$submission->id}");

    $response->assertForbidden();
});

test('admin can delete any submission', function () {
    $institution = Institution::factory()->create();
    $admin = User::factory()->create(['institution_id' => $institution->id]);
    $admin->assignRole('admin');

    $questionnaire = Questionnaire::factory()->create();
    $submission = Submission::factory()->submitted()->create([
        'questionnaire_id' => $questionnaire->id,
    ]);

    $token = $admin->createToken('test-token')->plainTextToken;

    $response = $this->withHeader('Authorization', "Bearer {$token}")
        ->deleteJson("/api/submissions/{$submission->id}");

    $response->assertOk();

    $this->assertSoftDeleted('submissions', [
        'id' => $submission->id,
    ]);
});

test('can filter submissions by status', function () {
    $institution = Institution::factory()->create();
    $admin = User::factory()->create(['institution_id' => $institution->id]);
    $admin->assignRole('admin');

    $questionnaire = Questionnaire::factory()->create();

    Submission::factory()->count(2)->draft()->create(['questionnaire_id' => $questionnaire->id]);
    Submission::factory()->count(3)->submitted()->create(['questionnaire_id' => $questionnaire->id]);
    Submission::factory()->count(1)->approved()->create(['questionnaire_id' => $questionnaire->id]);

    $token = $admin->createToken('test-token')->plainTextToken;

    $response = $this->withHeader('Authorization', "Bearer {$token}")
        ->getJson('/api/submissions?status=submitted');

    $response->assertOk()
        ->assertJsonCount(3, 'data');
});

test('can filter submissions by questionnaire', function () {
    $institution = Institution::factory()->create();
    $admin = User::factory()->create(['institution_id' => $institution->id]);
    $admin->assignRole('admin');

    $questionnaire1 = Questionnaire::factory()->create();
    $questionnaire2 = Questionnaire::factory()->create();

    Submission::factory()->count(3)->create(['questionnaire_id' => $questionnaire1->id]);
    Submission::factory()->count(2)->create(['questionnaire_id' => $questionnaire2->id]);

    $token = $admin->createToken('test-token')->plainTextToken;

    $response = $this->withHeader('Authorization', "Bearer {$token}")
        ->getJson("/api/submissions?questionnaire_id={$questionnaire1->id}");

    $response->assertOk()
        ->assertJsonCount(3, 'data');
});

test('can filter submissions by institution', function () {
    $institution1 = Institution::factory()->create();
    $institution2 = Institution::factory()->create();
    $admin = User::factory()->create(['institution_id' => $institution1->id]);
    $admin->assignRole('admin');

    $questionnaire = Questionnaire::factory()->create();

    Submission::factory()->count(3)->create([
        'questionnaire_id' => $questionnaire->id,
        'institution_id' => $institution1->id,
    ]);
    Submission::factory()->count(2)->create([
        'questionnaire_id' => $questionnaire->id,
        'institution_id' => $institution2->id,
    ]);

    $token = $admin->createToken('test-token')->plainTextToken;

    $response = $this->withHeader('Authorization', "Bearer {$token}")
        ->getJson("/api/submissions?institution_id={$institution1->id}");

    $response->assertOk()
        ->assertJsonCount(3, 'data');
});

test('create submission validates required fields', function () {
    $institution = Institution::factory()->create();
    $enumerator = User::factory()->create(['institution_id' => $institution->id]);
    $enumerator->assignRole('enumerator');

    $token = $enumerator->createToken('test-token')->plainTextToken;

    $response = $this->withHeader('Authorization', "Bearer {$token}")
        ->postJson('/api/submissions', []);

    $response->assertStatus(422)
        ->assertJsonValidationErrors(['questionnaire_id', 'institution_id']);
});

test('create submission validates answers_json is array', function () {
    $institution = Institution::factory()->create();
    $enumerator = User::factory()->create(['institution_id' => $institution->id]);
    $enumerator->assignRole('enumerator');

    $questionnaire = Questionnaire::factory()->create();

    $token = $enumerator->createToken('test-token')->plainTextToken;

    $submissionData = [
        'questionnaire_id' => $questionnaire->id,
        'institution_id' => $institution->id,
        'answers_json' => 'invalid',
    ];

    $response = $this->withHeader('Authorization', "Bearer {$token}")
        ->postJson('/api/submissions', $submissionData);

    $response->assertStatus(422)
        ->assertJsonValidationErrors(['answers_json']);
});

test('viewer can only view submissions but not modify', function () {
    $institution = Institution::factory()->create();
    $viewer = User::factory()->create(['institution_id' => $institution->id]);
    $viewer->assignRole('viewer');

    $questionnaire = Questionnaire::factory()->create();
    $submission = Submission::factory()->create([
        'questionnaire_id' => $questionnaire->id,
        'institution_id' => $institution->id,
    ]);

    $token = $viewer->createToken('test-token')->plainTextToken;

    // Can view
    $response = $this->withHeader('Authorization', "Bearer {$token}")
        ->getJson("/api/submissions/{$submission->id}");
    $response->assertOk();

    // Cannot create
    $response = $this->withHeader('Authorization', "Bearer {$token}")
        ->postJson('/api/submissions', [
            'questionnaire_id' => $questionnaire->id,
            'institution_id' => $institution->id,
            'answers_json' => [],
        ]);
    $response->assertForbidden();

    // Cannot update
    $response = $this->withHeader('Authorization', "Bearer {$token}")
        ->putJson("/api/submissions/{$submission->id}", [
            'answers_json' => ['test' => 'value'],
        ]);
    $response->assertForbidden();
});
