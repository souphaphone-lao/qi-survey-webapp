<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\QuestionnaireRequest;
use App\Http\Resources\QuestionnaireResource;
use App\Models\Questionnaire;
use App\Services\QuestionnaireVersionService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class QuestionnaireController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        $this->authorize('viewAny', Questionnaire::class);

        $query = Questionnaire::with(['createdBy']);

        // Enumerators can only see active questionnaires (unless explicitly filtering)
        if (!$request->has('is_active') && auth()->user()->hasRole('enumerator')) {
            $query->where('is_active', true);
        }

        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('title', 'ilike', "%{$search}%")
                    ->orWhere('code', 'ilike', "%{$search}%")
                    ->orWhere('description', 'ilike', "%{$search}%");
            });
        }

        if ($request->has('code')) {
            $query->byCode($request->code);
        }

        if ($request->has('is_active')) {
            $query->where('is_active', $request->boolean('is_active'));
        }

        $sortField = $request->get('sort', 'created_at');
        $sortDirection = $request->get('direction', 'desc');
        $query->orderBy($sortField, $sortDirection);

        $perPage = $request->get('per_page', 15);

        return QuestionnaireResource::collection($query->paginate($perPage));
    }

    public function store(QuestionnaireRequest $request): JsonResponse
    {
        $this->authorize('create', Questionnaire::class);

        // Get the latest version for this code
        $latestVersion = Questionnaire::where('code', $request->code)->max('version') ?? 0;

        $questionnaire = Questionnaire::create([
            'code' => $request->code,
            'version' => $latestVersion + 1,
            'title' => $request->title,
            'description' => $request->description,
            'surveyjs_json' => $request->surveyjs_json,
            'is_active' => $request->is_active ?? true,
            'created_by' => auth()->id(),
        ]);

        $questionnaire->load('createdBy');

        return response()->json([
            'message' => 'Questionnaire created successfully',
            'data' => new QuestionnaireResource($questionnaire),
        ], 201);
    }

    public function show(Questionnaire $questionnaire): QuestionnaireResource
    {
        $this->authorize('view', $questionnaire);

        $questionnaire->load(['createdBy', 'updatedBy']);

        return new QuestionnaireResource($questionnaire);
    }

    public function update(QuestionnaireRequest $request, Questionnaire $questionnaire): JsonResponse
    {
        $this->authorize('update', $questionnaire);

        $updateData = [
            'title' => $request->title,
            'description' => $request->description,
            'surveyjs_json' => $request->surveyjs_json,
            'updated_by' => auth()->id(),
        ];

        // Only update is_active if it's present in the request
        if ($request->has('is_active')) {
            $updateData['is_active'] = $request->is_active;
        }

        $questionnaire->update($updateData);

        $questionnaire->load(['createdBy', 'updatedBy']);

        return response()->json([
            'message' => 'Questionnaire updated successfully',
            'data' => new QuestionnaireResource($questionnaire),
        ]);
    }

    public function destroy(Questionnaire $questionnaire): JsonResponse
    {
        $this->authorize('delete', $questionnaire);

        // Check if questionnaire has submissions
        if ($questionnaire->submissions()->exists()) {
            return response()->json([
                'message' => 'Cannot delete questionnaire with existing submissions',
            ], 422);
        }

        $questionnaire->delete();

        return response()->json([
            'message' => 'Questionnaire deleted successfully',
        ]);
    }

    public function duplicate(Request $request, Questionnaire $questionnaire): JsonResponse
    {
        $this->authorize('create', Questionnaire::class);

        $request->validate([
            'version_notes' => 'nullable|string',
            'breaking_changes' => 'nullable|boolean',
            'copy_permissions' => 'nullable|boolean',
        ]);

        $versionService = new QuestionnaireVersionService();
        $newQuestionnaire = $versionService->duplicateAsNewVersion(
            $questionnaire,
            $request->version_notes,
            $request->boolean('breaking_changes', false),
            $request->boolean('copy_permissions', false)
        );

        $newQuestionnaire->update(['created_by' => auth()->id()]);
        $newQuestionnaire->load('createdBy');

        return response()->json([
            'message' => 'Questionnaire duplicated successfully as version ' . $newQuestionnaire->version,
            'data' => new QuestionnaireResource($newQuestionnaire),
        ], 201);
    }

    public function activate(Questionnaire $questionnaire): JsonResponse
    {
        $this->authorize('update', $questionnaire);

        $versionService = new QuestionnaireVersionService();
        $questionnaire = $versionService->activateVersion($questionnaire);

        $questionnaire->update(['updated_by' => auth()->id()]);
        $questionnaire->load(['createdBy', 'updatedBy']);

        return response()->json([
            'message' => 'Questionnaire activated successfully (other versions deactivated)',
            'data' => new QuestionnaireResource($questionnaire),
        ]);
    }

    public function deactivate(Questionnaire $questionnaire): JsonResponse
    {
        $this->authorize('update', $questionnaire);

        $versionService = new QuestionnaireVersionService();
        $questionnaire = $versionService->deprecateVersion($questionnaire);

        $questionnaire->update(['updated_by' => auth()->id()]);
        $questionnaire->load(['createdBy', 'updatedBy']);

        return response()->json([
            'message' => 'Questionnaire deactivated successfully',
            'data' => new QuestionnaireResource($questionnaire),
        ]);
    }

    public function versions(Questionnaire $questionnaire): JsonResponse
    {
        $this->authorize('view', $questionnaire);

        $versionService = new QuestionnaireVersionService();
        $versions = $versionService->getVersionsByCode($questionnaire->code);

        return response()->json([
            'code' => $questionnaire->code,
            'versions' => QuestionnaireResource::collection($versions),
        ]);
    }

    public function compare(Request $request, Questionnaire $questionnaire): JsonResponse
    {
        $this->authorize('view', $questionnaire);

        $request->validate([
            'other_id' => 'required|exists:questionnaires,id',
        ]);

        $otherQuestionnaire = Questionnaire::findOrFail($request->other_id);
        $this->authorize('view', $otherQuestionnaire);

        // Ensure both questionnaires have the same code
        if ($questionnaire->code !== $otherQuestionnaire->code) {
            return response()->json([
                'message' => 'Can only compare questionnaires with the same code',
            ], 422);
        }

        $versionService = new QuestionnaireVersionService();
        $comparison = $versionService->compareVersions($questionnaire, $otherQuestionnaire);

        return response()->json($comparison);
    }

    public function list(): JsonResponse
    {
        $questionnaires = Questionnaire::active()
            ->orderBy('title')
            ->get(['id', 'code', 'version', 'title']);

        return response()->json($questionnaires);
    }
}
