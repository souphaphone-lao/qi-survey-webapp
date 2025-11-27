<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('questionnaires', function (Blueprint $table) {
            $table->foreignId('parent_version_id')
                ->nullable()
                ->after('version')
                ->constrained('questionnaires')
                ->onDelete('set null')
                ->comment('Reference to previous version if duplicated');

            $table->timestamp('published_at')
                ->nullable()
                ->after('is_active')
                ->comment('When this version was activated');

            $table->timestamp('deprecated_at')
                ->nullable()
                ->after('published_at')
                ->comment('When this version was deactivated');

            $table->text('version_notes')
                ->nullable()
                ->after('description')
                ->comment('Change notes for this version');

            $table->boolean('breaking_changes')
                ->default(false)
                ->after('version_notes')
                ->comment('Whether this version has breaking changes');
        });

        // Add indexes for performance
        Schema::table('questionnaires', function (Blueprint $table) {
            $table->index('parent_version_id');
            $table->index(['code', 'is_active']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('questionnaires', function (Blueprint $table) {
            $table->dropForeign(['parent_version_id']);
            $table->dropIndex(['parent_version_id']);
            $table->dropIndex(['code', 'is_active']);
            $table->dropColumn([
                'parent_version_id',
                'published_at',
                'deprecated_at',
                'version_notes',
                'breaking_changes',
            ]);
        });
    }
};
