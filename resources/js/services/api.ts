import axios from 'axios';
import type {
    AuthResponse,
    DashboardStats,
    Institution,
    LoginCredentials,
    PaginatedResponse,
    Questionnaire,
    Submission,
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

export default api;
