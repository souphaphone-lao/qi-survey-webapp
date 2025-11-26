<?php

use App\Models\Questionnaire;
use Database\Seeders\RoleAndPermissionSeeder;

beforeEach(function () {
    $this->seed(RoleAndPermissionSeeder::class);
});

it('extracts question names from SurveyJS schema', function () {
    $questionnaire = Questionnaire::factory()->create([
        'surveyjs_json' => [
            'pages' => [
                [
                    'name' => 'page1',
                    'elements' => [
                        [
                            'type' => 'text',
                            'name' => 'question1',
                            'title' => 'Question 1',
                        ],
                        [
                            'type' => 'text',
                            'name' => 'question2',
                            'title' => 'Question 2',
                        ],
                    ],
                ],
            ],
        ],
    ]);

    $questionNames = $questionnaire->extractQuestionNames();

    expect($questionNames)->toHaveCount(2)
        ->and($questionNames)->toContain('question1', 'question2');
});

it('handles nested panels in schema', function () {
    $questionnaire = Questionnaire::factory()->create([
        'surveyjs_json' => [
            'pages' => [
                [
                    'name' => 'page1',
                    'elements' => [
                        [
                            'type' => 'text',
                            'name' => 'question1',
                            'title' => 'Question 1',
                        ],
                        [
                            'type' => 'panel',
                            'name' => 'panel1',
                            'elements' => [
                                [
                                    'type' => 'text',
                                    'name' => 'question2',
                                    'title' => 'Question 2',
                                ],
                                [
                                    'type' => 'text',
                                    'name' => 'question3',
                                    'title' => 'Question 3',
                                ],
                            ],
                        ],
                    ],
                ],
            ],
        ],
    ]);

    $questionNames = $questionnaire->extractQuestionNames();

    expect($questionNames)->toHaveCount(4)
        ->and($questionNames)->toContain('question1', 'panel1', 'question2', 'question3');
});

it('handles deeply nested elements', function () {
    $questionnaire = Questionnaire::factory()->create([
        'surveyjs_json' => [
            'pages' => [
                [
                    'name' => 'page1',
                    'elements' => [
                        [
                            'type' => 'panel',
                            'name' => 'panel1',
                            'elements' => [
                                [
                                    'type' => 'panel',
                                    'name' => 'panel2',
                                    'elements' => [
                                        [
                                            'type' => 'text',
                                            'name' => 'nestedQuestion',
                                            'title' => 'Nested Question',
                                        ],
                                    ],
                                ],
                            ],
                        ],
                    ],
                ],
            ],
        ],
    ]);

    $questionNames = $questionnaire->extractQuestionNames();

    expect($questionNames)->toHaveCount(3)
        ->and($questionNames)->toContain('panel1', 'panel2', 'nestedQuestion');
});

it('returns empty array for empty schema', function () {
    $questionnaire = Questionnaire::factory()->create([
        'surveyjs_json' => [],
    ]);

    $questionNames = $questionnaire->extractQuestionNames();

    expect($questionNames)->toBeEmpty();
});

it('returns empty array for schema with no pages', function () {
    $questionnaire = Questionnaire::factory()->create([
        'surveyjs_json' => [],
    ]);

    $questionNames = $questionnaire->extractQuestionNames();

    expect($questionNames)->toBeEmpty();
});

it('handles schema with pages but no elements', function () {
    $questionnaire = Questionnaire::factory()->create([
        'surveyjs_json' => [
            'pages' => [
                [
                    'name' => 'page1',
                    'elements' => [],
                ],
            ],
        ],
    ]);

    $questionNames = $questionnaire->extractQuestionNames();

    expect($questionNames)->toBeEmpty();
});

it('handles multiple pages with elements', function () {
    $questionnaire = Questionnaire::factory()->create([
        'surveyjs_json' => [
            'pages' => [
                [
                    'name' => 'page1',
                    'elements' => [
                        [
                            'type' => 'text',
                            'name' => 'question1',
                            'title' => 'Question 1',
                        ],
                    ],
                ],
                [
                    'name' => 'page2',
                    'elements' => [
                        [
                            'type' => 'text',
                            'name' => 'question2',
                            'title' => 'Question 2',
                        ],
                    ],
                ],
            ],
        ],
    ]);

    $questionNames = $questionnaire->extractQuestionNames();

    expect($questionNames)->toHaveCount(2)
        ->and($questionNames)->toContain('question1', 'question2');
});

it('removes duplicate question names', function () {
    // Edge case: duplicate names (shouldn't happen but testing uniqueness)
    $questionnaire = Questionnaire::factory()->create([
        'surveyjs_json' => [
            'pages' => [
                [
                    'name' => 'page1',
                    'elements' => [
                        [
                            'type' => 'text',
                            'name' => 'question1',
                            'title' => 'Question 1',
                        ],
                    ],
                ],
                [
                    'name' => 'page2',
                    'elements' => [
                        [
                            'type' => 'text',
                            'name' => 'question1',
                            'title' => 'Question 1 Duplicate',
                        ],
                    ],
                ],
            ],
        ],
    ]);

    $questionNames = $questionnaire->extractQuestionNames();

    expect($questionNames)->toHaveCount(1)
        ->and($questionNames)->toContain('question1');
});
