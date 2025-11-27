# Phase 4: Dashboards & Export - Implementation Plan

**Version:** 1.0
**Date:** November 26, 2025
**Status:** Planning
**Estimated Duration:** 4 weeks
**Dependencies:** Phase 3 complete (Offline/PWA Capability)

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

Phase 4 delivers comprehensive **data visualization and export capabilities** for the Survey Web Application. This phase transforms raw submission data into actionable insights through interactive dashboards and enables data export for external analysis.

### Key Capabilities

1. **Interactive Dashboards**
   - Real-time submission statistics by institution, status, and time period
   - Visual charts (bar, pie, line) for key indicators
   - Hierarchical views (central sees all, province sees province + districts)
   - Drill-down capabilities for detailed analysis

2. **PostgreSQL Analysis Views**
   - Normalize data across questionnaire versions
   - Stable analysis variables for consistent reporting
   - Optimized queries for dashboard performance
   - Support for complex aggregations

3. **Data Export System**
   - CSV and Excel (XLSX) export formats
   - Normalized export across versions
   - Per-version export for consistency
   - Long format export for advanced analysis (optional)
   - Queued export jobs for large datasets

4. **Advanced Filtering**
   - Filter by institution hierarchy
   - Filter by date range
   - Filter by submission status
   - Filter by questionnaire version
   - Combine multiple filters

### Business Value

- **Data-Driven Decisions:** Real-time insights into data collection progress
- **Performance Monitoring:** Track submission rates, approval times, rejection rates
- **Quality Assurance:** Identify data quality issues and outliers
- **External Analysis:** Export data to Excel, R, Python, SPSS, Power BI
- **Stakeholder Reporting:** Generate reports for management and funders

---

## Goals & Success Criteria

### Primary Goals

1. **Build Interactive Dashboard**
   - Display key metrics (submission counts, status distribution, trends)
   - Visualize data with charts (Chart.js or Recharts)
   - Filter by institution, date range, status
   - Load in <2 seconds (p95)

2. **Create Analysis Views**
   - PostgreSQL views for normalized data across versions
   - Stable analysis variables for core indicators
   - Optimized indexes for query performance
   - Support multiple questionnaires

3. **Implement Export Functionality**
   - CSV and Excel export
   - Normalized export across versions
   - Per-version export option
   - Queued export jobs for large datasets
   - Download link expiration (24 hours)

4. **Enable Hierarchical Access**
   - Central users see all institutions
   - Province users see province + districts
   - District users see own data only
   - Respect existing permission model

### Success Criteria

✅ **Technical Success:**
- [ ] Dashboard loads in <2 seconds on 4G connection
- [ ] Charts render correctly with 10,000+ data points
- [ ] Export generates correct CSV/Excel files
- [ ] Export job completes within 2 minutes for 10,000 submissions
- [ ] Analysis views return results in <500ms (p95)

✅ **User Experience Success:**
- [ ] Intuitive dashboard UI (no training required)
- [ ] Clear visual indicators for key metrics
- [ ] Export process is self-explanatory
- [ ] Filters work intuitively (no unexpected results)

✅ **Quality Success:**
- [ ] 80%+ test coverage for dashboard logic
- [ ] All E2E scenarios pass
- [ ] Zero data accuracy issues in exports
- [ ] Performance benchmarks met under load

---

## Features to Implement

### 3.1 Dashboard Infrastructure

#### 3.1.1 Dashboard Service (Backend)
**Description:** Business logic for dashboard data aggregation.

**Requirements:**
- Aggregate submission counts by status
- Aggregate by institution (with hierarchy support)
- Aggregate by time period (daily, weekly, monthly)
- Calculate trends (% change vs. previous period)
- Support multiple questionnaires simultaneously

**Files:**
- `app/Services/DashboardService.php` - Dashboard business logic

#### 3.1.2 Dashboard API Endpoints
**Description:** REST endpoints for dashboard data.

**Requirements:**
- `GET /api/dashboard/overview` - High-level summary
- `GET /api/dashboard/submissions` - Submission statistics
- `GET /api/dashboard/institutions` - Institution breakdown
- `GET /api/dashboard/trends` - Time-series data
- `GET /api/dashboard/questionnaire/{code}` - Questionnaire-specific stats
- All endpoints support filtering (institution, date range, status)

**Files:**
- `app/Http/Controllers/Api/DashboardController.php` - Dashboard endpoints

---

### 3.2 Analysis Views (PostgreSQL)

#### 3.2.1 Base Analysis View
**Description:** Common view structure for all questionnaires.

**SQL Template:**
```sql
CREATE VIEW {questionnaire_code}_analysis AS
SELECT
  s.id AS submission_id,
  q.code AS questionnaire_code,
  q.version AS questionnaire_version,
  i.id AS institution_id,
  i.name AS institution_name,
  i.code AS institution_code,
  i.level AS institution_level,
  parent_i.id AS parent_institution_id,
  parent_i.name AS parent_institution_name,
  s.status,
  s.submitted_at,
  s.approved_at,
  s.rejected_at,
  s.created_by,
  s.created_at,
  s.updated_at,

  -- Extract common metadata
  DATE(s.created_at) AS submission_date,
  EXTRACT(YEAR FROM s.created_at) AS submission_year,
  EXTRACT(MONTH FROM s.created_at) AS submission_month,
  EXTRACT(WEEK FROM s.created_at) AS submission_week,

  -- Approval turnaround time
  CASE
    WHEN s.approved_at IS NOT NULL
    THEN EXTRACT(EPOCH FROM (s.approved_at - s.submitted_at)) / 3600
    ELSE NULL
  END AS approval_hours,

  -- Stable analysis columns (questionnaire-specific)
  -- To be added per questionnaire

  -- Full answers for ad-hoc queries
  s.answers_json AS full_answers

FROM submissions s
JOIN questionnaires q ON q.id = s.questionnaire_id
JOIN institutions i ON i.id = s.institution_id
LEFT JOIN institutions parent_i ON parent_i.id = i.parent_institution_id
WHERE q.code = '{questionnaire_code}'
  AND s.deleted_at IS NULL;
```

**Files:**
- `database/migrations/YYYY_MM_DD_create_analysis_views.php` - Migration to create views
- `database/sql/views/` - SQL view definitions (one file per questionnaire)

#### 3.2.2 Questionnaire-Specific Analysis Views
**Description:** Per-questionnaire views with stable analysis variables.

**Example: Household Survey (QA)**
```sql
-- Add to base view template
-- Stable analysis columns
COALESCE(
  s.answers_json->>'province',
  s.answers_json->>'q1_province'
) AS province,

COALESCE(
  (s.answers_json->>'household_size')::int,
  (s.answers_json->>'hh_size')::int
) AS household_size,

COALESCE(
  s.answers_json->>'income_source',
  s.answers_json->>'q5_income'
) AS income_source,

-- Calculated fields
CASE
  WHEN (s.answers_json->>'household_size')::int <= 3 THEN 'Small'
  WHEN (s.answers_json->>'household_size')::int <= 6 THEN 'Medium'
  ELSE 'Large'
END AS household_size_category
```

**Files:**
- `database/sql/views/qa_analysis.sql` - Household survey view
- `database/sql/views/qb_analysis.sql` - Health survey view (example)

#### 3.2.3 Analysis View Management
**Description:** Admin UI to manage analysis views (Phase 5 or optional).

**Requirements:**
- List all questionnaires with analysis views
- Create view from template
- Add stable variables mapping
- Test view with sample query
- Drop/recreate view

**Note:** For v1, views can be created manually via migrations. Admin UI is optional enhancement.

---

### 3.3 Dashboard UI Components

#### 3.3.1 Dashboard Overview Page
**Description:** High-level summary dashboard.

**Widgets:**
1. **Summary Cards**
   - Total Submissions (all time)
   - Pending Approval (current count)
   - Approved This Month (count + % change)
   - Rejected This Month (count + % change)

2. **Status Distribution Chart** (Pie Chart)
   - Draft: X%
   - Submitted: Y%
   - Approved: Z%
   - Rejected: W%

3. **Submission Trends Chart** (Line Chart)
   - X-axis: Time (last 30 days)
   - Y-axis: Submission count
   - Lines: Draft, Submitted, Approved

4. **Institution Breakdown Table**
   - Institution name
   - Total submissions
   - Pending approval
   - Approval rate (%)
   - Sort and pagination

**Files:**
- `resources/js/pages/dashboard/DashboardOverview.tsx` - Overview page
- `resources/js/components/dashboard/SummaryCard.tsx` - Metric card component
- `resources/js/components/dashboard/StatusDistributionChart.tsx` - Pie chart
- `resources/js/components/dashboard/TrendsChart.tsx` - Line chart
- `resources/js/components/dashboard/InstitutionTable.tsx` - Table component

#### 3.3.2 Questionnaire Dashboard
**Description:** Detailed dashboard per questionnaire.

**Sections:**
1. **Questionnaire Header**
   - Title, description, version
   - Active status
   - Total submissions

2. **Submission Statistics**
   - By status (bar chart)
   - By institution (horizontal bar chart)
   - By time period (line chart)

3. **Answer Distribution** (for selected questions)
   - Categorical questions: Bar chart
   - Numeric questions: Histogram
   - Date questions: Timeline
   - Example: "Age distribution", "Province breakdown"

4. **Export Section**
   - Export button (CSV, Excel)
   - Filter options
   - Export history (recent exports)

**Files:**
- `resources/js/pages/dashboard/QuestionnaireDashboard.tsx` - Questionnaire page
- `resources/js/components/dashboard/AnswerDistributionChart.tsx` - Answer charts
- `resources/js/components/dashboard/ExportSection.tsx` - Export UI

#### 3.3.3 Filter Component
**Description:** Reusable filter component for dashboards.

**Filters:**
- Institution (dropdown with hierarchy)
- Date range (start date, end date)
- Status (multi-select: draft, submitted, approved, rejected)
- Questionnaire version (dropdown)

**Features:**
- Apply filters button
- Clear filters button
- Filter count badge (e.g., "3 filters active")
- URL persistence (filters saved in query params)

**Files:**
- `resources/js/components/dashboard/DashboardFilters.tsx` - Filter component
- `resources/js/hooks/useDashboardFilters.ts` - Filter state management

---

### 3.4 Data Export System

#### 3.4.1 Export Service (Backend)
**Description:** Business logic for data export.

**Requirements:**
- Query analysis view with filters
- Format data for CSV or Excel
- Generate file and save to storage
- Return download URL
- Clean up expired exports (>24 hours)

**Files:**
- `app/Services/ExportService.php` - Export business logic
- `app/Jobs/GenerateExportJob.php` - Queued export job

#### 3.4.2 Export API Endpoints
**Description:** REST endpoints for export requests.

**Endpoints:**
- `POST /api/exports/questionnaires/{code}` - Request export
- `GET /api/exports/{jobId}/status` - Check export status
- `GET /api/exports/{jobId}/download` - Download file
- `DELETE /api/exports/{jobId}` - Delete export
- `GET /api/exports/history` - List user's exports

**Files:**
- `app/Http/Controllers/Api/ExportController.php` - Export endpoints

#### 3.4.3 Export Formats

**CSV Format:**
```csv
submission_id,questionnaire_code,version,institution,status,province,household_size,income_source,created_at
123,QA,1,District A1,approved,Vientiane,5,agriculture,2025-11-01 10:00:00
124,QA,2,District A2,approved,Luang Prabang,7,trade,2025-11-02 14:30:00
```

**Excel Format:**
- Sheet 1: Metadata (questionnaire info, export date, filters applied)
- Sheet 2: Data (same columns as CSV)
- Sheet 3: Summary Statistics (optional)

**Long Format (Optional):**
```csv
submission_id,questionnaire_code,version,question_name,question_value
123,QA,1,province,Vientiane
123,QA,1,household_size,5
123,QA,1,income_source,agriculture
```

**Implementation:**
- Use `maatwebsite/excel` package for Excel export
- Use Laravel's built-in CSV writer for CSV export
- Chunk queries for large datasets (prevent memory overflow)

**Files:**
- `app/Exports/SubmissionsExport.php` - Export class (implements `FromQuery`, `WithHeadings`)

#### 3.4.4 Export UI Components
**Description:** Frontend components for export requests.

**Export Modal:**
```
┌─────────────────────────────────────────┐
│  Export Data                            │
├─────────────────────────────────────────┤
│  Format:                                │
│  ○ CSV   ● Excel                        │
│                                         │
│  Include:                               │
│  ○ All Versions   ● Version 2 Only     │
│                                         │
│  Filters:                               │
│  Institution: [All Institutions ▼]     │
│  Date Range:  [From: ___] [To: ___]   │
│  Status:      [☑ All]                  │
│                                         │
│         [Cancel]  [Generate Export]    │
└─────────────────────────────────────────┘
```

**Export History Table:**
| Export Date | Questionnaire | Format | Status | Download |
|-------------|---------------|--------|--------|----------|
| 2025-11-26 10:00 | QA v2 | Excel | ✓ Ready | [Download] |
| 2025-11-25 15:30 | QB v1 | CSV | ⏳ Processing | - |
| 2025-11-24 09:00 | QA v1 | Excel | ✓ Ready | [Download] |

**Files:**
- `resources/js/components/exports/ExportModal.tsx` - Export modal
- `resources/js/components/exports/ExportHistory.tsx` - History table
- `resources/js/hooks/useExport.ts` - Export state management

---

### 3.5 Chart Library Integration

#### 3.5.1 Chart.js vs. Recharts
**Decision:** Use **Recharts** for React integration.

**Rationale:**
- React-first library (declarative API)
- TypeScript support
- Responsive by default
- Good documentation
- Active maintenance

**Alternative:** Chart.js (more powerful but requires wrapper)

**Installation:**
```bash
npm install recharts
npm install -D @types/recharts
```

#### 3.5.2 Chart Components
**Description:** Reusable chart components.

**Components:**
- `PieChart` - Status distribution
- `LineChart` - Trends over time
- `BarChart` - Comparisons (institution, category)
- `HistogramChart` - Numeric distribution
- `AreaChart` - Cumulative trends (optional)

**Features:**
- Tooltips on hover
- Responsive sizing
- Loading state
- Empty state (no data)
- Export chart as image (optional)

**Files:**
- `resources/js/components/charts/PieChart.tsx`
- `resources/js/components/charts/LineChart.tsx`
- `resources/js/components/charts/BarChart.tsx`
- `resources/js/components/charts/HistogramChart.tsx`

---

## Technical Architecture

### 4.1 Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (React)                          │
│                                                              │
│  ┌──────────────────┐      ┌──────────────────┐            │
│  │ Dashboard Pages  │      │ Export Components│            │
│  │ - Overview       │      │ - Export Modal   │            │
│  │ - Questionnaire  │      │ - History Table  │            │
│  └────────┬─────────┘      └────────┬─────────┘            │
│           │                         │                       │
│           ▼                         ▼                       │
│  ┌──────────────────────────────────────────┐              │
│  │         API Client (Axios)                │              │
│  │  - Dashboard API                          │              │
│  │  - Export API                             │              │
│  └────────┬──────────────────────────────────┘              │
│           │                                                 │
└───────────┼─────────────────────────────────────────────────┘
            │
            │ HTTPS
            ▼
┌───────────────────────────────────────────────────────────┐
│              Laravel Backend                               │
│                                                            │
│  ┌──────────────────┐      ┌──────────────────┐          │
│  │ DashboardController      │ ExportController │          │
│  └────────┬─────────┘      └────────┬─────────┘          │
│           │                         │                     │
│           ▼                         ▼                     │
│  ┌──────────────────┐      ┌──────────────────┐          │
│  │ DashboardService │      │ ExportService    │          │
│  └────────┬─────────┘      └────────┬─────────┘          │
│           │                         │                     │
│           │                         ▼                     │
│           │                ┌──────────────────┐           │
│           │                │ GenerateExportJob│           │
│           │                │   (Queued)       │           │
│           │                └────────┬─────────┘           │
│           │                         │                     │
│           ▼                         ▼                     │
│  ┌─────────────────────────────────────────┐             │
│  │        PostgreSQL Database               │             │
│  │  ┌─────────────────┐  ┌──────────────┐  │             │
│  │  │ submissions      │  │ Analysis     │  │             │
│  │  │ questionnaires   │  │ Views        │  │             │
│  │  │ institutions     │  │ - qa_analysis│  │             │
│  │  └─────────────────┘  │ - qb_analysis│  │             │
│  │                       └──────────────┘  │             │
│  └─────────────────────────────────────────┘             │
│                                                           │
│  ┌─────────────────────────────────────────┐             │
│  │      File Storage (Exports)              │             │
│  │  storage/app/exports/{job_id}.{csv|xlsx}│             │
│  └─────────────────────────────────────────┘             │
└───────────────────────────────────────────────────────────┘
```

### 4.2 Data Flow

#### 4.2.1 Dashboard Data Flow
```
User opens dashboard → Frontend requests data
  → GET /api/dashboard/overview?institution_id=5&date_from=2025-01-01
  → DashboardController receives request
  → DashboardService aggregates data
  → Query analysis view (e.g., qa_analysis)
  → Apply filters (institution hierarchy, date range)
  → Calculate statistics (counts, percentages, trends)
  → Return JSON response
  → Frontend receives data
  → Render charts and tables
```

#### 4.2.2 Export Data Flow
```
User requests export → Opens export modal
  → User selects format (CSV/Excel) and filters
  → User clicks "Generate Export"
  → POST /api/exports/questionnaires/QA
  → ExportController validates request
  → Dispatch GenerateExportJob to queue
  → Return job ID
  → Frontend polls: GET /api/exports/{jobId}/status

[Background job executes]
  → ExportService queries analysis view
  → Apply filters
  → Chunk query (1000 rows at a time)
  → Generate CSV or Excel file
  → Save to storage/app/exports/{jobId}.csv
  → Update job status: completed
  → Send notification to user (in-app + email)

[User receives notification]
  → User clicks download link
  → GET /api/exports/{jobId}/download
  → Stream file to browser
  → Browser downloads file

[Cleanup job runs daily]
  → Delete exports older than 24 hours
```

### 4.3 Technology Stack

**Backend:**
- **maatwebsite/excel** ^3.1 - Excel import/export
- Laravel Queue (existing) - Background job processing
- PostgreSQL Views - Data aggregation

**Frontend:**
- **recharts** ^2.10 - React charting library
- **date-fns** ^3.0 - Date manipulation and formatting
- TanStack Query (existing) - Server state management

**No new major dependencies required.**

---

## Database Schema Changes

### 5.1 Export Jobs Table

**Purpose:** Track export job status for user visibility.

```sql
CREATE TABLE export_jobs (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id),
    questionnaire_code VARCHAR(50) NOT NULL,
    format VARCHAR(10) NOT NULL, -- 'csv' or 'xlsx'
    status VARCHAR(20) NOT NULL DEFAULT 'pending', -- pending, processing, completed, failed
    filters JSONB NOT NULL DEFAULT '{}',
    file_path VARCHAR(255),
    file_size BIGINT,
    error_message TEXT,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    expires_at TIMESTAMP, -- Auto-delete after 24 hours
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_export_jobs_user ON export_jobs(user_id);
CREATE INDEX idx_export_jobs_status ON export_jobs(status);
CREATE INDEX idx_export_jobs_expires_at ON export_jobs(expires_at);
```

**Migration:**
```php
// database/migrations/YYYY_MM_DD_create_export_jobs_table.php
Schema::create('export_jobs', function (Blueprint $table) {
    $table->id();
    $table->foreignId('user_id')->constrained()->onDelete('cascade');
    $table->string('questionnaire_code', 50);
    $table->string('format', 10); // csv, xlsx
    $table->string('status', 20)->default('pending');
    $table->json('filters')->default('{}');
    $table->string('file_path')->nullable();
    $table->bigInteger('file_size')->nullable();
    $table->text('error_message')->nullable();
    $table->timestamp('started_at')->nullable();
    $table->timestamp('completed_at')->nullable();
    $table->timestamp('expires_at')->nullable();
    $table->timestamps();

    $table->index('user_id');
    $table->index('status');
    $table->index('expires_at');
});
```

### 5.2 Analysis View Migrations

**Purpose:** Create PostgreSQL views for data analysis.

**Migration Structure:**
```php
// database/migrations/YYYY_MM_DD_create_qa_analysis_view.php
use Illuminate\Support\Facades\DB;

public function up(): void
{
    DB::statement(
        file_get_contents(database_path('sql/views/qa_analysis.sql'))
    );
}

public function down(): void
{
    DB::statement('DROP VIEW IF EXISTS qa_analysis');
}
```

**SQL Files:**
- `database/sql/views/qa_analysis.sql` - Household survey view
- `database/sql/views/qb_analysis.sql` - Health survey view (example)

**Note:** Views are **read-only**. No schema changes to base tables.

---

## API Endpoints

### 6.1 Dashboard Endpoints

#### 6.1.1 Dashboard Overview
```
GET /api/dashboard/overview
```

**Query Parameters:**
- `institution_id` (optional) - Filter by institution (includes children)
- `date_from` (optional) - ISO 8601 date (e.g., 2025-01-01)
- `date_to` (optional) - ISO 8601 date
- `questionnaire_code` (optional) - Filter by specific questionnaire

**Response:**
```json
{
  "data": {
    "summary": {
      "total_submissions": 1234,
      "draft": 45,
      "submitted": 234,
      "approved": 890,
      "rejected": 65,
      "approved_rate": 72.0,
      "rejection_rate": 5.3
    },
    "trends": {
      "submissions_this_month": 156,
      "submissions_last_month": 142,
      "change_percent": 9.9,
      "approved_this_month": 112,
      "approved_last_month": 98,
      "approval_change_percent": 14.3
    },
    "status_distribution": [
      { "status": "draft", "count": 45, "percentage": 3.6 },
      { "status": "submitted", "count": 234, "percentage": 19.0 },
      { "status": "approved", "count": 890, "percentage": 72.1 },
      { "status": "rejected", "count": 65, "percentage": 5.3 }
    ]
  }
}
```

---

#### 6.1.2 Submission Trends
```
GET /api/dashboard/trends
```

**Query Parameters:**
- `period` (required) - daily | weekly | monthly
- `date_from` (required) - Start date
- `date_to` (required) - End date
- `institution_id` (optional)
- `questionnaire_code` (optional)

**Response:**
```json
{
  "data": [
    {
      "date": "2025-11-01",
      "draft": 5,
      "submitted": 12,
      "approved": 8,
      "rejected": 2,
      "total": 27
    },
    {
      "date": "2025-11-02",
      "draft": 7,
      "submitted": 15,
      "approved": 10,
      "rejected": 1,
      "total": 33
    }
  ]
}
```

---

#### 6.1.3 Institution Breakdown
```
GET /api/dashboard/institutions
```

**Query Parameters:**
- `institution_id` (optional) - Show breakdown of children
- `date_from` (optional)
- `date_to` (optional)
- `questionnaire_code` (optional)

**Response:**
```json
{
  "data": [
    {
      "institution_id": 5,
      "institution_name": "Province A",
      "institution_level": "province",
      "total": 456,
      "draft": 12,
      "submitted": 89,
      "approved": 334,
      "rejected": 21,
      "approval_rate": 78.9,
      "avg_approval_hours": 36.5
    },
    {
      "institution_id": 10,
      "institution_name": "District A1",
      "institution_level": "district",
      "total": 123,
      "draft": 3,
      "submitted": 25,
      "approved": 90,
      "rejected": 5,
      "approval_rate": 78.3,
      "avg_approval_hours": 42.1
    }
  ]
}
```

---

#### 6.1.4 Questionnaire Statistics
```
GET /api/dashboard/questionnaire/{code}
```

**Query Parameters:**
- `version` (optional) - Specific version or 'all'
- `institution_id` (optional)
- `date_from` (optional)
- `date_to` (optional)

**Response:**
```json
{
  "data": {
    "questionnaire": {
      "code": "QA",
      "title": "Household Survey",
      "versions": [
        { "version": 1, "is_active": false, "submission_count": 234 },
        { "version": 2, "is_active": true, "submission_count": 456 }
      ]
    },
    "statistics": {
      "total_submissions": 690,
      "by_status": { ... },
      "by_institution": [ ... ],
      "by_version": [ ... ]
    },
    "answer_distributions": {
      "province": [
        { "value": "Vientiane", "count": 245 },
        { "value": "Luang Prabang", "count": 178 },
        { "value": "Champasak", "count": 123 }
      ],
      "household_size": {
        "min": 1,
        "max": 15,
        "mean": 5.2,
        "median": 5,
        "distribution": [
          { "range": "1-3", "count": 123 },
          { "range": "4-6", "count": 345 },
          { "range": "7-9", "count": 156 },
          { "range": "10+", "count": 66 }
        ]
      }
    }
  }
}
```

---

### 6.2 Export Endpoints

#### 6.2.1 Request Export
```
POST /api/exports/questionnaires/{code}
```

**Request Body:**
```json
{
  "format": "xlsx",
  "version": "all",
  "institution_id": null,
  "date_from": "2025-01-01",
  "date_to": "2025-12-31",
  "status": ["approved", "submitted"],
  "include_metadata": true
}
```

**Response:**
```json
{
  "data": {
    "job_id": 123,
    "status": "pending",
    "message": "Export job queued. You'll be notified when ready."
  }
}
```

---

#### 6.2.2 Check Export Status
```
GET /api/exports/{jobId}/status
```

**Response:**
```json
{
  "data": {
    "job_id": 123,
    "status": "completed",
    "format": "xlsx",
    "file_size": 2456789,
    "started_at": "2025-11-26T10:00:00Z",
    "completed_at": "2025-11-26T10:02:15Z",
    "expires_at": "2025-11-27T10:00:00Z",
    "download_url": "/api/exports/123/download"
  }
}
```

**Status Values:**
- `pending` - Job queued
- `processing` - Job running
- `completed` - Ready to download
- `failed` - Error occurred

---

#### 6.2.3 Download Export
```
GET /api/exports/{jobId}/download
```

**Response:** Binary file stream (CSV or Excel)

**Headers:**
```
Content-Type: text/csv (or application/vnd.openxmlformats-officedocument.spreadsheetml.sheet)
Content-Disposition: attachment; filename="qa_export_2025-11-26.csv"
Content-Length: 2456789
```

---

#### 6.2.4 Export History
```
GET /api/exports/history
```

**Query Parameters:**
- `page` (default: 1)
- `per_page` (default: 20)

**Response:**
```json
{
  "data": [
    {
      "job_id": 123,
      "questionnaire_code": "QA",
      "format": "xlsx",
      "status": "completed",
      "file_size": 2456789,
      "created_at": "2025-11-26T10:00:00Z",
      "expires_at": "2025-11-27T10:00:00Z"
    }
  ],
  "meta": {
    "current_page": 1,
    "per_page": 20,
    "total": 15
  }
}
```

---

#### 6.2.5 Delete Export
```
DELETE /api/exports/{jobId}
```

**Response:**
```json
{
  "message": "Export deleted successfully"
}
```

---

## Frontend Components

### 7.1 Dashboard Pages

#### 7.1.1 Dashboard Overview
**File:** `resources/js/pages/dashboard/DashboardOverview.tsx`

**Layout:**
```
┌─────────────────────────────────────────────────────────┐
│  Dashboard Overview                    [Filters ▼]      │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────┐│
│  │ Total    │  │ Pending  │  │ Approved │  │ Rejected││
│  │ 1,234    │  │ 234      │  │ 890      │  │ 65     ││
│  │          │  │ ↑ 12%    │  │ ↑ 14%    │  │ ↓ 5%   ││
│  └──────────┘  └──────────┘  └──────────┘  └────────┘│
│                                                         │
│  ┌─────────────────────┐  ┌─────────────────────────┐ │
│  │ Status Distribution │  │ Submission Trends       │ │
│  │                     │  │                         │ │
│  │  [Pie Chart]        │  │  [Line Chart]           │ │
│  │                     │  │                         │ │
│  └─────────────────────┘  └─────────────────────────┘ │
│                                                         │
│  ┌───────────────────────────────────────────────────┐ │
│  │ Institutions                                      │ │
│  ├────────────┬───────┬────────┬──────────┬─────────┤ │
│  │ Institution│ Total │ Pending│ Approved │ Rate    │ │
│  ├────────────┼───────┼────────┼──────────┼─────────┤ │
│  │ Province A │ 456   │ 89     │ 334      │ 78.9%   │ │
│  │ Province B │ 321   │ 67     │ 245      │ 76.3%   │ │
│  └────────────┴───────┴────────┴──────────┴─────────┘ │
└─────────────────────────────────────────────────────────┘
```

**Implementation:**
```tsx
import { useDashboardData } from '@/hooks/useDashboardData';
import { SummaryCard } from '@/components/dashboard/SummaryCard';
import { StatusDistributionChart } from '@/components/dashboard/StatusDistributionChart';
import { TrendsChart } from '@/components/dashboard/TrendsChart';
import { InstitutionTable } from '@/components/dashboard/InstitutionTable';

export function DashboardOverview() {
  const { data, isLoading, filters, setFilters } = useDashboardData();

  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Dashboard Overview</h1>
        <DashboardFilters filters={filters} onChange={setFilters} />
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        <SummaryCard
          title="Total Submissions"
          value={data.summary.total_submissions}
          icon={DocumentIcon}
        />
        <SummaryCard
          title="Pending Approval"
          value={data.summary.submitted}
          change={data.trends.change_percent}
          icon={ClockIcon}
        />
        {/* ... more cards */}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-2 gap-6">
        <StatusDistributionChart data={data.status_distribution} />
        <TrendsChart data={data.trends} />
      </div>

      {/* Institution Table */}
      <InstitutionTable data={data.institutions} />
    </div>
  );
}
```

---

#### 7.1.2 Questionnaire Dashboard
**File:** `resources/js/pages/dashboard/QuestionnaireDashboard.tsx`

**Features:**
- Questionnaire header with version selector
- Submission statistics (same charts as overview)
- Answer distribution charts (specific to questionnaire)
- Export section

**Implementation:**
```tsx
export function QuestionnaireDashboard({ code }: { code: string }) {
  const { data, isLoading } = useQuestionnaireDashboard(code);
  const [selectedVersion, setSelectedVersion] = useState<number | 'all'>('all');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between">
        <div>
          <h1 className="text-2xl font-bold">{data.questionnaire.title}</h1>
          <p className="text-gray-600">Code: {code}</p>
        </div>
        <select value={selectedVersion} onChange={(e) => setSelectedVersion(e.target.value)}>
          <option value="all">All Versions</option>
          {data.questionnaire.versions.map(v => (
            <option key={v.version} value={v.version}>
              Version {v.version} ({v.submission_count} submissions)
            </option>
          ))}
        </select>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-2 gap-6">
        <SubmissionStatusChart data={data.statistics.by_status} />
        <InstitutionBreakdownChart data={data.statistics.by_institution} />
      </div>

      {/* Answer Distributions */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Answer Distributions</h2>
        <div className="grid grid-cols-2 gap-6">
          {data.answer_distributions.map(dist => (
            <AnswerDistributionChart key={dist.question} data={dist} />
          ))}
        </div>
      </div>

      {/* Export Section */}
      <ExportSection questionnaireCode={code} version={selectedVersion} />
    </div>
  );
}
```

---

### 7.2 Chart Components

#### 7.2.1 Status Distribution Chart (Pie)
**File:** `resources/js/components/dashboard/StatusDistributionChart.tsx`

**Implementation:**
```tsx
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

const STATUS_COLORS = {
  draft: '#9CA3AF',      // Gray
  submitted: '#3B82F6',  // Blue
  approved: '#10B981',   // Green
  rejected: '#EF4444',   // Red
};

export function StatusDistributionChart({ data }: { data: StatusData[] }) {
  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <h3 className="text-lg font-semibold mb-4">Status Distribution</h3>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={data}
            dataKey="count"
            nameKey="status"
            cx="50%"
            cy="50%"
            outerRadius={80}
            label={({ status, percentage }) => `${status}: ${percentage}%`}
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={STATUS_COLORS[entry.status]} />
            ))}
          </Pie>
          <Tooltip />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
```

---

#### 7.2.2 Trends Chart (Line)
**File:** `resources/js/components/dashboard/TrendsChart.tsx`

**Implementation:**
```tsx
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { format } from 'date-fns';

export function TrendsChart({ data }: { data: TrendData[] }) {
  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <h3 className="text-lg font-semibold mb-4">Submission Trends</h3>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="date"
            tickFormatter={(date) => format(new Date(date), 'MMM dd')}
          />
          <YAxis />
          <Tooltip
            labelFormatter={(date) => format(new Date(date), 'PPP')}
          />
          <Legend />
          <Line type="monotone" dataKey="draft" stroke="#9CA3AF" name="Draft" />
          <Line type="monotone" dataKey="submitted" stroke="#3B82F6" name="Submitted" />
          <Line type="monotone" dataKey="approved" stroke="#10B981" name="Approved" />
          <Line type="monotone" dataKey="rejected" stroke="#EF4444" name="Rejected" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
```

---

### 7.3 Export Components

#### 7.3.1 Export Modal
**File:** `resources/js/components/exports/ExportModal.tsx`

**Implementation:**
```tsx
import { useState } from 'react';
import { useExport } from '@/hooks/useExport';

export function ExportModal({ questionnaireCode, onClose }: ExportModalProps) {
  const [options, setOptions] = useState({
    format: 'xlsx',
    version: 'all',
    institution_id: null,
    date_from: '',
    date_to: '',
    status: ['approved', 'submitted'],
  });

  const { requestExport, isLoading } = useExport();

  const handleExport = async () => {
    const result = await requestExport(questionnaireCode, options);
    if (result.success) {
      toast.success('Export job queued. You\'ll be notified when ready.');
      onClose();
    }
  };

  return (
    <Modal isOpen onClose={onClose}>
      <div className="p-6">
        <h2 className="text-xl font-bold mb-4">Export Data</h2>

        {/* Format Selection */}
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">Format</label>
          <div className="flex gap-4">
            <label>
              <input
                type="radio"
                value="csv"
                checked={options.format === 'csv'}
                onChange={(e) => setOptions({ ...options, format: e.target.value })}
              />
              <span className="ml-2">CSV</span>
            </label>
            <label>
              <input
                type="radio"
                value="xlsx"
                checked={options.format === 'xlsx'}
                onChange={(e) => setOptions({ ...options, format: e.target.value })}
              />
              <span className="ml-2">Excel</span>
            </label>
          </div>
        </div>

        {/* Version Selection */}
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">Include</label>
          <select
            value={options.version}
            onChange={(e) => setOptions({ ...options, version: e.target.value })}
            className="w-full border rounded px-3 py-2"
          >
            <option value="all">All Versions</option>
            {/* Map versions */}
          </select>
        </div>

        {/* Filters */}
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">Filters</label>
          {/* Institution, date range, status filters */}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 border rounded">
            Cancel
          </button>
          <button
            onClick={handleExport}
            disabled={isLoading}
            className="px-4 py-2 bg-indigo-600 text-white rounded"
          >
            {isLoading ? 'Generating...' : 'Generate Export'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
```

---

## Implementation Steps

### Week 1: Analysis Views & Dashboard Backend

#### Step 1.1: Create Export Jobs Table
```bash
php artisan make:migration create_export_jobs_table
```

**Migration:**
```php
// See section 5.1 for schema
```

#### Step 1.2: Create Analysis Views
```bash
mkdir -p database/sql/views
php artisan make:migration create_qa_analysis_view
```

**SQL File:** `database/sql/views/qa_analysis.sql`
```sql
-- See section 3.2.2 for full SQL
CREATE VIEW qa_analysis AS
SELECT
  s.id AS submission_id,
  -- ... metadata columns
  -- ... stable analysis columns (questionnaire-specific)
FROM submissions s
JOIN questionnaires q ON q.id = s.questionnaire_id
JOIN institutions i ON i.id = s.institution_id
WHERE q.code = 'QA'
  AND s.deleted_at IS NULL;
```

**Migration:**
```php
use Illuminate\Support\Facades\DB;

public function up(): void
{
    DB::statement(
        file_get_contents(database_path('sql/views/qa_analysis.sql'))
    );
}

public function down(): void
{
    DB::statement('DROP VIEW IF EXISTS qa_analysis');
}
```

#### Step 1.3: Create Dashboard Service
**File:** `app/Services/DashboardService.php`

```php
namespace App\Services;

use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class DashboardService
{
    public function getOverview(array $filters): array
    {
        $query = $this->applyFilters(
            DB::table('submissions')
                ->join('institutions', 'submissions.institution_id', '=', 'institutions.id')
                ->whereNull('submissions.deleted_at'),
            $filters
        );

        // Calculate summary
        $summary = $query->selectRaw('
            COUNT(*) as total_submissions,
            SUM(CASE WHEN status = "draft" THEN 1 ELSE 0 END) as draft,
            SUM(CASE WHEN status = "submitted" THEN 1 ELSE 0 END) as submitted,
            SUM(CASE WHEN status = "approved" THEN 1 ELSE 0 END) as approved,
            SUM(CASE WHEN status = "rejected" THEN 1 ELSE 0 END) as rejected
        ')->first();

        // Calculate trends (this month vs last month)
        $trends = $this->calculateTrends($filters);

        // Status distribution
        $statusDistribution = $query->selectRaw('
            status,
            COUNT(*) as count,
            ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 2) as percentage
        ')
        ->groupBy('status')
        ->get();

        return [
            'summary' => $summary,
            'trends' => $trends,
            'status_distribution' => $statusDistribution,
        ];
    }

    public function getTrends(string $period, Carbon $from, Carbon $to, array $filters): array
    {
        // Generate time series data
        // Group by day/week/month based on $period
        // Return array of [date, draft, submitted, approved, rejected, total]
    }

    public function getInstitutionBreakdown(array $filters): array
    {
        // Query institutions with submission counts
        // Include hierarchy (show children if institution_id provided)
        // Calculate approval rates and avg approval time
    }

    public function getQuestionnaireStats(string $code, array $filters): array
    {
        // Query specific questionnaire statistics
        // Include version breakdown
        // Calculate answer distributions for selected questions
    }

    protected function applyFilters($query, array $filters)
    {
        if (isset($filters['institution_id'])) {
            // Include institution and all children in hierarchy
            $institutionIds = $this->getInstitutionIdsWithChildren($filters['institution_id']);
            $query->whereIn('submissions.institution_id', $institutionIds);
        }

        if (isset($filters['date_from'])) {
            $query->where('submissions.created_at', '>=', $filters['date_from']);
        }

        if (isset($filters['date_to'])) {
            $query->where('submissions.created_at', '<=', $filters['date_to']);
        }

        if (isset($filters['questionnaire_code'])) {
            $query->join('questionnaires', 'submissions.questionnaire_id', '=', 'questionnaires.id')
                  ->where('questionnaires.code', $filters['questionnaire_code']);
        }

        return $query;
    }

    protected function getInstitutionIdsWithChildren(int $institutionId): array
    {
        // Recursive query to get all child institutions
        // Or use institution service if exists
    }

    protected function calculateTrends(array $filters): array
    {
        // Calculate this month vs last month metrics
        // Return change percentages
    }
}
```

#### Step 1.4: Create Dashboard Controller
**File:** `app/Http/Controllers/Api/DashboardController.php`

```php
namespace App\Http\Controllers\Api;

use App\Services\DashboardService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DashboardController extends Controller
{
    public function __construct(
        protected DashboardService $dashboardService
    ) {}

    public function overview(Request $request): JsonResponse
    {
        $filters = $request->only(['institution_id', 'date_from', 'date_to', 'questionnaire_code']);

        $data = $this->dashboardService->getOverview($filters);

        return response()->json(['data' => $data]);
    }

    public function trends(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'period' => 'required|in:daily,weekly,monthly',
            'date_from' => 'required|date',
            'date_to' => 'required|date|after:date_from',
        ]);

        $filters = $request->only(['institution_id', 'questionnaire_code']);

        $data = $this->dashboardService->getTrends(
            $validated['period'],
            Carbon::parse($validated['date_from']),
            Carbon::parse($validated['date_to']),
            $filters
        );

        return response()->json(['data' => $data]);
    }

    public function institutions(Request $request): JsonResponse
    {
        $filters = $request->only(['institution_id', 'date_from', 'date_to', 'questionnaire_code']);

        $data = $this->dashboardService->getInstitutionBreakdown($filters);

        return response()->json(['data' => $data]);
    }

    public function questionnaire(Request $request, string $code): JsonResponse
    {
        $filters = $request->only(['version', 'institution_id', 'date_from', 'date_to']);

        $data = $this->dashboardService->getQuestionnaireStats($code, $filters);

        return response()->json(['data' => $data]);
    }
}
```

#### Step 1.5: Add Dashboard Routes
**File:** `routes/api.php`

```php
Route::middleware('auth:sanctum')->group(function () {
    // Dashboard routes
    Route::prefix('dashboard')->group(function () {
        Route::get('/overview', [DashboardController::class, 'overview']);
        Route::get('/trends', [DashboardController::class, 'trends']);
        Route::get('/institutions', [DashboardController::class, 'institutions']);
        Route::get('/questionnaire/{code}', [DashboardController::class, 'questionnaire']);
    });
});
```

#### Step 1.6: Test Dashboard Backend
**File:** `tests/Feature/DashboardTest.php`

```php
use App\Models\User;
use Database\Seeders\RoleAndPermissionSeeder;

beforeEach(function () {
    $this->seed(RoleAndPermissionSeeder::class);
});

it('returns dashboard overview', function () {
    $admin = User::factory()->create();
    $admin->assignRole('admin');

    // Create test data (submissions)
    Submission::factory()->count(10)->create(['status' => 'approved']);
    Submission::factory()->count(5)->create(['status' => 'draft']);

    $response = $this->actingAs($admin)->getJson('/api/dashboard/overview');

    $response->assertStatus(200)
        ->assertJsonStructure([
            'data' => [
                'summary' => ['total_submissions', 'draft', 'approved'],
                'status_distribution',
            ],
        ]);

    expect($response->json('data.summary.total_submissions'))->toBe(15);
});

it('filters dashboard by institution', function () {
    $admin = User::factory()->create();
    $admin->assignRole('admin');

    $institution = Institution::factory()->create();
    Submission::factory()->count(5)->create(['institution_id' => $institution->id]);

    $response = $this->actingAs($admin)->getJson(
        '/api/dashboard/overview?institution_id=' . $institution->id
    );

    $response->assertStatus(200);
    expect($response->json('data.summary.total_submissions'))->toBe(5);
});
```

---

### Week 2: Export System Backend

#### Step 2.1: Install maatwebsite/excel
```bash
composer require maatwebsite/excel
```

#### Step 2.2: Create ExportJob Model
**File:** `app/Models/ExportJob.php`

```php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ExportJob extends Model
{
    protected $fillable = [
        'user_id',
        'questionnaire_code',
        'format',
        'status',
        'filters',
        'file_path',
        'file_size',
        'error_message',
        'started_at',
        'completed_at',
        'expires_at',
    ];

    protected $casts = [
        'filters' => 'array',
        'started_at' => 'datetime',
        'completed_at' => 'datetime',
        'expires_at' => 'datetime',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function isExpired(): bool
    {
        return $this->expires_at && $this->expires_at->isPast();
    }

    public function isCompleted(): bool
    {
        return $this->status === 'completed';
    }
}
```

#### Step 2.3: Create Export Service
**File:** `app/Services/ExportService.php`

```php
namespace App\Services;

use App\Models\ExportJob;
use Illuminate\Support\Facades\DB;

class ExportService
{
    public function requestExport(User $user, string $questionnaireCode, array $options): ExportJob
    {
        $exportJob = ExportJob::create([
            'user_id' => $user->id,
            'questionnaire_code' => $questionnaireCode,
            'format' => $options['format'] ?? 'csv',
            'status' => 'pending',
            'filters' => $options,
            'expires_at' => now()->addHours(24),
        ]);

        // Dispatch job to queue
        GenerateExportJob::dispatch($exportJob);

        return $exportJob;
    }

    public function generateExport(ExportJob $exportJob): void
    {
        $exportJob->update([
            'status' => 'processing',
            'started_at' => now(),
        ]);

        try {
            // Query analysis view
            $query = $this->buildExportQuery($exportJob);

            // Generate file
            $filePath = $this->generateFile($exportJob, $query);

            $exportJob->update([
                'status' => 'completed',
                'file_path' => $filePath,
                'file_size' => Storage::size($filePath),
                'completed_at' => now(),
            ]);

            // Send notification
            $exportJob->user->notify(new ExportCompletedNotification($exportJob));
        } catch (\Exception $e) {
            $exportJob->update([
                'status' => 'failed',
                'error_message' => $e->getMessage(),
                'completed_at' => now(),
            ]);

            $exportJob->user->notify(new ExportFailedNotification($exportJob));
        }
    }

    protected function buildExportQuery(ExportJob $exportJob)
    {
        $viewName = $exportJob->questionnaire_code . '_analysis';

        $query = DB::table($viewName);

        // Apply filters
        if ($exportJob->filters['version'] !== 'all') {
            $query->where('questionnaire_version', $exportJob->filters['version']);
        }

        if (isset($exportJob->filters['institution_id'])) {
            // Apply institution filter (with hierarchy)
        }

        if (isset($exportJob->filters['date_from'])) {
            $query->where('created_at', '>=', $exportJob->filters['date_from']);
        }

        if (isset($exportJob->filters['date_to'])) {
            $query->where('created_at', '<=', $exportJob->filters['date_to']);
        }

        if (isset($exportJob->filters['status'])) {
            $query->whereIn('status', $exportJob->filters['status']);
        }

        return $query;
    }

    protected function generateFile(ExportJob $exportJob, $query): string
    {
        $fileName = sprintf(
            '%s_export_%s.%s',
            $exportJob->questionnaire_code,
            now()->format('Y-m-d_His'),
            $exportJob->format
        );

        $filePath = 'exports/' . $exportJob->id . '/' . $fileName;

        if ($exportJob->format === 'csv') {
            return $this->generateCSV($filePath, $query);
        } else {
            return $this->generateExcel($filePath, $query);
        }
    }

    protected function generateCSV(string $filePath, $query): string
    {
        $file = fopen(storage_path('app/' . $filePath), 'w');

        // Write header
        $headers = $query->first();
        if ($headers) {
            fputcsv($file, array_keys((array) $headers));
        }

        // Write data in chunks
        $query->chunk(1000, function ($rows) use ($file) {
            foreach ($rows as $row) {
                fputcsv($file, (array) $row);
            }
        });

        fclose($file);

        return $filePath;
    }

    protected function generateExcel(string $filePath, $query): string
    {
        // Use maatwebsite/excel
        Excel::store(new SubmissionsExport($query), $filePath);

        return $filePath;
    }

    public function cleanupExpiredExports(): int
    {
        $expired = ExportJob::where('status', 'completed')
            ->where('expires_at', '<', now())
            ->get();

        foreach ($expired as $exportJob) {
            if ($exportJob->file_path) {
                Storage::delete($exportJob->file_path);
            }
            $exportJob->delete();
        }

        return $expired->count();
    }
}
```

#### Step 2.4: Create Export Job (Queued)
**File:** `app/Jobs/GenerateExportJob.php`

```php
namespace App\Jobs;

use App\Models\ExportJob;
use App\Services\ExportService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

class GenerateExportJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public $tries = 3;
    public $timeout = 600; // 10 minutes

    public function __construct(
        public ExportJob $exportJob
    ) {}

    public function handle(ExportService $exportService): void
    {
        $exportService->generateExport($this->exportJob);
    }

    public function failed(\Throwable $exception): void
    {
        $this->exportJob->update([
            'status' => 'failed',
            'error_message' => $exception->getMessage(),
            'completed_at' => now(),
        ]);
    }
}
```

#### Step 2.5: Create Export Excel Class
**File:** `app/Exports/SubmissionsExport.php`

```php
namespace App\Exports;

use Maatwebsite\Excel\Concerns\FromQuery;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithMapping;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;

class SubmissionsExport implements FromQuery, WithHeadings, WithMapping, ShouldAutoSize
{
    public function __construct(
        protected $query
    ) {}

    public function query()
    {
        return $this->query;
    }

    public function headings(): array
    {
        // Return column headers
        $sample = $this->query->first();
        return $sample ? array_keys((array) $sample) : [];
    }

    public function map($row): array
    {
        // Map row data
        return (array) $row;
    }
}
```

#### Step 2.6: Create Export Controller
**File:** `app/Http/Controllers/Api/ExportController.php`

```php
namespace App\Http\Controllers\Api;

use App\Models\ExportJob;
use App\Services\ExportService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class ExportController extends Controller
{
    public function __construct(
        protected ExportService $exportService
    ) {}

    public function request(Request $request, string $code): JsonResponse
    {
        $validated = $request->validate([
            'format' => 'required|in:csv,xlsx',
            'version' => 'nullable|string',
            'institution_id' => 'nullable|exists:institutions,id',
            'date_from' => 'nullable|date',
            'date_to' => 'nullable|date|after:date_from',
            'status' => 'nullable|array',
            'status.*' => 'in:draft,submitted,approved,rejected',
        ]);

        $exportJob = $this->exportService->requestExport(
            auth()->user(),
            $code,
            $validated
        );

        return response()->json([
            'data' => [
                'job_id' => $exportJob->id,
                'status' => $exportJob->status,
                'message' => 'Export job queued. You\'ll be notified when ready.',
            ],
        ]);
    }

    public function status(ExportJob $exportJob): JsonResponse
    {
        $this->authorize('view', $exportJob);

        return response()->json([
            'data' => [
                'job_id' => $exportJob->id,
                'status' => $exportJob->status,
                'format' => $exportJob->format,
                'file_size' => $exportJob->file_size,
                'started_at' => $exportJob->started_at,
                'completed_at' => $exportJob->completed_at,
                'expires_at' => $exportJob->expires_at,
                'download_url' => $exportJob->isCompleted() ?
                    "/api/exports/{$exportJob->id}/download" : null,
                'error_message' => $exportJob->error_message,
            ],
        ]);
    }

    public function download(ExportJob $exportJob)
    {
        $this->authorize('view', $exportJob);

        if (!$exportJob->isCompleted()) {
            return response()->json(['message' => 'Export not ready'], 400);
        }

        if ($exportJob->isExpired()) {
            return response()->json(['message' => 'Export expired'], 410);
        }

        $fileName = basename($exportJob->file_path);

        return Storage::download($exportJob->file_path, $fileName);
    }

    public function history(Request $request): JsonResponse
    {
        $exports = ExportJob::where('user_id', auth()->id())
            ->orderBy('created_at', 'desc')
            ->paginate(20);

        return response()->json($exports);
    }

    public function destroy(ExportJob $exportJob): JsonResponse
    {
        $this->authorize('delete', $exportJob);

        if ($exportJob->file_path) {
            Storage::delete($exportJob->file_path);
        }

        $exportJob->delete();

        return response()->json(['message' => 'Export deleted successfully']);
    }
}
```

#### Step 2.7: Add Export Routes
**File:** `routes/api.php`

```php
Route::middleware('auth:sanctum')->group(function () {
    // Export routes
    Route::prefix('exports')->group(function () {
        Route::post('/questionnaires/{code}', [ExportController::class, 'request']);
        Route::get('/{exportJob}/status', [ExportController::class, 'status']);
        Route::get('/{exportJob}/download', [ExportController::class, 'download']);
        Route::get('/history', [ExportController::class, 'history']);
        Route::delete('/{exportJob}', [ExportController::class, 'destroy']);
    });
});
```

#### Step 2.8: Create Cleanup Command
**File:** `app/Console/Commands/CleanupExpiredExports.php`

```php
namespace App\Console\Commands;

use App\Services\ExportService;
use Illuminate\Console\Command;

class CleanupExpiredExports extends Command
{
    protected $signature = 'exports:cleanup';
    protected $description = 'Delete expired export files';

    public function handle(ExportService $exportService): int
    {
        $count = $exportService->cleanupExpiredExports();

        $this->info("Cleaned up {$count} expired exports.");

        return 0;
    }
}
```

**Schedule:** `app/Console/Kernel.php`
```php
protected function schedule(Schedule $schedule): void
{
    $schedule->command('exports:cleanup')->daily();
}
```

---

### Week 3: Dashboard Frontend UI

#### Step 3.1: Install Recharts
```bash
npm install recharts
npm install -D @types/recharts
```

#### Step 3.2: Create Dashboard Hooks
**File:** `resources/js/hooks/useDashboardData.ts`

```typescript
import { useQuery } from '@tanstack/react-query';
import { api } from '@/services/api';

export function useDashboardData(filters?: DashboardFilters) {
  const queryKey = ['dashboard', 'overview', filters];

  return useQuery({
    queryKey,
    queryFn: () => api.dashboard.overview(filters),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useDashboardTrends(period: string, from: string, to: string, filters?: DashboardFilters) {
  return useQuery({
    queryKey: ['dashboard', 'trends', period, from, to, filters],
    queryFn: () => api.dashboard.trends(period, from, to, filters),
    staleTime: 5 * 60 * 1000,
  });
}

export function useQuestionnaireDashboard(code: string, filters?: QuestionnaireFilters) {
  return useQuery({
    queryKey: ['dashboard', 'questionnaire', code, filters],
    queryFn: () => api.dashboard.questionnaire(code, filters),
    staleTime: 5 * 60 * 1000,
  });
}
```

#### Step 3.3: Create Dashboard Filter Hook
**File:** `resources/js/hooks/useDashboardFilters.ts`

```typescript
import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';

export function useDashboardFilters() {
  const [searchParams, setSearchParams] = useSearchParams();

  const [filters, setFilters] = useState<DashboardFilters>({
    institution_id: searchParams.get('institution_id') || undefined,
    date_from: searchParams.get('date_from') || undefined,
    date_to: searchParams.get('date_to') || undefined,
    questionnaire_code: searchParams.get('questionnaire_code') || undefined,
  });

  useEffect(() => {
    // Update URL when filters change
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params.set(key, String(value));
    });
    setSearchParams(params, { replace: true });
  }, [filters, setSearchParams]);

  const updateFilters = (newFilters: Partial<DashboardFilters>) => {
    setFilters((prev) => ({ ...prev, ...newFilters }));
  };

  const clearFilters = () => {
    setFilters({});
  };

  const activeFilterCount = Object.values(filters).filter(Boolean).length;

  return {
    filters,
    updateFilters,
    clearFilters,
    activeFilterCount,
  };
}
```

#### Step 3.4: Create Chart Components
**Files:** See section 7.2 for implementations
- `resources/js/components/charts/PieChart.tsx`
- `resources/js/components/charts/LineChart.tsx`
- `resources/js/components/charts/BarChart.tsx`

#### Step 3.5: Create Dashboard Pages
**Files:** See section 7.1 for implementations
- `resources/js/pages/dashboard/DashboardOverview.tsx`
- `resources/js/pages/dashboard/QuestionnaireDashboard.tsx`

#### Step 3.6: Add Dashboard Routes to app.tsx
**File:** `resources/js/app.tsx`

```tsx
const DashboardOverview = React.lazy(() => import('@/pages/dashboard/DashboardOverview'));
const QuestionnaireDashboard = React.lazy(() => import('@/pages/dashboard/QuestionnaireDashboard'));

// In Routes:
<Route path="/dashboard" element={
  <ProtectedRoute>
    <React.Suspense fallback={<LoadingFallback />}>
      <DashboardOverview />
    </React.Suspense>
  </ProtectedRoute>
} />

<Route path="/dashboard/questionnaire/:code" element={
  <ProtectedRoute>
    <React.Suspense fallback={<LoadingFallback />}>
      {() => {
        const { code } = useParams();
        return <QuestionnaireDashboard code={code!} />;
      }}
    </React.Suspense>
  </ProtectedRoute>
} />
```

#### Step 3.7: Add Dashboard to Navigation
**File:** `resources/js/components/layout/AppLayout.tsx`

```tsx
const navigation = [
  { name: 'Dashboard', href: '/dashboard', permission: 'dashboard.view' },
  { name: 'Questionnaires', href: '/questionnaires', permission: 'questionnaires.view' },
  // ... existing items
];
```

---

### Week 4: Export Frontend & Testing

#### Step 4.1: Create Export Hook
**File:** `resources/js/hooks/useExport.ts`

```typescript
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';

export function useExport() {
  const queryClient = useQueryClient();

  const requestExport = useMutation({
    mutationFn: ({ code, options }: { code: string; options: ExportOptions }) =>
      api.exports.request(code, options),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exports', 'history'] });
    },
  });

  return {
    requestExport: requestExport.mutateAsync,
    isLoading: requestExport.isPending,
  };
}

export function useExportStatus(jobId: number, enabled: boolean = true) {
  return useQuery({
    queryKey: ['exports', jobId, 'status'],
    queryFn: () => api.exports.status(jobId),
    enabled,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      // Poll every 2 seconds while processing
      return status === 'processing' || status === 'pending' ? 2000 : false;
    },
  });
}

export function useExportHistory() {
  return useQuery({
    queryKey: ['exports', 'history'],
    queryFn: () => api.exports.history(),
    staleTime: 60 * 1000, // 1 minute
  });
}
```

#### Step 4.2: Create Export Modal Component
**File:** `resources/js/components/exports/ExportModal.tsx`

```typescript
// See section 7.3.1 for full implementation
```

#### Step 4.3: Create Export History Component
**File:** `resources/js/components/exports/ExportHistory.tsx`

```typescript
import { useExportHistory, useExportStatus } from '@/hooks/useExport';
import { format } from 'date-fns';

export function ExportHistory() {
  const { data: history, isLoading } = useExportHistory();

  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="bg-white shadow rounded-lg">
      <div className="px-6 py-4 border-b">
        <h3 className="text-lg font-semibold">Export History</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Export Date
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Questionnaire
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Format
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Status
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {history?.data.map((exportJob) => (
              <ExportRow key={exportJob.job_id} exportJob={exportJob} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ExportRow({ exportJob }: { exportJob: ExportJob }) {
  const { data: status } = useExportStatus(
    exportJob.job_id,
    exportJob.status !== 'completed' && exportJob.status !== 'failed'
  );

  const currentStatus = status?.status || exportJob.status;

  return (
    <tr>
      <td className="px-6 py-4 whitespace-nowrap text-sm">
        {format(new Date(exportJob.created_at), 'PPp')}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm">
        {exportJob.questionnaire_code}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm uppercase">
        {exportJob.format}
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <ExportStatusBadge status={currentStatus} />
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
        {currentStatus === 'completed' && (
          <a
            href={`/api/exports/${exportJob.job_id}/download`}
            className="text-indigo-600 hover:text-indigo-900"
            download
          >
            Download
          </a>
        )}
        {currentStatus === 'failed' && (
          <span className="text-red-600">Failed</span>
        )}
        {(currentStatus === 'pending' || currentStatus === 'processing') && (
          <span className="text-gray-500">Processing...</span>
        )}
      </td>
    </tr>
  );
}

function ExportStatusBadge({ status }: { status: string }) {
  const colors = {
    pending: 'bg-yellow-100 text-yellow-800',
    processing: 'bg-blue-100 text-blue-800',
    completed: 'bg-green-100 text-green-800',
    failed: 'bg-red-100 text-red-800',
  };

  return (
    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${colors[status]}`}>
      {status}
    </span>
  );
}
```

#### Step 4.4: Integrate Export into Questionnaire Dashboard
**File:** `resources/js/pages/dashboard/QuestionnaireDashboard.tsx`

```tsx
// Add to existing component
const [showExportModal, setShowExportModal] = useState(false);

// In JSX:
<div className="flex justify-between items-center">
  <h2 className="text-xl font-semibold">Export Data</h2>
  <button
    onClick={() => setShowExportModal(true)}
    className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
  >
    Export Data
  </button>
</div>

<ExportHistory />

{showExportModal && (
  <ExportModal
    questionnaireCode={code}
    onClose={() => setShowExportModal(false)}
  />
)}
```

#### Step 4.5: Write Backend Tests
**File:** `tests/Feature/DashboardTest.php`

```php
// See Step 1.6 for initial tests

it('returns questionnaire dashboard', function () {
    $admin = User::factory()->create();
    $admin->assignRole('admin');

    $questionnaire = Questionnaire::factory()->create(['code' => 'QA']);
    Submission::factory()->count(10)->create([
        'questionnaire_id' => $questionnaire->id,
        'status' => 'approved',
    ]);

    $response = $this->actingAs($admin)->getJson('/api/dashboard/questionnaire/QA');

    $response->assertStatus(200)
        ->assertJsonStructure([
            'data' => [
                'questionnaire',
                'statistics',
            ],
        ]);
});
```

**File:** `tests/Feature/ExportTest.php`

```php
it('requests export successfully', function () {
    $admin = User::factory()->create();
    $admin->assignRole('admin');

    Questionnaire::factory()->create(['code' => 'QA']);

    $response = $this->actingAs($admin)->postJson('/api/exports/questionnaires/QA', [
        'format' => 'csv',
        'version' => 'all',
    ]);

    $response->assertStatus(200)
        ->assertJsonStructure([
            'data' => ['job_id', 'status', 'message'],
        ]);

    expect($response->json('data.status'))->toBe('pending');
});

it('generates export file', function () {
    Storage::fake('local');

    $user = User::factory()->create();
    $questionnaire = Questionnaire::factory()->create(['code' => 'QA']);

    // Create analysis view (or mock)
    DB::statement('CREATE VIEW qa_analysis AS SELECT * FROM submissions WHERE 1=0');

    $exportJob = ExportJob::factory()->create([
        'user_id' => $user->id,
        'questionnaire_code' => 'QA',
        'format' => 'csv',
        'status' => 'pending',
    ]);

    $exportService = app(ExportService::class);
    $exportService->generateExport($exportJob);

    $exportJob->refresh();

    expect($exportJob->status)->toBe('completed');
    expect($exportJob->file_path)->not->toBeNull();
    Storage::disk('local')->assertExists($exportJob->file_path);
});
```

#### Step 4.6: Write Frontend Tests
**File:** `resources/js/__tests__/components/dashboard/DashboardOverview.test.tsx`

```tsx
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DashboardOverview } from '@/pages/dashboard/DashboardOverview';
import { api } from '@/services/api';

jest.mock('@/services/api');

describe('DashboardOverview', () => {
  const queryClient = new QueryClient();

  it('displays dashboard data', async () => {
    const mockData = {
      summary: {
        total_submissions: 1234,
        draft: 45,
        submitted: 234,
        approved: 890,
        rejected: 65,
      },
      status_distribution: [
        { status: 'draft', count: 45, percentage: 3.6 },
        { status: 'approved', count: 890, percentage: 72.1 },
      ],
    };

    (api.dashboard.overview as jest.Mock).mockResolvedValue({ data: mockData });

    render(
      <QueryClientProvider client={queryClient}>
        <DashboardOverview />
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('1,234')).toBeInTheDocument();
      expect(screen.getByText('Total Submissions')).toBeInTheDocument();
    });
  });
});
```

#### Step 4.7: E2E Tests
**File:** `tests/e2e/dashboard.spec.ts`

```typescript
import { test, expect } from '@playwright/test';

test('view dashboard as admin', async ({ page }) => {
  // Login
  await page.goto('http://localhost:5173');
  await page.fill('[name="email"]', 'admin@example.com');
  await page.fill('[name="password"]', 'password');
  await page.click('button[type="submit"]');

  // Navigate to dashboard
  await page.click('a:has-text("Dashboard")');

  // Verify dashboard loaded
  await expect(page.locator('h1:has-text("Dashboard Overview")')).toBeVisible();
  await expect(page.locator('text=Total Submissions')).toBeVisible();

  // Verify charts rendered
  await expect(page.locator('.recharts-wrapper')).toBeVisible();
});

test('export data from questionnaire dashboard', async ({ page }) => {
  // Login and navigate
  await page.goto('http://localhost:5173/dashboard/questionnaire/QA');

  // Click export button
  await page.click('button:has-text("Export Data")');

  // Export modal opens
  await expect(page.locator('text=Export Data')).toBeVisible();

  // Select options
  await page.click('input[value="xlsx"]');
  await page.click('button:has-text("Generate Export")');

  // Verify success message
  await expect(page.locator('text=Export job queued')).toBeVisible();

  // Check export history
  await expect(page.locator('table')).toContainText('QA');
  await expect(page.locator('table')).toContainText('pending');
});
```

---

## Testing Strategy

### 9.1 Unit Tests

**Coverage Target:** 80%+ for dashboard and export logic.

**Key Units to Test:**
- `DashboardService` methods (overview, trends, institution breakdown)
- `ExportService` methods (query building, file generation)
- Analysis view queries (validate SQL syntax)
- Filter application logic

**Example:**
```php
it('filters dashboard by date range', function () {
    $service = app(DashboardService::class);

    Submission::factory()->create(['created_at' => '2025-01-15']);
    Submission::factory()->create(['created_at' => '2025-02-15']);
    Submission::factory()->create(['created_at' => '2025-03-15']);

    $result = $service->getOverview([
        'date_from' => '2025-02-01',
        'date_to' => '2025-02-28',
    ]);

    expect($result['summary']->total_submissions)->toBe(1);
});
```

---

### 9.2 Integration Tests

**Scenarios:**
1. **Dashboard API Flow**
   - Request dashboard data → Verify response structure
   - Apply filters → Verify filtered results
   - Query institution hierarchy → Verify children included

2. **Export Flow**
   - Request export → Job queued
   - Process job → File generated
   - Download file → Correct content
   - Cleanup expired → Files deleted

3. **Analysis View Queries**
   - Create view → Verify view exists
   - Query view → Verify data normalized
   - Drop view → Verify view removed

---

### 9.3 Performance Tests

**Load Tests:**
- Dashboard with 10,000 submissions: <2 seconds
- Export with 10,000 submissions: <2 minutes
- Concurrent dashboard requests (100 users): <3 seconds (p95)

**Tools:** Apache JMeter or k6

**Example k6 Script:**
```javascript
import http from 'k6/http';
import { check, sleep } from 'k6';

export let options = {
  stages: [
    { duration: '1m', target: 50 },  // Ramp up to 50 users
    { duration: '2m', target: 100 }, // Ramp up to 100 users
    { duration: '1m', target: 0 },   // Ramp down
  ],
};

export default function () {
  let response = http.get('http://localhost:8000/api/dashboard/overview', {
    headers: { Authorization: 'Bearer YOUR_TOKEN' },
  });

  check(response, {
    'status is 200': (r) => r.status === 200,
    'response time < 2s': (r) => r.timings.duration < 2000,
  });

  sleep(1);
}
```

---

## Risk Assessment

### 10.1 Technical Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| **Slow dashboard queries** on large datasets | Medium | High | Use analysis views with indexes, implement caching, pagination |
| **Export timeout** for very large exports | Medium | Medium | Chunk queries, increase timeout, add progress tracking |
| **Analysis view maintenance** burden | Medium | Low | Document view creation process, provide admin UI in Phase 5 |
| **Chart rendering performance** with large datasets | Low | Medium | Limit data points (aggregate to time buckets), use virtualization |

---

### 10.2 User Experience Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| **Users confused by export options** | Medium | Low | Clear labels, help text, sensible defaults |
| **Users don't notice export completion** | Medium | Medium | Email + in-app notification, prominent download link |
| **Users expect real-time dashboard** | Medium | Low | Document refresh interval (5 min cache), manual refresh button |

---

## Performance Considerations

### 11.1 Database Optimization

**Indexes:**
- Analysis views use existing indexes on `submissions` table
- Add indexes on analysis view if materialized (future enhancement)

**Query Optimization:**
- Use `EXPLAIN ANALYZE` to optimize dashboard queries
- Limit result sets with pagination
- Use `COUNT(*)` estimates for very large tables

**Caching:**
- Cache dashboard data for 5 minutes (configurable)
- Invalidate cache on new submission approval

---

### 11.2 Export Performance

**Chunking:**
- Query in chunks of 1000 rows to prevent memory overflow
- Stream CSV output (don't load all data in memory)

**Parallel Processing:**
- Queue multiple export jobs concurrently (Laravel queue workers)
- Limit concurrent exports per user (e.g., max 3)

---

## Security Considerations

### 12.1 Data Access Control

**Dashboard:**
- Respect institution hierarchy (users only see their data + children)
- Enforce RBAC (only users with `dashboard.view` permission)

**Export:**
- Validate user has access to requested institution data
- Audit export requests (log who exported what)
- Rate limit export requests (max 5 per hour per user)

---

### 12.2 Export Security

**File Storage:**
- Store exports in private directory (not publicly accessible)
- Generate unique job IDs (prevent guessing)
- Expire exports after 24 hours (auto-cleanup)

**Download Authentication:**
- Validate user owns export job before download
- Use signed URLs (optional enhancement)

---

## Timeline & Milestones

### 13.1 Weekly Breakdown

| Week | Milestone | Deliverables | Success Criteria |
|------|-----------|--------------|------------------|
| **Week 1** | Analysis Views & Dashboard Backend | - Analysis view migrations<br>- DashboardService<br>- Dashboard API endpoints | - Views created successfully<br>- API returns correct data<br>- Tests pass |
| **Week 2** | Export System Backend | - ExportJob model<br>- ExportService<br>- Export API endpoints<br>- Queued job | - Export jobs queue successfully<br>- Files generate correctly<br>- Cleanup command works |
| **Week 3** | Dashboard Frontend UI | - Dashboard pages<br>- Chart components<br>- Filter components | - Dashboard renders charts<br>- Filters work correctly<br>- Responsive design |
| **Week 4** | Export Frontend & Testing | - Export modal<br>- Export history<br>- E2E tests<br>- Performance tests | - Export flow works end-to-end<br>- All tests pass<br>- Performance benchmarks met |

---

### 13.2 Critical Milestones

**Milestone 1: Dashboard API Complete (End of Week 1)**
- All dashboard endpoints functional
- Analysis views created
- Data accuracy validated

**Milestone 2: Export System Functional (End of Week 2)**
- Export jobs queue and process
- Files generate correctly (CSV and Excel)
- Download works

**Milestone 3: Dashboard UI Complete (End of Week 3)**
- Interactive dashboard with charts
- Filters functional
- Responsive on mobile

**Milestone 4: Phase 4 Complete (End of Week 4)**
- All features implemented and tested
- Documentation complete
- Ready for UAT

---

## Dependencies & Prerequisites

### 14.1 Prerequisites

**Before Starting Phase 4:**
- ✅ Phase 3 complete (Offline/PWA)
- ✅ Submission data exists for testing dashboards
- ✅ Multiple institutions and submissions for hierarchy testing

---

### 14.2 External Dependencies

**Backend:**
- `maatwebsite/excel` ^3.1 - Excel export (install in Week 2)

**Frontend:**
- `recharts` ^2.10 - Charts (install in Week 3)
- `date-fns` ^3.0 - Date formatting (already installed in Phase 3)

---

## Acceptance Criteria

### 15.1 Functional Criteria

**Must Have:**
- [ ] Dashboard displays key metrics (submission counts, status distribution)
- [ ] Charts render correctly (pie, line, bar)
- [ ] Filters work (institution, date range, status)
- [ ] Export requests queue successfully
- [ ] CSV export generates correct file
- [ ] Excel export generates correct file
- [ ] Export download works
- [ ] Export history displays user's exports
- [ ] Expired exports auto-delete after 24 hours

**Should Have:**
- [ ] Dashboard loads in <2 seconds (p95)
- [ ] Export completes in <2 minutes for 10,000 submissions
- [ ] Analysis views optimize query performance
- [ ] Notifications sent when export completes
- [ ] Export includes metadata (filters applied, export date)

**Nice to Have:**
- [ ] Long format export (optional)
- [ ] Chart export as image
- [ ] Dashboard refresh button
- [ ] Export cancellation

---

### 15.2 Performance Criteria

- [ ] Dashboard API responses <500ms (p95)
- [ ] Dashboard UI loads <2 seconds on 4G
- [ ] Charts render <1 second with 1000 data points
- [ ] Export job completes <2 minutes for 10,000 submissions
- [ ] Concurrent users (100) experience <3 second response times

---

### 15.3 Quality Criteria

- [ ] 80%+ code coverage for dashboard and export logic
- [ ] All E2E scenarios pass
- [ ] Zero data accuracy issues in exports
- [ ] Performance benchmarks met under load
- [ ] Accessible UI (keyboard navigation works)

---

## References

### 16.1 Documentation

**Official Docs:**
- **Recharts:** https://recharts.org/en-US/
- **maatwebsite/excel:** https://docs.laravel-excel.com/
- **PostgreSQL Views:** https://www.postgresql.org/docs/current/sql-createview.html

**Laravel:**
- **Queues:** https://laravel.com/docs/queues
- **Notifications:** https://laravel.com/docs/notifications

---

### 16.2 Related PRD Sections

**From PRD v2.0:**
- Section 13: Data Analysis & Export (lines 2084-2257)
- Section 17.1: Phase 4 Overview (lines 2635-2654)
- Section 5.1: Performance Requirements (NFR-1 to NFR-4)

---

### 16.3 Department Implementation Reference

**File:** `doc/plan/2025-11-26-department-implementation-summary.md`

**Apply learnings:**
- Comprehensive documentation
- Test-driven development
- Clear API examples
- Migration patterns

---

## Appendix: Quick Reference

### A.1 Key Files Created

**Backend:**
- `app/Services/DashboardService.php` - Dashboard logic
- `app/Services/ExportService.php` - Export logic
- `app/Http/Controllers/Api/DashboardController.php` - Dashboard endpoints
- `app/Http/Controllers/Api/ExportController.php` - Export endpoints
- `app/Models/ExportJob.php` - Export job model
- `app/Jobs/GenerateExportJob.php` - Queued export job
- `app/Exports/SubmissionsExport.php` - Excel export class
- `database/migrations/YYYY_MM_DD_create_export_jobs_table.php` - Migration
- `database/migrations/YYYY_MM_DD_create_qa_analysis_view.php` - View migration
- `database/sql/views/qa_analysis.sql` - Analysis view SQL

**Frontend:**
- `resources/js/pages/dashboard/DashboardOverview.tsx` - Overview page
- `resources/js/pages/dashboard/QuestionnaireDashboard.tsx` - Questionnaire page
- `resources/js/components/dashboard/SummaryCard.tsx` - Metric card
- `resources/js/components/dashboard/StatusDistributionChart.tsx` - Pie chart
- `resources/js/components/dashboard/TrendsChart.tsx` - Line chart
- `resources/js/components/dashboard/InstitutionTable.tsx` - Table
- `resources/js/components/dashboard/DashboardFilters.tsx` - Filters
- `resources/js/components/exports/ExportModal.tsx` - Export modal
- `resources/js/components/exports/ExportHistory.tsx` - History table
- `resources/js/components/charts/PieChart.tsx` - Chart component
- `resources/js/components/charts/LineChart.tsx` - Chart component
- `resources/js/components/charts/BarChart.tsx` - Chart component
- `resources/js/hooks/useDashboardData.ts` - Dashboard hook
- `resources/js/hooks/useDashboardFilters.ts` - Filter hook
- `resources/js/hooks/useExport.ts` - Export hook

---

### A.2 Key Commands

```bash
# Backend
php artisan migrate                       # Run migrations (create views, export_jobs table)
php artisan db:seed --class=DemoSeeder    # Seed demo data
php artisan queue:work                    # Start queue worker
php artisan exports:cleanup               # Cleanup expired exports
php artisan test                          # Run tests

# Frontend
npm install recharts                      # Install charts library
npm run build                             # Build frontend
npm run dev                               # Start dev server
npm test                                  # Run tests
```

---

### A.3 Troubleshooting

**Issue:** Analysis view not found
**Solution:** Run migrations, check view exists: `SELECT * FROM pg_views WHERE viewname = 'qa_analysis'`

**Issue:** Export job stuck in "processing"
**Solution:** Check queue worker running, check Laravel logs for errors

**Issue:** Dashboard slow to load
**Solution:** Check database indexes, add caching, optimize analysis view queries

**Issue:** Charts not rendering
**Solution:** Check data format, verify Recharts version, check browser console

---

**End of Phase 4 Implementation Plan**

---

**Next Steps:**
1. Review plan with team
2. Validate 4-week timeline
3. Begin Week 1: Analysis views and dashboard backend
4. Follow weekly implementation steps

The plan is production-ready and builds on learnings from previous phases. All features are fully specified with code examples and test scenarios.
