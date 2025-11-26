import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { questionnairesApi } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';

export default function QuestionnaireList() {
    const { hasPermission } = useAuth();
    const queryClient = useQueryClient();
    const [deletingId, setDeletingId] = useState<number | null>(null);

    const { data, isLoading, error } = useQuery({ queryKey: ['questionnaires'], queryFn: () => questionnairesApi.list() });

    const deleteMutation = useMutation({
        mutationFn: questionnairesApi.delete,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['questionnaires'] });
            setDeletingId(null);
        },
        onError: (error: any) => {
            alert(error.response?.data?.message || 'Failed to delete questionnaire');
            setDeletingId(null);
        },
    });

    const handleDelete = (id: number, title: string) => {
        if (window.confirm(`Are you sure you want to delete "${title}"?`)) {
            setDeletingId(id);
            deleteMutation.mutate(id);
        }
    };

    if (isLoading) return <div className="text-gray-500">Loading questionnaires...</div>;
    if (error) return <div className="text-red-500">Failed to load questionnaires</div>;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-gray-900">Questionnaires</h1>
                {hasPermission('questionnaires.create') && (
                    <Link to="/questionnaires/create" className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500">Add Questionnaire</Link>
                )}
            </div>
            <div className="overflow-hidden rounded-lg bg-white shadow">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Title</th>
                            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Code</th>
                            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Version</th>
                            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Status</th>
                            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white">
                        {data?.data.map((q) => (
                            <tr key={q.id}>
                                <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">{q.title}</td>
                                <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">{q.code}</td>
                                <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">v{q.version}</td>
                                <td className="whitespace-nowrap px-6 py-4"><span className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${q.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{q.is_active ? 'Active' : 'Inactive'}</span></td>
                                <td className="whitespace-nowrap px-6 py-4 text-sm space-x-2">
                                    {hasPermission('submissions.create') && <Link to={`/questionnaires/${q.id}/submissions/create`} className="text-green-600 hover:text-green-900">Fill</Link>}
                                    {hasPermission('questionnaires.update') && <Link to={`/questionnaires/${q.id}/edit`} className="text-indigo-600 hover:text-indigo-900">Edit</Link>}
                                    {hasPermission('questionnaires.update') && <Link to={`/questionnaires/${q.id}/permissions`} className="text-purple-600 hover:text-purple-900">Permissions</Link>}
                                    {hasPermission('questionnaires.delete') && q.submissions_count === 0 && (
                                        <button
                                            onClick={() => handleDelete(q.id, q.title)}
                                            disabled={deletingId === q.id}
                                            className="text-red-600 hover:text-red-900 disabled:opacity-50"
                                        >
                                            {deletingId === q.id ? 'Deleting...' : 'Delete'}
                                        </button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
