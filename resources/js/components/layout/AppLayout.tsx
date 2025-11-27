import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import NotificationBell from './NotificationBell';
import { ConnectionStatus } from '@/components/common/ConnectionStatus';
import { SyncProgress } from '@/components/common/SyncProgress';

interface NavItem {
    name: string;
    href: string;
    permission?: string;
}

const navigation: NavItem[] = [
    { name: 'Dashboard', href: '/dashboard' },
    { name: 'Users', href: '/users', permission: 'users.view' },
    { name: 'Institutions', href: '/institutions', permission: 'institutions.view' },
    { name: 'Departments', href: '/departments', permission: 'departments.view' },
    { name: 'Questionnaires', href: '/questionnaires', permission: 'questionnaires.view' },
    { name: 'Submissions', href: '/submissions', permission: 'submissions.view' },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
    const { user, logout, hasPermission } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };

    const filteredNavigation = navigation.filter(
        (item) => !item.permission || hasPermission(item.permission)
    );

    return (
        <div className="min-h-screen bg-gray-100">
            <nav className="bg-white shadow-sm">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    <div className="flex h-16 justify-between">
                        <div className="flex">
                            <div className="flex flex-shrink-0 items-center">
                                <Link to="/dashboard" className="text-xl font-bold text-indigo-600">
                                    QI Survey
                                </Link>
                            </div>
                            <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                                {filteredNavigation.map((item) => (
                                    <Link
                                        key={item.name}
                                        to={item.href}
                                        className={`inline-flex items-center border-b-2 px-1 pt-1 text-sm font-medium ${
                                            location.pathname.startsWith(item.href)
                                                ? 'border-indigo-500 text-gray-900'
                                                : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                                        }`}
                                    >
                                        {item.name}
                                    </Link>
                                ))}
                            </div>
                        </div>
                        <div className="hidden sm:ml-6 sm:flex sm:items-center">
                            <div className="relative ml-3">
                                <div className="flex items-center space-x-4">
                                    <ConnectionStatus />
                                    <NotificationBell />
                                    <span className="text-sm text-gray-700">
                                        {user?.name}
                                        {user?.institution && (
                                            <span className="ml-2 text-xs text-gray-500">
                                                ({user.institution.name})
                                            </span>
                                        )}
                                    </span>
                                    <button
                                        onClick={handleLogout}
                                        className="rounded-md bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                                    >
                                        Logout
                                    </button>
                                </div>
                            </div>
                        </div>
                        <div className="-mr-2 flex items-center sm:hidden">
                            <button
                                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                                className="inline-flex items-center justify-center rounded-md p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-500"
                            >
                                <span className="sr-only">Open main menu</span>
                                <svg
                                    className="h-6 w-6"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    strokeWidth="1.5"
                                    stroke="currentColor"
                                >
                                    {isMobileMenuOpen ? (
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            d="M6 18L18 6M6 6l12 12"
                                        />
                                    ) : (
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
                                        />
                                    )}
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>

                {isMobileMenuOpen && (
                    <div className="sm:hidden">
                        <div className="space-y-1 pb-3 pt-2">
                            {filteredNavigation.map((item) => (
                                <Link
                                    key={item.name}
                                    to={item.href}
                                    className={`block border-l-4 py-2 pl-3 pr-4 text-base font-medium ${
                                        location.pathname.startsWith(item.href)
                                            ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                                            : 'border-transparent text-gray-500 hover:border-gray-300 hover:bg-gray-50 hover:text-gray-700'
                                    }`}
                                    onClick={() => setIsMobileMenuOpen(false)}
                                >
                                    {item.name}
                                </Link>
                            ))}
                        </div>
                        <div className="border-t border-gray-200 pb-3 pt-4">
                            <div className="flex items-center justify-between px-4">
                                <div>
                                    <div className="text-base font-medium text-gray-800">{user?.name}</div>
                                    <div className="text-sm font-medium text-gray-500">{user?.email}</div>
                                </div>
                                <ConnectionStatus />
                            </div>
                            <div className="mt-3 space-y-1">
                                <button
                                    onClick={handleLogout}
                                    className="block w-full px-4 py-2 text-left text-base font-medium text-gray-500 hover:bg-gray-100 hover:text-gray-800"
                                >
                                    Logout
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </nav>

            <main className="py-6">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">{children}</div>
            </main>

            {/* Sync Progress Toast */}
            <SyncProgress />
        </div>
    );
}
