<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Institution extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'name',
        'code',
        'level',
        'parent_institution_id',
        'is_active',
        'created_by',
        'updated_by',
    ];

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
        ];
    }

    public function parent(): BelongsTo
    {
        return $this->belongsTo(Institution::class, 'parent_institution_id');
    }

    public function children(): HasMany
    {
        return $this->hasMany(Institution::class, 'parent_institution_id');
    }

    public function users(): HasMany
    {
        return $this->hasMany(User::class);
    }

    public function departments(): HasMany
    {
        return $this->hasMany(Department::class);
    }

    public function submissions(): HasMany
    {
        return $this->hasMany(Submission::class);
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function updatedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'updated_by');
    }

    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    public function scopeByLevel($query, string $level)
    {
        return $query->where('level', $level);
    }

    /**
     * Get all descendants of this institution recursively.
     */
    public function descendants(): \Illuminate\Support\Collection
    {
        $descendants = collect();

        foreach ($this->children as $child) {
            $descendants->push($child);
            $descendants = $descendants->merge($child->descendants());
        }

        return $descendants;
    }

    /**
     * Get all ancestors of this institution up to the root.
     */
    public function ancestors(): \Illuminate\Support\Collection
    {
        $ancestors = collect();

        $current = $this->parent;
        while ($current) {
            $ancestors->push($current);
            $current = $current->parent;
        }

        return $ancestors;
    }

    /**
     * Check if this institution is a descendant of another institution.
     */
    public function isDescendantOf(Institution $institution): bool
    {
        return $this->ancestors()->contains('id', $institution->id);
    }

    /**
     * Check if this institution is an ancestor of another institution.
     */
    public function isAncestorOf(Institution $institution): bool
    {
        return $this->descendants()->contains('id', $institution->id);
    }

    /**
     * Get viewable institution IDs (self + all descendants).
     */
    public function getViewableInstitutionIds(): array
    {
        return $this->descendants()
            ->pluck('id')
            ->prepend($this->id)
            ->toArray();
    }
}
