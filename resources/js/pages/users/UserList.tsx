import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { usersApi } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';

export default function UserList() {
    const { hasPermission } = useAuth();
    const { data, isLoading, error } = useQuery({
        queryKey: ['users'],
        queryFn: () => usersApi.list(),
    });

    if (isLoading) return <div className="text-gray-500">Loading users...</div>;
    if (error) return <div className="text-red-500">Failed to load users</div>;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-gray-900">Users</h1>
                {hasPermission('users.create') && (
                    <Link
                        to="/users/create"
                        className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500"
                    >
                        Add User
                    </Link>
                )}
            </div>
            <div className="overflow-hidden rounded-lg bg-white shadow">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Name</th>
                            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Email</th>
                            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Institution</th>
                            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Role</th>
                            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Status</th>
                            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white">
                        {data?.data.map((user) => (
                            <tr key={user.id}>
                                <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">{user.name}</td>
                                <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">{user.email}</td>
                                <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">{user.institution?.name || '-'}</td>
                                <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">{user.roles?.join(', ') || '-'}</td>
                                <td className="whitespace-nowrap px-6 py-4">
                                    <span className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${user.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                        {user.is_active ? 'Active' : 'Inactive'}
                                    </span>
                                </td>
                                <td className="whitespace-nowrap px-6 py-4 text-sm">
                                    {hasPermission('users.update') && (
                                        <Link to={`/users/${user.id}/edit`} className="text-indigo-600 hover:text-indigo-900">Edit</Link>
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
