# Phase 2 Setup Addendum

**Document:** Supplement to main Setup Guide
**Version:** 1.0
**Date:** November 26, 2025
**Phase:** 2 - Department Management & Question-Level Permissions

---

## Overview

This document supplements the main Setup Guide with Phase 2-specific features:
- Department management system
- Question-level permission matrix
- Enhanced submission workflow with notifications
- Hierarchical institution access control

**Read the main Setup Guide first**, then refer to this document for Phase 2-specific configuration.

---

## Table of Contents

1. [New Database Tables](#new-database-tables)
2. [Updated Seeders](#updated-seeders)
3. [Queue Configuration](#queue-configuration)
4. [Testing Phase 2 Features](#testing-phase-2-features)
5. [Migration Notes](#migration-notes)
6. [API Endpoints](#api-endpoints)
7. [Troubleshooting](#troubleshooting)

---

## New Database Tables

Phase 2 introduces these new tables:

### departments

Stores organizational departments within institutions:

```sql
- id (bigint, primary key)
- name (varchar) - Department name
- code (varchar) - Unique code within institution
- institution_id (bigint) - Parent institution
- description (text, nullable)
- is_active (boolean)
- users_count (integer) - Cached count
- created_by, updated_by, deleted_by
- timestamps, soft deletes
```

**Indexes:**
- `departments_institution_id_foreign`
- `departments_institution_id_code_unique` (composite unique)

**Relationships:**
- Belongs to Institution
- Has many Users
- Has many QuestionPermissions

### question_permissions

Stores department-based question edit permissions:

```sql
- id (bigint, primary key)
- questionnaire_id (bigint)
- question_name (varchar) - From SurveyJS schema
- institution_id (bigint)
- department_id (bigint)
- permission_type (enum: 'edit', 'view')
- created_by, updated_by
- timestamps
```

**Indexes:**
- `question_permissions_questionnaire_id_foreign`
- `question_permissions_institution_id_foreign`
- `question_permissions_department_id_foreign`
- `unique_question_permission` (composite: questionnaire_id, question_name, institution_id, department_id)

**Relationships:**
- Belongs to Questionnaire
- Belongs to Institution
- Belongs to Department

### notifications

Stores user notifications for workflow events:

```sql
- id (uuid, primary key)
- type (varchar) - Notification class name
- notifiable_type, notifiable_id (polymorphic)
- data (json) - Notification payload
- read_at (timestamp, nullable)
- created_at
```

**Indexes:**
- `notifications_notifiable_type_notifiable_id_index`

### Updated Tables

**users table - new columns:**
```sql
- department_id (bigint, nullable) - Department assignment (Phase 2)
- notification_preferences (json, nullable) - User preferences (Phase 2)
```

**submissions table - enhanced:**
- Now includes `question_permissions` in API responses (calculated at runtime)

---

## Updated Seeders

### DepartmentSeeder (NEW)

Creates default departments for institutions:

```php
// database/seeders/DepartmentSeeder.php
Department::updateOrCreate(
    ['institution_id' => $institution->id, 'code' => 'HR'],
    [
        'name' => 'Human Resources',
        'description' => 'Human resources and staff management',
        'is_active' => true,
    ]
);
```

**Default departments created:**
- HR (Human Resources)
- IT (Information Technology)
- FIN (Finance)
- DATA (Data Management)

**Upsert Logic:**
- Uses `updateOrCreate()` for safe re-seeding
- Matches on: institution_id + code
- Updates: name, description, is_active

### Enhanced DatabaseSeeder

Updated to include Phase 2 seeders:

```php
public function run(): void
{
    $this->call([
        RoleAndPermissionSeeder::class,
        InstitutionSeeder::class,
        DepartmentSeeder::class,        // NEW
        UserSeeder::class,
    ]);
}
```

### DemoSeeder Enhancements

Updated to create Phase 2 demo data:

```php
// Creates:
- Sample departments for all institutions
- Users with department assignments
- Question permissions for questionnaires
- Submissions with permission-restricted questions
```

**Running Demo Seeder:**

```bash
# Safe to run multiple times
php artisan db:seed --class=DemoSeeder

# Creates:
# - 2 provinces under Central Office
# - 2-3 districts per province
# - 3-4 departments per institution
# - 5-10 users per institution
# - 2-3 questionnaires with permissions
# - 10-20 submissions in various states
```

---

## Queue Configuration

Phase 2 uses queues for notification delivery.

### Development

Already configured in `.env`:

```env
QUEUE_CONNECTION=database
```

**Running Queue Worker:**

```bash
# Option 1: Using composer script (recommended)
composer dev  # Runs queue worker automatically

# Option 2: Manual
php artisan queue:work --tries=1
```

### Production

#### Supervisor Configuration

Create `/etc/supervisor/conf.d/qi-survey-worker.conf`:

```ini
[program:qi-survey-worker]
process_name=%(program_name)s_%(process_num)02d
command=php /var/www/qi-survey-webapp/artisan queue:work database --sleep=3 --tries=3 --max-time=3600
autostart=true
autorestart=true
stopasgroup=true
killasgroup=true
user=www-data
numprocs=2
redirect_stderr=true
stdout_logfile=/var/www/qi-survey-webapp/storage/logs/worker.log
stopwaitsecs=3600
```

**Start Workers:**

```bash
sudo supervisorctl reread
sudo supervisorctl update
sudo supervisorctl start qi-survey-worker:*

# Check status
sudo supervisorctl status
```

**Monitoring Workers:**

```bash
# View worker logs
tail -f storage/logs/worker.log

# Check queue status
php artisan queue:monitor

# Failed jobs
php artisan queue:failed
php artisan queue:retry all  # Retry failed jobs
```

---

## Testing Phase 2 Features

### Verify Installation

```bash
# Run all tests (197 tests should pass)
php artisan test

# Phase 2 specific tests
php artisan test --filter=InstitutionTest
php artisan test --filter=QuestionnaireTest
php artisan test --filter=DepartmentControllerTest
php artisan test --filter=QuestionPermissionControllerTest
```

**Expected Results:**
```
Tests:    197 passed (561 assertions)
Duration: ~12 seconds
```

### Manual Testing Checklist

#### 1. Department Management

```bash
# Login as admin
# Navigate to: /departments

✓ Create new department
✓ Edit department
✓ Filter by institution
✓ View users count
✓ Deactivate department
✓ Delete empty department
```

#### 2. User Department Assignment

```bash
# Navigate to: /users/create or /users/{id}/edit

✓ Select institution
✓ Department dropdown populates with institution's departments
✓ Changing institution clears department
✓ Can save user without department (optional)
✓ Can save user with department
```

#### 3. Question Permissions

```bash
# Navigate to: /questionnaires/{id}/permissions

✓ Select institution from dropdown
✓ Permission matrix displays questions × departments
✓ Toggle individual permissions
✓ Toggle entire row (all departments for question)
✓ Toggle entire column (all questions for department)
✓ Save permissions
✓ Reset unsaved changes
```

#### 4. Read-Only Question Enforcement

```bash
# Create user with department assignment
# Set question permissions restricting some questions
# Login as that user
# Navigate to: /submissions/create?questionnaire_id=X

✓ Restricted questions show lock icon (🔒)
✓ Restricted questions are grayed out
✓ Restricted questions are read-only
✓ Tooltip shows "You do not have permission to edit this question"
✓ Unrestricted questions are editable
✓ Can save draft with locked questions empty
```

#### 5. Submission Workflow

```bash
# As enumerator:
✓ Create draft submission
✓ Submit for approval
✓ Verify notification to admin

# As admin:
✓ Receive notification of new submission
✓ View submitted submission
✓ Approve submission → enumerator receives notification
✓ OR Reject with comments → enumerator receives notification

# As enumerator (rejected submission):
✓ View rejection banner with comments
✓ Edit submission
✓ Resubmit
```

#### 6. Notifications

```bash
✓ Bell icon shows unread count
✓ Click bell to open panel
✓ Notifications display correctly (color-coded)
✓ Click notification navigates to submission
✓ Notification marked as read automatically
✓ Unread count updates
✓ "Mark all as read" works
```

#### 7. Hierarchical Access Control

```bash
# Setup:
# - User A at Central institution (admin role)
# - User B at Province institution (admin role with approve permission)
# - User C at District institution (enumerator)

# Test:
# User C creates submission at District
# User C submits

✓ User B (Province) can approve (ancestor institution)
✓ User A (Central) can approve (ancestor institution)

# User B creates submission at Province
# User B submits (self-submission not allowed, but test with another user)

✓ User A (Central) can approve
✓ User at different Province cannot approve (not ancestor)
```

---

## Migration Notes

### Migrating from Phase 1 to Phase 2

If you have an existing Phase 1 installation:

#### 1. Backup Database

```bash
# PostgreSQL
pg_dump qi_survey > backup_before_phase2_$(date +%Y%m%d).sql

# SQLite
cp database/database.sqlite database/database.sqlite.backup
```

#### 2. Pull Latest Code

```bash
git pull origin main
composer install
npm install
npm run build
```

#### 3. Run New Migrations

```bash
php artisan migrate
```

**New migrations:**
- `create_departments_table`
- `add_department_id_to_users_table`
- `create_question_permissions_table`
- `add_notification_preferences_to_users_table`

#### 4. Run Seeders

```bash
# Seed new departments
php artisan db:seed --class=DepartmentSeeder

# Update roles/permissions (safe to run)
php artisan db:seed --class=RoleAndPermissionSeeder
```

#### 5. Clear Caches

```bash
php artisan optimize:clear
php artisan config:cache
php artisan route:cache
```

#### 6. Restart Services

```bash
# Queue workers
sudo supervisorctl restart qi-survey-worker:*

# Web server
sudo systemctl reload nginx  # or apache2
```

#### 7. Verify

```bash
# Run tests
php artisan test

# Check database
php artisan db:table departments
php artisan db:table question_permissions

# Test in browser
# - Login as admin
# - Navigate to /departments
# - Create a department
# - Assign to user
# - Set question permissions
```

### Rollback (if needed)

```bash
# Rollback migrations
php artisan migrate:rollback --step=4

# Restore database
# PostgreSQL
psql qi_survey < backup_before_phase2_YYYYMMDD.sql

# SQLite
cp database/database.sqlite.backup database/database.sqlite
```

---

## API Endpoints

### Department Endpoints

```
GET    /api/departments              List departments (paginated)
POST   /api/departments              Create department
GET    /api/departments/{id}         Get department
PUT    /api/departments/{id}         Update department
DELETE /api/departments/{id}         Delete department
GET    /api/departments/list         Simple list for dropdowns
```

**Query Parameters (List):**
- `page` - Page number
- `per_page` - Items per page (default: 15)
- `institution_id` - Filter by institution
- `is_active` - Filter by status (true/false)

**Example Request:**
```bash
curl -H "Authorization: Bearer {token}" \
     "https://api.example.com/api/departments?institution_id=1&page=1"
```

**Example Response:**
```json
{
  "data": [
    {
      "id": 1,
      "name": "Human Resources",
      "code": "HR",
      "institution_id": 1,
      "institution": {
        "id": 1,
        "name": "Central Office"
      },
      "description": "HR department",
      "is_active": true,
      "users_count": 5
    }
  ],
  "meta": {
    "current_page": 1,
    "per_page": 15,
    "total": 10,
    "last_page": 1
  }
}
```

### Question Permission Endpoints

```
GET  /api/question-permissions                    List permissions
POST /api/question-permissions/bulk               Bulk create/update
GET  /api/question-permissions/by-questionnaire/{id}  Get by questionnaire
```

**Bulk Store Example:**
```bash
curl -X POST -H "Authorization: Bearer {token}" \
     -H "Content-Type: application/json" \
     -d '{
       "permissions": [
         {
           "questionnaire_id": 1,
           "question_name": "patient_age",
           "institution_id": 1,
           "department_id": 2,
           "permission_type": "edit"
         }
       ]
     }' \
     "https://api.example.com/api/question-permissions/bulk"
```

### Notification Endpoints

```
GET   /api/notifications                   List notifications
GET   /api/notifications/unread-count      Get unread count
PATCH /api/notifications/{id}/read         Mark as read
PATCH /api/notifications/mark-all-read     Mark all as read
```

**Example: Get Unread Count**
```bash
curl -H "Authorization: Bearer {token}" \
     "https://api.example.com/api/notifications/unread-count"

# Response:
{"count": 3}
```

### Enhanced Submission Endpoints

```
POST /api/submissions/{id}/submit   Submit draft (fixed authorization)
POST /api/submissions/{id}/approve  Approve submission (hierarchy-aware)
POST /api/submissions/{id}/reject   Reject with comments (hierarchy-aware)
```

**Get Submission with Permissions:**
```bash
curl -H "Authorization: Bearer {token}" \
     "https://api.example.com/api/submissions/1"

# Response includes question_permissions:
{
  "data": {
    "id": 1,
    "questionnaire_id": 1,
    "institution_id": 2,
    "status": "draft",
    "answers_json": {...},
    "question_permissions": {
      "patient_name": true,
      "patient_age": true,
      "diagnosis": false,    // User cannot edit
      "treatment_cost": false // User cannot edit
    }
  }
}
```

---

## Troubleshooting

### Department Issues

**Problem:** Departments not showing in user form

**Solutions:**
```bash
# 1. Verify departments exist for institution
php artisan tinker
>>> \App\Models\Department::where('institution_id', 1)->get();

# 2. Check seeder ran
php artisan db:seed --class=DepartmentSeeder

# 3. Check frontend is fetching correctly
# Open browser console → Network tab → Check API calls
```

---

**Problem:** Cannot create department with duplicate code

**Solutions:**
```bash
# Department codes must be unique within institution
# Check existing codes:
php artisan tinker
>>> \App\Models\Department::where('institution_id', 1)->pluck('code');

# Use different code or update existing department
```

---

### Permission Issues

**Problem:** Permission matrix not loading

**Solutions:**
```bash
# 1. Check questionnaire has questions
php artisan tinker
>>> $q = \App\Models\Questionnaire::find(1);
>>> $q->extractQuestionNames();

# 2. Check departments exist for institution
>>> \App\Models\Department::where('institution_id', 1)->count();

# 3. Check browser console for JavaScript errors
```

---

**Problem:** Permissions not saving

**Solutions:**
```bash
# 1. Check validation
# Look for 422 response in browser network tab

# 2. Check database constraint
php artisan tinker
>>> \App\Models\QuestionPermission::create([
      'questionnaire_id' => 1,
      'question_name' => 'test',
      'institution_id' => 1,
      'department_id' => 1,
      'permission_type' => 'edit'
    ]);

# 3. Check API endpoint
curl -X POST -H "Authorization: Bearer {token}" \
     -H "Content-Type: application/json" \
     -d '{"permissions":[...]}' \
     "https://api.example.com/api/question-permissions/bulk" -v
```

---

### Notification Issues

**Problem:** Notifications not appearing

**Solutions:**
```bash
# 1. Check queue worker is running
php artisan queue:monitor

# 2. Check notifications table
php artisan tinker
>>> \App\Models\User::find(1)->notifications;

# 3. Check event is firing
# Add to SubmissionController:
Log::info('Submission status changed', ['submission' => $submission->id]);

# 4. Process queue manually
php artisan queue:work --once

# 5. Check failed jobs
php artisan queue:failed
php artisan queue:retry all
```

---

**Problem:** Unread count not updating

**Solutions:**
```bash
# 1. Check polling interval (30 seconds)
# Wait and observe

# 2. Check API endpoint
curl -H "Authorization: Bearer {token}" \
     "https://api.example.com/api/notifications/unread-count"

# 3. Check browser console for errors
# Open DevTools → Console

# 4. Manually refresh
# F5 or Ctrl+R
```

---

### Workflow Issues

**Problem:** Cannot approve submission from descendant institution

**Solutions:**
```bash
# 1. Check user's institution
php artisan tinker
>>> $user = \App\Models\User::find(1);
>>> $user->institution_id;

# 2. Check submission's institution
>>> $submission = \App\Models\Submission::find(1);
>>> $submission->institution_id;

# 3. Check hierarchy
>>> $userInst = \App\Models\Institution::find($user->institution_id);
>>> $subInst = \App\Models\Institution::find($submission->institution_id);
>>> $subInst->isDescendantOf($userInst);  // Should be true

# 4. Check permissions
>>> $user->hasPermissionTo('submissions.approve');  // Should be true
```

---

**Problem:** Rejection comments not appearing in submission form

**Solutions:**
```bash
# 1. Check submission status
php artisan tinker
>>> $s = \App\Models\Submission::find(1);
>>> $s->status;  // Should be 'rejected'
>>> $s->rejection_comments;  // Should have text

# 2. Check API response
curl -H "Authorization: Bearer {token}" \
     "https://api.example.com/api/submissions/1"

# 3. Check frontend component
# SubmissionForm.tsx should show rejection banner
# Look for: submission?.status === 'rejected'

# 4. Clear cache and refresh
# Ctrl+Shift+R (hard refresh)
```

---

### Test Failures

**Problem:** Tests failing after Phase 2 upgrade

**Solutions:**
```bash
# 1. Run migrations in test environment
php artisan migrate --env=testing

# 2. Clear test cache
php artisan test --cache-clear

# 3. Run specific failing test
php artisan test --filter=FailingTestName

# 4. Check test database
# Tests should use SQLite :memory:
# Verify in phpunit.xml:
# <env name="DB_CONNECTION" value="sqlite"/>
# <env name="DB_DATABASE" value=":memory:"/>

# 5. Check TestCase.php safety guards
php artisan test --filter=TestEnvironmentSafetyTest
```

---

## Performance Optimization

### Database Indexes

Phase 2 migrations include these indexes:

```sql
-- Already created by migrations
departments_institution_id_foreign
departments_institution_id_code_unique
question_permissions_questionnaire_id_foreign
question_permissions_institution_id_foreign
question_permissions_department_id_foreign
unique_question_permission
```

**Additional recommended indexes for production:**

```sql
-- If you have many notifications
CREATE INDEX idx_notifications_read_at
ON notifications(notifiable_id, notifiable_type, read_at);

-- If department lookups are slow
CREATE INDEX idx_departments_active
ON departments(is_active) WHERE is_active = true;
```

### Query Optimization

```bash
# Enable query logging temporarily
php artisan tinker
>>> DB::enableQueryLog();
>>> // Perform action
>>> DB::getQueryLog();

# Check for N+1 queries
# Install Laravel Debugbar (dev only)
composer require barryvdh/laravel-debugbar --dev
```

### Caching

```bash
# Cache configuration
php artisan config:cache

# Cache routes
php artisan route:cache

# Cache views
php artisan view:cache
```

---

## Security Considerations

### Permission Checks

All Phase 2 endpoints enforce authorization:

```php
// DepartmentController
$this->authorize('viewAny', Department::class);
$this->authorize('create', Department::class);
$this->authorize('update', $department);

// SubmissionController (enhanced)
$this->authorize('submit', $submission);  // Draft check
$this->authorize('approve', $submission); // Hierarchy check
$this->authorize('reject', $submission);  // Hierarchy check
```

### Input Validation

```php
// DepartmentController
$validated = $request->validate([
    'name' => 'required|string|max:255',
    'code' => 'required|string|max:50',
    'institution_id' => 'required|exists:institutions,id',
    'description' => 'nullable|string',
    'is_active' => 'boolean',
]);
```

### XSS Prevention

Frontend uses React auto-escaping:
```typescript
// Automatically escaped
<p>{submission.rejection_comments}</p>

// HTML rendering (use only for trusted content)
<div dangerouslySetInnerHTML={{__html: trustedHTML}} />
```

---

## Additional Resources

**Main Documentation:**
- [Setup Guide](./setup-guide.md) - Main installation guide
- [Admin Guide](../ADMIN-GUIDE.md) - Administrator manual
- [Enumerator Guide](../ENUMERATOR-GUIDE.md) - User manual
- [Phase 2 Implementation Summary](../PHASE-2-IMPLEMENTATION-SUMMARY.md) - Technical details

**Laravel Documentation:**
- [Eloquent Relationships](https://laravel.com/docs/12.x/eloquent-relationships)
- [Queues](https://laravel.com/docs/12.x/queues)
- [Notifications](https://laravel.com/docs/12.x/notifications)
- [Authorization](https://laravel.com/docs/12.x/authorization)

**Testing:**
- [Pest Documentation](https://pestphp.com/docs/)
- [Laravel Testing](https://laravel.com/docs/12.x/testing)

---

**Document Version:** 1.0
**Last Updated:** November 26, 2025
**Applies To:** Phase 2 and later
**Previous Phase:** See main Setup Guide
