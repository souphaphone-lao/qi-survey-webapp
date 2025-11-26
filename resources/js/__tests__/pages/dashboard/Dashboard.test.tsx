import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Dashboard from '@/pages/dashboard/Dashboard';
import { AuthProvider } from '@/contexts/AuthContext';
import { dashboardApi } from '@/services/api';
import type { DashboardStats, User } from '@/types';

// Mock the API module
jest.mock('@/services/api', () => ({
    dashboardApi: {
        getStats: jest.fn(),
    },
    authApi: {
        getUser: jest.fn(),
        login: jest.fn(),
        logout: jest.fn(),
    },
}));

const mockDashboardApi = dashboardApi as jest.Mocked<typeof dashboardApi>;

// Mock AuthContext
jest.mock('@/contexts/AuthContext', () => ({
    ...jest.requireActual('@/contexts/AuthContext'),
    useAuth: jest.fn(),
}));

const { useAuth } = require('@/contexts/AuthContext');

describe('Dashboard Component', () => {
    let queryClient: QueryClient;

    const mockStats: DashboardStats = {
        submissions: {
            total: 150,
            draft: 30,
            submitted: 70,
            approved: 40,
            rejected: 10,
        },
        submissions_by_questionnaire: [
            {
                questionnaire_id: 1,
                questionnaire_title: 'Survey 2024',
                questionnaire_code: 'Q001',
                count: 50,
            },
        ],
        recent_submissions: [
            {
                id: 1,
                questionnaire: 'Survey 2024',
                institution: 'Test Institution',
                created_by: 'John Doe',
                status: 'submitted',
                created_at: '2024-01-15T10:30:00Z',
            },
            {
                id: 2,
                questionnaire: 'Survey 2023',
                institution: 'Another Institution',
                created_by: 'Jane Smith',
                status: 'approved',
                created_at: '2024-01-14T14:20:00Z',
            },
        ],
        total_users: 100,
        total_institutions: 25,
        total_questionnaires: 10,
    };

    beforeEach(() => {
        jest.clearAllMocks();
        localStorage.clear();

        // Create a new QueryClient for each test to avoid caching issues
        queryClient = new QueryClient({
            defaultOptions: {
                queries: {
                    retry: false,
                },
            },
        });

        // Default mock implementation
        useAuth.mockReturnValue({
            user: null,
            isLoading: false,
            isAuthenticated: false,
            hasRole: jest.fn().mockReturnValue(false),
            hasPermission: jest.fn(),
            hasAnyRole: jest.fn(),
            login: jest.fn(),
            logout: jest.fn(),
        });
    });

    const renderDashboard = () => {
        return render(
            <QueryClientProvider client={queryClient}>
                <Dashboard />
            </QueryClientProvider>
        );
    };

    describe('Loading State', () => {
        it('should display loading state while fetching data', () => {
            mockDashboardApi.getStats.mockImplementation(
                () => new Promise(() => {}) // Never resolves
            );

            renderDashboard();

            expect(screen.getByText('Loading dashboard...')).toBeInTheDocument();
        });
    });

    describe('Error State', () => {
        it('should display error message when stats fetch fails', async () => {
            mockDashboardApi.getStats.mockRejectedValue(new Error('Failed to fetch'));

            renderDashboard();

            await waitFor(() => {
                expect(screen.getByText('Failed to load dashboard statistics')).toBeInTheDocument();
            });
        });

        it('should not display dashboard content when error occurs', async () => {
            mockDashboardApi.getStats.mockRejectedValue(new Error('Failed to fetch'));

            renderDashboard();

            await waitFor(() => {
                expect(screen.getByText('Failed to load dashboard statistics')).toBeInTheDocument();
            });

            expect(screen.queryByText('Dashboard')).not.toBeInTheDocument();
        });
    });

    describe('Successful Data Rendering', () => {
        beforeEach(() => {
            mockDashboardApi.getStats.mockResolvedValue(mockStats);
        });

        it('should render dashboard title', async () => {
            renderDashboard();

            await waitFor(() => {
                expect(screen.getByText('Dashboard')).toBeInTheDocument();
            });
        });

        it('should display submission statistics cards', async () => {
            renderDashboard();

            await waitFor(() => {
                expect(screen.getByText('Total Submissions')).toBeInTheDocument();
                expect(screen.getByText('150')).toBeInTheDocument();
            });

            expect(screen.getByText('Draft')).toBeInTheDocument();
            expect(screen.getByText('30')).toBeInTheDocument();

            expect(screen.getByText('Submitted')).toBeInTheDocument();
            expect(screen.getByText('70')).toBeInTheDocument();

            expect(screen.getByText('Approved')).toBeInTheDocument();
            expect(screen.getByText('40')).toBeInTheDocument();

            expect(screen.getByText('Rejected')).toBeInTheDocument();
            expect(screen.getByText('10')).toBeInTheDocument();
        });

        it('should display recent submissions table', async () => {
            renderDashboard();

            await waitFor(() => {
                expect(screen.getByText('Recent Submissions')).toBeInTheDocument();
            });

            // Check table headers
            expect(screen.getByText('Questionnaire')).toBeInTheDocument();
            expect(screen.getByText('Institution')).toBeInTheDocument();
            expect(screen.getByText('Created By')).toBeInTheDocument();
            expect(screen.getByText('Status')).toBeInTheDocument();
            expect(screen.getByText('Created At')).toBeInTheDocument();
        });

        it('should display recent submissions data', async () => {
            renderDashboard();

            await waitFor(() => {
                expect(screen.getByText('Survey 2024')).toBeInTheDocument();
            });

            expect(screen.getByText('Test Institution')).toBeInTheDocument();
            expect(screen.getByText('John Doe')).toBeInTheDocument();
            expect(screen.getByText('Submitted')).toBeInTheDocument();

            expect(screen.getByText('Survey 2023')).toBeInTheDocument();
            expect(screen.getByText('Another Institution')).toBeInTheDocument();
            expect(screen.getByText('Jane Smith')).toBeInTheDocument();
            expect(screen.getByText('Approved')).toBeInTheDocument();
        });

        it('should format dates correctly in submissions table', async () => {
            renderDashboard();

            await waitFor(() => {
                const dates = screen.getAllByText(/1\/1\d\/2024/);
                expect(dates.length).toBeGreaterThan(0);
            });
        });

        it('should handle empty recent submissions', async () => {
            mockDashboardApi.getStats.mockResolvedValue({
                ...mockStats,
                recent_submissions: [],
            });

            renderDashboard();

            await waitFor(() => {
                expect(screen.getByText('No recent submissions')).toBeInTheDocument();
            });
        });

        it('should handle undefined recent submissions', async () => {
            mockDashboardApi.getStats.mockResolvedValue({
                ...mockStats,
                recent_submissions: undefined as any,
            });

            renderDashboard();

            await waitFor(() => {
                expect(screen.getByText('No recent submissions')).toBeInTheDocument();
            });
        });
    });

    describe('Admin-Specific Content', () => {
        it('should display admin stats when user is admin', async () => {
            useAuth.mockReturnValue({
                user: { id: 1, roles: ['admin'] } as User,
                isLoading: false,
                isAuthenticated: true,
                hasRole: jest.fn().mockReturnValue(true),
                hasPermission: jest.fn(),
                hasAnyRole: jest.fn(),
                login: jest.fn(),
                logout: jest.fn(),
            });

            mockDashboardApi.getStats.mockResolvedValue(mockStats);

            renderDashboard();

            await waitFor(() => {
                expect(screen.getByText('Total Users')).toBeInTheDocument();
            });

            expect(screen.getByText('100')).toBeInTheDocument();
            expect(screen.getByText('Total Institutions')).toBeInTheDocument();
            expect(screen.getByText('25')).toBeInTheDocument();
            expect(screen.getByText('Total Questionnaires')).toBeInTheDocument();
            expect(screen.getByText('10')).toBeInTheDocument();
        });

        it('should not display admin stats when user is not admin', async () => {
            useAuth.mockReturnValue({
                user: { id: 1, roles: ['user'] } as User,
                isLoading: false,
                isAuthenticated: true,
                hasRole: jest.fn().mockReturnValue(false),
                hasPermission: jest.fn(),
                hasAnyRole: jest.fn(),
                login: jest.fn(),
                logout: jest.fn(),
            });

            mockDashboardApi.getStats.mockResolvedValue(mockStats);

            renderDashboard();

            await waitFor(() => {
                expect(screen.getByText('Dashboard')).toBeInTheDocument();
            });

            expect(screen.queryByText('Total Users')).not.toBeInTheDocument();
            expect(screen.queryByText('Total Institutions')).not.toBeInTheDocument();
            expect(screen.queryByText('Total Questionnaires')).not.toBeInTheDocument();
        });

        it('should handle missing admin stats data gracefully', async () => {
            useAuth.mockReturnValue({
                user: { id: 1, roles: ['admin'] } as User,
                isLoading: false,
                isAuthenticated: true,
                hasRole: jest.fn().mockReturnValue(true),
                hasPermission: jest.fn(),
                hasAnyRole: jest.fn(),
                login: jest.fn(),
                logout: jest.fn(),
            });

            mockDashboardApi.getStats.mockResolvedValue({
                ...mockStats,
                total_users: undefined,
                total_institutions: undefined,
                total_questionnaires: undefined,
            });

            renderDashboard();

            await waitFor(() => {
                expect(screen.getByText('Total Users')).toBeInTheDocument();
            });

            // Should display 0 when stats are undefined
            const zeroValues = screen.getAllByText('0');
            expect(zeroValues.length).toBeGreaterThanOrEqual(3);
        });
    });

    describe('Status Badges', () => {
        beforeEach(() => {
            mockDashboardApi.getStats.mockResolvedValue(mockStats);
        });

        it('should render status badges with correct text', async () => {
            renderDashboard();

            await waitFor(() => {
                expect(screen.getByText('Submitted')).toBeInTheDocument();
                expect(screen.getByText('Approved')).toBeInTheDocument();
            });
        });

        it('should handle different status types', async () => {
            const statsWithVariousStatuses: DashboardStats = {
                ...mockStats,
                recent_submissions: [
                    {
                        id: 1,
                        questionnaire: 'Q1',
                        institution: 'I1',
                        created_by: 'User 1',
                        status: 'draft',
                        created_at: '2024-01-15T10:30:00Z',
                    },
                    {
                        id: 2,
                        questionnaire: 'Q2',
                        institution: 'I2',
                        created_by: 'User 2',
                        status: 'submitted',
                        created_at: '2024-01-14T10:30:00Z',
                    },
                    {
                        id: 3,
                        questionnaire: 'Q3',
                        institution: 'I3',
                        created_by: 'User 3',
                        status: 'approved',
                        created_at: '2024-01-13T10:30:00Z',
                    },
                    {
                        id: 4,
                        questionnaire: 'Q4',
                        institution: 'I4',
                        created_by: 'User 4',
                        status: 'rejected',
                        created_at: '2024-01-12T10:30:00Z',
                    },
                ],
            };

            mockDashboardApi.getStats.mockResolvedValue(statsWithVariousStatuses);

            renderDashboard();

            await waitFor(() => {
                expect(screen.getByText('Draft')).toBeInTheDocument();
                expect(screen.getByText('Submitted')).toBeInTheDocument();
                expect(screen.getByText('Approved')).toBeInTheDocument();
                expect(screen.getByText('Rejected')).toBeInTheDocument();
            });
        });
    });

    describe('API Integration', () => {
        it('should call dashboardApi.getStats on mount', async () => {
            mockDashboardApi.getStats.mockResolvedValue(mockStats);

            renderDashboard();

            await waitFor(() => {
                expect(mockDashboardApi.getStats).toHaveBeenCalledTimes(1);
            });

            expect(mockDashboardApi.getStats).toHaveBeenCalledWith();
        });

        it('should use correct query key for caching', async () => {
            mockDashboardApi.getStats.mockResolvedValue(mockStats);

            renderDashboard();

            await waitFor(() => {
                expect(mockDashboardApi.getStats).toHaveBeenCalled();
            });

            // Verify the query is cached
            const cachedData = queryClient.getQueryData(['dashboard-stats']);
            expect(cachedData).toEqual(mockStats);
        });
    });

    describe('Edge Cases', () => {
        it('should handle zero values in statistics', async () => {
            const zeroStats: DashboardStats = {
                submissions: {
                    total: 0,
                    draft: 0,
                    submitted: 0,
                    approved: 0,
                    rejected: 0,
                },
                submissions_by_questionnaire: [],
                recent_submissions: [],
                total_users: 0,
                total_institutions: 0,
                total_questionnaires: 0,
            };

            mockDashboardApi.getStats.mockResolvedValue(zeroStats);

            renderDashboard();

            await waitFor(() => {
                expect(screen.getByText('Dashboard')).toBeInTheDocument();
            });

            // Should display multiple zeros
            const zeroValues = screen.getAllByText('0');
            expect(zeroValues.length).toBeGreaterThan(0);
        });

        it('should handle large numbers in statistics', async () => {
            const largeStats: DashboardStats = {
                ...mockStats,
                submissions: {
                    total: 999999,
                    draft: 100000,
                    submitted: 200000,
                    approved: 300000,
                    rejected: 399999,
                },
            };

            mockDashboardApi.getStats.mockResolvedValue(largeStats);

            renderDashboard();

            await waitFor(() => {
                expect(screen.getByText('999999')).toBeInTheDocument();
            });
        });
    });
});
