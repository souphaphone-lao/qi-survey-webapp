import React from 'react';
import { renderHook, waitFor, act } from '@testing-library/react';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { authApi } from '@/services/api';
import type { User, AuthResponse } from '@/types';

// Mock the API module
jest.mock('@/services/api', () => ({
    authApi: {
        login: jest.fn(),
        logout: jest.fn(),
        getUser: jest.fn(),
    },
}));

const mockAuthApi = authApi as jest.Mocked<typeof authApi>;

describe('AuthContext', () => {
    const mockUser: User = {
        id: 1,
        name: 'Test User',
        email: 'test@example.com',
        institution_id: 1,
        institution: {
            id: 1,
            name: 'Test Institution',
            code: 'TEST',
            level: 'central',
            parent_institution_id: null,
            is_active: true,
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z',
        },
        is_active: true,
        roles: ['admin', 'user'],
        permissions: ['users.view', 'users.create', 'institutions.view'],
        last_login_at: '2024-01-01T00:00:00Z',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
    };

    beforeEach(() => {
        // Clear all mocks before each test
        jest.clearAllMocks();

        // Clear localStorage
        localStorage.clear();
    });

    describe('useAuth hook', () => {
        it('should throw error when used outside AuthProvider', () => {
            // Suppress console.error for this test
            const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

            expect(() => {
                renderHook(() => useAuth());
            }).toThrow('useAuth must be used within an AuthProvider');

            consoleError.mockRestore();
        });
    });

    describe('AuthProvider initialization', () => {
        it('should initialize with null user when no token exists', async () => {
            mockAuthApi.getUser.mockResolvedValue(mockUser);

            const { result } = renderHook(() => useAuth(), {
                wrapper: ({ children }) => <AuthProvider>{children}</AuthProvider>,
            });

            await waitFor(() => {
                expect(result.current.isLoading).toBe(false);
            });

            expect(result.current.user).toBeNull();
            expect(result.current.isAuthenticated).toBe(false);
            expect(mockAuthApi.getUser).not.toHaveBeenCalled();
        });

        it('should fetch user when token exists in localStorage', async () => {
            localStorage.setItem('token', 'mock-token');
            mockAuthApi.getUser.mockResolvedValue(mockUser);

            const { result } = renderHook(() => useAuth(), {
                wrapper: ({ children }) => <AuthProvider>{children}</AuthProvider>,
            });

            await waitFor(() => {
                expect(result.current.isLoading).toBe(false);
            });

            expect(mockAuthApi.getUser).toHaveBeenCalledTimes(1);
            expect(result.current.user).toEqual(mockUser);
            expect(result.current.isAuthenticated).toBe(true);
            expect(localStorage.getItem('user')).toBe(JSON.stringify(mockUser));
        });

        it('should handle failed user fetch and clear storage', async () => {
            localStorage.setItem('token', 'invalid-token');
            localStorage.setItem('user', JSON.stringify(mockUser));
            mockAuthApi.getUser.mockRejectedValue(new Error('Unauthorized'));

            const { result } = renderHook(() => useAuth(), {
                wrapper: ({ children }) => <AuthProvider>{children}</AuthProvider>,
            });

            await waitFor(() => {
                expect(result.current.isLoading).toBe(false);
            });

            expect(result.current.user).toBeNull();
            expect(result.current.isAuthenticated).toBe(false);
            expect(localStorage.getItem('token')).toBeNull();
            expect(localStorage.getItem('user')).toBeNull();
        });

        it('should load user from localStorage on mount', async () => {
            localStorage.setItem('user', JSON.stringify(mockUser));
            localStorage.setItem('token', 'mock-token');
            mockAuthApi.getUser.mockResolvedValue(mockUser);

            const { result } = renderHook(() => useAuth(), {
                wrapper: ({ children }) => <AuthProvider>{children}</AuthProvider>,
            });

            // User should be available from localStorage immediately
            expect(result.current.user).toEqual(mockUser);

            await waitFor(() => {
                expect(result.current.isLoading).toBe(false);
            });
        });
    });

    describe('login', () => {
        it('should successfully login and store user data', async () => {
            const loginResponse: AuthResponse = {
                user: mockUser,
                token: 'new-auth-token',
            };

            mockAuthApi.login.mockResolvedValue(loginResponse);

            const { result } = renderHook(() => useAuth(), {
                wrapper: ({ children }) => <AuthProvider>{children}</AuthProvider>,
            });

            await waitFor(() => {
                expect(result.current.isLoading).toBe(false);
            });

            await act(async () => {
                await result.current.login({
                    email: 'test@example.com',
                    password: 'password123',
                });
            });

            expect(mockAuthApi.login).toHaveBeenCalledWith({
                email: 'test@example.com',
                password: 'password123',
            });
            expect(result.current.user).toEqual(mockUser);
            expect(result.current.isAuthenticated).toBe(true);
            expect(localStorage.getItem('token')).toBe('new-auth-token');
            expect(localStorage.getItem('user')).toBe(JSON.stringify(mockUser));
        });

        it('should handle login failure', async () => {
            mockAuthApi.login.mockRejectedValue(new Error('Invalid credentials'));

            const { result } = renderHook(() => useAuth(), {
                wrapper: ({ children }) => <AuthProvider>{children}</AuthProvider>,
            });

            await waitFor(() => {
                expect(result.current.isLoading).toBe(false);
            });

            await expect(
                act(async () => {
                    await result.current.login({
                        email: 'test@example.com',
                        password: 'wrong-password',
                    });
                })
            ).rejects.toThrow('Invalid credentials');

            expect(result.current.user).toBeNull();
            expect(result.current.isAuthenticated).toBe(false);
        });
    });

    describe('logout', () => {
        it('should successfully logout and clear user data', async () => {
            localStorage.setItem('token', 'mock-token');
            localStorage.setItem('user', JSON.stringify(mockUser));
            mockAuthApi.getUser.mockResolvedValue(mockUser);
            mockAuthApi.logout.mockResolvedValue();

            const { result } = renderHook(() => useAuth(), {
                wrapper: ({ children }) => <AuthProvider>{children}</AuthProvider>,
            });

            await waitFor(() => {
                expect(result.current.isLoading).toBe(false);
            });

            expect(result.current.isAuthenticated).toBe(true);

            await act(async () => {
                await result.current.logout();
            });

            expect(mockAuthApi.logout).toHaveBeenCalledTimes(1);
            expect(result.current.user).toBeNull();
            expect(result.current.isAuthenticated).toBe(false);
            expect(localStorage.getItem('token')).toBeNull();
            expect(localStorage.getItem('user')).toBeNull();
        });

        it('should clear storage even if logout API call fails', async () => {
            localStorage.setItem('token', 'mock-token');
            localStorage.setItem('user', JSON.stringify(mockUser));
            mockAuthApi.getUser.mockResolvedValue(mockUser);
            mockAuthApi.logout.mockRejectedValue(new Error('Network error'));

            const { result } = renderHook(() => useAuth(), {
                wrapper: ({ children }) => <AuthProvider>{children}</AuthProvider>,
            });

            await waitFor(() => {
                expect(result.current.isLoading).toBe(false);
            });

            let errorCaught = false;
            await act(async () => {
                try {
                    await result.current.logout();
                } catch (error) {
                    errorCaught = true;
                }
            });

            // Logout should not throw even if API fails
            expect(errorCaught).toBe(false);
            expect(result.current.user).toBeNull();
            expect(result.current.isAuthenticated).toBe(false);
            expect(localStorage.getItem('token')).toBeNull();
            expect(localStorage.getItem('user')).toBeNull();
        });
    });

    describe('hasPermission', () => {
        it('should return true when user has the permission', async () => {
            localStorage.setItem('token', 'mock-token');
            mockAuthApi.getUser.mockResolvedValue(mockUser);

            const { result } = renderHook(() => useAuth(), {
                wrapper: ({ children }) => <AuthProvider>{children}</AuthProvider>,
            });

            await waitFor(() => {
                expect(result.current.isLoading).toBe(false);
            });

            expect(result.current.hasPermission('users.view')).toBe(true);
            expect(result.current.hasPermission('users.create')).toBe(true);
        });

        it('should return false when user does not have the permission', async () => {
            localStorage.setItem('token', 'mock-token');
            mockAuthApi.getUser.mockResolvedValue(mockUser);

            const { result } = renderHook(() => useAuth(), {
                wrapper: ({ children }) => <AuthProvider>{children}</AuthProvider>,
            });

            await waitFor(() => {
                expect(result.current.isLoading).toBe(false);
            });

            expect(result.current.hasPermission('users.delete')).toBe(false);
            expect(result.current.hasPermission('nonexistent.permission')).toBe(false);
        });

        it('should return false when user is not authenticated', async () => {
            const { result } = renderHook(() => useAuth(), {
                wrapper: ({ children }) => <AuthProvider>{children}</AuthProvider>,
            });

            await waitFor(() => {
                expect(result.current.isLoading).toBe(false);
            });

            expect(result.current.hasPermission('users.view')).toBe(false);
        });

        it('should return false when user has no permissions', async () => {
            const userWithoutPermissions = { ...mockUser, permissions: undefined };
            localStorage.setItem('token', 'mock-token');
            mockAuthApi.getUser.mockResolvedValue(userWithoutPermissions);

            const { result } = renderHook(() => useAuth(), {
                wrapper: ({ children }) => <AuthProvider>{children}</AuthProvider>,
            });

            await waitFor(() => {
                expect(result.current.isLoading).toBe(false);
            });

            expect(result.current.hasPermission('users.view')).toBe(false);
        });
    });

    describe('hasRole', () => {
        it('should return true when user has the role', async () => {
            localStorage.setItem('token', 'mock-token');
            mockAuthApi.getUser.mockResolvedValue(mockUser);

            const { result } = renderHook(() => useAuth(), {
                wrapper: ({ children }) => <AuthProvider>{children}</AuthProvider>,
            });

            await waitFor(() => {
                expect(result.current.isLoading).toBe(false);
            });

            expect(result.current.hasRole('admin')).toBe(true);
            expect(result.current.hasRole('user')).toBe(true);
        });

        it('should return false when user does not have the role', async () => {
            localStorage.setItem('token', 'mock-token');
            mockAuthApi.getUser.mockResolvedValue(mockUser);

            const { result } = renderHook(() => useAuth(), {
                wrapper: ({ children }) => <AuthProvider>{children}</AuthProvider>,
            });

            await waitFor(() => {
                expect(result.current.isLoading).toBe(false);
            });

            expect(result.current.hasRole('super-admin')).toBe(false);
            expect(result.current.hasRole('moderator')).toBe(false);
        });

        it('should return false when user is not authenticated', async () => {
            const { result } = renderHook(() => useAuth(), {
                wrapper: ({ children }) => <AuthProvider>{children}</AuthProvider>,
            });

            await waitFor(() => {
                expect(result.current.isLoading).toBe(false);
            });

            expect(result.current.hasRole('admin')).toBe(false);
        });
    });

    describe('hasAnyRole', () => {
        it('should return true when user has at least one of the roles', async () => {
            localStorage.setItem('token', 'mock-token');
            mockAuthApi.getUser.mockResolvedValue(mockUser);

            const { result } = renderHook(() => useAuth(), {
                wrapper: ({ children }) => <AuthProvider>{children}</AuthProvider>,
            });

            await waitFor(() => {
                expect(result.current.isLoading).toBe(false);
            });

            expect(result.current.hasAnyRole(['admin', 'moderator'])).toBe(true);
            expect(result.current.hasAnyRole(['user', 'moderator'])).toBe(true);
            expect(result.current.hasAnyRole(['super-admin', 'user'])).toBe(true);
        });

        it('should return false when user has none of the roles', async () => {
            localStorage.setItem('token', 'mock-token');
            mockAuthApi.getUser.mockResolvedValue(mockUser);

            const { result } = renderHook(() => useAuth(), {
                wrapper: ({ children }) => <AuthProvider>{children}</AuthProvider>,
            });

            await waitFor(() => {
                expect(result.current.isLoading).toBe(false);
            });

            expect(result.current.hasAnyRole(['super-admin', 'moderator'])).toBe(false);
        });

        it('should return false when user is not authenticated', async () => {
            const { result } = renderHook(() => useAuth(), {
                wrapper: ({ children }) => <AuthProvider>{children}</AuthProvider>,
            });

            await waitFor(() => {
                expect(result.current.isLoading).toBe(false);
            });

            expect(result.current.hasAnyRole(['admin', 'user'])).toBe(false);
        });
    });
});
