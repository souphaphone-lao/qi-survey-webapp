# Phase 2 Implementation Plan: Multi-Institution & Permissions

**Version:** 1.0
**Date:** November 26, 2025
**Duration:** 6 weeks
**Goal:** Hierarchical institutions, per-question permissions, collaborative editing, and notification system

---

> **⚠️ PLAN SUPERSEDED - DO NOT IMPLEMENT**
>
> This plan has been **superseded** by [department-implementation-plan.md](department-implementation-plan.md).
>
> **Reason:** Department requirements necessitate a different `question_permissions` schema that is incompatible with this plan:
> - **This plan**: `question_permissions` uses only `institution_id` for permissions
> - **Department plan**: `question_permissions` uses `institution_id` + `department_id` (required for collaborative editing within institutions)
>
> **What happened to this plan's features:**
> - ✅ **Notification system** - Fully integrated into department implementation plan
> - ✅ **Institution hierarchy** - Already implemented in Phase 1, preserved in department plan
> - ✅ **Submission workflow** - Already implemented in Phase 1, enhanced with events in department plan
> - ⚠️ **Question permissions** - Replaced with department-aware permissions (institution + department composite key)
>
> **Action Required:** Use [department-implementation-plan.md](department-implementation-plan.md) for all implementation work.

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Current State Analysis](#2-current-state-analysis)
3. [Phase 2 Goals & Success Criteria](#3-phase-2-goals--success-criteria)
4. [Technical Implementation Plan](#4-technical-implementation-plan)
5. [Week-by-Week Breakdown](#5-week-by-week-breakdown)
6. [Testing Strategy](#6-testing-strategy)
7. [Risk Mitigation](#7-risk-mitigation)
8. [Deployment & Rollout](#8-deployment--rollout)
9. [Appendix](#9-appendix)

---

## 1. Executive Summary

Phase 2 transforms the application from a single-institution survey tool into a multi-institution collaborative platform with granular permissions and workflow management. This phase enables district-level data collection, provincial review, and central oversight with question-level permission control.

**Key Deliverables:**
- Question-level permission system for multi-institution collaboration
- Complete submission workflow (draft → submitted → approved/rejected)
- Email and in-app notification system
- Permission configuration UI for administrators
- Hierarchical data access and approval workflows

---

## 2. Current State Analysis

### 2.1 Already Implemented (Phase 1)

✅ **Database Schema:**
- `institutions` table with hierarchy fields (`parent_institution_id`, `level`)
- `submissions` table with workflow fields (`status`, `submitted_at`, `approved_at`, `rejected_at`, `rejection_comments`)
- Spatie permission tables (`roles`, `permissions`, `role_has_permissions`, etc.)
- Audit trail fields (`created_by`, `updated_by`, `deleted_by`)

✅ **Models:**
- `Institution` model with parent/children relationships
- `Submission` model with workflow methods (`submit()`, `approve()`, `reject()`)
- User authentication with Laravel Sanctum
- Role-based access control with Spatie

✅ **Basic Features:**
- User management with roles (admin, enumerator, viewer)
- Institution CRUD operations
- Questionnaire management (SurveyJS)
- Submission creation and editing

### 2.2 Missing Components (To Be Implemented)

❌ **Database:**
- `question_permissions` table for per-question permissions
- Indexes for performance optimization

❌ **Models & Business Logic:**
- `QuestionPermission` model
- Hierarchical access control helpers
- Permission checking service
- Notification event system

❌ **API Endpoints:**
- Question permission management
- Notification endpoints
- Workflow transition endpoints with notifications

❌ **Frontend:**
- Permission configuration UI
- Notification bell/dropdown component
- Workflow management UI (approve/reject modals)
- Permission-aware form rendering

❌ **Infrastructure:**
- Email notification templates
- Queue workers for async notifications
- Event listeners for workflow transitions

---

## 3. Phase 2 Goals & Success Criteria

### 3.1 Feature Goals

**F1: Per-Question Permission System**
- Admins can assign view/edit permissions to specific institutions for each question
- Permissions enforced on both frontend (UI) and backend (API)
- Permission matrix UI for bulk assignment

**F2: Hierarchical Data Access**
- Central users VIEW all submissions from provinces and districts
- Province users VIEW submissions from their districts
- EDIT access controlled by question permissions only
- Approval authority cascades down the hierarchy

**F3: Submission Workflow Management**
- Draft → Submitted → Approved/Rejected state transitions
- Rejection comments required on reject action
- Resubmission capability after rejection
- Status transition audit trail

**F4: Notification System**
- Email notifications for workflow events
- In-app notifications with unread count badge
- Notification preferences per user
- Hierarchical notification routing

### 3.2 Success Criteria

**Functional:**
- [ ] District enumerator creates submission with district questions only
- [ ] Province admin receives notification of new submission
- [ ] Province admin can approve/reject district portion
- [ ] Province admin fills province questions (if permitted)
- [ ] Central admin receives notification when province completes
- [ ] Central admin fills central questions and gives final approval
- [ ] Rejected submissions return to creator with comments
- [ ] All workflow transitions generate appropriate notifications

**Technical:**
- [ ] API response time < 500ms for permission checks
- [ ] Email notifications sent within 30 seconds of trigger
- [ ] In-app notifications appear in real-time (or on next page load)
- [ ] Zero unauthorized data access (verified by tests)
- [ ] Permission changes take effect immediately

**Quality:**
- [ ] 100% test coverage for permission checks
- [ ] 100% test coverage for workflow transitions
- [ ] Zero security vulnerabilities in permission system
- [ ] All API endpoints properly authorized

---

## 4. Technical Implementation Plan

### 4.1 Database Layer

#### 4.1.1 Create `question_permissions` Table

**Migration:** `2025_11_26_create_question_permissions_table.php`

```php
Schema::create('question_permissions', function (Blueprint $table) {
    $table->id();
    $table->foreignId('questionnaire_id')
        ->constrained('questionnaires')
        ->cascadeOnDelete();
    $table->string('question_name');
    $table->foreignId('institution_id')
        ->constrained('institutions')
        ->cascadeOnDelete();
    $table->boolean('can_view')->default(true);
    $table->boolean('can_edit')->default(false);
    $table->foreignId('created_by')->nullable()
        ->constrained('users')
        ->nullOnDelete();
    $table->foreignId('updated_by')->nullable()
        ->constrained('users')
        ->nullOnDelete();
    $table->timestamps();

    // Unique constraint
    $table->unique(
        ['questionnaire_id', 'question_name', 'institution_id'],
        'qp_quest_qname_inst_unique'
    );

    // Indexes
    $table->index('questionnaire_id');
    $table->index('institution_id');
    $table->index(['questionnaire_id', 'institution_id'], 'qp_quest_inst_idx');
});
```

**Rationale:**
- Composite unique key prevents duplicate permissions
- Cascading delete ensures orphaned permissions are cleaned up
- Indexes optimize common query patterns (fetch all permissions for a questionnaire/institution)

#### 4.1.2 Create Notifications Table

Laravel provides this by default, but verify it exists:

```bash
php artisan notifications:table
php artisan migrate
```

#### 4.1.3 Add User Notification Preferences

**Migration:** `2025_11_26_add_notification_preferences_to_users_table.php`

```php
Schema::table('users', function (Blueprint $table) {
    $table->jsonb('notification_preferences')->nullable()->after('email');
});
```

**Default Structure:**
```json
{
  "email_enabled": true,
  "in_app_enabled": true,
  "events": {
    "submission_created": true,
    "submission_submitted": true,
    "submission_approved": true,
    "submission_rejected": true
  }
}
```

---

### 4.2 Models & Relationships

#### 4.2.1 Create `QuestionPermission` Model

**File:** `app/Models/QuestionPermission.php`

```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class QuestionPermission extends Model
{
    protected $fillable = [
        'questionnaire_id',
        'question_name',
        'institution_id',
        'can_view',
        'can_edit',
        'created_by',
        'updated_by',
    ];

    protected function casts(): array
    {
        return [
            'can_view' => 'boolean',
            'can_edit' => 'boolean',
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
}
```

#### 4.2.2 Enhance `Institution` Model

**Add to:** `app/Models/Institution.php`

```php
/**
 * Get all descendant institutions (recursive).
 * @return Collection<Institution>
 */
public function descendants(): Collection
{
    $descendants = collect();

    foreach ($this->children as $child) {
        $descendants->push($child);
        $descendants = $descendants->merge($child->descendants());
    }

    return $descendants;
}

/**
 * Get all ancestor institutions up to central.
 * @return Collection<Institution>
 */
public function ancestors(): Collection
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
 * Check if this institution is a descendant of given institution.
 */
public function isDescendantOf(Institution $institution): bool
{
    return $this->ancestors()->contains('id', $institution->id);
}

/**
 * Check if this institution is an ancestor of given institution.
 */
public function isAncestorOf(Institution $institution): bool
{
    return $this->descendants()->contains('id', $institution->id);
}

/**
 * Get all institutions this user can view (self + descendants).
 */
public function getViewableInstitutionIds(): array
{
    return $this->descendants()
        ->pluck('id')
        ->push($this->id)
        ->toArray();
}
```

#### 4.2.3 Enhance `Questionnaire` Model

**Add to:** `app/Models/Questionnaire.php`

```php
use Illuminate\Database\Eloquent\Relations\HasMany;

public function questionPermissions(): HasMany
{
    return $this->hasMany(QuestionPermission::class);
}

/**
 * Get permissions for a specific institution.
 */
public function getPermissionsForInstitution(int $institutionId): Collection
{
    return $this->questionPermissions()
        ->where('institution_id', $institutionId)
        ->get()
        ->keyBy('question_name');
}

/**
 * Extract all question names from SurveyJS schema.
 */
public function extractQuestionNames(): array
{
    $schema = $this->schema_json;
    $questionNames = [];

    if (isset($schema['pages'])) {
        foreach ($schema['pages'] as $page) {
            if (isset($page['elements'])) {
                foreach ($page['elements'] as $element) {
                    if (isset($element['name'])) {
                        $questionNames[] = $element['name'];
                    }
                    // Handle nested panels
                    if ($element['type'] === 'panel' && isset($element['elements'])) {
                        foreach ($element['elements'] as $panelElement) {
                            if (isset($panelElement['name'])) {
                                $questionNames[] = $panelElement['name'];
                            }
                        }
                    }
                }
            }
        }
    }

    return $questionNames;
}
```

#### 4.2.4 Enhance `User` Model

**Add to:** `app/Models/User.php`

```php
use Illuminate\Notifications\Notifiable;

class User extends Authenticatable
{
    use Notifiable; // Enable Laravel notifications

    // ... existing code ...

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'notification_preferences' => 'array', // Add this
        ];
    }

    /**
     * Get default notification preferences.
     */
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
     * Check if user wants email notifications for an event.
     */
    public function wantsEmailNotification(string $event): bool
    {
        $prefs = $this->notification_preferences
            ?? self::defaultNotificationPreferences();

        return ($prefs['email_enabled'] ?? true)
            && ($prefs['events'][$event] ?? true);
    }

    /**
     * Check if user wants in-app notifications for an event.
     */
    public function wantsInAppNotification(string $event): bool
    {
        $prefs = $this->notification_preferences
            ?? self::defaultNotificationPreferences();

        return ($prefs['in_app_enabled'] ?? true)
            && ($prefs['events'][$event] ?? true);
    }

    /**
     * Get all institutions this user can view.
     */
    public function getViewableInstitutionIds(): array
    {
        if (!$this->institution_id) {
            return [];
        }

        return $this->institution->getViewableInstitutionIds();
    }
}
```

---

### 4.3 Services & Helpers

#### 4.3.1 Create Permission Service

**File:** `app/Services/PermissionService.php`

```php
<?php

namespace App\Services;

use App\Models\QuestionPermission;
use App\Models\User;
use App\Models\Submission;
use Illuminate\Support\Collection;

class PermissionService
{
    /**
     * Check if user can view a question in a submission.
     */
    public function canViewQuestion(
        User $user,
        Submission $submission,
        string $questionName
    ): bool {
        // Admin can view everything
        if ($user->hasRole('admin')) {
            return true;
        }

        // User must belong to an institution
        if (!$user->institution_id) {
            return false;
        }

        // Check hierarchical access (view down)
        $viewableInstitutionIds = $user->getViewableInstitutionIds();
        if (!in_array($submission->institution_id, $viewableInstitutionIds)) {
            return false;
        }

        // Check question permission
        $permission = QuestionPermission::where('questionnaire_id', $submission->questionnaire_id)
            ->where('question_name', $questionName)
            ->where('institution_id', $user->institution_id)
            ->first();

        // Default: can view if no explicit permission set
        return $permission ? $permission->can_view : true;
    }

    /**
     * Check if user can edit a question in a submission.
     */
    public function canEditQuestion(
        User $user,
        Submission $submission,
        string $questionName
    ): bool {
        // Admin can edit everything (unless approved)
        if ($user->hasRole('admin') && $submission->canBeEdited()) {
            return true;
        }

        // Must be able to view first
        if (!$this->canViewQuestion($user, $submission, $questionName)) {
            return false;
        }

        // Submission must be editable
        if (!$submission->canBeEdited()) {
            return false;
        }

        // User must belong to an institution
        if (!$user->institution_id) {
            return false;
        }

        // Check question permission
        $permission = QuestionPermission::where('questionnaire_id', $submission->questionnaire_id)
            ->where('question_name', $questionName)
            ->where('institution_id', $user->institution_id)
            ->first();

        // Default: cannot edit unless explicitly granted
        return $permission ? $permission->can_edit : false;
    }

    /**
     * Get all editable question names for user in submission.
     */
    public function getEditableQuestions(
        User $user,
        Submission $submission
    ): array {
        if (!$submission->canBeEdited()) {
            return [];
        }

        // Admin can edit all questions
        if ($user->hasRole('admin')) {
            return $submission->questionnaire->extractQuestionNames();
        }

        if (!$user->institution_id) {
            return [];
        }

        $permissions = QuestionPermission::where('questionnaire_id', $submission->questionnaire_id)
            ->where('institution_id', $user->institution_id)
            ->where('can_edit', true)
            ->pluck('question_name')
            ->toArray();

        return $permissions;
    }

    /**
     * Filter submission answers to only viewable questions.
     */
    public function filterViewableAnswers(
        User $user,
        Submission $submission
    ): array {
        $answers = $submission->answers_json ?? [];
        $viewable = [];

        foreach ($answers as $questionName => $answer) {
            if ($this->canViewQuestion($user, $submission, $questionName)) {
                $viewable[$questionName] = $answer;
            }
        }

        return $viewable;
    }

    /**
     * Validate that user can update specific answers.
     * Throws exception if any question is not editable.
     */
    public function validateAnswerUpdates(
        User $user,
        Submission $submission,
        array $newAnswers
    ): void {
        foreach (array_keys($newAnswers) as $questionName) {
            if (!$this->canEditQuestion($user, $submission, $questionName)) {
                throw new \Exception(
                    "You do not have permission to edit question: {$questionName}"
                );
            }
        }
    }
}
```

#### 4.3.2 Create Notification Service

**File:** `app/Services/NotificationService.php`

```php
<?php

namespace App\Services;

use App\Models\Submission;
use App\Models\User;
use App\Notifications\SubmissionCreated;
use App\Notifications\SubmissionSubmitted;
use App\Notifications\SubmissionApproved;
use App\Notifications\SubmissionRejected;
use Illuminate\Support\Facades\Log;

class NotificationService
{
    /**
     * Notify relevant users when submission is created.
     */
    public function notifySubmissionCreated(Submission $submission): void
    {
        $recipients = $this->getInstitutionAdminsInHierarchy($submission->institution_id);

        foreach ($recipients as $user) {
            if ($user->wantsNotification('submission_created')) {
                $user->notify(new SubmissionCreated($submission));
            }
        }

        Log::info('Sent submission created notifications', [
            'submission_id' => $submission->id,
            'recipients' => $recipients->pluck('id'),
        ]);
    }

    /**
     * Notify relevant users when submission is submitted.
     */
    public function notifySubmissionSubmitted(Submission $submission): void
    {
        // Notify parent institution admins (for approval)
        $parentInstitution = $submission->institution->parent;

        if ($parentInstitution) {
            $recipients = User::where('institution_id', $parentInstitution->id)
                ->whereHas('roles', function ($query) {
                    $query->whereIn('name', ['admin', 'institution_admin']);
                })
                ->get();

            foreach ($recipients as $user) {
                if ($user->wantsNotification('submission_submitted')) {
                    $user->notify(new SubmissionSubmitted($submission));
                }
            }
        }

        // Also notify central admins
        $centralAdmins = User::role('admin')->get();
        foreach ($centralAdmins as $admin) {
            if ($admin->wantsNotification('submission_submitted')) {
                $admin->notify(new SubmissionSubmitted($submission));
            }
        }
    }

    /**
     * Notify submission creator when approved.
     */
    public function notifySubmissionApproved(Submission $submission): void
    {
        $creator = $submission->createdBy;

        if ($creator && $creator->wantsNotification('submission_approved')) {
            $creator->notify(new SubmissionApproved($submission));
        }

        // Notify institution admins
        $recipients = $this->getInstitutionAdminsInHierarchy($submission->institution_id);
        foreach ($recipients as $user) {
            if ($user->id !== $creator?->id && $user->wantsNotification('submission_approved')) {
                $user->notify(new SubmissionApproved($submission));
            }
        }
    }

    /**
     * Notify submission creator when rejected.
     */
    public function notifySubmissionRejected(Submission $submission): void
    {
        $creator = $submission->createdBy;

        if ($creator && $creator->wantsNotification('submission_rejected')) {
            $creator->notify(new SubmissionRejected($submission));
        }
    }

    /**
     * Get all institution admins in the hierarchy (self + ancestors).
     */
    private function getInstitutionAdminsInHierarchy(int $institutionId): Collection
    {
        $institution = Institution::find($institutionId);
        if (!$institution) {
            return collect();
        }

        $institutionIds = $institution->ancestors()
            ->pluck('id')
            ->push($institution->id)
            ->toArray();

        return User::whereIn('institution_id', $institutionIds)
            ->whereHas('roles', function ($query) {
                $query->whereIn('name', ['admin', 'institution_admin']);
            })
            ->get();
    }
}
```

---

### 4.4 Notifications (Laravel)

#### 4.4.1 Create Notification Classes

**Command:**
```bash
php artisan make:notification SubmissionCreated
php artisan make:notification SubmissionSubmitted
php artisan make:notification SubmissionApproved
php artisan make:notification SubmissionRejected
```

**Example:** `app/Notifications/SubmissionCreated.php`

```php
<?php

namespace App\Notifications;

use App\Models\Submission;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class SubmissionCreated extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(
        public Submission $submission
    ) {}

    public function via(object $notifiable): array
    {
        $channels = [];

        if ($notifiable->wantsEmailNotification('submission_created')) {
            $channels[] = 'mail';
        }

        if ($notifiable->wantsInAppNotification('submission_created')) {
            $channels[] = 'database';
        }

        return $channels;
    }

    public function toMail(object $notifiable): MailMessage
    {
        $url = url("/submissions/{$this->submission->id}");

        return (new MailMessage)
            ->subject("New Submission Created: {$this->submission->questionnaire->title}")
            ->greeting("Hello {$notifiable->name},")
            ->line("A new submission has been created for questionnaire: {$this->submission->questionnaire->title}")
            ->line("Institution: {$this->submission->institution->name}")
            ->line("Created by: {$this->submission->createdBy->name}")
            ->action('View Submission', $url)
            ->line('Thank you for using our application!');
    }

    public function toDatabase(object $notifiable): array
    {
        return [
            'type' => 'submission_created',
            'submission_id' => $this->submission->id,
            'questionnaire_title' => $this->submission->questionnaire->title,
            'institution_name' => $this->submission->institution->name,
            'creator_name' => $this->submission->createdBy->name,
            'url' => "/submissions/{$this->submission->id}",
        ];
    }
}
```

**Note:** Create similar notification classes for:
- `SubmissionSubmitted` (notify parent institution admins)
- `SubmissionApproved` (notify creator)
- `SubmissionRejected` (notify creator with comments)

---

### 4.5 Events & Listeners

#### 4.5.1 Create Events

**Command:**
```bash
php artisan make:event SubmissionCreated
php artisan make:event SubmissionStatusChanged
```

**File:** `app/Events/SubmissionStatusChanged.php`

```php
<?php

namespace App\Events;

use App\Models\Submission;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class SubmissionStatusChanged
{
    use Dispatchable, SerializesModels;

    public function __construct(
        public Submission $submission,
        public string $oldStatus,
        public string $newStatus,
        public ?int $userId = null
    ) {}
}
```

#### 4.5.2 Create Listeners

**Command:**
```bash
php artisan make:listener SendSubmissionNotifications
```

**File:** `app/Listeners/SendSubmissionNotifications.php`

```php
<?php

namespace App\Listeners;

use App\Events\SubmissionStatusChanged;
use App\Services\NotificationService;

class SendSubmissionNotifications
{
    public function __construct(
        private NotificationService $notificationService
    ) {}

    public function handle(SubmissionStatusChanged $event): void
    {
        match ($event->newStatus) {
            'submitted' => $this->notificationService->notifySubmissionSubmitted($event->submission),
            'approved' => $this->notificationService->notifySubmissionApproved($event->submission),
            'rejected' => $this->notificationService->notifySubmissionRejected($event->submission),
            default => null,
        };
    }
}
```

#### 4.5.3 Register Events

**File:** `app/Providers/EventServiceProvider.php`

```php
protected $listen = [
    SubmissionStatusChanged::class => [
        SendSubmissionNotifications::class,
    ],
];
```

---

### 4.6 API Controllers

#### 4.6.1 Question Permissions Controller

**Create:** `app/Http/Controllers/Api/QuestionPermissionController.php`

```php
<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\QuestionPermission;
use App\Models\Questionnaire;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class QuestionPermissionController extends Controller
{
    /**
     * Get permissions for a questionnaire.
     */
    public function index(Request $request, int $questionnaireId)
    {
        $this->authorize('manage-permissions', Questionnaire::class);

        $questionnaire = Questionnaire::findOrFail($questionnaireId);

        $permissions = $questionnaire->questionPermissions()
            ->with(['institution:id,name,code'])
            ->get()
            ->groupBy('question_name');

        return response()->json([
            'questionnaire' => [
                'id' => $questionnaire->id,
                'title' => $questionnaire->title,
                'questions' => $questionnaire->extractQuestionNames(),
            ],
            'permissions' => $permissions,
        ]);
    }

    /**
     * Bulk update permissions.
     */
    public function bulkUpdate(Request $request, int $questionnaireId)
    {
        $this->authorize('manage-permissions', Questionnaire::class);

        $validated = $request->validate([
            'permissions' => 'required|array',
            'permissions.*.question_name' => 'required|string',
            'permissions.*.institution_id' => 'required|exists:institutions,id',
            'permissions.*.can_view' => 'boolean',
            'permissions.*.can_edit' => 'boolean',
        ]);

        DB::transaction(function () use ($questionnaireId, $validated, $request) {
            foreach ($validated['permissions'] as $perm) {
                QuestionPermission::updateOrCreate(
                    [
                        'questionnaire_id' => $questionnaireId,
                        'question_name' => $perm['question_name'],
                        'institution_id' => $perm['institution_id'],
                    ],
                    [
                        'can_view' => $perm['can_view'] ?? true,
                        'can_edit' => $perm['can_edit'] ?? false,
                        'updated_by' => $request->user()->id,
                    ]
                );
            }
        });

        return response()->json([
            'message' => 'Permissions updated successfully',
        ]);
    }

    /**
     * Delete permission.
     */
    public function destroy(int $id)
    {
        $this->authorize('manage-permissions', Questionnaire::class);

        $permission = QuestionPermission::findOrFail($id);
        $permission->delete();

        return response()->json([
            'message' => 'Permission deleted successfully',
        ]);
    }
}
```

#### 4.6.2 Notification Controller

**Create:** `app/Http/Controllers/Api/NotificationController.php`

```php
<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;

class NotificationController extends Controller
{
    /**
     * List user's notifications.
     */
    public function index(Request $request)
    {
        $unreadOnly = $request->boolean('unread_only', false);

        $query = $request->user()->notifications();

        if ($unreadOnly) {
            $query->whereNull('read_at');
        }

        $notifications = $query->paginate($request->input('per_page', 15));

        return response()->json($notifications);
    }

    /**
     * Mark notification as read.
     */
    public function markAsRead(Request $request, string $id)
    {
        $notification = $request->user()
            ->notifications()
            ->where('id', $id)
            ->firstOrFail();

        $notification->markAsRead();

        return response()->json([
            'message' => 'Notification marked as read',
        ]);
    }

    /**
     * Mark all notifications as read.
     */
    public function markAllAsRead(Request $request)
    {
        $request->user()
            ->unreadNotifications
            ->markAsRead();

        return response()->json([
            'message' => 'All notifications marked as read',
        ]);
    }

    /**
     * Get unread notification count.
     */
    public function unreadCount(Request $request)
    {
        $count = $request->user()
            ->unreadNotifications()
            ->count();

        return response()->json([
            'unread_count' => $count,
        ]);
    }
}
```

#### 4.6.3 Update Submission Controller

**Enhance:** `app/Http/Controllers/Api/SubmissionController.php`

Add workflow actions with events:

```php
use App\Events\SubmissionStatusChanged;
use App\Services\PermissionService;
use App\Services\NotificationService;

public function __construct(
    private PermissionService $permissionService,
    private NotificationService $notificationService
) {}

/**
 * Update submission with permission checking.
 */
public function update(Request $request, int $id)
{
    $submission = Submission::findOrFail($id);
    $this->authorize('update', $submission);

    // Validate answers against permissions
    if ($request->has('answers_json')) {
        $this->permissionService->validateAnswerUpdates(
            $request->user(),
            $submission,
            $request->input('answers_json', [])
        );
    }

    $submission->update([
        'answers_json' => $request->input('answers_json'),
        'updated_by' => $request->user()->id,
    ]);

    return response()->json($submission);
}

/**
 * Submit submission for review.
 */
public function submit(Request $request, int $id)
{
    $submission = Submission::findOrFail($id);
    $this->authorize('submit', $submission);

    $oldStatus = $submission->status;
    $submission->submit();

    event(new SubmissionStatusChanged(
        $submission,
        $oldStatus,
        'submitted',
        $request->user()->id
    ));

    return response()->json([
        'message' => 'Submission submitted successfully',
        'submission' => $submission,
    ]);
}

/**
 * Approve submission.
 */
public function approve(Request $request, int $id)
{
    $submission = Submission::findOrFail($id);
    $this->authorize('approve', $submission);

    $oldStatus = $submission->status;
    $submission->approve($request->user()->id);

    event(new SubmissionStatusChanged(
        $submission,
        $oldStatus,
        'approved',
        $request->user()->id
    ));

    return response()->json([
        'message' => 'Submission approved successfully',
        'submission' => $submission,
    ]);
}

/**
 * Reject submission.
 */
public function reject(Request $request, int $id)
{
    $submission = Submission::findOrFail($id);
    $this->authorize('reject', $submission);

    $validated = $request->validate([
        'rejection_comments' => 'required|string|min:10',
    ]);

    $oldStatus = $submission->status;
    $submission->reject($request->user()->id, $validated['rejection_comments']);

    event(new SubmissionStatusChanged(
        $submission,
        $oldStatus,
        'rejected',
        $request->user()->id
    ));

    return response()->json([
        'message' => 'Submission rejected successfully',
        'submission' => $submission,
    ]);
}
```

---

### 4.7 Policies

#### 4.7.1 Update Submission Policy

**File:** `app/Policies/SubmissionPolicy.php`

```php
<?php

namespace App\Policies;

use App\Models\Submission;
use App\Models\User;

class SubmissionPolicy
{
    public function viewAny(User $user): bool
    {
        return true; // Filtered by controller based on institution hierarchy
    }

    public function view(User $user, Submission $submission): bool
    {
        // Admin can view all
        if ($user->hasRole('admin')) {
            return true;
        }

        // User must have an institution
        if (!$user->institution_id) {
            return false;
        }

        // Can view if submission belongs to their institution or descendants
        $viewableIds = $user->getViewableInstitutionIds();
        return in_array($submission->institution_id, $viewableIds);
    }

    public function create(User $user): bool
    {
        return $user->hasPermissionTo('submissions.create');
    }

    public function update(User $user, Submission $submission): bool
    {
        // Must be editable
        if (!$submission->canBeEdited()) {
            return false;
        }

        // Creator can edit their own
        if ($submission->created_by === $user->id) {
            return true;
        }

        // Admin can edit
        if ($user->hasRole('admin')) {
            return true;
        }

        return false;
    }

    public function delete(User $user, Submission $submission): bool
    {
        // Only admin or creator (if draft)
        return $user->hasRole('admin')
            || ($submission->isDraft() && $submission->created_by === $user->id);
    }

    public function submit(User $user, Submission $submission): bool
    {
        return $submission->isDraft()
            && $submission->created_by === $user->id;
    }

    public function approve(User $user, Submission $submission): bool
    {
        // Must be submitted
        if (!$submission->isSubmitted()) {
            return false;
        }

        // Admin can approve all
        if ($user->hasRole('admin')) {
            return true;
        }

        // Institution admin can approve if submission is from child institution
        if (!$user->institution_id) {
            return false;
        }

        $submissionInstitution = $submission->institution;
        return $submissionInstitution->isDescendantOf($user->institution);
    }

    public function reject(User $user, Submission $submission): bool
    {
        return $this->approve($user, $submission);
    }
}
```

#### 4.7.2 Create Question Permission Policy

**File:** `app/Policies/QuestionPermissionPolicy.php`

```php
<?php

namespace App\Policies;

use App\Models\User;

class QuestionPermissionPolicy
{
    public function managePermissions(User $user): bool
    {
        return $user->hasRole('admin');
    }
}
```

---

### 4.8 Routes

**Add to:** `routes/api.php`

```php
use App\Http\Controllers\Api\QuestionPermissionController;
use App\Http\Controllers\Api\NotificationController;

Route::middleware('auth:sanctum')->group(function () {

    // Question Permissions
    Route::prefix('questionnaires/{questionnaire}/permissions')->group(function () {
        Route::get('/', [QuestionPermissionController::class, 'index']);
        Route::post('/bulk', [QuestionPermissionController::class, 'bulkUpdate']);
        Route::delete('/{permission}', [QuestionPermissionController::class, 'destroy']);
    });

    // Notifications
    Route::prefix('notifications')->group(function () {
        Route::get('/', [NotificationController::class, 'index']);
        Route::get('/unread-count', [NotificationController::class, 'unreadCount']);
        Route::put('/{id}/read', [NotificationController::class, 'markAsRead']);
        Route::put('/mark-all-read', [NotificationController::class, 'markAllAsRead']);
    });

    // Submission workflow actions
    Route::prefix('submissions')->group(function () {
        Route::post('/{id}/submit', [SubmissionController::class, 'submit']);
        Route::post('/{id}/approve', [SubmissionController::class, 'approve']);
        Route::post('/{id}/reject', [SubmissionController::class, 'reject']);
    });
});
```

---

### 4.9 Frontend Implementation

#### 4.9.1 Permission Configuration UI

**Component:** `resources/js/pages/questionnaires/PermissionMatrix.tsx`

**Features:**
- Display questionnaire questions in rows
- Display institutions in columns
- Checkboxes for view/edit permissions
- Bulk selection (by question, by institution)
- Save/cancel actions

**API Integration:**
```typescript
// Fetch permissions
const { data: permissions } = useQuery({
  queryKey: ['permissions', questionnaireId],
  queryFn: () => api.get(`/questionnaires/${questionnaireId}/permissions`),
});

// Update permissions
const updatePermissions = useMutation({
  mutationFn: (data) =>
    api.post(`/questionnaires/${questionnaireId}/permissions/bulk`, data),
  onSuccess: () => {
    queryClient.invalidateQueries(['permissions', questionnaireId]);
    toast.success('Permissions updated successfully');
  },
});
```

#### 4.9.2 Notification Bell Component

**Component:** `resources/js/components/layout/NotificationBell.tsx`

**Features:**
- Bell icon with unread count badge
- Dropdown panel with recent notifications
- Click to mark as read
- Link to notification detail page
- "Mark all as read" action

**API Integration:**
```typescript
// Fetch unread count
const { data: unreadCount } = useQuery({
  queryKey: ['notifications', 'unread-count'],
  queryFn: () => api.get('/notifications/unread-count'),
  refetchInterval: 30000, // Poll every 30 seconds
});

// Fetch notifications
const { data: notifications } = useQuery({
  queryKey: ['notifications'],
  queryFn: () => api.get('/notifications'),
});

// Mark as read
const markAsRead = useMutation({
  mutationFn: (id) => api.put(`/notifications/${id}/read`),
  onSuccess: () => {
    queryClient.invalidateQueries(['notifications']);
    queryClient.invalidateQueries(['notifications', 'unread-count']);
  },
});
```

#### 4.9.3 Workflow Action Buttons

**Component:** `resources/js/pages/submissions/SubmissionActions.tsx`

**Features:**
- Submit button (draft → submitted)
- Approve button (submitted → approved)
- Reject button (submitted → rejected) with comment modal
- Conditional rendering based on user permissions and submission status

**Example:**
```typescript
const SubmissionActions = ({ submission, user }) => {
  const canSubmit = submission.status === 'draft' && submission.created_by === user.id;
  const canApprove = submission.status === 'submitted' && user.permissions.includes('submissions.approve');
  const canReject = canApprove;

  const submitMutation = useMutation({
    mutationFn: () => api.post(`/submissions/${submission.id}/submit`),
    onSuccess: () => {
      queryClient.invalidateQueries(['submissions']);
      toast.success('Submission submitted for review');
    },
  });

  const approveMutation = useMutation({
    mutationFn: () => api.post(`/submissions/${submission.id}/approve`),
    onSuccess: () => {
      queryClient.invalidateQueries(['submissions']);
      toast.success('Submission approved');
    },
  });

  const rejectMutation = useMutation({
    mutationFn: (data) => api.post(`/submissions/${submission.id}/reject`, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['submissions']);
      toast.success('Submission rejected');
    },
  });

  return (
    <div className="flex gap-2">
      {canSubmit && (
        <button onClick={() => submitMutation.mutate()} className="btn-primary">
          Submit for Review
        </button>
      )}
      {canApprove && (
        <button onClick={() => approveMutation.mutate()} className="btn-success">
          Approve
        </button>
      )}
      {canReject && (
        <button onClick={() => setShowRejectModal(true)} className="btn-danger">
          Reject
        </button>
      )}
    </div>
  );
};
```

#### 4.9.4 Permission-Aware Form Rendering

**Component:** `resources/js/pages/submissions/SubmissionForm.tsx`

**Features:**
- Fetch user's editable questions from API
- Render SurveyJS with read-only questions
- Mark editable questions
- Show rejection comments banner if rejected

**Example:**
```typescript
const SubmissionForm = ({ submission }) => {
  const { data: editableQuestions } = useQuery({
    queryKey: ['submissions', submission.id, 'editable-questions'],
    queryFn: () => api.get(`/submissions/${submission.id}/editable-questions`),
  });

  // Configure SurveyJS
  const survey = new Model(submission.questionnaire.schema_json);

  // Set values
  survey.data = submission.answers_json;

  // Set read-only mode for non-editable questions
  survey.onAfterRenderQuestion.add((survey, options) => {
    const questionName = options.question.name;
    if (!editableQuestions?.includes(questionName)) {
      options.question.readOnly = true;
    }
  });

  return (
    <div>
      {submission.status === 'rejected' && (
        <div className="alert alert-warning">
          <strong>Rejected:</strong> {submission.rejection_comments}
        </div>
      )}
      <Survey model={survey} onComplete={handleSave} />
    </div>
  );
};
```

---

### 4.10 Testing Requirements

#### 4.10.1 Backend Tests (Pest)

**Permission Service Tests:** `tests/Unit/PermissionServiceTest.php`
- Test `canViewQuestion()` for all role/hierarchy combinations
- Test `canEditQuestion()` with various permissions
- Test `getEditableQuestions()` returns correct set
- Test `filterViewableAnswers()` filters correctly
- Test `validateAnswerUpdates()` throws for unauthorized edits

**Workflow Tests:** `tests/Feature/SubmissionWorkflowTest.php`
- Test draft → submitted transition
- Test submitted → approved transition
- Test submitted → rejected transition with comments
- Test rejected → submitted (resubmission)
- Test invalid transitions are rejected
- Test events are fired correctly

**Notification Tests:** `tests/Feature/NotificationTest.php`
- Test notifications sent on submission creation
- Test notifications sent on status changes
- Test notification preferences are respected
- Test hierarchical notification routing
- Test email and database channels

**Permission API Tests:** `tests/Feature/QuestionPermissionTest.php`
- Test bulk permission update
- Test permission deletion
- Test authorization (only admin can manage)
- Test unique constraint enforcement

**Hierarchical Access Tests:** `tests/Feature/HierarchicalAccessTest.php`
- Test central user can view all submissions
- Test province user can view their + district submissions
- Test district user can only view their own
- Test unauthorized access is blocked

#### 4.10.2 Frontend Tests (Jest)

**NotificationBell Component:** `resources/js/__tests__/NotificationBell.test.tsx`
- Test unread count badge displays correctly
- Test clicking notification marks as read
- Test "mark all as read" action
- Test dropdown opens/closes

**PermissionMatrix Component:** `resources/js/__tests__/PermissionMatrix.test.tsx`
- Test permission grid renders correctly
- Test bulk selection
- Test save action calls API
- Test error handling

**SubmissionActions Component:** `resources/js/__tests__/SubmissionActions.test.tsx`
- Test buttons display based on status and permissions
- Test submit action
- Test approve action
- Test reject modal and submission

---

## 5. Week-by-Week Breakdown

### Week 1: Database & Models
**Goal:** Complete data layer and core business logic

**Tasks:**
1. **Database Migrations** (1 day)
   - Create `question_permissions` table migration
   - Create `notification_preferences` column migration
   - Run migrations and verify schema
   - Test: `php artisan migrate:fresh --seed`

2. **Models & Relationships** (2 days)
   - Create `QuestionPermission` model
   - Enhance `Institution` model (descendants, ancestors, helpers)
   - Enhance `Questionnaire` model (extractQuestionNames, getPermissionsForInstitution)
   - Enhance `User` model (notification preferences, getViewableInstitutionIds)
   - Write unit tests for all model methods
   - Test: `php artisan test --filter=ModelTest`

3. **Services** (2 days)
   - Create `PermissionService` with all methods
   - Create `NotificationService` with all methods
   - Write comprehensive unit tests (80%+ coverage)
   - Test: `php artisan test --filter=PermissionServiceTest`

**Deliverables:**
- [ ] All migrations applied
- [ ] All models with relationships complete
- [ ] PermissionService tested and working
- [ ] NotificationService skeleton complete
- [ ] 90%+ test coverage on services

---

### Week 2: Events, Notifications & Policies
**Goal:** Complete notification infrastructure and authorization

**Tasks:**
1. **Events & Listeners** (1 day)
   - Create `SubmissionStatusChanged` event
   - Create `SendSubmissionNotifications` listener
   - Register in `EventServiceProvider`
   - Test event dispatching manually

2. **Notification Classes** (2 days)
   - Create `SubmissionCreated` notification
   - Create `SubmissionSubmitted` notification
   - Create `SubmissionApproved` notification
   - Create `SubmissionRejected` notification
   - Design email templates (Blade)
   - Test notifications manually with Mailtrap
   - Write notification tests

3. **Policies** (1 day)
   - Update `SubmissionPolicy` with hierarchical checks
   - Create `QuestionPermissionPolicy`
   - Write policy tests
   - Test: `php artisan test --filter=PolicyTest`

4. **Queue Setup** (1 day)
   - Configure Redis queue driver
   - Create queue worker supervisor config
   - Test async notification delivery
   - Verify queue retry logic

**Deliverables:**
- [ ] All events and listeners working
- [ ] All notification classes complete
- [ ] Email templates designed and tested
- [ ] Policies enforcing hierarchical access
- [ ] Queue workers running reliably

---

### Week 3: Backend API Endpoints
**Goal:** Complete all API endpoints with tests

**Tasks:**
1. **Question Permission Endpoints** (1.5 days)
   - Create `QuestionPermissionController`
   - Implement `index()`, `bulkUpdate()`, `destroy()`
   - Add routes to `api.php`
   - Write API tests
   - Test with Postman/Insomnia

2. **Notification Endpoints** (1 day)
   - Create `NotificationController`
   - Implement `index()`, `markAsRead()`, `markAllAsRead()`, `unreadCount()`
   - Add routes
   - Write API tests

3. **Submission Workflow Endpoints** (1.5 days)
   - Update `SubmissionController`
   - Add `submit()`, `approve()`, `reject()` methods
   - Integrate PermissionService for update validation
   - Fire events on status changes
   - Write workflow API tests
   - Test end-to-end workflow

4. **Integration Tests** (1 day)
   - Write full workflow integration tests
   - Test permission enforcement across APIs
   - Test notification delivery
   - Load testing (basic)

**Deliverables:**
- [ ] All API endpoints functional
- [ ] 100% API test coverage
- [ ] Postman collection documented
- [ ] End-to-end workflow tested

---

### Week 4: Frontend - Permission UI & Notifications
**Goal:** Build permission configuration UI and notification system

**Tasks:**
1. **Permission Matrix Component** (2 days)
   - Design permission matrix UI (table/grid)
   - Implement bulk selection logic
   - Integrate with API (fetch/update permissions)
   - Add to questionnaire detail page
   - Write component tests
   - User testing

2. **Notification Bell Component** (1.5 days)
   - Design notification dropdown UI
   - Implement unread count badge
   - Integrate with notification API
   - Add polling for real-time updates
   - Mark as read functionality
   - Write component tests

3. **API Service Updates** (0.5 day)
   - Add permission API methods to `api.ts`
   - Add notification API methods
   - Update TypeScript types

**Deliverables:**
- [ ] Permission matrix fully functional
- [ ] Notification bell working with polling
- [ ] Component tests passing
- [ ] UI/UX validated by stakeholders

---

### Week 5: Frontend - Workflow UI & Form Permissions
**Goal:** Complete workflow management UI and permission-aware forms

**Tasks:**
1. **Submission Actions Component** (1.5 days)
   - Create workflow action buttons (submit, approve, reject)
   - Build reject modal with comment textarea
   - Conditional rendering based on permissions
   - Integrate with submission API
   - Write component tests

2. **Permission-Aware Form Rendering** (2 days)
   - Fetch editable questions from backend
   - Configure SurveyJS read-only mode
   - Highlight editable vs. read-only questions
   - Show rejection comments banner
   - Test with various permission scenarios

3. **Submission List Enhancements** (0.5 day)
   - Add status filter (draft, submitted, approved, rejected)
   - Add status badges
   - Add quick actions (approve/reject from list)

4. **User Notification Preferences Page** (1 day)
   - Create settings page for notification preferences
   - Toggle email/in-app notifications
   - Save to user profile
   - Test preference enforcement

**Deliverables:**
- [ ] Workflow UI complete and tested
- [ ] Permission-aware forms working correctly
- [ ] Notification preferences functional
- [ ] Frontend tests passing

---

### Week 6: Integration, Testing & Documentation
**Goal:** End-to-end testing, bug fixes, and documentation

**Tasks:**
1. **End-to-End Testing** (2 days)
   - Run full workflow scenarios (district → province → central)
   - Test permission edge cases
   - Test notification delivery (email + in-app)
   - Cross-browser testing (Chrome, Firefox, Safari)
   - Mobile responsiveness testing

2. **Bug Fixes & Polish** (1.5 days)
   - Fix bugs found during testing
   - Performance optimization (query optimization, caching)
   - UI/UX improvements
   - Accessibility audit

3. **Documentation** (1 day)
   - Update API documentation (Postman collection)
   - Write user guide for permission configuration
   - Write admin guide for workflow management
   - Code documentation (PHPDoc, JSDoc)

4. **Demo Preparation** (0.5 day)
   - Create demo data (seeders)
   - Prepare demo script
   - Record demo video (optional)
   - Stakeholder presentation

**Deliverables:**
- [ ] All tests passing (backend + frontend)
- [ ] Zero critical bugs
- [ ] Documentation complete
- [ ] Demo successful
- [ ] Ready for Phase 3

---

## 6. Testing Strategy

### 6.1 Backend Testing (Pest)

**Unit Tests:**
- `PermissionService`: All methods (canViewQuestion, canEditQuestion, etc.)
- `NotificationService`: All notification methods
- Model methods: `Institution::descendants()`, `Institution::ancestors()`, etc.
- Questionnaire: `extractQuestionNames()`

**Feature Tests:**
- **QuestionPermissionTest**: API CRUD operations
- **NotificationTest**: Notification creation and delivery
- **SubmissionWorkflowTest**: All state transitions
- **HierarchicalAccessTest**: View/edit access enforcement
- **PolicyTest**: All policy methods

**Coverage Target:** 90%+ on services, models, and controllers

**Command:**
```bash
php artisan test --coverage --min=90
```

### 6.2 Frontend Testing (Jest + React Testing Library)

**Component Tests:**
- `NotificationBell`: Rendering, interactions, API calls
- `PermissionMatrix`: Grid rendering, bulk selection, save
- `SubmissionActions`: Button visibility, workflow actions
- `SubmissionForm`: Read-only enforcement, rejection banner

**Coverage Target:** 80%+ on components

**Command:**
```bash
npm run test:coverage
```

### 6.3 Integration Testing

**Scenarios:**
1. **Multi-Institution Workflow:**
   - District creates submission → Province reviews → Central approves
   - Verify permissions at each step
   - Verify notifications sent to correct users

2. **Permission Enforcement:**
   - Admin sets question permissions
   - Enumerator edits submission
   - Verify only permitted questions are editable
   - Verify API rejects unauthorized edits

3. **Rejection & Resubmission:**
   - Admin rejects submission with comments
   - Creator receives notification
   - Creator edits and resubmits
   - Admin approves

**Tools:**
- Laravel Dusk (browser automation)
- Postman/Newman (API testing)

### 6.4 Manual Testing

**Checklist:**
- [ ] Create submission as district user
- [ ] Verify province admin receives notification
- [ ] Submit submission for review
- [ ] Approve as province admin
- [ ] Verify central admin receives notification
- [ ] Reject submission with comments
- [ ] Verify creator receives rejection notification
- [ ] Edit rejected submission
- [ ] Resubmit for review
- [ ] Final approval by central admin
- [ ] Verify all notifications sent correctly
- [ ] Test permission matrix UI
- [ ] Test notification bell dropdown
- [ ] Test read-only form rendering

---

## 7. Risk Mitigation

### 7.1 Technical Risks

**Risk 1: Permission Checking Performance**
- **Likelihood:** Medium
- **Impact:** Medium
- **Mitigation:**
  - Index `question_permissions` table properly
  - Cache permission lookups (Redis)
  - Batch permission queries
  - Monitor API response times
  - Set performance budget: < 500ms

**Risk 2: Notification Delivery Failures**
- **Likelihood:** Medium
- **Impact:** High
- **Mitigation:**
  - Use queue retry logic (3 attempts)
  - Log all notification failures
  - Monitor queue worker health
  - Set up alerting for failed jobs
  - Fallback to in-app notifications if email fails

**Risk 3: Complex Hierarchical Queries**
- **Likelihood:** Low
- **Impact:** Medium
- **Mitigation:**
  - Use recursive CTEs for hierarchy queries (PostgreSQL)
  - Add materialized path column if needed
  - Cache institution hierarchy
  - Test with large datasets (1000+ institutions)

**Risk 4: Frontend Permission Logic Complexity**
- **Likelihood:** Medium
- **Impact:** Low
- **Mitigation:**
  - Keep permission logic on backend
  - Frontend only renders based on API response
  - Comprehensive component tests
  - Use TypeScript for type safety

### 7.2 Schedule Risks

**Risk 1: Backend Delays**
- **Mitigation:**
  - Prioritize API completion (Week 3)
  - Frontend can mock APIs if needed
  - Parallel development after Week 2

**Risk 2: Integration Issues**
- **Mitigation:**
  - Daily integration testing
  - Use feature flags for gradual rollout
  - Maintain Phase 1 stability as fallback

### 7.3 Quality Risks

**Risk 1: Security Vulnerabilities**
- **Mitigation:**
  - Security code review (Week 6)
  - Penetration testing (basic)
  - Authorization tests for all endpoints
  - Never trust frontend permissions

**Risk 2: Notification Spam**
- **Mitigation:**
  - User notification preferences
  - Rate limiting on notifications
  - Batch daily digest (future enhancement)

---

## 8. Deployment & Rollout

### 8.1 Pre-Deployment Checklist

**Code Quality:**
- [ ] All tests passing (backend + frontend)
- [ ] Code review completed
- [ ] No console errors or warnings
- [ ] TypeScript type check passing
- [ ] PHP linting passing

**Database:**
- [ ] All migrations tested on staging
- [ ] Backup production database
- [ ] Migration rollback plan documented

**Infrastructure:**
- [ ] Queue workers configured (Supervisor)
- [ ] Redis configured for queue backend
- [ ] Email SMTP configured
- [ ] Monitoring and logging in place

**Documentation:**
- [ ] API documentation updated
- [ ] User guide written
- [ ] Admin guide written
- [ ] Changelog prepared

### 8.2 Deployment Steps

1. **Database Migration**
   ```bash
   php artisan down
   git pull origin main
   composer install --no-dev
   php artisan migrate --force
   php artisan cache:clear
   php artisan config:cache
   php artisan route:cache
   php artisan up
   ```

2. **Frontend Build**
   ```bash
   npm ci
   npm run build
   ```

3. **Queue Workers**
   ```bash
   sudo supervisorctl restart laravel-worker:*
   ```

4. **Smoke Tests**
   - Login as admin
   - Create test submission
   - Submit for review
   - Approve submission
   - Verify notifications sent
   - Check email delivery

### 8.3 Rollback Plan

If critical issues found:

1. **Revert Code**
   ```bash
   git revert <commit-hash>
   git push origin main
   ```

2. **Rollback Migration**
   ```bash
   php artisan migrate:rollback --step=2
   ```

3. **Restart Services**
   ```bash
   php artisan cache:clear
   sudo supervisorctl restart laravel-worker:*
   ```

4. **Notify Users**
   - Email to all users about temporary rollback
   - Expected resolution time

### 8.4 Post-Deployment Monitoring

**Monitor for 48 hours:**
- [ ] Error logs (Laravel + web server)
- [ ] Queue job failures
- [ ] Email delivery rates
- [ ] API response times
- [ ] User feedback

**Metrics to Track:**
- Notification delivery rate (target: > 95%)
- API response time (target: < 500ms)
- Queue processing time (target: < 30s)
- Failed job count (target: < 1%)

---

## 9. Appendix

### 9.1 Database Schema Diagram

```
institutions
├── id (PK)
├── parent_institution_id (FK → institutions)
├── name
├── code (unique)
├── level (enum: central, province, district)
└── ...

question_permissions
├── id (PK)
├── questionnaire_id (FK → questionnaires)
├── question_name
├── institution_id (FK → institutions)
├── can_view (boolean)
├── can_edit (boolean)
└── UNIQUE(questionnaire_id, question_name, institution_id)

submissions
├── id (PK)
├── questionnaire_id (FK → questionnaires)
├── institution_id (FK → institutions)
├── status (enum: draft, submitted, approved, rejected)
├── answers_json (jsonb)
├── submitted_at
├── approved_at
├── rejected_at
├── approved_by (FK → users)
├── rejected_by (FK → users)
├── rejection_comments
└── ...

notifications (Laravel default)
├── id (UUID, PK)
├── notifiable_type
├── notifiable_id (FK → users)
├── type
├── data (jsonb)
├── read_at
└── ...
```

### 9.2 Permission Matrix Example

**Questionnaire:** Health Survey v1

| Question Name | Central | Province A | District A1 | District A2 |
|---------------|---------|------------|-------------|-------------|
| demo_age | View | View, Edit | View, Edit | View, Edit |
| demo_gender | View | View, Edit | View, Edit | View, Edit |
| health_bmi | View, Edit | View | - | - |
| health_bloodpressure | View, Edit | View | - | - |
| econ_income | View, Edit | - | - | - |

**Legend:**
- **View**: Institution can view answers
- **Edit**: Institution can edit answers
- **-**: No access

### 9.3 Notification Flow Diagram

```
District Creates Submission
         |
         v
[Event: SubmissionCreated]
         |
         v
[Listener: SendSubmissionNotifications]
         |
         ├─> Email to Province Admin
         └─> In-app notification to Province Admin

District Submits Submission
         |
         v
[Event: SubmissionStatusChanged (draft → submitted)]
         |
         v
[Listener: SendSubmissionNotifications]
         |
         ├─> Email to Province Admin (parent institution)
         ├─> In-app notification to Province Admin
         ├─> Email to Central Admin
         └─> In-app notification to Central Admin

Province Approves Submission
         |
         v
[Event: SubmissionStatusChanged (submitted → approved)]
         |
         v
[Listener: SendSubmissionNotifications]
         |
         ├─> Email to District Creator
         ├─> In-app notification to District Creator
         ├─> Email to Central Admin
         └─> In-app notification to Central Admin

Province Rejects Submission
         |
         v
[Event: SubmissionStatusChanged (submitted → rejected)]
         |
         v
[Listener: SendSubmissionNotifications]
         |
         ├─> Email to District Creator (with comments)
         └─> In-app notification to District Creator
```

### 9.4 API Endpoint Reference

**Question Permissions:**
- `GET /api/questionnaires/{id}/permissions` - List permissions
- `POST /api/questionnaires/{id}/permissions/bulk` - Bulk update
- `DELETE /api/questionnaires/{id}/permissions/{permId}` - Delete permission

**Notifications:**
- `GET /api/notifications` - List notifications (paginated)
- `GET /api/notifications/unread-count` - Get unread count
- `PUT /api/notifications/{id}/read` - Mark as read
- `PUT /api/notifications/mark-all-read` - Mark all as read

**Submission Workflow:**
- `POST /api/submissions/{id}/submit` - Submit for review
- `POST /api/submissions/{id}/approve` - Approve submission
- `POST /api/submissions/{id}/reject` - Reject submission (requires `rejection_comments`)

### 9.5 Seeder Updates

**Add to:** `database/seeders/DemoSeeder.php`

```php
// Create question permissions
$questionnaire = Questionnaire::where('code', 'HEALTH-SURVEY')->first();
$central = Institution::where('code', 'CENTRAL')->first();
$provinceA = Institution::where('code', 'PROVINCE-A')->first();
$districtA1 = Institution::where('code', 'DISTRICT-A1')->first();

QuestionPermission::updateOrCreate(
    [
        'questionnaire_id' => $questionnaire->id,
        'question_name' => 'demo_age',
        'institution_id' => $districtA1->id,
    ],
    [
        'can_view' => true,
        'can_edit' => true,
    ]
);

QuestionPermission::updateOrCreate(
    [
        'questionnaire_id' => $questionnaire->id,
        'question_name' => 'health_bmi',
        'institution_id' => $central->id,
    ],
    [
        'can_view' => true,
        'can_edit' => true,
    ]
);
```

### 9.6 Configuration Updates

**Queue Configuration:** `config/queue.php`

```php
'connections' => [
    'redis' => [
        'driver' => 'redis',
        'connection' => 'default',
        'queue' => env('REDIS_QUEUE', 'default'),
        'retry_after' => 90,
        'block_for' => null,
        'after_commit' => false,
    ],
],
```

**Mail Configuration:** `.env`

```env
MAIL_MAILER=smtp
MAIL_HOST=smtp.mailtrap.io
MAIL_PORT=2525
MAIL_USERNAME=your_username
MAIL_PASSWORD=your_password
MAIL_ENCRYPTION=tls
MAIL_FROM_ADDRESS=noreply@example.com
MAIL_FROM_NAME="${APP_NAME}"
```

**Supervisor Configuration:** `/etc/supervisor/conf.d/laravel-worker.conf`

```ini
[program:laravel-worker]
process_name=%(program_name)s_%(process_num)02d
command=php /path/to/artisan queue:work redis --sleep=3 --tries=3 --max-time=3600
autostart=true
autorestart=true
stopasgroup=true
killasgroup=true
user=www-data
numprocs=2
redirect_stderr=true
stdout_logfile=/path/to/storage/logs/worker.log
stopwaitsecs=3600
```

---

## Success Metrics

**Functional Success:**
- [ ] Complete multi-institution workflow demonstrated
- [ ] Permission matrix configurable by admin
- [ ] Notifications delivered to correct users
- [ ] Rejected submissions can be edited and resubmitted
- [ ] All workflow transitions logged in audit trail

**Technical Success:**
- [ ] 90%+ test coverage on backend
- [ ] 80%+ test coverage on frontend
- [ ] API response time < 500ms (p95)
- [ ] Email delivery success rate > 95%
- [ ] Zero unauthorized data access

**User Success:**
- [ ] Admin can configure permissions without developer help
- [ ] Enumerators understand workflow states
- [ ] Notifications are clear and actionable
- [ ] UI is intuitive (no training needed)

---

**End of Phase 2 Implementation Plan**
