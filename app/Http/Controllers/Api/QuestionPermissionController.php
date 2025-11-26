<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\QuestionPermissionRequest;
use App\Http\Resources\QuestionPermissionResource;
use App\Models\QuestionPermission;
use App\Models\Questionnaire;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class QuestionPermissionController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        $this->authorize('viewAny', QuestionPermission::class);

        $query = QuestionPermission::with(['questionnaire', 'institution', 'department']);

        if ($request->has('questionnaire_id')) {
            $query->where('questionnaire_id', $request->questionnaire_id);
        }

        if ($request->has('institution_id')) {
            $query->where('institution_id', $request->institution_id);
        }

        if ($request->has('department_id')) {
            $query->where('department_id', $request->department_id);
        }

        $perPage = $request->get('per_page', 50);

        return QuestionPermissionResource::collection($query->paginate($perPage));
    }

    public function byQuestionnaire(Questionnaire $questionnaire): AnonymousResourceCollection
    {
        $this->authorize('viewAny', QuestionPermission::class);

        $permissions = QuestionPermission::where('questionnaire_id', $questionnaire->id)
            ->with(['institution', 'department'])
            ->get();

        return QuestionPermissionResource::collection($permissions);
    }

    public function store(QuestionPermissionRequest $request): JsonResponse
    {
        $this->authorize('create', QuestionPermission::class);

        $permission = QuestionPermission::create([
            'questionnaire_id' => $request->questionnaire_id,
            'question_name' => $request->question_name,
            'institution_id' => $request->institution_id,
            'department_id' => $request->department_id,
            'permission_type' => $request->permission_type ?? 'edit',
            'created_by' => auth()->id(),
        ]);

        $permission->load(['questionnaire', 'institution', 'department']);

        return response()->json([
            'message' => 'Question permission created successfully',
            'data' => new QuestionPermissionResource($permission),
        ], 201);
    }

    public function bulkStore(Request $request): JsonResponse
    {
        $this->authorize('create', QuestionPermission::class);

        $request->validate([
            'permissions' => ['required', 'array'],
            'permissions.*.questionnaire_id' => ['required', 'exists:questionnaires,id'],
            'permissions.*.question_name' => ['required', 'string'],
            'permissions.*.institution_id' => ['required', 'exists:institutions,id'],
            'permissions.*.department_id' => ['required', 'exists:departments,id'],
            'permissions.*.permission_type' => ['nullable', 'in:edit,view'],
        ]);

        $created = [];
        $updated = [];

        foreach ($request->permissions as $permissionData) {
            $permission = QuestionPermission::updateOrCreate(
                [
                    'questionnaire_id' => $permissionData['questionnaire_id'],
                    'question_name' => $permissionData['question_name'],
                    'institution_id' => $permissionData['institution_id'],
                    'department_id' => $permissionData['department_id'],
                ],
                [
                    'permission_type' => $permissionData['permission_type'] ?? 'edit',
                    'created_by' => auth()->id(),
                ]
            );

            if ($permission->wasRecentlyCreated) {
                $created[] = $permission;
            } else {
                $updated[] = $permission;
            }
        }

        return response()->json([
            'message' => 'Permissions saved successfully',
            'created_count' => count($created),
            'updated_count' => count($updated),
        ]);
    }

    public function destroy(QuestionPermission $questionPermission): JsonResponse
    {
        $this->authorize('delete', $questionPermission);

        $questionPermission->delete();

        return response()->json([
            'message' => 'Question permission deleted successfully',
        ]);
    }
}
