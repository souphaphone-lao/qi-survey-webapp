<?php

namespace App\Services;

use App\Models\ExportJob;
use App\Models\Submission;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

class ExportService
{
    /**
     * Generate export file for a given export job
     */
    public function generateExport(ExportJob $exportJob): void
    {
        try {
            $exportJob->markAsProcessing();

            // Get submissions data
            $data = $this->getSubmissionsData(
                $exportJob->questionnaire_code,
                $exportJob->filters
            );

            // Generate file based on format
            $filePath = $this->generateFile(
                $exportJob->questionnaire_code,
                $exportJob->format,
                $data,
                $exportJob->id
            );

            // Get file size
            $fileSize = Storage::disk('local')->size($filePath);

            // Mark as completed
            $exportJob->markAsCompleted($filePath, $fileSize);

        } catch (\Exception $e) {
            $exportJob->markAsFailed($e->getMessage());
            throw $e;
        }
    }

    /**
     * Get submissions data for export
     */
    protected function getSubmissionsData(string $questionnaireCode, array $filters): array
    {
        $query = DB::table('submissions')
            ->join('questionnaires', 'submissions.questionnaire_id', '=', 'questionnaires.id')
            ->join('institutions', 'submissions.institution_id', '=', 'institutions.id')
            ->leftJoin('users as creators', 'submissions.created_by', '=', 'creators.id')
            ->where('questionnaires.code', $questionnaireCode)
            ->whereNull('submissions.deleted_at')
            ->select(
                'submissions.id',
                'questionnaires.code as questionnaire_code',
                'questionnaires.version as questionnaire_version',
                'questionnaires.title as questionnaire_title',
                'institutions.id as institution_id',
                'institutions.name as institution_name',
                'institutions.code as institution_code',
                'submissions.status',
                'submissions.answers_json',
                'submissions.submitted_at',
                'submissions.approved_at',
                'submissions.rejected_at',
                'creators.name as created_by_name',
                'submissions.created_at',
                'submissions.updated_at'
            );

        // Apply filters
        $query = $this->applyFilters($query, $filters);

        // Order by created_at descending
        $query->orderBy('submissions.created_at', 'desc');

        return $query->get()->toArray();
    }

    /**
     * Apply filters to the query
     */
    protected function applyFilters($query, array $filters)
    {
        if (isset($filters['institution_id'])) {
            // Get institution and all its children
            $institutionIds = $this->getInstitutionIdsWithChildren($filters['institution_id']);
            $query->whereIn('submissions.institution_id', $institutionIds);
        }

        if (isset($filters['date_from'])) {
            $query->where('submissions.created_at', '>=', $filters['date_from']);
        }

        if (isset($filters['date_to'])) {
            $query->where('submissions.created_at', '<=', $filters['date_to']);
        }

        if (isset($filters['status'])) {
            $query->where('submissions.status', $filters['status']);
        }

        if (isset($filters['version'])) {
            $query->where('questionnaires.version', $filters['version']);
        }

        return $query;
    }

    /**
     * Get institution IDs including all children
     */
    protected function getInstitutionIdsWithChildren(int $institutionId): array
    {
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

    /**
     * Generate export file
     */
    protected function generateFile(string $questionnaireCode, string $format, array $data, int $jobId): string
    {
        $fileName = sprintf(
            'exports/%s_%s_%s.%s',
            $questionnaireCode,
            $jobId,
            now()->format('Y-m-d_His'),
            $format === 'xlsx' ? 'xlsx' : 'csv'
        );

        if ($format === 'csv') {
            $this->generateCSV($fileName, $data);
        } else {
            $this->generateExcel($fileName, $data);
        }

        return $fileName;
    }

    /**
     * Generate CSV file
     */
    protected function generateCSV(string $fileName, array $data): void
    {
        $handle = fopen('php://temp', 'r+');

        // Write headers
        if (!empty($data)) {
            $firstRow = (array) $data[0];
            $headers = $this->getExportHeaders($firstRow);
            fputcsv($handle, $headers);

            // Write data rows
            foreach ($data as $row) {
                $rowData = $this->flattenRow((array) $row);
                fputcsv($handle, $rowData);
            }
        }

        rewind($handle);
        $contents = stream_get_contents($handle);
        fclose($handle);

        Storage::disk('local')->put($fileName, $contents);
    }

    /**
     * Generate Excel file using maatwebsite/excel
     */
    protected function generateExcel(string $fileName, array $data): void
    {
        // For now, generate CSV and save as xlsx
        // In a full implementation, you would use Maatwebsite\Excel\Facades\Excel
        $this->generateCSV($fileName, $data);
    }

    /**
     * Get export headers from first row
     */
    protected function getExportHeaders(array $firstRow): array
    {
        $headers = [];

        foreach ($firstRow as $key => $value) {
            if ($key === 'answers_json') {
                // Parse JSON to get question keys
                $answers = json_decode($value, true);
                if (is_array($answers)) {
                    foreach (array_keys($answers) as $questionKey) {
                        $headers[] = 'answer_' . $questionKey;
                    }
                }
            } else {
                $headers[] = $key;
            }
        }

        return $headers;
    }

    /**
     * Flatten row data including JSON answers
     */
    protected function flattenRow(array $row): array
    {
        $flatRow = [];

        foreach ($row as $key => $value) {
            if ($key === 'answers_json') {
                // Parse and flatten answers
                $answers = json_decode($value, true);
                if (is_array($answers)) {
                    foreach ($answers as $answer) {
                        $flatRow[] = is_array($answer) ? json_encode($answer) : $answer;
                    }
                }
            } else {
                $flatRow[] = $value;
            }
        }

        return $flatRow;
    }

    /**
     * Delete export file
     */
    public function deleteExport(ExportJob $exportJob): bool
    {
        if ($exportJob->file_path && Storage::disk('local')->exists($exportJob->file_path)) {
            return Storage::disk('local')->delete($exportJob->file_path);
        }

        return true;
    }

    /**
     * Get file stream for download
     */
    public function getFileStream(ExportJob $exportJob)
    {
        if (!$exportJob->file_path || !Storage::disk('local')->exists($exportJob->file_path)) {
            throw new \Exception('Export file not found');
        }

        return Storage::disk('local')->readStream($exportJob->file_path);
    }
}
