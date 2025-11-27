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
        Schema::create('export_jobs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->string('questionnaire_code', 50);
            $table->string('format', 10); // csv, xlsx
            $table->string('status', 20)->default('pending'); // pending, processing, completed, failed
            $table->json('filters')->default('{}');
            $table->string('file_path')->nullable();
            $table->bigInteger('file_size')->nullable();
            $table->text('error_message')->nullable();
            $table->timestamp('started_at')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->timestamp('expires_at')->nullable();
            $table->timestamps();

            $table->index('user_id');
            $table->index('status');
            $table->index('expires_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('export_jobs');
    }
};
