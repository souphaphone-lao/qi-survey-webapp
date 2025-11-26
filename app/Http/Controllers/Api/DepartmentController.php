<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\DepartmentRequest;
use App\Http\Resources\DepartmentResource;
use App\Models\Department;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class DepartmentController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        $this->authorize('viewAny', Department::class);

        $query = Department::with(['institution', 'createdBy']);

        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('name', 'ilike', "%{$search}%")
                    ->orWhere('code', 'ilike', "%{$search}%");
            });
        }

        if ($request->has('institution_id')) {
            $query->where('institution_id', $request->institution_id);
        }

        if ($request->has('is_active')) {
            $query->where('is_active', $request->boolean('is_active'));
        }

        $sortField = $request->get('sort', 'name');
        $sortDirection = $request->get('direction', 'asc');
        $query->orderBy($sortField, $sortDirection);

        $perPage = $request->get('per_page', 15);

        return DepartmentResource::collection($query->paginate($perPage));
    }

    public function store(DepartmentRequest $request): JsonResponse
    {
        $this->authorize('create', Department::class);

        $department = Department::create([
            'name' => $request->name,
            'code' => $request->code,
            'institution_id' => $request->institution_id,
            'description' => $request->description,
            'is_active' => $request->is_active ?? true,
            'created_by' => auth()->id(),
        ]);

        $department->load(['institution', 'createdBy']);

        return response()->json([
            'message' => 'Department created successfully',
            'data' => new DepartmentResource($department),
        ], 201);
    }

    public function show(Department $department): DepartmentResource
    {
        $this->authorize('view', $department);

        $department->load(['institution', 'createdBy', 'updatedBy']);
        $department->loadCount('users');

        return new DepartmentResource($department);
    }

    public function update(DepartmentRequest $request, Department $department): JsonResponse
    {
        $this->authorize('update', $department);

        $department->update([
            'name' => $request->name,
            'code' => $request->code,
            'institution_id' => $request->institution_id,
            'description' => $request->description,
            'is_active' => $request->is_active,
            'updated_by' => auth()->id(),
        ]);

        $department->load(['institution', 'createdBy', 'updatedBy']);

        return response()->json([
            'message' => 'Department updated successfully',
            'data' => new DepartmentResource($department),
        ]);
    }

    public function destroy(Department $department): JsonResponse
    {
        $this->authorize('delete', $department);

        // Check if department has users
        if ($department->users()->exists()) {
            return response()->json([
                'message' => 'Cannot delete department with associated users',
            ], 422);
        }

        $department->delete();

        return response()->json([
            'message' => 'Department deleted successfully',
        ]);
    }

    public function list(Request $request): JsonResponse
    {
        $query = Department::where('is_active', true);

        if ($request->has('institution_id')) {
            $query->where('institution_id', $request->institution_id);
        }

        $departments = $query->orderBy('name')
            ->get(['id', 'name', 'code', 'institution_id']);

        return response()->json($departments);
    }
}
