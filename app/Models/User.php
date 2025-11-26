<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\HasApiTokens;
use Spatie\Permission\Traits\HasRoles;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, HasRoles, Notifiable, SoftDeletes;

    protected $fillable = [
        'name',
        'email',
        'password',
        'institution_id',
        'department_id',
        'notification_preferences',
        'is_active',
        'failed_login_attempts',
        'locked_until',
        'last_login_at',
        'created_by',
        'updated_by',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'notification_preferences' => 'array',
            'is_active' => 'boolean',
            'locked_until' => 'datetime',
            'last_login_at' => 'datetime',
        ];
    }

    public function institution(): BelongsTo
    {
        return $this->belongsTo(Institution::class);
    }

    public function department(): BelongsTo
    {
        return $this->belongsTo(Department::class);
    }

    public function submissions(): HasMany
    {
        return $this->hasMany(Submission::class, 'created_by');
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function updatedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'updated_by');
    }

    public function isLocked(): bool
    {
        return $this->locked_until && $this->locked_until->isFuture();
    }

    public function incrementFailedLoginAttempts(): void
    {
        $this->increment('failed_login_attempts');

        if ($this->failed_login_attempts >= 5) {
            $this->update(['locked_until' => now()->addMinutes(15)]);
        }
    }

    public function resetFailedLoginAttempts(): void
    {
        DB::table($this->getTable())
            ->where('id', $this->id)
            ->update([
                'failed_login_attempts' => 0,
                'locked_until' => null,
                'last_login_at' => now(),
                'updated_at' => now(),
            ]);
        $this->refresh();
    }

    public function wantsEmailNotification(string $event): bool
    {
        $prefs = $this->notification_preferences ?? self::defaultNotificationPreferences();
        return ($prefs['email_enabled'] ?? true) && ($prefs['events'][$event] ?? true);
    }

    public function wantsInAppNotification(string $event): bool
    {
        $prefs = $this->notification_preferences ?? self::defaultNotificationPreferences();
        return ($prefs['in_app_enabled'] ?? true) && ($prefs['events'][$event] ?? true);
    }

    public static function defaultNotificationPreferences(): array
    {
        return [
            'email_enabled' => true,
            'in_app_enabled' => true,
            'events' => [
                'submission_created' => true,
                'submission_submitted' => true,
                'submission_approved' => true,
                'submission_rejected' => true,
            ],
        ];
    }

    /**
     * Get viewable institution IDs for the user (self + descendants).
     */
    public function getViewableInstitutionIds(): array
    {
        if (!$this->institution_id) {
            return [];
        }

        return $this->institution->getViewableInstitutionIds();
    }
}
