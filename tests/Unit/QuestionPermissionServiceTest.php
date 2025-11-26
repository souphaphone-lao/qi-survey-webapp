<?php

use App\Models\Department;
use App\Models\Institution;
use App\Models\QuestionPermission;
use App\Models\Questionnaire;
use App\Models\Submission;
use App\Models\User;
use App\Services\QuestionPermissionService;
use Database\Seeders\RoleAndPermissionSeeder;

beforeEach(function () {
    $this->seed(RoleAndPermissionSeeder::class);
    $this->service = new QuestionPermissionService;
});

test('getEditableQuestions returns correct list for user', function () {
    $institution = Institution::factory()->create();
    $department = Department::factory()->create(['institution_id' => $institution->id]);

    $user = User::factory()->create([
        'institution_id' => $institution->id,
        'department_id' => $department->id,
    ]);
    $user->assignRole('enumerator');

    $questionnaire = Questionnaire::factory()->create();
    $submission = Submission::factory()->create(['questionnaire_id' => $questionnaire->id]);

    QuestionPermission::factory()->create([
        'questionnaire_id' => $questionnaire->id,
        'question_name' => 'question1',
        'institution_id' => $institution->id,
        'department_id' => $department->id,
        'permission_type' => 'edit',
    ]);

    QuestionPermission::factory()->create([
        'questionnaire_id' => $questionnaire->id,
        'question_name' => 'question2',
        'institution_id' => $institution->id,
        'department_id' => $department->id,
        'permission_type' => 'edit',
    ]);

    $questions = $this->service->getEditableQuestions($user, $submission);

    expect($questions)->toBeArray()
        ->and($questions)->toContain('question1', 'question2')
        ->and($questions)->toHaveCount(2);
});

test('admin bypasses permission checks and gets all questions', function () {
    $admin = User::factory()->create();
    $admin->assignRole('admin');

    $questionnaire = Questionnaire::factory()->create();
    $submission = Submission::factory()->create(['questionnaire_id' => $questionnaire->id]);

    // No permissions created, but admin should still get all questions from schema
    $questions = $this->service->getEditableQuestions($admin, $submission);

    expect($questions)->toBeArray()->and($questions)->toContain('question1'); // Admin gets all from schema
});

test('canEditQuestion returns true for permitted question', function () {
    $institution = Institution::factory()->create();
    $department = Department::factory()->create(['institution_id' => $institution->id]);

    $user = User::factory()->create([
        'institution_id' => $institution->id,
        'department_id' => $department->id,
    ]);
    $user->assignRole('enumerator');

    $questionnaire = Questionnaire::factory()->create();
    $submission = Submission::factory()->create(['questionnaire_id' => $questionnaire->id]);

    QuestionPermission::factory()->create([
        'questionnaire_id' => $questionnaire->id,
        'question_name' => 'question1',
        'institution_id' => $institution->id,
        'department_id' => $department->id,
        'permission_type' => 'edit',
    ]);

    $canEdit = $this->service->canEditQuestion($user, $submission, 'question1');

    expect($canEdit)->toBeTrue();
});

test('canEditQuestion returns false for non-permitted question', function () {
    $institution = Institution::factory()->create();
    $department = Department::factory()->create(['institution_id' => $institution->id]);

    $user = User::factory()->create([
        'institution_id' => $institution->id,
        'department_id' => $department->id,
    ]);
    $user->assignRole('enumerator');

    $questionnaire = Questionnaire::factory()->create();
    $submission = Submission::factory()->create(['questionnaire_id' => $questionnaire->id]);

    $canEdit = $this->service->canEditQuestion($user, $submission, 'question_not_permitted');

    expect($canEdit)->toBeFalse();
});

test('admin can always edit any question', function () {
    $admin = User::factory()->create();
    $admin->assignRole('admin');

    $questionnaire = Questionnaire::factory()->create();
    $submission = Submission::factory()->create(['questionnaire_id' => $questionnaire->id]);

    $canEdit = $this->service->canEditQuestion($admin, $submission, 'any_question');

    expect($canEdit)->toBeTrue();
});

test('validateAnswers returns empty array for valid answers', function () {
    $institution = Institution::factory()->create();
    $department = Department::factory()->create(['institution_id' => $institution->id]);

    $user = User::factory()->create([
        'institution_id' => $institution->id,
        'department_id' => $department->id,
    ]);
    $user->assignRole('enumerator');

    $questionnaire = Questionnaire::factory()->create();
    $submission = Submission::factory()->create(['questionnaire_id' => $questionnaire->id]);

    QuestionPermission::factory()->create([
        'questionnaire_id' => $questionnaire->id,
        'question_name' => 'question1',
        'institution_id' => $institution->id,
        'department_id' => $department->id,
        'permission_type' => 'edit',
    ]);

    $invalidQuestions = $this->service->validateAnswers($user, $submission, [
        'question1' => 'answer1',
    ]);

    expect($invalidQuestions)->toBeEmpty();
});

test('validateAnswers returns invalid questions', function () {
    $institution = Institution::factory()->create();
    $department = Department::factory()->create(['institution_id' => $institution->id]);

    $user = User::factory()->create([
        'institution_id' => $institution->id,
        'department_id' => $department->id,
    ]);
    $user->assignRole('enumerator');

    $questionnaire = Questionnaire::factory()->create();
    $submission = Submission::factory()->create(['questionnaire_id' => $questionnaire->id]);

    QuestionPermission::factory()->create([
        'questionnaire_id' => $questionnaire->id,
        'question_name' => 'question1',
        'institution_id' => $institution->id,
        'department_id' => $department->id,
        'permission_type' => 'edit',
    ]);

    $invalidQuestions = $this->service->validateAnswers($user, $submission, [
        'question1' => 'answer1',
        'question2' => 'answer2',
        'question3' => 'answer3',
    ]);

    expect($invalidQuestions)->toBeArray()
        ->and($invalidQuestions)->toContain('question2', 'question3')
        ->and($invalidQuestions)->toHaveCount(2);
});

test('admin passes validation for any answers', function () {
    $admin = User::factory()->create();
    $admin->assignRole('admin');

    $questionnaire = Questionnaire::factory()->create();
    $submission = Submission::factory()->create(['questionnaire_id' => $questionnaire->id]);

    $invalidQuestions = $this->service->validateAnswers($admin, $submission, [
        'question1' => 'answer1',
        'question2' => 'answer2',
        'question3' => 'answer3',
    ]);

    expect($invalidQuestions)->toBeEmpty();
});

test('getPermissionsMap returns correct map', function () {
    $institution = Institution::factory()->create();
    $department = Department::factory()->create(['institution_id' => $institution->id]);

    $user = User::factory()->create([
        'institution_id' => $institution->id,
        'department_id' => $department->id,
    ]);
    $user->assignRole('enumerator');

    $questionnaire = Questionnaire::factory()->create();
    $submission = Submission::factory()->create(['questionnaire_id' => $questionnaire->id]);

    QuestionPermission::factory()->create([
        'questionnaire_id' => $questionnaire->id,
        'question_name' => 'question1',
        'institution_id' => $institution->id,
        'department_id' => $department->id,
        'permission_type' => 'edit',
    ]);

    QuestionPermission::factory()->create([
        'questionnaire_id' => $questionnaire->id,
        'question_name' => 'question2',
        'institution_id' => $institution->id,
        'department_id' => $department->id,
        'permission_type' => 'edit',
    ]);

    $map = $this->service->getPermissionsMap($user, $submission);

    expect($map)->toBeArray()
        ->and($map)->toHaveKey('question1', true); // Only questions in the schema are in the map
});
