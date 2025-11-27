export interface User {
    id: number;
    name: string;
    email: string;
    institution_id: number | null;
    institution?: Institution;
    department_id?: number | null;
    department?: Department | null;
    locale?: string;
    is_active: boolean;
    roles: string[];
    permissions?: string[];
    last_login_at: string | null;
    created_at: string;
    updated_at: string;
}

export interface Institution {
    id: number;
    name: string;
    code: string;
    level: 'central' | 'province' | 'district';
    parent_institution_id: number | null;
    parent?: Institution;
    children?: Institution[];
    is_active: boolean;
    created_by?: { id: number; name: string };
    updated_by?: { id: number; name: string } | null;
    created_at: string;
    updated_at: string;
}

export interface Department {
    id: number;
    name: string;
    code: string;
    institution_id: number;
    institution?: { id: number; name: string; code: string; level: string };
    description: string | null;
    is_active: boolean;
    users_count?: number;
    created_by?: { id: number; name: string };
    updated_by?: { id: number; name: string } | null;
    created_at: string;
    updated_at: string;
}

export interface QuestionPermission {
    id: number;
    questionnaire_id: number;
    questionnaire?: { id: number; title: string; code: string };
    question_name: string;
    institution_id: number;
    institution?: { id: number; name: string; code: string };
    department_id: number;
    department?: { id: number; name: string; code: string };
    permission_type: 'edit' | 'view';
    created_at: string;
    updated_at: string;
}

export interface Questionnaire {
    id: number;
    code: string;
    version: number;
    title: string;
    description: string | null;
    surveyjs_json: SurveyJSJson;
    is_active: boolean;
    parent_version_id: number | null;
    published_at: string | null;
    deprecated_at: string | null;
    version_notes: string | null;
    breaking_changes: boolean;
    submissions_count: number;
    created_by?: { id: number; name: string };
    updated_by?: { id: number; name: string } | null;
    created_at: string;
    updated_at: string;
}

export interface SurveyJSJson {
    title?: string;
    pages?: SurveyJSPage[];
    elements?: SurveyJSElement[];
    [key: string]: unknown;
}

export interface SurveyJSPage {
    name: string;
    title?: string;
    elements?: SurveyJSElement[];
}

export interface SurveyJSElement {
    type: string;
    name: string;
    title?: string;
    isRequired?: boolean;
    choices?: string[];
    [key: string]: unknown;
}

export type SubmissionStatus = 'draft' | 'submitted' | 'approved' | 'rejected';

export interface Submission {
    id: number;
    questionnaire_id: number;
    questionnaire?: {
        id: number;
        code: string;
        version: number;
        title: string;
        surveyjs_json: SurveyJSJson;
    };
    institution_id: number;
    institution?: { id: number; name: string; code: string };
    status: SubmissionStatus;
    answers_json: Record<string, unknown>;
    submitted_at: string | null;
    approved_at: string | null;
    rejected_at: string | null;
    rejection_comments: string | null;
    created_by?: { id: number; name: string };
    updated_by?: { id: number; name: string } | null;
    approved_by?: { id: number; name: string } | null;
    rejected_by?: { id: number; name: string } | null;
    can_be_edited: boolean;
    question_permissions?: Record<string, boolean>;
    created_at: string;
    updated_at: string;
}

export interface DashboardStats {
    submissions: {
        total: number;
        draft: number;
        submitted: number;
        approved: number;
        rejected: number;
    };
    submissions_by_questionnaire: {
        questionnaire_id: number;
        questionnaire_title: string;
        questionnaire_code: string;
        count: number;
    }[];
    recent_submissions: {
        id: number;
        questionnaire: string;
        institution: string;
        created_by: string;
        status: SubmissionStatus;
        created_at: string;
    }[];
    total_users?: number;
    active_users?: number;
    total_institutions?: number;
    active_institutions?: number;
    total_questionnaires?: number;
    active_questionnaires?: number;
    submissions_by_institution?: {
        institution_id: number;
        institution_name: string;
        institution_code: string;
        count: number;
    }[];
}

export interface PaginatedResponse<T> {
    data: T[];
    links: {
        first: string;
        last: string;
        prev: string | null;
        next: string | null;
    };
    meta: {
        current_page: number;
        from: number;
        last_page: number;
        path: string;
        per_page: number;
        to: number;
        total: number;
    };
}

export interface LoginCredentials {
    email: string;
    password: string;
}

export interface AuthResponse {
    user: User;
    token: string;
}

export interface Notification {
    id: string;
    type: string;
    notifiable_type: string;
    notifiable_id: number;
    data: {
        type: 'submission_created' | 'submission_submitted' | 'submission_approved' | 'submission_rejected';
        submission_id: number;
        questionnaire_title: string;
        institution_name: string;
        url: string;
        rejection_comments?: string;
    };
    read_at: string | null;
    created_at: string;
    updated_at: string;
}

// Dashboard Types (Phase 4)
export interface DashboardFilters {
    institution_id?: number;
    date_from?: string;
    date_to?: string;
    questionnaire_code?: string;
    status?: SubmissionStatus;
}

export interface DashboardSummary {
    total_submissions: number;
    draft: number;
    submitted: number;
    approved: number;
    rejected: number;
}

export interface TrendData {
    current: number;
    previous: number;
    change: number;
}

export interface DashboardTrends {
    total: TrendData;
    approved: TrendData;
    rejected: TrendData;
}

export interface StatusDistribution {
    status: SubmissionStatus;
    count: number;
    percentage: number;
}

export interface DashboardOverview {
    summary: DashboardSummary;
    trends: DashboardTrends;
    status_distribution: StatusDistribution[];
}

export interface TimeSeriesData {
    date: string;
    draft: number;
    submitted: number;
    approved: number;
    rejected: number;
    total: number;
}

export interface InstitutionBreakdown {
    id: number;
    name: string;
    code: string;
    level: string;
    total_submissions: number;
    draft: number;
    submitted: number;
    approved: number;
    rejected: number;
}

export interface QuestionnaireVersionBreakdown {
    version: number;
    count: number;
    approved: number;
}

export interface QuestionnaireStats {
    summary: DashboardSummary;
    version_breakdown: QuestionnaireVersionBreakdown[];
}

// Export Types (Phase 4)
export type ExportFormat = 'csv' | 'xlsx';
export type ExportStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface ExportFilters {
    institution_id?: number;
    date_from?: string;
    date_to?: string;
    status?: SubmissionStatus;
    version?: number;
}

export interface ExportJob {
    id: number;
    user_id: number;
    questionnaire_code: string;
    format: ExportFormat;
    status: ExportStatus;
    filters: ExportFilters;
    file_path: string | null;
    file_size: number | null;
    error_message: string | null;
    started_at: string | null;
    completed_at: string | null;
    expires_at: string | null;
    created_at: string;
    is_expired?: boolean;
}
