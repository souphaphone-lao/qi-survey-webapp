<?php

namespace App\Console\Commands;

use App\Models\ExportJob;
use App\Services\ExportService;
use Illuminate\Console\Command;

class CleanupExpiredExports extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'exports:cleanup';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Delete expired export files and jobs';

    /**
     * Execute the console command.
     */
    public function handle(ExportService $exportService): int
    {
        $this->info('Starting cleanup of expired exports...');

        // Get all expired exports
        $expiredExports = ExportJob::expired()->get();

        if ($expiredExports->isEmpty()) {
            $this->info('No expired exports found.');
            return Command::SUCCESS;
        }

        $count = $expiredExports->count();
        $this->info("Found {$count} expired export(s).");

        $deletedFiles = 0;
        $deletedRecords = 0;

        foreach ($expiredExports as $exportJob) {
            try {
                // Delete the file
                if ($exportService->deleteExport($exportJob)) {
                    $deletedFiles++;
                }

                // Delete the record
                $exportJob->delete();
                $deletedRecords++;

                $this->line("Deleted export #{$exportJob->id} ({$exportJob->questionnaire_code})");

            } catch (\Exception $e) {
                $this->error("Failed to delete export #{$exportJob->id}: {$e->getMessage()}");
            }
        }

        $this->info("Cleanup complete:");
        $this->line("  - Files deleted: {$deletedFiles}");
        $this->line("  - Records deleted: {$deletedRecords}");

        return Command::SUCCESS;
    }
}
