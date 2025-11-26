<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class QuestionPermission extends Model
{
    use HasFactory;

    protected $fillable = [
        'questionnaire_id',
        'question_name',
        'institution_id',
        'department_id',
        'permission_type',
        'created_by',
    ];

    public function questionnaire(): BelongsTo
    {
        return $this->belongsTo(Questionnaire::class);
    }

    public function institution(): BelongsTo
    {
        return $this->belongsTo(Institution::class);
    }

    public function department(): BelongsTo
    {
        return $this->belongsTo(Department::class);
    }

    public function scopeForUser($query, User $user)
    {
        return $query->where('institution_id', $user->institution_id)
                     ->where('department_id', $user->department_id);
    }
}
