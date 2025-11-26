# Phase 2 Remaining Implementation Plan

**Date:** November 26, 2025
**Status:** Planning
**Based On:** Department implementation already complete
**Estimated Duration:** 7-9 days

---

## Executive Summary

This plan covers the **remaining features** from Phase 2 that were not included in the department implementation. The department system (question permissions with departments) is **100% complete** with all tests passing. This plan focuses on:

1. **Notification System** (Backend) - Complete event-driven notification infrastructure
2. **Workflow Endpoints** (Backend) - Submit/Approve/Reject with event firing
3. **Model Enhancements** (Backend) - Helper methods for hierarchical access
4. **Frontend UI** (Complete) - All user-facing components for notifications, workflows, and permissions

---

## Table of Contents

1. [Current State Analysis](#current-state-analysis)
2. [Scope of Work](#scope-of-work)
3. [Technical Implementation](#technical-implementation)
4. [Week-by-Week Breakdown](#week-by-week-breakdown)
5. [Testing Requirements](#testing-requirements)
6. [Success Criteria](#success-criteria)
7. [Risk Mitigation](#risk-mitigation)

---

## Current State Analysis

### ✅ Already Implemented (Department System)

**Database:**
- ✅ `departments` table
- ✅ `question_permissions` table (with department_id)
- ✅ `department_id` on users table
- ✅ `notification_preferences` column on users table (JSONB)

**Models:**
- ✅ `Department` model with relationships
- ✅ `QuestionPermission` model with factory
- ✅ `QuestionPermissionService` - Full permission logic

**Controllers:**
- ✅ `DepartmentController` - Full CRUD
- ✅ `QuestionPermissionController` - Full CRUD + bulk operations
- ✅ `SubmissionController` - Permission validation on update

**Frontend:**
- ✅ TypeScript types defined (Department, QuestionPermission, Notification)
- ✅ API service methods defined (departmentsApi, questionPermissionsApi, notificationsApi)

**Tests:**
- ✅ 182 tests passing (35 new department tests + 147 existing)
- ✅ 100% test coverage on department system

### ❌ Missing Components (To Be Implemented)

**Backend:**
- ❌ Notification system (events, listeners, notifications, service)
- ❌ Workflow endpoints (submit, approve, reject with events)
- ❌ Institution model helpers (descendants, ancestors, hierarchy)
- ❌ Questionnaire model helpers (extractQuestionNames)
- ❌ User model notification methods
- ❌ Submission model event firing
- ❌ SubmissionPolicy workflow methods
- ❌ Queue configuration
- ❌ Notification tests

**Frontend:**
- ❌ NotificationBell component
- ❌ SubmissionActions component
- ❌ PermissionMatrix component
- ❌ Department management UI
- ❌ User form updates (department dropdown)
- ❌ Submission form updates (read-only questions)
- ❌ Notification preferences page
- ❌ Frontend component tests

---

## Scope of Work

### Phase 1: Backend - Model Enhancements (Day 1)

**Goal:** Add helper methods to existing models for hierarchical access and questionnaire parsing.

**Files to Modify:**
- `app/Models/Institution.php`
- `app/Models/Questionnaire.php`
- `app/Models/User.php`

**Deliverables:**
- Institution hierarchy methods (descendants, ancestors, isDescendantOf, isAncestorOf)
- Questionnaire question extraction (extractQuestionNames)
- User viewable institutions helper (getViewableInstitutionIds)

---

### Phase 2: Backend - Notification System (Days 2-4)

**Goal:** Complete event-driven notification infrastructure with email and in-app notifications.

#### 2.1 Database Setup (30 minutes)

**Tasks:**
- ✅ Notification preferences column already exists
- Create notifications table (Laravel default)
- Run migrations

**Commands:**
```bash
php artisan notifications:table
php artisan migrate
```

#### 2.2 Events & Listeners (Day 2 - Morning)

**Files to Create:**
- `app/Events/SubmissionStatusChanged.php`
- `app/Listeners/SendSubmissionNotifications.php`

**Files to Modify:**
- `app/Providers/EventServiceProvider.php`

**Tasks:**
- Create SubmissionStatusChanged event with submission, oldStatus, newStatus, userId
- Create SendSubmissionNotifications listener
- Register event → listener mapping
- Test event dispatching manually

#### 2.3 Notification Classes (Day 2 - Afternoon + Day 3 - Morning)

**Files to Create:**
- `app/Notifications/SubmissionCreated.php`
- `app/Notifications/SubmissionSubmitted.php`
- `app/Notifications/SubmissionApproved.php`
- `app/Notifications/SubmissionRejected.php`

**Each notification must:**
- Implement `ShouldQueue` for async delivery
- Support email channel (MailMessage)
- Support database channel (in-app notifications)
- Check user preferences via `wantsEmailNotification()` and `wantsInAppNotification()`
- Include submission details and action URL

**Example Structure:**
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

    public function toMail(object $notifiable): MailMessage { /* ... */ }
    public function toDatabase(object $notifiable): array { /* ... */ }
}
```

#### 2.4 NotificationService (Day 3 - Afternoon)

**File to Create:**
- `app/Services/NotificationService.php`

**Methods:**
- `notifySubmissionCreated(Submission $submission): void`
- `notifySubmissionSubmitted(Submission $submission): void`
- `notifySubmissionApproved(Submission $submission): void`
- `notifySubmissionRejected(Submission $submission): void`
- `getInstitutionAdminsInHierarchy(int $institutionId): Collection` (private)

**Logic:**
- **Created:** Notify institution admins in hierarchy (self + ancestors)
- **Submitted:** Notify parent institution admins + central admins
- **Approved:** Notify creator + institution admins
- **Rejected:** Notify creator only (with rejection comments)

**Example:**
```php
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
```

#### 2.5 NotificationController (Day 4 - Morning)

**File to Create:**
- `app/Http/Controllers/Api/NotificationController.php`

**Endpoints:**
- `GET /api/notifications` - List user's notifications (paginated, filterable by unread_only)
- `GET /api/notifications/unread-count` - Get unread count
- `PUT /api/notifications/{id}/read` - Mark specific notification as read
- `PUT /api/notifications/mark-all-read` - Mark all notifications as read

**Example:**
```php
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

public function unreadCount(Request $request)
{
    $count = $request->user()
        ->unreadNotifications()
        ->count();

    return response()->json(['unread_count' => $count]);
}
```

#### 2.6 User Model Updates (Day 4 - Morning)

**File to Modify:**
- `app/Models/User.php`

**Add:**
- `Notifiable` trait (if not already)
- Cast `notification_preferences` to array
- `defaultNotificationPreferences()` static method
- `wantsEmailNotification(string $event): bool`
- `wantsInAppNotification(string $event): bool`
- `getViewableInstitutionIds(): array`

**Example:**
```php
use Illuminate\Notifications\Notifiable;

class User extends Authenticatable
{
    use Notifiable;

    protected function casts(): array
    {
        return [
            // ... existing casts
            'notification_preferences' => 'array',
        ];
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

    public function wantsEmailNotification(string $event): bool
    {
        $prefs = $this->notification_preferences
            ?? self::defaultNotificationPreferences();

        return ($prefs['email_enabled'] ?? true)
            && ($prefs['events'][$event] ?? true);
    }

    public function wantsInAppNotification(string $event): bool
    {
        $prefs = $this->notification_preferences
            ?? self::defaultNotificationPreferences();

        return ($prefs['in_app_enabled'] ?? true)
            && ($prefs['events'][$event] ?? true);
    }

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

### Phase 3: Backend - Workflow Endpoints (Day 4 - Afternoon)

**Goal:** Add submit/approve/reject endpoints with event firing.

#### 3.1 Submission Model Updates

**File to Modify:**
- `app/Models/Submission.php`

**Tasks:**
- Fire `SubmissionStatusChanged` event in `submit()` method
- Fire `SubmissionStatusChanged` event in `approve()` method
- Fire `SubmissionStatusChanged` event in `reject()` method

**Example:**
```php
use App\Events\SubmissionStatusChanged;

public function submit(): void
{
    $oldStatus = $this->status;

    $this->status = 'submitted';
    $this->submitted_at = now();
    $this->save();

    event(new SubmissionStatusChanged($this, $oldStatus, 'submitted'));
}

public function approve(int $approvedBy): void
{
    $oldStatus = $this->status;

    $this->status = 'approved';
    $this->approved_at = now();
    $this->approved_by = $approvedBy;
    $this->save();

    event(new SubmissionStatusChanged($this, $oldStatus, 'approved', $approvedBy));
}

public function reject(int $rejectedBy, string $comments): void
{
    $oldStatus = $this->status;

    $this->status = 'rejected';
    $this->rejected_at = now();
    $this->rejected_by = $rejectedBy;
    $this->rejection_comments = $comments;
    $this->save();

    event(new SubmissionStatusChanged($this, $oldStatus, 'rejected', $rejectedBy));
}
```

#### 3.2 SubmissionPolicy Updates

**File to Modify:**
- `app/Policies/SubmissionPolicy.php`

**Add Methods:**
- `submit(User $user, Submission $submission): bool`
- `approve(User $user, Submission $submission): bool`
- `reject(User $user, Submission $submission): bool`

**Example:**
```php
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
```

#### 3.3 SubmissionController Updates

**File to Modify:**
- `app/Http/Controllers/Api/SubmissionController.php`

**Add Methods:**
- `submit(Request $request, int $id)`
- `approve(Request $request, int $id)`
- `reject(Request $request, int $id)`

**Example:**
```php
/**
 * Submit submission for review.
 */
public function submit(Request $request, int $id): JsonResponse
{
    $submission = Submission::findOrFail($id);
    $this->authorize('submit', $submission);

    $submission->submit();

    return response()->json([
        'message' => 'Submission submitted successfully',
        'submission' => new SubmissionResource($submission),
    ]);
}

/**
 * Approve submission.
 */
public function approve(Request $request, int $id): JsonResponse
{
    $submission = Submission::findOrFail($id);
    $this->authorize('approve', $submission);

    $submission->approve($request->user()->id);

    return response()->json([
        'message' => 'Submission approved successfully',
        'submission' => new SubmissionResource($submission),
    ]);
}

/**
 * Reject submission.
 */
public function reject(Request $request, int $id): JsonResponse
{
    $submission = Submission::findOrFail($id);
    $this->authorize('reject', $submission);

    $validated = $request->validate([
        'rejection_comments' => 'required|string|min:10',
    ]);

    $submission->reject($request->user()->id, $validated['rejection_comments']);

    return response()->json([
        'message' => 'Submission rejected successfully',
        'submission' => new SubmissionResource($submission),
    ]);
}
```

#### 3.4 Routes

**File to Modify:**
- `routes/api.php`

**Add:**
```php
use App\Http\Controllers\Api\NotificationController;

Route::middleware('auth:sanctum')->group(function () {
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

### Phase 4: Backend - Testing (Day 5)

**Goal:** Comprehensive test coverage for notification system and workflow.

#### 4.1 Feature Tests

**Files to Create:**

1. **`tests/Feature/NotificationTest.php`** (15-20 tests)
   - Test notifications sent on submission created
   - Test notifications sent on submission submitted
   - Test notifications sent on submission approved
   - Test notifications sent on submission rejected
   - Test email channel when email preference enabled
   - Test database channel when in-app preference enabled
   - Test no notification when preference disabled
   - Test correct users notified (hierarchy, creators, admins)
   - Test notification data structure
   - Test mark as read
   - Test mark all as read
   - Test unread count

2. **`tests/Feature/SubmissionWorkflowTest.php`** (10-15 tests)
   - Test draft → submitted transition
   - Test submitted → approved transition
   - Test submitted → rejected transition with comments
   - Test rejected → submitted (resubmission)
   - Test invalid transitions are blocked
   - Test events are fired correctly
   - Test only authorized users can submit
   - Test only authorized users can approve
   - Test only authorized users can reject
   - Test rejection requires comments (min 10 chars)
   - Test submission cannot be edited after approved
   - Test submission can be edited after rejected

3. **`tests/Feature/NotificationControllerTest.php`** (8-10 tests)
   - Test list notifications (paginated)
   - Test list unread notifications only
   - Test get unread count
   - Test mark notification as read
   - Test mark all notifications as read
   - Test cannot mark other user's notification as read
   - Test notifications ordered by newest first

#### 4.2 Unit Tests

**Files to Create:**

1. **`tests/Unit/NotificationServiceTest.php`** (8-10 tests)
   - Test `notifySubmissionCreated()` sends to correct users
   - Test `notifySubmissionSubmitted()` sends to parent + central admins
   - Test `notifySubmissionApproved()` sends to creator + admins
   - Test `notifySubmissionRejected()` sends to creator only
   - Test `getInstitutionAdminsInHierarchy()` returns correct users
   - Test notification preferences are respected
   - Test no notification sent when user has no preference

2. **`tests/Unit/InstitutionTest.php`** (6-8 tests)
   - Test `descendants()` returns all descendants recursively
   - Test `ancestors()` returns all ancestors up to root
   - Test `isDescendantOf()` correctly identifies descendants
   - Test `isAncestorOf()` correctly identifies ancestors
   - Test `getViewableInstitutionIds()` returns self + descendants

3. **`tests/Unit/QuestionnaireTest.php`** (3-4 tests)
   - Test `extractQuestionNames()` parses SurveyJS schema
   - Test handles nested panels in schema
   - Test handles empty schema
   - Test handles malformed schema gracefully

#### 4.3 Test Coverage Goals

- **Target:** 90%+ coverage on new code
- **Critical Paths:** 100% coverage on notification logic and workflow transitions
- **Run:** `php artisan test --coverage`

---

### Phase 5: Frontend - Core Components (Days 6-7)

**Goal:** Build essential UI components for notifications and workflows.

#### 5.1 NotificationBell Component (Day 6 - Morning)

**File to Create:**
- `resources/js/components/layout/NotificationBell.tsx`

**Features:**
- Bell icon with unread count badge
- Dropdown panel showing recent notifications
- Click notification → mark as read + navigate to submission
- "Mark all as read" action button
- Poll for new notifications every 30 seconds
- Loading states
- Empty state message

**Example Structure:**
```typescript
const NotificationBell: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);

    const { data: unreadCount, refetch: refetchCount } = useQuery({
        queryKey: ['notifications', 'unread-count'],
        queryFn: () => notificationsApi.getUnreadCount(),
        refetchInterval: 30000, // Poll every 30s
    });

    const { data: notifications, refetch: refetchNotifications } = useQuery({
        queryKey: ['notifications'],
        queryFn: () => notificationsApi.getAll({ unread_only: true }),
        enabled: isOpen,
    });

    const markAsReadMutation = useMutation({
        mutationFn: (id: string) => notificationsApi.markAsRead(id),
        onSuccess: () => {
            refetchCount();
            refetchNotifications();
        },
    });

    const markAllAsReadMutation = useMutation({
        mutationFn: () => notificationsApi.markAllAsRead(),
        onSuccess: () => {
            refetchCount();
            refetchNotifications();
        },
    });

    return (
        <div className="relative">
            <button onClick={() => setIsOpen(!isOpen)} className="relative">
                <BellIcon className="h-6 w-6" />
                {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                        {unreadCount}
                    </span>
                )}
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-white shadow-lg rounded-lg">
                    {/* Notification list */}
                </div>
            )}
        </div>
    );
};
```

#### 5.2 SubmissionActions Component (Day 6 - Afternoon)

**File to Create:**
- `resources/js/pages/submissions/SubmissionActions.tsx`

**Features:**
- Submit button (visible when draft + user is creator)
- Approve button (visible when submitted + user can approve)
- Reject button (visible when submitted + user can approve)
- Reject modal with comments textarea (required, min 10 chars)
- Conditional rendering based on submission status + user permissions
- Loading states during API calls
- Success/error toast notifications

**Example Structure:**
```typescript
interface SubmissionActionsProps {
    submission: Submission;
    onUpdate: () => void;
}

const SubmissionActions: React.FC<SubmissionActionsProps> = ({ submission, onUpdate }) => {
    const { user } = useAuth();
    const [showRejectModal, setShowRejectModal] = useState(false);
    const [rejectComments, setRejectComments] = useState('');

    const canSubmit = submission.status === 'draft' && submission.created_by === user?.id;
    const canApprove = submission.status === 'submitted' && user?.permissions?.includes('submissions.approve');
    const canReject = canApprove;

    const submitMutation = useMutation({
        mutationFn: () => api.post(`/submissions/${submission.id}/submit`),
        onSuccess: () => {
            toast.success('Submission submitted for review');
            onUpdate();
        },
        onError: (error) => toast.error(error.message),
    });

    const approveMutation = useMutation({
        mutationFn: () => api.post(`/submissions/${submission.id}/approve`),
        onSuccess: () => {
            toast.success('Submission approved');
            onUpdate();
        },
        onError: (error) => toast.error(error.message),
    });

    const rejectMutation = useMutation({
        mutationFn: (comments: string) =>
            api.post(`/submissions/${submission.id}/reject`, { rejection_comments: comments }),
        onSuccess: () => {
            toast.success('Submission rejected');
            setShowRejectModal(false);
            setRejectComments('');
            onUpdate();
        },
        onError: (error) => toast.error(error.message),
    });

    return (
        <>
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

            {/* Reject Modal */}
            {showRejectModal && (
                <Modal onClose={() => setShowRejectModal(false)}>
                    <h2>Reject Submission</h2>
                    <textarea
                        value={rejectComments}
                        onChange={(e) => setRejectComments(e.target.value)}
                        placeholder="Explain why this submission is being rejected (minimum 10 characters)"
                        rows={4}
                        className="w-full border rounded p-2"
                    />
                    <div className="flex gap-2 mt-4">
                        <button
                            onClick={() => rejectMutation.mutate(rejectComments)}
                            disabled={rejectComments.length < 10}
                            className="btn-danger"
                        >
                            Confirm Rejection
                        </button>
                        <button onClick={() => setShowRejectModal(false)} className="btn-secondary">
                            Cancel
                        </button>
                    </div>
                </Modal>
            )}
        </>
    );
};
```

---

### Phase 6: Frontend - Advanced Components (Day 7-8)

#### 6.1 PermissionMatrix Component (Day 7)

**File to Create:**
- `resources/js/pages/questionnaires/PermissionMatrix.tsx`

**Features:**
- Grid view: Questions (rows) × Departments (columns)
- Checkboxes for edit permissions per question-department combination
- Bulk selection by row (all departments for question)
- Bulk selection by column (all questions for department)
- Save button (bulk API call)
- Cancel button (reset to original state)
- Loading states
- Institution filter dropdown

**Example Structure:**
```typescript
interface PermissionMatrixProps {
    questionnaireId: number;
}

const PermissionMatrix: React.FC<PermissionMatrixProps> = ({ questionnaireId }) => {
    const [permissions, setPermissions] = useState<Record<string, Record<number, boolean>>>({});
    const [selectedInstitution, setSelectedInstitution] = useState<number | null>(null);

    const { data: questionnaire } = useQuery({
        queryKey: ['questionnaires', questionnaireId],
        queryFn: () => api.get(`/questionnaires/${questionnaireId}`),
    });

    const { data: departments } = useQuery({
        queryKey: ['departments', 'list', selectedInstitution],
        queryFn: () => departmentsApi.list({ institution_id: selectedInstitution }),
        enabled: !!selectedInstitution,
    });

    const { data: existingPermissions } = useQuery({
        queryKey: ['questionnaires', questionnaireId, 'permissions'],
        queryFn: () => questionPermissionsApi.byQuestionnaire(questionnaireId),
    });

    const saveMutation = useMutation({
        mutationFn: (data: any) => questionPermissionsApi.bulkCreate(data),
        onSuccess: () => toast.success('Permissions saved successfully'),
    });

    const handleToggle = (questionName: string, departmentId: number) => {
        setPermissions(prev => ({
            ...prev,
            [questionName]: {
                ...(prev[questionName] || {}),
                [departmentId]: !(prev[questionName]?.[departmentId] ?? false),
            },
        }));
    };

    const handleSave = () => {
        const permissionsArray = Object.entries(permissions).flatMap(([questionName, depts]) =>
            Object.entries(depts)
                .filter(([_, canEdit]) => canEdit)
                .map(([departmentId, _]) => ({
                    questionnaire_id: questionnaireId,
                    question_name: questionName,
                    institution_id: selectedInstitution,
                    department_id: Number(departmentId),
                    permission_type: 'edit',
                }))
        );

        saveMutation.mutate({ permissions: permissionsArray });
    };

    return (
        <div className="p-6">
            <h2 className="text-2xl font-bold mb-4">Permission Matrix</h2>

            {/* Institution filter */}
            <select
                value={selectedInstitution || ''}
                onChange={(e) => setSelectedInstitution(Number(e.target.value))}
                className="mb-4 border rounded p-2"
            >
                <option value="">Select Institution</option>
                {/* Institution options */}
            </select>

            {/* Grid */}
            {selectedInstitution && (
                <table className="w-full border-collapse">
                    <thead>
                        <tr>
                            <th className="border p-2">Question</th>
                            {departments?.map(dept => (
                                <th key={dept.id} className="border p-2">{dept.name}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {questionnaire?.schema_json?.pages?.flatMap(page =>
                            page.elements?.map(element => (
                                <tr key={element.name}>
                                    <td className="border p-2">{element.title || element.name}</td>
                                    {departments?.map(dept => (
                                        <td key={dept.id} className="border p-2 text-center">
                                            <input
                                                type="checkbox"
                                                checked={permissions[element.name]?.[dept.id] ?? false}
                                                onChange={() => handleToggle(element.name, dept.id)}
                                            />
                                        </td>
                                    ))}
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            )}

            <div className="mt-4 flex gap-2">
                <button onClick={handleSave} className="btn-primary">Save Permissions</button>
                <button onClick={() => setPermissions({})} className="btn-secondary">Cancel</button>
            </div>
        </div>
    );
};
```

#### 6.2 Department Management UI (Day 7 - Afternoon)

**Files to Create:**
- `resources/js/pages/departments/DepartmentList.tsx`
- `resources/js/pages/departments/DepartmentForm.tsx`

**DepartmentList Features:**
- Table view with columns: Name, Code, Institution, Active, Actions
- Institution filter dropdown
- Active/Inactive filter toggle
- Create button
- Edit/Delete actions per row
- Pagination
- Delete confirmation modal

**DepartmentForm Features:**
- Name field (required)
- Code field (required, unique per institution)
- Institution dropdown (required)
- Description textarea (optional)
- Active toggle (default true)
- Save/Cancel buttons
- Validation error messages

#### 6.3 Submission Form Updates (Day 8 - Morning)

**File to Modify:**
- `resources/js/pages/submissions/SubmissionForm.tsx`

**Updates:**
- Fetch `question_permissions` from submission API
- Configure SurveyJS read-only mode for restricted questions
- Add visual indicator (lock icon, disabled styling) for read-only questions
- Show rejection comments banner if status is 'rejected'
- Disable submit button when no editable questions changed

**Example:**
```typescript
const SubmissionForm: React.FC<SubmissionFormProps> = ({ submissionId }) => {
    const { data: submission } = useQuery({
        queryKey: ['submissions', submissionId],
        queryFn: () => api.get(`/submissions/${submissionId}`),
    });

    const questionPermissions = submission?.question_permissions || {};

    const survey = useMemo(() => {
        if (!submission?.questionnaire?.schema_json) return null;

        const surveyModel = new Model(submission.questionnaire.schema_json);
        surveyModel.data = submission.answers_json || {};

        // Configure read-only mode for restricted questions
        surveyModel.onAfterRenderQuestion.add((sender, options) => {
            const questionName = options.question.name;
            const canEdit = questionPermissions[questionName] ?? false;

            if (!canEdit) {
                options.question.readOnly = true;
                options.htmlElement.classList.add('question-readonly');

                // Add lock icon
                const lockIcon = document.createElement('span');
                lockIcon.innerHTML = '🔒';
                lockIcon.className = 'text-gray-400 ml-2';
                options.htmlElement.querySelector('.sv-title')?.appendChild(lockIcon);
            }
        });

        return surveyModel;
    }, [submission]);

    return (
        <div className="p-6">
            {submission?.status === 'rejected' && (
                <div className="bg-red-50 border border-red-200 rounded p-4 mb-4">
                    <h3 className="font-bold text-red-800">Submission Rejected</h3>
                    <p className="text-red-700">{submission.rejection_comments}</p>
                </div>
            )}

            {survey && <Survey model={survey} onComplete={handleSave} />}
        </div>
    );
};
```

#### 6.4 User Form Updates (Day 8 - Afternoon)

**File to Modify:**
- `resources/js/pages/users/UserForm.tsx`

**Updates:**
- Add department dropdown after institution dropdown
- Filter departments by selected institution
- Cascade: Clear department when institution changes
- Load department data when editing existing user

**Example:**
```typescript
const [selectedInstitution, setSelectedInstitution] = useState<number | null>(user?.institution_id || null);
const [selectedDepartment, setSelectedDepartment] = useState<number | null>(user?.department_id || null);

const { data: departments } = useQuery({
    queryKey: ['departments', 'list', selectedInstitution],
    queryFn: () => departmentsApi.list({ institution_id: selectedInstitution }),
    enabled: !!selectedInstitution,
});

const handleInstitutionChange = (institutionId: number) => {
    setSelectedInstitution(institutionId);
    setSelectedDepartment(null); // Clear department when institution changes
};

return (
    <form>
        {/* ... existing fields ... */}

        <select value={selectedInstitution || ''} onChange={(e) => handleInstitutionChange(Number(e.target.value))}>
            <option value="">Select Institution</option>
            {institutions?.map(inst => (
                <option key={inst.id} value={inst.id}>{inst.name}</option>
            ))}
        </select>

        <select
            value={selectedDepartment || ''}
            onChange={(e) => setSelectedDepartment(Number(e.target.value))}
            disabled={!selectedInstitution}
        >
            <option value="">Select Department (Optional)</option>
            {departments?.map(dept => (
                <option key={dept.id} value={dept.id}>{dept.name}</option>
            ))}
        </select>
    </form>
);
```

---

### Phase 7: Frontend - Testing (Day 9)

**Goal:** Comprehensive component test coverage.

#### 7.1 Component Tests

**Files to Create:**

1. **`resources/js/__tests__/NotificationBell.test.tsx`**
   - Renders bell icon
   - Displays unread count badge when count > 0
   - Hides badge when count = 0
   - Opens dropdown on click
   - Closes dropdown on outside click
   - Displays notifications in dropdown
   - Marks notification as read on click
   - Navigates to submission on notification click
   - Marks all as read functionality
   - Polls for new notifications every 30s

2. **`resources/js/__tests__/SubmissionActions.test.tsx`**
   - Shows submit button for draft + creator
   - Hides submit button for non-creator
   - Shows approve/reject buttons for submitted + admin
   - Hides approve/reject for non-admin
   - Opens reject modal on reject click
   - Validates rejection comments (min 10 chars)
   - Disables confirm button when comments < 10 chars
   - Calls submit API on submit click
   - Calls approve API on approve click
   - Calls reject API with comments on confirm
   - Shows success toast on successful action
   - Shows error toast on failed action

3. **`resources/js/__tests__/PermissionMatrix.test.tsx`**
   - Renders grid with questions and departments
   - Filters departments by institution
   - Toggles checkbox on click
   - Bulk selects row (all departments for question)
   - Bulk selects column (all questions for department)
   - Calls bulk API on save
   - Resets state on cancel
   - Shows loading state during save
   - Shows success message on save
   - Shows error message on failure

4. **`resources/js/__tests__/DepartmentManagement.test.tsx`**
   - Renders department list
   - Filters by institution
   - Filters by active status
   - Opens create form
   - Opens edit form with existing data
   - Validates required fields
   - Calls create API on save
   - Calls update API on save
   - Shows delete confirmation
   - Calls delete API on confirm
   - Prevents delete if department has users

#### 7.2 Test Coverage Goal

- **Target:** 80%+ coverage on new components
- **Run:** `npm run test:coverage`

---

## Week-by-Week Breakdown

### Week 1: Backend Implementation (Days 1-5)

**Day 1: Model Enhancements**
- ✅ Morning: Institution model helpers
- ✅ Afternoon: Questionnaire + User model helpers
- ✅ Write unit tests for all helpers

**Day 2: Events & Notifications (Part 1)**
- ✅ Morning: Create events and listeners
- ✅ Afternoon: Create notification classes (SubmissionCreated, SubmissionSubmitted)

**Day 3: Notifications (Part 2)**
- ✅ Morning: Create notification classes (SubmissionApproved, SubmissionRejected)
- ✅ Afternoon: Create NotificationService

**Day 4: Controllers & Workflow**
- ✅ Morning: NotificationController + User model updates
- ✅ Afternoon: Workflow endpoints (submit, approve, reject) + SubmissionPolicy

**Day 5: Backend Testing**
- ✅ Morning: NotificationTest + SubmissionWorkflowTest
- ✅ Afternoon: NotificationServiceTest + Model unit tests
- ✅ Run full test suite, fix any failures

### Week 2: Frontend Implementation (Days 6-9)

**Day 6: Core UI Components**
- ✅ Morning: NotificationBell component
- ✅ Afternoon: SubmissionActions component

**Day 7: Advanced Components**
- ✅ Morning: PermissionMatrix component
- ✅ Afternoon: Department management UI (List + Form)

**Day 8: Form Updates**
- ✅ Morning: Submission form updates (read-only questions)
- ✅ Afternoon: User form updates (department dropdown)

**Day 9: Frontend Testing**
- ✅ Morning: Component tests (NotificationBell, SubmissionActions)
- ✅ Afternoon: Component tests (PermissionMatrix, DepartmentManagement)
- ✅ Run test coverage, ensure 80%+

---

## Testing Requirements

### Backend Testing (Pest)

**New Test Files:**
1. `tests/Feature/NotificationTest.php` (15-20 tests)
2. `tests/Feature/SubmissionWorkflowTest.php` (10-15 tests)
3. `tests/Feature/NotificationControllerTest.php` (8-10 tests)
4. `tests/Unit/NotificationServiceTest.php` (8-10 tests)
5. `tests/Unit/InstitutionTest.php` (6-8 tests)
6. `tests/Unit/QuestionnaireTest.php` (3-4 tests)

**Total New Tests:** ~50-65 tests

**Coverage Goal:** 90%+ on new code

**Critical Scenarios:**
- Notification sent on each workflow transition
- Correct users receive notifications (hierarchy-aware)
- Email + in-app channels work correctly
- User preferences are respected
- Only authorized users can approve/reject
- Events are fired on state changes
- Institution hierarchy methods work recursively

### Frontend Testing (Jest)

**New Test Files:**
1. `resources/js/__tests__/NotificationBell.test.tsx` (10 tests)
2. `resources/js/__tests__/SubmissionActions.test.tsx` (12 tests)
3. `resources/js/__tests__/PermissionMatrix.test.tsx` (10 tests)
4. `resources/js/__tests__/DepartmentManagement.test.tsx` (8 tests)

**Total New Tests:** ~40 tests

**Coverage Goal:** 80%+ on components

---

## Success Criteria

### Functional Success

**Notification System:**
- [ ] Email notifications sent on all workflow transitions
- [ ] In-app notifications appear in notification bell
- [ ] Unread count badge displays correctly
- [ ] Notifications marked as read when clicked
- [ ] User preferences control notification delivery
- [ ] Correct users receive notifications (hierarchy-aware)

**Workflow Management:**
- [ ] District user can submit draft for review
- [ ] Province/Central admin receives notification
- [ ] Admin can approve submitted submission
- [ ] Admin can reject with comments (min 10 chars)
- [ ] Rejected submission can be edited and resubmitted
- [ ] Creator receives notification on approve/reject
- [ ] All transitions fire events correctly

**Permission UI:**
- [ ] Permission matrix displays questions × departments grid
- [ ] Admin can assign edit permissions per question-department
- [ ] Bulk save updates all permissions
- [ ] Department management CRUD works
- [ ] User form includes department dropdown

**Form Rendering:**
- [ ] Restricted questions are read-only in submission form
- [ ] Visual indicators show locked questions
- [ ] Rejection comments banner displays on rejected submissions

### Technical Success

- [ ] All backend tests passing (50-65 new tests)
- [ ] All frontend tests passing (40 new tests)
- [ ] 90%+ backend test coverage on new code
- [ ] 80%+ frontend test coverage on components
- [ ] API response time < 500ms for notification endpoints
- [ ] Email notifications sent within 30 seconds
- [ ] Zero console errors in browser
- [ ] No TypeScript errors

### Quality Success

- [ ] Code review completed
- [ ] No security vulnerabilities
- [ ] All API endpoints properly authorized
- [ ] Database queries optimized (proper indexes)
- [ ] Queue workers running reliably
- [ ] Email delivery success rate > 95%

---

## Risk Mitigation

### Technical Risks

**Risk 1: Queue Worker Failures**
- **Likelihood:** Medium
- **Impact:** High (notifications not sent)
- **Mitigation:**
  - Configure queue retry logic (3 attempts)
  - Set up queue worker monitoring
  - Log all notification failures
  - Fallback to in-app notifications if email fails
  - Test queue worker restart scenarios

**Risk 2: Email Delivery Issues**
- **Likelihood:** Medium
- **Impact:** Medium
- **Mitigation:**
  - Use reliable SMTP provider (e.g., Mailtrap for testing, SendGrid for production)
  - Configure SPF/DKIM records
  - Monitor email delivery rates
  - Provide in-app notifications as backup

**Risk 3: Notification Spam**
- **Likelihood:** Low
- **Impact:** Medium (user annoyance)
- **Mitigation:**
  - Respect user preferences (opt-out per event type)
  - Batch notifications for same submission (future enhancement)
  - Rate limiting on notification sending

**Risk 4: Frontend Polling Performance**
- **Likelihood:** Low
- **Impact:** Low
- **Mitigation:**
  - Poll only when user is active (use visibility API)
  - Increase interval to 60s if no activity
  - Use lightweight endpoint (unread count only)
  - Consider WebSockets for real-time (future enhancement)

### Schedule Risks

**Risk 1: Testing Takes Longer Than Expected**
- **Mitigation:**
  - Prioritize critical path tests first
  - Write tests alongside implementation (not at end)
  - Use factories for test data generation
  - Parallel test execution

**Risk 2: Frontend Component Complexity**
- **Mitigation:**
  - Break components into smaller sub-components
  - Reuse existing UI components where possible
  - Mock API calls in tests
  - Use TypeScript to catch errors early

---

## Infrastructure Requirements

### Queue Configuration

**Install Redis (if not already):**
```bash
# Windows (via Chocolatey)
choco install redis-64

# Or use Docker
docker run -d -p 6379:6379 redis:alpine
```

**Update `.env`:**
```env
QUEUE_CONNECTION=redis
REDIS_HOST=127.0.0.1
REDIS_PASSWORD=null
REDIS_PORT=6379
```

**Start Queue Worker:**
```bash
php artisan queue:work redis --tries=3 --timeout=60
```

**Supervisor Configuration (Production):**
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

### Email Configuration

**Development (Mailtrap):**
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

**Production (SendGrid/SES/etc.):**
```env
MAIL_MAILER=smtp
MAIL_HOST=smtp.sendgrid.net
MAIL_PORT=587
MAIL_USERNAME=apikey
MAIL_PASSWORD=your_sendgrid_api_key
MAIL_ENCRYPTION=tls
MAIL_FROM_ADDRESS=noreply@yourdomain.com
MAIL_FROM_NAME="${APP_NAME}"
```

---

## Deployment Checklist

### Pre-Deployment

**Code Quality:**
- [ ] All tests passing (backend + frontend)
- [ ] Code review completed
- [ ] No console errors or warnings
- [ ] TypeScript type check passing
- [ ] PHP linting passing (`./vendor/bin/pint --test`)

**Database:**
- [ ] Notifications table created
- [ ] All migrations tested on staging
- [ ] Backup production database

**Infrastructure:**
- [ ] Queue workers configured
- [ ] Redis configured
- [ ] Email SMTP configured
- [ ] Queue monitoring in place

**Documentation:**
- [ ] API documentation updated
- [ ] User guide for notifications
- [ ] Admin guide for workflow management

### Deployment Steps

1. **Run Migrations:**
   ```bash
   php artisan notifications:table
   php artisan migrate --force
   ```

2. **Clear Caches:**
   ```bash
   php artisan cache:clear
   php artisan config:cache
   php artisan route:cache
   php artisan view:cache
   ```

3. **Restart Queue Workers:**
   ```bash
   php artisan queue:restart
   # Or with Supervisor:
   sudo supervisorctl restart laravel-worker:*
   ```

4. **Build Frontend:**
   ```bash
   npm ci
   npm run build
   ```

5. **Smoke Tests:**
   - Login as admin
   - Create test submission
   - Submit for review
   - Verify notification received (email + in-app)
   - Approve submission
   - Verify creator receives notification
   - Test reject with comments

### Post-Deployment Monitoring

**Monitor for 48 hours:**
- [ ] Error logs (Laravel + web server)
- [ ] Queue job failures
- [ ] Email delivery rates
- [ ] API response times
- [ ] User feedback

**Metrics to Track:**
- Notification delivery rate (target: > 95%)
- Email delivery success rate (target: > 95%)
- Queue processing time (target: < 30s)
- Failed job count (target: < 1%)

---

## Files Summary

### New Files to Create (28 files)

**Backend (16 files):**
1. `app/Events/SubmissionStatusChanged.php`
2. `app/Listeners/SendSubmissionNotifications.php`
3. `app/Notifications/SubmissionCreated.php`
4. `app/Notifications/SubmissionSubmitted.php`
5. `app/Notifications/SubmissionApproved.php`
6. `app/Notifications/SubmissionRejected.php`
7. `app/Services/NotificationService.php`
8. `app/Http/Controllers/Api/NotificationController.php`
9. `tests/Feature/NotificationTest.php`
10. `tests/Feature/SubmissionWorkflowTest.php`
11. `tests/Feature/NotificationControllerTest.php`
12. `tests/Unit/NotificationServiceTest.php`
13. `tests/Unit/InstitutionTest.php`
14. `tests/Unit/QuestionnaireTest.php`
15. `database/migrations/xxxx_create_notifications_table.php` (via artisan command)

**Frontend (12 files):**
1. `resources/js/components/layout/NotificationBell.tsx`
2. `resources/js/pages/submissions/SubmissionActions.tsx`
3. `resources/js/pages/questionnaires/PermissionMatrix.tsx`
4. `resources/js/pages/departments/DepartmentList.tsx`
5. `resources/js/pages/departments/DepartmentForm.tsx`
6. `resources/js/__tests__/NotificationBell.test.tsx`
7. `resources/js/__tests__/SubmissionActions.test.tsx`
8. `resources/js/__tests__/PermissionMatrix.test.tsx`
9. `resources/js/__tests__/DepartmentManagement.test.tsx`

### Files to Modify (10 files)

**Backend (7 files):**
1. `app/Models/Institution.php` - Add hierarchy methods
2. `app/Models/Questionnaire.php` - Add extractQuestionNames()
3. `app/Models/User.php` - Add notification methods
4. `app/Models/Submission.php` - Fire events on workflow methods
5. `app/Policies/SubmissionPolicy.php` - Add workflow policy methods
6. `app/Http/Controllers/Api/SubmissionController.php` - Add workflow endpoints
7. `app/Providers/EventServiceProvider.php` - Register event listeners
8. `routes/api.php` - Add notification + workflow routes

**Frontend (3 files):**
1. `resources/js/pages/submissions/SubmissionForm.tsx` - Read-only questions
2. `resources/js/pages/users/UserForm.tsx` - Department dropdown
3. `resources/js/app.tsx` - Add routes for new pages

---

## Appendix: Code Templates

### A. Event Template

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

### B. Listener Template

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

### C. Notification Template

```php
<?php

namespace App\Notifications;

use App\Models\Submission;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

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
            ->action('Review Submission', $url)
            ->line('Thank you for using our application!');
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

### D. Test Template

```php
<?php

use App\Models\Submission;
use App\Models\User;
use App\Notifications\SubmissionSubmitted;
use Database\Seeders\RoleAndPermissionSeeder;
use Illuminate\Support\Facades\Notification;

beforeEach(function () {
    $this->seed(RoleAndPermissionSeeder::class);
});

it('sends notification when submission is submitted', function () {
    Notification::fake();

    $creator = User::factory()->create();
    $creator->assignRole('enumerator');

    $submission = Submission::factory()->draft()->create([
        'created_by' => $creator->id,
    ]);

    // Act
    $this->actingAs($creator)
        ->postJson("/api/submissions/{$submission->id}/submit")
        ->assertOk();

    // Assert
    Notification::assertSentTo(
        [User::role('admin')->get()],
        SubmissionSubmitted::class,
        function ($notification, $channels) use ($submission) {
            return $notification->submission->id === $submission->id;
        }
    );
});
```

---

**End of Phase 2 Remaining Implementation Plan**

**Total Estimated Effort:** 7-9 days
**Priority:** High
**Dependencies:** Department system (already complete)
**Next Steps:** Review plan → Approve → Begin Day 1 implementation
