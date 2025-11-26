<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Facades\DB;

class Submission extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'questionnaire_id',
        'institution_id',
        'status',
        'answers_json',
        'submitted_at',
        'approved_at',
        'rejected_at',
        'approved_by',
        'rejected_by',
        'rejection_comments',
        'created_by',
        'updated_by',
        'deleted_by',
    ];

    protected function casts(): array
    {
        return [
            'answers_json' => 'array',
            'submitted_at' => 'datetime',
            'approved_at' => 'datetime',
            'rejected_at' => 'datetime',
        ];
    }

    public function questionnaire(): BelongsTo
    {
        return $this->belongsTo(Questionnaire::class);
    }

    public function institution(): BelongsTo
    {
        return $this->belongsTo(Institution::class);
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function updatedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'updated_by');
    }

    public function approvedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    public function rejectedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'rejected_by');
    }

    public function deletedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'deleted_by');
    }

    public function scopeByStatus($query, string $status)
    {
        return $query->where('status', $status);
    }

    public function scopeDraft($query)
    {
        return $query->byStatus('draft');
    }

    public function scopeSubmitted($query)
    {
        return $query->byStatus('submitted');
    }

    public function scopeApproved($query)
    {
        return $query->byStatus('approved');
    }

    public function scopeRejected($query)
    {
        return $query->byStatus('rejected');
    }

    public function isDraft(): bool
    {
        return $this->status === 'draft';
    }

    public function isSubmitted(): bool
    {
        return $this->status === 'submitted';
    }

    public function isApproved(): bool
    {
        return $this->status === 'approved';
    }

    public function isRejected(): bool
    {
        return $this->status === 'rejected';
    }

    public function canBeEdited(): bool
    {
        return $this->isDraft() || $this->isRejected();
    }

    public function submit(): void
    {
        DB::table($this->getTable())
            ->where('id', $this->id)
            ->update([
                'status' => 'submitted',
                'submitted_at' => now(),
                'updated_at' => now(),
            ]);
        $this->refresh();
    }

    public function approve(int $userId): void
    {
        DB::table($this->getTable())
            ->where('id', $this->id)
            ->update([
                'status' => 'approved',
                'approved_at' => now(),
                'approved_by' => $userId,
                'updated_at' => now(),
            ]);
        $this->refresh();
    }

    public function reject(int $userId, string $comments): void
    {
        DB::table($this->getTable())
            ->where('id', $this->id)
            ->update([
                'status' => 'rejected',
                'rejected_at' => now(),
                'rejected_by' => $userId,
                'rejection_comments' => $comments,
                'updated_at' => now(),
            ]);
        $this->refresh();
    }
}
