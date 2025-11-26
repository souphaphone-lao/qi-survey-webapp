<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\QuestionnaireRequest;
use App\Http\Resources\QuestionnaireResource;
use App\Models\Questionnaire;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class QuestionnaireController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        $this->authorize('viewAny', Questionnaire::class);

        $query = Questionnaire::with(['createdBy']);

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

        $questionnaire->update([
            'title' => $request->title,
            'description' => $request->description,
            'surveyjs_json' => $request->surveyjs_json,
            'is_active' => $request->is_active,
            'updated_by' => auth()->id(),
        ]);

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

    public function duplicate(Questionnaire $questionnaire): JsonResponse
    {
        $this->authorize('create', Questionnaire::class);

        $newQuestionnaire = $questionnaire->duplicate();
        $newQuestionnaire->update(['created_by' => auth()->id()]);
        $newQuestionnaire->load('createdBy');

        return response()->json([
            'message' => 'Questionnaire duplicated successfully',
            'data' => new QuestionnaireResource($newQuestionnaire),
        ], 201);
    }

    public function activate(Questionnaire $questionnaire): JsonResponse
    {
        $this->authorize('update', $questionnaire);

        $questionnaire->update(['is_active' => true, 'updated_by' => auth()->id()]);

        $questionnaire->load(['createdBy', 'updatedBy']);

        return response()->json([
            'message' => 'Questionnaire activated successfully',
            'data' => new QuestionnaireResource($questionnaire),
        ]);
    }

    public function deactivate(Questionnaire $questionnaire): JsonResponse
    {
        $this->authorize('update', $questionnaire);

        $questionnaire->update(['is_active' => false, 'updated_by' => auth()->id()]);

        $questionnaire->load(['createdBy', 'updatedBy']);

        return response()->json([
            'message' => 'Questionnaire deactivated successfully',
            'data' => new QuestionnaireResource($questionnaire),
        ]);
    }

    public function list(): JsonResponse
    {
        $questionnaires = Questionnaire::active()
            ->orderBy('title')
            ->get(['id', 'code', 'version', 'title']);

        return response()->json($questionnaires);
    }
}
