<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\SubmissionRequest;
use App\Http\Resources\SubmissionResource;
use App\Models\Questionnaire;
use App\Models\Submission;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class SubmissionController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        $this->authorize('viewAny', Submission::class);

        $query = Submission::with(['questionnaire', 'institution', 'createdBy']);

        // Filter by questionnaire
        if ($request->has('questionnaire_id')) {
            $query->where('questionnaire_id', $request->questionnaire_id);
        }

        // Filter by institution
        if ($request->has('institution_id')) {
            $query->where('institution_id', $request->institution_id);
        }

        // Filter by status
        if ($request->has('status')) {
            $query->byStatus($request->status);
        }

        // Filter by creator (for enumerators to see their own submissions)
        if ($request->has('created_by')) {
            $query->where('created_by', $request->created_by);
        }

        // Non-admin users can only see submissions from their institution
        $user = auth()->user();
        if (!$user->hasRole('admin')) {
            $query->where('institution_id', $user->institution_id);
        }

        $sortField = $request->get('sort', 'created_at');
        $sortDirection = $request->get('direction', 'desc');
        $query->orderBy($sortField, $sortDirection);

        $perPage = $request->get('per_page', 15);

        return SubmissionResource::collection($query->paginate($perPage));
    }

    public function byQuestionnaire(Request $request, Questionnaire $questionnaire): AnonymousResourceCollection
    {
        $this->authorize('viewAny', Submission::class);

        $query = $questionnaire->submissions()->with(['institution', 'createdBy']);

        if ($request->has('status')) {
            $query->byStatus($request->status);
        }

        if ($request->has('institution_id')) {
            $query->where('institution_id', $request->institution_id);
        }

        // Non-admin users can only see submissions from their institution
        $user = auth()->user();
        if (!$user->hasRole('admin')) {
            $query->where('institution_id', $user->institution_id);
        }

        $sortField = $request->get('sort', 'created_at');
        $sortDirection = $request->get('direction', 'desc');
        $query->orderBy($sortField, $sortDirection);

        $perPage = $request->get('per_page', 15);

        return SubmissionResource::collection($query->paginate($perPage));
    }

    public function store(SubmissionRequest $request): JsonResponse
    {
        $this->authorize('create', Submission::class);

        $user = auth()->user();

        $submission = Submission::create([
            'questionnaire_id' => $request->questionnaire_id,
            'institution_id' => $user->institution_id,
            'status' => 'draft',
            'answers_json' => $request->answers_json ?? [],
            'created_by' => $user->id,
        ]);

        $submission->load(['questionnaire', 'institution', 'createdBy']);

        return response()->json([
            'message' => 'Submission created successfully',
            'data' => new SubmissionResource($submission),
        ], 201);
    }

    public function show(Submission $submission): SubmissionResource
    {
        $this->authorize('view', $submission);

        $submission->load([
            'questionnaire',
            'institution',
            'createdBy',
            'updatedBy',
            'approvedBy',
            'rejectedBy',
        ]);

        return new SubmissionResource($submission);
    }

    public function update(SubmissionRequest $request, Submission $submission): JsonResponse
    {
        $this->authorize('update', $submission);

        // Only allow updates if submission is draft or rejected
        if (!$submission->canBeEdited()) {
            return response()->json([
                'message' => 'Cannot edit a submission that has been submitted or approved',
            ], 422);
        }

        $submission->update([
            'answers_json' => $request->answers_json,
            'updated_by' => auth()->id(),
        ]);

        // If status change to submitted
        if ($request->status === 'submitted' && $submission->isDraft()) {
            $submission->submit();
        }

        $submission->load(['questionnaire', 'institution', 'createdBy']);

        return response()->json([
            'message' => 'Submission updated successfully',
            'data' => new SubmissionResource($submission),
        ]);
    }

    public function destroy(Submission $submission): JsonResponse
    {
        $this->authorize('delete', $submission);

        // Only allow deletion of draft submissions
        if (!$submission->isDraft()) {
            return response()->json([
                'message' => 'Only draft submissions can be deleted',
            ], 422);
        }

        $submission->update(['deleted_by' => auth()->id()]);
        $submission->delete();

        return response()->json([
            'message' => 'Submission deleted successfully',
        ]);
    }

    public function submit(Submission $submission): JsonResponse
    {
        $this->authorize('update', $submission);

        if (!$submission->canBeEdited()) {
            return response()->json([
                'message' => 'Cannot submit a submission that has already been submitted or approved',
            ], 422);
        }

        $submission->submit();
        $submission->load(['questionnaire', 'institution', 'createdBy']);

        return response()->json([
            'message' => 'Submission submitted successfully',
            'data' => new SubmissionResource($submission),
        ]);
    }

    public function approve(Submission $submission): JsonResponse
    {
        $this->authorize('approve', $submission);

        if (!$submission->isSubmitted()) {
            return response()->json([
                'message' => 'Only submitted submissions can be approved',
            ], 422);
        }

        $submission->approve(auth()->id());
        $submission->load(['questionnaire', 'institution', 'createdBy', 'approvedBy']);

        return response()->json([
            'message' => 'Submission approved successfully',
            'data' => new SubmissionResource($submission),
        ]);
    }

    public function reject(Request $request, Submission $submission): JsonResponse
    {
        $this->authorize('approve', $submission);

        $request->validate([
            'rejection_comments' => 'required|string|max:1000',
        ]);

        if (!$submission->isSubmitted()) {
            return response()->json([
                'message' => 'Only submitted submissions can be rejected',
            ], 422);
        }

        $submission->reject(auth()->id(), $request->rejection_comments);
        $submission->load(['questionnaire', 'institution', 'createdBy', 'rejectedBy']);

        return response()->json([
            'message' => 'Submission rejected successfully',
            'data' => new SubmissionResource($submission),
        ]);
    }
}
