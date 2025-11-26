import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter, MemoryRouter } from 'react-router-dom';
import Login from '@/pages/auth/Login';
import { AuthProvider } from '@/contexts/AuthContext';
import { authApi } from '@/services/api';
import type { AuthResponse } from '@/types';

// Mock the API module
jest.mock('@/services/api', () => ({
    authApi: {
        login: jest.fn(),
        logout: jest.fn(),
        getUser: jest.fn(),
    },
}));

const mockAuthApi = authApi as jest.Mocked<typeof authApi>;

// Mock useNavigate
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
    ...jest.requireActual('react-router-dom'),
    useNavigate: () => mockNavigate,
}));

describe('Login Component', () => {
    const renderLogin = (initialRoute = '/login') => {
        return render(
            <MemoryRouter initialEntries={[initialRoute]}>
                <AuthProvider>
                    <Login />
                </AuthProvider>
            </MemoryRouter>
        );
    };

    beforeEach(() => {
        jest.clearAllMocks();
        localStorage.clear();
        mockAuthApi.getUser.mockResolvedValue({} as any);
    });

    describe('Rendering', () => {
        it('should render login form with all elements', () => {
            renderLogin();

            expect(screen.getByText('QI Survey')).toBeInTheDocument();
            expect(screen.getByText('Sign in to your account')).toBeInTheDocument();
            expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
            expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
            expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
        });

        it('should render email and password inputs with correct attributes', () => {
            renderLogin();

            const emailInput = screen.getByLabelText(/email address/i);
            const passwordInput = screen.getByLabelText(/password/i);

            expect(emailInput).toHaveAttribute('type', 'email');
            expect(emailInput).toHaveAttribute('name', 'email');
            expect(emailInput).toHaveAttribute('required');
            expect(emailInput).toHaveAttribute('autocomplete', 'email');

            expect(passwordInput).toHaveAttribute('type', 'password');
            expect(passwordInput).toHaveAttribute('name', 'password');
            expect(passwordInput).toHaveAttribute('required');
            expect(passwordInput).toHaveAttribute('autocomplete', 'current-password');
        });

        it('should have submit button enabled by default', () => {
            renderLogin();

            const submitButton = screen.getByRole('button', { name: /sign in/i });
            expect(submitButton).not.toBeDisabled();
        });
    });

    describe('Form Input', () => {
        it('should update email field on change', () => {
            renderLogin();

            const emailInput = screen.getByLabelText(/email address/i) as HTMLInputElement;

            fireEvent.change(emailInput, { target: { value: 'test@example.com' } });

            expect(emailInput.value).toBe('test@example.com');
        });

        it('should update password field on change', () => {
            renderLogin();

            const passwordInput = screen.getByLabelText(/password/i) as HTMLInputElement;

            fireEvent.change(passwordInput, { target: { value: 'password123' } });

            expect(passwordInput.value).toBe('password123');
        });

        it('should allow typing in both fields', () => {
            renderLogin();

            const emailInput = screen.getByLabelText(/email address/i) as HTMLInputElement;
            const passwordInput = screen.getByLabelText(/password/i) as HTMLInputElement;

            fireEvent.change(emailInput, { target: { value: 'user@test.com' } });
            fireEvent.change(passwordInput, { target: { value: 'mypassword' } });

            expect(emailInput.value).toBe('user@test.com');
            expect(passwordInput.value).toBe('mypassword');
        });
    });

    describe('Form Submission', () => {
        it('should successfully submit login form and navigate to dashboard', async () => {
            const mockAuthResponse: AuthResponse = {
                user: {
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
                },
                token: 'test-token',
            };

            mockAuthApi.login.mockResolvedValue(mockAuthResponse);

            renderLogin();

            const emailInput = screen.getByLabelText(/email address/i);
            const passwordInput = screen.getByLabelText(/password/i);
            const submitButton = screen.getByRole('button', { name: /sign in/i });

            fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
            fireEvent.change(passwordInput, { target: { value: 'password123' } });
            fireEvent.click(submitButton);

            await waitFor(() => {
                expect(mockAuthApi.login).toHaveBeenCalledWith({
                    email: 'test@example.com',
                    password: 'password123',
                });
            });

            await waitFor(() => {
                expect(mockNavigate).toHaveBeenCalledWith('/dashboard', { replace: true });
            });
        });

        it('should navigate to intended location from state', async () => {
            const mockAuthResponse: AuthResponse = {
                user: {
                    id: 1,
                    name: 'Test User',
                    email: 'test@example.com',
                    institution_id: 1,
                    is_active: true,
                    roles: ['user'],
                    last_login_at: null,
                    created_at: '2024-01-01T00:00:00Z',
                    updated_at: '2024-01-01T00:00:00Z',
                },
                token: 'test-token',
            };

            mockAuthApi.login.mockResolvedValue(mockAuthResponse);

            render(
                <MemoryRouter
                    initialEntries={[
                        {
                            pathname: '/login',
                            state: { from: { pathname: '/users' } },
                        },
                    ]}
                >
                    <AuthProvider>
                        <Login />
                    </AuthProvider>
                </MemoryRouter>
            );

            const emailInput = screen.getByLabelText(/email address/i);
            const passwordInput = screen.getByLabelText(/password/i);
            const submitButton = screen.getByRole('button', { name: /sign in/i });

            fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
            fireEvent.change(passwordInput, { target: { value: 'password123' } });
            fireEvent.click(submitButton);

            await waitFor(() => {
                expect(mockNavigate).toHaveBeenCalledWith('/users', { replace: true });
            });
        });

        it('should show loading state during submission', async () => {
            mockAuthApi.login.mockImplementation(
                () =>
                    new Promise((resolve) =>
                        setTimeout(
                            () =>
                                resolve({
                                    user: {} as any,
                                    token: 'test-token',
                                }),
                            100
                        )
                    )
            );

            renderLogin();

            const emailInput = screen.getByLabelText(/email address/i);
            const passwordInput = screen.getByLabelText(/password/i);
            const submitButton = screen.getByRole('button', { name: /sign in/i });

            fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
            fireEvent.change(passwordInput, { target: { value: 'password123' } });
            fireEvent.click(submitButton);

            // Check loading state
            await waitFor(() => {
                expect(screen.getByText(/signing in/i)).toBeInTheDocument();
                expect(submitButton).toBeDisabled();
            });

            // Wait for completion
            await waitFor(() => {
                expect(mockNavigate).toHaveBeenCalled();
            });
        });

        it('should prevent form submission when already loading', async () => {
            mockAuthApi.login.mockImplementation(
                () =>
                    new Promise((resolve) =>
                        setTimeout(
                            () =>
                                resolve({
                                    user: {} as any,
                                    token: 'test-token',
                                }),
                            100
                        )
                    )
            );

            renderLogin();

            const emailInput = screen.getByLabelText(/email address/i);
            const passwordInput = screen.getByLabelText(/password/i);
            const submitButton = screen.getByRole('button', { name: /sign in/i });

            fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
            fireEvent.change(passwordInput, { target: { value: 'password123' } });

            // Click multiple times
            fireEvent.click(submitButton);
            fireEvent.click(submitButton);
            fireEvent.click(submitButton);

            await waitFor(() => {
                expect(mockAuthApi.login).toHaveBeenCalledTimes(1);
            });

            await waitFor(() => {
                expect(mockNavigate).toHaveBeenCalled();
            });
        });
    });

    describe('Error Handling', () => {
        it('should display error message on login failure', async () => {
            mockAuthApi.login.mockRejectedValue({
                response: {
                    data: {
                        message: 'Invalid credentials',
                    },
                },
            });

            renderLogin();

            const emailInput = screen.getByLabelText(/email address/i);
            const passwordInput = screen.getByLabelText(/password/i);
            const submitButton = screen.getByRole('button', { name: /sign in/i });

            fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
            fireEvent.change(passwordInput, { target: { value: 'wrongpassword' } });
            fireEvent.click(submitButton);

            await waitFor(() => {
                expect(screen.getByText('Invalid credentials')).toBeInTheDocument();
            });

            expect(mockNavigate).not.toHaveBeenCalled();
        });

        it('should display validation error from API', async () => {
            mockAuthApi.login.mockRejectedValue({
                response: {
                    data: {
                        errors: {
                            email: ['The provided credentials are incorrect.'],
                        },
                    },
                },
            });

            renderLogin();

            const emailInput = screen.getByLabelText(/email address/i);
            const passwordInput = screen.getByLabelText(/password/i);
            const submitButton = screen.getByRole('button', { name: /sign in/i });

            fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
            fireEvent.change(passwordInput, { target: { value: 'wrong' } });
            fireEvent.click(submitButton);

            await waitFor(() => {
                expect(
                    screen.getByText('The provided credentials are incorrect.')
                ).toBeInTheDocument();
            });
        });

        it('should display generic error message when no specific error is provided', async () => {
            mockAuthApi.login.mockRejectedValue(new Error('Network error'));

            renderLogin();

            const emailInput = screen.getByLabelText(/email address/i);
            const passwordInput = screen.getByLabelText(/password/i);
            const submitButton = screen.getByRole('button', { name: /sign in/i });

            fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
            fireEvent.change(passwordInput, { target: { value: 'password123' } });
            fireEvent.click(submitButton);

            await waitFor(() => {
                expect(screen.getByText('An error occurred during login')).toBeInTheDocument();
            });
        });

        it('should clear previous error on new submission', async () => {
            mockAuthApi.login
                .mockRejectedValueOnce({
                    response: {
                        data: {
                            message: 'Invalid credentials',
                        },
                    },
                })
                .mockResolvedValueOnce({
                    user: {} as any,
                    token: 'test-token',
                });

            renderLogin();

            const emailInput = screen.getByLabelText(/email address/i);
            const passwordInput = screen.getByLabelText(/password/i);
            const submitButton = screen.getByRole('button', { name: /sign in/i });

            // First submission - fails
            fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
            fireEvent.change(passwordInput, { target: { value: 'wrong' } });
            fireEvent.click(submitButton);

            await waitFor(() => {
                expect(screen.getByText('Invalid credentials')).toBeInTheDocument();
            });

            // Second submission - succeeds
            fireEvent.change(passwordInput, { target: { value: 'correct' } });
            fireEvent.click(submitButton);

            await waitFor(() => {
                expect(screen.queryByText('Invalid credentials')).not.toBeInTheDocument();
            });
        });

        it('should re-enable button after error', async () => {
            mockAuthApi.login.mockRejectedValue({
                response: {
                    data: {
                        message: 'Invalid credentials',
                    },
                },
            });

            renderLogin();

            const emailInput = screen.getByLabelText(/email address/i);
            const passwordInput = screen.getByLabelText(/password/i);
            const submitButton = screen.getByRole('button', { name: /sign in/i });

            fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
            fireEvent.change(passwordInput, { target: { value: 'wrong' } });
            fireEvent.click(submitButton);

            await waitFor(() => {
                expect(screen.getByText('Invalid credentials')).toBeInTheDocument();
            });

            expect(submitButton).not.toBeDisabled();
        });
    });

    describe('Form Validation', () => {
        it('should have required attribute on email and password fields', () => {
            renderLogin();

            const emailInput = screen.getByLabelText(/email address/i);
            const passwordInput = screen.getByLabelText(/password/i);

            expect(emailInput).toBeRequired();
            expect(passwordInput).toBeRequired();
        });

        it('should have email type on email input', () => {
            renderLogin();

            const emailInput = screen.getByLabelText(/email address/i);

            expect(emailInput).toHaveAttribute('type', 'email');
        });
    });

    describe('Accessibility', () => {
        it('should have proper labels for inputs', () => {
            renderLogin();

            expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
            expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
        });

        it('should use semantic HTML form element', () => {
            renderLogin();

            const form = screen.getByRole('button', { name: /sign in/i }).closest('form');
            expect(form).toBeInTheDocument();
        });

        it('should have accessible placeholders', () => {
            renderLogin();

            const emailInput = screen.getByPlaceholderText('Email address');
            const passwordInput = screen.getByPlaceholderText('Password');

            expect(emailInput).toBeInTheDocument();
            expect(passwordInput).toBeInTheDocument();
        });
    });
});
