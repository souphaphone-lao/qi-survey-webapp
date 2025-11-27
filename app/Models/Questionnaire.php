<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Questionnaire extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'code',
        'version',
        'title',
        'description',
        'surveyjs_json',
        'is_active',
        'parent_version_id',
        'published_at',
        'deprecated_at',
        'version_notes',
        'breaking_changes',
        'created_by',
        'updated_by',
    ];

    protected function casts(): array
    {
        return [
            'surveyjs_json' => 'array',
            'is_active' => 'boolean',
            'breaking_changes' => 'boolean',
            'version' => 'integer',
            'published_at' => 'datetime',
            'deprecated_at' => 'datetime',
        ];
    }

    public function submissions(): HasMany
    {
        return $this->hasMany(Submission::class);
    }

    public function questionPermissions(): HasMany
    {
        return $this->hasMany(QuestionPermission::class);
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function updatedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'updated_by');
    }

    public function parentVersion(): BelongsTo
    {
        return $this->belongsTo(Questionnaire::class, 'parent_version_id');
    }

    public function childVersions(): HasMany
    {
        return $this->hasMany(Questionnaire::class, 'parent_version_id');
    }

    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    public function scopeByCode($query, string $code)
    {
        return $query->where('code', $code);
    }

    public function duplicate(): self
    {
        $latestVersion = static::where('code', $this->code)->max('version');

        $newQuestionnaire = $this->replicate();
        $newQuestionnaire->version = $latestVersion + 1;
        $newQuestionnaire->parent_version_id = $this->id;
        $newQuestionnaire->is_active = false;
        $newQuestionnaire->published_at = null;
        $newQuestionnaire->deprecated_at = null;
        $newQuestionnaire->version_notes = null;
        $newQuestionnaire->breaking_changes = false;
        $newQuestionnaire->save();

        return $newQuestionnaire;
    }

    /**
     * Extract question names from SurveyJS JSON schema.
     */
    public function extractQuestionNames(): array
    {
        if (empty($this->surveyjs_json)) {
            return [];
        }

        $questionNames = [];

        // Parse pages
        $pages = $this->surveyjs_json['pages'] ?? [];
        foreach ($pages as $page) {
            $elements = $page['elements'] ?? [];
            $questionNames = array_merge(
                $questionNames,
                $this->extractQuestionsFromElements($elements)
            );
        }

        return array_unique($questionNames);
    }

    /**
     * Recursively extract question names from elements (handles panels).
     */
    private function extractQuestionsFromElements(array $elements): array
    {
        $questionNames = [];

        foreach ($elements as $element) {
            // Add question name if it exists
            if (isset($element['name'])) {
                $questionNames[] = $element['name'];
            }

            // Handle nested elements (panels, etc.)
            if (isset($element['elements'])) {
                $questionNames = array_merge(
                    $questionNames,
                    $this->extractQuestionsFromElements($element['elements'])
                );
            }
        }

        return $questionNames;
    }
}
