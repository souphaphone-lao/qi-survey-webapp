import React, { Fragment, useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { useQuery } from '@tanstack/react-query';
import { institutionsApi } from '@/services/api';
import { useCreateExport } from '@/hooks/useExport';
import type { ExportFilters, ExportFormat, SubmissionStatus } from '@/types';

interface ExportModalProps {
    isOpen: boolean;
    onClose: () => void;
    questionnaireCode: string;
    questionnaireTitle: string;
}

export function ExportModal({
    isOpen,
    onClose,
    questionnaireCode,
    questionnaireTitle,
}: ExportModalProps) {
    const [format, setFormat] = useState<ExportFormat>('csv');
    const [filters, setFilters] = useState<ExportFilters>({});

    const { data: institutions } = useQuery({
        queryKey: ['institutions', 'list'],
        queryFn: () => institutionsApi.getAll(),
    });

    const createExport = useCreateExport();

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        createExport.mutate(
            {
                questionnaireCode,
                format,
                filters,
            },
            {
                onSuccess: () => {
                    onClose();
                    setFormat('csv');
                    setFilters({});
                },
            }
        );
    };

    const statuses: SubmissionStatus[] = ['draft', 'submitted', 'approved', 'rejected'];

    return (
        <Transition appear show={isOpen} as={Fragment}>
            <Dialog as="div" className="relative z-10" onClose={onClose}>
                <Transition.Child
                    as={Fragment}
                    enter="ease-out duration-300"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in duration-200"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    <div className="fixed inset-0 bg-black bg-opacity-25" />
                </Transition.Child>

                <div className="fixed inset-0 overflow-y-auto">
                    <div className="flex min-h-full items-center justify-center p-4">
                        <Transition.Child
                            as={Fragment}
                            enter="ease-out duration-300"
                            enterFrom="opacity-0 scale-95"
                            enterTo="opacity-100 scale-100"
                            leave="ease-in duration-200"
                            leaveFrom="opacity-100 scale-100"
                            leaveTo="opacity-0 scale-95"
                        >
                            <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                                <Dialog.Title
                                    as="h3"
                                    className="text-lg font-medium leading-6 text-gray-900"
                                >
                                    Export {questionnaireTitle}
                                </Dialog.Title>

                                <form onSubmit={handleSubmit} className="mt-4 space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Format
                                        </label>
                                        <select
                                            value={format}
                                            onChange={(e) => setFormat(e.target.value as ExportFormat)}
                                            className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                                            required
                                        >
                                            <option value="csv">CSV</option>
                                            <option value="xlsx">Excel (XLSX)</option>
                                        </select>
                                    </div>

                                    <div className="border-t border-gray-200 pt-4">
                                        <h4 className="text-sm font-medium text-gray-900 mb-3">
                                            Filters (Optional)
                                        </h4>

                                        <div className="space-y-3">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                                    Institution
                                                </label>
                                                <select
                                                    value={filters.institution_id || ''}
                                                    onChange={(e) =>
                                                        setFilters({
                                                            ...filters,
                                                            institution_id: e.target.value
                                                                ? Number(e.target.value)
                                                                : undefined,
                                                        })
                                                    }
                                                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
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
                                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                                    Status
                                                </label>
                                                <select
                                                    value={filters.status || ''}
                                                    onChange={(e) =>
                                                        setFilters({
                                                            ...filters,
                                                            status: (e.target.value as SubmissionStatus) || undefined,
                                                        })
                                                    }
                                                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                                                >
                                                    <option value="">All Statuses</option>
                                                    {statuses.map((status) => (
                                                        <option key={status} value={status}>
                                                            {status.charAt(0).toUpperCase() + status.slice(1)}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>

                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                                    Date From
                                                </label>
                                                <input
                                                    type="date"
                                                    value={filters.date_from || ''}
                                                    onChange={(e) =>
                                                        setFilters({
                                                            ...filters,
                                                            date_from: e.target.value || undefined,
                                                        })
                                                    }
                                                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                                    Date To
                                                </label>
                                                <input
                                                    type="date"
                                                    value={filters.date_to || ''}
                                                    onChange={(e) =>
                                                        setFilters({
                                                            ...filters,
                                                            date_to: e.target.value || undefined,
                                                        })
                                                    }
                                                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mt-6 flex justify-end space-x-3">
                                        <button
                                            type="button"
                                            onClick={onClose}
                                            className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={createExport.isPending}
                                            className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            {createExport.isPending ? 'Creating...' : 'Create Export'}
                                        </button>
                                    </div>
                                </form>

                                {createExport.error && (
                                    <div className="mt-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm">
                                        Failed to create export. Please try again.
                                    </div>
                                )}
                            </Dialog.Panel>
                        </Transition.Child>
                    </div>
                </div>
            </Dialog>
        </Transition>
    );
}
