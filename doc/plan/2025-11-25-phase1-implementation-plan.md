# Survey Webapp - Phase 1 Implementation Plan

## Executive Summary

**Project:** Survey Webapp - Multi-institution survey data collection platform
**Phase:** Phase 1 - Core Foundation (8 weeks estimated)
**Status:** Greenfield project - no existing code
**Technology Stack:** Laravel 12+, React 18+, PostgreSQL 16+, SurveyJS Library, TailwindCSS
**Created:** 2025-11-25

---

## User Decisions

| Decision | Choice |
|----------|--------|
| Backend Testing | **Pest** (modern, expressive syntax) |
| Frontend State | **React Query + Context** (lightweight, server-state focused) |
| Documentation | **Markdown** (version-controlled, simple) |
| SurveyJS | **Library only (free)** - Admin pastes JSON from surveyjs.io/create-free-survey |
| Seed Data | **Separate seeders** (minimal + optional demo) |
| Development | **Laravel Herd** (requires separate PostgreSQL installation) |

---

## Phase 1 Scope (from PRD)

1. User authentication (email/password)
2. User management (CRUD)
3. Institution management (flat structure, no hierarchy yet)
4. Role-based access control (Admin, Enumerator, Viewer)
5. Questionnaire CRUD (SurveyJS Creator integration)
6. Basic submission creation and viewing
7. Simple dashboard (submission counts)

---

## 1. Project Structure

```text
qi-survey-webapp/
├── app/
│   ├── Actions/                  # Single-purpose action classes
│   ├── Http/
│   │   ├── Controllers/Api/      # API Controllers
│   │   ├── Middleware/           # Custom middleware
│   │   ├── Requests/             # Form request validation
│   │   └── Resources/            # API Resources
│   ├── Models/                   # Eloquent models
│   └── Policies/                 # Authorization policies
├── config/
├── database/
│   ├── factories/
│   ├── migrations/
│   └── seeders/
├── doc/
│   ├── api/                      # API documentation
│   ├── guides/
│   │   ├── admin-guide.md
│   │   ├── enumerator-guide.md
│   │   └── setup-guide.md
│   ├── plan/                     # Implementation plans
│   └── prd/
├── resources/
│   ├── css/
│   ├── js/
│   │   ├── components/
│   │   │   ├── common/           # Reusable UI components
│   │   │   ├── layout/           # Layout components
│   │   │   ├── questionnaires/   # Questionnaire components
│   │   │   └── submissions/      # Submission components
│   │   ├── contexts/             # React contexts
│   │   ├── hooks/                # Custom hooks
│   │   ├── pages/                # Page components
│   │   ├── services/             # API services
│   │   ├── types/                # TypeScript types
│   │   └── utils/                # Utility functions
│   └── views/
├── routes/
├── tests/
│   ├── Feature/                  # Feature tests
│   └── Unit/                     # Unit tests
└── README.md
```

---

## 2. Database Schema

### 2.1 Tables

#### institutions

```sql
- id (PK)
- name (varchar 255)
- code (varchar 50, unique)
- level (enum: central, province, district)
- parent_institution_id (FK, nullable) -- for Phase 2
- is_active (boolean, default true)
- created_by, updated_by (FK users)
- timestamps
```

#### users (modifications to default)

```sql
- institution_id (FK institutions)
- is_active (boolean, default true)
- failed_login_attempts (int, default 0)
- locked_until (timestamp, nullable)
- last_login_at (timestamp, nullable)
- created_by, updated_by (FK users)
- soft deletes
```

#### questionnaires

```sql
- id (PK)
- code (varchar 50)
- version (int, default 1)
- title (varchar 255)
- description (text, nullable)
- surveyjs_json (JSONB)
- is_active (boolean, default true)
- created_by, updated_by (FK users)
- timestamps
- UNIQUE(code, version)
```

#### submissions

```sql
- id (PK)
- questionnaire_id (FK questionnaires)
- institution_id (FK institutions)
- status (enum: draft, submitted, approved, rejected)
- answers_json (JSONB)
- submitted_at, approved_at, rejected_at (timestamps)
- approved_by, rejected_by (FK users)
- rejection_comments (text)
- created_by, updated_by, deleted_by (FK users)
- timestamps
- soft deletes
```

### 2.2 Roles & Permissions (Spatie)

**Roles:**

- `admin` - Full system access
- `enumerator` - Create/edit submissions
- `viewer` - Read-only access

**Permissions:**

- users.view, users.create, users.update, users.delete
- institutions.view, institutions.create, institutions.update, institutions.delete
- questionnaires.view, questionnaires.create, questionnaires.update, questionnaires.delete
- submissions.view, submissions.create, submissions.update, submissions.delete
- dashboard.view

---

## 3. Backend Implementation

### 3.1 Models

| Model | Key Relationships |
|-------|------------------|
| User | belongsTo Institution, hasMany Submissions |
| Institution | hasMany Users, hasMany Submissions |
| Questionnaire | hasMany Submissions |
| Submission | belongsTo Questionnaire, Institution, User (creator) |

### 3.2 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/login | User login |
| POST | /api/logout | User logout |
| GET | /api/user | Current user info |
| GET | /api/dashboard/stats | Dashboard statistics |
| CRUD | /api/users | User management |
| CRUD | /api/institutions | Institution management |
| CRUD | /api/questionnaires | Questionnaire management |
| POST | /api/questionnaires/{id}/duplicate | Duplicate questionnaire |
| GET | /api/questionnaires/{id}/submissions | List submissions |
| POST | /api/questionnaires/{id}/submissions | Create submission |
| GET/PUT/DELETE | /api/submissions/{id} | Submission operations |

### 3.3 Key Controllers

- `AuthController` - Login/logout with account lockout
- `UserController` - CRUD with role assignment
- `InstitutionController` - CRUD operations
- `QuestionnaireController` - CRUD + duplicate
- `SubmissionController` - CRUD with status management
- `DashboardController` - Statistics endpoint

### 3.4 Policies

- **SubmissionPolicy**: Enumerators can only edit their own drafts/rejected submissions
- **UserPolicy**: Only admins can manage users
- **QuestionnairePolicy**: Only admins can create/edit questionnaires

---

## 4. Frontend Implementation

### 4.1 Key Pages

| Page | Route | Description |
|------|-------|-------------|
| Login | /login | Authentication |
| Dashboard | /dashboard | Statistics overview |
| Users | /users/* | User CRUD |
| Institutions | /institutions/* | Institution CRUD |
| Questionnaires | /questionnaires/* | Questionnaire management |
| Submissions | /questionnaires/:id/submissions/* | Submission list/create/edit |

### 4.2 Key Components

- `AuthContext` - Authentication state management
- `QuestionnaireJsonEditor` - JSON textarea for pasting SurveyJS JSON (admin creates JSON at surveyjs.io/create-free-survey)
- `SubmissionForm` - SurveyJS Library form renderer with read-only support
- `DataTable` - Reusable data table with pagination
- `AppLayout` / `AuthLayout` - Layout wrappers

### 4.3 State Management

- **React Query** - Server state (API data caching)
- **React Context** - Auth state
- **Local state** - Component-specific state

### 4.4 Questionnaire Creation Workflow

1. Admin visits https://surveyjs.io/create-free-survey
2. Admin designs form using drag-and-drop interface
3. Admin copies generated JSON
4. Admin pastes JSON into the application's questionnaire form
5. System validates and stores the JSON

---

## 5. Testing Strategy

### 5.1 Backend (Pest PHP)

**Target:** 70% code coverage

| Test Category | Key Tests |
|--------------|-----------|
| Auth | Login, logout, account lockout, inactive user |
| Users | CRUD, role assignment, authorization |
| Institutions | CRUD, validation |
| Questionnaires | CRUD, SurveyJS JSON validation, duplication |
| Submissions | CRUD, status transitions, authorization |
| Dashboard | Statistics filtering |

### 5.2 Frontend (Jest + React Testing Library)

**Target:** 60% code coverage

| Test Category | Key Tests |
|--------------|-----------|
| Auth | Login form, validation, error handling |
| Components | Rendering, user interactions |
| Hooks | API calls, state management |

### 5.3 Test File Structure

```text
tests/
├── Feature/
│   ├── Auth/
│   │   ├── LoginTest.php
│   │   ├── LogoutTest.php
│   │   └── AccountLockoutTest.php
│   ├── Institution/
│   │   └── InstitutionCrudTest.php
│   ├── Questionnaire/
│   │   └── QuestionnaireCrudTest.php
│   ├── Submission/
│   │   ├── SubmissionCrudTest.php
│   │   └── SubmissionAuthorizationTest.php
│   └── User/
│       └── UserCrudTest.php
└── Unit/
    └── Models/

resources/js/__tests__/
├── pages/
│   └── auth/
│       └── Login.test.tsx
└── components/
```

---

## 6. Documentation

### 6.1 User Documentation

#### Enumerator Guide (`doc/guides/enumerator-guide.md`)

- Logging in and dashboard overview
- Creating and editing submissions
- Saving drafts vs submitting
- Responding to rejection feedback
- Troubleshooting

#### Admin Guide (`doc/guides/admin-guide.md`)

- System overview
- User management (CRUD, roles)
- Institution management
- Questionnaire management with SurveyJS Creator
- Submission monitoring
- System configuration

### 6.2 Developer Documentation

#### Setup Guide (`doc/guides/setup-guide.md`)

- Requirements (PHP 8.4+, PostgreSQL 16+, Node 18+)
- Installation steps
- Environment configuration
- Database setup
- Running tests
- Development workflow

#### API Documentation

- Auto-generated using Laravel Scribe
- Located at `public/docs/index.html`

### 6.3 README.md

- Project overview
- Quick start installation
- Default credentials
- Development commands
- Testing commands

---

## 7. Implementation Order (8 Weeks)

### Week 1-2: Project Foundation

1. Create Laravel 12 project
2. Configure PostgreSQL database
3. Install Laravel Sanctum & Spatie Permission
4. Set up Vite with React + TypeScript
5. Configure TailwindCSS
6. Create base migrations
7. Create seeders (roles, permissions, initial data)

### Week 2-3: Authentication & Users

1. User model with relationships
2. AuthController (login, logout, lockout)
3. UserController CRUD
4. Policies and Form Requests
5. Backend tests for auth/users

### Week 3-4: Institutions

1. Institution model
2. InstitutionController CRUD
3. Policies and validation
4. Backend tests

### Week 4-5: Questionnaires

1. Questionnaire migration and model
2. QuestionnaireController (CRUD + duplicate)
3. SurveyJS JSON storage/validation
4. Backend tests

### Week 5-6: Submissions

1. Submission migration and model
2. SubmissionController CRUD
3. Status management
4. DashboardController
5. Backend tests

### Week 6-7: Frontend

1. React Router setup
2. AuthContext and API service
3. Common UI components
4. Layout components
5. Login page
6. Dashboard page
7. User/Institution management pages
8. SurveyJS integration (Creator + Form)
9. Questionnaire pages
10. Submission pages

### Week 7-8: Testing & Documentation

1. Frontend unit tests
2. Integration tests
3. Enumerator guide
4. Admin guide
5. API documentation
6. README
7. Bug fixes and polish
8. Deploy to staging

---

## 8. Dependencies

### Backend (composer.json)

```json
{
    "require": {
        "php": "^8.4",
        "laravel/framework": "^12.0",
        "laravel/sanctum": "^4.0",
        "spatie/laravel-permission": "^6.10"
    },
    "require-dev": {
        "pestphp/pest": "^3.7",
        "pestphp/pest-plugin-laravel": "^3.0"
    }
}
```

### Frontend (package.json)

```json
{
    "dependencies": {
        "@tanstack/react-query": "^5.62.0",
        "axios": "^1.7.9",
        "react": "^18.3.1",
        "react-dom": "^18.3.1",
        "react-router-dom": "^7.0.2",
        "survey-core": "^1.12.21",
        "survey-react-ui": "^1.12.21"
    },
    "devDependencies": {
        "@testing-library/jest-dom": "^6.6.3",
        "@testing-library/react": "^16.1.0",
        "jest": "^29.7.0",
        "tailwindcss": "^3.4.16",
        "typescript": "^5.7.2",
        "vite": "^6.0.3"
    }
}
```

**Note:** SurveyJS Creator packages removed - using free Library only. Admin creates forms at surveyjs.io/create-free-survey.

### Seeders Strategy

```bash
# Production (minimal data)
php artisan db:seed

# Development/Demo (includes sample data)
php artisan db:seed --class=DemoSeeder
```

**Minimal Seeder includes:**

- RoleAndPermissionSeeder (admin, enumerator, viewer roles)
- InstitutionSeeder (1 central institution)
- UserSeeder (1 admin user)

**Demo Seeder adds:**

- 3 sample institutions (1 central, 2 provinces)
- 5 sample users (admin, 2 enumerators, 2 viewers)
- 2 sample questionnaires with SurveyJS JSON
- 15 sample submissions in various statuses

---

## 9. Success Criteria

- [ ] Admin can create and manage users with roles
- [ ] Admin can create and manage institutions
- [ ] Admin can create questionnaires using JSON paste
- [ ] Enumerators can fill and save submissions
- [ ] Dashboard displays submission statistics
- [ ] Role-based authorization working
- [ ] 70% backend test coverage
- [ ] 60% frontend test coverage
- [ ] All tests passing
- [ ] Enumerator guide complete
- [ ] Admin guide complete
- [ ] API documentation generated
- [ ] README with setup instructions

---

## 10. Critical Files to Create

### Backend (Laravel)

1. **Models:** User.php, Institution.php, Questionnaire.php, Submission.php
2. **Controllers:** AuthController.php, UserController.php, InstitutionController.php, QuestionnaireController.php, SubmissionController.php, DashboardController.php
3. **Migrations:** institutions, users modifications, questionnaires, submissions
4. **Policies:** UserPolicy.php, InstitutionPolicy.php, QuestionnairePolicy.php, SubmissionPolicy.php
5. **Seeders:** RoleAndPermissionSeeder.php, InstitutionSeeder.php, UserSeeder.php, DemoSeeder.php

### Frontend (React)

1. **Core:** app.tsx, AuthContext.tsx, api.ts, types/index.ts
2. **Pages:** Login.tsx, Dashboard.tsx, UserList.tsx, InstitutionList.tsx, QuestionnaireList.tsx, SubmissionList.tsx
3. **Components:** QuestionnaireJsonEditor.tsx, SubmissionForm.tsx, DataTable.tsx, AppLayout.tsx

### Tests (Pest + Jest)

1. **Backend:** LoginTest.php, UserCrudTest.php, InstitutionCrudTest.php, QuestionnaireCrudTest.php, SubmissionCrudTest.php
2. **Frontend:** Login.test.tsx, Dashboard.test.tsx

### Documentation (Markdown)

1. **Guides:** enumerator-guide.md, admin-guide.md, setup-guide.md
2. **Root:** README.md

---

## 11. Development Environment Setup

### Prerequisites

1. **Laravel Herd** - Already installed (based on project path)
2. **PostgreSQL 16+** - Install separately (Herd doesn't include it)
3. **Node.js 18+** - For frontend build

### Initial Commands

```bash
# Create Laravel project
laravel new qi-survey-webapp

# Install PHP dependencies
composer require laravel/sanctum spatie/laravel-permission
composer require --dev pestphp/pest pestphp/pest-plugin-laravel

# Install Node dependencies
npm install

# Setup database
php artisan migrate
php artisan db:seed

# Start development
php artisan serve
npm run dev
```
