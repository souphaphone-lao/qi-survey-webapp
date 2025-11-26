<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Institution;
use App\Models\Questionnaire;
use App\Models\Submission;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class DashboardController extends Controller
{
    public function stats(Request $request): JsonResponse
    {
        $user = auth()->user();
        $isAdmin = $user->hasRole('admin');

        // Base query for submissions
        $submissionQuery = Submission::query();

        // Non-admin users can only see stats for their institution
        if (!$isAdmin) {
            $submissionQuery->where('institution_id', $user->institution_id);
        }

        // Filter by date range if provided
        if ($request->has('from_date')) {
            $submissionQuery->whereDate('created_at', '>=', $request->from_date);
        }

        if ($request->has('to_date')) {
            $submissionQuery->whereDate('created_at', '<=', $request->to_date);
        }

        // Get submission counts by status
        $submissionCounts = (clone $submissionQuery)
            ->select('status', DB::raw('count(*) as count'))
            ->groupBy('status')
            ->pluck('count', 'status')
            ->toArray();

        $totalSubmissions = array_sum($submissionCounts);

        // Get submissions by questionnaire
        $submissionsByQuestionnaire = (clone $submissionQuery)
            ->select('questionnaire_id', DB::raw('count(*) as count'))
            ->with('questionnaire:id,title,code')
            ->groupBy('questionnaire_id')
            ->get()
            ->map(function ($item) {
                return [
                    'questionnaire_id' => $item->questionnaire_id,
                    'questionnaire_title' => $item->questionnaire?->title,
                    'questionnaire_code' => $item->questionnaire?->code,
                    'count' => $item->count,
                ];
            });

        // Admin-only stats
        $adminStats = [];
        if ($isAdmin) {
            $adminStats = [
                'total_users' => User::count(),
                'active_users' => User::where('is_active', true)->count(),
                'total_institutions' => Institution::count(),
                'active_institutions' => Institution::where('is_active', true)->count(),
                'total_questionnaires' => Questionnaire::count(),
                'active_questionnaires' => Questionnaire::where('is_active', true)->count(),
            ];

            // Submissions by institution
            $adminStats['submissions_by_institution'] = Submission::select('institution_id', DB::raw('count(*) as count'))
                ->with('institution:id,name,code')
                ->groupBy('institution_id')
                ->get()
                ->map(function ($item) {
                    return [
                        'institution_id' => $item->institution_id,
                        'institution_name' => $item->institution?->name,
                        'institution_code' => $item->institution?->code,
                        'count' => $item->count,
                    ];
                });
        }

        // Recent submissions
        $recentSubmissions = (clone $submissionQuery)
            ->with(['questionnaire:id,title,code', 'institution:id,name', 'createdBy:id,name'])
            ->orderBy('created_at', 'desc')
            ->limit(10)
            ->get()
            ->map(function ($submission) {
                return [
                    'id' => $submission->id,
                    'questionnaire' => $submission->questionnaire?->title,
                    'institution' => $submission->institution?->name,
                    'created_by' => $submission->createdBy?->name,
                    'status' => $submission->status,
                    'created_at' => $submission->created_at->toISOString(),
                ];
            });

        return response()->json([
            'submissions' => [
                'total' => $totalSubmissions,
                'draft' => $submissionCounts['draft'] ?? 0,
                'submitted' => $submissionCounts['submitted'] ?? 0,
                'approved' => $submissionCounts['approved'] ?? 0,
                'rejected' => $submissionCounts['rejected'] ?? 0,
            ],
            'submissions_by_questionnaire' => $submissionsByQuestionnaire,
            'recent_submissions' => $recentSubmissions,
            ...$adminStats,
        ]);
    }
}
