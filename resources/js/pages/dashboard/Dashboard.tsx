import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { dashboardApi } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';

export default function Dashboard() {
    const { hasRole } = useAuth();
    const isAdmin = hasRole('admin');

    const { data: stats, isLoading, error } = useQuery({
        queryKey: ['dashboard-stats'],
        queryFn: () => dashboardApi.getStats(),
    });

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-gray-500">Loading dashboard...</div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="rounded-md bg-red-50 p-4">
                <div className="text-sm text-red-700">Failed to load dashboard statistics</div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>

            {/* Submission Stats */}
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-5">
                <StatCard title="Total Submissions" value={stats?.submissions.total || 0} color="gray" />
                <StatCard title="Draft" value={stats?.submissions.draft || 0} color="yellow" />
                <StatCard title="Submitted" value={stats?.submissions.submitted || 0} color="blue" />
                <StatCard title="Approved" value={stats?.submissions.approved || 0} color="green" />
                <StatCard title="Rejected" value={stats?.submissions.rejected || 0} color="red" />
            </div>

            {/* Admin Stats */}
            {isAdmin && (
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                    <StatCard title="Total Users" value={stats?.total_users || 0} color="indigo" />
                    <StatCard title="Total Institutions" value={stats?.total_institutions || 0} color="purple" />
                    <StatCard title="Total Questionnaires" value={stats?.total_questionnaires || 0} color="pink" />
                </div>
            )}

            {/* Recent Submissions */}
            <div className="rounded-lg bg-white shadow">
                <div className="px-4 py-5 sm:px-6">
                    <h3 className="text-lg font-medium leading-6 text-gray-900">Recent Submissions</h3>
                </div>
                <div className="border-t border-gray-200">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                                    Questionnaire
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                                    Institution
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                                    Created By
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                                    Status
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                                    Created At
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 bg-white">
                            {stats?.recent_submissions.map((submission) => (
                                <tr key={submission.id}>
                                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                                        {submission.questionnaire}
                                    </td>
                                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                                        {submission.institution}
                                    </td>
                                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                                        {submission.created_by}
                                    </td>
                                    <td className="whitespace-nowrap px-6 py-4">
                                        <StatusBadge status={submission.status} />
                                    </td>
                                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                                        {new Date(submission.created_at).toLocaleDateString()}
                                    </td>
                                </tr>
                            ))}
                            {(!stats?.recent_submissions || stats.recent_submissions.length === 0) && (
                                <tr>
                                    <td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500">
                                        No recent submissions
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

function StatCard({ title, value, color }: { title: string; value: number; color: string }) {
    const colorClasses: Record<string, string> = {
        gray: 'bg-gray-50 text-gray-900',
        yellow: 'bg-yellow-50 text-yellow-900',
        blue: 'bg-blue-50 text-blue-900',
        green: 'bg-green-50 text-green-900',
        red: 'bg-red-50 text-red-900',
        indigo: 'bg-indigo-50 text-indigo-900',
        purple: 'bg-purple-50 text-purple-900',
        pink: 'bg-pink-50 text-pink-900',
    };

    return (
        <div className={`overflow-hidden rounded-lg px-4 py-5 shadow sm:p-6 ${colorClasses[color] || colorClasses.gray}`}>
            <dt className="truncate text-sm font-medium text-gray-500">{title}</dt>
            <dd className="mt-1 text-3xl font-semibold tracking-tight">{value}</dd>
        </div>
    );
}

function StatusBadge({ status }: { status: string }) {
    const statusClasses: Record<string, string> = {
        draft: 'bg-yellow-100 text-yellow-800',
        submitted: 'bg-blue-100 text-blue-800',
        approved: 'bg-green-100 text-green-800',
        rejected: 'bg-red-100 text-red-800',
    };

    return (
        <span className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${statusClasses[status] || 'bg-gray-100 text-gray-800'}`}>
            {status.charAt(0).toUpperCase() + status.slice(1)}
        </span>
    );
}
