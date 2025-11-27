# QI Survey Web Application - Administrator Guide

**Version:** 3.0 (Phase 6 - Localization & Performance)
**Last Updated:** November 27, 2025
**Audience:** System Administrators, Institution Managers

---

## Table of Contents

1. [Introduction](#introduction)
2. [Getting Started](#getting-started)
3. [Managing Institutions](#managing-institutions)
4. [Managing Departments](#managing-departments)
5. [Managing Users](#managing-users)
6. [Managing Questionnaires](#managing-questionnaires)
7. [Question-Level Permissions](#question-level-permissions)
8. [Reviewing Submissions](#reviewing-submissions)
9. [Monitoring Offline Submissions & Sync](#monitoring-offline-submissions--sync)
10. [Language Management](#language-management)
11. [Notifications](#notifications)
12. [Best Practices](#best-practices)
13. [Troubleshooting](#troubleshooting)

---

## Introduction

Welcome to the QI Survey Web Application Administrator Guide. This guide provides comprehensive instructions for system administrators to manage institutions, departments, users, questionnaires, and submissions.

### Administrator Capabilities

As an administrator, you can:

✅ Manage institutions in a hierarchical structure (Central → Province → District)
✅ Create and manage departments within institutions
✅ Create, edit, and delete user accounts
✅ Assign roles and permissions to users
✅ Create and manage questionnaires with SurveyJS
✅ Set question-level edit permissions for departments
✅ Review, approve, and reject submissions
✅ View all submissions across all institutions
✅ Monitor system activity through notifications

### Role Overview

**Administrator Role:**
- Full access to all system features
- Can manage all institutions, departments, and users
- Can create and modify questionnaires
- Can approve/reject submissions from any institution
- Can set granular permissions for questions

**Other Roles:**
- **Enumerator:** Creates and submits surveys, limited to own institution
- **Viewer:** Read-only access to submissions and reports

---

## Getting Started

### Logging In

1. Navigate to the application URL (e.g., `https://qi-survey.example.com`)
2. Enter your admin credentials:
   - **Default Email:** `admin@example.com`
   - **Default Password:** `password` (change immediately!)
3. Click **Login**

**⚠️ IMPORTANT:** Change the default password immediately after first login.

### Changing Your Password

1. Click your name in the top-right corner
2. Select **Profile**
3. Enter your current password
4. Enter new password (minimum 8 characters)
5. Confirm new password
6. Click **Update Password**

### Dashboard Overview

After logging in, you'll see the dashboard with:

- **Total Submissions:** Count of all submissions in the system
- **Pending Approvals:** Submissions waiting for review
- **Active Questionnaires:** Currently published questionnaires
- **Active Users:** Total users in the system
- **Recent Activity:** Latest submissions and approvals

**Navigation Menu:**
- Dashboard - System overview
- Institutions - Manage organization hierarchy
- Departments - Manage departments within institutions
- Users - User account management
- Questionnaires - Survey management
- Submissions - Data review and approval

---

## Managing Institutions

Institutions are organized in a three-level hierarchy:

1. **Central** - Top-level organization (e.g., Ministry of Health)
2. **Province** - Regional offices (e.g., Provincial Health Office)
3. **District** - Local facilities (e.g., District Hospital)

### Viewing Institutions

1. Click **Institutions** in the navigation menu
2. View list of all institutions with:
   - Name and code
   - Level (Central/Province/District)
   - Parent institution (for Province and District)
   - Active status
   - User count

**Filtering:**
- Use **Level** dropdown to filter by institution type
- Use **Status** dropdown to filter active/inactive

### Creating an Institution

1. Click **Institutions** → **Create Institution** button
2. Fill in the form:
   - **Name:** Full institution name (e.g., "Kampala District Hospital")
   - **Code:** Unique identifier (e.g., "KDH") - auto-uppercase
   - **Level:** Select Central, Province, or District
   - **Parent Institution:** Select parent (required for Province/District)
   - **Description:** Optional detailed description
   - **Active:** Check to make institution active
3. Click **Create Institution**

**Example:**
```
Name: Kampala District Hospital
Code: KDH
Level: District
Parent Institution: Kampala Province
Description: Main district hospital serving Kampala region
Active: ✓
```

### Editing an Institution

1. Click **Institutions** in the navigation menu
2. Click **Edit** button next to the institution
3. Modify fields as needed
4. Click **Update Institution**

**⚠️ NOTE:** Changing parent institution will affect access control for users.

### Deactivating an Institution

Instead of deleting, deactivate institutions to preserve historical data:

1. Edit the institution
2. Uncheck **Active** checkbox
3. Click **Update Institution**

**Effect of Deactivation:**
- Institution won't appear in dropdowns for new records
- Existing users remain assigned but can't create new submissions
- Historical data remains intact

---

## Managing Departments

Departments are organizational units within institutions (e.g., HR, IT, Finance). They are used for question-level permissions and user organization.

### Viewing Departments

1. Click **Departments** in the navigation menu
2. View list showing:
   - Department name and code
   - Parent institution
   - User count
   - Active status

**Filtering:**
- **Institution:** Filter departments by institution
- **Status:** Filter by active/inactive

### Creating a Department

1. Click **Departments** → **Create Department** button
2. Fill in the form:
   - **Name:** Department name (e.g., "Human Resources")
   - **Code:** Unique code within institution (e.g., "HR")
   - **Institution:** Select parent institution (required)
   - **Description:** Optional description
   - **Active:** Check to make department active
3. Click **Create Department**

**Example:**
```
Name: Human Resources
Code: HR
Institution: Ministry of Health (Central)
Description: Handles staff recruitment and management
Active: ✓
```

**⚠️ IMPORTANT:** Department codes must be unique within each institution, but can be duplicated across different institutions.

### Editing a Department

1. Click **Departments** in the navigation menu
2. Click **Edit** button next to the department
3. Modify fields as needed
4. Click **Update Department**

### Deleting a Department

**⚠️ WARNING:** Delete only if department has no users assigned.

1. Click **Delete** button next to the department
2. Confirm deletion in the modal
3. Click **Delete** to confirm

**What happens:**
- Department is soft-deleted (recoverable by developer)
- Users assigned to department have department_id set to NULL
- Question permissions for this department are removed

---

## Managing Users

### Viewing Users

1. Click **Users** in the navigation menu
2. View list showing:
   - Name and email
   - Institution
   - Department (if assigned)
   - Role
   - Active status

**Filtering:**
- **Institution:** Filter by institution
- **Role:** Filter by user role

### Creating a User

1. Click **Users** → **Create User** button
2. Fill in the form:
   - **Name:** Full name (e.g., "John Doe")
   - **Email:** Unique email address (used for login)
   - **Password:** Initial password (min 8 characters)
   - **Institution:** Select user's institution (required)
   - **Department:** Optional department assignment
   - **Role:** Select from Admin, Enumerator, or Viewer
   - **Active:** Check to activate account immediately
3. Click **Save**

**Department Selection:**
- Department dropdown is disabled until institution is selected
- Only departments belonging to selected institution appear
- Department is optional (user can work without department)
- Changing institution clears department selection

**Example:**
```
Name: Sarah Nakato
Email: s.nakato@health.go.ug
Password: SecurePass123
Institution: Kampala District Hospital
Department: Data Management
Role: Enumerator
Active: ✓
```

### Editing a User

1. Click **Users** in the navigation menu
2. Click **Edit** button next to the user
3. Modify fields as needed
4. **Password Field:**
   - Leave blank to keep current password
   - Enter new password to change it
5. Click **Save**

**⚠️ NOTE:** Changing user's institution or role affects their access permissions immediately.

### Role Permissions

**Admin:**
- Full system access
- Manage institutions, departments, users
- Create and edit questionnaires
- Set question permissions
- Approve/reject all submissions

**Enumerator:**
- View active questionnaires
- Create and edit own draft submissions
- Submit drafts for approval
- Edit rejected submissions
- View own submissions only

**Viewer:**
- Read-only access to submissions
- View questionnaires
- View reports
- Cannot create or edit anything

### Deactivating a User

Instead of deleting, deactivate users:

1. Edit the user
2. Uncheck **Active** checkbox
3. Click **Save**

**Effect:**
- User cannot log in
- Existing data remains attributed to user
- Can be reactivated later

### Account Lockout

Users are automatically locked after 5 failed login attempts:
- Lockout duration: 15 minutes
- User sees "Account locked" message
- Automatically unlocked after 15 minutes

**Manual Unlock (by Admin):**
1. Edit the user
2. (Developer action required: reset failed_login_attempts and locked_until)

---

## Managing Questionnaires

Questionnaires are survey forms created using SurveyJS library.

### Viewing Questionnaires

1. Click **Questionnaires** in the navigation menu
2. View list showing:
   - Title
   - Code and version
   - Active status
   - Submission count
   - Actions (Edit, Duplicate, Permissions)

**Filtering:**
- **Status:** Filter by active/inactive
- **Code:** Search by questionnaire code

### Creating a Questionnaire

**Step 1: Design the Survey**

1. Go to [https://surveyjs.io/create-free-survey](https://surveyjs.io/create-free-survey)
2. Design your survey using the visual editor:
   - Add pages
   - Add questions (text, multiple choice, rating, etc.)
   - Configure validation rules
   - Set conditional logic
   - Customize appearance
3. Click **JSON Editor** tab
4. Copy the entire JSON

**Step 2: Create in Application**

1. Click **Questionnaires** → **Create Questionnaire** button
2. Fill in the form:
   - **Title:** Descriptive title (e.g., "Q1 2025 Patient Satisfaction Survey")
   - **Code:** Unique code (e.g., "PSS-Q1-2025")
   - **Version:** Version number (e.g., 1)
   - **Description:** Optional detailed description
   - **SurveyJS JSON:** Paste the JSON from SurveyJS creator
   - **Active:** Check to publish immediately
3. Click **Create Questionnaire**

**Example:**
```
Title: Patient Satisfaction Survey Q1 2025
Code: PSS-Q1-2025
Version: 1
Description: Quarterly patient satisfaction assessment for all facilities
SurveyJS JSON: { "pages": [ ... ] }
Active: ✓
```

### Editing a Questionnaire

1. Click **Edit** button next to the questionnaire
2. Modify fields as needed
3. **⚠️ WARNING:** Changing SurveyJS JSON affects existing incomplete submissions
4. Click **Update Questionnaire**

**Best Practice:** Create a new version instead of editing if:
- Questionnaire has existing submissions
- Questions are added/removed
- Question types are changed

### Duplicating a Questionnaire (Phase 5: Versioning)

**Phase 5** introduced comprehensive questionnaire versioning. To create a new version:

1. Click **Duplicate** button next to the questionnaire
2. Modal appears asking for:
   - **New Version Number:** Suggested next version (e.g., 2 if current is 1)
   - **Version Notes:** Required description of changes (min 10 characters)
3. Click **Create Version**
4. System creates copy with:
   - Same title
   - Same code
   - Specified version number
   - Your version notes stored
   - Inactive by default
   - All permissions copied from original
5. Edit the duplicate to make changes if needed
6. Activate when ready

**Example Versioning Workflow:**

```
Patient Survey v1 (Active)
  ↓ Duplicate with notes: "Added mental health questions"
Patient Survey v2 (Inactive)
  ↓ Activate v2
Patient Survey v1 (Inactive) + Patient Survey v2 (Active)
```

**Version Notes:**
- Used to track what changed between versions
- Visible in questionnaire list
- Helps with audit and compliance
- Required when creating new version

**Version Management:**
- Only one version per code can be active
- Activating a version deactivates others with same code
- All versions remain available for historical reference
- Submissions linked to specific version they used

### Activating/Deactivating a Questionnaire

**Activate:**
1. Click **Activate** button
2. Questionnaire becomes available to enumerators
3. Appears in submission creation dropdown

**Deactivate:**
1. Click **Deactivate** button
2. Questionnaire hidden from enumerators
3. Existing submissions remain accessible

**⚠️ NOTE:** Only activate questionnaires that are fully tested and ready for data collection.

---

## Question-Level Permissions

Control which departments can edit specific questions within a questionnaire.

### Use Case Example

For a hospital survey:
- **Patient Demographics (Q1-Q5):** All departments can edit
- **Financial Data (Q6-Q10):** Only Finance department can edit
- **Medical Records (Q11-Q15):** Only Medical Records department can edit
- **HR Data (Q16-Q20):** Only HR department can edit

### Setting Permissions

1. Click **Questionnaires** → **Permissions** button
2. **Select Institution:** Choose institution to configure
3. View the permission matrix:
   - Rows: Questions from the questionnaire
   - Columns: Departments in selected institution
   - Cells: Checkboxes for edit permission

**Matrix Operations:**

**Toggle Individual Cell:**
- Click checkbox to allow/deny edit permission

**Toggle Entire Row (All departments for one question):**
- Click **Toggle** button in row
- Toggles all departments for that question

**Toggle Entire Column (All questions for one department):**
- Click **Toggle** link in column header
- Toggles all questions for that department

**Save Changes:**
1. Make desired changes to the matrix
2. Unsaved changes indicator appears
3. Click **Save Permissions** button
4. Changes apply immediately

**Reset Changes:**
- Click **Reset** button to discard unsaved changes

### Permission Behavior

**When permission is NOT granted:**
- Question appears in submission form with lock icon (🔒)
- Field is read-only (cannot be edited)
- Field has reduced opacity (70%)
- Tooltip shows "You do not have permission to edit this question"

**When permission IS granted:**
- Question appears normally
- Field is editable
- No visual restrictions

**Admin Override:**
- Admins bypass all question permissions
- All questions are always editable for admins

### Example Configuration

**Scenario:** Hospital Patient Survey for Kampala District Hospital

**Questions:**
- patient_name (Q1)
- patient_age (Q2)
- admission_date (Q3)
- diagnosis (Q4)
- treatment_cost (Q5)
- insurance_status (Q6)

**Departments:**
- Reception
- Medical Records
- Finance

**Permission Matrix:**

| Question         | Reception | Medical Records | Finance |
|------------------|-----------|-----------------|---------|
| patient_name     | ✓         | ✓               | ✓       |
| patient_age      | ✓         | ✓               | ✓       |
| admission_date   | ✓         | ✓               | ✓       |
| diagnosis        |           | ✓               |         |
| treatment_cost   |           |                 | ✓       |
| insurance_status |           |                 | ✓       |

**Result:**
- Reception staff can only edit basic patient info
- Medical Records can edit patient info and diagnosis
- Finance can edit patient info and financial data

---

## Reviewing Submissions

### Viewing Submissions

1. Click **Submissions** in the navigation menu
2. View list showing:
   - Questionnaire title
   - Institution name
   - Submitted by (user)
   - Status (Draft, Submitted, Approved, Rejected)
   - Submission date
   - Actions (View, Approve, Reject)

**Filtering:**
- **Status:** Filter by submission status
- **Questionnaire:** Filter by specific questionnaire
- **Institution:** Filter by institution

### Submission Workflow

**States:**

1. **Draft** - Work in progress by enumerator
   - Can be edited by creator
   - Can be deleted by creator
   - Not visible to admins in review queue

2. **Submitted** - Ready for review
   - Locked from editing
   - Appears in admin review queue
   - Awaiting approval/rejection

3. **Approved** - Accepted submission
   - Immutable (cannot be edited)
   - Included in reports and statistics
   - Final state

4. **Rejected** - Returned to creator
   - Can be edited by creator
   - Includes rejection comments
   - Can be resubmitted after corrections

### Reviewing a Submission

1. Click **Submissions** in the navigation menu
2. Click **View** button next to a submitted submission
3. Review all answers carefully
4. Check for:
   - Completeness (all required fields filled)
   - Accuracy (data makes sense)
   - Consistency (no contradictions)
   - Data quality issues

### Approving a Submission

1. View the submission
2. Click **Approve** button at the top
3. Confirm approval in the modal
4. Click **Approve** to confirm

**What happens:**
- Status changes to "Approved"
- Submission becomes immutable
- Notification sent to submitter
- Included in approved data reports

**Authorization:**
- Admins can approve any submission
- Non-admins can only approve submissions from descendant institutions

### Rejecting a Submission

1. View the submission
2. Click **Reject** button at the top
3. Enter rejection comments (minimum 10 characters)
   - Be specific about what needs correction
   - Provide clear guidance for resubmission
4. Click **Reject** to confirm

**Example Rejection Comments:**
```
❌ Poor: "Fix the data"
✓ Good: "Patient age (Q2) appears incorrect - please verify.
         Treatment cost (Q5) is missing currency denomination."
```

**What happens:**
- Status changes to "Rejected"
- Rejection comments saved
- Notification sent to submitter
- Submitter can edit and resubmit

**Rejection Comments Display:**
- Red banner appears at top of submission form
- Shows rejection reason
- Prompts user to address issues

---

## Monitoring Offline Submissions & Sync

### Overview

The application now supports **offline functionality** through Progressive Web App (PWA) technology. Enumerators can create and edit submissions without internet connection, and data automatically syncs when connection is restored.

As an administrator, you should be aware of:
- How offline mode works for your enumerators
- How to monitor sync status of submissions
- How to troubleshoot sync issues
- Best practices for supporting offline users

### How Offline Mode Works

**For Enumerators:**

When internet connection is lost:
1. Enumerators can continue working on submissions
2. Data is saved locally in browser storage (IndexedDB)
3. Auto-save occurs every 30 seconds
4. Files can be attached (up to 50MB per file, 500MB total)
5. When connection returns, data syncs automatically to server

**Connection Status Indicator:**
- 🟢 **Online** - Connected, all data synced
- 🟠 **Offline** - No connection, saving locally
- 🔵 **Syncing...** - Uploading data to server
- 🟠 **Sync (X)** - X items waiting to sync (clickable)

### Sync Status in Submissions List

As an admin, you can see sync status for all submissions:

**Sync Status Badges:**

| Badge | Meaning | Admin Action |
|-------|---------|--------------|
| ✓ **Synced** (green) | Saved to server, current | No action needed |
| ⏳ **Pending** (orange, spinning) | Waiting to upload from user's device | Wait for user to come online |
| ⚠️ **Sync Error** (red) | Failed to sync (connection/server issue) | Investigate error, contact user |

**Filtering by Sync Status:**

1. Go to **Submissions** page
2. Use sync status filter:
   - **All** - Show all submissions regardless of sync status
   - **Synced** - Show only server-saved submissions (reliable data)
   - **Pending (X)** - Show unsynced items (number shows count)

**Important Notes:**

- **Pending submissions** are still on user's device, not yet on server
- If user clears browser data before syncing, pending data is LOST
- Encourage users to sync before closing browser or clearing cache

### Understanding Sync Process

**Sync Priority Queue:**

1. **High Priority** (synced first):
   - Submissions marked as "Submitted" (waiting for your approval)

2. **Normal Priority**:
   - Draft submissions

3. **After Submissions**:
   - File attachments

**Automatic Sync:**
- Triggers 500ms after connection is restored
- Runs in background
- Progress shown to user via toast notification
- Max 5 retry attempts per item with exponential backoff

**Manual Sync:**
- User can click "Sync (X)" button to trigger immediately
- Useful before deadlines or browser closure

### Conflict Resolution

**What happens if user edits offline while someone else (or admin) edits online?**

The system uses **per-question merge strategy**:

✅ **User's local changes WIN** for questions they modified offline
✅ **Server changes WIN** for questions user didn't touch
✅ **Automatically resolved** - no manual intervention needed
✅ **Conflicts logged** for administrator review (backend logs)

**Example Scenario:**

```
Enumerator (offline):         Admin (online):
- Question 1: "New answer"    - Question 1: "Admin edit"
- Question 2: (unchanged)     - Question 2: "Server edit"
- Question 3: "My edit"       - Question 3: (unchanged)

Result after sync:
- Question 1: "New answer"    ← Enumerator wins (modified offline)
- Question 2: "Server edit"   ← Server wins (not touched offline)
- Question 3: "My edit"       ← Enumerator wins (modified offline)
```

**Admin Actions:**
- Review submissions carefully for potential conflicts
- Check backend logs for conflict reports
- If data looks suspicious, reject with clarification request

### Monitoring Offline Users

**Dashboard Indicators:**

While the dashboard doesn't show "offline users" directly, you can:
1. Monitor **Pending Approvals** count
2. Check for submissions with "Pending" sync status
3. Review submission timestamps (long gaps may indicate offline work)

**Submission List Indicators:**

Look for:
- 🟠 **Pending** badges - user created offline, not yet synced
- Recent submissions with sync errors - may need user follow-up
- Multiple submissions from same user in short time - possible offline batch sync

### Supporting Offline Enumerators

**Best Practices to Communicate:**

✅ **Before Going Offline:**
- Load all needed questionnaires (cache them)
- Sync any pending work
- Check storage space available

✅ **While Offline:**
- Save frequently (auto-save runs every 30 seconds)
- Monitor storage usage
- Keep track of created submissions

✅ **After Returning Online:**
- Wait for auto-sync to complete
- Verify "Synced ✓" badges appear
- Check for "Sync Error" badges
- Retry failed syncs if any

**Storage Limits:**

Educate users about:
- **50MB per file** maximum
- **500MB total** offline storage
- Storage automatically freed when files sync
- Need to sync regularly to free space

### Troubleshooting Sync Issues

**Problem:** User reports "Sync keeps failing"

**Admin Actions:**

1. **Check Server Logs:**
   - Look for API errors during sync
   - Check database connection issues
   - Verify storage quotas not exceeded

2. **Verify Network:**
   - Confirm server is accessible
   - Check for firewall issues
   - Test API endpoints are responding

3. **User-Side Actions:**
   - Ask user to try manual sync (click "Sync (X)" button)
   - Ask user to refresh page and retry
   - Check if user has stable connection
   - Try different network (WiFi vs mobile data)

4. **Data Recovery:**
   - If sync impossible, ask user to copy data manually
   - User can screenshot or export answers
   - Create new submission from copied data

---

**Problem:** User says "Submission disappeared after closing browser"

**Explanation:**

- Data was saved locally but not synced to server
- User cleared browser cache or storage
- Browser storage was automatically cleared by OS

**Prevention:**
- Educate users to always sync before closing browser
- Look for "Synced ✓" confirmation
- Don't clear browser data if pending syncs exist

---

**Problem:** Admin sees duplicate submissions from same user

**Possible Causes:**

1. User created multiple versions offline
2. Sync retry created duplicate (shouldn't happen with current implementation)
3. User manually created multiple times

**Admin Actions:**
- Review both submissions
- Keep the most complete/accurate one
- Delete or reject duplicates
- Educate user on checking existing drafts before creating new

---

**Problem:** File attachments missing from submission

**Possible Causes:**

1. Files still pending upload (check sync status)
2. File sync failed (network issue during upload)
3. User attached files offline but didn't sync

**Admin Actions:**
- Check submission sync status
- Ask user to check their pending syncs
- Request user to re-attach files if necessary
- Check server logs for upload errors

---

### Data Safety & Recovery

**Server is Source of Truth:**

- Only **synced** submissions are permanently stored
- **Pending** submissions are vulnerable (local browser storage only)
- Browser storage can be cleared by user or OS
- Always encourage frequent syncing

**No Server-Side Recovery for Unsynced Data:**

- If user clears browser data before syncing: **data is lost**
- If user's device crashes before syncing: **data is lost**
- Server cannot recover data that never synced

**Best Practices:**

✅ Educate users to sync before:
- Closing browser
- Clearing cache
- End of work session
- Important deadlines

✅ Monitor for pending submissions:
- Filter by "Pending" status
- Follow up with users who have long-pending items
- Remind users to sync during team meetings

### Browser Compatibility & Requirements

**Offline Mode Requirements:**

The offline functionality requires:
- **IndexedDB support** (all modern browsers)
- **Service Worker support** (PWA)
- **Sufficient storage quota** (at least 500MB available)

**Supported Browsers:**

✅ Fully Supported:
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

**User Browser Issues:**

If users report offline mode not working:
1. Check browser version (must meet minimum requirements)
2. Verify browser storage is enabled (not in private/incognito mode)
3. Check available storage space
4. Try different browser

### Monitoring Backend Services

**Server-Side Requirements:**

Ensure these services are running:
- **API endpoints** - `/api/submissions/*` must be accessible
- **File upload endpoint** - `/api/submissions/files/upload`
- **Database** - Must accept synced submissions
- **Storage** - Server must have space for uploaded files

**Health Checks:**

Regular monitoring:
- API response times
- Database connection pool
- File storage usage
- Error rates in logs

**Logs to Monitor:**

Look for these log patterns:
```
[FileSync] Uploading file xyz.jpg (2.5 MB)
[FileSync] File xyz uploaded successfully
[SyncService] Syncing submission abc-123
[SyncService] Submission abc-123 synced successfully
[MergeService] Conflict detected: Question 5 (local wins)
```

### User Training Recommendations

**Topics to Cover:**

1. **Connection Status Awareness**
   - How to read connection indicators
   - What each status means
   - When to manually sync

2. **Offline Best Practices**
   - Preparing before going offline
   - Storage limits and management
   - Syncing after returning online

3. **Data Safety**
   - Importance of syncing regularly
   - Risk of clearing browser data
   - Checking for "Synced ✓" confirmation

4. **Troubleshooting**
   - What to do if sync fails
   - How to retry failed syncs
   - When to contact admin

**Training Materials:**

- Provide **Enumerator Guide** (includes offline section)
- Provide **Offline Usage Guide** (comprehensive end-user guide)
- Conduct hands-on training sessions
- Create quick reference cards for field staff

---

## Language Management

### Overview (Phase 6: Localization)

**Phase 6** introduced comprehensive internationalization support with English and Lao languages. The system now supports:

- Multi-language user interface
- Per-user language preferences
- Automatic language detection
- Locale-aware date formatting
- Language switching without page reload

### Supported Languages

**Current Languages:**

1. **English (en)** - Default language
   - Full interface translation
   - Date format: MM/DD/YYYY
   - 12-hour time format

2. **Lao (lo)** - Full Unicode support
   - Complete Lao translation
   - Proper Lao script rendering
   - Date format: DD/MM/YYYY
   - 24-hour time format

### Changing Your Language

**Using Language Switcher:**

1. Look for **globe icon** (🌐) in top-right corner of navigation
2. Click globe icon to open language dropdown
3. Select your preferred language:
   - **English** - English interface
   - **ລາວ (Lao)** - Lao interface
4. Interface updates immediately

**Language Badge:**
- Shows current language code (EN or LO)
- Located on globe icon
- Updates when language changes

### User Language Preferences

**Automatic Persistence:**

When you change language:

✅ **Saved to your user profile** (if logged in)
- Preference stored in database
- Applied on all devices
- Persists across sessions

✅ **Saved to browser** (localStorage)
- Used if not logged in
- Device-specific setting

**Automatic Language Detection:**

On first visit:
1. System checks your user profile preference
2. If not set, uses browser language setting
3. Falls back to English if language not supported

### What's Translated

**User Interface Elements:**

- Navigation menus
- Button labels
- Form labels and placeholders
- Status messages
- Validation errors
- Success/error notifications
- Table headers
- Modal dialogs

**Feature Areas:**

- **Common:** Shared UI elements (save, cancel, delete, etc.)
- **Authentication:** Login, logout, password changes
- **Dashboard:** Statistics, charts, filters
- **Questionnaires:** Management, versioning, activation
- **Submissions:** Workflow, status transitions, approval
- **Users:** User management, roles, permissions
- **Institutions:** Hierarchy management
- **Departments:** Department administration

**Date and Time:**

All dates display in locale-aware format:

| Format Type | English | Lao |
|-------------|---------|-----|
| Date | Nov 27, 2025 | 27 ພ.ຈ. 2025 |
| Date/Time | Nov 27, 2025, 2:30 PM | 27 ພ.ຈ. 2025, 14:30 |
| Relative | 2 hours ago | 2 ຊົ່ວໂມງກ່ອນ |

### What's NOT Translated

**User-Generated Content:**

The following remain in original language:

❌ Institution names
❌ Department names
❌ User names and emails
❌ Questionnaire titles and descriptions
❌ Question text within surveys
❌ Submission data/answers
❌ Rejection comments
❌ Custom notes

**Recommendation:** For organizations serving both English and Lao users, consider:

- Creating questionnaires in both languages
- Using bilingual naming for institutions/departments
- Providing translations in description fields

### Managing User Language Preferences

**Setting User's Default Language:**

Currently, users set their own language preference via the language switcher. Language preference is automatically saved to their profile.

**Future Enhancement:**

Administrators may gain ability to:
- Set default organization language
- Set default language for new users
- View user language preferences in user list

### Troubleshooting Language Issues

**Problem:** Language switcher not appearing

**Solutions:**
1. Refresh page (Ctrl+R or F5)
2. Clear browser cache
3. Check you're logged in
4. Verify you're on a page with navigation bar

---

**Problem:** Some text not translating

**Solutions:**
1. This may be user-generated content (expected)
2. Check language is fully selected (dropdown closed)
3. Refresh page
4. Report missing translations to administrator

---

**Problem:** Wrong language loading on login

**Solutions:**
1. Change language using language switcher
2. New preference will be saved automatically
3. Next login will use saved preference

---

**Problem:** Date formats look wrong

**Solutions:**
1. Verify correct language selected
2. Dates should match your language:
   - English: Month Day, Year (Nov 27, 2025)
   - Lao: Day Month Year (27 ພ.ຈ. 2025)
3. Contact administrator if persists

### Browser Compatibility

**Language Support:**

All modern browsers support:
- Unicode Lao script
- Language switching
- localStorage for preferences

**Minimum Requirements:**
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

**Font Requirements:**

Lao text requires proper font support:
- Most modern operating systems include Lao fonts
- If Lao text appears as boxes (□□□), install Lao language pack
- Windows: Settings → Time & Language → Language → Add Lao
- macOS: System Preferences → Language & Region → Add Lao
- Linux: Install `fonts-lao` package

---

## Notifications

Real-time notifications keep you informed of submission activities.

### Accessing Notifications

**Notification Bell:**
- Located in top-right corner of header
- Red badge shows unread count
- Click bell icon to open notification panel

**Notification Panel:**
- Shows 10 most recent unread notifications
- Color-coded by type:
  - 🔵 Blue: New submission submitted
  - 🟢 Green: Submission approved
  - 🔴 Red: Submission rejected
- Relative timestamps (e.g., "2 hours ago")
- Click notification to navigate to submission

### Notification Types

**Submission Submitted (for Admins):**
```
Sarah Nakato submitted "Patient Survey Q1" from Kampala District Hospital
2 hours ago
```

**Submission Approved (for Enumerators):**
```
Your submission "Patient Survey Q1" has been approved
1 hour ago
```

**Submission Rejected (for Enumerators):**
```
Your submission "Patient Survey Q1" was rejected
Comments: "Please verify patient age field..."
30 minutes ago
```

### Managing Notifications

**Mark as Read:**
- Click notification → automatically marked as read
- Badge count decreases

**Mark All as Read:**
- Click **Mark all as read** link at bottom of panel
- All notifications marked as read
- Badge clears

**Auto-Refresh:**
- Notifications update every 30 seconds
- Unread count updates automatically
- No page refresh needed

---

## Best Practices

### Institution Management

✅ **DO:**
- Use consistent naming conventions (e.g., "[District] District Hospital")
- Use standard codes (e.g., ISO codes or ministry codes)
- Document hierarchy structure before implementation
- Keep parent-child relationships accurate

❌ **DON'T:**
- Change institution hierarchy frequently (affects permissions)
- Delete institutions with historical data
- Create duplicate codes
- Nest institutions incorrectly

### Department Management

✅ **DO:**
- Use standard department names (HR, Finance, IT, etc.)
- Keep codes short and memorable (2-5 characters)
- Document department responsibilities
- Deactivate instead of delete

❌ **DON'T:**
- Create departments for temporary projects
- Use ambiguous names
- Delete departments with assigned users

### User Management

✅ **DO:**
- Use institutional email addresses
- Enforce strong passwords (8+ characters)
- Assign appropriate roles based on responsibilities
- Review user access quarterly
- Deactivate terminated employees immediately

❌ **DON'T:**
- Share admin accounts
- Create generic accounts (e.g., admin@, info@)
- Assign admin role unnecessarily
- Leave inactive accounts active

### Questionnaire Management

✅ **DO:**
- Test questionnaires thoroughly before activation
- Use version numbers consistently
- Document questionnaire changes
- Create new versions for major changes
- Keep historical versions inactive but available

❌ **DON'T:**
- Edit active questionnaires with existing submissions
- Delete questionnaires with submissions
- Skip testing phase
- Use unclear question wording

### Question Permissions

✅ **DO:**
- Plan permission matrix before questionnaire activation
- Document which department needs access to which data
- Test permissions with non-admin users
- Review and update permissions as needed

❌ **DON'T:**
- Grant excessive permissions
- Forget to save permission changes
- Ignore permission requirements when designing questionnaires
- Change permissions frequently (confuses users)

### Submission Review

✅ **DO:**
- Review submissions promptly (within 24-48 hours)
- Provide clear, specific rejection comments
- Check data quality before approval
- Document review criteria
- Train users on data quality standards

❌ **DON'T:**
- Approve submissions without review
- Provide vague rejection comments
- Let submissions queue up
- Approve obviously incorrect data

---

## Troubleshooting

### Login Issues

**Problem:** Cannot log in with correct credentials

**Solutions:**
1. Check Caps Lock is off
2. Verify email address is correct
3. If account locked: Wait 15 minutes after 5th failed attempt
4. Reset password if forgotten (contact system admin)
5. Check account is active (admin can verify)

---

**Problem:** Locked out after failed login attempts

**Solution:**
- Account automatically unlocks after 15 minutes
- OR contact admin to manually unlock

---

### Institution Issues

**Problem:** Cannot create child institution

**Solutions:**
1. Verify parent institution exists
2. Check institution level hierarchy:
   - Central has no parent
   - Province must have Central parent
   - District must have Province parent
3. Ensure code is unique across system

---

**Problem:** Institution not appearing in dropdown

**Solutions:**
1. Check institution is active
2. Verify you have permission to view institution
3. Check institution hierarchy is correct

---

### Department Issues

**Problem:** Department not appearing in user form

**Solutions:**
1. Check department is active
2. Verify department belongs to selected institution
3. Ensure institution is selected first
4. Refresh page if recently created

---

**Problem:** Cannot delete department

**Solutions:**
1. Check if users are assigned to department (reassign first)
2. Verify you have admin permissions
3. Consider deactivating instead of deleting

---

### User Issues

**Problem:** User cannot see submissions from their institution

**Solutions:**
1. Verify user's institution assignment
2. Check user's role permissions
3. Ensure submissions belong to user's institution or descendants

---

**Problem:** User sees "Forbidden" error when accessing features

**Solutions:**
1. Check user's role (may need different role)
2. Verify user has required permission
3. Check user account is active

---

### Questionnaire Issues

**Problem:** Questionnaire not appearing for enumerators

**Solutions:**
1. Check questionnaire is active
2. Verify SurveyJS JSON is valid
3. Test with admin account first

---

**Problem:** Cannot edit questionnaire SurveyJS JSON

**Solutions:**
1. Validate JSON syntax (use online JSON validator)
2. Ensure JSON follows SurveyJS schema
3. Test JSON in SurveyJS creator first

---

### Permission Issues

**Problem:** Permission matrix not saving

**Solutions:**
1. Check you selected an institution
2. Verify departments exist for selected institution
3. Ensure questionnaire has questions
4. Check for JavaScript errors (browser console)

---

**Problem:** User still sees restricted questions as editable

**Solutions:**
1. Verify permissions were saved
2. Check user's department assignment
3. User may be admin (admins bypass restrictions)
4. Refresh submission page

---

### Submission Issues

**Problem:** Cannot approve submission

**Solutions:**
1. Check submission status is "Submitted"
2. Verify you have approve permission
3. For non-admins: Ensure submission is from descendant institution
4. Check submission is not already approved/rejected

---

**Problem:** Rejection comments not appearing

**Solutions:**
1. Ensure comments were entered (min 10 characters)
2. Check rejection was successful
3. Refresh submission page
4. Verify user is viewing correct submission

---

### Notification Issues

**Problem:** Not receiving notifications

**Solutions:**
1. Check notification bell in header
2. Verify notification panel opens
3. Check browser console for errors
4. Notifications may be marked as read automatically

---

**Problem:** Unread count not updating

**Solutions:**
1. Wait 30 seconds (auto-refresh interval)
2. Refresh page manually
3. Check browser developer console for errors
4. Verify API endpoints are accessible

---

## Support

For additional support:

1. **Check Documentation:** Review this guide and related documentation
2. **Contact System Administrator:** Report issues to your system admin
3. **Developer Support:** For technical issues, contact development team
4. **Feature Requests:** Submit via appropriate channel

---

**Document Version:** 3.0 (Phase 6 - Localization & Performance)
**Last Updated:** November 27, 2025
**For Questions:** Contact your system administrator
