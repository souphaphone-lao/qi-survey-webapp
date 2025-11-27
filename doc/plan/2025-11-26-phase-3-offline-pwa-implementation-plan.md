# Phase 3: Offline/PWA Capability - Implementation Plan

**Version:** 1.0
**Date:** November 26, 2025
**Status:** Planning
**Estimated Duration:** 6 weeks
**Dependencies:** Phase 2 complete (Multi-Institution & Permissions)

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Goals & Success Criteria](#goals--success-criteria)
3. [Features to Implement](#features-to-implement)
4. [Technical Architecture](#technical-architecture)
5. [Database Schema Changes](#database-schema-changes)
6. [API Endpoints](#api-endpoints)
7. [Frontend Components](#frontend-components)
8. [Implementation Steps](#implementation-steps)
9. [Testing Strategy](#testing-strategy)
10. [Risk Assessment](#risk-assessment)
11. [Performance Considerations](#performance-considerations)
12. [Security Considerations](#security-considerations)
13. [Timeline & Milestones](#timeline--milestones)
14. [Dependencies & Prerequisites](#dependencies--prerequisites)
15. [Acceptance Criteria](#acceptance-criteria)
16. [References](#references)

---

## Executive Summary

Phase 3 transforms the Survey Web Application into a **Progressive Web App (PWA)** with full offline capabilities. This enables field workers to collect data in remote areas with unreliable or no internet connectivity, then automatically synchronize their submissions when connection is restored.

### Key Capabilities

1. **Offline Data Collection**
   - Create and edit submissions without internet connection
   - Store data locally in browser IndexedDB
   - Seamless transition between online and offline modes

2. **Intelligent Sync Engine**
   - Per-question merge strategy to prevent data loss
   - Conflict resolution with last-write-wins approach
   - Automatic retry on failure with exponential backoff

3. **File Management**
   - Attach files (images, documents) while offline (max 2 MB per file)
   - Queue files for upload when back online
   - Progressive file upload with error recovery

4. **PWA Features**
   - Installable on mobile devices (Android/iOS)
   - App-like experience with native feel
   - Offline-first architecture with service worker caching

### Business Value

- **Field Work Enablement:** Data collection in areas with poor connectivity (rural health centers, remote districts)
- **Reduced Data Loss:** Local storage protects against network failures
- **Improved User Experience:** Seamless online/offline transitions without user intervention
- **Cost Savings:** Reduced dependency on stable internet infrastructure

---

## Goals & Success Criteria

### Primary Goals

1. **Enable Offline Submission Creation**
   - Users can create new submissions while offline
   - Form data persists in IndexedDB
   - No data loss if browser closes or crashes

2. **Implement Reliable Sync**
   - Submissions automatically sync when connection restored
   - Per-question merge prevents overwriting other users' work
   - Sync status clearly visible to users

3. **Support Offline File Attachments**
   - Images and documents can be attached offline (≤2 MB)
   - Files stored in IndexedDB as Blobs
   - Files upload before submission sync

4. **PWA Installation**
   - App installable on Android and iOS devices
   - Works like native app (full screen, app icon)
   - Cached for fast loading

### Success Criteria

✅ **Technical Success:**
- [ ] User creates submission offline, syncs successfully when online
- [ ] No data loss during offline → online → offline transitions
- [ ] Sync completes within 30 seconds for typical submission (10 questions, 2 files)
- [ ] App loads in <2 seconds on 4G after initial cache
- [ ] PWA passes Lighthouse audit (Performance: 90+, PWA: 100)

✅ **User Experience Success:**
- [ ] Clear visual indicators for online/offline status
- [ ] Sync progress visible with helpful messages
- [ ] Errors provide actionable guidance (e.g., "File too large for offline")
- [ ] No unexpected behavior during network transitions

✅ **Quality Success:**
- [ ] 100% test coverage for sync logic (unit tests)
- [ ] E2E tests cover critical offline scenarios
- [ ] Zero data corruption issues in testing
- [ ] Performance benchmarks met (NFR-1 to NFR-4)

---

## Features to Implement

### 3.1 PWA Infrastructure

#### 3.1.1 Service Worker Setup
**Description:** Register and configure service worker for offline caching.

**Requirements:**
- Cache app shell (HTML, CSS, JS bundles)
- Cache API responses with network-first strategy
- Cache static assets (images, fonts) with cache-first strategy
- Update notification when new version available
- Background sync for queued submissions (if browser supports)

**Files:**
- `public/service-worker.js` - Service worker script
- `resources/js/utils/serviceWorkerRegistration.ts` - Registration logic
- `vite.config.ts` - PWA plugin configuration

#### 3.1.2 Web App Manifest
**Description:** Configure manifest for installability.

**Requirements:**
- App name: "QI Survey"
- Icons: 192x192, 512x512 (PNG)
- Theme color: Match TailwindCSS primary color
- Display mode: `standalone`
- Start URL: `/`
- Orientation: `any`

**Files:**
- `public/manifest.json` - PWA manifest
- `resources/views/app.blade.php` - Link to manifest

#### 3.1.3 Install Prompt
**Description:** Prompt users to install PWA on mobile devices.

**Requirements:**
- Detect installability (beforeinstallprompt event)
- Show custom install banner (not intrusive)
- Track installation success/failure
- Hide prompt after installation or dismissal

**Files:**
- `resources/js/hooks/useInstallPrompt.ts` - Install prompt hook
- `resources/js/components/common/InstallPrompt.tsx` - UI component

---

### 3.2 IndexedDB Storage (Dexie.js)

#### 3.2.1 Database Schema Design
**Description:** Define IndexedDB tables using Dexie.js.

**Schema:**
```typescript
interface SurveyAppDB {
  questionnaires: {
    id: number;
    code: string;
    version: number;
    title: string;
    surveyjs_json: object;
    permissions: QuestionPermission[];
    cachedAt: Date;
  };

  submissions: {
    id?: number; // Optional for new submissions
    localId: string; // UUID for local submissions
    questionnaireId: number;
    institutionId: number;
    status: 'draft' | 'submitted' | 'approved' | 'rejected';
    answersJson: object;
    synced: boolean;
    syncedAt?: Date;
    createdAt: Date;
    updatedAt: Date;
    modifiedQuestions: string[]; // Track which questions changed locally
  };

  files: {
    id: string; // UUID
    submissionLocalId: string;
    questionName: string;
    fileName: string;
    fileType: string;
    fileSize: number;
    blob: Blob;
    synced: boolean;
    uploadedPath?: string;
    createdAt: Date;
  };

  syncQueue: {
    id?: number;
    type: 'submission' | 'file';
    itemId: string; // submissionLocalId or fileId
    priority: number; // 1=high, 2=normal, 3=low
    attempts: number;
    lastAttemptAt?: Date;
    error?: string;
    createdAt: Date;
  };
}
```

**Files:**
- `resources/js/db/schema.ts` - Database schema definition
- `resources/js/db/db.ts` - Dexie instance export

#### 3.2.2 Storage Management
**Description:** Manage IndexedDB storage quota and eviction.

**Requirements:**
- Check available storage quota
- Warn user when approaching quota (80% used)
- Implement LRU eviction for cached questionnaires
- Never evict unsynced submissions or files
- Provide UI to manually clear cache

**Files:**
- `resources/js/utils/storageManager.ts` - Storage utilities
- `resources/js/hooks/useStorageQuota.ts` - Hook for quota monitoring

---

### 3.3 Offline/Online Detection

#### 3.3.1 Connection Status Monitor
**Description:** Detect and track online/offline state.

**Requirements:**
- Monitor `navigator.onLine` API
- Ping server endpoint for real connectivity check (navigator.onLine unreliable)
- Detect connection type (WiFi, 4G, 3G) if available
- Emit events on status change
- Persist last known state

**Files:**
- `resources/js/hooks/useOnlineStatus.ts` - Online status hook
- `resources/js/utils/connectionMonitor.ts` - Connection detection logic

#### 3.3.2 UI Indicators
**Description:** Visual feedback for connection status.

**Requirements:**
- **Online:** Green dot + "Online" badge in navbar
- **Offline:** Orange dot + "Offline - changes will sync when reconnected" badge
- **Syncing:** Blue dot + "Syncing... (2/5 completed)" with progress
- **Sync Error:** Red dot + "Sync failed - Retry" button
- Toast notification when connection restored
- Banner for extended offline periods (>5 minutes)

**Files:**
- `resources/js/components/common/ConnectionStatus.tsx` - Status indicator
- `resources/js/components/common/SyncProgress.tsx` - Sync progress UI

---

### 3.4 Offline Submission Management

#### 3.4.1 Create Submission Offline
**Description:** Enable submission creation without internet.

**Requirements:**
- Check if questionnaire cached; if not, show error
- Generate local UUID for submission
- Save to IndexedDB immediately on each change
- Auto-save every 30 seconds (debounced)
- Mark as `synced: false`
- Add to sync queue when user clicks "Save" or "Submit"

**Files:**
- `resources/js/hooks/useOfflineSubmission.ts` - Offline submission hook
- `resources/js/pages/submissions/SubmissionForm.tsx` - Modified form component

#### 3.4.2 Edit Submission Offline
**Description:** Edit existing submissions offline.

**Requirements:**
- Load submission from IndexedDB if available
- Track which questions user modified (`modifiedQuestions` array)
- Merge with cached server version if available
- Warn if submission not available offline

**Files:**
- Same as above

#### 3.4.3 View Submissions List Offline
**Description:** Display cached submissions when offline.

**Requirements:**
- Show submissions from IndexedDB
- Display sync status badge (synced ✓ / pending ⏳ / error ⚠️)
- Filter: all / synced / pending
- Disable actions that require server (approve, reject)

**Files:**
- `resources/js/pages/submissions/SubmissionList.tsx` - Modified list component

---

### 3.5 Sync Engine

#### 3.5.1 Sync Orchestrator
**Description:** Central sync coordination logic.

**Requirements:**
- Auto-trigger sync on connection restored
- Manual sync via user button
- Periodic sync (every 5 minutes if online)
- Background sync (if supported by browser)
- Process sync queue in priority order
- Respect sync queue `attempts` limit (max 5)
- Exponential backoff for retries (1s, 2s, 4s, 8s, 16s)

**Files:**
- `resources/js/services/syncService.ts` - Sync orchestration
- `resources/js/hooks/useSyncEngine.ts` - Hook for components

#### 3.5.2 Per-Question Merge Strategy
**Description:** Merge local changes with server changes.

**Algorithm:**
```typescript
function mergeSubmission(local, server) {
  // 1. Fetch latest server version
  const serverSubmission = await fetchSubmission(local.id);

  // 2. If server version is newer than local cache, merge
  if (serverSubmission.updatedAt > local.syncedAt) {
    // Start with server answers
    const merged = { ...serverSubmission.answersJson };

    // Overwrite only questions user modified locally
    for (const questionName of local.modifiedQuestions) {
      merged[questionName] = local.answersJson[questionName];
    }

    return merged;
  } else {
    // Server hasn't changed, use local version
    return local.answersJson;
  }
}
```

**Files:**
- `resources/js/services/mergeService.ts` - Merge logic

#### 3.5.3 Conflict Resolution
**Description:** Handle conflicts when same question edited offline and online.

**Strategy:** **Last-Write-Wins (Local Wins)**
- If user edited question X locally, local value always wins
- Log conflict in console for debugging
- Show notification: "Submission synced (1 conflict resolved)"
- Provide audit trail in backend

**Files:**
- `resources/js/services/conflictResolver.ts` - Conflict detection and logging

#### 3.5.4 Sync Progress Tracking
**Description:** Track and display sync progress.

**Requirements:**
- Track total items in sync queue
- Track completed, pending, failed items
- Emit progress events
- Update UI in real-time
- Show individual item status (submission #123: syncing → synced ✓)

**Files:**
- `resources/js/services/syncService.ts` - Progress tracking
- `resources/js/components/common/SyncProgress.tsx` - UI component

---

### 3.6 File Attachment (Online & Offline)

#### 3.6.1 Online File Upload
**Description:** Attach files when online.

**Requirements:**
- Same as existing implementation (FR-32 to FR-37 in PRD)
- Max 5 MB per file online
- Upload to server immediately
- Return file metadata to store in `answersJson`

**Files:**
- Existing implementation (no changes needed)

#### 3.6.2 Offline File Storage
**Description:** Store files in IndexedDB when offline.

**Requirements:**
- Max 2 MB per file offline (show error if larger)
- Store as Blob in `files` table
- Link to submission via `submissionLocalId`
- Mark as `synced: false`
- Add to sync queue

**Files:**
- `resources/js/utils/fileStorage.ts` - File storage utilities
- `resources/js/hooks/useFileUpload.ts` - Modified file upload hook

#### 3.6.3 File Sync Process
**Description:** Upload files during sync.

**Process:**
```
1. For each unsynced file in submission:
   a. Upload file via POST /api/submissions/{id}/upload
   b. Receive file metadata (path, URL)
   c. Update answersJson with file metadata
   d. Mark file as synced in IndexedDB
   e. Remove Blob from IndexedDB (free space)

2. After all files uploaded:
   a. Sync submission with updated answersJson
   b. Mark submission as synced
```

**Files:**
- `resources/js/services/fileSyncService.ts` - File sync logic

#### 3.6.4 File Size Validation
**Description:** Enforce size limits based on connection status.

**Requirements:**
- Client-side validation before adding to IndexedDB
- If offline and file >2 MB:
  - Show error: "File too large for offline upload (max 2 MB). Please connect to internet."
  - Do not store in IndexedDB
- If online and file >5 MB:
  - Show error: "File too large (max 5 MB)."

**Files:**
- `resources/js/utils/fileValidator.ts` - Validation logic

---

### 3.7 Cache Management

#### 3.7.1 Questionnaire Caching
**Description:** Cache questionnaires for offline use.

**Strategy:**
- **Auto-cache:** When user opens questionnaire while online
- **Manual cache:** "Make available offline" button in questionnaire list
- **TTL:** 24 hours (refresh if older)
- **Eviction:** LRU when storage quota >80%

**Files:**
- `resources/js/services/cacheService.ts` - Cache management
- `resources/js/hooks/useQuestionnairCache.ts` - Caching hook

#### 3.7.2 Submission Caching
**Description:** Cache submissions for offline viewing/editing.

**Strategy:**
- **Auto-cache:** Submissions user created or edited
- **Manual cache:** "Download for offline" button in submission list
- **Limit:** Max 50 submissions cached (configurable)
- **Eviction:** LRU, but never evict unsynced submissions

**Files:**
- `resources/js/services/cacheService.ts` - Cache management
- `resources/js/hooks/useSubmissionCache.ts` - Caching hook

#### 3.7.3 Cache Cleanup
**Description:** Remove stale cache to free storage.

**Requirements:**
- Clear button in settings page
- Options:
  - Clear cached questionnaires
  - Clear cached submissions (only synced ones)
  - Clear all cache
- Confirmation dialog before clearing
- Never delete unsynced data

**Files:**
- `resources/js/pages/settings/CacheSettings.tsx` - Settings UI
- `resources/js/utils/storageManager.ts` - Cleanup logic

---

## Technical Architecture

### 4.1 Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    React Application                         │
│                                                              │
│  ┌──────────────┐      ┌──────────────┐                    │
│  │ Components   │      │   Hooks      │                     │
│  │ - Forms      │◄────►│ - useOnline  │                     │
│  │ - Lists      │      │ - useSync    │                     │
│  │ - Indicators │      │ - useCache   │                     │
│  └──────┬───────┘      └──────┬───────┘                     │
│         │                     │                              │
│         ▼                     ▼                              │
│  ┌──────────────────────────────────┐                       │
│  │        Services Layer            │                       │
│  │  - syncService                   │                       │
│  │  - cacheService                  │                       │
│  │  - mergeService                  │                       │
│  │  - fileSyncService               │                       │
│  │  - connectionMonitor             │                       │
│  └──────┬────────────────────┬──────┘                       │
│         │                    │                              │
│         ▼                    ▼                              │
│  ┌──────────────┐    ┌──────────────┐                      │
│  │  IndexedDB   │    │  API Client  │                      │
│  │  (Dexie.js)  │    │  (Axios)     │                      │
│  └──────────────┘    └──────┬───────┘                      │
│                              │                              │
└──────────────────────────────┼──────────────────────────────┘
                               │
                               │ HTTPS
                               ▼
                      ┌─────────────────┐
                      │  Service Worker │
                      │  - Cache API    │
                      │  - Background   │
                      │    Sync         │
                      └────────┬────────┘
                               │
            ┌──────────────────┼──────────────────┐
            │                  │                  │
            ▼                  ▼                  ▼
    ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
    │ Browser Cache│  │ Laravel API  │  │ PostgreSQL   │
    │ (HTTP Cache) │  │ (Backend)    │  │ (Database)   │
    └──────────────┘  └──────────────┘  └──────────────┘
```

### 4.2 Data Flow

#### 4.2.1 Online Submission Creation
```
User fills form → Save button clicked
  → POST /api/submissions (with answersJson)
  → Server validates & saves
  → Server returns submission object
  → Cache in IndexedDB (marked as synced)
  → Update UI
```

#### 4.2.2 Offline Submission Creation
```
User fills form → Connection lost → Form continues working
  → Auto-save to IndexedDB every 30s
  → User clicks "Save"
  → Save to IndexedDB (synced: false)
  → Add to syncQueue
  → Show "Saved locally - will sync when online"

  [Connection restored]
  → Sync engine triggered
  → Process syncQueue
  → POST /api/submissions (with answersJson)
  → Server returns submission with ID
  → Update IndexedDB (synced: true, update ID)
  → Remove from syncQueue
  → Show notification "Submission synced ✓"
```

#### 4.2.3 Offline Edit with Online Changes
```
[User edits submission offline]
  → Load submission from IndexedDB
  → Track modified questions: ['question1', 'question2']
  → Save changes locally (synced: false)

[Connection restored]
  → Sync engine triggered
  → Fetch latest server version: GET /api/submissions/{id}
  → Compare updatedAt timestamps

  If server is newer:
    → Merge strategy:
      - Start with server.answersJson
      - Overwrite only modified questions with local values
      - Result: merged answersJson
    → PUT /api/submissions/{id} (with merged answers)

  Else (server not changed):
    → PUT /api/submissions/{id} (with local answers)

  → Server validates & saves
  → Update IndexedDB (synced: true)
  → Show notification "Submission synced ✓"
```

### 4.3 Technology Stack

**Frontend:**
- **Dexie.js** ^4.0.0 - IndexedDB wrapper (type-safe, promise-based)
- **Workbox** ^7.0.0 - Service worker helpers (via Vite PWA plugin)
- **vite-plugin-pwa** ^0.20.0 - PWA build configuration
- **uuid** ^9.0.0 - Generate local submission IDs

**Service Worker:**
- **Workbox Strategies:** NetworkFirst, CacheFirst, StaleWhileRevalidate
- **Background Sync API** (if supported)
- **Cache Storage API**

**Browser APIs:**
- **IndexedDB** - Client-side database
- **Service Worker API** - Offline caching and background sync
- **Storage Manager API** - Quota management
- **Navigator.onLine** - Basic connectivity check

---

## Database Schema Changes

### 5.1 Backend Schema Updates

**No database schema changes required** for Phase 3. All offline data stored in browser IndexedDB.

However, we may add optional fields to `submissions` table for audit purposes:

#### 5.1.1 Optional: Sync Audit Fields

```sql
ALTER TABLE submissions
ADD COLUMN synced_from_offline BOOLEAN DEFAULT FALSE,
ADD COLUMN original_created_at TIMESTAMP NULL,
ADD COLUMN sync_conflicts JSONB NULL;
```

**Purpose:**
- `synced_from_offline`: Flag submissions created offline
- `original_created_at`: Original timestamp when created locally (may differ from server `created_at`)
- `sync_conflicts`: Log conflicts during merge (for debugging)

**Note:** This is **optional** and not required for v1. Can be added later for analytics.

---

## API Endpoints

### 6.1 New Endpoints

#### 6.1.1 Connectivity Check
```
GET /api/ping
```

**Purpose:** Check if server is reachable (more reliable than navigator.onLine).

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2025-11-26T10:00:00.000Z"
}
```

**Implementation:**
```php
// app/Http/Controllers/Api/PingController.php
public function ping(): JsonResponse
{
    return response()->json([
        'status' => 'ok',
        'timestamp' => now()->toISOString(),
    ]);
}
```

**Route:**
```php
// routes/api.php
Route::get('/ping', [PingController::class, 'ping'])->middleware('throttle:60,1');
```

---

#### 6.1.2 Batch Submission Sync
```
POST /api/submissions/sync-batch
```

**Purpose:** Sync multiple submissions in one request (optimize offline sync).

**Request:**
```json
{
  "submissions": [
    {
      "localId": "uuid-1",
      "questionnaireId": 1,
      "institutionId": 5,
      "answersJson": { ... },
      "status": "draft",
      "createdAt": "2025-11-26T08:00:00.000Z"
    },
    {
      "localId": "uuid-2",
      ...
    }
  ]
}
```

**Response:**
```json
{
  "results": [
    {
      "localId": "uuid-1",
      "success": true,
      "submission": { "id": 123, ... }
    },
    {
      "localId": "uuid-2",
      "success": false,
      "error": "Validation failed",
      "errors": { ... }
    }
  ]
}
```

**Implementation:**
```php
// app/Http/Controllers/Api/SubmissionController.php
public function syncBatch(Request $request): JsonResponse
{
    $validated = $request->validate([
        'submissions' => 'required|array',
        'submissions.*.localId' => 'required|string',
        'submissions.*.questionnaireId' => 'required|exists:questionnaires,id',
        // ... other fields
    ]);

    $results = [];
    foreach ($validated['submissions'] as $submissionData) {
        try {
            $submission = Submission::create([
                'questionnaire_id' => $submissionData['questionnaireId'],
                'institution_id' => $submissionData['institutionId'],
                'answers_json' => $submissionData['answersJson'],
                'status' => $submissionData['status'],
                'created_by' => auth()->id(),
                'synced_from_offline' => true, // Optional field
            ]);

            $results[] = [
                'localId' => $submissionData['localId'],
                'success' => true,
                'submission' => new SubmissionResource($submission),
            ];
        } catch (\Exception $e) {
            $results[] = [
                'localId' => $submissionData['localId'],
                'success' => false,
                'error' => $e->getMessage(),
            ];
        }
    }

    return response()->json(['results' => $results]);
}
```

**Route:**
```php
Route::post('/submissions/sync-batch', [SubmissionController::class, 'syncBatch'])
    ->middleware('auth:sanctum');
```

**Note:** This is **optional** for v1. Individual sync is simpler. Add batch sync for performance optimization if needed.

---

### 6.2 Modified Endpoints

#### 6.2.1 Get Submission (Enhanced)
```
GET /api/submissions/{id}
```

**Changes:**
- Include `updatedAt` timestamp in response (for merge comparison)
- Include `modifiedBy` user info (for conflict notification)

**Response (existing + enhancements):**
```json
{
  "data": {
    "id": 123,
    "updatedAt": "2025-11-26T10:00:00.000Z",
    "modifiedBy": {
      "id": 42,
      "name": "John Doe"
    },
    ...
  }
}
```

---

#### 6.2.2 Update Submission (Enhanced)
```
PUT /api/submissions/{id}
```

**Changes:**
- Accept `modifiedQuestions` array (optional, for conflict tracking)
- Log sync conflicts if merge occurred

**Request (existing + enhancements):**
```json
{
  "answersJson": { ... },
  "status": "draft",
  "modifiedQuestions": ["question1", "question2"] // Optional
}
```

**Backend Logic:**
```php
// If modifiedQuestions provided, log potential conflicts
if ($request->has('modifiedQuestions')) {
    $serverAnswers = $submission->answers_json;
    $conflicts = [];

    foreach ($request->modifiedQuestions as $question) {
        if (isset($serverAnswers[$question]) &&
            $serverAnswers[$question] !== $request->answersJson[$question]) {
            $conflicts[] = $question;
        }
    }

    if (!empty($conflicts)) {
        // Optional: Log to sync_conflicts field
        $submission->sync_conflicts = [
            'questions' => $conflicts,
            'timestamp' => now(),
        ];
    }
}
```

---

## Frontend Components

### 7.1 New Components

#### 7.1.1 Connection Status Indicator
**File:** `resources/js/components/common/ConnectionStatus.tsx`

**Purpose:** Display online/offline status in navbar.

**UI States:**
- ✅ Online (green dot)
- ⚠️ Offline (orange dot)
- 🔄 Syncing (blue dot with spinner)
- ❌ Sync Error (red dot)

**Implementation:**
```tsx
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { useSyncEngine } from '@/hooks/useSyncEngine';

export function ConnectionStatus() {
  const { isOnline } = useOnlineStatus();
  const { isSyncing, pendingCount, error } = useSyncEngine();

  if (isSyncing) {
    return (
      <div className="flex items-center gap-2 text-blue-600">
        <Spinner size="sm" />
        <span>Syncing... ({pendingCount} pending)</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 text-red-600">
        <XCircleIcon className="w-4 h-4" />
        <span>Sync failed</span>
        <button onClick={handleRetry} className="text-sm underline">
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2 ${isOnline ? 'text-green-600' : 'text-orange-600'}`}>
      <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-600' : 'bg-orange-600'}`} />
      <span>{isOnline ? 'Online' : 'Offline'}</span>
    </div>
  );
}
```

---

#### 7.1.2 Sync Progress Modal
**File:** `resources/js/components/common/SyncProgress.tsx`

**Purpose:** Show detailed sync progress when syncing.

**UI:**
```
┌─────────────────────────────────────┐
│  Syncing Data                       │
├─────────────────────────────────────┤
│  Progress: 3/5 completed            │
│                                     │
│  ✓ Submission #123 synced           │
│  ✓ Submission #124 synced           │
│  ✓ Submission #125 synced           │
│  ⏳ Submission #126 syncing...       │
│  ⏳ Submission #127 pending          │
│                                     │
│  [Progress Bar: 60%]                │
│                                     │
│           [Cancel]                  │
└─────────────────────────────────────┘
```

---

#### 7.1.3 Install Prompt Banner
**File:** `resources/js/components/common/InstallPrompt.tsx`

**Purpose:** Prompt users to install PWA.

**UI:**
```
┌───────────────────────────────────────────────┐
│ 📱 Install QI Survey for offline access       │
│                                               │
│ [Install]  [Not Now]                         │
└───────────────────────────────────────────────┘
```

**Behavior:**
- Show once when installable
- Dismiss on "Not Now" (don't show again for 7 days)
- Hide after installation

---

#### 7.1.4 Offline Warning Banner
**File:** `resources/js/components/common/OfflineWarning.tsx`

**Purpose:** Warn when trying to access features that require internet.

**UI:**
```
┌───────────────────────────────────────────────┐
│ ⚠️ You are offline. Some features are         │
│    unavailable until you reconnect.           │
└───────────────────────────────────────────────┘
```

---

#### 7.1.5 Cache Management Settings
**File:** `resources/js/pages/settings/CacheSettings.tsx`

**Purpose:** Manage offline cache.

**UI:**
- Cache size: 12.5 MB / 50 MB (25%)
- Cached questionnaires: 5
- Cached submissions: 23 (3 pending sync)
- [Clear Cache] button
- [Download for Offline] toggle per questionnaire

---

### 7.2 Modified Components

#### 7.2.1 Submission Form
**File:** `resources/js/pages/submissions/SubmissionForm.tsx`

**Changes:**
- Auto-save to IndexedDB every 30 seconds
- Track modified questions
- Show "Saved locally" indicator when offline
- Disable "Submit" button if offline (can only save as draft)
- Show file size warning when offline (max 2 MB)

---

#### 7.2.2 Submission List
**File:** `resources/js/pages/submissions/SubmissionList.tsx`

**Changes:**
- Load submissions from IndexedDB when offline
- Show sync status badge per submission:
  - ✓ Synced
  - ⏳ Pending sync
  - ⚠️ Sync error
- Filter: All / Synced / Pending
- Disable server actions (approve, reject) when offline

---

#### 7.2.3 App Layout
**File:** `resources/js/components/layout/AppLayout.tsx`

**Changes:**
- Add `<ConnectionStatus />` to navbar
- Show `<OfflineWarning />` banner when offline
- Show `<SyncProgress />` modal when syncing

---

## Implementation Steps

### Week 1: PWA Infrastructure & IndexedDB Setup

#### Step 1.1: Install Dependencies
```bash
npm install dexie@^4.0.0 uuid@^9.0.0 vite-plugin-pwa@^0.20.0 workbox-window@^7.0.0
npm install -D @types/uuid
```

#### Step 1.2: Configure PWA Plugin
**File:** `vite.config.ts`
```typescript
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    // ... existing plugins
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'QI Survey',
        short_name: 'QI Survey',
        theme_color: '#4F46E5', // Indigo
        icons: [
          {
            src: '/icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
          },
        ],
        display: 'standalone',
        start_url: '/',
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/.*\/api\/.*/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24, // 24 hours
              },
            },
          },
        ],
      },
    }),
  ],
});
```

#### Step 1.3: Create IndexedDB Schema
**File:** `resources/js/db/schema.ts`
```typescript
// See section 3.2.1 for schema definition
```

**File:** `resources/js/db/db.ts`
```typescript
import Dexie from 'dexie';
import { SurveyAppDB } from './schema';

export const db = new Dexie('SurveyAppDB') as Dexie & SurveyAppDB;

db.version(1).stores({
  questionnaires: 'id, code, [code+version], cachedAt',
  submissions: 'localId, id, questionnaireId, institutionId, synced, createdAt',
  files: 'id, submissionLocalId, synced',
  syncQueue: '++id, type, itemId, priority, createdAt',
});
```

#### Step 1.4: Test IndexedDB Setup
**File:** `resources/js/__tests__/db/db.test.ts`
```typescript
import { db } from '@/db/db';

describe('IndexedDB Setup', () => {
  afterEach(async () => {
    await db.delete();
    await db.open();
  });

  it('creates database successfully', async () => {
    expect(db.isOpen()).toBe(true);
  });

  it('can insert and retrieve submission', async () => {
    const submission = {
      localId: 'uuid-1',
      questionnaireId: 1,
      institutionId: 1,
      status: 'draft' as const,
      answersJson: { q1: 'answer' },
      synced: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      modifiedQuestions: ['q1'],
    };

    await db.submissions.add(submission);

    const retrieved = await db.submissions.get('uuid-1');
    expect(retrieved).toMatchObject(submission);
  });
});
```

#### Step 1.5: Create Icons
**Task:** Generate PWA icons (192x192, 512x512) and place in `public/icons/`.

**Tools:** Use https://www.pwabuilder.com/imageGenerator or Figma.

---

### Week 2: Online/Offline Detection & UI Indicators

#### Step 2.1: Create Connection Monitor
**File:** `resources/js/utils/connectionMonitor.ts`
```typescript
export class ConnectionMonitor {
  private listeners: Array<(isOnline: boolean) => void> = [];
  private checkInterval: number | null = null;

  constructor() {
    window.addEventListener('online', this.handleOnline);
    window.addEventListener('offline', this.handleOffline);
    this.startPeriodicCheck();
  }

  private handleOnline = () => {
    this.notifyListeners(true);
  };

  private handleOffline = () => {
    this.notifyListeners(false);
  };

  private startPeriodicCheck() {
    // Ping server every 30 seconds to verify real connectivity
    this.checkInterval = window.setInterval(async () => {
      const isReachable = await this.pingServer();
      if (!isReachable && navigator.onLine) {
        // navigator.onLine says online, but server unreachable
        this.notifyListeners(false);
      }
    }, 30000);
  }

  private async pingServer(): Promise<boolean> {
    try {
      const response = await fetch('/api/ping', {
        method: 'GET',
        signal: AbortSignal.timeout(5000),
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  public onChange(callback: (isOnline: boolean) => void) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  }

  private notifyListeners(isOnline: boolean) {
    this.listeners.forEach(listener => listener(isOnline));
  }

  public destroy() {
    window.removeEventListener('online', this.handleOnline);
    window.removeEventListener('offline', this.handleOffline);
    if (this.checkInterval) clearInterval(this.checkInterval);
  }
}

export const connectionMonitor = new ConnectionMonitor();
```

#### Step 2.2: Create useOnlineStatus Hook
**File:** `resources/js/hooks/useOnlineStatus.ts`
```typescript
import { useState, useEffect } from 'react';
import { connectionMonitor } from '@/utils/connectionMonitor';

export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const unsubscribe = connectionMonitor.onChange(setIsOnline);
    return unsubscribe;
  }, []);

  return { isOnline };
}
```

#### Step 2.3: Create ConnectionStatus Component
**File:** `resources/js/components/common/ConnectionStatus.tsx`
```typescript
// See section 7.1.1 for implementation
```

#### Step 2.4: Add to AppLayout
**File:** `resources/js/components/layout/AppLayout.tsx`
```typescript
import { ConnectionStatus } from '@/components/common/ConnectionStatus';

export function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <header>
        {/* ... existing navbar content */}
        <ConnectionStatus />
      </header>
      <main>{children}</main>
    </div>
  );
}
```

#### Step 2.5: Test Connection Detection
**File:** `resources/js/__tests__/hooks/useOnlineStatus.test.ts`
```typescript
import { renderHook, act } from '@testing-library/react';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';

describe('useOnlineStatus', () => {
  it('returns online status', () => {
    const { result } = renderHook(() => useOnlineStatus());
    expect(result.current.isOnline).toBe(navigator.onLine);
  });

  it('updates when connection changes', () => {
    const { result } = renderHook(() => useOnlineStatus());

    act(() => {
      window.dispatchEvent(new Event('offline'));
    });

    expect(result.current.isOnline).toBe(false);

    act(() => {
      window.dispatchEvent(new Event('online'));
    });

    expect(result.current.isOnline).toBe(true);
  });
});
```

---

### Week 3: Offline Submission Creation & Editing

#### Step 3.1: Create Offline Submission Hook
**File:** `resources/js/hooks/useOfflineSubmission.ts`
```typescript
import { useState, useEffect, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { db } from '@/db/db';
import { useOnlineStatus } from './useOnlineStatus';

export function useOfflineSubmission(questionnaireId: number) {
  const { isOnline } = useOnlineStatus();
  const [localId] = useState(() => uuidv4());
  const [answers, setAnswers] = useState({});
  const [modifiedQuestions, setModifiedQuestions] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  // Auto-save every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (!isOnline && Object.keys(answers).length > 0) {
        saveToIndexedDB();
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [answers, isOnline]);

  const saveToIndexedDB = useCallback(async () => {
    setSaving(true);
    try {
      await db.submissions.put({
        localId,
        questionnaireId,
        institutionId: user.institution_id, // From auth context
        status: 'draft',
        answersJson: answers,
        synced: false,
        modifiedQuestions,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Add to sync queue
      await db.syncQueue.add({
        type: 'submission',
        itemId: localId,
        priority: 2, // Normal priority
        attempts: 0,
        createdAt: new Date(),
      });
    } catch (error) {
      console.error('Failed to save to IndexedDB:', error);
    } finally {
      setSaving(false);
    }
  }, [localId, questionnaireId, answers, modifiedQuestions]);

  const updateAnswer = useCallback((questionName: string, value: any) => {
    setAnswers(prev => ({ ...prev, [questionName]: value }));
    setModifiedQuestions(prev =>
      prev.includes(questionName) ? prev : [...prev, questionName]
    );
  }, []);

  const saveSubmission = useCallback(async () => {
    if (isOnline) {
      // Save to server
      const response = await api.submissions.create({
        questionnaire_id: questionnaireId,
        answers_json: answers,
        status: 'draft',
      });
      return response.data;
    } else {
      // Save to IndexedDB
      await saveToIndexedDB();
      return { localId, saved: 'locally' };
    }
  }, [isOnline, questionnaireId, answers, localId, saveToIndexedDB]);

  return {
    localId,
    answers,
    updateAnswer,
    saveSubmission,
    saving,
    savedLocally: !isOnline,
  };
}
```

#### Step 3.2: Modify Submission Form
**File:** `resources/js/pages/submissions/SubmissionForm.tsx`

**Changes:**
```typescript
import { useOfflineSubmission } from '@/hooks/useOfflineSubmission';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';

export function SubmissionForm({ questionnaireId }: { questionnaireId: number }) {
  const { isOnline } = useOnlineStatus();
  const { answers, updateAnswer, saveSubmission, saving, savedLocally } = useOfflineSubmission(questionnaireId);

  // ... rest of component

  return (
    <div>
      {savedLocally && (
        <div className="bg-yellow-50 border border-yellow-200 p-3 rounded">
          📝 Saved locally - will sync when online
        </div>
      )}

      <SurveyJS
        json={questionnaire.surveyjs_json}
        data={answers}
        onValueChanged={(name, value) => updateAnswer(name, value)}
      />

      <button onClick={saveSubmission} disabled={saving}>
        {saving ? 'Saving...' : 'Save Submission'}
      </button>

      {!isOnline && (
        <p className="text-sm text-orange-600">
          You are offline. You can save as draft but cannot submit for review.
        </p>
      )}
    </div>
  );
}
```

#### Step 3.3: Test Offline Submission Creation
**File:** `resources/js/__tests__/hooks/useOfflineSubmission.test.ts`
```typescript
import { renderHook, act, waitFor } from '@testing-library/react';
import { useOfflineSubmission } from '@/hooks/useOfflineSubmission';
import { db } from '@/db/db';

describe('useOfflineSubmission', () => {
  beforeEach(async () => {
    await db.delete();
    await db.open();
  });

  it('saves submission to IndexedDB when offline', async () => {
    // Mock offline
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: false,
    });

    const { result } = renderHook(() => useOfflineSubmission(1));

    act(() => {
      result.current.updateAnswer('q1', 'answer1');
    });

    await act(async () => {
      await result.current.saveSubmission();
    });

    const submissions = await db.submissions.toArray();
    expect(submissions).toHaveLength(1);
    expect(submissions[0].answersJson).toEqual({ q1: 'answer1' });
    expect(submissions[0].synced).toBe(false);
  });
});
```

---

### Week 4: Sync Engine Implementation

#### Step 4.1: Create Merge Service
**File:** `resources/js/services/mergeService.ts`
```typescript
export class MergeService {
  async mergeSubmission(local: LocalSubmission, serverId: number) {
    // Fetch latest server version
    const serverResponse = await api.submissions.get(serverId);
    const server = serverResponse.data;

    // If server version is newer than local cache, merge
    if (new Date(server.updatedAt) > (local.syncedAt || local.createdAt)) {
      console.log('Server version newer, merging...');

      // Start with server answers
      const merged = { ...server.answersJson };

      // Overwrite only questions user modified locally
      for (const questionName of local.modifiedQuestions) {
        if (local.answersJson[questionName] !== merged[questionName]) {
          console.log(`Conflict on ${questionName}: local wins`);
        }
        merged[questionName] = local.answersJson[questionName];
      }

      return merged;
    } else {
      // Server hasn't changed, use local version
      return local.answersJson;
    }
  }
}

export const mergeService = new MergeService();
```

#### Step 4.2: Create Sync Service
**File:** `resources/js/services/syncService.ts`
```typescript
import { db } from '@/db/db';
import { mergeService } from './mergeService';
import { api } from './api';

export class SyncService {
  private isSyncing = false;
  private listeners: Array<(status: SyncStatus) => void> = [];

  async sync() {
    if (this.isSyncing) return;

    this.isSyncing = true;
    this.notifyListeners({ syncing: true, completed: 0, total: 0 });

    try {
      // Get all items in sync queue
      const queueItems = await db.syncQueue.orderBy('priority').toArray();
      const total = queueItems.length;
      let completed = 0;

      for (const item of queueItems) {
        try {
          if (item.type === 'submission') {
            await this.syncSubmission(item.itemId);
          } else if (item.type === 'file') {
            await this.syncFile(item.itemId);
          }

          // Remove from queue
          await db.syncQueue.delete(item.id!);

          completed++;
          this.notifyListeners({ syncing: true, completed, total });
        } catch (error) {
          // Update attempts
          await db.syncQueue.update(item.id!, {
            attempts: item.attempts + 1,
            lastAttemptAt: new Date(),
            error: error.message,
          });

          // If max attempts reached, notify user
          if (item.attempts + 1 >= 5) {
            console.error(`Max attempts reached for ${item.type} ${item.itemId}`);
          }
        }
      }

      this.notifyListeners({ syncing: false, completed, total });
    } finally {
      this.isSyncing = false;
    }
  }

  private async syncSubmission(localId: string) {
    const local = await db.submissions.get(localId);
    if (!local || local.synced) return;

    if (local.id) {
      // Update existing submission
      const mergedAnswers = await mergeService.mergeSubmission(local, local.id);

      await api.submissions.update(local.id, {
        answers_json: mergedAnswers,
        status: local.status,
        modifiedQuestions: local.modifiedQuestions,
      });

      // Mark as synced
      await db.submissions.update(localId, {
        synced: true,
        syncedAt: new Date(),
      });
    } else {
      // Create new submission
      const response = await api.submissions.create({
        questionnaire_id: local.questionnaireId,
        institution_id: local.institutionId,
        answers_json: local.answersJson,
        status: local.status,
      });

      // Update with server ID
      await db.submissions.update(localId, {
        id: response.data.id,
        synced: true,
        syncedAt: new Date(),
      });
    }
  }

  private async syncFile(fileId: string) {
    // See Week 5 for file sync implementation
  }

  public onChange(callback: (status: SyncStatus) => void) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  }

  private notifyListeners(status: SyncStatus) {
    this.listeners.forEach(listener => listener(status));
  }
}

export const syncService = new SyncService();
```

#### Step 4.3: Create useSyncEngine Hook
**File:** `resources/js/hooks/useSyncEngine.ts`
```typescript
import { useState, useEffect } from 'react';
import { syncService } from '@/services/syncService';
import { useOnlineStatus } from './useOnlineStatus';

export function useSyncEngine() {
  const { isOnline } = useOnlineStatus();
  const [syncStatus, setSyncStatus] = useState({
    syncing: false,
    completed: 0,
    total: 0,
  });

  useEffect(() => {
    const unsubscribe = syncService.onChange(setSyncStatus);
    return unsubscribe;
  }, []);

  useEffect(() => {
    // Auto-sync when connection restored
    if (isOnline && !syncStatus.syncing) {
      syncService.sync();
    }
  }, [isOnline]);

  const manualSync = () => {
    if (isOnline) {
      syncService.sync();
    }
  };

  return {
    isSyncing: syncStatus.syncing,
    completed: syncStatus.completed,
    total: syncStatus.total,
    pendingCount: syncStatus.total - syncStatus.completed,
    manualSync,
  };
}
```

#### Step 4.4: Add Sync Progress UI
**File:** `resources/js/components/common/SyncProgress.tsx`
```typescript
// See section 7.1.2 for implementation
```

#### Step 4.5: Test Sync Engine
**File:** `resources/js/__tests__/services/syncService.test.ts`
```typescript
import { syncService } from '@/services/syncService';
import { db } from '@/db/db';
import { api } from '@/services/api';

jest.mock('@/services/api');

describe('SyncService', () => {
  beforeEach(async () => {
    await db.delete();
    await db.open();
    jest.clearAllMocks();
  });

  it('syncs submission to server', async () => {
    // Add submission to IndexedDB
    const localId = 'uuid-1';
    await db.submissions.add({
      localId,
      questionnaireId: 1,
      institutionId: 1,
      status: 'draft',
      answersJson: { q1: 'answer' },
      synced: false,
      modifiedQuestions: ['q1'],
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Add to sync queue
    await db.syncQueue.add({
      type: 'submission',
      itemId: localId,
      priority: 2,
      attempts: 0,
      createdAt: new Date(),
    });

    // Mock API response
    (api.submissions.create as jest.Mock).mockResolvedValue({
      data: { id: 123, ...otherFields },
    });

    // Run sync
    await syncService.sync();

    // Verify API called
    expect(api.submissions.create).toHaveBeenCalledWith({
      questionnaire_id: 1,
      institution_id: 1,
      answers_json: { q1: 'answer' },
      status: 'draft',
    });

    // Verify submission marked as synced
    const submission = await db.submissions.get(localId);
    expect(submission?.synced).toBe(true);
    expect(submission?.id).toBe(123);

    // Verify removed from queue
    const queueItems = await db.syncQueue.toArray();
    expect(queueItems).toHaveLength(0);
  });
});
```

---

### Week 5: File Attachment Support

#### Step 5.1: Create File Storage Utilities
**File:** `resources/js/utils/fileStorage.ts`
```typescript
import { db } from '@/db/db';
import { v4 as uuidv4 } from 'uuid';

export class FileStorage {
  async storeFileOffline(
    submissionLocalId: string,
    questionName: string,
    file: File
  ): Promise<string> {
    // Validate size
    if (file.size > 2 * 1024 * 1024) {
      throw new Error('File too large for offline upload (max 2 MB)');
    }

    // Generate file ID
    const fileId = uuidv4();

    // Store in IndexedDB
    await db.files.add({
      id: fileId,
      submissionLocalId,
      questionName,
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
      blob: file,
      synced: false,
      createdAt: new Date(),
    });

    // Add to sync queue
    await db.syncQueue.add({
      type: 'file',
      itemId: fileId,
      priority: 1, // High priority (upload files before submissions)
      attempts: 0,
      createdAt: new Date(),
    });

    return fileId;
  }

  async getFile(fileId: string): Promise<Blob | null> {
    const file = await db.files.get(fileId);
    return file?.blob || null;
  }

  async deleteFile(fileId: string): Promise<void> {
    await db.files.delete(fileId);
    // Remove from sync queue if not yet synced
    const queueItem = await db.syncQueue.where('itemId').equals(fileId).first();
    if (queueItem) {
      await db.syncQueue.delete(queueItem.id!);
    }
  }
}

export const fileStorage = new FileStorage();
```

#### Step 5.2: Create File Sync Service
**File:** `resources/js/services/fileSyncService.ts`
```typescript
import { db } from '@/db/db';
import { api } from './api';

export class FileSyncService {
  async syncFile(fileId: string): Promise<void> {
    const file = await db.files.get(fileId);
    if (!file || file.synced) return;

    // Get submission (need server ID)
    const submission = await db.submissions.get(file.submissionLocalId);
    if (!submission || !submission.id) {
      throw new Error('Submission not synced yet - sync submission first');
    }

    // Upload file
    const formData = new FormData();
    formData.append('file', file.blob, file.fileName);
    formData.append('question_name', file.questionName);

    const response = await api.submissions.uploadFile(submission.id, formData);

    // Update file record
    await db.files.update(fileId, {
      synced: true,
      uploadedPath: response.data.path,
    });

    // Update submission answersJson with file metadata
    const currentAnswers = submission.answersJson;
    currentAnswers[file.questionName] = response.data;

    await db.submissions.update(file.submissionLocalId, {
      answersJson: currentAnswers,
    });

    // Remove blob to free space
    await db.files.update(fileId, {
      blob: null as any, // Clear blob after successful upload
    });
  }
}

export const fileSyncService = new FileSyncService();
```

#### Step 5.3: Integrate File Sync into Sync Service
**File:** `resources/js/services/syncService.ts`

**Update `syncFile` method:**
```typescript
private async syncFile(fileId: string) {
  await fileSyncService.syncFile(fileId);
}
```

**Update `sync` method to prioritize files:**
```typescript
async sync() {
  // ... existing code

  // Process queue items by priority (files first, then submissions)
  const queueItems = await db.syncQueue.orderBy('priority').toArray();

  // ... rest of sync logic
}
```

#### Step 5.4: Create useFileUpload Hook
**File:** `resources/js/hooks/useFileUpload.ts`
```typescript
import { useState } from 'react';
import { useOnlineStatus } from './useOnlineStatus';
import { fileStorage } from '@/utils/fileStorage';
import { api } from '@/services/api';

export function useFileUpload(submissionId: number | string, questionName: string) {
  const { isOnline } = useOnlineStatus();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const uploadFile = async (file: File) => {
    setUploading(true);
    setError(null);

    try {
      if (isOnline && typeof submissionId === 'number') {
        // Upload to server immediately
        const formData = new FormData();
        formData.append('file', file);
        formData.append('question_name', questionName);

        const response = await api.submissions.uploadFile(submissionId, formData);
        return response.data;
      } else {
        // Store offline
        const maxSize = isOnline ? 5 * 1024 * 1024 : 2 * 1024 * 1024;
        if (file.size > maxSize) {
          throw new Error(
            `File too large (max ${maxSize / 1024 / 1024} MB ${isOnline ? '' : 'for offline'})`
          );
        }

        const fileId = await fileStorage.storeFileOffline(
          submissionId as string, // localId
          questionName,
          file
        );

        return {
          id: fileId,
          name: file.name,
          type: file.type,
          size: file.size,
          stored: 'offline',
        };
      }
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setUploading(false);
    }
  };

  return { uploadFile, uploading, error };
}
```

#### Step 5.5: Test File Upload
**File:** `resources/js/__tests__/utils/fileStorage.test.ts`
```typescript
import { fileStorage } from '@/utils/fileStorage';
import { db } from '@/db/db';

describe('FileStorage', () => {
  beforeEach(async () => {
    await db.delete();
    await db.open();
  });

  it('stores file offline', async () => {
    const file = new File(['test content'], 'test.jpg', { type: 'image/jpeg' });
    const fileId = await fileStorage.storeFileOffline('uuid-1', 'photo', file);

    const stored = await db.files.get(fileId);
    expect(stored).toBeDefined();
    expect(stored?.fileName).toBe('test.jpg');
    expect(stored?.synced).toBe(false);
  });

  it('rejects large files offline', async () => {
    const largeFile = new File([new ArrayBuffer(3 * 1024 * 1024)], 'large.jpg', {
      type: 'image/jpeg',
    });

    await expect(
      fileStorage.storeFileOffline('uuid-1', 'photo', largeFile)
    ).rejects.toThrow('File too large');
  });
});
```

---

### Week 6: Testing, Polish & Documentation

#### Step 6.1: Write E2E Tests
**File:** `tests/e2e/offline-submission.spec.ts`

**Scenarios:**
1. Create submission offline, go online, verify sync
2. Edit submission offline, go online, verify merge
3. Attach file offline, go online, verify upload
4. Network failure during sync, verify retry
5. Install PWA, verify works offline

**Example:**
```typescript
import { test, expect } from '@playwright/test';

test('create submission offline and sync', async ({ page, context }) => {
  // Go to app
  await page.goto('http://localhost:5173');

  // Login
  await page.fill('[name="email"]', 'enumerator@example.com');
  await page.fill('[name="password"]', 'password');
  await page.click('button[type="submit"]');

  // Go offline
  await context.setOffline(true);

  // Create submission
  await page.goto('/questionnaires/1/submissions/new');
  await page.fill('[name="question1"]', 'Answer 1');
  await page.click('button:has-text("Save")');

  // Verify saved locally message
  await expect(page.locator('text=Saved locally')).toBeVisible();

  // Go online
  await context.setOffline(false);

  // Wait for sync
  await expect(page.locator('text=Syncing')).toBeVisible();
  await expect(page.locator('text=Synced ✓')).toBeVisible({ timeout: 10000 });

  // Verify submission on server
  const response = await page.request.get('/api/submissions');
  const submissions = await response.json();
  expect(submissions.data.some(s => s.answers_json.question1 === 'Answer 1')).toBe(true);
});
```

#### Step 6.2: Performance Testing
**Task:** Test sync performance with various scenarios.

**Scenarios:**
- Sync 10 submissions with no files (target: <10 seconds)
- Sync 5 submissions with 2 files each (target: <30 seconds)
- Sync 1 submission with 10 files (target: <60 seconds)

**Tools:** Use Playwright's performance APIs or custom timing logs.

#### Step 6.3: Create User Documentation
**File:** `doc/guides/OFFLINE-USAGE-GUIDE.md`

**Contents:**
- How to install PWA on Android
- How to install PWA on iOS
- How to work offline
- How to check sync status
- Troubleshooting (sync errors, storage full, etc.)

#### Step 6.4: Update Existing Documentation
**Files to update:**
- `doc/guides/ENUMERATOR-GUIDE.md` - Add offline section
- `doc/guides/ADMIN-GUIDE.md` - Add troubleshooting for sync issues
- `CLAUDE.md` - Add offline architecture notes

#### Step 6.5: Create Video Tutorials (Optional)
**Content:**
- Installing PWA on mobile device (2 min)
- Creating submission offline (3 min)
- Understanding sync status (2 min)

**Tools:** Use screen recording software (OBS Studio, QuickTime).

---

## Testing Strategy

### 9.1 Unit Tests

**Coverage Target:** 80%+ for offline logic.

**Key Units to Test:**
- `mergeService.mergeSubmission()` - Merge logic with various scenarios
- `fileStorage.storeFileOffline()` - File storage validation
- `syncService.syncSubmission()` - Sync orchestration
- `connectionMonitor` - Connection detection
- Database operations (Dexie queries)

**Example Test:**
```typescript
describe('MergeService', () => {
  it('merges local changes with server changes', async () => {
    const local = {
      answersJson: { q1: 'local answer', q2: 'local answer' },
      modifiedQuestions: ['q1'],
      syncedAt: new Date('2025-11-20'),
    };

    const server = {
      answersJson: { q1: 'server answer', q2: 'server answer updated' },
      updatedAt: '2025-11-25', // Newer than local
    };

    // Mock API call
    jest.spyOn(api.submissions, 'get').mockResolvedValue({ data: server });

    const merged = await mergeService.mergeSubmission(local, 123);

    // q1: local wins (user modified)
    // q2: server wins (user didn't modify)
    expect(merged).toEqual({
      q1: 'local answer',
      q2: 'server answer updated',
    });
  });
});
```

---

### 9.2 Integration Tests

**Scenarios:**
1. **Offline CRUD Cycle**
   - Create submission offline → Verify in IndexedDB
   - Edit submission offline → Verify updated in IndexedDB
   - Sync → Verify posted to API
   - Verify removed from sync queue

2. **File Upload Cycle**
   - Attach file offline → Verify stored in IndexedDB
   - Sync → Verify uploaded to server
   - Verify answersJson updated with file metadata
   - Verify blob removed from IndexedDB

3. **Conflict Resolution**
   - Edit submission offline (change q1)
   - Edit same submission online (change q2)
   - Sync → Verify both changes preserved

---

### 9.3 E2E Tests (Playwright)

**Critical Paths:**
1. **Happy Path:** Create → Edit → Sync → Verify
2. **Offline Path:** Offline create → Online sync → Verify
3. **Error Path:** Network error during sync → Retry → Success
4. **PWA Install:** Install → Works offline → Sync on reconnect

**Test Matrix:**
| Scenario | Browser | Device | Pass/Fail |
|----------|---------|--------|-----------|
| Offline create + sync | Chrome | Desktop | ✅ |
| Offline create + sync | Safari | iOS | ✅ |
| Offline create + sync | Chrome | Android | ✅ |
| File upload offline | Chrome | Desktop | ✅ |
| Conflict resolution | Chrome | Desktop | ✅ |
| PWA install | Chrome | Android | ✅ |

---

### 9.4 Manual Testing Checklist

**Before Release:**
- [ ] Install PWA on Android device
- [ ] Install PWA on iOS device (Safari)
- [ ] Create submission offline on mobile
- [ ] Attach photo offline on mobile
- [ ] Go underground (no signal), verify app works
- [ ] Return to surface, verify automatic sync
- [ ] Airplane mode on/off cycle, verify behavior
- [ ] Storage full scenario, verify graceful error
- [ ] Clear cache, verify warning before deleting unsynced data

---

## Risk Assessment

### 10.1 Technical Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| **IndexedDB quota exhausted** | Medium | High | Monitor quota usage, warn at 80%, LRU eviction for cached data |
| **Sync conflicts cause data loss** | Medium | Critical | Per-question merge strategy, extensive testing, conflict logging |
| **Service worker caching bugs** | Medium | Medium | Thorough testing, version cache keys, cache invalidation strategy |
| **File sync fails silently** | Low | High | Retry logic, error notifications, sync queue persistence |
| **Browser compatibility issues** (Safari PWA) | Medium | Medium | Test on iOS Safari, provide fallback for unsupported features |
| **Network detection unreliable** | Medium | Medium | Combine navigator.onLine with server ping, periodic checks |

---

### 10.2 User Experience Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| **Users confused by offline indicators** | Medium | Medium | Clear UI messages, user training, help tooltips |
| **Users close browser before sync completes** | High | Medium | Persist sync queue, resume on next open, background sync (if supported) |
| **Users expect real-time collaboration** | Medium | Low | Document async nature, show last modified timestamp and user |
| **Users don't understand storage limits** | Medium | Medium | Display storage usage, proactive warnings, clear error messages |

---

### 10.3 Performance Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| **Slow sync on poor connection** | High | Medium | Progress indicators, resume on failure, optimize payload size |
| **Large forms cause IndexedDB slowness** | Low | Medium | Optimize queries, use indexes, benchmark with realistic data |
| **File uploads stall on 2G** | Medium | Medium | Show upload progress, allow cancel, retry individual files |

---

## Performance Considerations

### 11.1 IndexedDB Performance

**Optimization Strategies:**
- Use compound indexes for common queries (e.g., `[submissionId+synced]`)
- Batch database operations (use `bulkPut` instead of multiple `put`)
- Limit query result size with `limit()` and pagination
- Use `count()` instead of fetching all records when possible

**Benchmarks:**
- Insert 100 submissions: <500ms
- Query 1000 submissions: <200ms
- Update submission: <50ms

---

### 11.2 Sync Performance

**Optimization Strategies:**
- Sync files in parallel (max 3 concurrent uploads)
- Use batch submission sync endpoint (optional)
- Compress large answers JSON (optional, use gzip)
- Skip unchanged fields in PUT requests (send only modified fields)

**Benchmarks:**
- Sync 10 submissions (no files): <5 seconds
- Sync 5 submissions (2 files each): <20 seconds
- Sync 1 submission (10 files, 10MB total): <45 seconds on 4G

---

### 11.3 Service Worker Caching

**Cache Strategy:**
- **App Shell:** Cache-first (HTML, CSS, JS)
- **API:** Network-first with cache fallback
- **Static Assets:** Cache-first (images, fonts)

**Cache Size Limit:** 50 MB (warn at 40 MB, evict oldest at 50 MB)

---

## Security Considerations

### 12.1 Offline Data Security

**Challenge:** Sensitive data stored in browser's IndexedDB.

**Mitigations:**
- IndexedDB data scoped to origin (not accessible by other sites)
- Use HTTPS only (prevent MITM attacks)
- Warn users on public/shared devices (clear cache after session)
- Implement optional encryption for sensitive answers (future enhancement)

**Note:** IndexedDB is NOT encrypted at rest. Browser's OS-level encryption protects data.

---

### 12.2 Sync Authentication

**Challenge:** Ensure sync requests are authenticated.

**Mitigations:**
- All sync API calls include auth token (Sanctum cookie)
- Token expiration handled gracefully (prompt re-login)
- Validate user permissions on server (never trust client data)

---

### 12.3 File Upload Security

**Challenge:** Malicious files uploaded while offline.

**Mitigations:**
- Client-side MIME type validation (UX, not security)
- Server-side MIME type validation (required)
- File size limits enforced on server
- Virus scanning on server (optional, Phase 4+)

---

## Timeline & Milestones

### 13.1 Weekly Breakdown

| Week | Milestone | Deliverables | Success Criteria |
|------|-----------|--------------|------------------|
| **Week 1** | PWA Infrastructure | - PWA plugin configured<br>- IndexedDB schema created<br>- Service worker registered | - App installable on mobile<br>- IndexedDB queries work<br>- Lighthouse PWA score 100 |
| **Week 2** | Online/Offline Detection | - Connection monitor<br>- Status indicators<br>- UI components | - Status changes detected<br>- UI updates in real-time<br>- Server ping works |
| **Week 3** | Offline Submissions | - Offline CRUD hooks<br>- Auto-save logic<br>- Form modifications | - Submissions saved to IndexedDB<br>- Auto-save every 30s works<br>- UI shows saved status |
| **Week 4** | Sync Engine | - Merge service<br>- Sync orchestrator<br>- Sync queue processing | - Submissions sync on reconnect<br>- Conflicts resolved correctly<br>- Sync progress visible |
| **Week 5** | File Attachments | - File storage utilities<br>- File sync service<br>- Upload hooks | - Files stored offline (≤2MB)<br>- Files upload on sync<br>- answersJson updated |
| **Week 6** | Testing & Polish | - E2E tests<br>- Documentation<br>- Bug fixes | - All tests pass<br>- Docs complete<br>- Ready for UAT |

---

### 13.2 Critical Milestones

**Milestone 1: PWA Installable (End of Week 1)**
- App can be installed on mobile devices
- Service worker caching works
- Lighthouse audit passes

**Milestone 2: Offline Create Works (End of Week 3)**
- Users can create submissions offline
- Data persists in IndexedDB
- Auto-save working

**Milestone 3: Sync Engine Functional (End of Week 4)**
- Submissions sync when online
- Conflicts resolved
- Sync status visible

**Milestone 4: Phase 3 Complete (End of Week 6)**
- All features implemented and tested
- Documentation complete
- Ready for UAT

---

## Dependencies & Prerequisites

### 14.1 Prerequisites

**Before Starting Phase 3:**
- ✅ Phase 2 complete (Multi-Institution & Permissions)
- ✅ Submission CRUD fully functional
- ✅ File upload working online
- ✅ Testing infrastructure in place

**Technical Prerequisites:**
- Node.js 18+ (for Vite PWA plugin)
- Modern browsers with IndexedDB support
- HTTPS in production (required for service workers)

---

### 14.2 External Dependencies

**NPM Packages:**
- `dexie@^4.0.0` - IndexedDB wrapper
- `uuid@^9.0.0` - UUID generation
- `vite-plugin-pwa@^0.20.0` - PWA build configuration
- `workbox-window@^7.0.0` - Service worker helpers

**Browser APIs:**
- IndexedDB API
- Service Worker API
- Cache Storage API
- Background Sync API (optional, progressive enhancement)

---

### 14.3 Backend Dependencies

**No new backend dependencies required.**

Existing Laravel API endpoints sufficient for Phase 3. Optional enhancements:
- `POST /api/ping` endpoint for connectivity check (trivial to add)
- `POST /api/submissions/sync-batch` for batch sync (optional optimization)

---

## Acceptance Criteria

### 15.1 Functional Criteria

**Must Have:**
- [ ] User can install PWA on Android and iOS devices
- [ ] User can create submission offline, submission saves to IndexedDB
- [ ] User can edit submission offline, changes persist locally
- [ ] Submissions automatically sync when connection restored
- [ ] Per-question merge prevents data loss during sync
- [ ] Files can be attached offline (max 2 MB), upload on sync
- [ ] Online/offline status clearly visible in UI
- [ ] Sync progress visible with item-by-item status
- [ ] Sync errors show actionable error messages
- [ ] Manual sync button works

**Should Have:**
- [ ] Sync queue persists across browser sessions
- [ ] Exponential backoff for failed sync attempts (max 5)
- [ ] Conflict logging for debugging
- [ ] Cache management settings page
- [ ] Storage quota monitoring and warnings

**Nice to Have:**
- [ ] Background sync (if browser supports)
- [ ] Batch submission sync for performance
- [ ] Sync analytics (success rate, avg time)

---

### 15.2 Performance Criteria

- [ ] PWA Lighthouse audit: Performance 90+, PWA 100
- [ ] App loads in <2 seconds on 4G after cache
- [ ] Sync completes in <30 seconds for typical submission (10 questions, 2 files)
- [ ] IndexedDB queries complete in <200ms
- [ ] File upload shows progress (no frozen UI)

---

### 15.3 Quality Criteria

- [ ] 80%+ code coverage for offline logic (unit tests)
- [ ] All E2E scenarios pass on Chrome, Safari, and mobile browsers
- [ ] Zero data loss in sync testing (100 iterations)
- [ ] No console errors in production build
- [ ] Accessible UI (keyboard navigation, screen reader support)

---

### 15.4 User Experience Criteria

- [ ] Clear visual feedback for all async operations
- [ ] Errors provide helpful guidance (not technical jargon)
- [ ] UI remains responsive during sync (no freezing)
- [ ] Offline mode doesn't feel broken (graceful degradation)
- [ ] Sync "just works" without user intervention

---

## References

### 16.1 Documentation

**Official Docs:**
- **Dexie.js:** https://dexie.org/docs/
- **Vite PWA Plugin:** https://vite-pwa-org.netlify.app/
- **Workbox:** https://developer.chrome.com/docs/workbox/
- **IndexedDB API:** https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API
- **Service Worker API:** https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API

**PWA Resources:**
- **PWA Checklist:** https://web.dev/pwa-checklist/
- **Offline Cookbook:** https://web.dev/offline-cookbook/
- **Add to Home Screen:** https://web.dev/customize-install/

---

### 16.2 Related PRD Sections

**From PRD v2.0:**
- Section 10: Offline/PWA Strategy (lines 1660-1826)
- Section 4.7: File Upload & Attachment (lines 509-571)
- Section 5.3: Availability & Reliability (NFRs)
- Section 6: Security Requirements
- Section 16: Testing Strategy

---

### 16.3 Example Implementations

**Open Source PWA Examples:**
- **Google I/O PWA:** https://github.com/GoogleChrome/ioweb2016
- **Workbox Examples:** https://github.com/GoogleChrome/workbox/tree/main/examples
- **Dexie Todo App:** https://github.com/dexie/Dexie.js/tree/master/samples

---

### 16.4 Department Implementation Reference

**File:** `doc/plan/2025-11-26-department-implementation-summary.md`

**Key Takeaways:**
- Comprehensive testing (100% pass rate)
- Clear file structure documentation
- API examples with request/response
- Migration guide for existing installations
- Known limitations documented upfront

**Apply to Phase 3:**
- Same testing rigor (unit + integration + E2E)
- Document all new files and modifications
- Provide migration guide (though minimal for Phase 3)
- Document limitations (e.g., no background sync on iOS)

---

## Appendix: Quick Reference

### A.1 Key Files Created

**Database:**
- `resources/js/db/schema.ts` - IndexedDB schema
- `resources/js/db/db.ts` - Dexie instance

**Services:**
- `resources/js/services/syncService.ts` - Sync orchestration
- `resources/js/services/mergeService.ts` - Merge logic
- `resources/js/services/fileSyncService.ts` - File sync
- `resources/js/services/cacheService.ts` - Cache management

**Hooks:**
- `resources/js/hooks/useOnlineStatus.ts` - Connection status
- `resources/js/hooks/useSyncEngine.ts` - Sync control
- `resources/js/hooks/useOfflineSubmission.ts` - Offline CRUD
- `resources/js/hooks/useFileUpload.ts` - File uploads

**Components:**
- `resources/js/components/common/ConnectionStatus.tsx` - Status indicator
- `resources/js/components/common/SyncProgress.tsx` - Sync UI
- `resources/js/components/common/InstallPrompt.tsx` - PWA install
- `resources/js/components/common/OfflineWarning.tsx` - Warning banner

**Utilities:**
- `resources/js/utils/connectionMonitor.ts` - Connection detection
- `resources/js/utils/fileStorage.ts` - File storage
- `resources/js/utils/storageManager.ts` - Quota management
- `resources/js/utils/serviceWorkerRegistration.ts` - SW registration

**Configuration:**
- `vite.config.ts` - PWA plugin config
- `public/manifest.json` - Web app manifest

**Documentation:**
- `doc/guides/OFFLINE-USAGE-GUIDE.md` - User guide

---

### A.2 Key Commands

```bash
# Install dependencies
npm install dexie uuid vite-plugin-pwa workbox-window

# Run tests
npm test                     # All tests
npm test -- offline          # Offline tests only
npm test -- --coverage       # With coverage

# Build PWA
npm run build                # Production build with PWA

# Test PWA locally
npm run preview              # Serve production build

# E2E tests
npm run test:e2e             # Run Playwright tests
```

---

### A.3 Troubleshooting

**Issue:** Service worker not updating
**Solution:** Hard refresh (Ctrl+Shift+R), check SW version in DevTools

**Issue:** IndexedDB quota exceeded
**Solution:** Clear cache via settings, increase quota via storage API

**Issue:** Sync queue stuck
**Solution:** Check error logs, manually retry, clear queue if corrupted

**Issue:** PWA not installable
**Solution:** Check manifest.json, ensure HTTPS, check Lighthouse audit

---

**End of Phase 3 Implementation Plan**

---

**Next Steps:**
1. Review plan with team
2. Estimate detailed task hours
3. Assign tasks to developers
4. Begin Week 1 implementation
5. Set up weekly progress reviews

**Questions? Contact:**
- Technical Lead: [Name]
- Product Owner: [Name]
