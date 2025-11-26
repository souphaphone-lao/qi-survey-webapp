# Survey Webapp Product Requirements Document (PRD)
**Version:** 2.0  
**Last Updated:** November 25, 2024  
**Status:** Draft for Review

---

## Document Control

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | - | - | Initial draft |
| 2.0 | Nov 2024 | - | Complete revision with clarifications |

---

## Table of Contents

1. [Overview](#1-overview)
2. [Goals & Non-goals](#2-goals--non-goals)
3. [Users & Roles](#3-users--roles)
4. [Functional Requirements](#4-functional-requirements)
5. [Non-Functional Requirements](#5-non-functional-requirements)
6. [Security Requirements](#6-security-requirements)
7. [Technical Architecture](#7-technical-architecture)
8. [Data Model](#8-data-model)
9. [API Specifications](#9-api-specifications)
10. [Offline/PWA Strategy](#10-offlinepwa-strategy)
11. [Notification System](#11-notification-system)
12. [Form Versioning Strategy](#12-form-versioning-strategy)
13. [Data Analysis & Export](#13-data-analysis--export)
14. [Localization & Internationalization](#14-localization--internationalization)
15. [Risk Assessment](#15-risk-assessment)
16. [Testing Strategy](#16-testing-strategy)
17. [Implementation Roadmap](#17-implementation-roadmap)
18. [Success Metrics](#18-success-metrics)
19. [Appendices](#19-appendices)

---

## 1. Overview

### 1.1 Product Name
**Survey Webapp** (working title)

### 1.2 Purpose
Build a **web-based survey platform** similar in spirit to KoBo/ODK, but specifically designed for multi-institution collaboration with the following key differentiators:

- Supports **complex matrix questions** (choices, textboxes, dropdowns) using SurveyJS
- Allows **multiple institutions at different hierarchy levels** to collaboratively fill **different parts** of the same questionnaire
- Loads **existing answers from the database** into the form for review and partial editing
- Enforces **per-question, per-institution edit and view permissions**
- Provides **live monitoring and dashboards** for submissions across institution hierarchy
- Supports **offline data collection** (PWA + IndexedDB) with automatic synchronization
- Enables **workflow management** with submission review and approval processes

### 1.3 Technology Stack

**Backend:**
- Laravel 12+ (PHP 8.4+)
- PostgreSQL 16+
- Laravel Sanctum (authentication)
- Spatie Laravel Permission (roles & permissions)

**Frontend:**
- React 18+
- Vite
- SurveyJS Library & Creator
- TailwindCSS (or similar)

**Offline:**
- Progressive Web App (PWA)
- IndexedDB via Dexie.js
- Service Workers for caching

**Deployment:**
- Linux server (Ubuntu/Debian)
- Nginx
- Supervisor (queue workers)

---

## 2. Goals & Non-goals

### 2.1 Goals

1. **Flexible Survey Engine**
   - Support complex layouts and matrix-style questions
   - Handle conditional logic and validation
   - Support multiple question types (text, numeric, date, radio, checkbox, dropdown, matrix variants)

2. **Multi-Institution Hierarchical Collaboration**
   - Institutions organized in hierarchy (central → province → district)
   - Higher-level institutions can VIEW all submissions from lower levels
   - EDITING controlled by per-question, per-institution permissions
   - Each institution can edit only assigned sections/questions

3. **Submission Re-opening and Partial Editing**
   - Institution A fills part of the form
   - Institution B later opens same submission, sees A's answers, edits only their allowed part
   - Full audit trail of who changed what

4. **Workflow Management**
   - Submission lifecycle: draft → submitted → approved/rejected
   - Review and approval by Institution Admins
   - Rejection with comments and re-submission capability
   - Hierarchical notifications up the institution tree

5. **Live Monitoring Dashboards**
   - Submission counts by questionnaire, institution, hierarchy level, time period
   - Basic answer distributions for selected questions
   - Hierarchical view (central sees all, province sees province + districts)

6. **Offline Capability for Field Work**
   - App works offline after initial login & form caching
   - Submissions stored locally (IndexedDB)
   - Automatic sync when connection restored
   - File attachments supported with size-appropriate offline handling

7. **File Attachment Support**
   - Support image uploads (JPG, PNG) and documents (PDF, DOC, DOCX)
   - Per-file size limit: 5 MB (online), 2 MB (offline)
   - Per-submission limit: 20 MB total
   - Files stored in local filesystem

### 2.2 Non-goals (Initial Versions)

- ❌ Full native mobile apps (Android/iOS) – PWA sufficient for v1
- ❌ Advanced statistical analytics – basic charts and aggregations only
- ❌ Public API for third-party integrations – internal API only initially
- ❌ Automated migration from KoBo/XLSForm – manual form recreation
- ❌ Real-time collaborative editing (Google Docs style) – async editing only
- ❌ Two-factor authentication (2FA) – standard password authentication sufficient
- ❌ SMS notifications – email + in-app only for v1
- ❌ Blockchain/immutable audit logs – standard database audit sufficient

---

## 3. Users & Roles

### 3.1 User Types

#### 3.1.1 Admin (System-wide)
**Capabilities:**
- Manages all users, institutions, roles, and permissions
- Creates and maintains questionnaires (via SurveyJS Creator)
- Configures per-question, per-institution permissions
- Views all dashboards and submissions across all institutions
- Can change any submission status
- Manages system configuration

**Typical Users:** IT administrators, national program managers

#### 3.1.2 Institution Admin
**Capabilities:**
- Manages users within their institution and child institutions
- May create or clone questionnaires (policy dependent)
- Views dashboards for their institution and all child institutions in hierarchy
- Views submissions from their institution and children
- Approves or rejects submissions: `submitted` → `approved` or `rejected`
- Cannot approve submissions from same level or parent institutions

**Typical Users:** Provincial directors, regional managers

#### 3.1.3 Enumerator / Field Staff
**Capabilities:**
- Fills questionnaires online or offline
- Creates new submissions
- Edits submissions in `draft` or `rejected` status
- Changes submission status: `draft` → `submitted`
- Views own submissions and submissions shared by their institution
- Cannot approve or reject submissions

**Typical Users:** Field workers, data collectors, surveyors

#### 3.1.4 Viewer / Analyst
**Capabilities:**
- View-only access to submissions and dashboards
- Cannot edit questionnaires or submissions
- Cannot change submission statuses
- Can export data (subject to institution access rules)

**Typical Users:** Researchers, monitoring & evaluation staff, auditors

### 3.2 Institutions & Hierarchy

#### 3.2.1 Institution Structure

**Definition:** An Institution represents an organizational unit (e.g., Ministry department, provincial office, district health center).

**Hierarchy Levels:** Institutions are organized in a tree structure:
```
Central (Health Ministry)
├── Province A
│   ├── District A1
│   ├── District A2
│   └── District A3
└── Province B
    ├── District B1
    └── District B2
```

**Key Properties:**
- Each institution has: `name`, `code`, `level` (central/province/district), `parent_institution_id`
- Each user belongs to **exactly one** institution
- Users cannot belong to multiple institutions simultaneously

#### 3.2.2 Hierarchical Access Rules

**VIEW Access (Cascading Down):**
- Central-level users can VIEW all submissions from provinces and districts
- Province-level users can VIEW submissions from their districts
- District-level users can VIEW only their own submissions

**EDIT Access (Permission-Controlled):**
- Editing controlled by `question_permissions` table only
- A central user can VIEW a district submission but may only EDIT specific questions assigned to central
- Hierarchy level does NOT automatically grant edit rights

**Approval Authority (Cascading Down):**
- Central users can approve/reject submissions from provinces and districts
- Province users can approve/reject submissions from their districts
- District users cannot approve submissions (must go to province level)

**Example Scenario:**
```
District A1 creates submission S1 for questionnaire QA
- District A1 users: Can edit questions assigned to District A1
- Province A admin: Can VIEW all of S1, can edit questions assigned to Province A, can approve/reject
- Central admin: Can VIEW all of S1, can edit questions assigned to Central, can approve/reject
```

---

## 4. Functional Requirements

### 4.1 Authentication & Authorization

**FR-1: User Authentication**
- Users authenticate with **email + password**
- Passwords must meet minimum strength requirements (8+ characters, mixed case, numbers)
- Account lockout after 5 failed login attempts (15-minute lockout)
- Session timeout after 2 hours of inactivity (configurable)

**FR-2: Session Management**
- System uses **Laravel Sanctum** for SPA authentication (cookie-based)
- Single active session per user (new login invalidates previous session)
- "Remember me" option for 30-day session extension

**FR-3: Role-Based Access Control (RBAC)**
- Roles managed using **spatie/laravel-permission**
- Global roles: `admin`, `institution_admin`, `enumerator`, `viewer`
- Access to APIs and UI routes restricted by:
  - User's role(s)
  - User's institution and hierarchy level
  - Question-level permissions (for editing)

**FR-4: Account Management**
- Admins can create, edit, disable user accounts
- Admins can assign users to institutions
- Admins can assign roles to users
- Users can change their own password
- Password reset via email (secure token-based)

**FR-5: Account Lockout & Recovery**
- Admins can unlock locked accounts
- Locked accounts auto-unlock after 15 minutes
- Failed login attempts logged for security monitoring

### 4.2 Institution Management

**FR-6: Institution CRUD**
- Admins can create, edit, deactivate institutions
- Each institution has:
  - `name` (e.g., "Vientiane Capital Health Department")
  - `code` (e.g., "VTE-HD", unique)
  - `level` (enum: central, province, district)
  - `parent_institution_id` (nullable, references parent)
  - `is_active` (boolean)

**FR-7: Hierarchy Validation**
- System validates hierarchy consistency (e.g., district must have province parent)
- Prevents circular references
- Prevents deletion of institutions with active users or submissions (soft delete only)

**FR-8: Institution Dashboard**
- Each institution has a homepage showing:
  - Active questionnaires
  - Submission statistics (total, pending approval, approved, rejected)
  - Recent activity feed
  - Notifications

### 4.3 Questionnaire Management (SurveyJS JSON)

**FR-9: Questionnaire Data Model**
- Questionnaires defined as **SurveyJS JSON** stored in database
- Each questionnaire has:
  - `code` (logical identifier, e.g., "QA")
  - `version` (integer, starts at 1)
  - `title`, `description`
  - `is_active` (boolean, only one version active per code)
  - `surveyjs_json` (full SurveyJS form definition, JSONB)
  - `created_by`, `updated_by`, `created_at`, `updated_at`

**FR-10: Questionnaire CRUD**
- Admin (and optionally institution_admin) can:
  - Create new questionnaires via SurveyJS Creator interface
  - Edit existing questionnaires (with versioning warnings)
  - Duplicate questionnaire as new version
  - Archive/deactivate questionnaires (`is_active = false`)

**FR-11: Supported Question Types**
- Text, numeric, comment, date, time, datetime
- Single choice (radio), multiple choice (checkbox)
- Dropdown, multi-select dropdown
- **Matrix (Single Choice)** – grid with radio buttons per row
- **Matrix (Dropdown)** – each cell can be dropdown, text, checkbox, etc.
- **Matrix (Dynamic)** – rows can be added/removed by user
- File upload (images and documents)

**FR-12: Advanced Features**
- Multiple pages/sections
- Panels for logical grouping
- Validation rules: required, pattern matching, min/max, custom expressions
- Conditional visibility: `visibleIf` expressions
- Conditional enabling: `enableIf` expressions
- Calculated values using SurveyJS expressions
- Default values

**FR-13: Question Naming Convention**
- All questions must have unique `name` field (identifier)
- Recommended format: `section_concept` (e.g., `demo_age`, `health_bmi`)
- Question names must not be reused for different meanings in same questionnaire

### 4.4 Per-Institution Question Permissions

**FR-14: Permission Model**
- Permissions defined in `question_permissions` table:
  - `questionnaire_id` (FK to questionnaires)
  - `question_name` (SurveyJS question name)
  - `institution_id` (FK to institutions)
  - `can_view` (boolean, default true)
  - `can_edit` (boolean, default false)
  - Unique constraint: `(questionnaire_id, question_name, institution_id)`

**FR-15: Permission Configuration UI**
- Admin UI for bulk permission assignment:
  - Select questionnaire
  - View all questions (grouped by page/section)
  - Multi-select questions
  - Assign view/edit permissions to one or more institutions
  - Preview current permission matrix (questions × institutions)

**FR-16: Permission Templates (Future)**
- Pre-defined permission sets (e.g., "Health Ministry Standard")
- Apply template to new questionnaire
- Not required for v1

**FR-17: Permission Enforcement (Backend)**
When user loads submission:
- Backend computes list of questions user can **edit**:
  ```
  editable_questions = questions WHERE:
    - user's institution has can_edit = true
    OR user is Admin
  ```
- Backend returns `editable_questions` array in API response

**FR-18: Permission Enforcement (Frontend)**
Frontend must:
- Set `readOnly: true` on questions NOT in `editable_questions`
- Optionally hide questions where `can_view = false`
- Disable save button if user has no edit permissions
- Show visual indicator (lock icon) on read-only questions

**FR-19: Permission Validation (Backend)**
When user submits changes:
- Backend validates each changed question
- Reject entire update if user attempts to edit unauthorized question
- Return 403 Forbidden with specific error message listing unauthorized fields

**FR-20: Hierarchical Permission Inheritance (Optional v2)**
- Define permissions at section/page level, cascade to child questions
- Not implemented in v1

### 4.5 Submissions (Responses)

**FR-21: Submission Data Model**
Each submission has:
- `id` (primary key)
- `questionnaire_id` (FK, specific version)
- `institution_id` (FK, creating institution)
- `status` (enum: draft, submitted, approved, rejected)
- `answers_json` (JSONB, SurveyJS answer data)
- `submitted_at` (timestamp, when status changed to submitted)
- `approved_at`, `approved_by` (timestamp, user_id)
- `rejected_at`, `rejected_by`, `rejection_comments` (text)
- `created_by`, `updated_by`, `deleted_by` (user_id)
- `created_at`, `updated_at`, `deleted_at` (timestamps, soft delete)

**FR-22: Create Submission**
- Endpoint: `POST /api/questionnaires/{id}/submissions`
- Body: `{ status: 'draft', answers_json: {...} }` (optional initial data)
- System sets:
  - `questionnaire_id` from URL
  - `institution_id` from current user's institution
  - `created_by` from current user
  - `status` defaults to `draft`

**FR-23: View Submission**
- Endpoint: `GET /api/submissions/{id}`
- Authorization:
  - User must be from same institution OR parent institution in hierarchy
  - OR have viewer role with appropriate access
- Response includes:
  ```json
  {
    "submission": {
      "id": 123,
      "questionnaire_id": 5,
      "institution_id": 10,
      "status": "draft",
      "answers_json": {...},
      ...
    },
    "questionnaire": {
      "id": 5,
      "code": "QA",
      "version": 2,
      "surveyjs_json": {...}
    },
    "editable_questions": ["demo_age", "demo_gender", ...],
    "viewable_questions": ["*"] // or specific list if restrictions exist
  }
  ```

**FR-24: Update Submission**
- Endpoint: `PUT /api/submissions/{id}`
- Body: `{ answers_json: {...}, status: 'submitted' }` (status optional)
- Authorization:
  - Only if user has edit permission on at least one question
  - Status change follows role-based rules (see FR-27)
- Validation:
  - Check each modified question against `editable_questions`
  - Reject if unauthorized field changed
  - Validate answer data against questionnaire schema
- Response: Updated submission object

**FR-25: List Submissions**
- Endpoint: `GET /api/questionnaires/{qid}/submissions`
- Query params:
  - `institution_id` (filter by institution, includes children in hierarchy)
  - `status` (filter by status)
  - `date_from`, `date_to` (date range filter)
  - `page`, `per_page` (pagination, default 50 per page, max 200)
  - `sort_by`, `sort_order` (sort by field and direction)
- Authorization:
  - Admin: sees all submissions
  - Institution Admin: sees their institution + children
  - Enumerator: sees own submissions + institution's submissions (configurable)
  - Viewer: sees based on institution hierarchy
- Response: Paginated list with metadata

**FR-26: Delete Submission (Soft Delete)**
- Endpoint: `DELETE /api/submissions/{id}`
- Authorization: Admin only, or Institution Admin if submission in `draft` status
- Soft delete: Sets `deleted_at`, `deleted_by`
- Deleted submissions:
  - Hidden from normal lists
  - Excluded from dashboards and exports
  - Recoverable by Admin via special UI (not required in v1)

### 4.6 Submission Workflow & Status Management

**FR-27: Status Transitions**

| From Status | To Status | Who Can Transition | Conditions |
|-------------|-----------|-------------------|------------|
| `draft` | `submitted` | Creator (Enumerator) | All required fields completed |
| `submitted` | `approved` | Institution Admin (parent institution) | - |
| `submitted` | `rejected` | Institution Admin (parent institution) | **Must provide rejection_comments** |
| `rejected` | `draft` | Creator (Enumerator) | After rejection, can edit |
| `rejected` | `submitted` | Creator (Enumerator) | After corrections |
| `approved` | `submitted` | Admin only | Rare, for corrections |
| Any | Any | Admin | Emergency override |

**FR-28: Status Change Validation**
- Backend enforces transition rules
- Returns 403 with error if unauthorized transition attempted
- Logs all status changes in audit trail

**FR-29: Rejection Comments**
- When changing status to `rejected`, `rejection_comments` field is **required**
- Comments stored in submission record
- Visible to submission creator and institution hierarchy
- Comments displayed prominently when creator opens rejected submission

**FR-30: Resubmission After Rejection**
- Rejected submissions can be edited by creator
- Creator fixes issues based on rejection comments
- Creator changes status back to `submitted`
- Re-enters review queue

**FR-31: Approval Finalization**
- Approved submissions become read-only for enumerators
- Institution Admins and Admins can still edit if needed (emergency corrections)
- Approved timestamp and approver recorded

### 4.7 File Upload & Attachment

**FR-32: File Upload Configuration**
- Allowed types: `.jpg`, `.jpeg`, `.png`, `.pdf`, `.doc`, `.docx`
- MIME type validation on upload
- Maximum size per file:
  - **Online:** 5 MB
  - **Offline:** 2 MB
- Maximum total size per submission: 20 MB
- Virus scanning on upload (ClamAV or similar, optional v2)

**FR-33: File Storage**
- Files stored in local filesystem: `storage/app/uploads/{submission_id}/{filename}`
- Filename sanitization (remove special characters, prevent path traversal)
- Original filename preserved in metadata

**FR-34: File Data Model**
- Files referenced in `answers_json` under the question name:
  ```json
  {
    "photo_household": [
      {
        "name": "house_front.jpg",
        "type": "image/jpeg",
        "size": 245678,
        "path": "uploads/123/house_front_abc123.jpg"
      }
    ]
  }
  ```
- No separate files table in v1 (files are part of answer data)

**FR-35: File Upload API**
- Endpoint: `POST /api/submissions/{id}/upload`
- Body: multipart/form-data with `file` and `question_name` fields
- Returns: File metadata object to store in `answers_json`
- Authorization: User must have edit permission on the question

**FR-36: File Download API**
- Endpoint: `GET /api/submissions/{id}/files/{filename}`
- Authorization: User must have view permission on submission
- Returns: File stream with appropriate content-type
- Files always viewable if user can view submission (no per-question file restrictions)

**FR-37: File Deletion**
- When user removes file from answer (via SurveyJS UI), frontend calls:
  - `DELETE /api/submissions/{id}/files/{filename}`
- Authorization: User must have edit permission on the question
- File marked for deletion, actual deletion occurs via scheduled job (garbage collection)

**FR-38: Offline File Handling**
- Users can attach files while offline (max 2 MB per file)
- Files stored in IndexedDB temporarily
- When sync occurs:
  - Files uploaded first via upload API
  - Then submission answers updated with file metadata
- If file upload fails, submission sync fails and is retried
- User notified if file too large for offline (show error, suggest online upload)

**FR-39: File Cleanup**
- Daily scheduled job deletes orphaned files (files not referenced in any submission)
- Deleted submissions' files kept for 30 days before permanent deletion

### 4.8 Multi-Institution Workflow Example

**Scenario:** Cross-institutional household survey

**Setup:**
- Questionnaire: `HH-Survey` (Household Survey)
- Questions assigned as:
  - **District** questions: household location, demographics (10 questions)
  - **Province** questions: health indicators, water/sanitation (15 questions)
  - **Central** questions: economic data, food security (20 questions)

**Workflow:**
1. **District A1 Enumerator** creates submission S1:
   - Fills district questions (location, demographics)
   - Changes status: `draft` → `submitted`
   - Notification sent to Province A Admin

2. **Province A Admin** reviews S1:
   - Opens S1, sees district answers (read-only)
   - Notices incomplete data, rejects with comments: "Please verify household size"
   - Status: `submitted` → `rejected`
   - Notification sent to District A1 Enumerator

3. **District A1 Enumerator** corrects S1:
   - Opens S1, reads rejection comments
   - Fixes household size field
   - Changes status: `rejected` → `submitted`

4. **Province A Admin** approves and fills their section:
   - Opens S1, approves district section
   - Status: `submitted` → `approved` (district portion)
   - Fills province questions (health indicators)
   - Saves submission (still in `approved` status)
   - Notification sent to Central Admin

5. **Central Admin** completes S1:
   - Opens S1, sees district and province answers (read-only)
   - Fills central questions (economic data)
   - Final approval (entire submission complete)
   - Submission now fully approved and locked

**Key Points:**
- Each institution edits only their questions
- Higher levels can review lower levels' work
- Workflow ensures data quality through review process
- Full audit trail maintained

---

## 5. Non-Functional Requirements

### 5.1 Performance

**NFR-1: Page Load Times**
- Dashboard loads in < 2 seconds on 4G connection
- Submission form loads in < 3 seconds on 4G connection
- Submission list (50 items) loads in < 1 second

**NFR-2: API Response Times**
- Simple GET requests (single submission): < 200ms (p95)
- List endpoints with filters: < 500ms (p95)
- Save submission: < 1 second (p95)
- File upload: < 2 seconds per MB (p95)

**NFR-3: Concurrent Users**
- System supports 100 concurrent users without degradation
- Target capacity: 500 concurrent users (future scaling)

**NFR-4: Database Performance**
- Indexes on frequently queried columns (institution_id, status, created_at)
- JSONB indexes on common answer fields for dashboards
- Query optimization for hierarchical institution queries

### 5.2 Scalability

**NFR-5: Data Volume**
- Support 100,000+ submissions per questionnaire
- Support 50+ active questionnaires
- Support 1,000+ institutions
- Support 5,000+ user accounts

**NFR-6: File Storage**
- Support 1 TB total file storage (initial)
- Scalable to cloud storage (S3) in future if needed

**NFR-7: Horizontal Scaling**
- Application servers stateless (can add more servers)
- Session data in Redis/database (not in-memory)
- Queue workers scalable (add more workers as needed)

### 5.3 Availability & Reliability

**NFR-8: Uptime**
- Target: 99.5% uptime (excludes scheduled maintenance)
- Scheduled maintenance windows: Weekends, communicated 48 hours in advance
- Max unplanned downtime: 4 hours per month

**NFR-9: Data Backup**
- Automated daily database backups
- Backup retention: 30 days
- File system backup: Weekly full, daily incremental
- Backup restoration tested quarterly

**NFR-10: Disaster Recovery**
- Recovery Time Objective (RTO): 24 hours
- Recovery Point Objective (RPO): 24 hours (max 1 day data loss)
- Documented recovery procedures

### 5.4 Compatibility

**NFR-11: Browser Support**
- **Desktop:** Chrome 90+, Firefox 88+, Safari 14+, Edge 90+
- **Mobile:** Chrome Android 90+, Safari iOS 14+
- **Not supported:** Internet Explorer (any version)

**NFR-12: Mobile Device Support**
- Responsive design for tablets (landscape and portrait)
- Touch-optimized UI for smartphones
- Minimum screen width: 320px (iPhone SE)
- PWA installable on Android and iOS

**NFR-13: Network Conditions**
- App functional on 3G connection (though slower)
- Optimized for 4G/LTE
- Offline mode works with zero connectivity

### 5.5 Usability

**NFR-14: User Interface**
- Clean, modern design (reference: Tailwind UI components)
- Consistent navigation across all pages
- Loading indicators for all async operations
- Error messages clear and actionable

**NFR-15: Accessibility** (v2 target)
- WCAG 2.1 Level AA compliance (future goal)
- Keyboard navigation support
- Screen reader compatibility (basic)

**NFR-16: Language Support**
- UI supports Lao and English (v1)
- Language switcher in user profile
- Questionnaire content can be multilingual (SurveyJS feature)

### 5.6 Maintainability

**NFR-17: Code Quality**
- Follow Laravel best practices and conventions
- PSR-12 coding standard for PHP
- ESLint + Prettier for JavaScript/React
- Code review required before merge

**NFR-18: Documentation**
- API documentation (Swagger/OpenAPI or similar)
- Database schema documentation
- Deployment and configuration guide
- User manuals (Admin, Enumerator, Institution Admin)

**NFR-19: Logging**
- Application logs (Laravel log)
- Web server logs (Nginx access and error logs)
- Database slow query log
- Log retention: 90 days

**NFR-20: Monitoring**
- Server resource monitoring (CPU, memory, disk)
- Application performance monitoring (optional: New Relic, Sentry)
- Uptime monitoring (ping checks)
- Alert on critical errors

---

## 6. Security Requirements

### 6.1 Authentication Security

**SEC-1: Password Policy**
- Minimum 8 characters
- Must contain: uppercase, lowercase, number
- Cannot be common passwords (dictionary check)
- Password expiration: 90 days (configurable, optional)
- Password history: Cannot reuse last 3 passwords

**SEC-2: Account Lockout**
- Lock account after 5 consecutive failed login attempts
- Lockout duration: 15 minutes
- Failed attempts reset after successful login
- Admin can manually unlock accounts

**SEC-3: Session Security**
- Sessions expire after 2 hours of inactivity
- Session token regenerated on login
- Logout invalidates session immediately
- Single session per user (new login terminates old session)

**SEC-4: Password Reset**
- Secure token-based reset (expires in 1 hour)
- Token sent to registered email only
- Token single-use only
- Rate limiting: Max 3 reset requests per hour per email

### 6.2 Authorization Security

**SEC-5: Role-Based Access Control**
- All endpoints require authentication (except login, password reset)
- Middleware validates user role before controller execution
- Permission checks at both route and controller level
- Deny by default (whitelist approach)

**SEC-6: Hierarchical Access Enforcement**
- Backend validates institution hierarchy on every request
- User cannot access data from parent or sibling institutions (unless viewer role)
- Vertical access only (can access own and child institutions)

**SEC-7: Question-Level Permission Enforcement**
- Backend validates edit permissions on every submission update
- Frontend restrictions are UI hints only, not security boundaries
- Audit log records permission violations (attempted unauthorized edits)

### 6.3 Data Protection

**SEC-8: Encryption in Transit**
- HTTPS required for all traffic (TLS 1.2 minimum)
- HTTP requests redirect to HTTPS
- HSTS header enabled (max-age 1 year)

**SEC-9: Encryption at Rest** (Optional v2)
- Database encryption (PostgreSQL TDE or similar)
- File storage encryption (filesystem level)
- Not required for v1 if physical server security adequate

**SEC-10: Sensitive Data Handling**
- No plaintext passwords in database (bcrypt hashing)
- No credit card or financial data stored
- Personal health information (PHI) encrypted in `answers_json` (future, if required)

### 6.4 Input Validation & Injection Prevention

**SEC-11: SQL Injection Prevention**
- Use Laravel Eloquent ORM (parameterized queries)
- Never use raw SQL with user input
- Input sanitization on all parameters

**SEC-12: XSS Prevention**
- Output encoding by default (Blade/React escapes)
- Content Security Policy (CSP) headers
- No `eval()` or `dangerouslySetInnerHTML` (except SurveyJS library)

**SEC-13: CSRF Protection**
- Laravel CSRF tokens on all POST/PUT/DELETE requests
- SameSite cookie attribute set to 'lax' or 'strict'

**SEC-14: File Upload Security**
- MIME type validation (not just extension)
- File size limits enforced server-side
- Filename sanitization (remove special chars, path traversal attempts)
- Files stored outside web root
- Served via controlled download endpoint (not direct links)
- Virus scanning (optional v2, ClamAV integration)

### 6.5 API Security

**SEC-15: Rate Limiting**
- Login endpoint: 5 attempts per minute per IP
- API endpoints: 60 requests per minute per user
- File upload: 10 uploads per minute per user
- Exceeded limit returns 429 Too Many Requests

**SEC-16: API Token Security** (if API tokens used)
- Tokens stored hashed in database
- Token expiration: 90 days (configurable)
- Revocation capability

**SEC-17: CORS Configuration**
- CORS restricted to known origins only
- No wildcard (`*`) allowed in production

### 6.6 Audit & Compliance

**SEC-18: Audit Logging**
- Log security-relevant events:
  - Login success/failure (with IP address)
  - Account lockouts
  - Password changes
  - Permission changes
  - Submission status changes
  - File uploads/downloads
  - User creation/deletion
- Logs immutable (append-only)
- Log retention: 1 year minimum

**SEC-19: Data Retention & Deletion**
- Soft delete for submissions (recoverable for 30 days)
- Hard delete after 30 days (if policy requires)
- User can request data deletion (GDPR-style, future)
- Admin can export user's data (GDPR-style, future)

**SEC-20: Vulnerability Management**
- Regular dependency updates (Laravel, npm packages)
- Security patches applied within 7 days of release
- Annual security audit by external party (optional, recommended)

---

## 7. Technical Architecture

### 7.1 System Architecture Diagram

```
┌─────────────────────────────────────────────────────────┐
│                      Client Layer                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │   Desktop    │  │    Tablet    │  │   Mobile     │  │
│  │   Browser    │  │    Browser   │  │   Browser    │  │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  │
│         │                  │                  │          │
│         └──────────────────┴──────────────────┘          │
│                            │                             │
│                            │ HTTPS                       │
│                            ▼                             │
└────────────────────────────────────────────────────────┬┘
                             │                            │
┌────────────────────────────┴───────────────────────────▼┐
│                   Nginx (Reverse Proxy)                  │
└────────────────────────────┬────────────────────────────┘
                             │
         ┌───────────────────┴───────────────────┐
         │                                       │
         ▼                                       ▼
┌─────────────────┐                    ┌─────────────────┐
│  Laravel API    │                    │  React SPA      │
│  (Backend)      │◄───────────────────│  (Frontend)     │
│                 │                    │  + SurveyJS     │
│  - Controllers  │                    │  + IndexedDB    │
│  - Services     │                    │  - Components   │
│  - Models       │                    │  - Hooks        │
│  - Middleware   │                    │  - PWA Workers  │
└────────┬────────┘                    └─────────────────┘
         │
         │
         ▼
┌──────────────────────────────────────┐
│        PostgreSQL Database            │
│  - Users, Institutions, Roles        │
│  - Questionnaires (JSONB)            │
│  - Submissions (JSONB)               │
│  - Question Permissions              │
│  - Audit Logs                        │
└──────────────────────────────────────┘
         │
         │
         ▼
┌──────────────────────────────────────┐
│      Local File Storage               │
│  /storage/app/uploads/               │
│  - Uploaded images and documents     │
└──────────────────────────────────────┘
         │
         │
         ▼
┌──────────────────────────────────────┐
│      Queue System (Redis)             │
│  - Email notifications               │
│  - File processing                   │
│  - Data export jobs                  │
└──────────────────────────────────────┘
```

### 7.2 Application Layers

#### 7.2.1 Frontend Layer (React SPA)
**Responsibilities:**
- User interface rendering
- Form presentation (SurveyJS)
- Client-side validation
- Offline data storage (IndexedDB via Dexie.js)
- Service Worker for PWA
- API consumption
- State management (React Context or Redux Toolkit)

**Key Libraries:**
- React 18+
- React Router (SPA routing)
- SurveyJS Library (form rendering)
- SurveyJS Creator (admin form builder)
- Dexie.js (IndexedDB wrapper)
- Axios (HTTP client)
- TailwindCSS (styling)
- React Query or SWR (data fetching/caching)

#### 7.2.2 Backend Layer (Laravel API)
**Responsibilities:**
- Business logic
- Authentication & authorization
- Data validation
- Database operations (CRUD)
- File upload handling
- Queue job dispatching
- Email sending
- API endpoints (RESTful)

**Key Packages:**
- Laravel 12+
- Laravel Sanctum (auth)
- Spatie Laravel Permission (RBAC)
- Laravel Queue (background jobs)
- Laravel Mail (notifications)
- Maatwebsite/Excel (data export)

#### 7.2.3 Database Layer (PostgreSQL)
**Responsibilities:**
- Persistent data storage
- JSONB storage for flexible questionnaire and answer data
- Relational integrity (foreign keys)
- Indexes for performance
- Full-text search (optional, for submission search)

#### 7.2.4 Storage Layer
**Responsibilities:**
- File uploads (images, documents)
- Local filesystem in v1
- Future: Cloud storage (S3/MinIO)

#### 7.2.5 Queue & Workers
**Responsibilities:**
- Asynchronous tasks:
  - Email notifications (submission status changes, rejections)
  - In-app notifications
  - File processing (thumbnail generation, virus scan)
  - Data export generation (CSV/Excel)
  - Database cleanup (orphaned files)

**Implementation:**
- Laravel Queue with Redis driver
- Supervisor for worker process management
- Multiple queues (high, default, low priority)

### 7.3 Security Architecture

```
┌──────────────────────────────────────────────────┐
│                 Firewall                         │
│  - Allow: 80 (HTTP redirect), 443 (HTTPS)       │
│  - Deny: All other ports from public             │
└──────────────────┬───────────────────────────────┘
                   │
                   ▼
         ┌─────────────────┐
         │  Nginx (HTTPS)  │
         │  - TLS 1.2+     │
         │  - Rate limiting│
         └────────┬────────┘
                  │
                  ▼
         ┌─────────────────┐
         │  Laravel App    │
         │  - Sanctum Auth │
         │  - RBAC         │
         │  - CSRF         │
         │  - Input Valid. │
         └────────┬────────┘
                  │
                  ▼
         ┌─────────────────┐
         │  PostgreSQL     │
         │  - Listen: 5432 │
         │  - Local only   │
         └─────────────────┘
```

**Key Security Measures:**
- Application not directly exposed (behind Nginx reverse proxy)
- Database not accessible from internet (local/internal network only)
- Files served via application endpoint (not direct web access)
- All secrets in environment variables (not committed to git)

### 7.4 Deployment Architecture (Production)

**Server Specifications (Minimum):**
- CPU: 4 cores
- RAM: 8 GB
- Disk: 100 GB SSD (+ expandable for file storage)
- OS: Ubuntu 22.04 LTS

**Software Stack:**
- Nginx 1.18+
- PHP 8.4+ with OPcache
- PostgreSQL 16+
- Redis 6+
- Node.js 18+ (for frontend build)
- Supervisor (process manager)

**Directory Structure:**
```
/var/www/survey-webapp/
├── backend/           # Laravel application
│   ├── app/
│   ├── config/
│   ├── database/
│   ├── public/        # Entry point (index.php)
│   ├── storage/
│   │   ├── app/uploads/  # File uploads
│   │   └── logs/
│   └── ...
├── frontend/          # React build (served by Nginx)
│   └── dist/
│       ├── index.html
│       ├── assets/
│       └── ...
└── .env               # Environment configuration
```

### 7.5 CI/CD Pipeline (Optional v2)

**Recommended Setup:**
1. Git repository (GitHub/GitLab)
2. Automated tests on commit (PHPUnit, Pest for backend; Jest for frontend)
3. Deploy to staging on merge to `develop` branch
4. Deploy to production on merge to `main` branch (manual approval)
5. Rollback capability (keep last 3 releases)

---

## 8. Data Model

### 8.1 Entity Relationship Diagram (ERD)

```
┌─────────────────┐         ┌──────────────────┐
│     users       │────────▶│  institutions    │
├─────────────────┤         ├──────────────────┤
│ id (PK)         │         │ id (PK)          │
│ name            │         │ name             │
│ email (unique)  │         │ code (unique)    │
│ password        │         │ level (enum)     │
│ institution_id  │         │ parent_inst_id   │
│ created_at      │         │ is_active        │
│ ...             │         │ created_at       │
└─────────────────┘         └──────────────────┘
        │                            │
        │                            │
        │                            │
        ▼                            ▼
┌─────────────────┐         ┌──────────────────┐
│ model_has_roles │         │  submissions     │
├─────────────────┤         ├──────────────────┤
│ role_id         │         │ id (PK)          │
│ model_type      │         │ quest_id (FK)    │
│ model_id        │         │ institution_id   │
└─────────────────┘         │ status (enum)    │
        │                   │ answers_json     │
        │                   │ submitted_at     │
        ▼                   │ approved_at      │
┌─────────────────┐         │ rejected_at      │
│     roles       │         │ rejection_comm.. │
├─────────────────┤         │ created_by       │
│ id (PK)         │         │ updated_by       │
│ name            │         │ deleted_by       │
│ guard_name      │         │ created_at       │
└─────────────────┘         │ updated_at       │
                            │ deleted_at       │
                            └──────────────────┘
                                     │
                                     │
                                     ▼
┌────────────────────┐      ┌──────────────────┐
│  questionnaires    │◀─────│ question_perms   │
├────────────────────┤      ├──────────────────┤
│ id (PK)            │      │ id (PK)          │
│ code               │      │ quest_id (FK)    │
│ version            │      │ question_name    │
│ title              │      │ institution_id   │
│ description        │      │ can_view         │
│ surveyjs_json      │      │ can_edit         │
│ is_active          │      │ created_at       │
│ created_by         │      └──────────────────┘
│ updated_by         │
│ created_at         │
│ updated_at         │
└────────────────────┘

┌────────────────────┐
│  notifications     │
├────────────────────┤
│ id (PK)            │
│ user_id (FK)       │
│ type               │
│ data (JSON)        │
│ read_at            │
│ created_at         │
└────────────────────┘
```

### 8.2 Table Definitions

#### 8.2.1 `users`
```sql
CREATE TABLE users (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    email_verified_at TIMESTAMP,
    password VARCHAR(255) NOT NULL,
    institution_id BIGINT NOT NULL REFERENCES institutions(id),
    is_active BOOLEAN DEFAULT TRUE,
    failed_login_attempts INT DEFAULT 0,
    locked_until TIMESTAMP,
    last_login_at TIMESTAMP,
    created_by BIGINT REFERENCES users(id),
    updated_by BIGINT REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    remember_token VARCHAR(100)
);

CREATE INDEX idx_users_institution ON users(institution_id);
CREATE INDEX idx_users_email ON users(email);
```

#### 8.2.2 `institutions`
```sql
CREATE TABLE institutions (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,
    level VARCHAR(20) NOT NULL CHECK (level IN ('central', 'province', 'district')),
    parent_institution_id BIGINT REFERENCES institutions(id),
    is_active BOOLEAN DEFAULT TRUE,
    created_by BIGINT REFERENCES users(id),
    updated_by BIGINT REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_institutions_parent ON institutions(parent_institution_id);
CREATE INDEX idx_institutions_level ON institutions(level);
CREATE INDEX idx_institutions_code ON institutions(code);
```

#### 8.2.3 `questionnaires`
```sql
CREATE TABLE questionnaires (
    id BIGSERIAL PRIMARY KEY,
    code VARCHAR(50) NOT NULL,
    version INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    surveyjs_json JSONB NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_by BIGINT REFERENCES users(id),
    updated_by BIGINT REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(code, version)
);

CREATE INDEX idx_questionnaires_code ON questionnaires(code);
CREATE INDEX idx_questionnaires_active ON questionnaires(is_active);
CREATE INDEX idx_questionnaires_code_version ON questionnaires(code, version);
```

#### 8.2.4 `question_permissions`
```sql
CREATE TABLE question_permissions (
    id BIGSERIAL PRIMARY KEY,
    questionnaire_id BIGINT NOT NULL REFERENCES questionnaires(id) ON DELETE CASCADE,
    question_name VARCHAR(255) NOT NULL,
    institution_id BIGINT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    can_view BOOLEAN DEFAULT TRUE,
    can_edit BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(questionnaire_id, question_name, institution_id)
);

CREATE INDEX idx_qperms_quest ON question_permissions(questionnaire_id);
CREATE INDEX idx_qperms_inst ON question_permissions(institution_id);
CREATE INDEX idx_qperms_quest_inst ON question_permissions(questionnaire_id, institution_id);
```

#### 8.2.5 `submissions`
```sql
CREATE TABLE submissions (
    id BIGSERIAL PRIMARY KEY,
    questionnaire_id BIGINT NOT NULL REFERENCES questionnaires(id),
    institution_id BIGINT NOT NULL REFERENCES institutions(id),
    status VARCHAR(20) NOT NULL DEFAULT 'draft' 
        CHECK (status IN ('draft', 'submitted', 'approved', 'rejected')),
    answers_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    
    submitted_at TIMESTAMP,
    approved_at TIMESTAMP,
    approved_by BIGINT REFERENCES users(id),
    rejected_at TIMESTAMP,
    rejected_by BIGINT REFERENCES users(id),
    rejection_comments TEXT,
    
    created_by BIGINT NOT NULL REFERENCES users(id),
    updated_by BIGINT REFERENCES users(id),
    deleted_by BIGINT REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    deleted_at TIMESTAMP
);

CREATE INDEX idx_submissions_quest ON submissions(questionnaire_id);
CREATE INDEX idx_submissions_inst ON submissions(institution_id);
CREATE INDEX idx_submissions_status ON submissions(status);
CREATE INDEX idx_submissions_created_by ON submissions(created_by);
CREATE INDEX idx_submissions_created_at ON submissions(created_at);
CREATE INDEX idx_submissions_deleted_at ON submissions(deleted_at);

-- JSONB indexes for common queries (add as needed)
CREATE INDEX idx_submissions_answers_gin ON submissions USING GIN (answers_json);
```

#### 8.2.6 `notifications` (Laravel default)
```sql
CREATE TABLE notifications (
    id UUID PRIMARY KEY,
    type VARCHAR(255) NOT NULL,
    notifiable_type VARCHAR(255) NOT NULL,
    notifiable_id BIGINT NOT NULL,
    data JSONB NOT NULL,
    read_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_notifications_notifiable ON notifications(notifiable_type, notifiable_id);
CREATE INDEX idx_notifications_read_at ON notifications(read_at);
```

#### 8.2.7 Spatie Permission Tables
(Generated by `spatie/laravel-permission` package)
- `roles`
- `permissions`
- `model_has_roles`
- `model_has_permissions`
- `role_has_permissions`

---

## 9. API Specifications

### 9.1 API Design Principles

- **RESTful design** where appropriate
- **JSON request/response** bodies
- **Consistent error format**
- **Pagination** on list endpoints (cursor-based, 50 items default, 200 max)
- **Filtering, sorting, searching** via query parameters
- **Versioning** via URL prefix (e.g., `/api/v1/...`) – v1 assumed initially

### 9.2 Authentication & Headers

**Authentication:**
- Cookie-based (Laravel Sanctum SPA mode)
- All requests (except login/logout) require authenticated session
- CSRF token in header: `X-XSRF-TOKEN` (automatically handled by Laravel)

**Common Request Headers:**
```
Content-Type: application/json
Accept: application/json
X-XSRF-TOKEN: <csrf-token>
```

**Common Response Format:**
```json
{
  "data": { ... },
  "meta": { ... },
  "links": { ... }
}
```

**Error Response Format:**
```json
{
  "message": "Validation failed",
  "errors": {
    "field_name": ["Error message 1", "Error message 2"]
  }
}
```

### 9.3 Endpoints Overview

| Method | Endpoint | Description | Auth | Role |
|--------|----------|-------------|------|------|
| POST | `/api/login` | User login | No | - |
| POST | `/api/logout` | User logout | Yes | All |
| GET | `/api/user` | Get current user | Yes | All |
| GET | `/api/institutions` | List institutions | Yes | All |
| GET | `/api/institutions/{id}` | Get institution | Yes | All |
| POST | `/api/institutions` | Create institution | Yes | Admin |
| PUT | `/api/institutions/{id}` | Update institution | Yes | Admin |
| DELETE | `/api/institutions/{id}` | Soft delete institution | Yes | Admin |
| GET | `/api/users` | List users | Yes | Admin, Inst Admin |
| POST | `/api/users` | Create user | Yes | Admin |
| PUT | `/api/users/{id}` | Update user | Yes | Admin |
| DELETE | `/api/users/{id}` | Soft delete user | Yes | Admin |
| GET | `/api/questionnaires` | List questionnaires | Yes | All |
| GET | `/api/questionnaires/{id}` | Get questionnaire | Yes | All |
| POST | `/api/questionnaires` | Create questionnaire | Yes | Admin |
| PUT | `/api/questionnaires/{id}` | Update questionnaire | Yes | Admin |
| POST | `/api/questionnaires/{id}/duplicate` | Duplicate as new version | Yes | Admin |
| DELETE | `/api/questionnaires/{id}` | Deactivate questionnaire | Yes | Admin |
| GET | `/api/questionnaires/{id}/permissions` | Get permissions matrix | Yes | Admin |
| POST | `/api/questionnaires/{id}/permissions` | Bulk set permissions | Yes | Admin |
| GET | `/api/questionnaires/{qid}/submissions` | List submissions | Yes | All (filtered) |
| POST | `/api/questionnaires/{qid}/submissions` | Create submission | Yes | Enum+ |
| GET | `/api/submissions/{id}` | Get submission | Yes | All (filtered) |
| PUT | `/api/submissions/{id}` | Update submission | Yes | Creator, Admins |
| DELETE | `/api/submissions/{id}` | Soft delete submission | Yes | Admin, Inst Admin |
| PUT | `/api/submissions/{id}/status` | Change status | Yes | Role-dependent |
| POST | `/api/submissions/{id}/upload` | Upload file | Yes | Edit permission |
| GET | `/api/submissions/{id}/files/{file}` | Download file | Yes | View permission |
| DELETE | `/api/submissions/{id}/files/{file}` | Delete file | Yes | Edit permission |
| GET | `/api/dashboard/stats` | Dashboard statistics | Yes | All (filtered) |
| GET | `/api/exports/{code}` | Export questionnaire data | Yes | Admin, Inst Admin |
| GET | `/api/notifications` | List user notifications | Yes | All |
| PUT | `/api/notifications/{id}/read` | Mark notification read | Yes | All |

### 9.4 Key Endpoint Details

#### 9.4.1 Authentication

**POST `/api/login`**
```
Request:
{
  "email": "user@example.com",
  "password": "password123"
}

Response 200:
{
  "user": {
    "id": 1,
    "name": "John Doe",
    "email": "user@example.com",
    "institution": {
      "id": 5,
      "name": "Province A Health Office",
      "code": "PA-HO",
      "level": "province"
    },
    "roles": ["institution_admin"]
  }
}

Response 401:
{
  "message": "Invalid credentials"
}

Response 429:
{
  "message": "Too many login attempts. Please try again in 15 minutes."
}
```

#### 9.4.2 Submissions

**GET `/api/submissions/{id}`**
```
Response 200:
{
  "data": {
    "submission": {
      "id": 123,
      "questionnaire_id": 5,
      "institution_id": 10,
      "status": "draft",
      "answers_json": { ... },
      "submitted_at": null,
      "created_by": 42,
      "created_at": "2024-11-01T10:00:00Z",
      "updated_at": "2024-11-02T14:30:00Z"
    },
    "questionnaire": {
      "id": 5,
      "code": "QA",
      "version": 2,
      "title": "Household Survey",
      "surveyjs_json": { ... }
    },
    "editable_questions": [
      "demo_age",
      "demo_gender",
      "health_bmi"
    ],
    "permissions": {
      "can_edit": true,
      "can_change_status": true,
      "can_delete": false
    }
  }
}

Response 403:
{
  "message": "You do not have permission to view this submission"
}

Response 404:
{
  "message": "Submission not found"
}
```

**PUT `/api/submissions/{id}`**
```
Request:
{
  "answers_json": {
    "demo_age": 35,
    "demo_gender": "female",
    "health_bmi": 22.5
  },
  "status": "submitted"  // optional
}

Response 200:
{
  "data": {
    "id": 123,
    "status": "submitted",
    "updated_at": "2024-11-03T09:15:00Z"
  }
}

Response 403:
{
  "message": "You do not have permission to edit field: health_blood_pressure",
  "errors": {
    "unauthorized_fields": ["health_blood_pressure"]
  }
}

Response 422:
{
  "message": "Validation failed",
  "errors": {
    "demo_age": ["Age must be between 0 and 120"]
  }
}
```

**GET `/api/questionnaires/{qid}/submissions`**
```
Query params:
- institution_id (filter by institution, optional)
- status (filter by status, optional)
- date_from, date_to (ISO 8601 dates, optional)
- page (default 1)
- per_page (default 50, max 200)
- sort_by (default: created_at)
- sort_order (asc|desc, default: desc)

Response 200:
{
  "data": [
    {
      "id": 123,
      "questionnaire_id": 5,
      "institution": {
        "id": 10,
        "name": "District A1",
        "code": "DA1"
      },
      "status": "submitted",
      "created_by": {
        "id": 42,
        "name": "Jane Smith"
      },
      "created_at": "2024-11-01T10:00:00Z",
      "updated_at": "2024-11-02T14:30:00Z"
    },
    ...
  ],
  "meta": {
    "current_page": 1,
    "per_page": 50,
    "total": 234,
    "last_page": 5
  },
  "links": {
    "first": "/api/questionnaires/5/submissions?page=1",
    "last": "/api/questionnaires/5/submissions?page=5",
    "prev": null,
    "next": "/api/questionnaires/5/submissions?page=2"
  }
}
```

#### 9.4.3 File Upload

**POST `/api/submissions/{id}/upload`**
```
Request (multipart/form-data):
- file: (binary)
- question_name: "photo_household"

Response 200:
{
  "data": {
    "name": "house_front.jpg",
    "original_name": "IMG_20241101_143022.jpg",
    "type": "image/jpeg",
    "size": 2456789,
    "path": "uploads/123/house_front_a1b2c3.jpg",
    "url": "/api/submissions/123/files/house_front_a1b2c3.jpg"
  }
}

Response 413:
{
  "message": "File size exceeds limit (5MB)"
}

Response 422:
{
  "message": "Invalid file type. Allowed: jpg, jpeg, png, pdf, doc, docx"
}
```

#### 9.4.4 Dashboard

**GET `/api/dashboard/stats`**
```
Query params:
- questionnaire_code (optional, default: all)
- date_from, date_to (optional)

Response 200:
{
  "data": {
    "summary": {
      "total_submissions": 1234,
      "draft": 45,
      "submitted": 234,
      "approved": 890,
      "rejected": 65
    },
    "by_institution": [
      {
        "institution": {
          "id": 5,
          "name": "Province A",
          "level": "province"
        },
        "total": 456,
        "draft": 12,
        "submitted": 89,
        "approved": 334,
        "rejected": 21
      },
      ...
    ],
    "recent_activity": [
      {
        "submission_id": 123,
        "action": "approved",
        "user": "John Admin",
        "timestamp": "2024-11-03T10:30:00Z"
      },
      ...
    ]
  }
}
```

### 9.5 Rate Limiting

| Endpoint | Limit |
|----------|-------|
| `/api/login` | 5 per minute per IP |
| `/api/*` (general) | 60 per minute per user |
| `/api/submissions/{id}/upload` | 10 per minute per user |
| `/api/exports/*` | 5 per hour per user |

Exceeded limits return HTTP 429 with `Retry-After` header.

---

## 10. Offline/PWA Strategy

### 10.1 PWA Requirements

**PWA-1: Service Worker**
- Register service worker on app load
- Cache strategy:
  - **App shell:** Cache (HTML, CSS, JS bundles)
  - **API responses:** Network-first with fallback to cache
  - **Static assets:** Cache-first
- Update notification when new version available

**PWA-2: Web App Manifest**
- App name, icons (multiple sizes), theme color
- `display: standalone` (hide browser UI)
- `start_url` pointing to app root
- Offline indicator in manifest

**PWA-3: Installability**
- "Add to Home Screen" prompt on mobile (iOS, Android)
- Desktop install support (Chrome, Edge)

### 10.2 Offline Data Storage

**PWA-4: IndexedDB Schema (Dexie.js)**
```javascript
const db = new Dexie('SurveyAppDB');
db.version(1).stores({
  questionnaires: 'id, code, version',
  submissions: 'id, questionnaire_id, status, synced',
  files: 'id, submission_id, question_name, synced',
  syncQueue: '++id, type, timestamp'
});
```

**PWA-5: Offline Capabilities**
When offline, users can:
- View cached questionnaires
- Create new submissions (stored locally)
- Edit existing submissions (if previously loaded)
- Attach files (max 2 MB per file)
- View previously loaded data

When offline, users CANNOT:
- Load new questionnaires not in cache
- Load submissions not previously opened
- Upload files > 2 MB
- See real-time dashboard updates

### 10.3 Online/Offline Detection

**PWA-6: Connection Status**
- Monitor `navigator.onLine` API
- Visual indicator in UI:
  - Green: "Online"
  - Orange: "Offline – changes will sync when reconnected"
- Notification when connection restored: "You're back online. Syncing data..."

### 10.4 Synchronization Strategy

**PWA-7: Sync Trigger Events**
- Manual sync button (user-initiated)
- Automatic sync when connection restored
- Periodic background sync (if browser supports Background Sync API)

**PWA-8: Sync Process (Per-Question Merge)**

1. **Fetch latest submission from server**
   ```
   GET /api/submissions/{id}
   ```

2. **Compare local and server versions**
   - Use `updated_at` timestamp
   - If server version newer:
     - Extract questions the user edited locally
     - Merge: Local changes overwrite server values ONLY for those questions
     - Server values retained for questions user didn't touch locally

3. **Upload files first (if any)**
   ```
   For each file in local submission:
     POST /api/submissions/{id}/upload
     Update answers_json with returned file metadata
   ```

4. **Send merged submission to server**
   ```
   PUT /api/submissions/{id}
   Body: { answers_json: mergedAnswers }
   ```

5. **Handle conflicts**
   - If same question edited both locally and on server:
     - **Strategy:** Last-write-wins (local overwrites server)
     - Log conflict in console (for debugging)
     - Optional: Show notification to user (future enhancement)

6. **Mark as synced in IndexedDB**
   ```javascript
   db.submissions.update(id, { synced: true });
   ```

7. **Clear sync queue**
   ```javascript
   db.syncQueue.delete(queueId);
   ```

**PWA-9: Sync Error Handling**
- If sync fails (network error, validation error):
  - Keep submission in local queue
  - Show error notification with retry button
  - Retry automatically on next sync trigger
  - After 5 failed attempts, require manual intervention

**PWA-10: Sync Progress UI**
- Show sync progress for multiple submissions:
  ```
  Syncing submissions... (2/5 completed)
  ✓ Submission #123 synced
  ✓ Submission #124 synced
  ⏳ Submission #125 syncing...
  ```

### 10.5 Offline File Handling

**PWA-11: File Storage in IndexedDB**
- Files < 2 MB stored as Blob in IndexedDB
- Files referenced in `files` table with:
  - `submission_id`, `question_name`, `blob`, `filename`, `type`, `size`, `synced`

**PWA-12: File Sync Process**
1. Upload file via `POST /api/submissions/{id}/upload`
2. Receive file metadata (path, URL)
3. Update `answers_json` with file metadata
4. Remove Blob from IndexedDB
5. Mark file as synced

**PWA-13: File Size Enforcement**
- Client-side validation before adding to IndexedDB
- If file > 2 MB and offline:
  - Show error: "File too large for offline upload (max 2 MB). Please connect to internet."
  - Do not store in IndexedDB

### 10.6 Cache Management

**PWA-14: Questionnaire Caching**
- When user opens a questionnaire while online:
  - Cache questionnaire JSON in IndexedDB
  - Cache related permissions
- TTL (Time-To-Live): 24 hours
- On app start (if online), check for questionnaire updates

**PWA-15: Submission Caching**
- User explicitly "downloads" submissions for offline work:
  - Button: "Make available offline"
  - Fetches submission + questionnaire + files
  - Stores in IndexedDB
- Limit: Max 50 submissions cached (configurable)
- User can remove cached submissions to free space

**PWA-16: Cache Eviction**
- Least Recently Used (LRU) policy
- When storage quota exceeded, remove oldest cached items
- Never evict items in sync queue (pending changes)

---

## 11. Notification System

### 11.1 Notification Channels

**NOTIF-1: Email Notifications**
- Sent via Laravel Mail + queue
- SMTP configuration (or service like Mailtrap, SendGrid)
- Email templates in Blade (with HTML and plain text versions)

**NOTIF-2: In-App Notifications**
- Stored in `notifications` table (Laravel default)
- Bell icon in navbar with unread count badge
- Dropdown panel showing recent notifications
- Clicking notification marks as read

**NOTIF-3: User Preferences**
- User profile page: Notification settings
- Toggle on/off per event type:
  - Email notifications (all events)
  - In-app notifications (all events)
- Separate toggles per event type (future enhancement):
  - Submission status changes
  - Rejections
  - New submissions in institution
  - Cross-institution edits

### 11.2 Notification Events & Recipients

| Event | Trigger | Recipients | Email | In-App |
|-------|---------|-----------|-------|--------|
| **Submission Created** | New submission created | Institution Admins of that institution + parent institutions | ✓ | ✓ |
| **Status: Submitted** | Status changed to `submitted` | Institution Admins of parent institution(s) | ✓ | ✓ |
| **Status: Approved** | Status changed to `approved` | Submission creator | ✓ | ✓ |
| **Status: Rejected** | Status changed to `rejected` with comments | Submission creator | ✓ | ✓ |
| **Rejection Comments Added** | Admin adds/updates rejection comments | Submission creator | ✓ | ✓ |
| **Edited by Another Institution** | Institution Y edits submission created by Institution X | Original creator + their Institution Admins | ✓ | ✓ |
| **Assigned for Review** (v2) | Submission assigned to specific reviewer | Assigned reviewer | ✓ | ✓ |

**Hierarchical Flow:**
- District creates submission → Province Admin notified → Central Admin notified
- Province approves → Central Admin notified
- Central approves → Original District creator notified

### 11.3 Notification Content

**Email Template Example (Rejection):**
```
Subject: Submission #123 Rejected – [Questionnaire Title]

Dear [User Name],

Your submission #123 for "[Questionnaire Title]" has been rejected by [Reviewer Name] from [Institution Name].

Rejection Reason:
[rejection_comments]

Please review the submission and make necessary corrections, then resubmit.

View Submission: [Link to submission]

---
Survey Webapp
[Do Not Reply]
```

**In-App Notification Example:**
```json
{
  "type": "submission.rejected",
  "data": {
    "submission_id": 123,
    "questionnaire_title": "Household Survey",
    "reviewer_name": "John Admin",
    "institution_name": "Province A Health Office",
    "rejection_comments": "Please verify household size...",
    "action_url": "/submissions/123"
  },
  "read_at": null,
  "created_at": "2024-11-03T10:30:00Z"
}
```

### 11.4 Notification API

**GET `/api/notifications`**
```
Query params:
- unread_only (boolean, default false)
- page, per_page

Response 200:
{
  "data": [
    {
      "id": "uuid-1234",
      "type": "submission.rejected",
      "data": { ... },
      "read_at": null,
      "created_at": "2024-11-03T10:30:00Z"
    },
    ...
  ],
  "meta": {
    "unread_count": 5,
    "total": 42
  }
}
```

**PUT `/api/notifications/{id}/read`**
```
Response 200:
{
  "message": "Notification marked as read"
}
```

**PUT `/api/notifications/mark-all-read`**
```
Response 200:
{
  "message": "All notifications marked as read"
}
```

### 11.5 Notification Settings

**User Settings Page:**
- Section: "Notification Preferences"
- Checkboxes:
  - [ ] Email notifications enabled
  - [ ] In-app notifications enabled
- Saved in `user_settings` table or `users.notification_preferences` JSON column

**Default Settings:**
- All notifications enabled by default
- User can opt-out per channel

---

## 12. Form Versioning Strategy

### 12.1 Versioning Overview

**Purpose:**
- Allow questionnaire evolution without breaking existing submissions
- Each submission always references a specific questionnaire version
- Old submissions render with their original version's structure

**Key Principle:** Submissions are immutable in terms of structure—they always load the questionnaire version they were created with.

### 12.2 Questionnaire Code vs Version

**Structure:**
- `code`: Logical identifier (e.g., "QA", "HH-Survey")
- `version`: Integer (1, 2, 3, ...)
- Multiple rows in `questionnaires` table with same code, different versions

**Example:**
```
| id | code | version | is_active | title                   |
|----|------|---------|-----------|-------------------------|
| 1  | QA   | 1       | false     | Household Survey v1     |
| 2  | QA   | 2       | true      | Household Survey v2     |
```

**Active Version:**
- Only one version per code can have `is_active = true`
- Active version is used for new submissions
- Old versions remain in database for existing submissions

### 12.3 Creating New Versions

**When to Create New Version:**
- **Breaking changes** (see below)
- Major structural changes to form
- Significant rewording that changes meaning
- Adding/removing core indicators

**Breaking Changes (Require New Version):**
- Rename question `name` field that has data
- Delete question that has data
- Change question type (text → matrix, dropdown → checkbox)
- Major matrix structure changes (rows/columns)
- Reuse question `name` for different meaning

**Safe In-Place Changes (No New Version):**
- Change question labels/descriptions
- Change placeholder text or hints
- Add new optional question (not core indicator)
- Add answer choices to dropdown (keeping existing ones)
- Reorder questions/pages (without renaming)
- UI-only changes (widths, CSS classes)

### 12.4 Version Creation Process

**Admin UI Flow:**
1. Admin opens questionnaire QA v1
2. System detects submissions exist for v1
3. Warning shown:
   > ⚠️ This questionnaire has 234 active submissions. For major changes (renaming/deleting questions, structure changes), please create a new version instead of editing in place.
4. Admin clicks "Duplicate as New Version"
5. System creates QA v2:
   - Copies `surveyjs_json`, `title`, `description`
   - Increments `version` to 2
   - Sets `is_active = true` (sets v1 to `false`)
   - Optionally copies question permissions
6. Admin edits v2 using SurveyJS Creator
7. Save QA v2

**Result:**
- New submissions use v2
- Existing submissions still reference v1
- Both versions exist in database

### 12.5 Submission-Version Binding

**Data Model:**
- `submissions.questionnaire_id` (FK) points to specific version ID, not code
- Example:
  ```
  Submission #123: questionnaire_id = 1 (QA v1)
  Submission #124: questionnaire_id = 2 (QA v2)
  ```

**Rendering Logic:**
- When user opens submission #123:
  ```
  1. Fetch submission (includes questionnaire_id = 1)
  2. Fetch questionnaire WHERE id = 1 (gets QA v1)
  3. Render SurveyJS with v1 JSON
  4. Always shows v1 form structure
  ```

**Result:** Editing old submission always shows original form version, ensuring consistency.

### 12.6 Version Management UI

**Admin Dashboard:**
- List questionnaires grouped by code:
  ```
  QA - Household Survey
  ├─ v1 (Inactive, 234 submissions)
  ├─ v2 (Active, 45 submissions)
  └─ v3 (Draft, 0 submissions)
  ```

**Actions per Version:**
- **View:** Open in read-only mode
- **Edit:** Modify (with warnings if submissions exist)
- **Duplicate:** Create new version
- **Deactivate:** Set `is_active = false` (prevents new submissions)
- **Delete:** Hard delete (only if zero submissions)

---

## 13. Data Analysis & Export

### 13.1 Analysis Strategy Across Versions

**Challenge:** Multiple questionnaire versions exist, need unified analysis.

**Solution:** Create PostgreSQL **analysis views** that normalize data across versions.

### 13.2 Stable Analysis Variables

**Concept:** Map question names from different versions to stable "analysis codes".

**Example:**
```
QA v1: question "q1_province" → analysis code "province"
QA v2: question "province" → analysis code "province"
QB v1: question "prov" → analysis code "province"
```

**Implementation Options:**
1. **Hard-coded mapping in view** (simple, static)
2. **Mapping table** (flexible, requires config UI)

**Recommended for v1:** Hard-coded in view (simpler).

### 13.3 Analysis Views

**Example: QA Analysis View**
```sql
CREATE VIEW qa_analysis AS
SELECT
  s.id AS submission_id,
  q.code AS questionnaire_code,
  q.version AS questionnaire_version,
  i.name AS institution_name,
  i.level AS institution_level,
  s.institution_id,
  s.status,
  s.submitted_at,
  s.created_at,
  
  -- Stable analysis columns (coalesce across versions)
  COALESCE(
    s.answers_json->>'province',
    s.answers_json->>'q1_province'
  ) AS province,
  
  COALESCE(
    (s.answers_json->>'hh_size')::int,
    (s.answers_json->>'household_size')::int
  ) AS household_size,
  
  COALESCE(
    s.answers_json->>'income_source',
    s.answers_json->>'q5_income'
  ) AS income_source,
  
  -- Add more analysis columns as needed
  s.answers_json AS full_answers  -- For ad-hoc queries

FROM submissions s
JOIN questionnaires q ON q.id = s.questionnaire_id
JOIN institutions i ON i.id = s.institution_id
WHERE q.code = 'QA'
  AND s.deleted_at IS NULL;
```

**Usage:**
- Dashboards query `qa_analysis` instead of raw `submissions`
- Exports use `qa_analysis` for normalized data
- Analysts can query view directly in SQL client

### 13.4 Dashboard Queries

**Example: Submission Count by Province**
```sql
SELECT
  province,
  COUNT(*) AS submission_count,
  SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) AS approved_count
FROM qa_analysis
GROUP BY province
ORDER BY submission_count DESC;
```

**Example: Household Size Distribution**
```sql
SELECT
  household_size,
  COUNT(*) AS count
FROM qa_analysis
WHERE household_size IS NOT NULL
GROUP BY household_size
ORDER BY household_size;
```

### 13.5 Export Functionality

**Export Endpoints:**
```
GET /api/exports/{questionnaire_code}?format=csv&version=all
GET /api/exports/{questionnaire_code}?format=xlsx&version=2
```

**Query Parameters:**
- `format`: csv | xlsx
- `version`: all | {version_number}
- `institution_id`: filter by institution (optional)
- `date_from`, `date_to`: date range filter (optional)

**Export Formats:**

#### 13.5.1 Normalized Export (Default)
- Uses analysis view (e.g., `qa_analysis`)
- Columns:
  - Metadata: `submission_id`, `questionnaire_code`, `questionnaire_version`, `institution_name`, `status`, `submitted_at`
  - Analysis variables: `province`, `household_size`, `income_source`, etc.
- Rows: One row per submission, all versions combined
- Missing values: Empty cells for questions not in that version

**Example CSV:**
```csv
submission_id,questionnaire_code,version,institution,province,household_size,income_source
123,QA,1,District A1,Vientiane,5,agriculture
124,QA,2,District A2,Luang Prabang,7,trade
125,QA,2,District B1,Vientiane,,  # household_size missing in v2
```

#### 13.5.2 Per-Version Export
- Filter by specific version: `version=2`
- Ensures consistent column structure (all rows have same form version)
- Use case: Detailed analysis of single version

#### 13.5.3 Long Format Export (Optional v2)
- Each row = one answer
- Columns: `submission_id`, `questionnaire_code`, `version`, `question_name`, `value`
- Useful for advanced analysis (R, Python, Power BI)

**Example:**
```csv
submission_id,questionnaire_code,version,question_name,value
123,QA,1,province,Vientiane
123,QA,1,household_size,5
123,QA,1,income_source,agriculture
```

### 13.6 Export Implementation

**Backend (Laravel):**
- Use `maatwebsite/excel` package
- Export job queued (for large datasets)
- User receives notification when export ready
- Download link expires after 24 hours

**Export Job Flow:**
1. User clicks "Export QA (CSV)"
2. Frontend calls `POST /api/exports/qa` with options
3. Backend queues export job
4. Job queries analysis view, generates file
5. File stored in `storage/app/exports/{job_id}.csv`
6. Notification sent to user (email + in-app)
7. User downloads via `GET /api/exports/download/{job_id}`

**Export UI:**
- Dashboard page: "Export" button per questionnaire
- Modal with options:
  - Format: CSV / Excel
  - Version: All / v1 / v2
  - Date range (optional)
  - Institution filter (optional)
- "Generate Export" button
- Progress indicator / notification when ready

---

## 14. Localization & Internationalization

### 14.1 Supported Languages

**L10N-1: Initial Languages**
- **Lao** (lo) – Primary language for Lao PDR users
- **English** (en) – Secondary language, default for international users

**L10N-2: Language Switching**
- Language selector in user profile settings
- Language preference saved in `users.locale` column
- Applied on next login

### 14.2 UI Localization

**L10N-3: Backend (Laravel)**
- Laravel's built-in localization (`resources/lang/lo/`, `resources/lang/en/`)
- Translation files for:
  - Validation messages
  - Email templates
  - API error messages
- Use `trans()` or `__()` helper in code

**L10N-4: Frontend (React)**
- Use `react-i18next` library
- Translation JSON files: `public/locales/lo/translation.json`, `public/locales/en/translation.json`
- Example:
  ```json
  {
    "dashboard.welcome": "ຍິນດີຕ້ອນຮັບ",
    "submissions.status.draft": "ຮ່າງ",
    "submissions.status.submitted": "ສົ່ງແລ້ວ"
  }
  ```
- Use `useTranslation()` hook in components:
  ```javascript
  const { t } = useTranslation();
  return <h1>{t('dashboard.welcome')}</h1>;
  ```

### 14.3 Questionnaire Content Localization

**L10N-5: Multilingual Questionnaires (SurveyJS)**
- SurveyJS supports multi-language JSON:
  ```json
  {
    "title": {
      "en": "Household Survey",
      "lo": "ການສຳຫຼວດຄົວເຮືອນ"
    },
    "questions": [
      {
        "name": "demo_age",
        "title": {
          "en": "What is your age?",
          "lo": "ທ່ານອາຍຸເທົ່າໃດ?"
        }
      }
    ]
  }
  ```
- SurveyJS Creator supports multi-language editing
- Admin can add translations for each question, choice, etc.

**L10N-6: Language Rendering**
- Frontend passes user's locale to SurveyJS:
  ```javascript
  survey.locale = userLocale; // 'lo' or 'en'
  ```
- Survey displays in selected language
- If translation missing, fallback to default language (English)

### 14.4 Date & Number Formatting

**L10N-7: Date Formatting**
- Use locale-aware formatting:
  - English: MM/DD/YYYY
  - Lao: DD/MM/YYYY (or Lao Buddhist calendar if required)
- Use `date-fns` or `Intl.DateTimeFormat` in React

**L10N-8: Number Formatting**
- Use `Intl.NumberFormat` for locale-specific formatting
- Example: 1,234.56 (English) vs 1.234,56 (some locales)

### 14.5 Right-to-Left (RTL) Support (Future)

**L10N-9: RTL Preparation**
- Not required for Lao (left-to-right language)
- If Arabic/Hebrew support needed in future:
  - Add `dir="rtl"` attribute
  - Use CSS logical properties (margin-inline-start instead of margin-left)
  - Test layout in RTL mode

---

## 15. Risk Assessment

### 15.1 Technical Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| **Offline sync conflicts** leading to data loss | Medium | High | Per-question merge strategy; extensive testing; clear UI indicators |
| **Performance degradation** with large datasets (100K+ submissions) | Medium | Medium | Database indexing; query optimization; pagination; analysis views |
| **Browser IndexedDB quota** limits offline capability | Medium | Medium | Cache size limits; LRU eviction; user notification when quota exceeded |
| **SurveyJS complexity** causing UI bugs in complex forms | Low | Medium | Thorough testing of matrix questions; fallback to simpler question types if needed |
| **File storage filling server disk** | Medium | Medium | Monitoring & alerts; scheduled cleanup of deleted submission files; storage expansion plan |
| **JSONB performance** on complex queries | Low | Medium | Use analysis views instead of direct JSONB queries; add GIN indexes |

### 15.2 Security Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| **Unauthorized data access** across institutions | Medium | High | Strict backend permission checks; audit logging; regular security audits |
| **SQL injection** via form inputs | Low | High | Use Eloquent ORM exclusively; input validation; code review |
| **File upload exploits** (malicious files, path traversal) | Medium | High | MIME type validation; filename sanitization; files outside web root; virus scanning (v2) |
| **XSS attacks** via form answers | Low | Medium | Output escaping by default; CSP headers; SurveyJS sanitization |
| **Session hijacking** | Low | High | HTTPS only; secure cookies; session timeout; IP validation (optional) |
| **Brute force login attacks** | Medium | Medium | Account lockout; rate limiting; failed login logging |

### 15.3 Operational Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| **Server downtime** during critical data collection | Low | High | Offline capability; regular backups; maintenance windows; monitoring |
| **Data corruption** during version migration | Low | High | Thorough testing; database backups before migrations; rollback plan |
| **User training gap** leading to misuse | High | Medium | User manuals; training sessions; tooltips/help text in UI; support channel |
| **Internet connectivity** issues in remote areas | High | Medium | Offline/PWA capability is core feature; field staff training on sync |
| **Permission misconfiguration** exposing data | Medium | High | Admin UI warnings; permission preview; audit logging; regular reviews |

### 15.4 Project Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| **Scope creep** delaying launch | High | Medium | Phased approach; clear v1 scope; prioritized backlog |
| **Key developer departure** | Medium | High | Documentation; code standards; knowledge sharing; pair programming |
| **Integration issues** with existing systems (if any) | Low | Medium | API design; early integration testing; fallback to manual data transfer |
| **User adoption resistance** | Medium | Medium | User involvement in design; training; gradual rollout; champion users |

### 15.5 Risk Monitoring

- **Weekly risk review** during development
- **Monthly risk assessment** post-launch
- **Issue tracking** for materialized risks
- **Retrospectives** to identify new risks

---

## 16. Testing Strategy

### 16.1 Testing Levels

#### 16.1.1 Unit Testing

**Backend (Laravel):**
- Framework: PHPUnit or Pest
- Target: 70%+ code coverage
- Focus:
  - Model relationships and scopes
  - Service layer business logic
  - Permission calculation logic
  - Validation rules
  - Utility functions

**Frontend (React):**
- Framework: Jest + React Testing Library
- Target: 60%+ code coverage
- Focus:
  - Component rendering
  - User interaction handlers
  - State management logic
  - Form validation
  - Utility functions

#### 16.1.2 Integration Testing

**API Integration Tests:**
- Test full request/response cycle
- Test authentication and authorization
- Test database transactions
- Test file upload/download
- Use Laravel's HTTP testing features

**Example Test Cases:**
- Create submission with valid permissions → Success
- Create submission without permissions → 403 Forbidden
- Update submission with unauthorized field → 403 Forbidden
- Upload file exceeding size limit → 413 Payload Too Large

#### 16.1.3 End-to-End (E2E) Testing

**Framework:** Playwright or Cypress

**Test Scenarios:**
1. **User Login Flow**
   - Login with valid credentials
   - Login with invalid credentials (fail)
   - Account lockout after 5 failed attempts

2. **Create Submission Flow**
   - Enumerator creates new submission
   - Fills required fields
   - Saves as draft
   - Submits for review

3. **Multi-Institution Workflow**
   - District user creates submission
   - Province admin reviews and approves
   - Central admin views approved submission

4. **Offline Scenario**
   - User goes offline
   - Creates submission offline
   - Goes back online
   - Submission syncs successfully

5. **File Upload**
   - Upload valid image (online)
   - Upload valid document (online)
   - Upload image offline (under 2 MB)
   - Attempt to upload large file offline (fail with message)

6. **Rejection & Resubmission**
   - Institution admin rejects submission with comments
   - Enumerator receives notification
   - Enumerator corrects and resubmits

#### 16.1.4 Performance Testing

**Load Testing:**
- Tool: Apache JMeter or k6
- Scenarios:
  - 100 concurrent users loading dashboard
  - 50 concurrent users creating submissions
  - 20 concurrent file uploads
- Acceptance Criteria:
  - p95 response time < targets (see NFR section)
  - No errors under load

**Stress Testing:**
- Gradually increase load to find breaking point
- Identify bottlenecks (database, API, frontend)

#### 16.1.5 Security Testing

**Manual Security Testing:**
- SQL injection attempts
- XSS attempts (script tags in form inputs)
- CSRF token bypass attempts
- File upload exploits (PHP file disguised as image)
- Path traversal attempts (../../etc/passwd)

**Automated Security Scans:**
- OWASP ZAP or similar tool
- Scan for common vulnerabilities
- Fix critical and high-severity issues

#### 16.1.6 User Acceptance Testing (UAT)

**Participants:**
- 2-3 Admin users
- 5-10 Enumerator users (from different institutions)
- 2 Institution Admin users

**Test Environment:**
- Staging server with realistic data
- Test period: 2 weeks
- Daily feedback collection

**Acceptance Criteria:**
- 90%+ of test scenarios completed successfully
- No critical bugs
- User satisfaction score > 7/10

### 16.2 Testing Schedule

| Phase | Testing Type | Timeline |
|-------|-------------|----------|
| Development | Unit + Integration | Ongoing |
| Feature Complete | E2E, Performance, Security | Week 1-2 of testing phase |
| Pre-UAT | Bug fixes, regression testing | Week 3 |
| UAT | User acceptance testing | Week 4-5 |
| Pre-Launch | Final regression, smoke tests | Week 6 |

### 16.3 Bug Tracking & Priority

**Severity Levels:**
- **Critical:** System crash, data loss, security vulnerability → Fix immediately
- **High:** Major feature broken, affects many users → Fix before launch
- **Medium:** Feature partially broken, workaround exists → Fix before launch or v1.1
- **Low:** Minor UI glitch, cosmetic issue → Backlog

**Bug Workflow:**
1. Report bug in issue tracker (Jira, GitHub Issues, etc.)
2. Assign severity and priority
3. Developer fixes bug
4. Tester verifies fix
5. Close issue

---

## 17. Implementation Roadmap

### 17.1 Phased Approach

#### Phase 1: Core Foundation (8 weeks)
**Goal:** Basic system functionality, single-institution workflows

**Features:**
- User authentication (email/password)
- User management (CRUD)
- Institution management (flat structure, no hierarchy yet)
- Role-based access control (Admin, Enumerator, Viewer)
- Questionnaire CRUD (SurveyJS Creator integration)
- Basic submission creation and viewing
- Simple dashboard (submission counts)

**Deliverables:**
- Backend API endpoints (auth, users, institutions, questionnaires, submissions)
- Frontend React app (login, dashboard, form renderer)
- Database schema v1
- Deployed to staging server

**Success Criteria:**
- Admin can create questionnaires
- Enumerator can fill and save submissions
- Basic authorization working

---

#### Phase 2: Multi-Institution & Permissions (6 weeks)
**Goal:** Hierarchical institutions, per-question permissions, collaborative editing

**Features:**
- Institution hierarchy (central → province → district)
- Per-question, per-institution permissions (CRUD)
- Hierarchical data access (view down, edit by permission)
- Submission workflow (draft → submitted → approved/rejected)
- Rejection comments and resubmission
- Notification system (email + in-app)

**Deliverables:**
- Updated database schema (institution hierarchy, question_permissions)
- Permission configuration UI
- Workflow management UI
- Notification infrastructure

**Success Criteria:**
- Multi-institution workflow demo successful
- District creates, province reviews and approves
- Notifications sent correctly

---

#### Phase 3: Offline/PWA Capability (6 weeks)
**Goal:** Offline data collection and sync

**Features:**
- PWA setup (manifest, service worker)
- IndexedDB storage (Dexie.js)
- Offline submission creation and editing
- Sync engine (per-question merge)
- File attachment support (online and offline)
- Offline/online status indicator

**Deliverables:**
- PWA installable on mobile devices
- Offline sync working and tested
- File upload/download working

**Success Criteria:**
- User can create submission offline
- Submission syncs when back online
- No data loss in sync process

---

#### Phase 4: Dashboards & Export (4 weeks)
**Goal:** Data visualization and export functionality

**Features:**
- Dashboard UI (submission statistics, charts)
- Hierarchical dashboard views
- Analysis views (PostgreSQL)
- Export functionality (CSV, Excel)
- Normalized export across versions

**Deliverables:**
- Dashboard pages with charts
- Export API and UI
- Analysis view SQL scripts

**Success Criteria:**
- Dashboard loads in < 2 seconds
- Export generates correct CSV/Excel
- Data accurate across versions

---

#### Phase 5: Form Versioning & Localization (4 weeks)
**Goal:** Questionnaire versioning, multi-language support

**Features:**
- Form versioning (code + version)
- Version creation UI (duplicate as new version)
- Submission-version binding
- Lao language support (UI + questionnaire content)
- Language switcher

**Deliverables:**
- Versioning logic implemented
- Lao translations for UI
- Multilingual questionnaire support

**Success Criteria:**
- Multiple versions coexist without issues
- Old submissions render with original version
- UI works in Lao and English

---

#### Phase 6: Polish & Launch Prep (4 weeks)
**Goal:** Bug fixes, performance optimization, documentation, training

**Features:**
- Bug fixes from UAT
- Performance optimization
- Security hardening
- User documentation (manuals, videos)
- Admin training sessions
- Enumerator training sessions

**Deliverables:**
- Production-ready application
- User manuals (Admin, Institution Admin, Enumerator)
- Training materials
- Deployment documentation

**Success Criteria:**
- All critical and high-priority bugs fixed
- Performance meets NFRs
- Users trained and ready

---

### 17.2 Timeline Summary

| Phase | Duration | Cumulative | Key Milestone |
|-------|----------|-----------|---------------|
| Phase 1: Core Foundation | 8 weeks | 8 weeks | Basic system working |
| Phase 2: Multi-Institution | 6 weeks | 14 weeks | Collaborative workflows |
| Phase 3: Offline/PWA | 6 weeks | 20 weeks | Offline capability |
| Phase 4: Dashboards | 4 weeks | 24 weeks | Data visualization |
| Phase 5: Versioning & i18n | 4 weeks | 28 weeks | Localization complete |
| Phase 6: Polish & Launch | 4 weeks | 32 weeks | Production launch |

**Total Estimated Duration:** 32 weeks (~8 months)

**Note:** Timeline assumes:
- 1 full-time backend developer
- 1 full-time frontend developer
- 1 part-time DevOps/DBA
- Regular access to product owner/stakeholders

### 17.3 Go-Live Checklist

**Pre-Launch (1 week before):**
- [ ] All Phase 6 deliverables complete
- [ ] UAT sign-off received
- [ ] Production server provisioned and configured
- [ ] SSL certificate installed
- [ ] Database backup and restore tested
- [ ] Monitoring and alerts configured
- [ ] Admin users created in production
- [ ] Initial data seeded (institutions, users, roles)

**Launch Day:**
- [ ] Deploy application to production
- [ ] Smoke tests passed
- [ ] Enumerators can log in and access forms
- [ ] Notifications working
- [ ] Backups running

**Post-Launch (1 week after):**
- [ ] Monitor error logs daily
- [ ] Collect user feedback
- [ ] Fix critical bugs immediately
- [ ] Schedule v1.1 features based on feedback

---

## 18. Success Metrics

### 18.1 Adoption Metrics

**Target: 3 months post-launch**
- **Institutions Onboarded:** 20+ institutions using the system
- **Active Users:** 100+ users (enumerators, admins) logging in monthly
- **Submissions Created:** 1,000+ total submissions
- **Offline Usage:** 30%+ of submissions created offline (indicates field adoption)

### 18.2 Technical Metrics

**Ongoing:**
- **System Uptime:** > 99.5% (excluding scheduled maintenance)
- **API Response Time (p95):** < 500ms for list endpoints, < 200ms for single-item endpoints
- **Sync Success Rate:** > 99% (offline submissions successfully synced)
- **Page Load Time (p95):** < 3 seconds on 4G connection

### 18.3 Quality Metrics

**Post-UAT / Post-Launch:**
- **Bug Density:** < 5 bugs per 1,000 lines of code
- **Critical Bugs in Production:** 0 per month (after stabilization period)
- **Security Vulnerabilities:** 0 high or critical severity issues

### 18.4 User Satisfaction

**Survey (quarterly):**
- **User Satisfaction Score:** > 7/10 average
- **Net Promoter Score (NPS):** > 30 (would you recommend to colleagues?)
- **Task Success Rate:** > 90% (users can complete intended tasks without help)

### 18.5 Business Impact

**6 months post-launch:**
- **Data Collection Speed:** 20%+ faster than previous method (KoBo/paper/etc.)
- **Data Quality:** < 5% error rate (measured by rejection rate)
- **Cost Savings:** Reduced paper costs, faster data processing (qualitative)

### 18.6 Monitoring & Reporting

**Dashboard for Metrics:**
- Admin-only page showing key metrics
- Updated daily or weekly
- Exportable to Excel for reporting

**Monthly Reports:**
- Sent to stakeholders
- Summary of usage, issues, improvements

---

## 19. Appendices

### 19.1 Glossary

| Term | Definition |
|------|------------|
| **Admin** | System-wide administrator with full access |
| **Analysis View** | PostgreSQL view that normalizes submission data across questionnaire versions |
| **Enumerator** | Field staff who collects data by filling questionnaires |
| **Institution** | Organizational unit (e.g., ministry, province office, district health center) |
| **Institution Admin** | Administrator within a specific institution, can manage users and review submissions |
| **Offline Sync** | Process of synchronizing locally stored submissions to the server when connection is restored |
| **Per-Question Merge** | Sync strategy where only modified questions are updated, avoiding overwriting other fields |
| **PWA** | Progressive Web App – web application that works offline and can be installed like a native app |
| **Question Permission** | Rule defining which institution can view or edit a specific question in a questionnaire |
| **Submission** | A single response to a questionnaire, containing answers in JSON format |
| **SurveyJS** | JavaScript library for rendering and creating complex forms/surveys |

### 19.2 Acronyms

| Acronym | Full Form |
|---------|-----------|
| API | Application Programming Interface |
| CRUD | Create, Read, Update, Delete |
| CSRF | Cross-Site Request Forgery |
| CSP | Content Security Policy |
| E2E | End-to-End |
| FK | Foreign Key |
| GDPR | General Data Protection Regulation |
| GIN | Generalized Inverted Index (PostgreSQL) |
| HTTPS | Hypertext Transfer Protocol Secure |
| JSON | JavaScript Object Notation |
| JSONB | JSON Binary (PostgreSQL data type) |
| JWT | JSON Web Token |
| L10N | Localization (L + 10 letters + N) |
| NFR | Non-Functional Requirement |
| ORM | Object-Relational Mapping |
| PK | Primary Key |
| PRD | Product Requirements Document |
| PWA | Progressive Web App |
| RBAC | Role-Based Access Control |
| REST | Representational State Transfer |
| RTL | Right-to-Left |
| SPA | Single Page Application |
| SQL | Structured Query Language |
| TLS | Transport Layer Security |
| UAT | User Acceptance Testing |
| UI | User Interface |
| UUID | Universally Unique Identifier |
| XSS | Cross-Site Scripting |

### 19.3 References

**SurveyJS Documentation:**
- Official Docs: https://surveyjs.io/form-library/documentation/overview
- Creator Docs: https://surveyjs.io/survey-creator/documentation/overview

**Laravel Resources:**
- Laravel Docs: https://laravel.com/docs
- Sanctum Docs: https://laravel.com/docs/sanctum
- Spatie Permission: https://spatie.be/docs/laravel-permission

**React & PWA:**
- React Docs: https://react.dev
- PWA Guide: https://web.dev/progressive-web-apps/
- Dexie.js: https://dexie.org

**PostgreSQL:**
- JSONB Guide: https://www.postgresql.org/docs/current/datatype-json.html

### 19.4 Change Log

| Version | Date | Changes |
|---------|------|---------|
| 2.0 | Nov 25, 2024 | Complete rewrite with clarifications: institution hierarchy (no multi-membership), file uploads, workflow statuses, notifications, offline conflict resolution, audit tracking, security requirements, localization, testing strategy, roadmap |
| 1.0 | - | Initial draft |

---

**End of PRD v2.0**

---

## Contact & Feedback

For questions, clarifications, or suggestions regarding this PRD, please contact:

- **Product Owner:** [Name]
- **Technical Lead:** [Name]
- **Project Manager:** [Name]

**Document Location:** [Repository/SharePoint/etc.]

**Next Review Date:** [30 days after approval]
