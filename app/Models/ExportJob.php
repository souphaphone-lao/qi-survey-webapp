<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ExportJob extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'questionnaire_code',
        'format',
        'status',
        'filters',
        'file_path',
        'file_size',
        'error_message',
        'started_at',
        'completed_at',
        'expires_at',
    ];

    protected $casts = [
        'filters' => 'array',
        'started_at' => 'datetime',
        'completed_at' => 'datetime',
        'expires_at' => 'datetime',
    ];

    /**
     * Get the user who created the export job
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Check if the export is pending
     */
    public function isPending(): bool
    {
        return $this->status === 'pending';
    }

    /**
     * Check if the export is processing
     */
    public function isProcessing(): bool
    {
        return $this->status === 'processing';
    }

    /**
     * Check if the export is completed
     */
    public function isCompleted(): bool
    {
        return $this->status === 'completed';
    }

    /**
     * Check if the export failed
     */
    public function isFailed(): bool
    {
        return $this->status === 'failed';
    }

    /**
     * Check if the export has expired
     */
    public function isExpired(): bool
    {
        return $this->expires_at !== null && $this->expires_at->isPast();
    }

    /**
     * Mark the export as processing
     */
    public function markAsProcessing(): void
    {
        $this->update([
            'status' => 'processing',
            'started_at' => now(),
        ]);
    }

    /**
     * Mark the export as completed
     */
    public function markAsCompleted(string $filePath, int $fileSize): void
    {
        $this->update([
            'status' => 'completed',
            'file_path' => $filePath,
            'file_size' => $fileSize,
            'completed_at' => now(),
            'expires_at' => now()->addHours(24), // Expire after 24 hours
        ]);
    }

    /**
     * Mark the export as failed
     */
    public function markAsFailed(string $errorMessage): void
    {
        $this->update([
            'status' => 'failed',
            'error_message' => $errorMessage,
            'completed_at' => now(),
        ]);
    }

    /**
     * Scope to get only expired exports
     */
    public function scopeExpired($query)
    {
        return $query->where('expires_at', '<', now())
                     ->whereNotNull('expires_at');
    }

    /**
     * Scope to get exports by status
     */
    public function scopeStatus($query, string $status)
    {
        return $query->where('status', $status);
    }
}
