# QI Survey Web Application - Enumerator Guide

**Version:** 2.0 (Phase 3 - Offline/PWA Support)
**Last Updated:** November 27, 2025
**Audience:** Data Collectors, Enumerators, Field Staff

---

## Table of Contents

1. [Introduction](#introduction)
2. [Getting Started](#getting-started)
3. [Your Dashboard](#your-dashboard)
4. [Creating Submissions](#creating-submissions)
5. [Working with Surveys](#working-with-surveys)
6. [Editing and Saving](#editing-and-saving)
7. [Working Offline](#working-offline)
8. [Submitting for Approval](#submitting-for-approval)
9. [Handling Rejections](#handling-rejections)
10. [Notifications](#notifications)
11. [Tips and Best Practices](#tips-and-best-practices)
12. [Troubleshooting](#troubleshooting)

---

## Introduction

Welcome to the QI Survey Web Application! This guide will help you collect and submit survey data efficiently. As an enumerator, you are responsible for creating accurate survey submissions and responding to feedback from administrators.

### Your Role

As an **Enumerator**, you can:

✅ View active questionnaires assigned to your institution
✅ Create new survey submissions (drafts)
✅ Edit and save your draft submissions
✅ Submit completed surveys for approval
✅ View feedback on rejected submissions
✅ Edit and resubmit rejected submissions
✅ View your own submission history
✅ Receive notifications about approval status

### What You Cannot Do

❌ View other enumerators' submissions
❌ Approve or reject submissions
❌ Create or modify questionnaires
❌ Manage users or institutions
❌ Edit approved submissions

---

## Getting Started

### Logging In

1. Open your web browser
2. Navigate to your organization's survey system URL (e.g., `https://survey.yourorganization.org`)
3. Enter your login credentials:
   - **Email:** Your assigned email address
   - **Password:** Your password
4. Click **Login** button

**First Time Login:**
- If this is your first time logging in, you should change your password immediately
- Click your name in the top-right corner → **Profile** → **Change Password**

**Account Locked?**
- After 5 failed login attempts, your account will be locked for 15 minutes
- Wait 15 minutes and try again
- Contact your administrator if you forgot your password

### Understanding the Interface

After logging in, you'll see:

**Top Navigation Bar:**
- **QI Survey System** logo (click to go to dashboard)
- **Dashboard** - Your overview page
- **Questionnaires** - View available surveys
- **Submissions** - Manage your submissions
- **Notifications** 🔔 - Bell icon with alerts
- **Your Name** - Click for profile/logout

**Main Content Area:**
- Displays pages, forms, and data tables
- Changes based on which section you're viewing

---

## Your Dashboard

The dashboard shows your work summary at a glance.

### Dashboard Widgets

**My Submissions:**
- Total number of submissions you've created
- Quick link to view all your submissions

**Pending Drafts:**
- Count of incomplete drafts
- Shows submissions you haven't submitted yet
- Click to continue working on drafts

**Submitted (Pending Approval):**
- Submissions waiting for admin review
- Cannot edit these until approved or rejected

**Approved Submissions:**
- Successfully approved submissions
- These are finalized and included in reports

**Rejected Submissions:**
- Submissions returned for corrections
- Red notification badge
- Click to view and fix issues

### Recent Activity

Shows your latest submissions with:
- Questionnaire name
- Submission date
- Current status (Draft, Submitted, Approved, Rejected)

---

## Creating Submissions

### Viewing Available Questionnaires

1. Click **Questionnaires** in the navigation menu
2. View list of active questionnaires:
   - Questionnaire title
   - Description
   - Version number
   - **Create Submission** button

**Note:** You only see questionnaires that are:
- Currently active (published)
- Assigned to your institution

### Starting a New Submission

1. Click **Questionnaires** in the navigation menu
2. Find the questionnaire you need to complete
3. Click **Create Submission** button
4. The survey form opens

**What Happens:**
- A new draft submission is created
- The form displays all survey questions
- You can start entering data immediately
- Your work is NOT visible to administrators until you submit

---

## Working with Surveys

### Understanding the Survey Form

**Form Layout:**
- Questions appear on one or multiple pages
- Required fields are marked with an asterisk (*) or "Required"
- Optional fields can be left blank
- Navigation buttons at bottom (Previous, Next, Save Draft, Submit)

### Question Types

You may encounter various question types:

**Text Input:**
- Single line: For short answers (e.g., name, ID number)
- Multi-line: For longer responses (e.g., comments, descriptions)
- Type your answer directly

**Multiple Choice:**
- Radio buttons: Select ONE option (e.g., Yes/No, Male/Female)
- Checkboxes: Select MULTIPLE options (e.g., symptoms, services)
- Click to select/deselect

**Dropdown:**
- Click the dropdown to see all options
- Select one option from the list
- Search-enabled dropdowns: Type to filter options

**Number Input:**
- Enter numeric values only
- May have minimum/maximum limits
- Examples: age, count, percentage

**Date/Time:**
- Click the calendar icon to select date
- Use date picker or type in format: DD/MM/YYYY
- Time fields use 24-hour format

**Rating Scales:**
- Click stars, numbers, or buttons to rate
- Usually 1-5 or 1-10 scale

**File Upload:**
- Click **Choose File** button
- Select file from your device
- Supported formats depend on question settings

### Read-Only Questions (🔒)

Some questions may appear with a **lock icon (🔒)** and grayed out:

**What This Means:**
- Question is assigned to a different department
- You can VIEW the field but cannot EDIT it
- Someone from the authorized department must fill this field

**Example:**
```
Patient Financial Information 🔒
Treatment Cost: __________ (grayed out, locked)
"You do not have permission to edit this question"
```

**What To Do:**
- Leave locked fields empty
- Continue with questions you CAN edit
- Relevant department staff will complete locked questions

### Multi-Page Surveys

**Navigating Pages:**
- Use **Next** button to go to next page
- Use **Previous** button to go back
- Progress indicator shows current page (e.g., "Page 2 of 5")

**Page Validation:**
- Must complete required fields before moving to next page
- Error messages appear for invalid or missing data
- Fix errors before proceeding

**Tip:** Save your work frequently when working on long surveys!

---

## Editing and Saving

### Saving Your Work as Draft

**Save Draft Button:**
- Located at the bottom of the form
- Click to save your current progress
- Does NOT submit for approval
- You can return later to continue

**When to Save Draft:**
✅ Taking a break from data entry
✅ Need to verify information before completing
✅ Survey is long and you want to work in stages
✅ Internet connection is unstable

**What Happens:**
- All entered data is saved
- Submission status remains "Draft"
- Submission appears in your **Submissions** list
- Only YOU can see and edit it

### Returning to a Draft

1. Click **Submissions** in the navigation menu
2. Look for submissions with **Draft** status
3. Click **Edit** button next to the draft
4. Continue entering data where you left off
5. Save or submit when ready

### Auto-Save Feature

**Offline Auto-Save:**
- When working offline, the system **automatically saves** your work every 30 seconds
- Progress is shown in the offline banner: "Last saved: 2:34 PM"
- Data is stored locally on your device

**Online Manual Save:**
- When online, you must manually click **Save Draft** to save your work
- Data is immediately saved to the server
- Save frequently to prevent data loss!

---

## Working Offline

### Overview

The application now works seamlessly **both online and offline**! You can continue working on submissions even when you lose internet connection, and all your changes will be saved locally on your device.

### Connection Status Indicator

**Location:** Top-right corner of the navigation bar, next to notifications

**Status Indicators:**

| Indicator | Meaning | What You Can Do |
|-----------|---------|-----------------|
| 🟢 **Online** | Connected to internet | All features available |
| 🟠 **Offline** | No internet connection | Create/edit drafts, attach files |
| 🔵 **Syncing...** | Uploading data to server | Wait for sync to complete |
| 🟠 **Sync (3)** | 3 items waiting to sync | Click to manually trigger sync |

### When You Go Offline

When internet connection is lost:

1. **Connection Status** changes to "Offline" (orange dot)
2. **Yellow banner** appears at top of form:
   ```
   ⚠️ You are offline
   Your changes are being saved locally and will sync when you reconnect.
   Last saved: 2:34 PM
   ```
3. **Submit button** becomes disabled
4. **Save button** changes to "Save Locally"

### What You Can Do Offline

✅ **Create new submissions** (saved as drafts on your device)
✅ **Edit existing draft submissions**
✅ **Fill out survey forms** (works exactly the same)
✅ **Attach files** (stored locally, up to 50MB per file)
✅ **Auto-save** every 30 seconds
✅ **View cached questionnaires** (that you've accessed before)

### What You Cannot Do Offline

❌ **Submit for approval** (requires online connection)
❌ **View new questionnaires** (only cached ones available)
❌ **Approve/reject submissions** (admin feature, requires online)
❌ **View other users' new submissions**

### Working Offline - Step by Step

**1. Creating Submissions Offline:**

1. Navigate to Questionnaires
2. Select a questionnaire (must be cached)
3. Click "Create Submission"
4. Fill out the form as normal
5. Click "Save Locally" button
6. Confirmation: "Saved locally - will sync when online"

**2. Editing Submissions Offline:**

1. Go to Submissions list
2. Find your draft submission
3. Click "Edit"
4. Make changes
5. Click "Save Locally"
6. Auto-saves every 30 seconds

**3. Attaching Files Offline:**

1. Click file upload field in the form
2. Select file from your device (max 50MB)
3. File is stored locally
4. Shows "Pending upload" status
5. Files upload automatically when connection returns

**Storage Limits:**
- **Per File:** 50MB maximum
- **Total Storage:** 500MB for all offline files
- Files automatically removed after successful upload to free space

### When Connection Returns

**Automatic Sync:**

1. Connection status changes to "Syncing..." (blue)
2. Submissions sync to server automatically (500ms delay)
3. Files upload after submissions
4. Progress shown in bottom-right toast notification
5. When complete: Connection status shows "Online" (green)

**What Gets Synced:**

- Draft submissions you created offline
- Changes to existing drafts
- File attachments
- All data merged with server

**Sync Priority:**

- **High Priority (synced first):** Submitted submissions
- **Normal Priority:** Draft submissions
- **After Submissions:** File attachments

### Manual Sync

**When to Manually Sync:**

✅ Before important deadline
✅ Before closing browser
✅ To verify data uploaded
✅ If auto-sync didn't trigger

**How to Manually Sync:**

1. Look for orange "Sync (X)" button in top-right corner
2. Number shows how many items waiting to sync
3. Click the "Sync (X)" button
4. Sync starts immediately
5. Progress toast appears in bottom-right
6. Wait for sync to complete

### Sync Status in Submissions List

**Sync Status Badges:**

| Badge | Meaning |
|-------|---------|
| ✓ **Synced** (green) | Saved to server, up-to-date |
| ⏳ **Pending** (orange, spinning) | Waiting to upload |
| ⚠️ **Sync Error** (red) | Failed to sync (check connection) |

**Filtering by Sync Status:**

- **All** - Show all submissions
- **Synced** - Show only server-saved submissions
- **Pending (5)** - Show unsynced items (number shows count)

### Conflict Resolution

**What if you edit offline while someone else edits online?**

The system uses **per-question merge**:

✅ **Your changes WIN** for questions you modified
✅ **Server changes WIN** for questions you didn't touch
✅ **Automatically resolved** - no action needed

**Example:**
```
You (offline):              Server (meanwhile):
- Question 1: "New answer"  - Question 1: "Admin edit"
- Question 2: (unchanged)   - Question 2: "Server edit"
- Question 3: "My edit"     - Question 3: (unchanged)

Result after sync:
- Question 1: "New answer" ← You win (you modified it)
- Question 2: "Server edit" ← Server wins (you didn't touch it)
- Question 3: "My edit" ← You win (you modified it)
```

### Offline Best Practices

✅ **Prepare Before Going Offline:**
- Load all questionnaires you need (view them once to cache)
- Sync any pending submissions
- Check storage space available
- Note which submissions need completion

✅ **While Offline:**
- Save drafts frequently (even with auto-save)
- Monitor storage usage (shown below file upload)
- Keep track of what you've changed
- Don't work on same submission in multiple tabs

✅ **After Returning Online:**
- Wait for auto-sync to complete
- Verify all submissions show "Synced ✓" badge
- Check for any "Sync Error" badges
- Retry failed items if any

### Offline Troubleshooting

**Problem:** Submission won't save offline

**Solutions:**
1. Check browser storage not full
2. Try refreshing the page
3. Check storage usage indicator
4. Delete old offline submissions
5. Contact administrator

**Problem:** Files won't attach offline

**Solutions:**
1. Check file size (max 50MB per file)
2. Check total storage (max 500MB)
3. Reduce file size or compress
4. Sync pending data to free space
5. Delete old files

**Problem:** Sync keeps failing

**Solutions:**
1. Check internet connection
2. Click "Sync (X)" button manually
3. Refresh page and try again
4. Check with administrator (server issue?)
5. Export data locally (copy answers) as backup

**Problem:** "Sync (5)" button doesn't sync

**Solutions:**
1. Verify you're online (check connection status)
2. Close and reopen browser
3. Try different network
4. Wait a few minutes and retry
5. Contact administrator

### Data Safety

**Where Data is Stored:**

- **Offline:** Browser storage (IndexedDB)
- **After Sync:** Server database (permanent)

**Important Notes:**

⚠️ **Browser storage is temporary**
- Can be cleared by browser/OS
- Clearing browser data = data loss
- Always sync to server for permanent storage

⚠️ **Sync frequently**
- Don't rely solely on offline storage
- Sync before closing browser
- Sync before clearing cache
- Sync before important deadlines

⚠️ **Keep browser tab open during sync**
- Don't close browser while syncing
- Wait for "Synced ✓" confirmation
- Check sync status before closing

---

## Submitting for Approval

### When to Submit

Submit when:
✅ All required fields are completed
✅ All data has been verified for accuracy
✅ You've reviewed the entire submission
✅ No locked fields need completion by your department

**Do NOT Submit if:**
❌ Required fields are incomplete
❌ Data contains obvious errors
❌ You're unsure about any answers
❌ Information needs verification

### How to Submit

1. Open your draft submission (if not already open)
2. Review all pages carefully
3. Verify all data is correct
4. Click **Submit** button at the bottom
5. Confirm submission in the popup dialog
6. Click **Submit** to confirm

**What Happens After Submit:**
- Submission status changes to "Submitted"
- Form becomes read-only (you cannot edit)
- Administrators are notified
- Submission enters review queue
- You receive notification when reviewed

### Can I Un-Submit?

**No**, once submitted you cannot un-submit or edit.

**What if I made a mistake?**
- Wait for administrator review
- Administrator may approve it anyway (if minor)
- Administrator may reject it with comments
- If rejected, you can fix and resubmit

---

## Handling Rejections

### Understanding Rejection

When an administrator finds issues with your submission, they may reject it with comments explaining what needs to be corrected.

### Rejection Notification

You'll be notified via:
1. **Notification bell** (🔔) - Red badge appears
2. **Dashboard** - "Rejected Submissions" count increases
3. **Notification panel** - Click bell to see message

**Example Notification:**
```
🔴 Your submission "Patient Survey Q1" was rejected
Comments: "Patient age (Q2) appears incorrect - please verify.
          Treatment cost (Q5) is missing currency denomination."
30 minutes ago
```

### Viewing Rejection Details

1. Click the notification, OR
2. Go to **Submissions** → Filter by **Rejected** status
3. Click **View/Edit** button
4. Red banner at top shows rejection comments

**Rejection Banner:**
```
⚠️ Submission Rejected

Please address the issues above and resubmit:
"Patient age (Q2) appears incorrect - please verify.
Treatment cost (Q5) is missing currency denomination."
```

### Correcting and Resubmitting

1. Read rejection comments carefully
2. Click **Edit** button (or form is already editable)
3. Navigate to the fields mentioned in comments
4. Make necessary corrections
5. Review entire submission again
6. Click **Submit** button when ready
7. Submission returns to "Submitted" status

**Tips for Addressing Rejections:**
✅ Read ALL rejection comments carefully
✅ Fix EVERY issue mentioned
✅ Verify data with source documents
✅ Double-check other fields for similar errors
✅ Add clarifying notes if needed
✅ Review entire form before resubmitting

**Common Rejection Reasons:**
- Missing required information
- Incorrect data format (e.g., date, number)
- Inconsistent data (e.g., age doesn't match date of birth)
- Incomplete sections
- Data doesn't match source documents

---

## Notifications

### Notification Bell 🔔

Located in the top-right corner:
- **Badge with number** - Shows unread notification count
- **Click bell** - Opens notification panel
- **Auto-updates** - Refreshes every 30 seconds

### Types of Notifications

**Submission Approved (Green):**
```
🟢 Your submission "Patient Survey Q1" has been approved
2 hours ago
```
- Good news! Your work is complete
- Submission is finalized
- Included in reports

**Submission Rejected (Red):**
```
🔴 Your submission "Patient Survey Q1" was rejected
Comments: "Please verify patient age field..."
30 minutes ago
```
- Needs your attention
- Read comments and fix issues
- Resubmit when corrected

### Managing Notifications

**View Notification:**
- Click notification to view submission
- Automatically marked as read
- Badge count decreases

**Mark All as Read:**
- Click "Mark all as read" at bottom of panel
- Clears all notifications
- Badge disappears

### Email Notifications

Depending on your system configuration, you may also receive email notifications:
- Check your registered email address
- Emails contain same information as in-app notifications
- Click links in email to go directly to submission

---

## Tips and Best Practices

### Data Entry Best Practices

✅ **Prepare Before Starting:**
- Gather all required documents
- Have patient/participant information ready
- Review questionnaire requirements
- Plan your data collection

✅ **During Data Entry:**
- Save drafts frequently (every 10-15 minutes)
- Verify data as you type
- Use consistent formatting (e.g., dates, names)
- Don't guess - verify uncertain information
- Take breaks on long surveys to maintain accuracy

✅ **Before Submitting:**
- Review all pages carefully
- Check for typos and errors
- Verify calculations and totals
- Ensure all required fields are complete
- Read your comments/notes for clarity

### Time Management

✅ **Schedule Data Entry:**
- Set aside dedicated time for data entry
- Avoid rushing to meet deadlines
- Break long surveys into sessions

✅ **Use Draft Feature:**
- Save partially completed surveys
- Return when you have verified information
- Don't submit incomplete work

✅ **Track Your Work:**
- Check dashboard regularly
- Monitor pending drafts
- Respond to rejections promptly

### Data Quality Tips

✅ **Accuracy is Priority:**
- Double-check numbers and dates
- Verify spelling of names
- Cross-reference with source documents
- Ask for clarification if unsure

✅ **Be Consistent:**
- Use same format throughout (e.g., 01/01/2025 not 1-1-25)
- Follow naming conventions
- Use standard abbreviations

✅ **Avoid Common Errors:**
- Decimal point mistakes (1.5 vs 15)
- Date format confusion (DD/MM vs MM/DD)
- Leaving required fields blank
- Copy-paste errors from previous submissions

### Communication

✅ **With Administrators:**
- Respond to rejection comments promptly
- Ask questions if comments are unclear
- Report system issues immediately
- Provide context in your notes if needed

✅ **With Your Team:**
- Coordinate on shared questionnaires
- Share lessons learned
- Help new enumerators
- Discuss challenging questions

---

## Troubleshooting

### Cannot See Any Questionnaires

**Problem:** Questionnaires page is empty

**Solutions:**
1. Check with administrator - questionnaires may not be activated yet
2. Verify your institution assignment
3. Refresh the page
4. Check your role - you must be enumerator
5. Contact administrator if issue persists

---

### Cannot Edit a Submission

**Problem:** Form fields are grayed out or locked

**Solutions:**

**If submission is "Submitted":**
- This is normal - submitted forms are locked
- Wait for admin to approve or reject
- If rejected, you can edit again

**If submission is "Approved":**
- Approved submissions cannot be edited
- This is permanent - contact admin if critical error

**If specific questions are locked (🔒):**
- These are department-restricted questions
- Only authorized department can edit
- Continue with other questions

---

### Data Not Saving

**Problem:** Clicked Save Draft but data disappeared

**Solutions:**
1. Check your internet connection
2. Look for error messages on screen
3. Try saving again
4. Check **Submissions** list to see if it saved
5. Copy your data to notepad as backup
6. Refresh page and try again
7. Contact administrator if problem continues

---

### Cannot Submit (Button Disabled)

**Problem:** Submit button is grayed out or doesn't work

**Solutions:**
1. Check for error messages on page
2. Ensure all required fields (*) are completed
3. Scroll through all pages to find missing fields
4. Check for validation errors (red text)
5. Try Save Draft first, then Submit
6. Refresh page and try again

---

### Submission Disappeared

**Problem:** Cannot find your submission in the list

**Solutions:**
1. Check **Status** filter - may be filtering wrong status
2. Use search if available
3. Check if someone else submitted it
4. Verify you're logged in with correct account
5. Contact administrator to check database

---

### Locked Out of Account

**Problem:** Cannot log in - account locked message

**Solutions:**
1. Wait 15 minutes (automatic unlock after 5 failed attempts)
2. Try again after waiting period
3. Contact administrator if you forgot password
4. Verify you're using correct email address
5. Check Caps Lock is not on

---

### Notification Not Appearing

**Problem:** Submission was reviewed but no notification

**Solutions:**
1. Click notification bell to refresh
2. Check **Submissions** page directly
3. Wait 30 seconds (auto-refresh interval)
4. Refresh entire page (F5 or Ctrl+R)
5. Check email for notification (if enabled)
6. Contact administrator if issue persists

---

### Form Questions Not Displaying

**Problem:** Survey form is blank or questions missing

**Solutions:**
1. Wait for page to fully load
2. Refresh the page (F5 or Ctrl+R)
3. Clear browser cache
4. Try different browser (Chrome, Firefox, Edge)
5. Check internet connection
6. Contact administrator - questionnaire may have errors

---

### Cannot Upload File

**Problem:** File upload button not working

**Solutions:**
1. Check file size - may be too large
2. Verify file format is allowed
3. Try smaller file or different format
4. Check internet connection
5. Try different browser
6. Contact administrator about file requirements

---

## Frequently Asked Questions

**Q: How long do drafts stay saved?**
A: Drafts remain until you submit or delete them. There's no automatic deletion.

**Q: Can I see other enumerators' submissions?**
A: No, you only see your own submissions. Administrators can see all submissions.

**Q: What happens if I submit incomplete data?**
A: Administrator will likely reject it with comments. You'll need to complete and resubmit.

**Q: Can I delete a submission?**
A: You can delete drafts. Once submitted, approved, or rejected, you cannot delete (contact admin).

**Q: How long does approval take?**
A: Depends on your organization's workflow. Typically 24-48 hours. Check with your administrator.

**Q: Can I work offline?**
A: Yes! The system now works offline. You can create/edit submissions, attach files, and all changes save locally. Data syncs automatically when connection returns.

**Q: What if I disagree with a rejection?**
A: Make corrections as requested, or add clarifying notes. If still concerned, discuss with administrator.

**Q: Can I print my submission?**
A: Usually yes - use browser's print function (Ctrl+P). Or ask administrator for export feature.

**Q: What if I made a typo in an approved submission?**
A: Contact your administrator. Approved submissions cannot be edited by enumerators.

**Q: Who can see locked questions (🔒)?**
A: Users from the authorized department and administrators can edit locked questions.

**Q: How long does offline data stay saved?**
A: Indefinitely until you sync to server or clear browser storage. Always sync for permanent storage.

**Q: What happens if I edit offline and someone else edits the same submission online?**
A: Your changes win for questions you modified. Server changes win for questions you didn't touch. Automatically merged.

**Q: Can I attach large files offline?**
A: Yes, up to 50MB per file and 500MB total. Larger files should be compressed or uploaded when online.

**Q: How do I know if my offline data synced successfully?**
A: Check for green "Synced ✓" badge in submissions list. Connection status will show "Online" when all items synced.

**Q: What if I run out of offline storage space?**
A: Sync pending data (frees space automatically), or delete old offline submissions. You'll see error message if storage full.

---

## Getting Help

**Technical Issues:**
1. Check this guide's Troubleshooting section
2. Contact your IT support
3. Contact system administrator
4. Provide error messages/screenshots

**Data Entry Questions:**
1. Contact your supervisor
2. Refer to questionnaire instructions
3. Ask more experienced enumerators
4. Contact administrator if questionnaire is unclear

**Account Issues:**
1. Contact system administrator
2. Provide your email address and institution
3. Describe the problem clearly

---

## Keyboard Shortcuts

**Form Navigation:**
- `Tab` - Move to next field
- `Shift+Tab` - Move to previous field
- `Enter` - Confirm selection (dropdowns, buttons)
- `Space` - Toggle checkboxes

**Browser:**
- `F5` or `Ctrl+R` - Refresh page
- `Ctrl+S` - Browser save (does NOT save form - use Save Draft button!)

---

## Appendix

### Status Meanings

| Status | What It Means | What You Can Do |
|--------|---------------|-----------------|
| Draft | Work in progress | Edit, Save, Submit, Delete |
| Submitted | Awaiting review | View only, Wait for review |
| Approved | Accepted, finalized | View only |
| Rejected | Needs corrections | Edit, Fix issues, Resubmit |

### Common Error Messages

**"This field is required"**
- Must complete this field before submitting
- Cannot leave blank

**"Invalid format"**
- Data format is wrong (e.g., date, number)
- Follow the format shown in placeholder

**"Value must be between X and Y"**
- Number is outside allowed range
- Enter value within specified limits

**"Account is locked"**
- Too many failed login attempts
- Wait 15 minutes and try again

**"Forbidden"**
- You don't have permission for this action
- Contact administrator

**"Session expired"**
- You were logged out due to inactivity
- Log in again
- Your draft may be saved

---

## Quick Reference Card

**Login:** Use your email and password

**Create Submission:** Questionnaires → Create Submission

**Save Draft:** Click "Save Draft" button frequently

**Submit:** Click "Submit" when complete and verified

**View Notifications:** Click bell icon (🔔) in top-right

**Edit Rejected:** Submissions → Click "Edit" on rejected item

**View Status:** Dashboard or Submissions page

**Get Help:** Contact your administrator

---

**Document Version:** 2.0 (Phase 3 - Offline/PWA Support)
**Last Updated:** November 27, 2025
**For Questions:** Contact your supervisor or system administrator

---

**Remember:** Accurate data is the foundation of good decisions. Take your time, verify your work, and don't hesitate to ask for help when you need it!
