# Administrator Guide

This guide is for system administrators who manage users, institutions, questionnaires, and oversee the submission approval workflow.

## Table of Contents

- [Getting Started](#getting-started)
- [Managing Users](#managing-users)
- [Managing Institutions](#managing-institutions)
- [Managing Questionnaires](#managing-questionnaires)
- [Reviewing Submissions](#reviewing-submissions)
- [Dashboard and Reports](#dashboard-and-reports)
- [Best Practices](#best-practices)

## Getting Started

### First Login

1. Navigate to your application URL (e.g., `http://qi-survey-webapp.test` or `http://localhost:8000`)
2. Log in with the default admin credentials:
   - Email: `admin@example.com`
   - Password: `password`
3. **Important**: Change your password immediately after first login

### Changing Your Password

1. Click on your profile in the top navigation
2. Select "Change Password"
3. Enter your current password and new password
4. Click "Update Password"

### Navigation

As an administrator, you have access to all sections:

- **Dashboard**: Overview statistics and recent activity
- **Users**: Manage user accounts and roles
- **Institutions**: Manage organizational hierarchy
- **Questionnaires**: Create and manage survey forms
- **Submissions**: Review and approve submitted data

## Managing Users

### Creating a New User

1. Navigate to **Users** in the main menu
2. Click **Create User**
3. Fill in the user details:
   - **Name**: Full name of the user
   - **Email**: Must be unique and valid (used for login)
   - **Password**: At least 8 characters
   - **Institution**: Select from dropdown (required)
   - **Role**: Choose one:
     - **Admin**: Full system access
     - **Enumerator**: Can create and edit own submissions
     - **Viewer**: Read-only access
   - **Status**: Active (users must be active to log in)
4. Click **Create User**

### Assigning Roles

Roles determine what users can do in the system:

#### Admin Role
- Full access to all features
- Create and manage users
- Create and manage institutions
- Create and manage questionnaires
- Approve or reject submissions
- View all data across institutions

#### Enumerator Role
- View active questionnaires
- Create new submissions
- Edit draft and rejected submissions
- Submit completed forms for review
- View own submissions only
- View dashboard (limited to own institution)

#### Viewer Role
- View active questionnaires
- View submissions (read-only, limited to own institution)
- View dashboard (limited to own institution)
- Cannot create or edit any data

### Editing Users

1. Navigate to **Users**
2. Find the user in the list
3. Click the **Edit** icon
4. Update any fields except email (email cannot be changed)
5. Click **Update User**

### Deactivating Users

Instead of deleting users, deactivate them to maintain audit trails:

1. Navigate to **Users**
2. Find the user in the list
3. Click the **Edit** icon
4. Set **Status** to "Inactive"
5. Click **Update User**

Inactive users:
- Cannot log in
- Do not appear in user selection dropdowns
- Historical data remains intact

### Resetting User Passwords

If a user forgets their password:

1. Navigate to **Users**
2. Find the user in the list
3. Click the **Edit** icon
4. Enter a temporary password in the **Password** field
5. Click **Update User**
6. Inform the user of their temporary password
7. Ask them to change it immediately upon login

### Account Lockouts

Users are automatically locked out after 5 failed login attempts for 15 minutes. To unlock:

1. Navigate to **Users**
2. Find the locked user
3. Click the **Edit** icon
4. The system will show if the account is locked
5. You can reset the password to unlock the account

## Managing Institutions

Institutions represent the organizational hierarchy of your data collection network.

### Institution Hierarchy

The system supports three levels:

- **Central**: National or headquarters level (top level)
- **Province**: Regional or provincial level (middle level)
- **District**: Local or district level (bottom level)

### Creating an Institution

1. Navigate to **Institutions**
2. Click **Create Institution**
3. Fill in the details:
   - **Name**: Full institution name
   - **Code**: Short unique identifier (e.g., "PROV-01", "DIST-KTM")
   - **Level**: Select central, province, or district
   - **Parent Institution**: Select if this is a province or district level
     - Leave empty for central level
     - Select a central institution for provinces
     - Select a province institution for districts
   - **Status**: Active
4. Click **Create Institution**

### Editing Institutions

1. Navigate to **Institutions**
2. Find the institution in the list
3. Click the **Edit** icon
4. Update fields as needed
5. Click **Update Institution**

### Institution Codes

Institution codes are used for:
- Reporting and data analysis
- Importing data from external systems
- Quick identification in lists

Best practices for codes:
- Keep them short (5-10 characters)
- Use a consistent naming scheme
- Include level prefix (e.g., C-MAIN, P-BAGMATI, D-KTM)
- Avoid special characters

### Deactivating Institutions

1. Navigate to **Institutions**
2. Find the institution
3. Click **Edit**
4. Set **Status** to "Inactive"
5. Click **Update Institution**

Note: Users from inactive institutions can still log in but cannot create new submissions.

## Managing Questionnaires

Questionnaires are survey forms that enumerators fill out. They are defined using SurveyJS JSON format.

### Creating a Questionnaire

#### Step 1: Design the Survey

1. Visit [surveyjs.io/create-free-survey](https://surveyjs.io/create-free-survey)
2. Design your survey using the visual builder:
   - Add pages and questions
   - Set question types (text, number, dropdown, checkboxes, etc.)
   - Configure validation rules
   - Set conditional logic if needed
3. Test your survey using the Preview tab
4. Go to the JSON Editor tab
5. Copy the entire JSON content

#### Step 2: Create in the System

1. Navigate to **Questionnaires**
2. Click **Create Questionnaire**
3. Fill in the details:
   - **Code**: Unique identifier (e.g., "FACILITY-ASSESSMENT")
   - **Version**: Start with 1 for new questionnaires
   - **Title**: Descriptive title shown to users
   - **Description**: Brief explanation of the questionnaire purpose
   - **SurveyJS JSON**: Paste the JSON from SurveyJS builder
   - **Status**: Active (only active questionnaires are visible to enumerators)
4. Click **Create Questionnaire**

### SurveyJS JSON Structure

The JSON should be valid SurveyJS format. Example minimal structure:

```json
{
  "title": "Facility Assessment",
  "pages": [
    {
      "name": "page1",
      "elements": [
        {
          "type": "text",
          "name": "facility_name",
          "title": "Facility Name",
          "isRequired": true
        },
        {
          "type": "dropdown",
          "name": "facility_type",
          "title": "Facility Type",
          "choices": [
            "Hospital",
            "Clinic",
            "Health Post"
          ]
        }
      ]
    }
  ]
}
```

### Editing Questionnaires

1. Navigate to **Questionnaires**
2. Find the questionnaire
3. Click **Edit**
4. Update fields as needed
5. Click **Update Questionnaire**

**Warning**: Changing the SurveyJS JSON of an active questionnaire may affect:
- Incomplete submissions (drafts)
- Data consistency for analysis

Consider duplicating instead of editing if submissions already exist.

### Versioning Questionnaires

When you need to modify a questionnaire that already has submissions:

1. Navigate to **Questionnaires**
2. Find the questionnaire
3. Click **Duplicate**
4. The system creates a copy with version incremented
5. Edit the duplicated questionnaire
6. Deactivate the old version
7. Activate the new version

This approach:
- Preserves historical data with old version
- Ensures data integrity
- Maintains audit trail

### Activating and Deactivating

**To Activate a Questionnaire:**
1. Navigate to **Questionnaires**
2. Find the questionnaire
3. Click **Edit**
4. Set **Status** to "Active"
5. Click **Update Questionnaire**

**To Deactivate:**
1. Follow same steps but set **Status** to "Inactive"

Effects of deactivation:
- Questionnaire no longer appears in enumerator's list
- Existing submissions remain accessible
- No new submissions can be created
- Can be reactivated at any time

### Deleting Questionnaires

Only questionnaires without any submissions can be deleted:

1. Navigate to **Questionnaires**
2. Find the questionnaire
3. Click the **Delete** icon
4. Confirm deletion

Note: If a questionnaire has submissions, you must deactivate it instead.

## Reviewing Submissions

As an admin, you review submissions from enumerators and either approve or reject them.

### Viewing Submissions

1. Navigate to **Submissions**
2. Use filters to find specific submissions:
   - **Questionnaire**: Filter by survey type
   - **Institution**: Filter by submitting institution
   - **Status**: Filter by draft, submitted, approved, or rejected
   - **Date Range**: Filter by submission date
3. Click on a submission to view details

### Submission Statuses

- **Draft**: Enumerator is still working on it
- **Submitted**: Ready for review (this is what you focus on)
- **Approved**: You have approved the submission
- **Rejected**: You rejected with comments for revision

### Approving a Submission

1. Navigate to **Submissions**
2. Filter by **Status: Submitted**
3. Click on a submission to review
4. Review all answers carefully
5. If the data is correct and complete:
   - Click **Approve**
   - Confirm the approval

Effects of approval:
- Status changes to "Approved"
- Data is now considered final
- Enumerator cannot edit it anymore
- Data is included in reports

### Rejecting a Submission

If data is incorrect or incomplete:

1. Navigate to **Submissions**
2. Click on the submitted entry
3. Click **Reject**
4. Enter detailed rejection comments:
   - Be specific about what needs correction
   - Reference question names if possible
   - Provide examples of correct format
5. Click **Submit Rejection**

Effects of rejection:
- Status changes to "Rejected"
- Enumerator receives notification
- Enumerator can edit and resubmit
- Your comments are visible to the enumerator

### Rejection Comments Best Practices

Good rejection comments:
- "Please verify the patient count in question 5. The number seems too low compared to previous months."
- "The facility code must be in format XXX-YYY. Currently shows: ABC123"
- "Questions 10-15 are required but left blank. Please complete all required fields."

Poor rejection comments:
- "Wrong data"
- "Fix it"
- "Incomplete"

### Bulk Actions

To review multiple submissions efficiently:

1. Filter submissions by institution or questionnaire
2. Open each in a new tab
3. Review and approve/reject from each tab
4. Use browser back button to return to list

### Viewing Submission History

Each submission shows:
- **Created**: When the draft was first created
- **Submitted**: When enumerator submitted for review
- **Approved/Rejected**: When you took action
- **Created By**: Which enumerator created it
- **Institution**: Which institution it belongs to
- **Actions**: Who approved/rejected and when

## Dashboard and Reports

### Dashboard Overview

The admin dashboard shows:
- Total users by role
- Total institutions by level
- Total questionnaires (active vs inactive)
- Total submissions by status
- Recent submission activity
- Submissions pending review

### Interpreting Statistics

**Submissions by Status:**
- High draft count: Enumerators may need training or questionnaires may be too complex
- High rejected count: Quality issues or unclear requirements
- Low submission rate: Follow up with enumerators

**Submissions by Institution:**
- Compare performance across institutions
- Identify institutions needing support
- Track data collection progress

### Exporting Data

Currently, data export is done via database queries. Common exports:

**All Approved Submissions:**
```sql
SELECT
    s.id,
    q.title as questionnaire,
    i.name as institution,
    u.name as enumerator,
    s.submitted_at,
    s.approved_at,
    s.answers_json
FROM submissions s
JOIN questionnaires q ON s.questionnaire_id = q.id
JOIN institutions i ON s.institution_id = i.id
JOIN users u ON s.created_by = u.id
WHERE s.status = 'approved'
ORDER BY s.approved_at DESC;
```

Note: Future versions will include built-in export functionality.

## Best Practices

### User Management

1. **Create unique emails**: Never reuse email addresses
2. **Use strong passwords**: At least 12 characters with mixed case, numbers, symbols
3. **Assign appropriate roles**: Use least privilege principle
4. **Regular audits**: Review user list quarterly
5. **Deactivate promptly**: Disable accounts when staff leave

### Institution Management

1. **Plan hierarchy first**: Map out your organizational structure before creating institutions
2. **Consistent codes**: Establish a coding scheme and document it
3. **Active status**: Keep the status field updated
4. **Parent relationships**: Verify parent-child relationships are correct

### Questionnaire Management

1. **Test thoroughly**: Always test questionnaires before activating
2. **Use versioning**: Duplicate instead of editing questionnaires with submissions
3. **Clear questions**: Write simple, unambiguous questions
4. **Validation rules**: Set appropriate validation to prevent bad data
5. **Incremental deployment**: Start with a pilot institution before full rollout

### Submission Review

1. **Review promptly**: Aim to review within 24-48 hours
2. **Be thorough**: Check all fields, not just obvious ones
3. **Clear feedback**: Provide specific, actionable rejection comments
4. **Look for patterns**: If multiple submissions have same error, update training
5. **Document standards**: Maintain a reference guide for data quality standards

### Security

1. **Change default passwords**: Immediately on first login
2. **Limit admin accounts**: Only give admin role to trusted personnel
3. **Monitor activity**: Review submission logs regularly
4. **Secure backups**: Ensure database backups are encrypted and stored securely
5. **Log reviews**: Periodically check system logs for suspicious activity

### Performance

1. **Archive old data**: Move old approved submissions to archive tables
2. **Deactivate unused questionnaires**: Keep active list clean
3. **Monitor database size**: Plan for storage growth
4. **Regular maintenance**: Schedule database optimization during off-hours

## Troubleshooting

### User Cannot Log In

1. Check if account is active
2. Check if account is locked (failed login attempts)
3. Verify email is correct
4. Reset password
5. Check browser console for errors

### Questionnaire Not Showing for Enumerators

1. Verify questionnaire status is "Active"
2. Check SurveyJS JSON is valid
3. Clear browser cache
4. Check user has enumerator or viewer role

### Submission Stuck in Draft

1. Contact enumerator to complete and submit
2. Check if questionnaire was deactivated
3. Verify required fields are filled
4. Check browser console for validation errors

### Data Not Saving

1. Check database connection
2. Verify disk space available
3. Check Laravel logs: `storage/logs/laravel.log`
4. Check browser console for errors
5. Verify all required fields are filled

## Support and Training

### Training New Administrators

1. Start with read-only access to observe
2. Practice in a test environment
3. Review this guide thoroughly
4. Shadow experienced admin for first reviews
5. Start with simple approval tasks

### Training Enumerators

As admin, you may need to train enumerators:

1. Refer them to the [Enumerator Guide](enumerator-guide.md)
2. Conduct live training sessions
3. Provide practice questionnaires
4. Review their first submissions together
5. Create reference materials specific to your questionnaires

### Getting Help

For technical issues:
1. Check Laravel logs: `storage/logs/laravel.log`
2. Check browser console (F12 in most browsers)
3. Contact your system administrator
4. Refer to [Setup Guide](setup-guide.md) for configuration issues

## Appendix

### Permissions Reference

| Permission | Admin | Enumerator | Viewer |
|------------|-------|------------|--------|
| users.view | Yes | No | No |
| users.create | Yes | No | No |
| users.update | Yes | No | No |
| users.delete | Yes | No | No |
| institutions.view | Yes | No | No |
| institutions.create | Yes | No | No |
| institutions.update | Yes | No | No |
| institutions.delete | Yes | No | No |
| questionnaires.view | Yes | Yes | Yes |
| questionnaires.create | Yes | No | No |
| questionnaires.update | Yes | No | No |
| questionnaires.delete | Yes | No | No |
| submissions.view | Yes | Yes (own) | Yes (own institution) |
| submissions.create | Yes | Yes | No |
| submissions.update | Yes | Yes (own, if draft/rejected) | No |
| submissions.delete | Yes | Yes (own, if draft) | No |
| submissions.approve | Yes | No | No |
| dashboard.view | Yes | Yes | Yes |

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| Ctrl/Cmd + K | Open search |
| Ctrl/Cmd + S | Save current form |
| Esc | Close modal |
| Tab | Navigate between fields |

### Common Error Messages

| Error | Cause | Solution |
|-------|-------|----------|
| "Email already exists" | Duplicate email | Use unique email address |
| "Invalid JSON" | Malformed SurveyJS JSON | Validate JSON at jsonlint.com |
| "Cannot edit submitted submission" | Status not draft/rejected | Only draft and rejected can be edited |
| "Unauthorized" | Permission denied | Check user role and permissions |
| "Session expired" | Token expired | Log in again |
