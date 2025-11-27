<?php

namespace App\Services;

use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class DashboardService
{
    /**
     * Get dashboard overview with summary statistics
     */
    public function getOverview(array $filters): array
    {
        $query = $this->applyFilters(
            DB::table('submissions')
                ->join('institutions', 'submissions.institution_id', '=', 'institutions.id')
                ->whereNull('submissions.deleted_at'),
            $filters
        );

        // Calculate summary statistics
        $summary = $query->selectRaw('
            COUNT(*) as total_submissions,
            SUM(CASE WHEN status = ? THEN 1 ELSE 0 END) as draft,
            SUM(CASE WHEN status = ? THEN 1 ELSE 0 END) as submitted,
            SUM(CASE WHEN status = ? THEN 1 ELSE 0 END) as approved,
            SUM(CASE WHEN status = ? THEN 1 ELSE 0 END) as rejected
        ', ['draft', 'submitted', 'approved', 'rejected'])->first();

        // Calculate trends (this month vs last month)
        $trends = $this->calculateTrends($filters);

        // Status distribution
        $statusDistribution = $this->getStatusDistribution($filters);

        return [
            'summary' => $summary,
            'trends' => $trends,
            'status_distribution' => $statusDistribution,
        ];
    }

    /**
     * Get time series trends data
     */
    public function getTrends(string $period, Carbon $from, Carbon $to, array $filters): array
    {
        $query = $this->applyFilters(
            DB::table('submissions')
                ->join('institutions', 'submissions.institution_id', '=', 'institutions.id')
                ->whereNull('submissions.deleted_at')
                ->whereBetween('submissions.created_at', [$from, $to]),
            $filters
        );

        // Determine date grouping based on period
        $dateFormat = match($period) {
            'daily' => 'DATE(submissions.created_at)',
            'weekly' => 'DATE_TRUNC(\'week\', submissions.created_at)',
            'monthly' => 'DATE_TRUNC(\'month\', submissions.created_at)',
            default => 'DATE(submissions.created_at)',
        };

        $trends = $query->selectRaw("
            $dateFormat as date,
            SUM(CASE WHEN status = ? THEN 1 ELSE 0 END) as draft,
            SUM(CASE WHEN status = ? THEN 1 ELSE 0 END) as submitted,
            SUM(CASE WHEN status = ? THEN 1 ELSE 0 END) as approved,
            SUM(CASE WHEN status = ? THEN 1 ELSE 0 END) as rejected,
            COUNT(*) as total
        ", ['draft', 'submitted', 'approved', 'rejected'])
        ->groupBy(DB::raw($dateFormat))
        ->orderBy(DB::raw($dateFormat))
        ->get();

        return $trends->toArray();
    }

    /**
     * Get institution breakdown with submission counts
     */
    public function getInstitutionBreakdown(array $filters): array
    {
        $query = $this->applyFilters(
            DB::table('submissions')
                ->join('institutions', 'submissions.institution_id', '=', 'institutions.id')
                ->whereNull('submissions.deleted_at'),
            $filters
        );

        $breakdown = $query->selectRaw('
            institutions.id,
            institutions.name,
            institutions.code,
            institutions.level,
            COUNT(*) as total_submissions,
            SUM(CASE WHEN status = ? THEN 1 ELSE 0 END) as draft,
            SUM(CASE WHEN status = ? THEN 1 ELSE 0 END) as submitted,
            SUM(CASE WHEN status = ? THEN 1 ELSE 0 END) as approved,
            SUM(CASE WHEN status = ? THEN 1 ELSE 0 END) as rejected
        ', ['draft', 'submitted', 'approved', 'rejected'])
        ->groupBy('institutions.id', 'institutions.name', 'institutions.code', 'institutions.level')
        ->orderBy('institutions.name')
        ->get();

        return $breakdown->toArray();
    }

    /**
     * Get questionnaire-specific statistics
     */
    public function getQuestionnaireStats(string $code, array $filters): array
    {
        $query = $this->applyFilters(
            DB::table('submissions')
                ->join('questionnaires', 'submissions.questionnaire_id', '=', 'questionnaires.id')
                ->join('institutions', 'submissions.institution_id', '=', 'institutions.id')
                ->where('questionnaires.code', $code)
                ->whereNull('submissions.deleted_at'),
            $filters
        );

        // Overall statistics
        $summary = $query->selectRaw('
            COUNT(*) as total_submissions,
            SUM(CASE WHEN status = ? THEN 1 ELSE 0 END) as draft,
            SUM(CASE WHEN status = ? THEN 1 ELSE 0 END) as submitted,
            SUM(CASE WHEN status = ? THEN 1 ELSE 0 END) as approved,
            SUM(CASE WHEN status = ? THEN 1 ELSE 0 END) as rejected
        ', ['draft', 'submitted', 'approved', 'rejected'])->first();

        // Version breakdown
        $versionBreakdown = $this->applyFilters(
            DB::table('submissions')
                ->join('questionnaires', 'submissions.questionnaire_id', '=', 'questionnaires.id')
                ->join('institutions', 'submissions.institution_id', '=', 'institutions.id')
                ->where('questionnaires.code', $code)
                ->whereNull('submissions.deleted_at'),
            $filters
        )
        ->selectRaw('
            questionnaires.version,
            COUNT(*) as count,
            SUM(CASE WHEN status = ? THEN 1 ELSE 0 END) as approved
        ', ['approved'])
        ->groupBy('questionnaires.version')
        ->orderBy('questionnaires.version', 'desc')
        ->get();

        return [
            'summary' => $summary,
            'version_breakdown' => $versionBreakdown->toArray(),
        ];
    }

    /**
     * Get status distribution
     */
    protected function getStatusDistribution(array $filters): array
    {
        $query = $this->applyFilters(
            DB::table('submissions')
                ->join('institutions', 'submissions.institution_id', '=', 'institutions.id')
                ->whereNull('submissions.deleted_at'),
            $filters
        );

        $distribution = $query->selectRaw('
            status,
            COUNT(*) as count
        ')
        ->groupBy('status')
        ->get();

        // Calculate percentages
        $total = $distribution->sum('count');

        return $distribution->map(function ($item) use ($total) {
            return [
                'status' => $item->status,
                'count' => $item->count,
                'percentage' => $total > 0 ? round(($item->count / $total) * 100, 2) : 0,
            ];
        })->toArray();
    }

    /**
     * Calculate trends (current vs previous period)
     */
    protected function calculateTrends(array $filters): array
    {
        $now = Carbon::now();
        $currentMonthStart = $now->copy()->startOfMonth();
        $lastMonthStart = $now->copy()->subMonth()->startOfMonth();
        $lastMonthEnd = $now->copy()->subMonth()->endOfMonth();

        // Current month data
        $currentFilters = array_merge($filters, [
            'date_from' => $currentMonthStart->toDateString(),
        ]);

        $currentQuery = $this->applyFilters(
            DB::table('submissions')
                ->join('institutions', 'submissions.institution_id', '=', 'institutions.id')
                ->whereNull('submissions.deleted_at'),
            $currentFilters
        );

        $currentMonth = $currentQuery->selectRaw('
            COUNT(*) as total,
            SUM(CASE WHEN status = ? THEN 1 ELSE 0 END) as approved,
            SUM(CASE WHEN status = ? THEN 1 ELSE 0 END) as rejected
        ', ['approved', 'rejected'])->first();

        // Last month data
        $lastFilters = array_merge($filters, [
            'date_from' => $lastMonthStart->toDateString(),
            'date_to' => $lastMonthEnd->toDateString(),
        ]);

        $lastQuery = $this->applyFilters(
            DB::table('submissions')
                ->join('institutions', 'submissions.institution_id', '=', 'institutions.id')
                ->whereNull('submissions.deleted_at'),
            $lastFilters
        );

        $lastMonth = $lastQuery->selectRaw('
            COUNT(*) as total,
            SUM(CASE WHEN status = ? THEN 1 ELSE 0 END) as approved,
            SUM(CASE WHEN status = ? THEN 1 ELSE 0 END) as rejected
        ', ['approved', 'rejected'])->first();

        // Calculate percentage changes
        $calculateChange = function ($current, $previous) {
            if ($previous == 0) {
                return $current > 0 ? 100 : 0;
            }
            return round((($current - $previous) / $previous) * 100, 2);
        };

        return [
            'total' => [
                'current' => $currentMonth->total ?? 0,
                'previous' => $lastMonth->total ?? 0,
                'change' => $calculateChange($currentMonth->total ?? 0, $lastMonth->total ?? 0),
            ],
            'approved' => [
                'current' => $currentMonth->approved ?? 0,
                'previous' => $lastMonth->approved ?? 0,
                'change' => $calculateChange($currentMonth->approved ?? 0, $lastMonth->approved ?? 0),
            ],
            'rejected' => [
                'current' => $currentMonth->rejected ?? 0,
                'previous' => $lastMonth->rejected ?? 0,
                'change' => $calculateChange($currentMonth->rejected ?? 0, $lastMonth->rejected ?? 0),
            ],
        ];
    }

    /**
     * Apply filters to query
     */
    protected function applyFilters($query, array $filters)
    {
        if (isset($filters['institution_id'])) {
            // Include institution and all children in hierarchy
            $institutionIds = $this->getInstitutionIdsWithChildren($filters['institution_id']);
            $query->whereIn('submissions.institution_id', $institutionIds);
        }

        if (isset($filters['date_from'])) {
            $query->where('submissions.created_at', '>=', $filters['date_from']);
        }

        if (isset($filters['date_to'])) {
            $query->where('submissions.created_at', '<=', $filters['date_to']);
        }

        if (isset($filters['questionnaire_code'])) {
            if (!str_contains($query->toSql(), 'questionnaires')) {
                $query->join('questionnaires', 'submissions.questionnaire_id', '=', 'questionnaires.id');
            }
            $query->where('questionnaires.code', $filters['questionnaire_code']);
        }

        if (isset($filters['status'])) {
            $query->where('submissions.status', $filters['status']);
        }

        return $query;
    }

    /**
     * Get institution IDs including all children in hierarchy
     */
    protected function getInstitutionIdsWithChildren(int $institutionId): array
    {
        // Use recursive CTE to get all descendant institutions
        $descendants = DB::select("
            WITH RECURSIVE institution_tree AS (
                SELECT id FROM institutions WHERE id = ?
                UNION ALL
                SELECT i.id
                FROM institutions i
                INNER JOIN institution_tree it ON i.parent_institution_id = it.id
            )
            SELECT id FROM institution_tree
        ", [$institutionId]);

        return array_column($descendants, 'id');
    }
}
