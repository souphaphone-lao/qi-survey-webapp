<?php

use App\Models\Department;
use App\Models\Institution;
use App\Models\QuestionPermission;
use App\Models\Questionnaire;
use App\Models\Submission;
use App\Models\User;
use Database\Seeders\RoleAndPermissionSeeder;

beforeEach(function () {
    $this->seed(RoleAndPermissionSeeder::class);
});

test('admin can edit all questions regardless of permissions', function () {
    $admin = User::factory()->create();
    $admin->assignRole('admin');

    $institution = Institution::factory()->create();
    $questionnaire = Questionnaire::factory()->create();
    $submission = Submission::factory()->create([
        'questionnaire_id' => $questionnaire->id,
        'institution_id' => $institution->id,
        'status' => 'draft',
        'created_by' => $admin->id,
    ]);

    $response = $this->actingAs($admin)->putJson("/api/submissions/{$submission->id}", [
        'answers_json' => [
            'question1' => 'answer1',
            'question2' => 'answer2',
        ],
    ]);

    $response->assertStatus(200);
});

test('enumerator can only edit permitted questions', function () {
    $institution = Institution::factory()->create();
    $department = Department::factory()->create(['institution_id' => $institution->id]);

    $enumerator = User::factory()->create([
        'institution_id' => $institution->id,
        'department_id' => $department->id,
    ]);
    $enumerator->assignRole('enumerator');

    $questionnaire = Questionnaire::factory()->create();

    // Grant permission for question1 only
    QuestionPermission::factory()->create([
        'questionnaire_id' => $questionnaire->id,
        'question_name' => 'question1',
        'institution_id' => $institution->id,
        'department_id' => $department->id,
        'permission_type' => 'edit',
    ]);

    $submission = Submission::factory()->create([
        'questionnaire_id' => $questionnaire->id,
        'institution_id' => $institution->id,
        'status' => 'draft',
        'created_by' => $enumerator->id,
    ]);

    // Try to edit both question1 (allowed) and question2 (not allowed)
    $response = $this->actingAs($enumerator)->putJson("/api/submissions/{$submission->id}", [
        'answers_json' => [
            'question1' => 'answer1',
            'question2' => 'answer2',
        ],
    ]);

    $response->assertStatus(403)
        ->assertJsonFragment(['message' => 'You do not have permission to edit these questions'])
        ->assertJsonFragment(['invalid_questions' => ['question2']]);
});

test('enumerator can edit only permitted questions', function () {
    $institution = Institution::factory()->create();
    $department = Department::factory()->create(['institution_id' => $institution->id]);

    $enumerator = User::factory()->create([
        'institution_id' => $institution->id,
        'department_id' => $department->id,
    ]);
    $enumerator->assignRole('enumerator');

    $questionnaire = Questionnaire::factory()->create();

    // Grant permission for question1
    QuestionPermission::factory()->create([
        'questionnaire_id' => $questionnaire->id,
        'question_name' => 'question1',
        'institution_id' => $institution->id,
        'department_id' => $department->id,
        'permission_type' => 'edit',
    ]);

    $submission = Submission::factory()->create([
        'questionnaire_id' => $questionnaire->id,
        'institution_id' => $institution->id,
        'status' => 'draft',
        'created_by' => $enumerator->id,
    ]);

    // Edit only permitted question
    $response = $this->actingAs($enumerator)->putJson("/api/submissions/{$submission->id}", [
        'answers_json' => [
            'question1' => 'answer1',
        ],
    ]);

    $response->assertStatus(200);
});

test('permission map returned with submission for authenticated user', function () {
    $institution = Institution::factory()->create();
    $department = Department::factory()->create(['institution_id' => $institution->id]);

    $enumerator = User::factory()->create([
        'institution_id' => $institution->id,
        'department_id' => $department->id,
    ]);
    $enumerator->assignRole('enumerator');

    $questionnaire = Questionnaire::factory()->create();

    QuestionPermission::factory()->create([
        'questionnaire_id' => $questionnaire->id,
        'question_name' => 'question1',
        'institution_id' => $institution->id,
        'department_id' => $department->id,
        'permission_type' => 'edit',
    ]);

    $submission = Submission::factory()->create([
        'questionnaire_id' => $questionnaire->id,
        'institution_id' => $institution->id,
        'created_by' => $enumerator->id,
    ]);

    $response = $this->actingAs($enumerator)->getJson("/api/submissions/{$submission->id}");

    $response->assertStatus(200)
        ->assertJsonStructure(['data' => ['question_permissions']])
        ->assertJsonFragment(['question_permissions' => ['question1' => true]]);
});

test('user from different department cannot edit restricted questions', function () {
    $institution = Institution::factory()->create();
    $department1 = Department::factory()->create(['institution_id' => $institution->id, 'code' => 'DEPT1']);
    $department2 = Department::factory()->create(['institution_id' => $institution->id, 'code' => 'DEPT2']);

    // User from department1
    $user1 = User::factory()->create([
        'institution_id' => $institution->id,
        'department_id' => $department1->id,
    ]);
    $user1->assignRole('enumerator');

    $questionnaire = Questionnaire::factory()->create();

    // Permission granted to department2 only
    QuestionPermission::factory()->create([
        'questionnaire_id' => $questionnaire->id,
        'question_name' => 'question_for_dept2',
        'institution_id' => $institution->id,
        'department_id' => $department2->id,
        'permission_type' => 'edit',
    ]);

    $submission = Submission::factory()->create([
        'questionnaire_id' => $questionnaire->id,
        'institution_id' => $institution->id,
        'status' => 'draft',
        'created_by' => $user1->id,
    ]);

    $response = $this->actingAs($user1)->putJson("/api/submissions/{$submission->id}", [
        'answers_json' => [
            'question_for_dept2' => 'answer',
        ],
    ]);

    $response->assertStatus(403)
        ->assertJsonFragment(['invalid_questions' => ['question_for_dept2']]);
});

test('multiple departments can have different question permissions', function () {
    $institution = Institution::factory()->create();
    $taxDept = Department::factory()->create(['institution_id' => $institution->id, 'code' => 'TAX']);
    $assetDept = Department::factory()->create(['institution_id' => $institution->id, 'code' => 'ASSET']);

    $taxUser = User::factory()->create([
        'institution_id' => $institution->id,
        'department_id' => $taxDept->id,
    ]);
    $taxUser->assignRole('enumerator');

    $assetUser = User::factory()->create([
        'institution_id' => $institution->id,
        'department_id' => $assetDept->id,
    ]);
    $assetUser->assignRole('enumerator');

    $questionnaire = Questionnaire::factory()->create();

    // Tax department can edit question15
    QuestionPermission::factory()->create([
        'questionnaire_id' => $questionnaire->id,
        'question_name' => 'question15',
        'institution_id' => $institution->id,
        'department_id' => $taxDept->id,
        'permission_type' => 'edit',
    ]);

    // Asset department can edit question16-17
    QuestionPermission::factory()->create([
        'questionnaire_id' => $questionnaire->id,
        'question_name' => 'question16',
        'institution_id' => $institution->id,
        'department_id' => $assetDept->id,
        'permission_type' => 'edit',
    ]);

    $submission = Submission::factory()->create([
        'questionnaire_id' => $questionnaire->id,
        'institution_id' => $institution->id,
        'status' => 'draft',
        'created_by' => $taxUser->id,
    ]);

    // Tax user can edit question15
    $response = $this->actingAs($taxUser)->putJson("/api/submissions/{$submission->id}", [
        'answers_json' => ['question15' => 'tax answer'],
    ]);
    $response->assertStatus(200);

    // Tax user cannot edit question16
    $response = $this->actingAs($taxUser)->putJson("/api/submissions/{$submission->id}", [
        'answers_json' => ['question16' => 'asset answer'],
    ]);
    $response->assertStatus(403);

    // Asset user can edit question16
    $submission2 = Submission::factory()->create([
        'questionnaire_id' => $questionnaire->id,
        'institution_id' => $institution->id,
        'status' => 'draft',
        'created_by' => $assetUser->id,
    ]);

    $response = $this->actingAs($assetUser)->putJson("/api/submissions/{$submission2->id}", [
        'answers_json' => ['question16' => 'asset answer'],
    ]);
    $response->assertStatus(200);
});

test('submitted and approved submissions cannot be edited even with permissions', function () {
    $institution = Institution::factory()->create();
    $department = Department::factory()->create(['institution_id' => $institution->id]);

    $enumerator = User::factory()->create([
        'institution_id' => $institution->id,
        'department_id' => $department->id,
    ]);
    $enumerator->assignRole('enumerator');

    $questionnaire = Questionnaire::factory()->create();

    QuestionPermission::factory()->create([
        'questionnaire_id' => $questionnaire->id,
        'question_name' => 'question1',
        'institution_id' => $institution->id,
        'department_id' => $department->id,
        'permission_type' => 'edit',
    ]);

    $submission = Submission::factory()->create([
        'questionnaire_id' => $questionnaire->id,
        'institution_id' => $institution->id,
        'status' => 'submitted',
        'created_by' => $enumerator->id,
    ]);

    $response = $this->actingAs($enumerator)->putJson("/api/submissions/{$submission->id}", [
        'answers_json' => ['question1' => 'answer'],
    ]);

    $response->assertStatus(422)
        ->assertJsonFragment(['message' => 'Cannot edit a submission that has been submitted or approved']);
});
