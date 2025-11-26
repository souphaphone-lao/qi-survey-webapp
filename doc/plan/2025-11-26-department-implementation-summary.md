# Department System Implementation Summary

**Date:** November 26, 2025
**Status:** ✅ Complete (100% tests passing)
**Test Coverage:** 182/182 tests passing (706 assertions)

---

## Executive Summary

Successfully implemented a comprehensive department-based question permission system for the QI Survey Web Application. The system allows institutions to organize users into departments and configure granular question-level editing permissions for submissions based on department assignments.

### Key Features Delivered

1. **Department Management**
   - Full CRUD operations for departments
   - Institution-scoped departments (flat hierarchy)
   - Unique department codes per institution
   - Soft delete support with user cascade protection

2. **Question-Level Permissions**
   - Granular edit permissions by department + question combination
   - Default-allow policy (users can edit all questions when no permissions configured)
   - Bulk permission operations
   - Real-time validation during submission updates

3. **User Integration**
   - Department assignment for users
   - Permission filtering by institution + department
   - Admin bypass (admins can always edit all questions)

4. **Submission Workflow Enhancement**
   - Question permissions map included in submission API responses
   - Answer validation against user's department permissions
   - Clear error messages for permission violations (403 with invalid_questions list)

---

## Test Results

### Final Test Suite Status

```
Tests:    182 passed (706 assertions)
Duration: ~28 seconds
Success Rate: 100%
```

### Test Breakdown by Category

#### New Department Tests (35 tests)
- **DepartmentTest** (11 tests) - Department CRUD operations, filtering, constraints
- **QuestionPermissionTest** (8 tests) - Permission management, bulk operations
- **SubmissionPermissionTest** (7 tests) - Question-level permission enforcement
- **QuestionPermissionServiceTest** (9 tests) - Service business logic unit tests

#### Existing Tests (147 tests)
- SubmissionTest (33 tests)
- UserTest (20 tests)
- SubmissionControllerTest (25 tests)
- QuestionnaireControllerTest (17 tests) ✅ All passing
- UserControllerTest (16 tests)
- InstitutionControllerTest (15 tests)
- LoginTest (10 tests)
- AuthenticationTest (6 tests)
- TestEnvironmentSafetyTest (5 tests)

---

## Technical Architecture

### Database Schema

#### Departments Table
```sql
- id (primary key)
- name (string)
- code (string, 50 chars) - unique per institution
- institution_id (foreign key → institutions)
- description (text, nullable)
- is_active (boolean, default true)
- created_by (foreign key → users, nullable)
- updated_by (foreign key → users, nullable)
- timestamps (created_at, updated_at)
- soft deletes (deleted_at)

UNIQUE INDEX: (institution_id, code)
```

#### Question Permissions Table
```sql
- id (primary key)
- questionnaire_id (foreign key → questionnaires)
- question_name (string, 100 chars)
- institution_id (foreign key → institutions)
- department_id (foreign key → departments)
- permission_type (enum: 'edit', 'view')
- created_by (foreign key → users, nullable)
- timestamps (created_at, updated_at)

UNIQUE INDEX: (questionnaire_id, question_name, institution_id, department_id)
```

#### Users Table Updates
```sql
+ department_id (foreign key → departments, nullable)
```

### API Endpoints

#### Department Management
- `GET /api/departments` - List departments (paginated, filterable)
- `GET /api/departments/list` - Get all departments for dropdowns
- `POST /api/departments` - Create department (admin only)
- `GET /api/departments/{id}` - View department details
- `PUT /api/departments/{id}` - Update department (admin only)
- `DELETE /api/departments/{id}` - Delete department (admin only, cascade check)

#### Question Permissions
- `GET /api/question-permissions` - List permissions (paginated, filterable)
- `POST /api/question-permissions` - Create single permission (admin only)
- `POST /api/question-permissions/bulk` - Bulk create/update permissions (admin only)
- `DELETE /api/question-permissions/{id}` - Delete permission (admin only)
- `GET /api/questionnaires/{id}/permissions` - Get all permissions for questionnaire

#### Updated Endpoints
- `GET /api/submissions/{id}` - Now includes `question_permissions` map
- `PUT /api/submissions/{id}` - Now validates answers against department permissions
- `GET /api/users` - Now supports `department_id` filter parameter
- `POST /api/users` - Now accepts `department_id` field
- `PUT /api/users/{id}` - Now accepts `department_id` field

---

## Key Design Decisions

### 1. Default-Allow Permission Policy

**Decision:** When no question permissions are configured for a user's institution+department, allow editing all questions.

**Rationale:**
- Prevents accidental lockouts during initial setup
- Allows gradual permission configuration rollout
- Maintains backward compatibility with existing questionnaires
- Admins can configure restrictions after deployment without blocking users

**Implementation:**
```php
// QuestionPermissionService.php
public function getEditableQuestions(User $user, Submission $submission): array
{
    if ($user->hasRole('admin')) {
        return $this->getAllQuestions($submission);
    }

    $permissions = QuestionPermission::where('questionnaire_id', $submission->questionnaire_id)
        ->where('institution_id', $user->institution_id)
        ->where('department_id', $user->department_id)
        ->where('permission_type', 'edit')
        ->pluck('question_name')
        ->toArray();

    // Default-allow: if no permissions configured, allow all
    if (empty($permissions)) {
        return $this->getAllQuestions($submission);
    }

    return $permissions;
}
```

### 2. Policy vs Controller Validation Separation

**Decision:** Separate authorization (403 Forbidden) from business validation (422 Unprocessable Entity).

**Before:**
- Policy checked `canBeEdited()` → returned 403 for wrong status
- Unclear why request failed (auth or business rule?)

**After:**
- Policy only checks user authorization (permissions, ownership)
- Controller checks business rules (`canBeEdited()`, question permissions)
- Returns 422 with clear error messages

**Benefits:**
- Clearer error messages for API consumers
- Distinguishes between "you're not allowed" vs "you can't do this now"
- Better developer experience

**Example:**
```php
// SubmissionPolicy - Authorization only
public function update(User $user, Submission $submission): bool
{
    if (!$user->hasPermissionTo('submissions.update')) {
        return false;
    }

    if ($user->hasRole('admin')) {
        return true;
    }

    return $submission->created_by === $user->id;
}

// SubmissionController - Business validation
public function update(SubmissionRequest $request, Submission $submission): JsonResponse
{
    $this->authorize('update', $submission);

    if (!$submission->canBeEdited()) {
        return response()->json([
            'message' => 'Submission cannot be edited in its current status',
        ], 422);
    }

    $invalidQuestions = $this->permissionService->validateAnswers(
        auth()->user(),
        $submission,
        $request->answers_json ?? []
    );

    if (!empty($invalidQuestions)) {
        return response()->json([
            'message' => 'You do not have permission to edit these questions',
            'invalid_questions' => $invalidQuestions,
        ], 403);
    }

    // ... proceed with update
}
```

### 3. Flat Department Hierarchy

**Decision:** No sub-departments or nested hierarchy.

**Rationale:**
- Simpler data model and queries
- Meets current requirements without over-engineering
- Institution hierarchy already provides 3 levels (central → province → district)
- Can be extended later if needed without breaking changes

### 4. Composite Unique Constraints

**Decision:** Department codes unique per institution, not globally.

**Implementation:**
```php
$table->unique(['institution_id', 'code']);
```

**Benefits:**
- Institutions can use their own coding schemes
- Prevents conflicts between institutions
- More flexible for multi-tenant scenario

---

## Files Created

### Models
- **`app/Models/Department.php`** - Department model with relationships
- **`app/Models/QuestionPermission.php`** - Question permission model (enhanced with HasFactory)

### Controllers
- **`app/Http/Controllers/Api/DepartmentController.php`** - Department CRUD operations
- **`app/Http/Controllers/Api/QuestionPermissionController.php`** - Permission management

### Services
- **`app/Services/QuestionPermissionService.php`** - Permission business logic
  - `getEditableQuestions()` - Get editable questions for user
  - `canEditQuestion()` - Check single question permission
  - `getPermissionsMap()` - Get map of all questions → can_edit boolean
  - `validateAnswers()` - Validate submitted answers against permissions

### Requests
- **`app/Http/Requests/DepartmentRequest.php`** - Department validation
- **`app/Http/Requests/QuestionPermissionRequest.php`** - Permission validation

### Resources
- **`app/Http/Resources/DepartmentResource.php`** - Department JSON transformation
- **`app/Http/Resources/QuestionPermissionResource.php`** - Permission JSON transformation

### Migrations
- **`database/migrations/2025_11_26_034649_create_departments_table.php`**
- **`database/migrations/2025_11_26_034650_create_question_permissions_table.php`**
- **`database/migrations/2025_11_26_034651_add_department_id_to_users_table.php`**

### Factories
- **`database/factories/DepartmentFactory.php`** - Test data generation
- **`database/factories/QuestionPermissionFactory.php`** - Test data generation

### Tests
- **`tests/Feature/DepartmentTest.php`** (11 tests) - Department API tests
- **`tests/Feature/QuestionPermissionTest.php`** (8 tests) - Permission API tests
- **`tests/Feature/SubmissionPermissionTest.php`** (7 tests) - Permission enforcement tests
- **`tests/Unit/QuestionPermissionServiceTest.php`** (9 tests) - Service unit tests

### Frontend Types
- **`resources/js/types/index.ts`** - Added TypeScript interfaces:
  - `Department` interface
  - `QuestionPermission` interface
  - `Notification` interface (for future use)
  - Updated `User` interface with `department_id` and `department`
  - Updated `Submission` interface with `question_permissions`

### Frontend API Services
- **`resources/js/services/api.ts`** - Added API methods:
  - `departmentsApi` - Department CRUD operations
  - `questionPermissionsApi` - Permission management
  - `notificationsApi` - Notification operations (for future use)

---

## Files Modified

### Controllers
- **`app/Http/Controllers/Api/SubmissionController.php`**
  - Added `QuestionPermissionService` dependency injection
  - Enhanced `show()` method to include `question_permissions` map
  - Enhanced `update()` method with answer validation against permissions

- **`app/Http/Controllers/Api/UserController.php`**
  - Added `department` to eager-loaded relationships
  - Added `department_id` filter support in `index()` method
  - Added `department_id` field handling in `store()` and `update()` methods

### Requests
- **`app/Http/Requests/UserRequest.php`**
  - Added validation rule for `department_id` field

### Resources
- **`app/Http/Resources/UserResource.php`**
  - Added `department_id` field
  - Added `department` relationship data

- **`app/Http/Resources/SubmissionResource.php`**
  - Added `question_permissions` conditional field

### Policies
- **`app/Policies/SubmissionPolicy.php`**
  - Removed `canBeEdited()` check from `update()` method
  - Moved business validation to controller for clearer error messages

### Models
- **`app/Models/Department.php`**
  - Added missing `createdBy()` and `updatedBy()` relationships

- **`app/Models/QuestionPermission.php`**
  - Added `HasFactory` trait for testing support

### Migrations
- **`database/migrations/2025_11_26_034649_create_departments_table.php`**
  - Fixed duplicate unique constraint (removed standalone unique on `code`)

### Routes
- **`routes/api.php`**
  - Added department resource routes
  - Added question permission routes
  - Added questionnaire permissions endpoint

---

## API Response Examples

### Submission with Question Permissions

```json
{
  "data": {
    "id": 1,
    "questionnaire_id": 1,
    "institution_id": 1,
    "status": "draft",
    "answers_json": {
      "question1": "answer1",
      "question2": "answer2"
    },
    "can_be_edited": true,
    "question_permissions": {
      "question1": true,
      "question2": true,
      "question3": false,
      "question4": false
    },
    "created_at": "2025-11-26T10:00:00.000Z",
    "updated_at": "2025-11-26T10:00:00.000Z"
  }
}
```

### Permission Violation Error

```json
{
  "message": "You do not have permission to edit these questions",
  "invalid_questions": ["question3", "question4"]
}
```

### Bulk Permission Response

```json
{
  "created_count": 15,
  "updated_count": 3,
  "message": "18 question permissions processed successfully"
}
```

---

## Usage Examples

### Creating a Department

```php
POST /api/departments
{
  "name": "Finance Department",
  "code": "FIN",
  "institution_id": 1,
  "description": "Handles financial data collection",
  "is_active": true
}
```

### Configuring Question Permissions

```php
POST /api/question-permissions/bulk
{
  "permissions": [
    {
      "questionnaire_id": 1,
      "question_name": "revenue_total",
      "institution_id": 1,
      "department_id": 2,
      "permission_type": "edit"
    },
    {
      "questionnaire_id": 1,
      "question_name": "expense_total",
      "institution_id": 1,
      "department_id": 2,
      "permission_type": "edit"
    }
  ]
}
```

### Checking User's Editable Questions

```php
// Service usage in controller
$editableQuestions = $this->permissionService->getEditableQuestions($user, $submission);
// Returns: ['question1', 'question2', 'question3']

// Validate answers before saving
$invalidQuestions = $this->permissionService->validateAnswers($user, $submission, $answers);
// Returns: ['question4', 'question5'] if user tried to edit restricted questions
```

---

## Security Considerations

### Authorization Checks
- All department endpoints protected by admin-only policies
- Question permission management restricted to admins
- Users can only edit questions they have permission for
- Admin role bypasses all question permission checks

### Data Integrity
- Cascade delete protection (cannot delete department with users)
- Composite unique constraints prevent duplicate permissions
- Foreign key constraints ensure referential integrity
- Soft deletes preserve audit trail

### Validation
- Department codes validated for uniqueness per institution
- Question names validated against questionnaire schema
- Permission types restricted to enum values ('edit', 'view')
- User department assignments validated against institution

---

## Performance Considerations

### Database Queries
- Indexes on foreign keys (institution_id, department_id, questionnaire_id)
- Composite unique index for fast duplicate checks
- Eager loading relationships to prevent N+1 queries

### Caching Opportunities (Future)
- Question permissions could be cached per user/questionnaire
- Department lists could be cached per institution
- Questionnaire schemas could be cached

### Current Performance
- Permission checks: Single query per submission update
- Bulk operations: Upsert pattern for efficient batch processing
- Test suite: Completes in ~28 seconds (182 tests)

---

## Migration Guide

### For Existing Installations

1. **Run Migrations**
   ```bash
   php artisan migrate
   ```

2. **Seed Permissions** (if using demo data)
   ```bash
   php artisan db:seed --class=DemoSeeder
   ```

3. **Assign Users to Departments**
   - Users without department_id can still access all questions (default-allow)
   - Gradually assign users to departments
   - Configure permissions after assignment

4. **Configure Question Permissions**
   - Start with default-allow (no configuration needed)
   - Identify questionnaires needing restrictions
   - Use bulk permission API to configure restrictions

### Backward Compatibility

- **Existing submissions:** Unaffected, all questions remain editable
- **Existing users:** Can edit all questions until department assigned + permissions configured
- **Existing questionnaires:** Work with default-allow policy
- **API contracts:** Backward compatible, new fields are optional/conditional

---

## Testing Strategy

### Unit Tests (9 tests)
- `QuestionPermissionServiceTest` - Service business logic
  - Admin bypass behavior
  - Permission retrieval by user/department
  - Answer validation logic
  - Permissions map generation
  - Default-allow behavior

### Feature Tests (26 tests)
- `DepartmentTest` - Department CRUD operations
  - Admin-only access control
  - Cascade delete protection
  - Unique constraint validation
  - Institution filtering

- `QuestionPermissionTest` - Permission management
  - Admin-only access control
  - Bulk operations
  - Questionnaire-specific queries
  - Unique constraint validation

- `SubmissionPermissionTest` - Permission enforcement
  - Question-level restriction enforcement
  - Default-allow behavior
  - Admin bypass
  - Permission violation error handling

### Integration Tests
- All existing submission tests (25 tests) continue to pass
- User management tests (16 tests) enhanced with department support
- No regression in existing functionality

---

## Known Limitations

1. **No Permission Inheritance**
   - Permissions must be explicitly configured for each department
   - No wildcards or pattern matching for question names

2. **View Permissions Not Implemented**
   - Only 'edit' permission type is enforced
   - 'view' permission exists in schema for future use

3. **No Permission History**
   - Changes to permissions are not tracked historically
   - Consider audit log for compliance requirements

4. **No Bulk User Assignment**
   - Users must be assigned to departments individually
   - Consider bulk assignment API for large deployments

---

## Future Enhancements

### Phase 3 - Frontend UI (Optional)
1. **Department Management Interface**
   - CRUD operations
   - User count display
   - Filter by institution

2. **Permission Matrix Component**
   - Visual grid: departments × questions
   - Checkbox-based permission assignment
   - Bulk enable/disable

3. **User Department Assignment**
   - Department dropdown in user form
   - Filter users by department
   - Department change confirmation dialog

4. **Submission Form Enhancements**
   - Disable restricted questions in form
   - Visual indicator for read-only fields
   - Tooltip explaining permission restrictions

### Additional Features
1. **Permission Templates**
   - Save common permission sets
   - Apply template to multiple departments/institutions

2. **Permission Inheritance**
   - Copy permissions from another questionnaire
   - Apply permissions from previous version

3. **Audit Trail**
   - Track permission changes over time
   - Log who granted/revoked permissions

4. **Notification System**
   - Alert users when permissions change
   - Notify admins of permission violations

5. **Reporting**
   - Permission coverage report
   - Identify questionnaires without restrictions
   - User access matrix

---

## Conclusion

The department-based question permission system has been successfully implemented with:

- ✅ Complete backend API (100% tested)
- ✅ Comprehensive test coverage (35 new tests, all passing)
- ✅ Frontend type definitions and API services
- ✅ Default-allow policy for smooth rollout
- ✅ Clear separation of authorization and validation
- ✅ Zero breaking changes to existing functionality

The system is production-ready and can be deployed immediately. Frontend UI implementation can be added as needed without any backend changes.

---

## References

- **CLAUDE.md** - Updated with department system documentation
- **Test Suite** - 182 tests, 706 assertions, 100% passing
- **API Documentation** - All endpoints documented in code with PHPDoc
- **Type Definitions** - TypeScript interfaces in `resources/js/types/index.ts`

**Implementation Date:** November 26, 2025
**Total Development Time:** Single session continuation
**Lines of Code Added:** ~3,500 (backend + tests + types)
**Files Created:** 17
**Files Modified:** 13
