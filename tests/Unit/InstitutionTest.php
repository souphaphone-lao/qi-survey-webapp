<?php

use App\Models\Institution;
use Database\Seeders\RoleAndPermissionSeeder;

beforeEach(function () {
    $this->seed(RoleAndPermissionSeeder::class);
});

it('returns all descendants recursively', function () {
    // Create hierarchy: Central -> Province -> District
    $central = Institution::factory()->create([
        'code' => 'CENTRAL',
        'level' => 'central',
        'parent_institution_id' => null,
    ]);

    $province1 = Institution::factory()->create([
        'code' => 'PROV1',
        'level' => 'province',
        'parent_institution_id' => $central->id,
    ]);

    $province2 = Institution::factory()->create([
        'code' => 'PROV2',
        'level' => 'province',
        'parent_institution_id' => $central->id,
    ]);

    $district1 = Institution::factory()->create([
        'code' => 'DIST1',
        'level' => 'district',
        'parent_institution_id' => $province1->id,
    ]);

    $district2 = Institution::factory()->create([
        'code' => 'DIST2',
        'level' => 'district',
        'parent_institution_id' => $province1->id,
    ]);

    $central->load('children.children');

    // Get descendants from central
    $descendants = $central->descendants();

    expect($descendants)->toHaveCount(4)
        ->and($descendants->pluck('id')->toArray())->toContain($province1->id, $province2->id, $district1->id, $district2->id);
});

it('returns all ancestors up to root', function () {
    // Create hierarchy: Central -> Province -> District
    $central = Institution::factory()->create([
        'code' => 'CENTRAL',
        'level' => 'central',
        'parent_institution_id' => null,
    ]);

    $province = Institution::factory()->create([
        'code' => 'PROV1',
        'level' => 'province',
        'parent_institution_id' => $central->id,
    ]);

    $district = Institution::factory()->create([
        'code' => 'DIST1',
        'level' => 'district',
        'parent_institution_id' => $province->id,
    ]);

    $district->load('parent.parent');

    // Get ancestors from district
    $ancestors = $district->ancestors();

    expect($ancestors)->toHaveCount(2)
        ->and($ancestors->pluck('id')->toArray())->toEqual([$province->id, $central->id]);
});

it('correctly identifies descendants', function () {
    $central = Institution::factory()->create([
        'code' => 'CENTRAL',
        'level' => 'central',
        'parent_institution_id' => null,
    ]);

    $province = Institution::factory()->create([
        'code' => 'PROV1',
        'level' => 'province',
        'parent_institution_id' => $central->id,
    ]);

    $district = Institution::factory()->create([
        'code' => 'DIST1',
        'level' => 'district',
        'parent_institution_id' => $province->id,
    ]);

    $district->load('parent.parent');

    expect($district->isDescendantOf($province))->toBeTrue()
        ->and($district->isDescendantOf($central))->toBeTrue()
        ->and($province->isDescendantOf($central))->toBeTrue()
        ->and($central->isDescendantOf($province))->toBeFalse();
});

it('correctly identifies ancestors', function () {
    $central = Institution::factory()->create([
        'code' => 'CENTRAL',
        'level' => 'central',
        'parent_institution_id' => null,
    ]);

    $province = Institution::factory()->create([
        'code' => 'PROV1',
        'level' => 'province',
        'parent_institution_id' => $central->id,
    ]);

    $district = Institution::factory()->create([
        'code' => 'DIST1',
        'level' => 'district',
        'parent_institution_id' => $province->id,
    ]);

    $central->load('children.children');
    $province->load('children');

    expect($central->isAncestorOf($province))->toBeTrue()
        ->and($central->isAncestorOf($district))->toBeTrue()
        ->and($province->isAncestorOf($district))->toBeTrue()
        ->and($district->isAncestorOf($central))->toBeFalse();
});

it('returns viewable institution IDs including self and descendants', function () {
    $central = Institution::factory()->create([
        'code' => 'CENTRAL',
        'level' => 'central',
        'parent_institution_id' => null,
    ]);

    $province = Institution::factory()->create([
        'code' => 'PROV1',
        'level' => 'province',
        'parent_institution_id' => $central->id,
    ]);

    $district = Institution::factory()->create([
        'code' => 'DIST1',
        'level' => 'district',
        'parent_institution_id' => $province->id,
    ]);

    $province->load('children');

    // Province viewable IDs should include itself and district
    $viewableIds = $province->getViewableInstitutionIds();

    expect($viewableIds)->toHaveCount(2)
        ->and($viewableIds)->toContain($province->id, $district->id);
});

it('returns empty collection for institution with no children', function () {
    $district = Institution::factory()->create([
        'code' => 'DIST1',
        'level' => 'district',
        'parent_institution_id' => null,
    ]);

    $descendants = $district->descendants();

    expect($descendants)->toBeEmpty();
});

it('returns empty collection for root institution with no parent', function () {
    $central = Institution::factory()->create([
        'code' => 'CENTRAL',
        'level' => 'central',
        'parent_institution_id' => null,
    ]);

    $ancestors = $central->ancestors();

    expect($ancestors)->toBeEmpty();
});
