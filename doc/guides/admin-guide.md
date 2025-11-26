# QI Survey Web Application - Administrator Guide

**Version:** 1.0
**Last Updated:** November 26, 2025
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
9. [Notifications](#notifications)
10. [Best Practices](#best-practices)
11. [Troubleshooting](#troubleshooting)

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

### Duplicating a Questionnaire

To create a new version:

1. Click **Duplicate** button next to the questionnaire
2. System creates copy with:
   - Same title + " (Copy)"
   - Same code
   - Version incremented by 1
   - Inactive by default
3. Edit the duplicate to make changes
4. Activate when ready

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

**Document Version:** 1.0
**Last Updated:** November 26, 2025
**For Questions:** Contact your system administrator
