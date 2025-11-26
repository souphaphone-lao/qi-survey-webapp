<?php

use App\Models\User;
use App\Models\Institution;
use App\Models\Questionnaire;
use App\Models\Submission;

test('isDraft returns true for draft submission', function () {
    $submission = Submission::factory()->draft()->make();

    expect($submission->isDraft())->toBeTrue();
});

test('isDraft returns false for submitted submission', function () {
    $submission = Submission::factory()->submitted()->make();

    expect($submission->isDraft())->toBeFalse();
});

test('isSubmitted returns true for submitted submission', function () {
    $submission = Submission::factory()->submitted()->make();

    expect($submission->isSubmitted())->toBeTrue();
});

test('isSubmitted returns false for draft submission', function () {
    $submission = Submission::factory()->draft()->make();

    expect($submission->isSubmitted())->toBeFalse();
});

test('isApproved returns true for approved submission', function () {
    $submission = Submission::factory()->approved()->make();

    expect($submission->isApproved())->toBeTrue();
});

test('isApproved returns false for submitted submission', function () {
    $submission = Submission::factory()->submitted()->make();

    expect($submission->isApproved())->toBeFalse();
});

test('isRejected returns true for rejected submission', function () {
    $submission = Submission::factory()->rejected()->make();

    expect($submission->isRejected())->toBeTrue();
});

test('isRejected returns false for approved submission', function () {
    $submission = Submission::factory()->approved()->make();

    expect($submission->isRejected())->toBeFalse();
});

test('canBeEdited returns true for draft submission', function () {
    $submission = Submission::factory()->draft()->make();

    expect($submission->canBeEdited())->toBeTrue();
});

test('canBeEdited returns true for rejected submission', function () {
    $submission = Submission::factory()->rejected()->make();

    expect($submission->canBeEdited())->toBeTrue();
});

test('canBeEdited returns false for submitted submission', function () {
    $submission = Submission::factory()->submitted()->make();

    expect($submission->canBeEdited())->toBeFalse();
});

test('canBeEdited returns false for approved submission', function () {
    $submission = Submission::factory()->approved()->make();

    expect($submission->canBeEdited())->toBeFalse();
});

test('submit updates status to submitted', function () {
    $questionnaire = Questionnaire::factory()->create();
    $institution = Institution::factory()->create();
    $submission = Submission::factory()->draft()->create([
        'questionnaire_id' => $questionnaire->id,
        'institution_id' => $institution->id,
    ]);

    $submission->submit();

    $submission->refresh();
    expect($submission->status)->toBe('submitted');
    expect($submission->isSubmitted())->toBeTrue();
});

test('submit sets submitted_at timestamp', function () {
    $questionnaire = Questionnaire::factory()->create();
    $institution = Institution::factory()->create();
    $submission = Submission::factory()->draft()->create([
        'questionnaire_id' => $questionnaire->id,
        'institution_id' => $institution->id,
        'submitted_at' => null,
    ]);

    $before = now();
    $submission->submit();
    $submission->refresh();

    expect($submission->submitted_at)->not->toBeNull();
    expect($submission->submitted_at->greaterThanOrEqualTo($before->floorSecond()))->toBeTrue();
});

test('approve updates status to approved', function () {
    $questionnaire = Questionnaire::factory()->create();
    $institution = Institution::factory()->create();
    $approver = User::factory()->create(['institution_id' => $institution->id]);

    $submission = Submission::factory()->submitted()->create([
        'questionnaire_id' => $questionnaire->id,
        'institution_id' => $institution->id,
    ]);

    $submission->approve($approver->id);

    $submission->refresh();
    expect($submission->status)->toBe('approved');
    expect($submission->isApproved())->toBeTrue();
});

test('approve sets approved_at timestamp', function () {
    $questionnaire = Questionnaire::factory()->create();
    $institution = Institution::factory()->create();
    $approver = User::factory()->create(['institution_id' => $institution->id]);

    $submission = Submission::factory()->submitted()->create([
        'questionnaire_id' => $questionnaire->id,
        'institution_id' => $institution->id,
    ]);

    $before = now();
    $submission->approve($approver->id);
    $submission->refresh();

    expect($submission->approved_at)->not->toBeNull();
    expect($submission->approved_at->greaterThanOrEqualTo($before->floorSecond()))->toBeTrue();
});

test('approve sets approved_by user id', function () {
    $questionnaire = Questionnaire::factory()->create();
    $institution = Institution::factory()->create();
    $approver = User::factory()->create(['institution_id' => $institution->id]);

    $submission = Submission::factory()->submitted()->create([
        'questionnaire_id' => $questionnaire->id,
        'institution_id' => $institution->id,
    ]);

    $submission->approve($approver->id);

    $submission->refresh();
    expect($submission->approved_by)->toBe($approver->id);
});

test('reject updates status to rejected', function () {
    $questionnaire = Questionnaire::factory()->create();
    $institution = Institution::factory()->create();
    $rejecter = User::factory()->create(['institution_id' => $institution->id]);

    $submission = Submission::factory()->submitted()->create([
        'questionnaire_id' => $questionnaire->id,
        'institution_id' => $institution->id,
    ]);

    $submission->reject($rejecter->id, 'Data incomplete');

    $submission->refresh();
    expect($submission->status)->toBe('rejected');
    expect($submission->isRejected())->toBeTrue();
});

test('reject sets rejected_at timestamp', function () {
    $questionnaire = Questionnaire::factory()->create();
    $institution = Institution::factory()->create();
    $rejecter = User::factory()->create(['institution_id' => $institution->id]);

    $submission = Submission::factory()->submitted()->create([
        'questionnaire_id' => $questionnaire->id,
        'institution_id' => $institution->id,
    ]);

    $before = now();
    $submission->reject($rejecter->id, 'Data incomplete');
    $submission->refresh();

    expect($submission->rejected_at)->not->toBeNull();
    expect($submission->rejected_at->greaterThanOrEqualTo($before->floorSecond()))->toBeTrue();
});

test('reject sets rejected_by user id', function () {
    $questionnaire = Questionnaire::factory()->create();
    $institution = Institution::factory()->create();
    $rejecter = User::factory()->create(['institution_id' => $institution->id]);

    $submission = Submission::factory()->submitted()->create([
        'questionnaire_id' => $questionnaire->id,
        'institution_id' => $institution->id,
    ]);

    $submission->reject($rejecter->id, 'Data incomplete');

    $submission->refresh();
    expect($submission->rejected_by)->toBe($rejecter->id);
});

test('reject stores rejection comments', function () {
    $questionnaire = Questionnaire::factory()->create();
    $institution = Institution::factory()->create();
    $rejecter = User::factory()->create(['institution_id' => $institution->id]);

    $submission = Submission::factory()->submitted()->create([
        'questionnaire_id' => $questionnaire->id,
        'institution_id' => $institution->id,
    ]);

    $comments = 'Data is incomplete and needs revision';
    $submission->reject($rejecter->id, $comments);

    $submission->refresh();
    expect($submission->rejection_comments)->toBe($comments);
});

test('submission has questionnaire relationship', function () {
    $questionnaire = Questionnaire::factory()->create();
    $institution = Institution::factory()->create();
    $submission = Submission::factory()->create([
        'questionnaire_id' => $questionnaire->id,
        'institution_id' => $institution->id,
    ]);

    expect($submission->questionnaire)->not->toBeNull();
    expect($submission->questionnaire->id)->toBe($questionnaire->id);
});

test('submission has institution relationship', function () {
    $questionnaire = Questionnaire::factory()->create();
    $institution = Institution::factory()->create();
    $submission = Submission::factory()->create([
        'questionnaire_id' => $questionnaire->id,
        'institution_id' => $institution->id,
    ]);

    expect($submission->institution)->not->toBeNull();
    expect($submission->institution->id)->toBe($institution->id);
});

test('submission casts answers_json to array', function () {
    $submission = Submission::factory()->make([
        'answers_json' => ['question1' => 'answer1'],
    ]);

    expect($submission->answers_json)->toBeArray();
    expect($submission->answers_json)->toHaveKey('question1');
});

test('submission casts submitted_at to datetime', function () {
    $submission = Submission::factory()->submitted()->make();

    expect($submission->submitted_at)->toBeInstanceOf(Carbon\Carbon::class);
});

test('submission casts approved_at to datetime', function () {
    $submission = Submission::factory()->approved()->make();

    expect($submission->approved_at)->toBeInstanceOf(Carbon\Carbon::class);
});

test('submission casts rejected_at to datetime', function () {
    $submission = Submission::factory()->rejected()->make();

    expect($submission->rejected_at)->toBeInstanceOf(Carbon\Carbon::class);
});

test('submission can be soft deleted', function () {
    $questionnaire = Questionnaire::factory()->create();
    $institution = Institution::factory()->create();
    $submission = Submission::factory()->create([
        'questionnaire_id' => $questionnaire->id,
        'institution_id' => $institution->id,
    ]);

    $submissionId = $submission->id;
    $submission->delete();

    expect(Submission::find($submissionId))->toBeNull();
    expect(Submission::withTrashed()->find($submissionId))->not->toBeNull();
});

test('byStatus scope filters by status', function () {
    $questionnaire = Questionnaire::factory()->create();
    $institution = Institution::factory()->create();

    Submission::factory()->draft()->create([
        'questionnaire_id' => $questionnaire->id,
        'institution_id' => $institution->id,
    ]);
    Submission::factory()->submitted()->create([
        'questionnaire_id' => $questionnaire->id,
        'institution_id' => $institution->id,
    ]);

    $drafts = Submission::byStatus('draft')->get();
    $submitted = Submission::byStatus('submitted')->get();

    expect($drafts)->toHaveCount(1);
    expect($submitted)->toHaveCount(1);
});

test('draft scope returns only draft submissions', function () {
    $questionnaire = Questionnaire::factory()->create();
    $institution = Institution::factory()->create();

    Submission::factory()->count(2)->draft()->create([
        'questionnaire_id' => $questionnaire->id,
        'institution_id' => $institution->id,
    ]);
    Submission::factory()->submitted()->create([
        'questionnaire_id' => $questionnaire->id,
        'institution_id' => $institution->id,
    ]);

    $drafts = Submission::draft()->get();

    expect($drafts)->toHaveCount(2);
    foreach ($drafts as $draft) {
        expect($draft->isDraft())->toBeTrue();
    }
});

test('submitted scope returns only submitted submissions', function () {
    $questionnaire = Questionnaire::factory()->create();
    $institution = Institution::factory()->create();

    Submission::factory()->draft()->create([
        'questionnaire_id' => $questionnaire->id,
        'institution_id' => $institution->id,
    ]);
    Submission::factory()->count(2)->submitted()->create([
        'questionnaire_id' => $questionnaire->id,
        'institution_id' => $institution->id,
    ]);

    $submitted = Submission::submitted()->get();

    expect($submitted)->toHaveCount(2);
    foreach ($submitted as $submission) {
        expect($submission->isSubmitted())->toBeTrue();
    }
});

test('approved scope returns only approved submissions', function () {
    $questionnaire = Questionnaire::factory()->create();
    $institution = Institution::factory()->create();

    Submission::factory()->submitted()->create([
        'questionnaire_id' => $questionnaire->id,
        'institution_id' => $institution->id,
    ]);
    Submission::factory()->count(2)->approved()->create([
        'questionnaire_id' => $questionnaire->id,
        'institution_id' => $institution->id,
    ]);

    $approved = Submission::approved()->get();

    expect($approved)->toHaveCount(2);
    foreach ($approved as $submission) {
        expect($submission->isApproved())->toBeTrue();
    }
});

test('rejected scope returns only rejected submissions', function () {
    $questionnaire = Questionnaire::factory()->create();
    $institution = Institution::factory()->create();

    Submission::factory()->approved()->create([
        'questionnaire_id' => $questionnaire->id,
        'institution_id' => $institution->id,
    ]);
    Submission::factory()->count(2)->rejected()->create([
        'questionnaire_id' => $questionnaire->id,
        'institution_id' => $institution->id,
    ]);

    $rejected = Submission::rejected()->get();

    expect($rejected)->toHaveCount(2);
    foreach ($rejected as $submission) {
        expect($submission->isRejected())->toBeTrue();
    }
});
