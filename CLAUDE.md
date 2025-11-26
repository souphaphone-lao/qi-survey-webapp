# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A multi-institution survey data collection platform built with Laravel 12 and React 18. The application enables organizations to manage questionnaires (using SurveyJS), collect submissions from multiple institutions, and implement an approval workflow for data quality control.

**Tech Stack:**
- Backend: Laravel 12 (PHP 8.2+), PostgreSQL/SQLite, Laravel Sanctum, Spatie Laravel Permission
- Frontend: React 18 with TypeScript, TailwindCSS 4, SurveyJS, TanStack Query
- Testing: Pest (PHP), Jest (JavaScript)

## Essential Commands

### Development
```bash
# Start all development services (server, queue, logs, vite)
composer dev

# Alternative: Start services separately
php artisan serve                  # Backend server
php artisan queue:listen --tries=1 # Queue worker
php artisan pail --timeout=0       # Log viewer
npm run dev                        # Vite dev server
```

### Database
```bash
php artisan migrate                # Run migrations
php artisan db:seed                # Seed database with roles, permissions, and default admin
php artisan db:seed --class=DemoSeeder  # Seed with demo data (can run multiple times)
php artisan migrate:fresh --seed   # Fresh database with seed data
```

### Testing

**⚠️ IMPORTANT: Tests ALWAYS run on SQLite in-memory database, NEVER on production PostgreSQL database.**

```bash
# Backend tests - ALL tests use SQLite :memory: (safe)
php artisan test              # Run all tests
./vendor/bin/pest             # Direct Pest execution
./vendor/bin/pest --filter=<TestName>  # Run specific test

# Verify test database safety
php artisan test --filter=TestEnvironmentSafetyTest  # Verify safety guards are active

# Frontend tests
npm test                      # Run Jest tests
npm run test:watch            # Watch mode
npm run test:coverage         # With coverage report
npm run typecheck             # TypeScript checking
```

**How it works:**

- Tests detect and block production database usage automatically
- If tests try to use non-testing environment, they will FAIL with `RuntimeException`
- See "Testing Safety" section below for technical details

### Code Quality
```bash
./vendor/bin/pint             # Format PHP code
./vendor/bin/pint --test      # Check without fixing
```

### Routes and Models
```bash
php artisan route:list        # List all routes
php artisan tinker            # Interactive REPL for testing models/code
```

## Testing Safety

### CRITICAL: Tests are isolated from production data

**Your production database (`pgsql://qi_survey`) is COMPLETELY PROTECTED from test execution.**

The testing environment includes multiple safety layers to prevent accidental production database usage:

#### 1. Automatic Environment Enforcement

[TestCase.php](tests/TestCase.php) forces test environment variables BEFORE Laravel boots:

```php
// In createApplication() - runs before EVERY test
$_ENV['APP_ENV'] = 'testing';
$_ENV['DB_CONNECTION'] = 'sqlite';
$_ENV['DB_DATABASE'] = ':memory:';
```

This ensures that even if `.env` has production settings, tests will ALWAYS use in-memory SQLite.

#### 2. Runtime Safety Guards

[TestCase.php](tests/TestCase.php) validates on EVERY test execution in `setUp()`:

- ✅ `APP_ENV` must be `testing` - throws `RuntimeException` if not
- ✅ Database must be SQLite `:memory:` - throws `RuntimeException` if PostgreSQL or file-based
- ✅ Tests will FAIL FAST if production database is detected

#### 3. Multi-Layer Configuration

- **[phpunit.xml:26-27](phpunit.xml#L26-L27)**: PHPUnit environment variables
- **[.env.testing](.env.testing)**: Explicit test environment configuration
- **[tests/Pest.php:15-16](tests/Pest.php#L15-L16)**: RefreshDatabase trait for all tests

#### 4. Database Isolation

- **In-memory database**: Created fresh for each test run, destroyed after completion
- **No persistence**: Zero risk of data leakage between test runs
- **Production untouched**: PostgreSQL database is never accessed during testing
- **External services mocked**: Mail, queues, cache use array drivers (no real I/O)

### Verification Commands

```bash
# Verify all safety guards are active
php artisan test --filter=TestEnvironmentSafetyTest

# Check what database tests would use
php -r "
    \$_ENV['APP_ENV'] = 'testing';
    require 'vendor/autoload.php';
    \$app = require 'bootstrap/app.php';
    echo 'DB Connection: ' . config('database.default') . PHP_EOL;
    echo 'DB Database: ' . config('database.connections.sqlite.database') . PHP_EOL;
"
```

### What Happens If Safety Guards Fail

If someone tries to run tests against production database, they will see:

```
RuntimeException: Tests can only run in testing environment. Current environment: local
```

OR

```
RuntimeException: Tests must use SQLite in-memory database. Current: pgsql (qi_survey)
```

**Tests will NEVER execute against production database.** This is by design.

### Writing New Tests

All new tests automatically inherit these protections:

```php
// tests/Feature/MyNewTest.php
use App\Models\User;

test('my feature works', function () {
    // This test is AUTOMATICALLY:
    // ✅ Using SQLite :memory:
    // ✅ Using fresh database (RefreshDatabase)
    // ✅ Protected from production database

    $user = User::factory()->create();
    expect($user)->toBeInstanceOf(User::class);
});
```

No additional configuration needed - safety is automatic.

## Core Architecture

### Authentication & Authorization

**Authentication:** Token-based API using Laravel Sanctum. Login returns a bearer token that must be included in all subsequent requests.

**Authorization:** Three roles with granular permissions via Spatie Laravel Permission:
- **admin**: Full system access (manage users, institutions, questionnaires, approve submissions)
- **enumerator**: Create/edit own submissions, view questionnaires
- **viewer**: Read-only access

Permissions follow pattern: `{resource}.{action}` (e.g., `submissions.approve`, `users.create`)

**Security features:**
- Account lockout after 5 failed login attempts (15-minute lockout)
- Default admin: `admin@example.com` / `password` (change in production!)

### Database Models & Relationships

**Core Models:** User, Institution, Questionnaire, Submission

**Key Relationships:**
```
User (has role/permissions)
  → created many Submissions (via created_by)
  → updated many Submissions (via updated_by)
  → approved many Submissions (via approved_by)
  → rejected many Submissions (via rejected_by)

Institution (3-level hierarchy: central → province → district)
  ← belongs to parent Institution
  → has many child Institutions
  → has many Users
  → has many Submissions

Questionnaire
  → has many Submissions
  - stores SurveyJS JSON schema
  - has version control
  - can be active/inactive

Submission
  → belongs to Questionnaire
  → belongs to Institution
  → created by User
  - stores answers as JSON
  - tracks workflow state
```

**Audit Trail Pattern:** All models use soft deletes and track `created_by`, `updated_by`, `deleted_by` for audit purposes.

### Submission Workflow

Submissions follow a state machine with four states:

1. **draft**: Work in progress, can be edited/deleted by creator
2. **submitted**: Under review, locked from editing
3. **approved**: Accepted by admin, immutable
4. **rejected**: Returned to creator with comments, can be edited and resubmitted

**State Transitions:**
- draft → submitted (via `submit()` method)
- submitted → approved (admin only via `approve()`)
- submitted → rejected (admin only via `reject()` with comments)
- rejected → submitted (edit and resubmit)

**Model Methods:**
- `canBeEdited()`: Returns true if draft or rejected
- `isDraft()`, `isSubmitted()`, `isApproved()`, `isRejected()`: Status checks
- Query scopes: `draft()`, `submitted()`, `approved()`, `rejected()`

### API Structure

**Base URL:** `/api`

**Authentication:** All routes except `/api/login` require `auth:sanctum` middleware.

**Resource Controllers:** Follow Laravel resource conventions (index, store, show, update, destroy).

**Controllers:**
- `AuthController`: Login, logout, get authenticated user
- `DashboardController`: Statistics for dashboard
- `UserController`: User CRUD (admin only)
- `InstitutionController`: Institution management (admin only), includes `/list` endpoint for dropdowns
- `QuestionnaireController`: Questionnaire CRUD, duplicate, activate/deactivate (admin only)
- `SubmissionController`: Submission CRUD + workflow actions (submit, approve, reject)

**Authorization:** Handled via Laravel Policies in `app/Policies/`. All controller methods use policy authorization.

### Frontend Architecture

**Organization:** Feature-based structure in `resources/js/`

```
resources/js/
├── app.tsx                    # Main app component with routing
├── components/
│   ├── common/                # Reusable UI components
│   └── layout/                # Layout components (header, nav, etc.)
├── contexts/
│   └── AuthContext.tsx        # Global auth state
├── hooks/                     # Custom React hooks
├── pages/                     # Feature-based pages
│   ├── auth/                  # Login, etc.
│   ├── dashboard/
│   ├── institutions/
│   ├── questionnaires/
│   ├── submissions/
│   └── users/
├── services/
│   └── api.ts                 # Axios instance and API client
└── types/                     # TypeScript type definitions
```

**Data Fetching:** TanStack Query (React Query) for server state management. API calls centralized in `services/api.ts`.

**Routing:** React Router with protected routes requiring authentication.

**Forms:** SurveyJS for dynamic questionnaire rendering based on JSON schema.

**Styling:** TailwindCSS 4 utility classes.

## Development Patterns

### Adding New Features

**Backend (Laravel):**
1. Create migration: `php artisan make:migration create_xyz_table`
2. Create model: `php artisan make:model XYZ`
3. Add relationships in model
4. Create policy: `php artisan make:policy XYZPolicy --model=XYZ`
5. Add permissions to `RoleAndPermissionSeeder`
6. Create controller: `php artisan make:controller Api/XYZController --api`
7. Add routes in `routes/api.php`
8. Create form request validation: `php artisan make:request StoreXYZRequest`
9. Create API resource: `php artisan make:resource XYZResource`
10. Write tests: `php artisan make:test XYZTest`

**Frontend (React):**
1. Add TypeScript types in `resources/js/types/`
2. Add API methods to `services/api.ts`
3. Create page components in `resources/js/pages/{feature}/`
4. **Add routes to `app.tsx`** (see Frontend Integration Checklist below)
5. Create reusable components in `components/common/` if needed
6. Write tests in `resources/js/__tests__/`

### Frontend Integration Checklist (CRITICAL)

**⚠️ CRITICAL: A feature is NOT complete until it's accessible via the UI.**

After implementing ANY frontend component, you MUST verify it's accessible by following this checklist:

#### 1. Routes Added to `app.tsx`

- [ ] Import component with lazy loading: `const XYZ = React.lazy(() => import('@/pages/.../XYZ'))`
- [ ] Add route(s) in `<Routes>`: list, create, edit, view (as needed)
- [ ] Wrap with `<ProtectedRoute>` and `<React.Suspense fallback={<LoadingFallback />}>`
- [ ] If component needs URL params, create wrapper function using `useParams()`

#### 2. Navigation Links Added (for main features)

- [ ] Add to `AppLayout.tsx` navigation array with permission check
- [ ] Format: `{ name: 'Feature', href: '/feature', permission: 'feature.view' }`

#### 3. Action Links Added (for related features)

- [ ] Add action links in list pages (e.g., "Permissions" link in QuestionnaireList)
- [ ] Check permissions before showing link
- [ ] Use appropriate colors (indigo=primary, green=create, purple=permissions, red=delete)

#### 4. Build and Verify

- [ ] Run `npm run build` - must complete without errors
- [ ] Test manually OR use Playwright to verify all routes work
- [ ] Confirm feature is accessible through navigation/links

#### Examples of What Goes Wrong Without This

- ✗ Departments feature implemented but no menu link → users can't access it
- ✗ PermissionMatrix component exists but no route → 404 error
- ✗ SubmissionActions component exists but not imported → duplicate code in other files

#### Quick Verification Commands

```bash
# Build frontend
npm run build

# Verify routes exist (search app.tsx)
grep -n "path=\"/feature\"" resources/js/app.tsx

# Verify navigation (search AppLayout.tsx)
grep -n "Feature" resources/js/components/layout/AppLayout.tsx
```

### Feature Completion Checklist (CRITICAL)

**⚠️ CRITICAL: Features are NOT complete until tested, documented, and verified.**

Before moving to the next feature, you MUST complete these steps:

#### 1. Run All Tests

```bash
# Backend tests (ALWAYS safe - uses SQLite :memory:)
php artisan test

# Frontend tests
npm test

# TypeScript checking
npm run typecheck
```

- [ ] All backend tests pass (197+ tests)
- [ ] All frontend tests pass
- [ ] No TypeScript errors
- [ ] **DO NOT proceed to next feature if tests fail** - fix them first

#### 2. Export Implementation Summary

After completing a significant feature or phase, export a comprehensive summary:

- [ ] Create markdown file in `doc/` or `doc/plan/` directory
- [ ] Include: features implemented, files modified, API endpoints added, database changes
- [ ] Include: testing results (number of tests, all passing)
- [ ] Include: any breaking changes or migration notes
- [ ] Format: `YYYY-MM-DD-feature-name-implementation-summary.md`

**Example structure:**
```markdown
# Feature Name Implementation Summary

## Date: YYYY-MM-DD

## Features Implemented
- Feature 1 with details
- Feature 2 with details

## Backend Changes
- Models modified: X, Y, Z
- Controllers added: ABC
- Migrations: describe schema changes
- Policies: authorization rules

## Frontend Changes
- Components: list of new/modified components
- Routes: new routes added
- API integrations: endpoints used

## Testing Results
- Backend: X tests passing
- Frontend: Y tests passing
- All tests ✓

## Files Modified
[List of key files with line references]
```

#### 3. Update Documentation

After major features, update user-facing and technical documentation:

- [ ] **Admin Guide** (`doc/guides/ADMIN-GUIDE.md`): For administrators managing the system
- [ ] **Enumerator Guide** (`doc/guides/ENUMERATOR-GUIDE.md`): For end-users entering data
- [ ] **Setup Guide** (`doc/guides/setup-guide.md`): For developers/deploying the application
- [ ] **Phase Setup Addendum** (`doc/guides/PHASE-X-SETUP-ADDENDUM.md`): For phase-specific setup notes

**When to update:**

- Admin Guide: When adding features that admins use (user management, questionnaires, permissions, approvals)
- Enumerator Guide: When changing submission workflow, form behavior, or user-facing features
- Setup Guide: When adding new dependencies, environment variables, or deployment steps
- Phase Addendum: When completing a development phase with new database tables, seeders, or configurations

**Update checklist:**

- [ ] Screenshots updated (if UI changed)
- [ ] New sections added for new features
- [ ] Troubleshooting section updated with common issues
- [ ] Examples and use cases included
- [ ] Version/date updated in document

### Testing Patterns

**⚠️ All tests automatically use SQLite in-memory database - production database is never touched.**

**Backend (Pest):**

- **Database Safety**: ALL tests inherit automatic protection from [TestCase.php](tests/TestCase.php)
  - Tests ALWAYS use SQLite `:memory:` (never PostgreSQL production database)
  - Database reset between tests via `RefreshDatabase` trait
  - No configuration needed - protection is automatic

- **Test Organization**:
  - Feature tests in `tests/Feature/` test full HTTP request/response cycles
  - Unit tests in `tests/Unit/` test individual classes/methods
  - All tests extend `Tests\TestCase` (which enforces database safety)

- **Common Patterns**:
  - Use `actingAs($user)` for authenticated requests
  - Test authorization with different roles
  - Use factories for test data creation
  - Seed roles/permissions in `beforeEach()` if needed

- **Example pattern**:
  ```php
  use App\Models\User;
  use Database\Seeders\RoleAndPermissionSeeder;

  beforeEach(function () {
      // Seed roles and permissions for this test
      $this->seed(RoleAndPermissionSeeder::class);
  });

  it('allows admin to create user', function () {
      // All data created here is in SQLite :memory:
      // Production PostgreSQL database is NEVER accessed
      $admin = User::factory()->create();
      $admin->assignRole('admin');

      $response = $this->actingAs($admin)->postJson('/api/users', [
          'name' => 'Test User',
          'email' => 'test@example.com',
          'password' => 'password',
      ]);

      $response->assertStatus(201);
      // Data exists only in :memory: and is destroyed after test
  });
  ```

**Frontend (Jest):**

- Test components in isolation
- Mock API calls using axios-mock-adapter
- Test user interactions and state changes
- Located in `resources/js/__tests__/`

### Permission Checking

**Backend:** Use Laravel's authorization system:
```php
// In controller
$this->authorize('update', $submission);

// In policy
public function update(User $user, Submission $submission): bool
{
    return $user->hasPermissionTo('submissions.update')
        && $submission->canBeEdited()
        && $submission->created_by === $user->id;
}
```

**Frontend:** Check permissions from AuthContext:
```typescript
const { user } = useAuth();
const canApprove = user?.permissions?.includes('submissions.approve');
```

## Important Notes

- **Questionnaire Schema:** Uses SurveyJS JSON format. Create questionnaires at [surveyjs.io/create-free-survey](https://surveyjs.io/create-free-survey)
- **Institution Hierarchy:** Three levels (central → province → district). Central is root level.
- **Submission Answers:** Stored as JSON in `answers_json` column. Cast to array in model.
- **Soft Deletes:** Never hard delete. Use soft deletes for audit trail.
- **User Tracking:** Always set `created_by`/`updated_by` when creating/modifying records.
- **Database:** PostgreSQL recommended for production, SQLite supported for development.
- **Environment:** Uses Laravel Herd for local development (accessible at `http://qi-survey-webapp.test`).

## Seeder Pattern (CRITICAL)

**ALL seeders MUST use upsert logic to prevent data loss:**

```php
// ✅ CORRECT: Update if exists, insert if new
Institution::updateOrCreate(
    ['code' => 'CENTRAL'],           // Match on unique key
    ['name' => 'Central Office', ...] // Fields to update/insert
);

User::updateOrCreate(
    ['email' => 'admin@example.com'],
    ['name' => 'Admin', 'password' => Hash::make('password'), ...]
);

Questionnaire::updateOrCreate(
    ['code' => 'SURVEY-1', 'version' => 1],  // Composite unique key
    ['title' => 'Survey Title', ...]
);

// For roles and permissions (Spatie)
Role::firstOrCreate(['name' => 'admin']);
Permission::firstOrCreate(['name' => 'users.view']);
$role->syncPermissions([...]); // Sync, don't add
$user->syncRoles([...]);       // Sync, don't assign

// ❌ WRONG: Will fail if record exists
Institution::create(['code' => 'CENTRAL', ...]);
```

**Unique Keys by Model:**
- **Users:** `email`
- **Institutions:** `code`
- **Questionnaires:** `code` + `version` (composite)
- **Roles:** `name`
- **Permissions:** `name`

**Why This Matters:**
- Seeders can be run multiple times without errors
- Production data is preserved when running `db:seed`
- Allows updating configuration without data loss
- Safe to run seeders in CI/CD pipelines

**Note on Submissions:** Submissions are transactional data without unique business keys. Demo submissions can use `create()` as they're meant to generate sample data, not reference data.
