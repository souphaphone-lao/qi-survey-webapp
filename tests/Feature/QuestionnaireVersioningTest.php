<?php

use App\Models\Questionnaire;
use App\Models\User;
use App\Services\QuestionnaireVersionService;
use Database\Seeders\RoleAndPermissionSeeder;

beforeEach(function () {
    $this->seed(RoleAndPermissionSeeder::class);
});

test('can duplicate questionnaire as new version', function () {
    $admin = User::factory()->create();
    $admin->assignRole('admin');

    $questionnaire = Questionnaire::factory()->create([
        'code' => 'TEST',
        'version' => 1,
        'title' => 'Test Questionnaire',
    ]);

    $response = $this->actingAs($admin)->postJson("/api/questionnaires/{$questionnaire->id}/duplicate", [
        'version_notes' => 'Added new questions',
        'breaking_changes' => false,
    ]);

    $response->assertStatus(201);
    $response->assertJsonPath('data.code', 'TEST');
    $response->assertJsonPath('data.version', 2);
    $response->assertJsonPath('data.parent_version_id', $questionnaire->id);
    $response->assertJsonPath('data.version_notes', 'Added new questions');
    $response->assertJsonPath('data.breaking_changes', false);
});

test('duplicate increments version number correctly', function () {
    $admin = User::factory()->create();
    $admin->assignRole('admin');

    $q1 = Questionnaire::factory()->create(['code' => 'TEST', 'version' => 1]);
    $q2 = Questionnaire::factory()->create(['code' => 'TEST', 'version' => 2]);

    $response = $this->actingAs($admin)->postJson("/api/questionnaires/{$q2->id}/duplicate");

    $response->assertStatus(201);
    $response->assertJsonPath('data.version', 3);
});

test('duplicate copies surveyjs_json', function () {
    $admin = User::factory()->create();
    $admin->assignRole('admin');

    $questionnaire = Questionnaire::factory()->create([
        'code' => 'TEST',
        'version' => 1,
        'surveyjs_json' => ['pages' => [['elements' => [['name' => 'q1']]]]],
    ]);

    $response = $this->actingAs($admin)->postJson("/api/questionnaires/{$questionnaire->id}/duplicate");

    $response->assertStatus(201);
    $newQuestionnaire = Questionnaire::find($response->json('data.id'));
    expect($newQuestionnaire->surveyjs_json)->toBe($questionnaire->surveyjs_json);
});

test('duplicate sets parent_version_id', function () {
    $admin = User::factory()->create();
    $admin->assignRole('admin');

    $original = Questionnaire::factory()->create(['code' => 'TEST', 'version' => 1]);

    $response = $this->actingAs($admin)->postJson("/api/questionnaires/{$original->id}/duplicate");

    $response->assertStatus(201);
    $response->assertJsonPath('data.parent_version_id', $original->id);
});

test('activate version makes it active and deactivates others', function () {
    $admin = User::factory()->create();
    $admin->assignRole('admin');

    $v1 = Questionnaire::factory()->create(['code' => 'TEST', 'version' => 1, 'is_active' => true]);
    $v2 = Questionnaire::factory()->create(['code' => 'TEST', 'version' => 2, 'is_active' => false]);

    $response = $this->actingAs($admin)->postJson("/api/questionnaires/{$v2->id}/activate");

    $response->assertStatus(200);
    $response->assertJsonPath('data.is_active', true);

    $v1->refresh();
    expect($v1->is_active)->toBe(false);
    expect($v1->deprecated_at)->not->toBeNull();
});

test('activate version sets published_at timestamp', function () {
    $admin = User::factory()->create();
    $admin->assignRole('admin');

    $questionnaire = Questionnaire::factory()->create(['is_active' => false]);

    $response = $this->actingAs($admin)->postJson("/api/questionnaires/{$questionnaire->id}/activate");

    $response->assertStatus(200);
    $questionnaire->refresh();
    expect($questionnaire->published_at)->not->toBeNull();
});

test('deprecate version sets deprecated_at and makes it inactive', function () {
    $admin = User::factory()->create();
    $admin->assignRole('admin');

    $questionnaire = Questionnaire::factory()->create(['is_active' => true]);

    $response = $this->actingAs($admin)->postJson("/api/questionnaires/{$questionnaire->id}/deactivate");

    $response->assertStatus(200);
    $questionnaire->refresh();
    expect($questionnaire->is_active)->toBe(false);
    expect($questionnaire->deprecated_at)->not->toBeNull();
});

test('can list all versions of questionnaire', function () {
    $admin = User::factory()->create();
    $admin->assignRole('admin');

    $v1 = Questionnaire::factory()->create(['code' => 'TEST', 'version' => 1]);
    $v2 = Questionnaire::factory()->create(['code' => 'TEST', 'version' => 2]);
    $v3 = Questionnaire::factory()->create(['code' => 'TEST', 'version' => 3]);
    Questionnaire::factory()->create(['code' => 'OTHER', 'version' => 1]); // Different code

    $response = $this->actingAs($admin)->getJson("/api/questionnaires/{$v1->id}/versions");

    $response->assertStatus(200);
    $response->assertJsonPath('code', 'TEST');
    $response->assertJsonCount(3, 'versions');
});

test('can compare two questionnaire versions', function () {
    $admin = User::factory()->create();
    $admin->assignRole('admin');

    $v1 = Questionnaire::factory()->create([
        'code' => 'TEST',
        'version' => 1,
        'title' => 'Version 1',
        'surveyjs_json' => ['pages' => [['elements' => [['name' => 'q1'], ['name' => 'q2']]]]],
    ]);

    $v2 = Questionnaire::factory()->create([
        'code' => 'TEST',
        'version' => 2,
        'title' => 'Version 2',
        'surveyjs_json' => ['pages' => [['elements' => [['name' => 'q1'], ['name' => 'q3']]]]],
    ]);

    $response = $this->actingAs($admin)->postJson("/api/questionnaires/{$v1->id}/compare", [
        'other_id' => $v2->id,
    ]);

    $response->assertStatus(200);
    $response->assertJsonPath('version1.id', $v1->id);
    $response->assertJsonPath('version2.id', $v2->id);
    $response->assertJsonStructure([
        'version1',
        'version2',
        'differences' => [
            'added_questions',
            'removed_questions',
            'common_questions',
            'title_changed',
            'description_changed',
        ],
    ]);
});

test('cannot compare questionnaires with different codes', function () {
    $admin = User::factory()->create();
    $admin->assignRole('admin');

    $q1 = Questionnaire::factory()->create(['code' => 'TEST1']);
    $q2 = Questionnaire::factory()->create(['code' => 'TEST2']);

    $response = $this->actingAs($admin)->postJson("/api/questionnaires/{$q1->id}/compare", [
        'other_id' => $q2->id,
    ]);

    $response->assertStatus(422);
    $response->assertJsonPath('message', 'Can only compare questionnaires with the same code');
});

test('cannot delete questionnaire version with submissions', function () {
    $admin = User::factory()->create();
    $admin->assignRole('admin');

    $questionnaire = Questionnaire::factory()->hasSubmissions(1)->create();

    $response = $this->actingAs($admin)->deleteJson("/api/questionnaires/{$questionnaire->id}");

    $response->assertStatus(422);
    $response->assertJsonPath('message', 'Cannot delete questionnaire with existing submissions');
});

test('version service calculates differences correctly', function () {
    $v1 = Questionnaire::factory()->create([
        'code' => 'TEST',
        'version' => 1,
        'title' => 'Version 1',
        'description' => 'First version',
        'surveyjs_json' => ['pages' => [['elements' => [['name' => 'q1'], ['name' => 'q2']]]]],
    ]);

    $v2 = Questionnaire::factory()->create([
        'code' => 'TEST',
        'version' => 2,
        'title' => 'Version 2',
        'description' => 'Second version',
        'surveyjs_json' => ['pages' => [['elements' => [['name' => 'q1'], ['name' => 'q3']]]]],
    ]);

    $service = new QuestionnaireVersionService();
    $comparison = $service->compareVersions($v1, $v2);

    expect($comparison['differences']['added_questions'])->toContain('q3');
    expect($comparison['differences']['removed_questions'])->toContain('q2');
    expect($comparison['differences']['common_questions'])->toContain('q1');
    expect($comparison['differences']['title_changed'])->toBe(true);
    expect($comparison['differences']['description_changed'])->toBe(true);
});

test('only admins can duplicate questionnaires', function () {
    $enumerator = User::factory()->create();
    $enumerator->assignRole('enumerator');

    $questionnaire = Questionnaire::factory()->create();

    $response = $this->actingAs($enumerator)->postJson("/api/questionnaires/{$questionnaire->id}/duplicate");

    $response->assertStatus(403);
});

test('only admins can activate questionnaires', function () {
    $enumerator = User::factory()->create();
    $enumerator->assignRole('enumerator');

    $questionnaire = Questionnaire::factory()->create();

    $response = $this->actingAs($enumerator)->postJson("/api/questionnaires/{$questionnaire->id}/activate");

    $response->assertStatus(403);
});

test('only admins can deactivate questionnaires', function () {
    $enumerator = User::factory()->create();
    $enumerator->assignRole('enumerator');

    $questionnaire = Questionnaire::factory()->create();

    $response = $this->actingAs($enumerator)->postJson("/api/questionnaires/{$questionnaire->id}/deactivate");

    $response->assertStatus(403);
});
