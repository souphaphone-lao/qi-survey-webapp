# Phase 5 Implementation Plan: Form Versioning, Localization & Department UI

**Version:** 1.0
**Date:** November 27, 2025
**Status:** Planning
**Estimated Duration:** 4-5 weeks
**Dependencies:** Phase 1-4 complete, Department backend system implemented

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Phase 5 Objectives](#phase-5-objectives)
3. [Feature Breakdown](#feature-breakdown)
4. [Implementation Tasks](#implementation-tasks)
5. [Database Schema Changes](#database-schema-changes)
6. [API Endpoints](#api-endpoints)
7. [Frontend Components](#frontend-components)
8. [Testing Strategy](#testing-strategy)
9. [Deployment Plan](#deployment-plan)
10. [Success Criteria](#success-criteria)
11. [Timeline & Milestones](#timeline--milestones)
12. [Risk Assessment](#risk-assessment)

---

## Executive Summary

Phase 5 completes the Survey Webapp with three major feature groups:

1. **Form Versioning System** - Enables questionnaire evolution without breaking existing submissions
2. **Localization & Internationalization** - Lao and English language support throughout the application
3. **Department Management UI** - Frontend interface for the department-based permission system (backend already implemented)

These features transform the application into a production-ready, multilingual, and flexible survey platform suitable for long-term use across multiple organizations in Lao PDR.

---

## Phase 5 Objectives

### Primary Goals

1. **Enable Questionnaire Evolution**
   - Support multiple versions of same questionnaire code
   - Maintain data integrity across versions
   - Allow analysis across different form versions

2. **Support Multilingual Operations**
   - Full Lao language support in UI
   - Bilingual questionnaire content (Lao/English)
   - Language-aware date/number formatting

3. **Complete Department Permission System**
   - User-friendly permission configuration interface
   - Visual permission matrix for admins
   - Department management UI

### Secondary Goals

- Maintain backward compatibility with existing data
- Ensure smooth migration path from Phase 4
- Comprehensive documentation and training materials
- Production-ready deployment

---

## Feature Breakdown

### Feature Group 1: Form Versioning System

#### 1.1 Database Schema for Versioning

**Current State:**
- `questionnaires` table has `code` and `version` columns (from Phase 1)
- Submissions reference `questionnaire_id` (specific version)
- Unique constraint on `(code, version)`

**Required Changes:**
- Add `parent_version_id` column for tracking version lineage
- Add `published_at` timestamp for version activation
- Add `deprecated_at` timestamp for version retirement
- Add `version_notes` text field for change documentation

**Migration:**
```sql
ALTER TABLE questionnaires
  ADD COLUMN parent_version_id BIGINT REFERENCES questionnaires(id),
  ADD COLUMN published_at TIMESTAMP,
  ADD COLUMN deprecated_at TIMESTAMP,
  ADD COLUMN version_notes TEXT,
  ADD COLUMN breaking_changes BOOLEAN DEFAULT FALSE;

CREATE INDEX idx_questionnaires_parent_version ON questionnaires(parent_version_id);
CREATE INDEX idx_questionnaires_code_active ON questionnaires(code, is_active);
```

#### 1.2 Version Creation & Management

**Features:**
- Duplicate questionnaire to create new version
- Automatic version number increment
- Copy question permissions to new version (optional)
- Version comparison view
- Version deactivation (prevent new submissions)
- Version history tracking

**Business Rules:**
- Only one active version per questionnaire code
- Cannot delete version with existing submissions
- Breaking changes require mandatory version notes
- Version numbers always increment (no skipping)

#### 1.3 Submission-Version Binding

**Current Behavior:**
- Submissions already reference specific `questionnaire_id`
- Editing submission loads same version it was created with

**Required Enhancements:**
- Display version badge in submission list
- Filter submissions by version
- Cross-version analysis views (PostgreSQL)

#### 1.4 Analysis Views for Cross-Version Reporting

**Implementation:**
- Create PostgreSQL views for each questionnaire code
- Map question names from different versions to stable analysis codes
- Support for normalized exports across versions

**Example View:**
```sql
CREATE VIEW questionnaire_qa_analysis AS
SELECT
  s.id AS submission_id,
  q.code AS questionnaire_code,
  q.version AS questionnaire_version,
  i.name AS institution_name,
  s.status,
  s.submitted_at,

  -- Stable analysis columns (coalesce across versions)
  COALESCE(
    s.answers_json->>'province',
    s.answers_json->>'q1_province'
  ) AS province,

  COALESCE(
    (s.answers_json->>'household_size')::int,
    (s.answers_json->>'hh_size')::int
  ) AS household_size,

  s.answers_json AS full_answers
FROM submissions s
JOIN questionnaires q ON q.id = s.questionnaire_id
JOIN institutions i ON i.id = s.institution_id
WHERE q.code = 'QA' AND s.deleted_at IS NULL;
```

---

### Feature Group 2: Localization & Internationalization

#### 2.1 Backend i18n Setup

**Laravel Localization:**
- Configure supported locales: `en` (default), `lo`
- Translation files for validation, emails, messages
- Locale detection from user preferences
- API responses in user's language

**Directory Structure:**
```
resources/lang/
├── en/
│   ├── auth.php
│   ├── validation.php
│   ├── messages.php
│   └── mail.php
└── lo/
    ├── auth.php
    ├── validation.php
    ├── messages.php
    └── mail.php
```

**User Locale Storage:**
```sql
ALTER TABLE users ADD COLUMN locale VARCHAR(5) DEFAULT 'en';
CREATE INDEX idx_users_locale ON users(locale);
```

#### 2.2 Frontend i18n Setup

**React i18next Configuration:**
- Install `react-i18next` and `i18next`
- Configure language detection and fallback
- Translation namespace organization
- Context provider setup

**Translation File Structure:**
```
public/locales/
├── en/
│   ├── common.json       # Shared UI elements
│   ├── auth.json         # Login, logout, etc.
│   ├── dashboard.json    # Dashboard strings
│   ├── submissions.json  # Submission-related
│   ├── users.json        # User management
│   ├── institutions.json # Institution management
│   ├── departments.json  # Department management (NEW)
│   └── errors.json       # Error messages
└── lo/
    └── [same structure]
```

**Example Translation (common.json):**
```json
{
  "en": {
    "app_name": "Survey Webapp",
    "welcome": "Welcome",
    "logout": "Logout",
    "save": "Save",
    "cancel": "Cancel",
    "delete": "Delete",
    "edit": "Edit",
    "create": "Create",
    "loading": "Loading...",
    "no_data": "No data available"
  },
  "lo": {
    "app_name": "ແອັບພລິເຄຊັນສຳຫຼວດ",
    "welcome": "ຍິນດີຕ້ອນຮັບ",
    "logout": "ອອກຈາກລະບົບ",
    "save": "ບັນທຶກ",
    "cancel": "ຍົກເລີກ",
    "delete": "ລຶບ",
    "edit": "ແກ້ໄຂ",
    "create": "ສ້າງໃໝ່",
    "loading": "ກຳລັງໂຫລດ...",
    "no_data": "ບໍ່ມີຂໍ້ມູນ"
  }
}
```

#### 2.3 Multilingual Questionnaire Support

**SurveyJS Localization:**
- Enable multi-language support in SurveyJS Creator
- Store translations in questionnaire JSON
- Language switcher in form renderer
- Fallback to English if translation missing

**Questionnaire JSON Structure:**
```json
{
  "title": {
    "en": "Household Survey",
    "lo": "ການສຳຫຼວດຄົວເຮືອນ"
  },
  "pages": [{
    "title": {
      "en": "Demographics",
      "lo": "ຂໍ້ມູນປະຊາກອນ"
    },
    "questions": [{
      "name": "age",
      "type": "text",
      "title": {
        "en": "What is your age?",
        "lo": "ທ່ານອາຍຸເທົ່າໃດ?"
      }
    }]
  }]
}
```

#### 2.4 Language Switcher UI

**Components:**
- Language selector dropdown in user profile
- Language switcher in app header
- Persistent language preference (localStorage + database)
- Page reload on language change (if needed)

**User Preferences API:**
```
PUT /api/user/preferences
{
  "locale": "lo"
}
```

#### 2.5 Date & Number Formatting

**Implementation:**
- Use `date-fns` with locale support
- `Intl.NumberFormat` for numbers
- `Intl.DateTimeFormat` for dates
- Consistent formatting across all components

**Example Usage:**
```typescript
import { format } from 'date-fns';
import { lo, enUS } from 'date-fns/locale';

const formatDate = (date: Date, userLocale: string) => {
  const locale = userLocale === 'lo' ? lo : enUS;
  return format(date, 'PPP', { locale });
};
```

---

### Feature Group 3: Department Management UI

**Status:** Backend API 100% complete (see [Department Implementation Summary](./2025-11-26-department-implementation-summary.md)), frontend UI pending.

#### 3.1 Department CRUD Interface

**Pages Required:**
1. **Department List Page** (`/departments`)
   - Paginated table with search/filter
   - Columns: Name, Code, Institution, Active Status, User Count, Actions
   - Filter by institution (dropdown)
   - Create button (admin only)

2. **Department Create/Edit Page** (`/departments/create`, `/departments/:id/edit`)
   - Form fields: Name, Code, Institution, Description, Is Active
   - Validation (code unique per institution)
   - Breadcrumb navigation
   - Success/error notifications

3. **Department Details Page** (`/departments/:id`)
   - Department information
   - List of users in department
   - Link to edit permissions for questionnaires

**Components:**
```
resources/js/pages/departments/
├── DepartmentList.tsx
├── DepartmentForm.tsx
├── DepartmentDetails.tsx
└── components/
    ├── DepartmentTable.tsx
    └── DepartmentFilters.tsx
```

#### 3.2 Question Permission Configuration UI

**Permission Matrix Component:**

**Features:**
- Visual grid: Questions (rows) × Departments (columns)
- Checkbox-based permission assignment
- Filter by questionnaire
- Bulk enable/disable for selected questions
- Save button with API call

**Layout:**
```
┌─────────────────────────────────────────────────────┐
│  Questionnaire: [Household Survey v2 ▾]             │
│  Institution: [Province A ▾]                         │
├─────────────────────────────────────────────────────┤
│  Question                │ Dept 1 │ Dept 2 │ Dept 3 │
├──────────────────────────┼────────┼────────┼────────┤
│  Demographics Section    │        │        │        │
│  ├─ Age                  │   ☑    │   ☐    │   ☐    │
│  ├─ Gender               │   ☑    │   ☑    │   ☐    │
│  Health Section          │        │        │        │
│  ├─ BMI                  │   ☐    │   ☑    │   ☐    │
│  ├─ Blood Pressure       │   ☐    │   ☑    │   ☑    │
└─────────────────────────────────────────────────────┘
```

**Component Structure:**
```typescript
interface PermissionMatrixProps {
  questionnaireId: number;
  institutionId: number;
  onSave: (permissions: QuestionPermission[]) => Promise<void>;
}

const PermissionMatrix: React.FC<PermissionMatrixProps> = ({
  questionnaireId,
  institutionId,
  onSave
}) => {
  // Load questionnaire schema
  // Load departments for institution
  // Load existing permissions
  // Render matrix with checkboxes
  // Handle bulk save
};
```

**Pages:**
```
resources/js/pages/questionnaires/
└── QuestionnairePermissions.tsx  # Permission matrix page

resources/js/components/permissions/
├── PermissionMatrix.tsx
├── QuestionTree.tsx
└── DepartmentColumn.tsx
```

#### 3.3 User Department Assignment

**Enhancements to User Form:**
- Add "Department" dropdown in User Create/Edit form
- Filter departments by selected institution
- Show department name in user list table
- Filter users by department

**User List Page Updates:**
```
┌────────────────────────────────────────────────────┐
│  Filters:                                          │
│  Institution: [All ▾]  Department: [All ▾]         │
├────────────────────────────────────────────────────┤
│  Name        Email             Institution  Dept   │
│  John Doe    john@example.com  Province A   Finance│
│  Jane Smith  jane@example.com  Province A   Health │
└────────────────────────────────────────────────────┘
```

**Modified Components:**
```
resources/js/pages/users/
├── UserForm.tsx (add department field)
└── UserList.tsx (add department column/filter)
```

#### 3.4 Submission Form Enhancements

**Visual Indicators for Restricted Questions:**
- Lock icon on read-only questions
- Tooltip explaining permission restriction
- Disable input for restricted questions
- Clear error message if user tries to edit restricted field

**Example UI:**
```
┌─────────────────────────────────────────────────┐
│  Question: What is the household income?        │
│  [This field is restricted to Finance Dept] 🔒  │
│  ┌─────────────────────────────────────────┐   │
│  │ $50,000                           (disabled)│
│  └─────────────────────────────────────────┘   │
└─────────────────────────────────────────────────┘
```

**Implementation:**
- Use `question_permissions` from submission API response
- Apply `disabled` attribute to SurveyJS questions
- Add custom CSS classes for visual distinction

---

## Implementation Tasks

### Week 1: Form Versioning Backend

#### Task 1.1: Database Schema Updates
- [ ] Create migration for questionnaire version enhancements
- [ ] Add `parent_version_id`, `published_at`, `deprecated_at`, `version_notes`, `breaking_changes` columns
- [ ] Add indexes for performance
- [ ] Test migration rollback
- **Estimated Time:** 4 hours

#### Task 1.2: Versioning Service
- [ ] Create `QuestionnaireVersionService.php`
- [ ] Implement `duplicateAsNewVersion()` method
- [ ] Implement `activateVersion()` method
- [ ] Implement `deprecateVersion()` method
- [ ] Implement `compareVersions()` method
- [ ] Write unit tests for versioning service (10+ tests)
- **Estimated Time:** 12 hours

#### Task 1.3: Versioning API Endpoints
- [ ] Add `POST /api/questionnaires/{id}/duplicate` endpoint
- [ ] Add `PUT /api/questionnaires/{id}/activate` endpoint
- [ ] Add `PUT /api/questionnaires/{id}/deprecate` endpoint
- [ ] Add `GET /api/questionnaires/{id}/versions` endpoint (list all versions)
- [ ] Add `GET /api/questionnaires/{id}/compare/{otherId}` endpoint
- [ ] Update QuestionnaireController with versioning actions
- [ ] Write feature tests for versioning endpoints (8+ tests)
- **Estimated Time:** 10 hours

#### Task 1.4: Analysis Views
- [ ] Create migration for analysis views
- [ ] Implement configurable view generation script
- [ ] Create example analysis view SQL template
- [ ] Document analysis view creation process
- [ ] Test cross-version queries
- **Estimated Time:** 8 hours

**Week 1 Total:** 34 hours (~5 days)

---

### Week 2: Form Versioning Frontend & Localization Backend

#### Task 2.1: Version Management UI
- [ ] Create `QuestionnaireVersionList.tsx` component (version history)
- [ ] Create `VersionCompareModal.tsx` component
- [ ] Add "Duplicate as New Version" action in QuestionnaireList
- [ ] Add version badge in submission list
- [ ] Add version filter in submission list
- [ ] Add version warning modal when editing questionnaire with submissions
- [ ] Write component tests
- **Estimated Time:** 16 hours

#### Task 2.2: Backend i18n Setup
- [ ] Configure Laravel locale support (`config/app.php`)
- [ ] Create translation files for English (`resources/lang/en/`)
- [ ] Create translation files for Lao (`resources/lang/lo/`)
- [ ] Add `locale` column to users table
- [ ] Create `LocaleMiddleware` to set locale from user preference
- [ ] Create `UserPreferenceController` for locale updates
- [ ] Update API responses to use translated messages
- [ ] Write tests for locale handling (5+ tests)
- **Estimated Time:** 12 hours

#### Task 2.3: Email Template Localization
- [ ] Create Lao email templates (Blade)
- [ ] Update notification emails to use user's locale
- [ ] Test email rendering in both languages
- **Estimated Time:** 6 hours

**Week 2 Total:** 34 hours (~5 days)

---

### Week 3: Frontend i18n & Department UI (Part 1)

#### Task 3.1: Frontend i18n Setup
- [ ] Install `react-i18next` and `i18next`
- [ ] Configure i18next with language detection
- [ ] Create translation files structure (`public/locales/`)
- [ ] Create English translation files (all namespaces)
- [ ] Create `LanguageContext` for app-wide locale management
- [ ] Wrap app with `I18nextProvider`
- [ ] Create `LanguageSwitcher` component
- [ ] Add language switcher to user profile and app header
- [ ] Test language switching
- **Estimated Time:** 14 hours

#### Task 3.2: Lao Translations
- [ ] Translate all UI strings to Lao (work with native speaker if needed)
- [ ] Translate error messages
- [ ] Translate validation messages
- [ ] Translate email templates content
- [ ] Review and test all translations
- **Estimated Time:** 12 hours

#### Task 3.3: Date & Number Formatting
- [ ] Install `date-fns` with locale support
- [ ] Create utility functions for locale-aware formatting
- [ ] Update all date displays to use locale-aware formatting
- [ ] Update all number displays to use `Intl.NumberFormat`
- [ ] Test formatting in both languages
- **Estimated Time:** 8 hours

**Week 3 Total:** 34 hours (~5 days)

---

### Week 4: Department UI (Part 2) & Questionnaire Localization

#### Task 4.1: Department CRUD UI
- [ ] Create `DepartmentList.tsx` page
- [ ] Create `DepartmentForm.tsx` component
- [ ] Create `DepartmentDetails.tsx` page
- [ ] Create `DepartmentTable.tsx` component
- [ ] Create `DepartmentFilters.tsx` component
- [ ] Add routes to `app.tsx`
- [ ] Add navigation link to AppLayout (admin only)
- [ ] Wire up API calls to backend endpoints
- [ ] Add form validation
- [ ] Write component tests
- **Estimated Time:** 16 hours

#### Task 4.2: Permission Matrix UI
- [ ] Create `PermissionMatrix.tsx` component
- [ ] Create `QuestionTree.tsx` component (hierarchical question display)
- [ ] Create `DepartmentColumn.tsx` component
- [ ] Create `QuestionnairePermissions.tsx` page
- [ ] Add route to questionnaire detail page
- [ ] Implement bulk save functionality
- [ ] Add loading states and error handling
- [ ] Write component tests
- **Estimated Time:** 18 hours

**Week 4 Total:** 34 hours (~5 days)

---

### Week 5: Polish, Testing & Documentation

#### Task 5.1: User Department Assignment UI
- [ ] Update `UserForm.tsx` to include department dropdown
- [ ] Update `UserList.tsx` to display department column
- [ ] Add department filter to user list
- [ ] Update user detail page to show department
- [ ] Test department assignment flow
- **Estimated Time:** 6 hours

#### Task 5.2: Submission Form Permission Indicators
- [ ] Add permission checking logic to submission form renderer
- [ ] Add visual indicators (lock icons, tooltips) for restricted questions
- [ ] Update SurveyJS theme to show disabled state clearly
- [ ] Test with various permission configurations
- **Estimated Time:** 8 hours

#### Task 5.3: Multilingual Questionnaire Support
- [ ] Configure SurveyJS Creator for multi-language editing
- [ ] Update questionnaire creation/edit to support translations
- [ ] Test bilingual questionnaire rendering
- [ ] Create example bilingual questionnaire for demo
- **Estimated Time:** 8 hours

#### Task 5.4: Comprehensive Testing
- [ ] Run full backend test suite (ensure all tests pass)
- [ ] Run full frontend test suite
- [ ] Write additional integration tests for new features (15+ tests)
- [ ] Manual QA testing of all new features
- [ ] Cross-browser testing (Chrome, Firefox, Safari, Edge)
- [ ] Mobile device testing (responsive design)
- **Estimated Time:** 12 hours

#### Task 5.5: Documentation & Training Materials
- [ ] Update Admin Guide with versioning instructions
- [ ] Update Admin Guide with department management instructions
- [ ] Update Admin Guide with localization settings
- [ ] Create screenshots for all new features
- [ ] Update Enumerator Guide with multilingual usage
- [ ] Create Phase 5 Setup Addendum
- [ ] Create Phase 5 Implementation Summary
- [ ] Update API documentation
- **Estimated Time:** 8 hours

#### Task 5.6: Final Polish
- [ ] Fix any bugs found during testing
- [ ] Performance optimization (lazy loading, code splitting)
- [ ] Accessibility improvements (ARIA labels, keyboard navigation)
- [ ] Update build scripts if needed
- [ ] Final code review and refactoring
- **Estimated Time:** 6 hours

**Week 5 Total:** 48 hours (~6 days)

---

## Database Schema Changes

### Migration 1: Questionnaire Versioning Enhancements

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('questionnaires', function (Blueprint $table) {
            $table->foreignId('parent_version_id')
                ->nullable()
                ->after('version')
                ->constrained('questionnaires')
                ->onDelete('set null')
                ->comment('Reference to previous version if duplicated');

            $table->timestamp('published_at')
                ->nullable()
                ->after('is_active')
                ->comment('When this version was activated');

            $table->timestamp('deprecated_at')
                ->nullable()
                ->after('published_at')
                ->comment('When this version was deactivated');

            $table->text('version_notes')
                ->nullable()
                ->after('description')
                ->comment('Change notes for this version');

            $table->boolean('breaking_changes')
                ->default(false)
                ->after('version_notes')
                ->comment('Whether this version has breaking changes');
        });

        // Add indexes for performance
        Schema::table('questionnaires', function (Blueprint $table) {
            $table->index('parent_version_id');
            $table->index(['code', 'is_active']);
        });
    }

    public function down(): void
    {
        Schema::table('questionnaires', function (Blueprint $table) {
            $table->dropForeign(['parent_version_id']);
            $table->dropIndex(['parent_version_id']);
            $table->dropIndex(['code', 'is_active']);
            $table->dropColumn([
                'parent_version_id',
                'published_at',
                'deprecated_at',
                'version_notes',
                'breaking_changes',
            ]);
        });
    }
};
```

### Migration 2: User Locale Preference

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('locale', 5)
                ->default('en')
                ->after('institution_id')
                ->comment('User preferred language (en, lo)');
        });

        Schema::table('users', function (Blueprint $table) {
            $table->index('locale');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropIndex(['locale']);
            $table->dropColumn('locale');
        });
    }
};
```

### Migration 3: Analysis View Example

```sql
-- Example: Create analysis view for questionnaire code 'QA'
-- This should be created via migration but customized per questionnaire

CREATE VIEW questionnaire_qa_analysis AS
SELECT
  s.id AS submission_id,
  q.code AS questionnaire_code,
  q.version AS questionnaire_version,
  i.name AS institution_name,
  i.level AS institution_level,
  i.code AS institution_code,
  s.institution_id,
  s.status,
  s.submitted_at,
  s.approved_at,
  s.created_at,

  -- Map question names to stable analysis columns
  -- Adjust these mappings based on actual question names in your questionnaires

  COALESCE(
    s.answers_json->>'province',
    s.answers_json->>'q1_province',
    s.answers_json->>'location_province'
  ) AS province,

  COALESCE(
    (s.answers_json->>'household_size')::int,
    (s.answers_json->>'hh_size')::int,
    (s.answers_json->>'demo_hh_size')::int
  ) AS household_size,

  COALESCE(
    s.answers_json->>'income_source',
    s.answers_json->>'primary_income',
    s.answers_json->>'q5_income'
  ) AS income_source,

  COALESCE(
    (s.answers_json->>'total_income')::numeric,
    (s.answers_json->>'annual_income')::numeric
  ) AS total_income,

  -- Include full answers for ad-hoc queries
  s.answers_json AS full_answers

FROM submissions s
JOIN questionnaires q ON q.id = s.questionnaire_id
JOIN institutions i ON i.id = s.institution_id
WHERE q.code = 'QA'
  AND s.deleted_at IS NULL;

-- Create index on view (PostgreSQL 9.3+)
CREATE INDEX idx_qa_analysis_institution ON questionnaire_qa_analysis(institution_id);
CREATE INDEX idx_qa_analysis_status ON questionnaire_qa_analysis(status);
CREATE INDEX idx_qa_analysis_submitted_at ON questionnaire_qa_analysis(submitted_at);
```

---

## API Endpoints

### Versioning Endpoints

| Method | Endpoint | Description | Auth | Role |
|--------|----------|-------------|------|------|
| POST | `/api/questionnaires/{id}/duplicate` | Duplicate questionnaire as new version | Yes | Admin |
| PUT | `/api/questionnaires/{id}/activate` | Activate version (set is_active=true) | Yes | Admin |
| PUT | `/api/questionnaires/{id}/deprecate` | Deprecate version (set deprecated_at) | Yes | Admin |
| GET | `/api/questionnaires/{id}/versions` | List all versions of questionnaire code | Yes | All |
| GET | `/api/questionnaires/{id}/compare/{otherId}` | Compare two versions | Yes | Admin |

### Localization Endpoints

| Method | Endpoint | Description | Auth | Role |
|--------|----------|-------------|------|------|
| PUT | `/api/user/preferences` | Update user locale preference | Yes | All |
| GET | `/api/locales` | List supported locales | No | - |

### Department Endpoints (Already Implemented)

| Method | Endpoint | Description | Auth | Role |
|--------|----------|-------------|------|------|
| GET | `/api/departments` | List departments (paginated) | Yes | All |
| GET | `/api/departments/list` | Get all departments for dropdowns | Yes | All |
| POST | `/api/departments` | Create department | Yes | Admin |
| GET | `/api/departments/{id}` | View department details | Yes | All |
| PUT | `/api/departments/{id}` | Update department | Yes | Admin |
| DELETE | `/api/departments/{id}` | Delete department | Yes | Admin |

### Question Permission Endpoints (Already Implemented)

| Method | Endpoint | Description | Auth | Role |
|--------|----------|-------------|------|------|
| GET | `/api/question-permissions` | List permissions (paginated) | Yes | Admin |
| POST | `/api/question-permissions` | Create single permission | Yes | Admin |
| POST | `/api/question-permissions/bulk` | Bulk create/update permissions | Yes | Admin |
| DELETE | `/api/question-permissions/{id}` | Delete permission | Yes | Admin |
| GET | `/api/questionnaires/{id}/permissions` | Get all permissions for questionnaire | Yes | Admin |

---

## Frontend Components

### New Components to Create

```
resources/js/
├── pages/
│   ├── questionnaires/
│   │   ├── QuestionnaireVersionList.tsx          # Version history page
│   │   ├── QuestionnaireVersionCompare.tsx       # Compare two versions
│   │   └── QuestionnairePermissions.tsx          # Permission matrix page
│   │
│   └── departments/
│       ├── DepartmentList.tsx                     # Department list page
│       ├── DepartmentForm.tsx                     # Create/edit department
│       └── DepartmentDetails.tsx                  # Department detail page
│
├── components/
│   ├── common/
│   │   └── LanguageSwitcher.tsx                   # Language dropdown
│   │
│   ├── permissions/
│   │   ├── PermissionMatrix.tsx                   # Permission grid component
│   │   ├── QuestionTree.tsx                       # Hierarchical question display
│   │   └── DepartmentColumn.tsx                   # Department column in matrix
│   │
│   ├── departments/
│   │   ├── DepartmentTable.tsx                    # Department data table
│   │   └── DepartmentFilters.tsx                  # Filter component
│   │
│   └── questionnaires/
│       ├── VersionBadge.tsx                       # Display version number
│       ├── VersionCompareModal.tsx                # Modal to compare versions
│       └── VersionWarningModal.tsx                # Warning before editing
│
├── contexts/
│   └── LanguageContext.tsx                        # i18n context provider
│
├── hooks/
│   ├── useTranslation.ts                          # Translation hook (re-export)
│   ├── useLocale.ts                               # Locale management hook
│   └── useDateFormat.ts                           # Locale-aware date formatting
│
└── utils/
    ├── i18n.ts                                    # i18next configuration
    └── formatters.ts                              # Date/number formatters
```

### Components to Modify

```
resources/js/
├── components/layout/
│   ├── AppLayout.tsx                              # Add language switcher
│   └── Header.tsx                                 # Add language dropdown
│
├── pages/
│   ├── users/
│   │   ├── UserForm.tsx                           # Add department dropdown
│   │   └── UserList.tsx                           # Add department filter/column
│   │
│   ├── submissions/
│   │   ├── SubmissionList.tsx                     # Add version filter/badge
│   │   └── SubmissionForm.tsx                     # Add permission indicators
│   │
│   └── questionnaires/
│       ├── QuestionnaireList.tsx                  # Add version info, duplicate action
│       └── QuestionnaireForm.tsx                  # Add multi-language support
│
└── All pages and components                       # Add i18n translation calls
```

---

## Testing Strategy

### Backend Tests

#### Unit Tests (25+ new tests)

**QuestionnaireVersionServiceTest.php** (12 tests)
- Test duplicate questionnaire as new version
- Test version number increment
- Test activate version (set is_active=true, deactivate others)
- Test deprecate version
- Test cannot delete version with submissions
- Test compare versions method
- Test copy permissions to new version (optional)
- Test parent version lineage tracking
- Test breaking changes flag
- Test version notes required for breaking changes
- Test only one active version per code
- Test version creation updates published_at

**LocaleServiceTest.php** (5 tests)
- Test set user locale preference
- Test locale validation (only en, lo allowed)
- Test default locale fallback
- Test API response language based on user locale
- Test email language based on user locale

#### Feature Tests (20+ new tests)

**QuestionnaireVersioningTest.php** (10 tests)
- Test POST /api/questionnaires/{id}/duplicate creates new version
- Test duplicate increments version number
- Test duplicate copies surveyjs_json
- Test duplicate sets parent_version_id
- Test activate version makes it active
- Test activate version deactivates other versions
- Test deprecate version sets deprecated_at
- Test list versions endpoint
- Test compare versions endpoint
- Test cannot delete questionnaire with submissions

**LocalizationTest.php** (5 tests)
- Test update user locale preference
- Test validation errors in user's language
- Test email sent in user's language
- Test API error messages in user's language
- Test locale defaults to 'en' for new users

**DepartmentUIIntegrationTest.php** (5 tests)
- Test department list page loads
- Test create department via UI flow
- Test edit department via UI flow
- Test delete department with cascade check
- Test permission matrix save

### Frontend Tests

#### Component Tests (15+ new tests)

**LanguageSwitcher.test.tsx** (3 tests)
- Renders language options
- Changes language on selection
- Persists language preference

**PermissionMatrix.test.tsx** (5 tests)
- Renders question tree correctly
- Renders department columns
- Toggles permission checkboxes
- Bulk save permissions
- Shows loading state during save

**DepartmentForm.test.tsx** (4 tests)
- Validates required fields
- Shows institution dropdown
- Submits form successfully
- Shows error messages

**VersionBadge.test.tsx** (3 tests)
- Displays version number
- Shows active badge
- Shows deprecated badge

#### Integration Tests (10+ new tests)

**Department Management Flow**
- Admin creates department
- Admin assigns users to department
- Admin configures question permissions
- User sees restricted questions

**Versioning Flow**
- Admin duplicates questionnaire
- New version becomes active
- Old submissions use old version
- New submissions use new version

**Localization Flow**
- User changes language preference
- UI switches to Lao
- Date format changes
- Email sent in Lao

### End-to-End Tests (Playwright)

**E2E Scenarios (8 scenarios)**
1. Complete versioning workflow (duplicate, activate, create submission)
2. Complete department permission workflow (create dept, assign permissions, test restrictions)
3. Language switching (EN → LO → EN)
4. Multilingual questionnaire (create bilingual form, fill in Lao, view in English)
5. Cross-version analysis (create submissions in v1 and v2, export combined)
6. Department CRUD operations
7. Permission matrix bulk operations
8. User department assignment and submission editing restrictions

---

## Deployment Plan

### Pre-Deployment Checklist

**Code Quality:**
- [ ] All tests passing (backend + frontend)
- [ ] Code review completed
- [ ] No console errors or warnings
- [ ] TypeScript compilation successful
- [ ] Linter checks passed

**Database:**
- [ ] Migrations reviewed and tested
- [ ] Rollback migrations tested
- [ ] Backup strategy confirmed
- [ ] Analysis views created for existing questionnaires

**Translations:**
- [ ] All English strings complete
- [ ] All Lao translations complete and reviewed by native speaker
- [ ] Email templates translated
- [ ] SurveyJS UI strings translated

**Documentation:**
- [ ] Admin Guide updated
- [ ] Enumerator Guide updated
- [ ] API documentation updated
- [ ] Phase 5 Setup Addendum created
- [ ] Implementation Summary created

### Deployment Steps

#### Step 1: Staging Deployment (2 days)

**Day 1: Initial Deployment**
1. Deploy backend code to staging server
2. Run migrations
3. Deploy frontend build
4. Test all new features manually
5. Run automated test suite
6. Fix any deployment-specific issues

**Day 2: UAT Preparation**
1. Create demo departments and permissions
2. Create sample bilingual questionnaire
3. Create sample submissions in multiple versions
4. Invite UAT testers
5. Provide UAT test scripts

#### Step 2: UAT (1 week)

**Participants:**
- 2 Admin users
- 3 Enumerator users
- 1 Institution Admin

**Test Scenarios:**
1. Create and manage departments
2. Configure question permissions
3. Create new questionnaire version
4. Fill submissions with permission restrictions
5. Switch language to Lao and use UI
6. Create bilingual questionnaire and fill in both languages
7. Export data across versions

**Acceptance Criteria:**
- All scenarios completed successfully
- No critical bugs
- Performance meets NFRs
- User satisfaction score > 7/10

#### Step 3: Production Deployment (1 day)

**Pre-Deployment:**
1. Backup production database
2. Test backup restoration
3. Schedule maintenance window (2 hours)
4. Notify users of deployment

**Deployment:**
1. Put application in maintenance mode
2. Pull latest code
3. Run migrations
4. Clear caches
5. Deploy frontend build
6. Run smoke tests
7. Take application out of maintenance mode

**Post-Deployment:**
1. Monitor error logs for 24 hours
2. Verify all features working
3. Check performance metrics
4. Collect user feedback

#### Step 4: Post-Deployment (1 week)

1. Daily monitoring of logs and metrics
2. Address any issues immediately
3. Collect user feedback
4. Plan v1.1 features based on feedback

---

## Success Criteria

### Technical Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Backend Test Coverage | > 80% | PHPUnit coverage report |
| Frontend Test Coverage | > 70% | Jest coverage report |
| All Tests Passing | 100% | CI/CD pipeline |
| Build Success | 100% | No compilation errors |
| Performance (Dashboard Load) | < 2s | Lighthouse/manual testing |
| Performance (API Response) | < 500ms p95 | Application monitoring |

### Functional Success Metrics

| Feature | Success Criteria |
|---------|-----------------|
| **Form Versioning** | ✓ Can create new version<br>✓ Old submissions use old version<br>✓ New submissions use new version<br>✓ Can compare versions<br>✓ Analysis view works across versions |
| **Localization** | ✓ UI fully translated to Lao<br>✓ Language switcher works<br>✓ Email sent in user's language<br>✓ Dates/numbers formatted correctly<br>✓ Bilingual questionnaires work |
| **Department UI** | ✓ Can create/edit/delete departments<br>✓ Permission matrix functional<br>✓ Users can be assigned to departments<br>✓ Permission restrictions enforced in forms<br>✓ Clear error messages for violations |

### User Acceptance Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| UAT Scenarios Completed | 90%+ | UAT test results |
| Critical Bugs Found | 0 | Bug tracking system |
| User Satisfaction Score | > 7/10 | Post-UAT survey |
| Feature Understanding | > 80% | Users can use features without help |

---

## Timeline & Milestones

### Overview

| Week | Focus Area | Key Deliverables | Status |
|------|-----------|------------------|--------|
| **Week 1** | Form Versioning Backend | Database schema, service, API endpoints, tests | Pending |
| **Week 2** | Versioning Frontend + i18n Backend | Version UI, Laravel localization, translations | Pending |
| **Week 3** | Frontend i18n + Dept UI Start | react-i18next setup, Lao translations, dept CRUD | Pending |
| **Week 4** | Department UI Completion | Permission matrix, questionnaire localization | Pending |
| **Week 5** | Polish & Testing | Bug fixes, documentation, comprehensive testing | Pending |
| **Week 6** | Staging & UAT | Deployment to staging, user acceptance testing | Pending |
| **Week 7** | Production Launch | Production deployment, monitoring, support | Pending |

### Detailed Milestones

#### Milestone 1: Versioning Complete (End of Week 2)
- [ ] All versioning backend tests passing
- [ ] Version duplication API working
- [ ] Version management UI functional
- [ ] Analysis views created
- [ ] Backend i18n configured
- **Demo:** Show creating new version, old submissions use v1, new use v2

#### Milestone 2: Localization Complete (End of Week 3)
- [ ] Frontend i18n fully configured
- [ ] All English strings translated to Lao
- [ ] Language switcher functional
- [ ] Date/number formatting locale-aware
- [ ] Email templates in both languages
- **Demo:** Switch to Lao, navigate entire app, submit form, receive email

#### Milestone 3: Department UI Complete (End of Week 4)
- [ ] Department CRUD fully functional
- [ ] Permission matrix working
- [ ] User department assignment complete
- [ ] Permission enforcement in submission forms
- [ ] All department tests passing
- **Demo:** Create department, configure permissions, show restricted form

#### Milestone 4: Phase 5 Feature Complete (End of Week 5)
- [ ] All backend tests passing (220+ tests)
- [ ] All frontend tests passing
- [ ] All documentation updated
- [ ] No critical bugs
- [ ] Performance meets targets
- **Demo:** End-to-end workflow with all Phase 5 features

#### Milestone 5: UAT Sign-Off (End of Week 6)
- [ ] Deployed to staging
- [ ] All UAT scenarios completed
- [ ] Critical bugs fixed
- [ ] User acceptance achieved
- [ ] Production deployment approved

#### Milestone 6: Production Launch (Week 7)
- [ ] Deployed to production
- [ ] Smoke tests passed
- [ ] Users trained
- [ ] Monitoring active
- [ ] Support plan in place

---

## Risk Assessment

### Technical Risks

| Risk | Likelihood | Impact | Mitigation Strategy |
|------|-----------|--------|---------------------|
| **Analysis view complexity** causing performance issues | Medium | Medium | - Create indexes on view columns<br>- Test with large datasets (100K+ submissions)<br>- Optimize COALESCE queries<br>- Consider materialized views if needed |
| **Versioning conflicts** when editing questionnaires | Low | High | - Clear warning modals before editing<br>- "Breaking changes" checkbox<br>- Mandatory version notes<br>- Version comparison UI |
| **Translation quality** affecting usability | Medium | Medium | - Work with native Lao speaker<br>- User testing with Lao users<br>- Iterative translation refinement<br>- Fallback to English if translation missing |
| **i18n integration issues** with SurveyJS | Low | Medium | - Test multilingual questionnaires thoroughly<br>- Follow SurveyJS localization guide<br>- Have fallback plan (English-only questionnaires) |
| **Permission matrix UI** overwhelming for complex forms | Medium | Medium | - Paginate questions if > 50<br>- Add search/filter for questions<br>- Provide bulk operations<br>- User training and documentation |
| **Department cascade delete** accidentally removing users | Low | High | - Require confirmation dialog<br>- Show user count before delete<br>- Soft delete departments<br>- Backend validation prevents delete if users exist |

### User Adoption Risks

| Risk | Likelihood | Impact | Mitigation Strategy |
|------|-----------|--------|---------------------|
| **Users confused by versioning** | Medium | Medium | - Clear version badges in UI<br>- Version comparison tool<br>- Admin training on when to create versions<br>- "Breaking changes" guideline |
| **Language switching** causing confusion | Low | Low | - Persistent language preference<br>- Clear language indicator in UI<br>- Tooltips/help text in both languages |
| **Permission configuration** too complex | Medium | High | - Step-by-step wizard for first-time setup<br>- Permission templates for common scenarios<br>- Video tutorial on permission matrix<br>- Admin support hotline |
| **Resistance to department structure** | Low | Medium | - Make departments optional (default-allow policy)<br>- Show value with use cases<br>- Gradual rollout with pilot institutions |

### Project Risks

| Risk | Likelihood | Impact | Mitigation Strategy |
|------|-----------|--------|---------------------|
| **Scope creep** extending timeline | Medium | Medium | - Strict adherence to Phase 5 scope<br>- Defer additional features to v1.1<br>- Weekly progress reviews |
| **Translation delays** holding up deployment | Medium | Low | - Start translations early (Week 2)<br>- Use machine translation as placeholder<br>- Iterative refinement post-launch |
| **UAT finding major issues** late in phase | Low | High | - Internal QA before UAT<br>- Thorough testing in Week 5<br>- Buffer time for fixes in Week 6 |
| **Production deployment issues** | Low | High | - Comprehensive staging testing<br>- Dry-run deployment<br>- Rollback plan prepared<br>- Maintenance window during low-traffic period |

---

## Dependencies & Prerequisites

### Technical Dependencies

**Backend:**
- Laravel 12+ (already in use)
- PostgreSQL 16+ (for analysis views)
- maatwebsite/excel (for exports across versions)

**Frontend:**
- react-i18next 13+
- i18next 23+
- date-fns 3+ (with locale support)
- SurveyJS 1.9+ (with multi-language support)

**Development:**
- Native Lao speaker for translation review
- Staging server for UAT
- Test data with multiple questionnaire versions

### Completed Prerequisites

**From Previous Phases:**
- ✅ Phase 1-4 complete and deployed
- ✅ Department backend system complete (API + database)
- ✅ Questionnaire CRUD working
- ✅ Submission workflow functional
- ✅ User management working

**Database:**
- ✅ `questionnaires` table has `code` and `version` columns
- ✅ `submissions.questionnaire_id` references specific version
- ✅ Departments and question_permissions tables exist
- ✅ Users have `department_id` column

**Frontend:**
- ✅ TypeScript types for Department and QuestionPermission
- ✅ API services for departments and permissions
- ✅ React 18 + TanStack Query setup

---

## Appendix A: Translation Coverage Checklist

### Backend Translation Files (Laravel)

**resources/lang/en/**
- [ ] auth.php - Login, logout, authentication messages
- [ ] validation.php - Form validation errors
- [ ] messages.php - General UI messages, notifications
- [ ] mail.php - Email template strings
- [ ] permissions.php - Permission-related messages
- [ ] departments.php - Department-related messages

**resources/lang/lo/**
- [ ] auth.php
- [ ] validation.php
- [ ] messages.php
- [ ] mail.php
- [ ] permissions.php
- [ ] departments.php

### Frontend Translation Files (React)

**public/locales/en/**
- [ ] common.json - Shared UI elements (buttons, labels, etc.)
- [ ] auth.json - Login, logout, password reset
- [ ] dashboard.json - Dashboard page strings
- [ ] submissions.json - Submission list, form, status labels
- [ ] users.json - User management
- [ ] institutions.json - Institution management
- [ ] questionnaires.json - Questionnaire list, form, versioning
- [ ] departments.json - Department management (NEW)
- [ ] permissions.json - Permission matrix strings (NEW)
- [ ] errors.json - Error messages
- [ ] validation.json - Form validation messages

**public/locales/lo/**
- [ ] [Same structure as English]

### Email Templates

- [ ] Blade templates (English): resources/views/emails/
- [ ] Blade templates (Lao): resources/views/emails/
- [ ] Submission approved notification
- [ ] Submission rejected notification
- [ ] User created notification
- [ ] Password reset email

---

## Appendix B: Example Translation Files

### common.json (English)

```json
{
  "app_name": "Survey Webapp",
  "welcome": "Welcome",
  "dashboard": "Dashboard",
  "logout": "Logout",
  "login": "Login",
  "save": "Save",
  "cancel": "Cancel",
  "delete": "Delete",
  "edit": "Edit",
  "create": "Create",
  "view": "View",
  "back": "Back",
  "next": "Next",
  "previous": "Previous",
  "search": "Search",
  "filter": "Filter",
  "export": "Export",
  "import": "Import",
  "loading": "Loading...",
  "saving": "Saving...",
  "no_data": "No data available",
  "error": "Error",
  "success": "Success",
  "warning": "Warning",
  "info": "Information",
  "confirm": "Confirm",
  "yes": "Yes",
  "no": "No",
  "all": "All",
  "none": "None",
  "actions": "Actions",
  "status": "Status",
  "name": "Name",
  "code": "Code",
  "description": "Description",
  "created_at": "Created At",
  "updated_at": "Updated At",
  "active": "Active",
  "inactive": "Inactive"
}
```

### common.json (Lao)

```json
{
  "app_name": "ແອັບພລິເຄຊັນສຳຫຼວດ",
  "welcome": "ຍິນດີຕ້ອນຮັບ",
  "dashboard": "ແຜງຄວບຄຸມ",
  "logout": "ອອກຈາກລະບົບ",
  "login": "ເຂົ້າສູ່ລະບົບ",
  "save": "ບັນທຶກ",
  "cancel": "ຍົກເລີກ",
  "delete": "ລຶບ",
  "edit": "ແກ້ໄຂ",
  "create": "ສ້າງໃໝ່",
  "view": "ເບິ່ງ",
  "back": "ກັບຄືນ",
  "next": "ຕໍ່ໄປ",
  "previous": "ກ່ອນໜ້າ",
  "search": "ຄົ້ນຫາ",
  "filter": "ກອງ",
  "export": "ສົ່ງອອກ",
  "import": "ນຳເຂົ້າ",
  "loading": "ກຳລັງໂຫລດ...",
  "saving": "ກຳລັງບັນທຶກ...",
  "no_data": "ບໍ່ມີຂໍ້ມູນ",
  "error": "ຂໍ້ຜິດພາດ",
  "success": "ສຳເລັດ",
  "warning": "ຄຳເຕືອນ",
  "info": "ຂໍ້ມູນ",
  "confirm": "ຢືນຢັນ",
  "yes": "ແມ່ນ",
  "no": "ບໍ່",
  "all": "ທັງໝົດ",
  "none": "ບໍ່ມີ",
  "actions": "ການປະຕິບັດ",
  "status": "ສະຖານະ",
  "name": "ຊື່",
  "code": "ລະຫັດ",
  "description": "ຄຳອະທິບາຍ",
  "created_at": "ສ້າງເມື່ອ",
  "updated_at": "ອັບເດດເມື່ອ",
  "active": "ໃຊ້ງານ",
  "inactive": "ບໍ່ໃຊ້ງານ"
}
```

### departments.json (English)

```json
{
  "title": "Departments",
  "create": "Create Department",
  "edit": "Edit Department",
  "delete": "Delete Department",
  "view": "View Department",
  "list": "Department List",
  "name": "Department Name",
  "code": "Department Code",
  "institution": "Institution",
  "description": "Description",
  "is_active": "Active",
  "user_count": "Number of Users",
  "created_at": "Created At",
  "search_placeholder": "Search departments...",
  "filter_by_institution": "Filter by Institution",
  "no_departments": "No departments found",
  "create_success": "Department created successfully",
  "update_success": "Department updated successfully",
  "delete_success": "Department deleted successfully",
  "delete_confirm": "Are you sure you want to delete this department?",
  "delete_warning": "This department has {{count}} users assigned. Please reassign users before deleting.",
  "validation": {
    "name_required": "Department name is required",
    "code_required": "Department code is required",
    "code_unique": "Department code must be unique within the institution",
    "institution_required": "Institution is required"
  }
}
```

### departments.json (Lao)

```json
{
  "title": "ພະແນກ",
  "create": "ສ້າງພະແນກ",
  "edit": "ແກ້ໄຂພະແນກ",
  "delete": "ລຶບພະແນກ",
  "view": "ເບິ່ງພະແນກ",
  "list": "ລາຍການພະແນກ",
  "name": "ຊື່ພະແນກ",
  "code": "ລະຫັດພະແນກ",
  "institution": "ສະຖາບັນ",
  "description": "ຄຳອະທິບາຍ",
  "is_active": "ໃຊ້ງານ",
  "user_count": "ຈຳນວນຜູ້ໃຊ້",
  "created_at": "ສ້າງເມື່ອ",
  "search_placeholder": "ຄົ້ນຫາພະແນກ...",
  "filter_by_institution": "ກອງຕາມສະຖາບັນ",
  "no_departments": "ບໍ່ພົບພະແນກ",
  "create_success": "ສ້າງພະແນກສຳເລັດ",
  "update_success": "ອັບເດດພະແນກສຳເລັດ",
  "delete_success": "ລຶບພະແນກສຳເລັດ",
  "delete_confirm": "ທ່ານແນ່ໃຈບໍ່ວ່າຕ້ອງການລຶບພະແນກນີ້?",
  "delete_warning": "ພະແນກນີ້ມີຜູ້ໃຊ້ {{count}} ຄົນ. ກະລຸນາມອບໝາຍຜູ້ໃຊ້ໃໝ່ກ່ອນລຶບ.",
  "validation": {
    "name_required": "ຕ້ອງລະບຸຊື່ພະແນກ",
    "code_required": "ຕ້ອງລະບຸລະຫັດພະແນກ",
    "code_unique": "ລະຫັດພະແນກຕ້ອງບໍ່ຊ້ຳກັນພາຍໃນສະຖາບັນ",
    "institution_required": "ຕ້ອງລະບຸສະຖາບັນ"
  }
}
```

---

## Appendix C: Component Implementation Examples

### Example: LanguageSwitcher Component

```typescript
// resources/js/components/common/LanguageSwitcher.tsx

import React from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';

const LANGUAGES = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'lo', name: 'Lao', nativeName: 'ລາວ' },
];

export const LanguageSwitcher: React.FC = () => {
  const { i18n } = useTranslation();
  const { user, refetch } = useAuth();
  const [isChanging, setIsChanging] = React.useState(false);

  const handleLanguageChange = async (languageCode: string) => {
    if (languageCode === i18n.language) return;

    setIsChanging(true);
    try {
      // Update user preference on server
      await api.updateUserPreferences({ locale: languageCode });

      // Change language in i18next
      await i18n.changeLanguage(languageCode);

      // Store in localStorage
      localStorage.setItem('language', languageCode);

      // Refetch user data to update context
      await refetch();

      // Optionally reload page to ensure all components update
      window.location.reload();
    } catch (error) {
      console.error('Failed to change language:', error);
    } finally {
      setIsChanging(false);
    }
  };

  return (
    <div className="relative">
      <select
        value={i18n.language}
        onChange={(e) => handleLanguageChange(e.target.value)}
        disabled={isChanging}
        className="block w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 disabled:opacity-50"
      >
        {LANGUAGES.map((lang) => (
          <option key={lang.code} value={lang.code}>
            {lang.nativeName}
          </option>
        ))}
      </select>
    </div>
  );
};
```

### Example: PermissionMatrix Component

```typescript
// resources/js/components/permissions/PermissionMatrix.tsx

import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { api } from '@/services/api';
import { Questionnaire, Department, QuestionPermission } from '@/types';

interface PermissionMatrixProps {
  questionnaireId: number;
  institutionId: number;
}

export const PermissionMatrix: React.FC<PermissionMatrixProps> = ({
  questionnaireId,
  institutionId,
}) => {
  const { t } = useTranslation(['permissions', 'common']);
  const queryClient = useQueryClient();

  // State for modified permissions
  const [permissions, setPermissions] = React.useState<Map<string, Set<number>>>(
    new Map()
  );

  // Load questionnaire
  const { data: questionnaire, isLoading: loadingQuestionnaire } = useQuery({
    queryKey: ['questionnaire', questionnaireId],
    queryFn: () => api.questionnaires.getById(questionnaireId),
  });

  // Load departments for institution
  const { data: departments, isLoading: loadingDepartments } = useQuery({
    queryKey: ['departments', 'list', institutionId],
    queryFn: () => api.departments.getList({ institution_id: institutionId }),
  });

  // Load existing permissions
  const { data: existingPermissions, isLoading: loadingPermissions } = useQuery({
    queryKey: ['questionPermissions', questionnaireId, institutionId],
    queryFn: () =>
      api.questionPermissions.getList({
        questionnaire_id: questionnaireId,
        institution_id: institutionId,
      }),
  });

  // Initialize permissions state when data loads
  React.useEffect(() => {
    if (!existingPermissions) return;

    const permMap = new Map<string, Set<number>>();
    existingPermissions.forEach((perm: QuestionPermission) => {
      if (!permMap.has(perm.question_name)) {
        permMap.set(perm.question_name, new Set());
      }
      if (perm.permission_type === 'edit') {
        permMap.get(perm.question_name)!.add(perm.department_id);
      }
    });
    setPermissions(permMap);
  }, [existingPermissions]);

  // Save permissions mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      const permissionsToSave: Partial<QuestionPermission>[] = [];

      permissions.forEach((deptIds, questionName) => {
        deptIds.forEach((deptId) => {
          permissionsToSave.push({
            questionnaire_id: questionnaireId,
            question_name: questionName,
            institution_id: institutionId,
            department_id: deptId,
            permission_type: 'edit',
          });
        });
      });

      return api.questionPermissions.bulkUpsert({ permissions: permissionsToSave });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['questionPermissions'] });
      alert(t('permissions:save_success'));
    },
    onError: (error) => {
      console.error('Failed to save permissions:', error);
      alert(t('permissions:save_error'));
    },
  });

  // Extract questions from SurveyJS JSON
  const questions = React.useMemo(() => {
    if (!questionnaire?.surveyjs_json) return [];

    const extractQuestions = (pages: any[]): any[] => {
      const allQuestions: any[] = [];
      pages.forEach((page) => {
        if (page.elements) {
          page.elements.forEach((element: any) => {
            if (element.type === 'panel' && element.elements) {
              allQuestions.push(...element.elements);
            } else {
              allQuestions.push(element);
            }
          });
        }
      });
      return allQuestions;
    };

    return extractQuestions(questionnaire.surveyjs_json.pages || []);
  }, [questionnaire]);

  // Toggle permission
  const togglePermission = (questionName: string, deptId: number) => {
    setPermissions((prev) => {
      const newMap = new Map(prev);
      if (!newMap.has(questionName)) {
        newMap.set(questionName, new Set());
      }
      const deptSet = newMap.get(questionName)!;
      if (deptSet.has(deptId)) {
        deptSet.delete(deptId);
      } else {
        deptSet.add(deptId);
      }
      return newMap;
    });
  };

  if (loadingQuestionnaire || loadingDepartments || loadingPermissions) {
    return <div>{t('common:loading')}</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">{t('permissions:matrix_title')}</h2>
        <button
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending}
          className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
        >
          {saveMutation.isPending ? t('common:saving') : t('common:save')}
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('permissions:question')}
              </th>
              {departments?.map((dept: Department) => (
                <th
                  key={dept.id}
                  className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  {dept.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {questions.map((question) => (
              <tr key={question.name}>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {question.title?.en || question.title || question.name}
                </td>
                {departments?.map((dept: Department) => (
                  <td key={dept.id} className="px-6 py-4 text-center">
                    <input
                      type="checkbox"
                      checked={permissions.get(question.name)?.has(dept.id) || false}
                      onChange={() => togglePermission(question.name, dept.id)}
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
```

---

**End of Phase 5 Implementation Plan**

---

## Next Steps

1. **Review this plan** with stakeholders and technical team
2. **Adjust timeline** based on team capacity and priorities
3. **Assign tasks** to developers (backend, frontend, translations)
4. **Set up project tracking** (Jira, GitHub Projects, etc.)
5. **Begin Week 1 tasks** - Form Versioning Backend
6. **Schedule regular check-ins** (daily standups, weekly reviews)

**Questions or Feedback:** Contact project lead for clarifications or modifications to this plan.
