<?php

namespace App\Jobs;

use App\Models\ExportJob;
use App\Services\ExportService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class GenerateExportJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    /**
     * The number of times the job may be attempted.
     */
    public $tries = 3;

    /**
     * The number of seconds the job can run before timing out.
     */
    public $timeout = 600; // 10 minutes

    /**
     * Create a new job instance.
     */
    public function __construct(
        public ExportJob $exportJob
    ) {}

    /**
     * Execute the job.
     */
    public function handle(ExportService $exportService): void
    {
        try {
            Log::info('Starting export generation', [
                'export_job_id' => $this->exportJob->id,
                'questionnaire_code' => $this->exportJob->questionnaire_code,
                'format' => $this->exportJob->format,
            ]);

            $exportService->generateExport($this->exportJob);

            Log::info('Export generation completed successfully', [
                'export_job_id' => $this->exportJob->id,
                'file_path' => $this->exportJob->file_path,
            ]);

        } catch (\Exception $e) {
            Log::error('Export generation failed', [
                'export_job_id' => $this->exportJob->id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            // The exception will be caught by Laravel's queue system
            // and the job will be retried based on the $tries property
            throw $e;
        }
    }

    /**
     * Handle a job failure.
     */
    public function failed(\Throwable $exception): void
    {
        Log::error('Export job failed after all retries', [
            'export_job_id' => $this->exportJob->id,
            'error' => $exception->getMessage(),
        ]);

        // Mark the export job as failed
        $this->exportJob->markAsFailed($exception->getMessage());
    }
}
