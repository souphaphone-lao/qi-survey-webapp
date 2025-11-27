import axios from 'axios';
import type {
    AuthResponse,
    DashboardFilters,
    DashboardOverview,
    DashboardStats,
    Department,
    ExportFilters,
    ExportFormat,
    ExportJob,
    InstitutionBreakdown,
    Institution,
    LoginCredentials,
    Notification,
    PaginatedResponse,
    QuestionnaireStats,
    QuestionPermission,
    Questionnaire,
    Submission,
    TimeSeriesData,
    User,
} from '@/types';

const api = axios.create({
    baseURL: '/api',
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
    },
    withCredentials: true,
    withXSRFToken: true,
});

// Add auth token to requests
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Handle 401 responses
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

// CSRF cookie fetching
export const getCsrfCookie = async (): Promise<void> => {
    await axios.get('/sanctum/csrf-cookie', {
        baseURL: '',
        withCredentials: true,
    });
};

// Auth API
export const authApi = {
    login: async (credentials: LoginCredentials): Promise<AuthResponse> => {
        // Fetch CSRF cookie before login
        await getCsrfCookie();
        const response = await api.post<AuthResponse>('/login', credentials);
        return response.data;
    },

    logout: async (): Promise<void> => {
        await api.post('/logout');
    },

    getUser: async (): Promise<User> => {
        const response = await api.get<User>('/user');
        return response.data;
    },
};

// Dashboard API
export const dashboardApi = {
    getStats: async (params?: { from_date?: string; to_date?: string }): Promise<DashboardStats> => {
        const response = await api.get<DashboardStats>('/dashboard/stats', { params });
        return response.data;
    },

    // Phase 4 Dashboard endpoints
    getOverview: async (filters?: DashboardFilters): Promise<DashboardOverview> => {
        const response = await api.get<{ data: DashboardOverview }>('/dashboard/overview', { params: filters });
        return response.data.data;
    },

    getTrends: async (params: {
        period: 'daily' | 'weekly' | 'monthly';
        date_from: string;
        date_to: string;
    } & DashboardFilters): Promise<TimeSeriesData[]> => {
        const response = await api.get<{ data: TimeSeriesData[] }>('/dashboard/trends', { params });
        return response.data.data;
    },

    getInstitutionBreakdown: async (filters?: DashboardFilters): Promise<InstitutionBreakdown[]> => {
        const response = await api.get<{ data: InstitutionBreakdown[] }>('/dashboard/institutions', { params: filters });
        return response.data.data;
    },

    getQuestionnaireStats: async (code: string, filters?: DashboardFilters): Promise<QuestionnaireStats> => {
        const response = await api.get<{ data: QuestionnaireStats }>(`/dashboard/questionnaire/${code}`, { params: filters });
        return response.data.data;
    },
};

// Users API
export const usersApi = {
    list: async (params?: Record<string, unknown>): Promise<PaginatedResponse<User>> => {
        const response = await api.get<PaginatedResponse<User>>('/users', { params });
        return response.data;
    },

    get: async (id: number): Promise<User> => {
        const response = await api.get<{ data: User }>(`/users/${id}`);
        return response.data.data;
    },

    create: async (data: Partial<User> & { password: string; role: string }): Promise<User> => {
        const response = await api.post<{ data: User }>('/users', data);
        return response.data.data;
    },

    update: async (id: number, data: Partial<User> & { role?: string }): Promise<User> => {
        const response = await api.put<{ data: User }>(`/users/${id}`, data);
        return response.data.data;
    },

    delete: async (id: number): Promise<void> => {
        await api.delete(`/users/${id}`);
    },
};

// Institutions API
export const institutionsApi = {
    list: async (params?: Record<string, unknown>): Promise<PaginatedResponse<Institution>> => {
        const response = await api.get<PaginatedResponse<Institution>>('/institutions', { params });
        return response.data;
    },

    getAll: async (): Promise<Institution[]> => {
        const response = await api.get<Institution[]>('/institutions/list');
        return response.data;
    },

    get: async (id: number): Promise<Institution> => {
        const response = await api.get<{ data: Institution }>(`/institutions/${id}`);
        return response.data.data;
    },

    create: async (data: Partial<Institution>): Promise<Institution> => {
        const response = await api.post<{ data: Institution }>('/institutions', data);
        return response.data.data;
    },

    update: async (id: number, data: Partial<Institution>): Promise<Institution> => {
        const response = await api.put<{ data: Institution }>(`/institutions/${id}`, data);
        return response.data.data;
    },

    delete: async (id: number): Promise<void> => {
        await api.delete(`/institutions/${id}`);
    },
};

// Questionnaires API
export const questionnairesApi = {
    list: async (params?: Record<string, unknown>): Promise<PaginatedResponse<Questionnaire>> => {
        const response = await api.get<PaginatedResponse<Questionnaire>>('/questionnaires', { params });
        return response.data;
    },

    getAll: async (): Promise<Questionnaire[]> => {
        const response = await api.get<Questionnaire[]>('/questionnaires/list');
        return response.data;
    },

    get: async (id: number): Promise<Questionnaire> => {
        const response = await api.get<{ data: Questionnaire }>(`/questionnaires/${id}`);
        return response.data.data;
    },

    create: async (data: Partial<Questionnaire>): Promise<Questionnaire> => {
        const response = await api.post<{ data: Questionnaire }>('/questionnaires', data);
        return response.data.data;
    },

    update: async (id: number, data: Partial<Questionnaire>): Promise<Questionnaire> => {
        const response = await api.put<{ data: Questionnaire }>(`/questionnaires/${id}`, data);
        return response.data.data;
    },

    delete: async (id: number): Promise<void> => {
        await api.delete(`/questionnaires/${id}`);
    },

    duplicate: async (id: number): Promise<Questionnaire> => {
        const response = await api.post<{ data: Questionnaire }>(`/questionnaires/${id}/duplicate`);
        return response.data.data;
    },
};

// Submissions API
export const submissionsApi = {
    list: async (params?: Record<string, unknown>): Promise<PaginatedResponse<Submission>> => {
        const response = await api.get<PaginatedResponse<Submission>>('/submissions', { params });
        return response.data;
    },

    listByQuestionnaire: async (
        questionnaireId: number,
        params?: Record<string, unknown>
    ): Promise<PaginatedResponse<Submission>> => {
        const response = await api.get<PaginatedResponse<Submission>>(
            `/questionnaires/${questionnaireId}/submissions`,
            { params }
        );
        return response.data;
    },

    get: async (id: number): Promise<Submission> => {
        const response = await api.get<{ data: Submission }>(`/submissions/${id}`);
        return response.data.data;
    },

    create: async (questionnaireId: number, data?: Partial<Submission>): Promise<Submission> => {
        const response = await api.post<{ data: Submission }>(
            `/questionnaires/${questionnaireId}/submissions`,
            data
        );
        return response.data.data;
    },

    update: async (id: number, data: Partial<Submission>): Promise<Submission> => {
        const response = await api.put<{ data: Submission }>(`/submissions/${id}`, data);
        return response.data.data;
    },

    delete: async (id: number): Promise<void> => {
        await api.delete(`/submissions/${id}`);
    },

    submit: async (id: number): Promise<Submission> => {
        const response = await api.post<{ data: Submission }>(`/submissions/${id}/submit`);
        return response.data.data;
    },

    approve: async (id: number): Promise<Submission> => {
        const response = await api.post<{ data: Submission }>(`/submissions/${id}/approve`);
        return response.data.data;
    },

    reject: async (id: number, rejection_comments: string): Promise<Submission> => {
        const response = await api.post<{ data: Submission }>(`/submissions/${id}/reject`, {
            rejection_comments,
        });
        return response.data.data;
    },
};

// Departments API
export const departmentsApi = {
    list: async (params?: Record<string, unknown>): Promise<PaginatedResponse<Department>> => {
        const response = await api.get<PaginatedResponse<Department>>('/departments', { params });
        return response.data;
    },

    getAll: async (params?: { institution_id?: number }): Promise<Department[]> => {
        const response = await api.get<Department[]>('/departments/list', { params });
        return response.data;
    },

    get: async (id: number): Promise<Department> => {
        const response = await api.get<{ data: Department }>(`/departments/${id}`);
        return response.data.data;
    },

    create: async (data: Partial<Department>): Promise<Department> => {
        const response = await api.post<{ data: Department }>('/departments', data);
        return response.data.data;
    },

    update: async (id: number, data: Partial<Department>): Promise<Department> => {
        const response = await api.put<{ data: Department }>(`/departments/${id}`, data);
        return response.data.data;
    },

    delete: async (id: number): Promise<void> => {
        await api.delete(`/departments/${id}`);
    },
};

// Question Permissions API
export const questionPermissionsApi = {
    list: async (params?: Record<string, unknown>): Promise<PaginatedResponse<QuestionPermission>> => {
        const response = await api.get<PaginatedResponse<QuestionPermission>>('/question-permissions', { params });
        return response.data;
    },

    byQuestionnaire: async (questionnaireId: number): Promise<QuestionPermission[]> => {
        const response = await api.get<QuestionPermission[]>(`/questionnaires/${questionnaireId}/permissions`);
        return response.data;
    },

    create: async (data: Partial<QuestionPermission>): Promise<QuestionPermission> => {
        const response = await api.post<{ data: QuestionPermission }>('/question-permissions', data);
        return response.data.data;
    },

    bulkStore: async (permissions: Partial<QuestionPermission>[]): Promise<{ created_count: number; updated_count: number }> => {
        const response = await api.post<{ created_count: number; updated_count: number }>('/question-permissions/bulk', {
            permissions,
        });
        return response.data;
    },

    delete: async (id: number): Promise<void> => {
        await api.delete(`/question-permissions/${id}`);
    },
};

// Exports API (Phase 4)
export const exportsApi = {
    list: async (params?: { questionnaire_code?: string; status?: string }): Promise<PaginatedResponse<ExportJob>> => {
        const response = await api.get<PaginatedResponse<ExportJob>>('/exports', { params });
        return response.data;
    },

    get: async (id: number): Promise<ExportJob> => {
        const response = await api.get<{ data: ExportJob }>(`/exports/${id}`);
        return response.data.data;
    },

    create: async (questionnaireCode: string, format: ExportFormat, filters?: ExportFilters): Promise<ExportJob> => {
        const response = await api.post<{ data: ExportJob }>(`/exports/questionnaires/${questionnaireCode}`, {
            format,
            filters,
        });
        return response.data.data;
    },

    download: async (id: number): Promise<Blob> => {
        const response = await api.get(`/exports/${id}/download`, {
            responseType: 'blob',
        });
        return response.data;
    },

    delete: async (id: number): Promise<void> => {
        await api.delete(`/exports/${id}`);
    },
};

// Notifications API
export const notificationsApi = {
    list: async (params?: { unread_only?: boolean; per_page?: number }): Promise<PaginatedResponse<Notification>> => {
        const response = await api.get<PaginatedResponse<Notification>>('/notifications', { params });
        return response.data;
    },

    unreadCount: async (): Promise<{ count: number }> => {
        const response = await api.get<{ count: number }>('/notifications/unread-count');
        return response.data;
    },

    markAsRead: async (id: string): Promise<void> => {
        await api.put(`/notifications/${id}/read`);
    },

    markAllAsRead: async (): Promise<void> => {
        await api.put('/notifications/mark-all-read');
    },
};

export default api;
