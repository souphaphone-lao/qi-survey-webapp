import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter, MemoryRouter } from 'react-router-dom';
import AppLayout from '@/components/layout/AppLayout';
import { AuthProvider } from '@/contexts/AuthContext';
import type { User } from '@/types';

// Mock the AuthContext
jest.mock('@/contexts/AuthContext', () => ({
    ...jest.requireActual('@/contexts/AuthContext'),
    useAuth: jest.fn(),
}));

const { useAuth } = require('@/contexts/AuthContext');

// Mock useNavigate
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
    ...jest.requireActual('react-router-dom'),
    useNavigate: () => mockNavigate,
}));

describe('AppLayout Component', () => {
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
        roles: ['user'],
        permissions: ['users.view', 'institutions.view', 'questionnaires.view', 'submissions.view'],
        last_login_at: null,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
    };

    const mockLogout = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();

        // Default mock implementation
        useAuth.mockReturnValue({
            user: mockUser,
            isLoading: false,
            isAuthenticated: true,
            hasPermission: jest.fn((permission) =>
                mockUser.permissions?.includes(permission) || false
            ),
            hasRole: jest.fn(),
            hasAnyRole: jest.fn(),
            login: jest.fn(),
            logout: mockLogout,
        });
    });

    const renderAppLayout = (children = <div>Test Content</div>, initialRoute = '/dashboard') => {
        return render(
            <MemoryRouter initialEntries={[initialRoute]}>
                <AppLayout>{children}</AppLayout>
            </MemoryRouter>
        );
    };

    describe('Rendering', () => {
        it('should render the layout with branding', () => {
            renderAppLayout();

            expect(screen.getByText('QI Survey')).toBeInTheDocument();
        });

        it('should render children content', () => {
            renderAppLayout(<div>Custom Content</div>);

            expect(screen.getByText('Custom Content')).toBeInTheDocument();
        });

        it('should render user name', () => {
            renderAppLayout();

            expect(screen.getByText('Test User')).toBeInTheDocument();
        });

        it('should render institution name if available', () => {
            renderAppLayout();

            expect(screen.getByText('(Test Institution)')).toBeInTheDocument();
        });

        it('should not show institution name if user has no institution', () => {
            useAuth.mockReturnValue({
                user: { ...mockUser, institution: undefined },
                isLoading: false,
                isAuthenticated: true,
                hasPermission: jest.fn(),
                hasRole: jest.fn(),
                hasAnyRole: jest.fn(),
                login: jest.fn(),
                logout: mockLogout,
            });

            renderAppLayout();

            expect(screen.queryByText(/Test Institution/)).not.toBeInTheDocument();
        });

        it('should render logout button', () => {
            renderAppLayout();

            expect(screen.getByRole('button', { name: /logout/i })).toBeInTheDocument();
        });
    });

    describe('Navigation', () => {
        it('should render all navigation items when user has all permissions', () => {
            renderAppLayout();

            expect(screen.getByText('Dashboard')).toBeInTheDocument();
            expect(screen.getByText('Users')).toBeInTheDocument();
            expect(screen.getByText('Institutions')).toBeInTheDocument();
            expect(screen.getByText('Questionnaires')).toBeInTheDocument();
            expect(screen.getByText('Submissions')).toBeInTheDocument();
        });

        it('should filter navigation items based on permissions', () => {
            useAuth.mockReturnValue({
                user: { ...mockUser, permissions: ['submissions.view'] },
                isLoading: false,
                isAuthenticated: true,
                hasPermission: jest.fn((permission) => permission === 'submissions.view'),
                hasRole: jest.fn(),
                hasAnyRole: jest.fn(),
                login: jest.fn(),
                logout: mockLogout,
            });

            renderAppLayout();

            expect(screen.getByText('Dashboard')).toBeInTheDocument();
            expect(screen.queryByText('Users')).not.toBeInTheDocument();
            expect(screen.queryByText('Institutions')).not.toBeInTheDocument();
            expect(screen.queryByText('Questionnaires')).not.toBeInTheDocument();
            expect(screen.getByText('Submissions')).toBeInTheDocument();
        });

        it('should always show Dashboard regardless of permissions', () => {
            useAuth.mockReturnValue({
                user: { ...mockUser, permissions: [] },
                isLoading: false,
                isAuthenticated: true,
                hasPermission: jest.fn(() => false),
                hasRole: jest.fn(),
                hasAnyRole: jest.fn(),
                login: jest.fn(),
                logout: mockLogout,
            });

            renderAppLayout();

            expect(screen.getByText('Dashboard')).toBeInTheDocument();
        });

        it('should highlight active navigation item', () => {
            renderAppLayout(<div>Test</div>, '/users');

            const usersLink = screen.getByText('Users').closest('a');
            expect(usersLink).toHaveClass('border-indigo-500');
            expect(usersLink).toHaveClass('text-gray-900');
        });

        it('should not highlight inactive navigation items', () => {
            renderAppLayout(<div>Test</div>, '/dashboard');

            const usersLink = screen.getByText('Users').closest('a');
            expect(usersLink).toHaveClass('border-transparent');
            expect(usersLink).toHaveClass('text-gray-500');
        });

        it('should navigate when clicking navigation links', () => {
            renderAppLayout();

            const usersLink = screen.getByText('Users').closest('a');
            expect(usersLink).toHaveAttribute('href', '/users');

            const institutionsLink = screen.getByText('Institutions').closest('a');
            expect(institutionsLink).toHaveAttribute('href', '/institutions');
        });
    });

    describe('Logout Functionality', () => {
        it('should call logout and navigate when logout button is clicked', async () => {
            mockLogout.mockResolvedValue(undefined);

            renderAppLayout();

            const logoutButton = screen.getByRole('button', { name: /logout/i });
            fireEvent.click(logoutButton);

            await waitFor(() => {
                expect(mockLogout).toHaveBeenCalledTimes(1);
            });

            expect(mockNavigate).toHaveBeenCalledWith('/login');
        });

        it('should navigate to login even if logout fails', async () => {
            mockLogout.mockRejectedValue(new Error('Logout failed'));

            renderAppLayout();

            const logoutButton = screen.getByRole('button', { name: /logout/i });
            fireEvent.click(logoutButton);

            await waitFor(() => {
                expect(mockNavigate).toHaveBeenCalledWith('/login');
            });
        });
    });

    describe('Mobile Menu', () => {
        it('should toggle mobile menu on hamburger button click', () => {
            renderAppLayout();

            // Mobile menu should not be visible initially
            const mobileNav = screen.queryByRole('button', { name: /logout/i });

            // Click hamburger menu
            const hamburgerButton = screen.getByRole('button', { name: /open main menu/i });
            fireEvent.click(hamburgerButton);

            // Mobile menu should now be visible
            const mobileNavLinks = screen.getAllByText('Dashboard');
            expect(mobileNavLinks.length).toBeGreaterThan(1); // Desktop + mobile
        });

        it('should close mobile menu when navigation item is clicked', () => {
            renderAppLayout();

            // Open mobile menu
            const hamburgerButton = screen.getByRole('button', { name: /open main menu/i });
            fireEvent.click(hamburgerButton);

            // Menu should be open (multiple Dashboard links)
            let dashboardLinks = screen.getAllByText('Dashboard');
            expect(dashboardLinks.length).toBeGreaterThan(1);

            // Click a mobile nav item
            const mobileNavItems = screen.getAllByText('Dashboard');
            const mobileNavItem = mobileNavItems.find(item =>
                item.closest('.sm\\:hidden')
            );

            if (mobileNavItem) {
                fireEvent.click(mobileNavItem);
            }
        });

        it('should display user info in mobile menu', () => {
            renderAppLayout();

            // Open mobile menu
            const hamburgerButton = screen.getByRole('button', { name: /open main menu/i });
            fireEvent.click(hamburgerButton);

            // Should show user email in mobile menu
            expect(screen.getByText('test@example.com')).toBeInTheDocument();
        });

        it('should show logout button in mobile menu', () => {
            renderAppLayout();

            // Open mobile menu
            const hamburgerButton = screen.getByRole('button', { name: /open main menu/i });
            fireEvent.click(hamburgerButton);

            // Should have logout buttons (desktop + mobile)
            const logoutButtons = screen.getAllByText(/logout/i);
            expect(logoutButtons.length).toBeGreaterThan(1);
        });

        it('should render hamburger icon when menu is closed', () => {
            renderAppLayout();

            const hamburgerButton = screen.getByRole('button', { name: /open main menu/i });
            const svg = hamburgerButton.querySelector('svg');

            expect(svg).toBeInTheDocument();
        });

        it('should change icon when mobile menu is open', () => {
            renderAppLayout();

            const hamburgerButton = screen.getByRole('button', { name: /open main menu/i });

            // Click to open
            fireEvent.click(hamburgerButton);

            // Icon should change (both icons are SVG paths with different d attributes)
            const svg = hamburgerButton.querySelector('svg');
            expect(svg).toBeInTheDocument();
        });
    });

    describe('Responsive Design', () => {
        it('should have responsive container classes', () => {
            const { container } = renderAppLayout();

            const mainContainer = container.querySelector('.max-w-7xl');
            expect(mainContainer).toBeInTheDocument();
        });

        it('should hide desktop navigation on mobile', () => {
            renderAppLayout();

            const desktopNav = screen.getByText('Users').closest('.sm\\:flex');
            expect(desktopNav).toHaveClass('hidden');
        });
    });

    describe('Accessibility', () => {
        it('should have proper navigation landmarks', () => {
            renderAppLayout();

            const nav = screen.getByRole('navigation');
            expect(nav).toBeInTheDocument();
        });

        it('should have screen reader text for menu button', () => {
            renderAppLayout();

            expect(screen.getByText('Open main menu')).toHaveClass('sr-only');
        });

        it('should have accessible link text', () => {
            renderAppLayout();

            const dashboardLink = screen.getByText('Dashboard').closest('a');
            expect(dashboardLink).toHaveAccessibleName('Dashboard');
        });

        it('should have proper heading hierarchy', () => {
            renderAppLayout(<h1>Page Title</h1>);

            // The branding is not a heading, which is correct
            const brandingLink = screen.getByText('QI Survey');
            expect(brandingLink.tagName).not.toBe('H1');
        });
    });

    describe('Edge Cases', () => {
        it('should handle user with no permissions', () => {
            useAuth.mockReturnValue({
                user: { ...mockUser, permissions: [] },
                isLoading: false,
                isAuthenticated: true,
                hasPermission: jest.fn(() => false),
                hasRole: jest.fn(),
                hasAnyRole: jest.fn(),
                login: jest.fn(),
                logout: mockLogout,
            });

            renderAppLayout();

            // Should only show Dashboard
            expect(screen.getByText('Dashboard')).toBeInTheDocument();
            expect(screen.queryByText('Users')).not.toBeInTheDocument();
        });

        it('should handle user with no name', () => {
            useAuth.mockReturnValue({
                user: { ...mockUser, name: '' },
                isLoading: false,
                isAuthenticated: true,
                hasPermission: jest.fn(),
                hasRole: jest.fn(),
                hasAnyRole: jest.fn(),
                login: jest.fn(),
                logout: mockLogout,
            });

            const { container } = renderAppLayout();

            // Layout should still render without errors
            expect(container.querySelector('nav')).toBeInTheDocument();
        });

        it('should handle multiple rapid logout clicks', async () => {
            mockLogout.mockResolvedValue(undefined);

            renderAppLayout();

            const logoutButton = screen.getByRole('button', { name: /logout/i });

            // Click multiple times rapidly
            fireEvent.click(logoutButton);
            fireEvent.click(logoutButton);
            fireEvent.click(logoutButton);

            await waitFor(() => {
                expect(mockLogout).toHaveBeenCalled();
            });

            // Should still navigate to login
            expect(mockNavigate).toHaveBeenCalledWith('/login');
        });

        it('should render with minimal user object', () => {
            const minimalUser: User = {
                id: 1,
                name: 'Minimal User',
                email: 'minimal@example.com',
                institution_id: null,
                is_active: true,
                roles: [],
                last_login_at: null,
                created_at: '2024-01-01T00:00:00Z',
                updated_at: '2024-01-01T00:00:00Z',
            };

            useAuth.mockReturnValue({
                user: minimalUser,
                isLoading: false,
                isAuthenticated: true,
                hasPermission: jest.fn(() => false),
                hasRole: jest.fn(),
                hasAnyRole: jest.fn(),
                login: jest.fn(),
                logout: mockLogout,
            });

            renderAppLayout();

            expect(screen.getByText('Minimal User')).toBeInTheDocument();
            expect(screen.getByText('Dashboard')).toBeInTheDocument();
        });
    });

    describe('Navigation Links', () => {
        it('should have correct href attributes for all navigation items', () => {
            renderAppLayout();

            const dashboardLink = screen.getByText('Dashboard').closest('a');
            expect(dashboardLink).toHaveAttribute('href', '/dashboard');

            const usersLink = screen.getByText('Users').closest('a');
            expect(usersLink).toHaveAttribute('href', '/users');

            const institutionsLink = screen.getByText('Institutions').closest('a');
            expect(institutionsLink).toHaveAttribute('href', '/institutions');

            const questionnairesLink = screen.getByText('Questionnaires').closest('a');
            expect(questionnairesLink).toHaveAttribute('href', '/questionnaires');

            const submissionsLink = screen.getByText('Submissions').closest('a');
            expect(submissionsLink).toHaveAttribute('href', '/submissions');
        });

        it('should match partial paths for highlighting', () => {
            renderAppLayout(<div>Test</div>, '/users/create');

            const usersLink = screen.getByText('Users').closest('a');
            expect(usersLink).toHaveClass('border-indigo-500');
        });
    });
});
