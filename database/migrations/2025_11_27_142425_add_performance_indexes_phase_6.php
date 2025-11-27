<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * This migration adds database indexes to improve query performance
     * across the application, especially for dashboard and reporting queries.
     */
    public function up(): void
    {
        // Using raw SQL with CREATE INDEX IF NOT EXISTS for PostgreSQL compatibility
        $indexes = [
            // Submissions table indexes
            'CREATE INDEX IF NOT EXISTS submissions_submitted_at_index ON submissions (submitted_at)',
            'CREATE INDEX IF NOT EXISTS submissions_approved_at_index ON submissions (approved_at)',
            'CREATE INDEX IF NOT EXISTS submissions_rejected_at_index ON submissions (rejected_at)',
            'CREATE INDEX IF NOT EXISTS submissions_deleted_at_index ON submissions (deleted_at)',
            'CREATE INDEX IF NOT EXISTS submissions_approved_by_index ON submissions (approved_by)',
            'CREATE INDEX IF NOT EXISTS submissions_rejected_by_index ON submissions (rejected_by)',
            'CREATE INDEX IF NOT EXISTS submissions_updated_by_index ON submissions (updated_by)',
            'CREATE INDEX IF NOT EXISTS idx_status_institution ON submissions (status, institution_id)',
            'CREATE INDEX IF NOT EXISTS idx_status_questionnaire ON submissions (status, questionnaire_id)',
            'CREATE INDEX IF NOT EXISTS idx_institution_status ON submissions (institution_id, status)',
            'CREATE INDEX IF NOT EXISTS idx_deleted_created ON submissions (deleted_at, created_at)',
            'CREATE INDEX IF NOT EXISTS idx_status_created ON submissions (status, created_at)',

            // Users table indexes
            'CREATE INDEX IF NOT EXISTS users_is_active_index ON users (is_active)',
            'CREATE INDEX IF NOT EXISTS idx_institution_active_users ON users (institution_id, is_active)',
            'CREATE INDEX IF NOT EXISTS users_deleted_at_index ON users (deleted_at)',

            // Institutions table indexes (code, level, is_active already indexed)
            'CREATE INDEX IF NOT EXISTS idx_parent_level ON institutions (parent_institution_id, level)',
            'CREATE INDEX IF NOT EXISTS idx_active_level ON institutions (is_active, level)',
            'CREATE INDEX IF NOT EXISTS institutions_deleted_at_index ON institutions (deleted_at)',

            // Questionnaires table indexes
            'CREATE INDEX IF NOT EXISTS questionnaires_is_active_index ON questionnaires (is_active)',
            'CREATE INDEX IF NOT EXISTS questionnaires_published_at_index ON questionnaires (published_at)',
            'CREATE INDEX IF NOT EXISTS questionnaires_deprecated_at_index ON questionnaires (deprecated_at)',
            'CREATE INDEX IF NOT EXISTS idx_version_active ON questionnaires (version, is_active)',
            'CREATE INDEX IF NOT EXISTS questionnaires_deleted_at_index ON questionnaires (deleted_at)',

            // Question permissions table indexes (question_name, questionnaire_id already indexed)
            'CREATE INDEX IF NOT EXISTS idx_question_department ON question_permissions (question_name, department_id)',
            'CREATE INDEX IF NOT EXISTS question_permissions_department_id_index ON question_permissions (department_id)',
            'CREATE INDEX IF NOT EXISTS question_permissions_permission_type_index ON question_permissions (permission_type)',

            // Departments table indexes
            'CREATE INDEX IF NOT EXISTS departments_is_active_index ON departments (is_active)',
            'CREATE INDEX IF NOT EXISTS idx_dept_institution_active ON departments (institution_id, is_active)',
            'CREATE INDEX IF NOT EXISTS departments_code_index ON departments (code)',
            'CREATE INDEX IF NOT EXISTS departments_deleted_at_index ON departments (deleted_at)',

            // Export jobs table indexes (user_id, status, expires_at already indexed)
            'CREATE INDEX IF NOT EXISTS idx_user_status ON export_jobs (user_id, status)',
            'CREATE INDEX IF NOT EXISTS export_jobs_questionnaire_code_index ON export_jobs (questionnaire_code)',
            'CREATE INDEX IF NOT EXISTS export_jobs_created_at_index ON export_jobs (created_at)',
            'CREATE INDEX IF NOT EXISTS idx_status_created_exports ON export_jobs (status, created_at)',
        ];

        foreach ($indexes as $sql) {
            DB::statement($sql);
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Drop indexes (IF EXISTS for safety)
        $indexes = [
            'DROP INDEX IF EXISTS idx_status_created_exports',
            'DROP INDEX IF EXISTS export_jobs_created_at_index',
            'DROP INDEX IF EXISTS export_jobs_questionnaire_code_index',
            'DROP INDEX IF EXISTS idx_user_status',

            'DROP INDEX IF EXISTS departments_deleted_at_index',
            'DROP INDEX IF EXISTS departments_code_index',
            'DROP INDEX IF EXISTS idx_dept_institution_active',
            'DROP INDEX IF EXISTS departments_is_active_index',

            'DROP INDEX IF EXISTS question_permissions_permission_type_index',
            'DROP INDEX IF EXISTS question_permissions_department_id_index',
            'DROP INDEX IF EXISTS idx_question_department',

            'DROP INDEX IF EXISTS questionnaires_deleted_at_index',
            'DROP INDEX IF EXISTS idx_version_active',
            'DROP INDEX IF EXISTS questionnaires_deprecated_at_index',
            'DROP INDEX IF EXISTS questionnaires_published_at_index',
            'DROP INDEX IF EXISTS questionnaires_is_active_index',

            'DROP INDEX IF EXISTS institutions_deleted_at_index',
            'DROP INDEX IF EXISTS idx_active_level',
            'DROP INDEX IF EXISTS idx_parent_level',

            'DROP INDEX IF EXISTS users_deleted_at_index',
            'DROP INDEX IF EXISTS idx_institution_active_users',
            'DROP INDEX IF EXISTS users_is_active_index',

            'DROP INDEX IF EXISTS idx_status_created',
            'DROP INDEX IF EXISTS idx_deleted_created',
            'DROP INDEX IF EXISTS idx_institution_status',
            'DROP INDEX IF EXISTS idx_status_questionnaire',
            'DROP INDEX IF EXISTS idx_status_institution',
            'DROP INDEX IF EXISTS submissions_updated_by_index',
            'DROP INDEX IF EXISTS submissions_rejected_by_index',
            'DROP INDEX IF EXISTS submissions_approved_by_index',
            'DROP INDEX IF EXISTS submissions_deleted_at_index',
            'DROP INDEX IF EXISTS submissions_rejected_at_index',
            'DROP INDEX IF EXISTS submissions_approved_at_index',
            'DROP INDEX IF EXISTS submissions_submitted_at_index',
        ];

        foreach ($indexes as $sql) {
            DB::statement($sql);
        }
    }
};
