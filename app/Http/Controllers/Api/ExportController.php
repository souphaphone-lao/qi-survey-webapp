<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Jobs\GenerateExportJob;
use App\Models\ExportJob;
use App\Services\ExportService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ExportController extends Controller
{
    public function __construct(
        protected ExportService $exportService
    ) {}

    /**
     * Request a new export
     */
    public function store(Request $request, string $questionnaireCode): JsonResponse
    {
        $validated = $request->validate([
            'format' => 'required|in:csv,xlsx',
            'filters' => 'nullable|array',
            'filters.institution_id' => 'nullable|integer|exists:institutions,id',
            'filters.date_from' => 'nullable|date',
            'filters.date_to' => 'nullable|date|after:filters.date_from',
            'filters.status' => 'nullable|in:draft,submitted,approved,rejected',
            'filters.version' => 'nullable|integer',
        ]);

        // Create export job
        $exportJob = ExportJob::create([
            'user_id' => auth()->id(),
            'questionnaire_code' => $questionnaireCode,
            'format' => $validated['format'],
            'filters' => $validated['filters'] ?? [],
            'status' => 'pending',
        ]);

        // Dispatch job to queue
        GenerateExportJob::dispatch($exportJob);

        return response()->json([
            'message' => 'Export job created successfully',
            'data' => [
                'id' => $exportJob->id,
                'status' => $exportJob->status,
                'format' => $exportJob->format,
                'questionnaire_code' => $exportJob->questionnaire_code,
                'created_at' => $exportJob->created_at->toISOString(),
            ],
        ], 201);
    }

    /**
     * Get export job status
     */
    public function show(ExportJob $exportJob): JsonResponse
    {
        // Check authorization (user can only view their own exports or admin can view all)
        if ($exportJob->user_id !== auth()->id() && !auth()->user()->hasRole('admin')) {
            abort(403, 'Unauthorized');
        }

        return response()->json([
            'data' => [
                'id' => $exportJob->id,
                'user_id' => $exportJob->user_id,
                'questionnaire_code' => $exportJob->questionnaire_code,
                'format' => $exportJob->format,
                'status' => $exportJob->status,
                'filters' => $exportJob->filters,
                'file_path' => $exportJob->file_path,
                'file_size' => $exportJob->file_size,
                'error_message' => $exportJob->error_message,
                'started_at' => $exportJob->started_at?->toISOString(),
                'completed_at' => $exportJob->completed_at?->toISOString(),
                'expires_at' => $exportJob->expires_at?->toISOString(),
                'created_at' => $exportJob->created_at->toISOString(),
                'is_expired' => $exportJob->isExpired(),
            ],
        ]);
    }

    /**
     * Download export file
     */
    public function download(ExportJob $exportJob): StreamedResponse
    {
        // Check authorization
        if ($exportJob->user_id !== auth()->id() && !auth()->user()->hasRole('admin')) {
            abort(403, 'Unauthorized');
        }

        // Check if export is completed
        if (!$exportJob->isCompleted()) {
            abort(400, 'Export is not yet completed');
        }

        // Check if expired
        if ($exportJob->isExpired()) {
            abort(410, 'Export file has expired');
        }

        // Check if file exists
        if (!$exportJob->file_path || !Storage::disk('local')->exists($exportJob->file_path)) {
            abort(404, 'Export file not found');
        }

        $fileName = sprintf(
            '%s_export_%s.%s',
            $exportJob->questionnaire_code,
            $exportJob->created_at->format('Y-m-d'),
            $exportJob->format
        );

        return Storage::disk('local')->download($exportJob->file_path, $fileName);
    }

    /**
     * Get user's export history
     */
    public function index(Request $request): JsonResponse
    {
        $query = ExportJob::where('user_id', auth()->id())
            ->orderBy('created_at', 'desc');

        // Filter by questionnaire code if provided
        if ($request->has('questionnaire_code')) {
            $query->where('questionnaire_code', $request->questionnaire_code);
        }

        // Filter by status if provided
        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        $exports = $query->paginate(20);

        return response()->json([
            'data' => $exports->items(),
            'meta' => [
                'current_page' => $exports->currentPage(),
                'last_page' => $exports->lastPage(),
                'per_page' => $exports->perPage(),
                'total' => $exports->total(),
            ],
        ]);
    }

    /**
     * Delete an export
     */
    public function destroy(ExportJob $exportJob): JsonResponse
    {
        // Check authorization
        if ($exportJob->user_id !== auth()->id() && !auth()->user()->hasRole('admin')) {
            abort(403, 'Unauthorized');
        }

        // Delete the file if it exists
        $this->exportService->deleteExport($exportJob);

        // Delete the export job record
        $exportJob->delete();

        return response()->json([
            'message' => 'Export deleted successfully',
        ]);
    }
}
