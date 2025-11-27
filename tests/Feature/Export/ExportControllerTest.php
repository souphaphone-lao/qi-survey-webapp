<?php

use App\Models\User;
use App\Models\Institution;
use App\Models\Questionnaire;
use App\Models\Submission;
use App\Models\ExportJob;
use Database\Seeders\RoleAndPermissionSeeder;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Queue;

beforeEach(function () {
    $this->seed(RoleAndPermissionSeeder::class);
    Storage::fake('local');
    Queue::fake();
});

test('authenticated user can create export job', function () {
    $user = User::factory()->create();
    $user->assignRole('enumerator');

    $institution = Institution::factory()->create();
    $questionnaire = Questionnaire::factory()->create(['code' => 'TEST-Q']);

    Submission::factory()->create([
        'questionnaire_id' => $questionnaire->id,
        'institution_id' => $institution->id,
        'created_by' => $user->id,
        'status' => 'approved',
    ]);

    $response = $this->actingAs($user)->postJson('/api/exports/questionnaires/TEST-Q', [
        'format' => 'csv',
        'filters' => [
            'status' => 'approved',
        ],
    ]);

    $response->assertStatus(201)
        ->assertJsonStructure([
            'message',
            'data' => [
                'id',
                'status',
                'format',
                'questionnaire_code',
                'created_at',
            ],
        ]);

    expect($response->json('data.status'))->toBe('pending');
    expect($response->json('data.format'))->toBe('csv');
    expect($response->json('data.questionnaire_code'))->toBe('TEST-Q');

    $this->assertDatabaseHas('export_jobs', [
        'user_id' => $user->id,
        'questionnaire_code' => 'TEST-Q',
        'format' => 'csv',
        'status' => 'pending',
    ]);
});

test('create export validates required fields', function () {
    $user = User::factory()->create();
    $user->assignRole('enumerator');

    $response = $this->actingAs($user)->postJson('/api/exports/questionnaires/TEST-Q', []);

    $response->assertStatus(422)
        ->assertJsonValidationErrors(['format']);
});

test('create export validates format values', function () {
    $user = User::factory()->create();
    $user->assignRole('enumerator');

    $response = $this->actingAs($user)->postJson('/api/exports/questionnaires/TEST-Q', [
        'format' => 'invalid',
    ]);

    $response->assertStatus(422)
        ->assertJsonValidationErrors(['format']);
});

test('user can view their own export job', function () {
    $user = User::factory()->create();
    $user->assignRole('enumerator');

    $exportJob = ExportJob::create([
        'user_id' => $user->id,
        'questionnaire_code' => 'TEST-Q',
        'format' => 'csv',
        'status' => 'completed',
        'filters' => [],
        'file_path' => 'exports/test.csv',
        'file_size' => 1024,
    ]);

    $response = $this->actingAs($user)->getJson("/api/exports/{$exportJob->id}");

    $response->assertStatus(200)
        ->assertJson([
            'data' => [
                'id' => $exportJob->id,
                'questionnaire_code' => 'TEST-Q',
                'format' => 'csv',
                'status' => 'completed',
            ],
        ]);
});

test('user cannot view other users export job', function () {
    $user1 = User::factory()->create();
    $user1->assignRole('enumerator');

    $user2 = User::factory()->create();
    $user2->assignRole('enumerator');

    $exportJob = ExportJob::create([
        'user_id' => $user1->id,
        'questionnaire_code' => 'TEST-Q',
        'format' => 'csv',
        'status' => 'completed',
        'filters' => [],
    ]);

    $response = $this->actingAs($user2)->getJson("/api/exports/{$exportJob->id}");

    $response->assertStatus(403);
});

test('admin can view any export job', function () {
    $admin = User::factory()->create();
    $admin->assignRole('admin');

    $user = User::factory()->create();
    $user->assignRole('enumerator');

    $exportJob = ExportJob::create([
        'user_id' => $user->id,
        'questionnaire_code' => 'TEST-Q',
        'format' => 'csv',
        'status' => 'completed',
        'filters' => [],
    ]);

    $response = $this->actingAs($admin)->getJson("/api/exports/{$exportJob->id}");

    $response->assertStatus(200);
});

test('user can list their own export jobs', function () {
    $user = User::factory()->create();
    $user->assignRole('enumerator');

    $otherUser = User::factory()->create();
    $otherUser->assignRole('enumerator');

    ExportJob::create([
        'user_id' => $user->id,
        'questionnaire_code' => 'TEST-Q1',
        'format' => 'csv',
        'status' => 'completed',
        'filters' => [],
    ]);

    ExportJob::create([
        'user_id' => $user->id,
        'questionnaire_code' => 'TEST-Q2',
        'format' => 'xlsx',
        'status' => 'pending',
        'filters' => [],
    ]);

    ExportJob::create([
        'user_id' => $otherUser->id,
        'questionnaire_code' => 'TEST-Q3',
        'format' => 'csv',
        'status' => 'completed',
        'filters' => [],
    ]);

    $response = $this->actingAs($user)->getJson('/api/exports');

    $response->assertStatus(200);

    // User should only see their own exports (2)
    expect(count($response->json('data')))->toBe(2);
});

test('export download requires completed status', function () {
    $user = User::factory()->create();
    $user->assignRole('enumerator');

    $exportJob = ExportJob::create([
        'user_id' => $user->id,
        'questionnaire_code' => 'TEST-Q',
        'format' => 'csv',
        'status' => 'pending',
        'filters' => [],
    ]);

    $response = $this->actingAs($user)->get("/api/exports/{$exportJob->id}/download");

    $response->assertStatus(400);
});

test('export download requires non-expired file', function () {
    $user = User::factory()->create();
    $user->assignRole('enumerator');

    $exportJob = ExportJob::create([
        'user_id' => $user->id,
        'questionnaire_code' => 'TEST-Q',
        'format' => 'csv',
        'status' => 'completed',
        'filters' => [],
        'file_path' => 'exports/test.csv',
        'expires_at' => now()->subHour(),
    ]);

    $response = $this->actingAs($user)->get("/api/exports/{$exportJob->id}/download");

    $response->assertStatus(410);
});

test('user can delete their own export job', function () {
    $user = User::factory()->create();
    $user->assignRole('enumerator');

    $exportJob = ExportJob::create([
        'user_id' => $user->id,
        'questionnaire_code' => 'TEST-Q',
        'format' => 'csv',
        'status' => 'completed',
        'filters' => [],
        'file_path' => 'exports/test.csv',
    ]);

    Storage::disk('local')->put($exportJob->file_path, 'test content');

    $response = $this->actingAs($user)->deleteJson("/api/exports/{$exportJob->id}");

    $response->assertStatus(200);

    $this->assertDatabaseMissing('export_jobs', [
        'id' => $exportJob->id,
    ]);

    // File should also be deleted
    Storage::disk('local')->assertMissing($exportJob->file_path);
});

test('user cannot delete other users export job', function () {
    $user1 = User::factory()->create();
    $user1->assignRole('enumerator');

    $user2 = User::factory()->create();
    $user2->assignRole('enumerator');

    $exportJob = ExportJob::create([
        'user_id' => $user1->id,
        'questionnaire_code' => 'TEST-Q',
        'format' => 'csv',
        'status' => 'completed',
        'filters' => [],
    ]);

    $response = $this->actingAs($user2)->deleteJson("/api/exports/{$exportJob->id}");

    $response->assertStatus(403);
});

test('export creation requires authentication', function () {
    $response = $this->postJson('/api/exports/questionnaires/TEST-Q', [
        'format' => 'csv',
    ]);

    $response->assertStatus(401);
});

test('can filter exports by status', function () {
    $user = User::factory()->create();
    $user->assignRole('enumerator');

    ExportJob::create([
        'user_id' => $user->id,
        'questionnaire_code' => 'TEST-Q',
        'format' => 'csv',
        'status' => 'completed',
        'filters' => [],
    ]);

    ExportJob::create([
        'user_id' => $user->id,
        'questionnaire_code' => 'TEST-Q',
        'format' => 'csv',
        'status' => 'failed',
        'filters' => [],
    ]);

    $response = $this->actingAs($user)->getJson('/api/exports?status=completed');

    $response->assertStatus(200);
    expect(count($response->json('data')))->toBe(1);
    expect($response->json('data.0.status'))->toBe('completed');
});

test('can filter exports by questionnaire code', function () {
    $user = User::factory()->create();
    $user->assignRole('enumerator');

    ExportJob::create([
        'user_id' => $user->id,
        'questionnaire_code' => 'TEST-Q1',
        'format' => 'csv',
        'status' => 'completed',
        'filters' => [],
    ]);

    ExportJob::create([
        'user_id' => $user->id,
        'questionnaire_code' => 'TEST-Q2',
        'format' => 'csv',
        'status' => 'completed',
        'filters' => [],
    ]);

    $response = $this->actingAs($user)->getJson('/api/exports?questionnaire_code=TEST-Q1');

    $response->assertStatus(200);
    expect(count($response->json('data')))->toBe(1);
    expect($response->json('data.0.questionnaire_code'))->toBe('TEST-Q1');
});
