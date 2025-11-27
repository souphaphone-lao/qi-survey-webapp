# Offline Usage Guide

**QI Survey PWA - Working Offline**

This guide explains how to use the QI Survey application while offline, including saving submissions, attaching files, and syncing data when connection is restored.

---

## Table of Contents

1. [Overview](#overview)
2. [Working Offline](#working-offline)
3. [Connection Status](#connection-status)
4. [Creating Submissions Offline](#creating-submissions-offline)
5. [Editing Submissions Offline](#editing-submissions-offline)
6. [Attaching Files Offline](#attaching-files-offline)
7. [Syncing Data](#syncing-data)
8. [Viewing Sync Status](#viewing-sync-status)
9. [Troubleshooting](#troubleshooting)
10. [Best Practices](#best-practices)

---

## Overview

The QI Survey application works seamlessly both online and offline. When you lose internet connection, you can continue working on submissions, and all your changes will be saved locally. When connection is restored, your data automatically syncs to the server.

**Key Features:**
- ✅ Create and edit submissions offline
- ✅ Auto-save every 30 seconds
- ✅ Attach files while offline (up to 50MB per file)
- ✅ Automatic sync when back online
- ✅ Conflict resolution (your changes always win)
- ✅ Visual indicators for offline/sync status

---

## Working Offline

### When Connection is Lost

When you lose internet connection:

1. **Connection Status** changes to "Offline" (orange dot)
2. **Yellow banner** appears: "You are offline"
3. **Submit button** is disabled
4. **Save button** changes to "Save Locally"

**You can still:**
- Fill out questionnaire forms
- Save drafts locally
- Edit existing submissions
- Attach files (stored locally)
- View cached questionnaires

**You cannot:**
- Submit for review (requires online)
- View new questionnaires (not in cache)
- Approve/reject submissions (admin only, requires online)

---

## Connection Status

The connection status is always visible in the top-right corner of the navigation bar.

### Status Indicators

| Indicator | Meaning | Actions Available |
|-----------|---------|-------------------|
| 🟢 **Online** | Connected to internet, all data synced | All features available |
| 🟠 **Offline** | No internet connection | Save drafts, attach files |
| 🔵 **Syncing...** | Uploading data to server | Wait for sync to complete |
| 🟠 **Sync (3)** | 3 items waiting to sync (clickable button) | Click to manually trigger sync |

**Tip:** Click the orange "Sync (X)" button to manually trigger synchronization at any time.

---

## Creating Submissions Offline

### Step-by-Step Process

1. **Navigate to Questionnaires**
   - Go to Questionnaires list
   - Select a questionnaire
   - Click "Create Submission"

2. **Fill Out the Form**
   - Answer all questions as normal
   - Form works exactly the same offline

3. **Save Your Work**
   - Click "Save Locally" button
   - Data saved to your device storage
   - Confirmation: "Saved locally - will sync when online"

4. **Auto-Save**
   - Form auto-saves every 30 seconds while offline
   - Last saved time shown in yellow banner

5. **When Connection Returns**
   - Submission automatically syncs to server
   - You'll see "Syncing..." status
   - Once complete: "Synced" ✓

### Visual Feedback

**While Offline:**
```
┌─────────────────────────────────────────┐
│ ⚠️ You are offline                      │
│ Your changes are being saved locally    │
│ and will sync when you reconnect.      │
│ Last saved: 2:34 PM                     │
└─────────────────────────────────────────┘
```

**When Back Online (Before Sync):**
```
┌─────────────────────────────────────────┐
│ ℹ️ Pending sync                          │
│ This submission has offline changes     │
│ waiting to be synced to the server.    │
└─────────────────────────────────────────┘
```

---

## Editing Submissions Offline

### Editing Drafts

1. **Navigate to Submissions**
   - Go to Submissions list
   - Find your draft submission
   - Click "Edit"

2. **Make Changes**
   - Update answers as needed
   - Changes tracked automatically

3. **Save Changes**
   - Click "Save Locally" (if offline)
   - Click "Save Draft" (if online)

### Conflict Resolution

If you edit a submission offline while someone else edits it online:

**How Conflicts are Resolved:**
- ✅ **Your changes WIN** for questions you modified
- ✅ **Server changes WIN** for questions you didn't touch
- ✅ Automatically resolved - no action needed
- ✅ Conflicts logged for administrator review

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

---

## Attaching Files Offline

### Supported File Types

**Common Types:**
- Images: JPG, PNG, GIF (up to 50MB each)
- Documents: PDF, DOC, DOCX
- Spreadsheets: XLS, XLSX
- Other: As configured by administrator

### File Size Limits

- **Per File:** 50MB maximum
- **Total Storage:** 500MB for all offline files
- **Auto-Cleanup:** Synced files automatically removed to free space

### Attaching Files

1. **Click File Upload Field**
   - In questionnaire form
   - Browse for file on your device

2. **Select File**
   - Choose file from device
   - File validated:
     - Type must be accepted
     - Size must be ≤ 50MB
     - Total storage available

3. **File Saved Locally**
   - File stored in device storage
   - Shows "Pending upload" status

4. **Auto-Upload When Online**
   - Files upload after submission syncs
   - Progress shown: "Uploading photo.jpg... 75%"

### Storage Management

**Check Storage:**
- View "Storage used" below file upload field
- Example: "Storage used: 45.2 MB / 500 MB"

**If Storage Full:**
1. Delete old files or submissions
2. Sync pending data (frees space)
3. Try uploading again

---

## Syncing Data

### Automatic Sync

**Sync happens automatically when:**
1. Connection is restored (after 500ms delay)
2. You manually click "Sync (X)" button
3. You save a submission while online

**Sync Process:**
1. Submissions sync first (in priority order)
2. Files upload after submissions
3. Progress shown in bottom-right toast
4. Connection status shows "Syncing..."

### Manual Sync

**Trigger Manual Sync:**
1. Look for orange "Sync (X)" button in top-right
2. Click the button
3. Sync starts immediately
4. Progress toast appears

**When to Manually Sync:**
- Before important deadline
- Before closing browser
- To verify data uploaded
- If auto-sync didn't trigger

### Sync Priority

**High Priority** (synced first):
- Submitted submissions (waiting for approval)

**Normal Priority:**
- Draft submissions
- File attachments

**Max Retries:** 5 attempts per item before marked as failed

---

## Viewing Sync Status

### In Submissions List

The submissions list shows sync status for each submission.

**Sync Status Badges:**

| Badge | Meaning |
|-------|---------|
| ✓ **Synced** (green) | Saved to server, up-to-date |
| ⏳ **Pending** (orange, spinning) | Waiting to upload |
| ⚠️ **Sync Error** (red) | Failed to sync (check connection) |

**Filter by Sync Status:**
- Click "All" to see all submissions
- Click "Synced" to see server-saved only
- Click "Pending (5)" to see unsynced items

### Sync Progress Toast

When syncing, a toast appears in bottom-right corner:

```
┌────────────────────────────────┐
│ 🔄 Syncing Data         2/5    │
│ ████████░░░░░░░░░░ 40%         │
│ ✓ Syncing submission...        │
│                                │
│ Please keep this tab open      │
│ until sync completes.          │
└────────────────────────────────┘
```

**Progress Information:**
- Current item being synced
- Progress percentage (0-100%)
- Items completed / total items
- Success/error icons

---

## Troubleshooting

### Submission Won't Save

**Problem:** "Save Locally" button doesn't work

**Solutions:**
1. Check browser storage not full
2. Try refreshing the page
3. Check browser console for errors
4. Contact administrator

### File Won't Upload

**Problem:** "File size exceeds maximum"

**Solutions:**
1. Reduce file size (compress image/PDF)
2. Upload smaller file
3. Split into multiple smaller files

**Problem:** "Storage quota exceeded"

**Solutions:**
1. Sync pending submissions (frees space)
2. Delete old offline submissions
3. Wait for synced files to be cleaned up

### Sync Keeps Failing

**Problem:** Items stuck in "Pending" status

**Solutions:**
1. Check internet connection
2. Try manual sync (click "Sync (X)")
3. Refresh page and try again
4. Check with administrator (server issue?)
5. Export data locally (copy answers) as backup

### Data Not Syncing

**Problem:** "Sync (5)" button doesn't sync

**Solutions:**
1. Verify you're online (check connection status)
2. Close and reopen browser
3. Try different network
4. Contact administrator

---

## Best Practices

### General Tips

✅ **DO:**
- Save drafts frequently (auto-save every 30 seconds)
- Sync manually before deadlines
- Keep browser tab open during sync
- Check "Synced" status before closing
- Monitor storage usage

❌ **DON'T:**
- Close browser while syncing
- Submit same form multiple times
- Ignore sync errors
- Let storage fill up completely
- Work on same submission in multiple tabs

### Before Going Offline

**Preparation Checklist:**
1. ✓ Load all questionnaires you need
2. ✓ Sync any pending submissions
3. ✓ Check storage space available
4. ✓ Note which submissions need completion
5. ✓ Download any reference documents

### After Being Offline

**Return-to-Online Checklist:**
1. ✓ Wait for auto-sync to complete
2. ✓ Verify all submissions show "Synced" ✓
3. ✓ Check for any "Sync Error" badges
4. ✓ Retry failed items if any
5. ✓ Confirm submission status (draft/submitted)

### Data Safety

**Backup Strategy:**
- Offline data stored in browser storage
- Clearing browser data = data loss
- Sync frequently to server (permanent storage)
- Don't rely solely on offline storage

**Important:**
- Browser storage is temporary
- Can be cleared by browser/OS
- Always sync before clearing cache
- Export important data periodically

---

## Technical Details

### Storage Location

**Where Data is Stored:**
- Browser IndexedDB (offline submissions)
- Browser Cache (questionnaires, images)
- Server database (after sync)

**Storage Persistence:**
- Persists between browser sessions
- Survives browser restart
- May be cleared if storage full
- Sync transfers to permanent server storage

### Browser Compatibility

**Fully Supported:**
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

**Minimum Requirements:**
- IndexedDB support
- Service Worker support
- 500MB+ storage quota

### Sync Algorithm

**Per-Question Merge:**
1. Fetch latest server version
2. Compare timestamps (server vs local)
3. If server unchanged: use local entirely
4. If server newer:
   - Start with server version
   - Overwrite questions you modified
   - Keep server version for untouched questions

---

## Support

### Need Help?

**Contact:**
- Email: support@example.com
- Help Desk: https://support.example.com
- Documentation: /docs/offline-guide

### Report Issues

**When Reporting:**
1. Describe the problem
2. Steps to reproduce
3. Browser and version
4. Screenshot of error (if any)
5. Connection status at time of issue

---

## FAQ

**Q: How long does data stay offline?**
A: Indefinitely, until you clear browser storage or sync to server. Always sync to server for permanent storage.

**Q: Can I work on multiple submissions offline?**
A: Yes, you can create and edit unlimited submissions offline (storage permitting).

**Q: What happens if I edit offline and someone else edits online?**
A: Your changes win for questions you modified. Server changes win for questions you didn't touch. Auto-resolved.

**Q: Can I attach files larger than 50MB?**
A: No, 50MB per file is the limit. Compress large files or split into smaller files.

**Q: How do I know sync completed successfully?**
A: Check for green "Synced ✓" badge in submissions list. Connection status will show "Online" (green).

**Q: Can I sync on mobile data or must I use WiFi?**
A: Both work. Be aware of mobile data usage when uploading large files.

**Q: What if my device runs out of storage?**
A: Sync pending data (frees space), or delete old offline submissions. You'll see "Storage quota exceeded" error.

**Q: Is offline data encrypted?**
A: Data uses browser's built-in storage security. For sensitive data, sync to server quickly and don't leave in offline storage.

---

**Last Updated:** November 27, 2025
**Version:** 1.0.0 (Phase 3 Complete)
