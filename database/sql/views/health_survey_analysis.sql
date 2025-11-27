-- Analysis view for HEALTH-SURVEY questionnaire
-- This view normalizes submission data across all versions
-- and provides stable columns for reporting and export

CREATE OR REPLACE VIEW health_survey_analysis AS
SELECT
  -- Submission metadata
  s.id AS submission_id,
  q.code AS questionnaire_code,
  q.version AS questionnaire_version,
  q.title AS questionnaire_title,

  -- Institution hierarchy
  i.id AS institution_id,
  i.name AS institution_name,
  i.code AS institution_code,
  i.level AS institution_level,
  parent_i.id AS parent_institution_id,
  parent_i.name AS parent_institution_name,
  parent_i.code AS parent_institution_code,

  -- Submission status and workflow
  s.status,
  s.submitted_at,
  s.approved_at,
  s.rejected_at,
  s.rejection_comments,

  -- User tracking
  s.created_by,
  creator.name AS creator_name,
  creator.email AS creator_email,
  s.updated_by,
  s.approved_by,
  approver.name AS approver_name,
  s.rejected_by,
  rejecter.name AS rejecter_name,

  -- Timestamps
  s.created_at,
  s.updated_at,

  -- Derived temporal fields
  DATE(s.created_at) AS submission_date,
  EXTRACT(YEAR FROM s.created_at) AS submission_year,
  EXTRACT(MONTH FROM s.created_at) AS submission_month,
  EXTRACT(WEEK FROM s.created_at) AS submission_week,
  EXTRACT(DOW FROM s.created_at) AS submission_day_of_week,

  -- Workflow metrics
  CASE
    WHEN s.approved_at IS NOT NULL AND s.submitted_at IS NOT NULL
    THEN EXTRACT(EPOCH FROM (s.approved_at - s.submitted_at)) / 3600
    ELSE NULL
  END AS approval_hours,

  CASE
    WHEN s.submitted_at IS NOT NULL
    THEN EXTRACT(EPOCH FROM (s.submitted_at - s.created_at)) / 3600
    ELSE NULL
  END AS draft_hours,

  -- Full JSON answers (for flexible querying)
  s.answers_json

FROM submissions s
JOIN questionnaires q ON q.id = s.questionnaire_id
JOIN institutions i ON i.id = s.institution_id
LEFT JOIN institutions parent_i ON parent_i.id = i.parent_institution_id
LEFT JOIN users creator ON creator.id = s.created_by
LEFT JOIN users approver ON approver.id = s.approved_by
LEFT JOIN users rejecter ON rejecter.id = s.rejected_by
WHERE q.code = 'HEALTH-SURVEY'
  AND s.deleted_at IS NULL;
