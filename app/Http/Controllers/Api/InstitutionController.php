<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\InstitutionRequest;
use App\Http\Resources\InstitutionResource;
use App\Models\Institution;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class InstitutionController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        $this->authorize('viewAny', Institution::class);

        $query = Institution::with(['parent', 'createdBy']);

        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('name', 'ilike', "%{$search}%")
                    ->orWhere('code', 'ilike', "%{$search}%");
            });
        }

        if ($request->has('level')) {
            $query->byLevel($request->level);
        }

        if ($request->has('is_active')) {
            $query->where('is_active', $request->boolean('is_active'));
        }

        if ($request->has('parent_id')) {
            $query->where('parent_institution_id', $request->parent_id);
        }

        $sortField = $request->get('sort', 'name');
        $sortDirection = $request->get('direction', 'asc');
        $query->orderBy($sortField, $sortDirection);

        $perPage = $request->get('per_page', 15);

        return InstitutionResource::collection($query->paginate($perPage));
    }

    public function store(InstitutionRequest $request): JsonResponse
    {
        $this->authorize('create', Institution::class);

        $institution = Institution::create([
            'name' => $request->name,
            'code' => $request->code,
            'level' => $request->level,
            'parent_institution_id' => $request->parent_institution_id,
            'is_active' => $request->is_active ?? true,
            'created_by' => auth()->id(),
        ]);

        $institution->load(['parent', 'createdBy']);

        return response()->json([
            'message' => 'Institution created successfully',
            'data' => new InstitutionResource($institution),
        ], 201);
    }

    public function show(Institution $institution): InstitutionResource
    {
        $this->authorize('view', $institution);

        $institution->load(['parent', 'children', 'createdBy', 'updatedBy']);

        return new InstitutionResource($institution);
    }

    public function update(InstitutionRequest $request, Institution $institution): JsonResponse
    {
        $this->authorize('update', $institution);

        $institution->update([
            'name' => $request->name,
            'code' => $request->code,
            'level' => $request->level,
            'parent_institution_id' => $request->parent_institution_id,
            'is_active' => $request->is_active,
            'updated_by' => auth()->id(),
        ]);

        $institution->load(['parent', 'createdBy', 'updatedBy']);

        return response()->json([
            'message' => 'Institution updated successfully',
            'data' => new InstitutionResource($institution),
        ]);
    }

    public function destroy(Institution $institution): JsonResponse
    {
        $this->authorize('delete', $institution);

        // Check if institution has users
        if ($institution->users()->exists()) {
            return response()->json([
                'message' => 'Cannot delete institution with associated users',
            ], 422);
        }

        // Check if institution has children
        if ($institution->children()->exists()) {
            return response()->json([
                'message' => 'Cannot delete institution with child institutions',
            ], 422);
        }

        $institution->delete();

        return response()->json([
            'message' => 'Institution deleted successfully',
        ]);
    }

    public function list(): JsonResponse
    {
        $institutions = Institution::active()
            ->orderBy('name')
            ->get(['id', 'name', 'code', 'level']);

        return response()->json($institutions);
    }
}
