import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { submissionsApi } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';

export default function SubmissionList() {
    const { hasPermission } = useAuth();
    const { data, isLoading, error } = useQuery({ queryKey: ['submissions'], queryFn: () => submissionsApi.list() });

    if (isLoading) return <div className="text-gray-500">Loading submissions...</div>;
    if (error) return <div className="text-red-500">Failed to load submissions</div>;

    const statusColors: Record<string, string> = { draft: 'bg-yellow-100 text-yellow-800', submitted: 'bg-blue-100 text-blue-800', approved: 'bg-green-100 text-green-800', rejected: 'bg-red-100 text-red-800' };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-gray-900">Submissions</h1>
            </div>
            <div className="overflow-hidden rounded-lg bg-white shadow">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Questionnaire</th>
                            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Institution</th>
                            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Created By</th>
                            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Status</th>
                            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Created</th>
                            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white">
                        {data?.data.map((s) => (
                            <tr key={s.id}>
                                <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">{s.questionnaire?.title}</td>
                                <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">{s.institution?.name}</td>
                                <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">{s.created_by?.name}</td>
                                <td className="whitespace-nowrap px-6 py-4"><span className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${statusColors[s.status]}`}>{s.status.charAt(0).toUpperCase() + s.status.slice(1)}</span></td>
                                <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">{new Date(s.created_at).toLocaleDateString()}</td>
                                <td className="whitespace-nowrap px-6 py-4 text-sm space-x-2">
                                    <Link to={`/submissions/${s.id}`} className="text-indigo-600 hover:text-indigo-900">View</Link>
                                    {s.can_be_edited && hasPermission('submissions.update') && <Link to={`/submissions/${s.id}/edit`} className="text-green-600 hover:text-green-900">Edit</Link>}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
