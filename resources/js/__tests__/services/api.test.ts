import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';
import api, {
    authApi,
    dashboardApi,
    usersApi,
    institutionsApi,
    questionnairesApi,
    submissionsApi,
} from '@/services/api';
import type {
    User,
    AuthResponse,
    DashboardStats,
    Institution,
    Questionnaire,
    Submission,
    PaginatedResponse,
} from '@/types';

// Create a mock adapter for axios
const mock = new MockAdapter(api);

// Mock window.location
delete (window as any).location;
window.location = { href: '' } as Location;

describe('API Service', () => {
    beforeEach(() => {
        mock.reset();
        localStorage.clear();
        window.location.href = '';
    });

    afterAll(() => {
        mock.restore();
    });

    describe('Request Interceptor', () => {
        it('should add Authorization header when token exists', async () => {
            localStorage.setItem('token', 'test-token');
            mock.onGet('/api/test').reply(200, { success: true });

            await api.get('/test');

            expect(mock.history.get[0].headers?.Authorization).toBe('Bearer test-token');
        });

        it('should not add Authorization header when token does not exist', async () => {
            mock.onGet('/api/test').reply(200, { success: true });

            await api.get('/test');

            expect(mock.history.get[0].headers?.Authorization).toBeUndefined();
        });
    });

    describe('Response Interceptor', () => {
        it('should handle 401 responses by clearing storage and redirecting', async () => {
            localStorage.setItem('token', 'test-token');
            localStorage.setItem('user', JSON.stringify({ id: 1, name: 'Test' }));

            mock.onGet('/api/protected').reply(401, { message: 'Unauthorized' });

            await expect(api.get('/protected')).rejects.toThrow();

            expect(localStorage.getItem('token')).toBeNull();
            expect(localStorage.getItem('user')).toBeNull();
            expect(window.location.href).toBe('/login');
        });

        it('should not affect non-401 responses', async () => {
            localStorage.setItem('token', 'test-token');
            mock.onGet('/api/test').reply(200, { data: 'success' });

            const response = await api.get('/test');

            expect(response.data).toEqual({ data: 'success' });
            expect(localStorage.getItem('token')).toBe('test-token');
            expect(window.location.href).toBe('');
        });

        it('should handle other error status codes without redirect', async () => {
            localStorage.setItem('token', 'test-token');
            mock.onGet('/api/test').reply(500, { message: 'Server error' });

            await expect(api.get('/test')).rejects.toThrow();

            expect(localStorage.getItem('token')).toBe('test-token');
            expect(window.location.href).toBe('');
        });
    });

    describe('authApi', () => {
        const mockUser: User = {
            id: 1,
            name: 'Test User',
            email: 'test@example.com',
            institution_id: 1,
            is_active: true,
            roles: ['user'],
            permissions: ['users.view'],
            last_login_at: null,
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z',
        };

        describe('login', () => {
            it('should successfully login with credentials', async () => {
                const authResponse: AuthResponse = {
                    user: mockUser,
                    token: 'auth-token-123',
                };

                mock.onPost('/api/login').reply(200, authResponse);

                const result = await authApi.login({
                    email: 'test@example.com',
                    password: 'password123',
                });

                expect(result).toEqual(authResponse);
                expect(mock.history.post[0].data).toBe(
                    JSON.stringify({ email: 'test@example.com', password: 'password123' })
                );
            });

            it('should handle login failure', async () => {
                mock.onPost('/api/login').reply(422, {
                    message: 'Invalid credentials',
                    errors: {
                        email: ['The provided credentials are incorrect.'],
                    },
                });

                await expect(
                    authApi.login({ email: 'test@example.com', password: 'wrong' })
                ).rejects.toThrow();
            });
        });

        describe('logout', () => {
            it('should successfully logout', async () => {
                mock.onPost('/api/logout').reply(200);

                await expect(authApi.logout()).resolves.toBeUndefined();
                expect(mock.history.post[0].url).toBe('/logout');
            });

            it('should handle logout failure gracefully', async () => {
                mock.onPost('/api/logout').reply(500);

                await expect(authApi.logout()).rejects.toThrow();
            });
        });

        describe('getUser', () => {
            it('should fetch current user', async () => {
                mock.onGet('/api/user').reply(200, mockUser);

                const result = await authApi.getUser();

                expect(result).toEqual(mockUser);
            });

            it('should handle unauthorized user fetch', async () => {
                mock.onGet('/api/user').reply(401);

                await expect(authApi.getUser()).rejects.toThrow();
            });
        });
    });

    describe('dashboardApi', () => {
        const mockStats: DashboardStats = {
            submissions: {
                total: 100,
                draft: 20,
                submitted: 50,
                approved: 25,
                rejected: 5,
            },
            submissions_by_questionnaire: [],
            recent_submissions: [],
            total_users: 50,
            total_institutions: 10,
            total_questionnaires: 5,
        };

        describe('getStats', () => {
            it('should fetch dashboard stats without params', async () => {
                mock.onGet('/api/dashboard/stats').reply(200, mockStats);

                const result = await dashboardApi.getStats();

                expect(result).toEqual(mockStats);
            });

            it('should fetch dashboard stats with date params', async () => {
                mock.onGet('/api/dashboard/stats').reply(200, mockStats);

                const result = await dashboardApi.getStats({
                    from_date: '2024-01-01',
                    to_date: '2024-12-31',
                });

                expect(result).toEqual(mockStats);
                expect(mock.history.get[0].params).toEqual({
                    from_date: '2024-01-01',
                    to_date: '2024-12-31',
                });
            });

            it('should handle stats fetch error', async () => {
                mock.onGet('/api/dashboard/stats').reply(500);

                await expect(dashboardApi.getStats()).rejects.toThrow();
            });
        });
    });

    describe('usersApi', () => {
        const mockUser: User = {
            id: 1,
            name: 'Test User',
            email: 'test@example.com',
            institution_id: 1,
            is_active: true,
            roles: ['user'],
            last_login_at: null,
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z',
        };

        const mockPaginatedResponse: PaginatedResponse<User> = {
            data: [mockUser],
            links: {
                first: '/api/users?page=1',
                last: '/api/users?page=1',
                prev: null,
                next: null,
            },
            meta: {
                current_page: 1,
                from: 1,
                last_page: 1,
                path: '/api/users',
                per_page: 15,
                to: 1,
                total: 1,
            },
        };

        it('should list users with pagination', async () => {
            mock.onGet('/api/users').reply(200, mockPaginatedResponse);

            const result = await usersApi.list();

            expect(result).toEqual(mockPaginatedResponse);
        });

        it('should list users with search params', async () => {
            mock.onGet('/api/users').reply(200, mockPaginatedResponse);

            await usersApi.list({ search: 'test', page: 2 });

            expect(mock.history.get[0].params).toEqual({ search: 'test', page: 2 });
        });

        it('should get a single user', async () => {
            mock.onGet('/api/users/1').reply(200, { data: mockUser });

            const result = await usersApi.get(1);

            expect(result).toEqual(mockUser);
        });

        it('should create a user', async () => {
            const newUser = {
                name: 'New User',
                email: 'new@example.com',
                password: 'password123',
                role: 'user',
                institution_id: 1,
            };

            mock.onPost('/api/users').reply(201, { data: { ...mockUser, ...newUser } });

            const result = await usersApi.create(newUser);

            expect(result.name).toBe(newUser.name);
            expect(mock.history.post[0].data).toBe(JSON.stringify(newUser));
        });

        it('should update a user', async () => {
            const updates = { name: 'Updated Name' };
            mock.onPut('/api/users/1').reply(200, { data: { ...mockUser, ...updates } });

            const result = await usersApi.update(1, updates);

            expect(result.name).toBe(updates.name);
        });

        it('should delete a user', async () => {
            mock.onDelete('/api/users/1').reply(204);

            await expect(usersApi.delete(1)).resolves.toBeUndefined();
        });
    });

    describe('institutionsApi', () => {
        const mockInstitution: Institution = {
            id: 1,
            name: 'Test Institution',
            code: 'TEST',
            level: 'central',
            parent_institution_id: null,
            is_active: true,
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z',
        };

        it('should list institutions with pagination', async () => {
            const mockPaginatedResponse: PaginatedResponse<Institution> = {
                data: [mockInstitution],
                links: {
                    first: '/api/institutions?page=1',
                    last: '/api/institutions?page=1',
                    prev: null,
                    next: null,
                },
                meta: {
                    current_page: 1,
                    from: 1,
                    last_page: 1,
                    path: '/api/institutions',
                    per_page: 15,
                    to: 1,
                    total: 1,
                },
            };

            mock.onGet('/api/institutions').reply(200, mockPaginatedResponse);

            const result = await institutionsApi.list();

            expect(result).toEqual(mockPaginatedResponse);
        });

        it('should get all institutions without pagination', async () => {
            mock.onGet('/api/institutions/list').reply(200, [mockInstitution]);

            const result = await institutionsApi.getAll();

            expect(result).toEqual([mockInstitution]);
        });

        it('should create an institution', async () => {
            const newInstitution = {
                name: 'New Institution',
                code: 'NEW',
                level: 'province' as const,
            };

            mock.onPost('/api/institutions').reply(201, {
                data: { ...mockInstitution, ...newInstitution },
            });

            const result = await institutionsApi.create(newInstitution);

            expect(result.name).toBe(newInstitution.name);
        });

        it('should delete an institution', async () => {
            mock.onDelete('/api/institutions/1').reply(204);

            await expect(institutionsApi.delete(1)).resolves.toBeUndefined();
        });
    });

    describe('questionnairesApi', () => {
        const mockQuestionnaire: Questionnaire = {
            id: 1,
            code: 'Q001',
            version: 1,
            title: 'Test Questionnaire',
            description: 'Test description',
            surveyjs_json: { pages: [] },
            is_active: true,
            parent_version_id: null,
            published_at: null,
            deprecated_at: null,
            version_notes: null,
            breaking_changes: false,
            submissions_count: 0,
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z',
        };

        it('should duplicate a questionnaire', async () => {
            const duplicated = { ...mockQuestionnaire, id: 2, code: 'Q002' };
            mock.onPost('/api/questionnaires/1/duplicate').reply(200, { data: duplicated });

            const result = await questionnairesApi.duplicate(1);

            expect(result.id).toBe(2);
            expect(result.code).toBe('Q002');
        });

        it('should get a questionnaire', async () => {
            mock.onGet('/api/questionnaires/1').reply(200, { data: mockQuestionnaire });

            const result = await questionnairesApi.get(1);

            expect(result).toEqual(mockQuestionnaire);
        });
    });

    describe('submissionsApi', () => {
        const mockSubmission: Submission = {
            id: 1,
            questionnaire_id: 1,
            institution_id: 1,
            status: 'draft',
            answers_json: {},
            submitted_at: null,
            approved_at: null,
            rejected_at: null,
            rejection_comments: null,
            can_be_edited: true,
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z',
        };

        it('should list all submissions', async () => {
            const mockPaginatedResponse: PaginatedResponse<Submission> = {
                data: [mockSubmission],
                links: {
                    first: '/api/submissions?page=1',
                    last: '/api/submissions?page=1',
                    prev: null,
                    next: null,
                },
                meta: {
                    current_page: 1,
                    from: 1,
                    last_page: 1,
                    path: '/api/submissions',
                    per_page: 15,
                    to: 1,
                    total: 1,
                },
            };

            mock.onGet('/api/submissions').reply(200, mockPaginatedResponse);

            const result = await submissionsApi.list();

            expect(result).toEqual(mockPaginatedResponse);
        });

        it('should list submissions by questionnaire', async () => {
            const mockPaginatedResponse: PaginatedResponse<Submission> = {
                data: [mockSubmission],
                links: {
                    first: '/api/questionnaires/1/submissions?page=1',
                    last: '/api/questionnaires/1/submissions?page=1',
                    prev: null,
                    next: null,
                },
                meta: {
                    current_page: 1,
                    from: 1,
                    last_page: 1,
                    path: '/api/questionnaires/1/submissions',
                    per_page: 15,
                    to: 1,
                    total: 1,
                },
            };

            mock.onGet('/api/questionnaires/1/submissions').reply(200, mockPaginatedResponse);

            const result = await submissionsApi.listByQuestionnaire(1);

            expect(result).toEqual(mockPaginatedResponse);
        });

        it('should create a submission', async () => {
            mock.onPost('/api/questionnaires/1/submissions').reply(201, { data: mockSubmission });

            const result = await submissionsApi.create(1);

            expect(result).toEqual(mockSubmission);
        });

        it('should submit a submission', async () => {
            const submitted = { ...mockSubmission, status: 'submitted' as const };
            mock.onPost('/api/submissions/1/submit').reply(200, { data: submitted });

            const result = await submissionsApi.submit(1);

            expect(result.status).toBe('submitted');
        });

        it('should approve a submission', async () => {
            const approved = { ...mockSubmission, status: 'approved' as const };
            mock.onPost('/api/submissions/1/approve').reply(200, { data: approved });

            const result = await submissionsApi.approve(1);

            expect(result.status).toBe('approved');
        });

        it('should reject a submission with comments', async () => {
            const rejected = {
                ...mockSubmission,
                status: 'rejected' as const,
                rejection_comments: 'Incomplete data',
            };
            mock.onPost('/api/submissions/1/reject').reply(200, { data: rejected });

            const result = await submissionsApi.reject(1, 'Incomplete data');

            expect(result.status).toBe('rejected');
            expect(result.rejection_comments).toBe('Incomplete data');
            expect(mock.history.post[0].data).toBe(
                JSON.stringify({ rejection_comments: 'Incomplete data' })
            );
        });

        it('should update a submission', async () => {
            const updated = { ...mockSubmission, answers_json: { question1: 'answer1' } };
            mock.onPut('/api/submissions/1').reply(200, { data: updated });

            const result = await submissionsApi.update(1, {
                answers_json: { question1: 'answer1' },
            });

            expect(result.answers_json).toEqual({ question1: 'answer1' });
        });

        it('should delete a submission', async () => {
            mock.onDelete('/api/submissions/1').reply(204);

            await expect(submissionsApi.delete(1)).resolves.toBeUndefined();
        });
    });
});
