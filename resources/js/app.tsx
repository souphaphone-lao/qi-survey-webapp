import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate, useParams } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import AppLayout from '@/components/layout/AppLayout';
import Login from '@/pages/auth/Login';
import Dashboard from '@/pages/dashboard/Dashboard';
import { registerServiceWorker } from '@/pwa-register';

// Lazy load pages for better performance
const UserList = React.lazy(() => import('@/pages/users/UserList'));
const UserForm = React.lazy(() => import('@/pages/users/UserForm'));
const InstitutionList = React.lazy(() => import('@/pages/institutions/InstitutionList'));
const InstitutionForm = React.lazy(() => import('@/pages/institutions/InstitutionForm'));
const DepartmentList = React.lazy(() => import('@/pages/departments/DepartmentList'));
const DepartmentForm = React.lazy(() => import('@/pages/departments/DepartmentForm'));
const QuestionnaireList = React.lazy(() => import('@/pages/questionnaires/QuestionnaireList'));
const QuestionnaireForm = React.lazy(() => import('@/pages/questionnaires/QuestionnaireForm'));
const PermissionMatrix = React.lazy(() => import('@/pages/questionnaires/PermissionMatrix'));
const SubmissionList = React.lazy(() => import('@/pages/submissions/SubmissionList'));
const SubmissionForm = React.lazy(() => import('@/pages/submissions/SubmissionForm'));
const SubmissionView = React.lazy(() => import('@/pages/submissions/SubmissionView'));
const DashboardOverview = React.lazy(() => import('@/pages/dashboard/DashboardOverview'));
const QuestionnaireDashboard = React.lazy(() => import('@/pages/dashboard/QuestionnaireDashboard'));
const ExportsPage = React.lazy(() => import('@/pages/exports/ExportsPage'));

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 1000 * 60, // 1 minute
            retry: 1,
        },
    },
});

function ProtectedRoute({ children }: { children: React.ReactNode }) {
    const { isAuthenticated, isLoading } = useAuth();

    if (isLoading) {
        return (
            <div className="flex min-h-screen items-center justify-center">
                <div className="text-gray-500">Loading...</div>
            </div>
        );
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    return <AppLayout>{children}</AppLayout>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
    const { isAuthenticated, isLoading } = useAuth();

    if (isLoading) {
        return (
            <div className="flex min-h-screen items-center justify-center">
                <div className="text-gray-500">Loading...</div>
            </div>
        );
    }

    if (isAuthenticated) {
        return <Navigate to="/dashboard" replace />;
    }

    return <>{children}</>;
}

function LoadingFallback() {
    return (
        <div className="flex items-center justify-center h-64">
            <div className="text-gray-500">Loading...</div>
        </div>
    );
}

function PermissionMatrixWrapper() {
    const { id } = useParams();
    return <PermissionMatrix questionnaireId={Number(id)} />;
}

function App() {
    return (
        <QueryClientProvider client={queryClient}>
            <AuthProvider>
                <BrowserRouter>
                    <Routes>
                        {/* Public routes */}
                        <Route
                            path="/login"
                            element={
                                <PublicRoute>
                                    <Login />
                                </PublicRoute>
                            }
                        />

                        {/* Protected routes */}
                        <Route
                            path="/dashboard"
                            element={
                                <ProtectedRoute>
                                    <React.Suspense fallback={<LoadingFallback />}>
                                        <DashboardOverview />
                                    </React.Suspense>
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/dashboard/questionnaires"
                            element={
                                <ProtectedRoute>
                                    <React.Suspense fallback={<LoadingFallback />}>
                                        <QuestionnaireDashboard />
                                    </React.Suspense>
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/dashboard/old"
                            element={
                                <ProtectedRoute>
                                    <Dashboard />
                                </ProtectedRoute>
                            }
                        />

                        {/* Users */}
                        <Route
                            path="/users"
                            element={
                                <ProtectedRoute>
                                    <React.Suspense fallback={<LoadingFallback />}>
                                        <UserList />
                                    </React.Suspense>
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/users/create"
                            element={
                                <ProtectedRoute>
                                    <React.Suspense fallback={<LoadingFallback />}>
                                        <UserForm />
                                    </React.Suspense>
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/users/:id/edit"
                            element={
                                <ProtectedRoute>
                                    <React.Suspense fallback={<LoadingFallback />}>
                                        <UserForm />
                                    </React.Suspense>
                                </ProtectedRoute>
                            }
                        />

                        {/* Institutions */}
                        <Route
                            path="/institutions"
                            element={
                                <ProtectedRoute>
                                    <React.Suspense fallback={<LoadingFallback />}>
                                        <InstitutionList />
                                    </React.Suspense>
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/institutions/create"
                            element={
                                <ProtectedRoute>
                                    <React.Suspense fallback={<LoadingFallback />}>
                                        <InstitutionForm />
                                    </React.Suspense>
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/institutions/:id/edit"
                            element={
                                <ProtectedRoute>
                                    <React.Suspense fallback={<LoadingFallback />}>
                                        <InstitutionForm />
                                    </React.Suspense>
                                </ProtectedRoute>
                            }
                        />

                        {/* Departments */}
                        <Route
                            path="/departments"
                            element={
                                <ProtectedRoute>
                                    <React.Suspense fallback={<LoadingFallback />}>
                                        <DepartmentList />
                                    </React.Suspense>
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/departments/create"
                            element={
                                <ProtectedRoute>
                                    <React.Suspense fallback={<LoadingFallback />}>
                                        <DepartmentForm />
                                    </React.Suspense>
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/departments/:id/edit"
                            element={
                                <ProtectedRoute>
                                    <React.Suspense fallback={<LoadingFallback />}>
                                        <DepartmentForm />
                                    </React.Suspense>
                                </ProtectedRoute>
                            }
                        />

                        {/* Questionnaires */}
                        <Route
                            path="/questionnaires"
                            element={
                                <ProtectedRoute>
                                    <React.Suspense fallback={<LoadingFallback />}>
                                        <QuestionnaireList />
                                    </React.Suspense>
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/questionnaires/create"
                            element={
                                <ProtectedRoute>
                                    <React.Suspense fallback={<LoadingFallback />}>
                                        <QuestionnaireForm />
                                    </React.Suspense>
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/questionnaires/:id/edit"
                            element={
                                <ProtectedRoute>
                                    <React.Suspense fallback={<LoadingFallback />}>
                                        <QuestionnaireForm />
                                    </React.Suspense>
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/questionnaires/:id/permissions"
                            element={
                                <ProtectedRoute>
                                    <React.Suspense fallback={<LoadingFallback />}>
                                        <PermissionMatrixWrapper />
                                    </React.Suspense>
                                </ProtectedRoute>
                            }
                        />

                        {/* Submissions */}
                        <Route
                            path="/submissions"
                            element={
                                <ProtectedRoute>
                                    <React.Suspense fallback={<LoadingFallback />}>
                                        <SubmissionList />
                                    </React.Suspense>
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/questionnaires/:questionnaireId/submissions/create"
                            element={
                                <ProtectedRoute>
                                    <React.Suspense fallback={<LoadingFallback />}>
                                        <SubmissionForm />
                                    </React.Suspense>
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/submissions/:id"
                            element={
                                <ProtectedRoute>
                                    <React.Suspense fallback={<LoadingFallback />}>
                                        <SubmissionView />
                                    </React.Suspense>
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/submissions/:id/edit"
                            element={
                                <ProtectedRoute>
                                    <React.Suspense fallback={<LoadingFallback />}>
                                        <SubmissionForm />
                                    </React.Suspense>
                                </ProtectedRoute>
                            }
                        />

                        {/* Exports */}
                        <Route
                            path="/exports"
                            element={
                                <ProtectedRoute>
                                    <React.Suspense fallback={<LoadingFallback />}>
                                        <ExportsPage />
                                    </React.Suspense>
                                </ProtectedRoute>
                            }
                        />

                        {/* Default redirects */}
                        <Route path="/" element={<Navigate to="/dashboard" replace />} />
                        <Route path="*" element={<Navigate to="/dashboard" replace />} />
                    </Routes>
                </BrowserRouter>
            </AuthProvider>
        </QueryClientProvider>
    );
}

const container = document.getElementById('root');
if (container) {
    const root = createRoot(container);
    root.render(<App />);
}

// Register service worker for PWA functionality
registerServiceWorker();
