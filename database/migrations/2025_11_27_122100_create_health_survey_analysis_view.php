<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Skip view creation in SQLite (test environment)
        if (DB::getDriverName() === 'sqlite') {
            return;
        }

        DB::statement(
            file_get_contents(database_path('sql/views/health_survey_analysis.sql'))
        );
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Skip view deletion in SQLite (test environment)
        if (DB::getDriverName() === 'sqlite') {
            return;
        }

        DB::statement('DROP VIEW IF EXISTS health_survey_analysis');
    }
};
