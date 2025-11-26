import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { departmentsApi, institutionsApi } from '@/services/api';
import type { Department } from '@/types';

export default function DepartmentList() {
    const queryClient = useQueryClient();
    const [page, setPage] = useState(1);
    const [institutionFilter, setInstitutionFilter] = useState<number | ''>('');
    const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'inactive'>('all');
    const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

    // Fetch departments
    const { data, isLoading } = useQuery({
        queryKey: ['departments', page, institutionFilter, activeFilter],
        queryFn: () => {
            const params: Record<string, unknown> = { page, per_page: 15 };
            if (institutionFilter) params.institution_id = institutionFilter;
            if (activeFilter !== 'all') params.is_active = activeFilter === 'active';
            return departmentsApi.list(params);
        },
    });

    // Fetch institutions for filter
    const { data: institutions } = useQuery({
        queryKey: ['institutions', 'all'],
        queryFn: () => institutionsApi.getAll(),
    });

    // Delete mutation
    const deleteMutation = useMutation({
        mutationFn: (id: number) => departmentsApi.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['departments'] });
            setDeleteConfirm(null);
        },
    });

    const handleDelete = (id: number) => {
        deleteMutation.mutate(id);
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="sm:flex sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Departments</h1>
                    <p className="mt-1 text-sm text-gray-500">
                        Manage departments within institutions
                    </p>
                </div>
                <div className="mt-4 sm:mt-0">
                    <Link
                        to="/departments/create"
                        className="inline-flex items-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500"
                    >
                        <svg
                            className="-ml-0.5 mr-1.5 h-5 w-5"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth="1.5"
                            stroke="currentColor"
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                        </svg>
                        Create Department
                    </Link>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white shadow sm:rounded-lg p-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <div>
                        <label htmlFor="institution-filter" className="block text-sm font-medium text-gray-700">
                            Institution
                        </label>
                        <select
                            id="institution-filter"
                            value={institutionFilter}
                            onChange={(e) => {
                                setInstitutionFilter(e.target.value ? Number(e.target.value) : '');
                                setPage(1);
                            }}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                        >
                            <option value="">All Institutions</option>
                            {institutions?.map((inst) => (
                                <option key={inst.id} value={inst.id}>
                                    {inst.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label htmlFor="active-filter" className="block text-sm font-medium text-gray-700">
                            Status
                        </label>
                        <select
                            id="active-filter"
                            value={activeFilter}
                            onChange={(e) => {
                                setActiveFilter(e.target.value as 'all' | 'active' | 'inactive');
                                setPage(1);
                            }}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                        >
                            <option value="all">All</option>
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white shadow sm:rounded-lg overflow-hidden">
                {isLoading ? (
                    <div className="p-12 text-center">
                        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                        <p className="mt-2 text-sm text-gray-500">Loading departments...</p>
                    </div>
                ) : !data || data.data.length === 0 ? (
                    <div className="p-12 text-center">
                        <svg
                            className="mx-auto h-12 w-12 text-gray-400"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                                d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                            />
                        </svg>
                        <h3 className="mt-2 text-sm font-medium text-gray-900">No departments</h3>
                        <p className="mt-1 text-sm text-gray-500">Get started by creating a new department.</p>
                    </div>
                ) : (
                    <>
                        <table className="min-w-full divide-y divide-gray-300">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900">
                                        Name
                                    </th>
                                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                                        Code
                                    </th>
                                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                                        Institution
                                    </th>
                                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                                        Users
                                    </th>
                                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                                        Status
                                    </th>
                                    <th className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                                        <span className="sr-only">Actions</span>
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 bg-white">
                                {data.data.map((department: Department) => (
                                    <tr key={department.id} className="hover:bg-gray-50">
                                        <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900">
                                            {department.name}
                                        </td>
                                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                                            {department.code}
                                        </td>
                                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                                            {department.institution?.name}
                                        </td>
                                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                                            {department.users_count || 0}
                                        </td>
                                        <td className="whitespace-nowrap px-3 py-4 text-sm">
                                            <span
                                                className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${
                                                    department.is_active
                                                        ? 'bg-green-100 text-green-800'
                                                        : 'bg-gray-100 text-gray-800'
                                                }`}
                                            >
                                                {department.is_active ? 'Active' : 'Inactive'}
                                            </span>
                                        </td>
                                        <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                                            <div className="flex justify-end gap-2">
                                                <Link
                                                    to={`/departments/${department.id}/edit`}
                                                    className="text-indigo-600 hover:text-indigo-900"
                                                >
                                                    Edit
                                                </Link>
                                                <button
                                                    onClick={() => setDeleteConfirm(department.id)}
                                                    className="text-red-600 hover:text-red-900"
                                                >
                                                    Delete
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        {/* Pagination */}
                        {data.meta.last_page > 1 && (
                            <div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6">
                                <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                                    <div>
                                        <p className="text-sm text-gray-700">
                                            Showing <span className="font-medium">{data.meta.from}</span> to{' '}
                                            <span className="font-medium">{data.meta.to}</span> of{' '}
                                            <span className="font-medium">{data.meta.total}</span> results
                                        </p>
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => setPage((p) => Math.max(1, p - 1))}
                                            disabled={page === 1}
                                            className="relative inline-flex items-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            Previous
                                        </button>
                                        <button
                                            onClick={() => setPage((p) => Math.min(data.meta.last_page, p + 1))}
                                            disabled={page === data.meta.last_page}
                                            className="relative inline-flex items-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            Next
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Delete Confirmation Modal */}
            {deleteConfirm && (
                <div className="fixed inset-0 z-50 overflow-y-auto">
                    <div className="flex min-h-screen items-center justify-center px-4 pt-4 pb-20 text-center sm:block sm:p-0">
                        <div
                            className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
                            onClick={() => !deleteMutation.isPending && setDeleteConfirm(null)}
                        />

                        <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
                            <div>
                                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                                    <svg
                                        className="h-6 w-6 text-red-600"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        strokeWidth="1.5"
                                        stroke="currentColor"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
                                        />
                                    </svg>
                                </div>
                                <div className="mt-3 text-center sm:mt-5">
                                    <h3 className="text-lg font-semibold leading-6 text-gray-900">
                                        Delete Department
                                    </h3>
                                    <div className="mt-2">
                                        <p className="text-sm text-gray-500">
                                            Are you sure you want to delete this department? This action cannot be
                                            undone.
                                        </p>
                                    </div>
                                </div>
                            </div>
                            <div className="mt-5 sm:mt-6 sm:grid sm:grid-flow-row-dense sm:grid-cols-2 sm:gap-3">
                                <button
                                    type="button"
                                    onClick={() => handleDelete(deleteConfirm)}
                                    disabled={deleteMutation.isPending}
                                    className="inline-flex w-full justify-center rounded-md bg-red-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed sm:col-start-2"
                                >
                                    {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setDeleteConfirm(null)}
                                    disabled={deleteMutation.isPending}
                                    className="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed sm:col-start-1 sm:mt-0"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
