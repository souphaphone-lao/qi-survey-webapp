# Department System Implementation Plan

## Overview

Implement a flat department structure within institutions to enable question-level permission control for collaborative survey completion.

## Requirements Summary

**Department Structure:**
- Flat (no sub-departments)
- Can exist at all institution levels (central, province, district)
- Each department belongs to one institution

**User Assignment:**
- Users belong to both institution AND department
- One user = one department only

**Access Control:**
- VIEW: Institution hierarchy (unchanged - province sees district submissions)
- EDIT: Department + question permissions
- APPROVE: Institution-level only (departments don't approve)

**Question Permissions:**
- Assigned to institution + department combinations
- Example: Question 15 → Ministry of Finance + Tax Dept (can edit)

## Database Schema Changes

### 1. Create `departments` Table

```php
// Migration: 2025_11_26_000001_create_departments_table.php
Schema::create('departments', function (Blueprint $table) {
    $table->id();
    $table->string('name');
    $table->string('code', 50)->unique();
    $table->foreignId('institution_id')->constrained('institutions')->cascadeOnDelete();
    $table->text('description')->nullable();
    $table->boolean('is_active')->default(true);
    $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
    $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
    $table->timestamps();
    $table->softDeletes();

    $table->index('code');
    $table->index('institution_id');
    $table->index('is_active');
    $table->unique(['institution_id', 'code']);
});
```

### 2. Add `department_id` to `users` Table

```php
// Migration: 2025_11_26_000002_add_department_id_to_users_table.php
Schema::table('users', function (Blueprint $table) {
    $table->foreignId('department_id')->nullable()->after('institution_id')
        ->constrained('departments')->nullOnDelete();
    $table->index('department_id');
});
```

### 3. Add `notification_preferences` to `users` Table

```php
// Migration: 2025_11_26_000003_add_notification_preferences_to_users_table.php
Schema::table('users', function (Blueprint $table) {
    $table->jsonb('notification_preferences')->nullable()->after('email');
});
```

### 4. Create `question_permissions` Table

```php
// Migration: 2025_11_26_000004_create_question_permissions_table.php
Schema::create('question_permissions', function (Blueprint $table) {
    $table->id();
    $table->foreignId('questionnaire_id')->constrained('questionnaires')->cascadeOnDelete();
    $table->string('question_name'); // SurveyJS field name
    $table->foreignId('institution_id')->constrained('institutions')->cascadeOnDelete();
    $table->foreignId('department_id')->constrained('departments')->cascadeOnDelete();
    $table->enum('permission_type', ['edit', 'view'])->default('edit');
    $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
    $table->timestamps();

    // Composite unique constraint
    $table->unique([
        'questionnaire_id',
        'question_name',
        'institution_id',
        'department_id'
    ], 'unique_question_permission');

    // Performance indexes
    $table->index(['questionnaire_id', 'institution_id', 'department_id']);
    $table->index('question_name');
});
```

## Core Models

### Department Model

**File:** `app/Models/Department.php`

```php
class Department extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'name', 'code', 'institution_id', 'description',
        'is_active', 'created_by', 'updated_by',
    ];

    public function institution(): BelongsTo
    public function users(): HasMany
    public function questionPermissions(): HasMany
}
```

### QuestionPermission Model

**File:** `app/Models/QuestionPermission.php`

```php
class QuestionPermission extends Model
{
    protected $fillable = [
        'questionnaire_id', 'question_name', 'institution_id',
        'department_id', 'permission_type', 'created_by',
    ];

    public function questionnaire(): BelongsTo
    public function institution(): BelongsTo
    public function department(): BelongsTo

    public function scopeForUser($query, User $user)
    {
        return $query->where('institution_id', $user->institution_id)
                     ->where('department_id', $user->department_id);
    }
}
```

### Model Updates

**User Model** - Add:
- `department_id` to fillable
- `department()` BelongsTo relationship

**Institution Model** - Add:
- `departments()` HasMany relationship

**Questionnaire Model** - Add:
- `questionPermissions()` HasMany relationship

## Services

### Permission Service

**File:** `app/Services/QuestionPermissionService.php`

Core methods:
```php
class QuestionPermissionService
{
    // Get editable questions for user on submission
    public function getEditableQuestions(User $user, Submission $submission): array

    // Check if user can edit specific question
    public function canEditQuestion(User $user, Submission $submission, string $questionName): bool

    // Get permission map for frontend (question_name => can_edit boolean)
    public function getPermissionsMap(User $user, Submission $submission): array

    // Validate answers against permissions (returns invalid question names)
    public function validateAnswers(User $user, Submission $submission, array $answers): array
}
```

**Caching Strategy:**
- No persistent caching needed - permissions only checked on form load/save
- Direct database queries are fast (composite index enables O(log n) lookups)
- Changes take effect immediately on next form load/refresh
- Simpler code without cache invalidation logic
- Admin users bypass permission checks entirely (can edit all)

### Notification Service

**File:** `app/Services/NotificationService.php`

Handles sending email and in-app notifications for submission workflow events.

Core methods:
```php
class NotificationService
{
    // Notify when submission created
    public function notifySubmissionCreated(Submission $submission): void

    // Notify parent institution admins when submitted for review
    public function notifySubmissionSubmitted(Submission $submission): void

    // Notify creator when approved
    public function notifySubmissionApproved(Submission $submission): void

    // Notify creator when rejected (with comments)
    public function notifySubmissionRejected(Submission $submission): void

    // Get institution admins in hierarchy (self + ancestors)
    private function getInstitutionAdminsInHierarchy(int $institutionId): Collection
}
```

**Notification Flow:**
- **Submitted** → Notifies parent institution admins + central admins
- **Approved** → Notifies creator + institution admins
- **Rejected** → Notifies creator with rejection comments

## Events & Listeners

### Events

**File:** `app/Events/SubmissionStatusChanged.php`

```php
class SubmissionStatusChanged
{
    public function __construct(
        public Submission $submission,
        public string $oldStatus,
        public string $newStatus,
        public ?int $userId = null
    ) {}
}
```

### Listeners

**File:** `app/Listeners/SendSubmissionNotifications.php`

```php
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

**Register in** `app/Providers/EventServiceProvider.php`:
```php
protected $listen = [
    SubmissionStatusChanged::class => [
        SendSubmissionNotifications::class,
    ],
];
```

## Notification Classes

Create 4 notification classes (queued for async delivery):

**Commands:**
```bash
php artisan make:notification SubmissionCreated
php artisan make:notification SubmissionSubmitted
php artisan make:notification SubmissionApproved
php artisan make:notification SubmissionRejected
```

Each notification supports:
- **Email channel**: HTML email with submission details and action link
- **Database channel**: In-app notification with metadata

**Example:** `app/Notifications/SubmissionSubmitted.php`

```php
class SubmissionSubmitted extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(public Submission $submission) {}

    public function via(object $notifiable): array
    {
        $channels = [];
        if ($notifiable->wantsEmailNotification('submission_submitted')) {
            $channels[] = 'mail';
        }
        if ($notifiable->wantsInAppNotification('submission_submitted')) {
            $channels[] = 'database';
        }
        return $channels;
    }

    public function toMail(object $notifiable): MailMessage
    {
        $url = url("/submissions/{$this->submission->id}");
        return (new MailMessage)
            ->subject("Submission Ready for Review: {$this->submission->questionnaire->title}")
            ->greeting("Hello {$notifiable->name},")
            ->line("A submission requires your review:")
            ->line("Questionnaire: {$this->submission->questionnaire->title}")
            ->line("Institution: {$this->submission->institution->name}")
            ->action('Review Submission', $url);
    }

    public function toDatabase(object $notifiable): array
    {
        return [
            'type' => 'submission_submitted',
            'submission_id' => $this->submission->id,
            'questionnaire_title' => $this->submission->questionnaire->title,
            'institution_name' => $this->submission->institution->name,
            'url' => "/submissions/{$this->submission->id}",
        ];
    }
}
```

## User Notification Preferences

**Add to User Model:**

```php
// In User model casts
protected function casts(): array
{
    return [
        // ... existing casts
        'notification_preferences' => 'array',
    ];
}

// Helper methods
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
```

**Migration:** Add `notification_preferences` column to users table (JSONB)

## API Changes

### New Controllers

**1. DepartmentController** (`app/Http/Controllers/Api/DepartmentController.php`)
- `GET /api/departments` - List with pagination/filters
- `GET /api/departments/list` - Simple list for dropdowns
- `POST /api/departments` - Create department
- `GET /api/departments/{id}` - Show department
- `PUT /api/departments/{id}` - Update department
- `DELETE /api/departments/{id}` - Delete (validates no users assigned)

**2. QuestionPermissionController** (`app/Http/Controllers/Api/QuestionPermissionController.php`)
- `GET /api/question-permissions` - List with filters
- `GET /api/questionnaires/{id}/permissions` - Get all permissions for questionnaire
- `POST /api/question-permissions` - Create single permission
- `POST /api/question-permissions/bulk` - Bulk create/update permissions
- `DELETE /api/question-permissions/{id}` - Delete permission

**3. NotificationController** (`app/Http/Controllers/Api/NotificationController.php`)
- `GET /api/notifications` - List user's notifications (paginated)
- `GET /api/notifications/unread-count` - Get unread count
- `PUT /api/notifications/{id}/read` - Mark specific notification as read
- `PUT /api/notifications/mark-all-read` - Mark all notifications as read

### Controller Updates

**SubmissionController** - Inject `QuestionPermissionService`:
- Update `show()`: Return `question_permissions` map with submission
- Update `update()`: Validate answers with `validateAnswers()` before saving
- Return 403 with invalid question names if validation fails

**UserController**:
- Add `department_id` to create/update
- Load `department` relationship in queries
- Add `department_id` filter to index

### Form Request Validators

**DepartmentRequest** (`app/Http/Requests/DepartmentRequest.php`):
- Validate name, code (unique per institution), institution_id, description, is_active

**QuestionPermissionRequest** (`app/Http/Requests/QuestionPermissionRequest.php`):
- Validate questionnaire_id, question_name, institution_id, department_id, permission_type

**UserRequest** - Add:
- `department_id` validation (nullable, exists:departments,id)

### API Resources

**DepartmentResource** (`app/Http/Resources/DepartmentResource.php`):
- Return id, name, code, institution_id, description, is_active
- Include institution data when loaded
- Include users_count when counted

**QuestionPermissionResource** (`app/Http/Resources/QuestionPermissionResource.php`):
- Return all fields with loaded relationships

**UserResource** - Add:
- `department_id` and loaded `department` data

### Policies

**DepartmentPolicy**:
- All CRUD methods check `departments.{action}` permissions

**QuestionPermissionPolicy**:
- All methods restricted to admin role only

### Routes

```php
// routes/api.php
Route::middleware('auth:sanctum')->group(function () {
    // Departments
    Route::get('/departments/list', [DepartmentController::class, 'list']);
    Route::apiResource('departments', DepartmentController::class);

    // Question Permissions
    Route::get('/questionnaires/{questionnaire}/permissions',
        [QuestionPermissionController::class, 'byQuestionnaire']);
    Route::post('/question-permissions/bulk',
        [QuestionPermissionController::class, 'bulkStore']);
    Route::apiResource('question-permissions', QuestionPermissionController::class)
        ->except(['show', 'update']);

    // Notifications
    Route::get('/notifications', [NotificationController::class, 'index']);
    Route::get('/notifications/unread-count', [NotificationController::class, 'unreadCount']);
    Route::put('/notifications/{id}/read', [NotificationController::class, 'markAsRead']);
    Route::put('/notifications/mark-all-read', [NotificationController::class, 'markAllAsRead']);

    // Submission workflow (fire events)
    Route::post('/submissions/{id}/submit', [SubmissionController::class, 'submit']);
    Route::post('/submissions/{id}/approve', [SubmissionController::class, 'approve']);
    Route::post('/submissions/{id}/reject', [SubmissionController::class, 'reject']);
});
```

### Permission Seeder Updates

Add to `RoleAndPermissionSeeder`:
```php
$permissions = [
    'departments.view',
    'departments.create',
    'departments.update',
    'departments.delete',
];

// Admin: All permissions
// Enumerator: departments.view
// Viewer: departments.view
```

## Frontend Changes

### TypeScript Types

**Update:** `resources/js/types/index.ts`

```typescript
export interface Department {
    id: number;
    name: string;
    code: string;
    institution_id: number;
    institution?: { id: number; name: string; code: string; level: string };
    description: string | null;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

export interface QuestionPermission {
    id: number;
    questionnaire_id: number;
    question_name: string;
    institution_id: number;
    department_id: number;
    permission_type: 'edit' | 'view';
    // ... with loaded relationships
}

// Update User interface
export interface User {
    // ... existing fields
    department_id?: number | null;
    department?: Department | null;
}

// Update Submission interface
export interface Submission {
    // ... existing fields
    question_permissions?: Record<string, boolean>; // question_name => can_edit
}
```

### API Service

**Update:** `resources/js/services/api.ts`

Add:
```typescript
export const departmentApi = {
    list: (params?: { institution_id?: number }) => ...,
    getAll: (params?) => ...,
    create: (data: Partial<Department>) => ...,
    update: (id: number, data: Partial<Department>) => ...,
    delete: (id: number) => ...,
};

export const questionPermissionApi = {
    byQuestionnaire: (questionnaireId: number) => ...,
    bulkCreate: (data) => ...,
    delete: (id: number) => ...,
};
```

### UI Components

**1. Department Management** (`resources/js/pages/departments/`)
- List departments with institution filter
- Create/edit department form
- Delete confirmation

**2. Question Permission Matrix** (`resources/js/pages/questionnaires/PermissionMatrix.tsx`)
- Matrix view: Questions (rows) × Departments (columns)
- Checkboxes for edit permissions
- Bulk save functionality

**3. User Form Update** (`resources/js/pages/users/UserForm.tsx`)
- Add department dropdown (filtered by selected institution)
- Cascade: Clear department when institution changes

**4. Submission Form** (`resources/js/pages/submissions/SubmissionForm.tsx`)
- Fetch `question_permissions` from API
- Configure SurveyJS read-only mode:
```typescript
survey.onAfterRenderQuestion.add((sender, options) => {
    const questionName = options.question.name;
    const canEdit = questionPermissions[questionName] ?? false;

    if (!canEdit) {
        options.question.readOnly = true;
        options.htmlElement.classList.add('question-readonly');
    }
});
```

**5. Notification Bell** (`resources/js/components/layout/NotificationBell.tsx`)
- Bell icon with unread count badge
- Dropdown showing recent notifications
- Click notification → mark as read + navigate to submission
- "Mark all as read" action
- Poll for new notifications every 30 seconds

```typescript
const NotificationBell = () => {
    const { data: unreadCount } = useQuery({
        queryKey: ['notifications', 'unread-count'],
        queryFn: () => api.get('/notifications/unread-count'),
        refetchInterval: 30000, // Poll every 30s
    });

    const { data: notifications } = useQuery({
        queryKey: ['notifications'],
        queryFn: () => api.get('/notifications?unread_only=true'),
    });

    const markAsRead = useMutation({
        mutationFn: (id) => api.put(`/notifications/${id}/read`),
        onSuccess: () => {
            queryClient.invalidateQueries(['notifications']);
        },
    });

    return (
        <div className="relative">
            <button className="relative">
                <BellIcon />
                {unreadCount > 0 && (
                    <span className="badge">{unreadCount}</span>
                )}
            </button>
            {/* Dropdown with notifications */}
        </div>
    );
};
```

**6. Workflow Action Buttons** (`resources/js/pages/submissions/SubmissionActions.tsx`)
- Submit button (draft → submitted)
- Approve button (submitted → approved)
- Reject button + modal (submitted → rejected with comments)
- Conditional rendering based on status and permissions

## Migration Strategy

**Phase 1: Database Setup**
```bash
php artisan migrate
```
- Creates departments, adds department_id to users, creates question_permissions
- No breaking changes (department_id is nullable)

**Phase 2: Seed Departments**
```bash
php artisan db:seed --class=DepartmentSeeder
```
- Create initial departments for existing institutions

**Phase 3: Assign Users**
- Manual or scripted assignment of users to departments
```sql
UPDATE users SET department_id = ? WHERE institution_id = ?;
```

**Phase 4: Deploy Code**
- Deploy backend (controllers, services, models)
- Deploy frontend (forms, permission UI)

**Phase 5: Configure Permissions**
- Use admin UI to set question permissions per questionnaire

**Rollback:**
```bash
php artisan migrate:rollback --step=3
```

## Testing Requirements

### Backend Tests (Pest)

**DepartmentTest** (`tests/Feature/DepartmentTest.php`):
- CRUD operations
- Cannot delete department with users
- Institution-department relationship

**QuestionPermissionTest** (`tests/Feature/QuestionPermissionTest.php`):
- Create/delete permissions
- Bulk create
- Unique constraint validation

**SubmissionPermissionTest** (`tests/Feature/SubmissionPermissionTest.php`):
- Admin can edit all questions
- Enumerator can only edit permitted questions
- Validation rejects unauthorized edits
- Permission map returned with submission

**QuestionPermissionServiceTest** (`tests/Unit/QuestionPermissionServiceTest.php`):
- `getEditableQuestions()` returns correct list
- `canEditQuestion()` checks correctly
- `validateAnswers()` identifies unauthorized questions

**NotificationTest** (`tests/Feature/NotificationTest.php`):
- Notifications sent on submission submitted
- Notifications sent on submission approved
- Notifications sent on submission rejected
- Email sent when email preference enabled
- In-app notification created when preference enabled
- No notification when preference disabled
- Correct users notified (institution admins for submitted, creator for approved/rejected)

**NotificationServiceTest** (`tests/Unit/NotificationServiceTest.php`):
- `notifySubmissionSubmitted()` notifies hierarchy admins
- `notifySubmissionApproved()` notifies creator
- `notifySubmissionRejected()` notifies creator with comments
- `getInstitutionAdminsInHierarchy()` returns correct admin list

**SubmissionWorkflowTest** (`tests/Feature/SubmissionWorkflowTest.php`):
- Submit action fires SubmissionStatusChanged event
- Approve action fires event and sends notifications
- Reject action fires event with comments
- Only authorized users can approve/reject

### Critical Test Scenarios

**Department & Permission Scenarios:**
1. User from Tax Dept can edit question15
2. User from State Asset Dept can edit question16-17
3. User from other department cannot edit restricted questions
4. Admin bypasses all restrictions
5. Province user can VIEW district submissions (unchanged)
6. Only admins can approve (unchanged)

**Notification Scenarios:**
7. District user submits → Province and Central admins get notifications
8. Admin approves → District user (creator) gets notification
9. Admin rejects with comments → District user gets notification with rejection reason
10. User with email disabled gets only in-app notification
11. User with all notifications disabled gets nothing
12. Notification bell shows correct unread count
13. Clicking notification marks as read and navigates to submission

### Frontend Tests (Jest)

**SubmissionForm.test.tsx**:
- Read-only questions rendered correctly
- Edit permissions respected
- Visual indicators for locked questions

**DepartmentManagement.test.tsx**:
- CRUD operations work
- Institution filter works

**NotificationBell.test.tsx**:
- Displays unread count badge
- Polls for new notifications every 30s
- Marks notification as read on click
- "Mark all as read" clears all notifications
- Navigation to submission works

**SubmissionActions.test.tsx**:
- Submit button shown for draft status
- Approve/Reject buttons shown for admins on submitted status
- Reject modal captures comments
- Status transitions trigger correctly

## Performance Considerations

### Database Indexes
All critical indexes included in migrations:
- `departments(code)`, `departments(institution_id)`
- `question_permissions(questionnaire_id, institution_id, department_id)` - composite
- `question_permissions(question_name)`
- `users(department_id)`

### Query Optimization
- Permission lookups use composite index
- Results cached for 1 hour
- Eager loading prevents N+1 queries

### Caching
- Redis recommended for cache driver
- Cache invalidated on permission changes
- No cache for admin users (always get all permissions)

## Security

### Authorization Layers
1. **Policy-based**: SubmissionPolicy checks institution_id (existing)
2. **Question-level**: QuestionPermissionService validates per question (new)
3. **Frontend**: Read-only UI (convenience only, backend always validates)

### Attack Prevention
- User cannot edit unauthorized questions (403 error)
- Controller uses `auth()->user()->department_id` (never from request)
- Cache keys include IDs to prevent poisoning

## Critical Files

**New Files:**

*Migrations:*
- `database/migrations/2025_11_26_000001_create_departments_table.php`
- `database/migrations/2025_11_26_000002_add_department_id_to_users_table.php`
- `database/migrations/2025_11_26_000003_add_notification_preferences_to_users_table.php`
- `database/migrations/2025_11_26_000004_create_question_permissions_table.php`

*Models & Services:*
- `app/Models/Department.php`
- `app/Models/QuestionPermission.php`
- `app/Services/QuestionPermissionService.php` ⭐ Core permission logic
- `app/Services/NotificationService.php` ⭐ Core notification logic

*Events & Listeners:*
- `app/Events/SubmissionStatusChanged.php`
- `app/Listeners/SendSubmissionNotifications.php`

*Notifications:*
- `app/Notifications/SubmissionCreated.php`
- `app/Notifications/SubmissionSubmitted.php`
- `app/Notifications/SubmissionApproved.php`
- `app/Notifications/SubmissionRejected.php`

*Controllers:*
- `app/Http/Controllers/Api/DepartmentController.php`
- `app/Http/Controllers/Api/QuestionPermissionController.php`
- `app/Http/Controllers/Api/NotificationController.php`

*Requests & Resources:*
- `app/Http/Requests/DepartmentRequest.php`
- `app/Http/Requests/QuestionPermissionRequest.php`
- `app/Http/Resources/DepartmentResource.php`
- `app/Http/Resources/QuestionPermissionResource.php`

*Policies:*
- `app/Policies/DepartmentPolicy.php`
- `app/Policies/QuestionPermissionPolicy.php`

*Frontend Components:*
- `resources/js/components/layout/NotificationBell.tsx` - Bell with unread count
- `resources/js/pages/submissions/SubmissionActions.tsx` - Workflow action buttons
- `resources/js/pages/departments/DepartmentList.tsx` - Department management UI
- `resources/js/pages/departments/DepartmentForm.tsx` - Department create/edit form
- `resources/js/pages/questionnaires/PermissionMatrix.tsx` - Question permission matrix

**Modified Files:**

*Backend:*
- `app/Models/User.php` - Add department relationship + notification preferences
- `app/Models/Institution.php` - Add departments relationship
- `app/Models/Questionnaire.php` - Add questionPermissions relationship
- `app/Models/Submission.php` - Fire events on workflow transitions (submit, approve, reject)
- `app/Http/Controllers/Api/SubmissionController.php` - Integrate permission checks + workflow actions
- `app/Http/Controllers/Api/UserController.php` - Add department_id handling
- `app/Http/Requests/UserRequest.php` - Add department_id validation
- `app/Http/Resources/UserResource.php` - Include department data
- `app/Providers/EventServiceProvider.php` - Register SubmissionStatusChanged event listener
- `database/seeders/RoleAndPermissionSeeder.php` - Add department permissions
- `routes/api.php` - Add department, permission, notification, and workflow routes

*Frontend:*
- `resources/js/types/index.ts` - Add Department, QuestionPermission, Notification types
- `resources/js/services/api.ts` - Add department, permission, and notification API methods
- `resources/js/pages/users/UserForm.tsx` - Add department dropdown with cascading
- `resources/js/pages/submissions/SubmissionForm.tsx` - Integrate question permissions (SurveyJS read-only)
- `resources/js/components/layout/Header.tsx` - Add NotificationBell component

## Implementation Estimate

**Phase 1** (1-2 days): Database foundation
- Create migrations (departments, department_id, notification_preferences, question_permissions)
- Create models (Department, QuestionPermission)
- Run migrations, verify schema

**Phase 2** (3-4 days): Backend core logic
- QuestionPermissionService (permission validation)
- NotificationService (notification dispatch)
- Events & Listeners (SubmissionStatusChanged)
- Notification classes (Created, Submitted, Approved, Rejected)
- Update User model (notification preferences, helpers)
- Update Submission model (fire events on workflow transitions)

**Phase 3** (2-3 days): Controllers & API
- DepartmentController (CRUD)
- QuestionPermissionController (CRUD + bulk operations)
- NotificationController (list, mark as read)
- Update SubmissionController (permission checks + workflow actions)
- Update UserController (department_id handling)
- Form requests, resources, policies
- Routes (departments, permissions, notifications, workflow)
- Seeders (departments, permissions)

**Phase 4** (1-2 days): Backend testing
- Unit tests (QuestionPermissionService, NotificationService)
- Feature tests (Department, QuestionPermission, Notification, SubmissionWorkflow)
- Integration tests (end-to-end permission + notification flow)

**Phase 5** (3-4 days): Frontend UI
- TypeScript types (Department, QuestionPermission, Notification)
- API service methods
- Department management UI (list, form)
- Question permission matrix (questionnaire admin view)
- User form updates (department dropdown with cascading)
- Submission form updates (SurveyJS read-only integration)
- NotificationBell component (polling, dropdown, mark as read)
- SubmissionActions component (submit, approve, reject buttons)

**Phase 6** (1-2 days): Frontend testing
- Component tests (NotificationBell, SubmissionActions, SubmissionForm)
- Integration tests (permission enforcement, notification flow)
- E2E tests (department CRUD, permission matrix, workflow)

**Total: 11-17 days**

**Critical Path:**
1. Database migrations → Models
2. Permission service → Notification service
3. Controllers → Frontend integration
4. Testing throughout (not just at end)

## Key Design Decisions

**Department & Permission System:**
1. **Flat structure** - No sub-departments for simplicity
2. **Composite unique key** - One permission per (questionnaire, question, institution, department)
3. **No persistent caching** - Immediate effect on permission changes (permissions only checked on form load)
4. **Admin bypass** - Admins retain full edit access (skip all permission checks)
5. **Nullable department_id** - Phased rollout support (existing users continue working)
6. **Service pattern** - Centralized logic in QuestionPermissionService (not scattered in controllers)
7. **Institution hierarchy preserved** - VIEW unchanged, departments affect EDIT only
8. **Cascade deletes** - Auto-cleanup of permissions when department deleted

**Notification System:**
9. **Event-driven architecture** - Submission workflow triggers events, listeners dispatch notifications
10. **User preferences** - JSONB column stores granular notification preferences (email/in-app per event type)
11. **Queued notifications** - All notifications use ShouldQueue for async delivery (non-blocking)
12. **Dual channels** - Email + in-app notifications (users control which channels per event)
13. **Hierarchy-aware** - Submissions notify parent + ancestor institution admins (not just direct parent)
14. **Default opt-in** - All notifications enabled by default (users can opt-out)
15. **Real-time polling** - Frontend polls every 30s for new notifications (simple, no WebSockets needed)
16. **Mark as read** - Individual or bulk "mark all as read" functionality
