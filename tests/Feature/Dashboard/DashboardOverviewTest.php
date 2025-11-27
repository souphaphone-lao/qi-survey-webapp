<?php

use App\Models\User;
use App\Models\Institution;
use App\Models\Questionnaire;
use App\Models\Submission;
use Database\Seeders\RoleAndPermissionSeeder;

beforeEach(function () {
    $this->seed(RoleAndPermissionSeeder::class);
});

test('dashboard overview returns summary statistics', function () {
    $admin = User::factory()->create();
    $admin->assignRole('admin');

    $institution = Institution::factory()->create();
    $questionnaire = Questionnaire::factory()->create();

    // Create submissions with different statuses
    Submission::factory()->create([
        'questionnaire_id' => $questionnaire->id,
        'institution_id' => $institution->id,
        'status' => 'draft',
        'created_by' => $admin->id,
    ]);
    Submission::factory()->create([
        'questionnaire_id' => $questionnaire->id,
        'institution_id' => $institution->id,
        'status' => 'submitted',
        'created_by' => $admin->id,
    ]);
    Submission::factory()->create([
        'questionnaire_id' => $questionnaire->id,
        'institution_id' => $institution->id,
        'status' => 'approved',
        'created_by' => $admin->id,
    ]);

    $response = $this->actingAs($admin)->getJson('/api/dashboard/overview');

    $response->assertStatus(200)
        ->assertJsonStructure([
            'data' => [
                'summary' => [
                    'total_submissions',
                    'draft',
                    'submitted',
                    'approved',
                    'rejected',
                ],
                'trends',
                'status_distribution',
            ],
        ]);

    $data = $response->json('data.summary');
    expect($data['total_submissions'])->toBe(3);
    expect($data['draft'])->toBe(1);
    expect($data['submitted'])->toBe(1);
    expect($data['approved'])->toBe(1);
});

test('dashboard overview filters by institution', function () {
    $admin = User::factory()->create();
    $admin->assignRole('admin');

    $institution1 = Institution::factory()->create();
    $institution2 = Institution::factory()->create();
    $questionnaire = Questionnaire::factory()->create();

    // Create submissions for different institutions
    Submission::factory()->count(2)->create([
        'questionnaire_id' => $questionnaire->id,
        'institution_id' => $institution1->id,
        'created_by' => $admin->id,
    ]);
    Submission::factory()->create([
        'questionnaire_id' => $questionnaire->id,
        'institution_id' => $institution2->id,
        'created_by' => $admin->id,
    ]);

    $response = $this->actingAs($admin)->getJson('/api/dashboard/overview?institution_id=' . $institution1->id);

    $response->assertStatus(200);
    $data = $response->json('data.summary');
    expect($data['total_submissions'])->toBe(2);
});

test('dashboard overview filters by date range', function () {
    $admin = User::factory()->create();
    $admin->assignRole('admin');

    $institution = Institution::factory()->create();
    $questionnaire = Questionnaire::factory()->create();

    // Create submission in the past
    Submission::factory()->create([
        'questionnaire_id' => $questionnaire->id,
        'institution_id' => $institution->id,
        'created_by' => $admin->id,
        'created_at' => now()->subDays(10),
    ]);

    // Create submission in the range
    Submission::factory()->create([
        'questionnaire_id' => $questionnaire->id,
        'institution_id' => $institution->id,
        'created_by' => $admin->id,
        'created_at' => now()->subDays(3),
    ]);

    $dateFrom = now()->subDays(5)->toDateString();

    $response = $this->actingAs($admin)->getJson('/api/dashboard/overview?date_from=' . $dateFrom);

    $response->assertStatus(200);
    $data = $response->json('data.summary');
    expect($data['total_submissions'])->toBe(1);
});

test('dashboard overview filters by questionnaire code', function () {
    $admin = User::factory()->create();
    $admin->assignRole('admin');

    $institution = Institution::factory()->create();
    $questionnaire1 = Questionnaire::factory()->create(['code' => 'QA']);
    $questionnaire2 = Questionnaire::factory()->create(['code' => 'QB']);

    Submission::factory()->count(2)->create([
        'questionnaire_id' => $questionnaire1->id,
        'institution_id' => $institution->id,
        'created_by' => $admin->id,
    ]);
    Submission::factory()->create([
        'questionnaire_id' => $questionnaire2->id,
        'institution_id' => $institution->id,
        'created_by' => $admin->id,
    ]);

    $response = $this->actingAs($admin)->getJson('/api/dashboard/overview?questionnaire_code=QA');

    $response->assertStatus(200);
    $data = $response->json('data.summary');
    expect($data['total_submissions'])->toBe(2);
});

test('dashboard overview requires authentication', function () {
    $response = $this->getJson('/api/dashboard/overview');

    $response->assertStatus(401);
});

test('dashboard trends returns time series data', function () {
    $admin = User::factory()->create();
    $admin->assignRole('admin');

    $institution = Institution::factory()->create();
    $questionnaire = Questionnaire::factory()->create();

    // Create submissions on different days
    Submission::factory()->create([
        'questionnaire_id' => $questionnaire->id,
        'institution_id' => $institution->id,
        'created_by' => $admin->id,
        'created_at' => now()->subDays(2),
    ]);
    Submission::factory()->create([
        'questionnaire_id' => $questionnaire->id,
        'institution_id' => $institution->id,
        'created_by' => $admin->id,
        'created_at' => now()->subDay(),
    ]);

    $dateFrom = now()->subDays(3)->toDateString();
    $dateTo = now()->toDateString();

    $response = $this->actingAs($admin)->getJson(
        "/api/dashboard/trends?period=daily&date_from={$dateFrom}&date_to={$dateTo}"
    );

    $response->assertStatus(200)
        ->assertJsonStructure([
            'data' => [
                '*' => [
                    'date',
                    'draft',
                    'submitted',
                    'approved',
                    'rejected',
                    'total',
                ],
            ],
        ]);
});

test('dashboard trends validates required parameters', function () {
    $admin = User::factory()->create();
    $admin->assignRole('admin');

    $response = $this->actingAs($admin)->getJson('/api/dashboard/trends');

    $response->assertStatus(422)
        ->assertJsonValidationErrors(['period', 'date_from', 'date_to']);
});

test('dashboard institution breakdown returns institution statistics', function () {
    $admin = User::factory()->create();
    $admin->assignRole('admin');

    $institution1 = Institution::factory()->create(['name' => 'Institution A']);
    $institution2 = Institution::factory()->create(['name' => 'Institution B']);
    $questionnaire = Questionnaire::factory()->create();

    Submission::factory()->count(3)->create([
        'questionnaire_id' => $questionnaire->id,
        'institution_id' => $institution1->id,
        'created_by' => $admin->id,
    ]);
    Submission::factory()->count(2)->create([
        'questionnaire_id' => $questionnaire->id,
        'institution_id' => $institution2->id,
        'created_by' => $admin->id,
    ]);

    $response = $this->actingAs($admin)->getJson('/api/dashboard/institutions');

    $response->assertStatus(200)
        ->assertJsonStructure([
            'data' => [
                '*' => [
                    'id',
                    'name',
                    'code',
                    'level',
                    'total_submissions',
                    'draft',
                    'submitted',
                    'approved',
                    'rejected',
                ],
            ],
        ]);

    expect(count($response->json('data')))->toBeGreaterThanOrEqual(2);
});

test('dashboard questionnaire stats returns questionnaire-specific data', function () {
    $admin = User::factory()->create();
    $admin->assignRole('admin');

    $institution = Institution::factory()->create();
    $questionnaire = Questionnaire::factory()->create(['code' => 'TEST-Q']);

    Submission::factory()->count(5)->create([
        'questionnaire_id' => $questionnaire->id,
        'institution_id' => $institution->id,
        'created_by' => $admin->id,
    ]);

    $response = $this->actingAs($admin)->getJson('/api/dashboard/questionnaire/TEST-Q');

    $response->assertStatus(200)
        ->assertJsonStructure([
            'data' => [
                'summary' => [
                    'total_submissions',
                    'draft',
                    'submitted',
                    'approved',
                    'rejected',
                ],
                'version_breakdown',
            ],
        ]);

    expect($response->json('data.summary.total_submissions'))->toBe(5);
});
