import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { institutionsApi, questionnairesApi } from '@/services/api';
import type { DashboardFilters, SubmissionStatus } from '@/types';

interface FilterPanelProps {
    filters: DashboardFilters;
    onFilterChange: <K extends keyof DashboardFilters>(
        key: K,
        value: DashboardFilters[K]
    ) => void;
    onClearFilters: () => void;
    hasActiveFilters: boolean;
}

export function FilterPanel({
    filters,
    onFilterChange,
    onClearFilters,
    hasActiveFilters,
}: FilterPanelProps) {
    const { data: institutions } = useQuery({
        queryKey: ['institutions', 'list'],
        queryFn: () => institutionsApi.getAll(),
    });

    const { data: questionnaires } = useQuery({
        queryKey: ['questionnaires', 'list'],
        queryFn: () => questionnairesApi.getAll(),
    });

    const [localFilters, setLocalFilters] = useState<DashboardFilters>(filters);

    useEffect(() => {
        setLocalFilters(filters);
    }, [filters]);

    const handleApply = () => {
        Object.entries(localFilters).forEach(([key, value]) => {
            onFilterChange(key as keyof DashboardFilters, value);
        });
    };

    const handleClear = () => {
        setLocalFilters({});
        onClearFilters();
    };

    const statuses: SubmissionStatus[] = ['draft', 'submitted', 'approved', 'rejected'];

    return (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Filters</h3>
                {hasActiveFilters && (
                    <button
                        type="button"
                        onClick={handleClear}
                        className="text-sm text-indigo-600 hover:text-indigo-800"
                    >
                        Clear all
                    </button>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Institution
                    </label>
                    <select
                        value={localFilters.institution_id || ''}
                        onChange={(e) =>
                            setLocalFilters({
                                ...localFilters,
                                institution_id: e.target.value ? Number(e.target.value) : undefined,
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
                        Questionnaire
                    </label>
                    <select
                        value={localFilters.questionnaire_code || ''}
                        onChange={(e) =>
                            setLocalFilters({
                                ...localFilters,
                                questionnaire_code: e.target.value || undefined,
                            })
                        }
                        className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    >
                        <option value="">All Questionnaires</option>
                        {questionnaires?.map((q) => (
                            <option key={`${q.code}-${q.version}`} value={q.code}>
                                {q.title} (v{q.version})
                            </option>
                        ))}
                    </select>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                    <select
                        value={localFilters.status || ''}
                        onChange={(e) =>
                            setLocalFilters({
                                ...localFilters,
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
                        value={localFilters.date_from || ''}
                        onChange={(e) =>
                            setLocalFilters({
                                ...localFilters,
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
                        value={localFilters.date_to || ''}
                        onChange={(e) =>
                            setLocalFilters({
                                ...localFilters,
                                date_to: e.target.value || undefined,
                            })
                        }
                        className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    />
                </div>
            </div>

            <div className="mt-4 flex justify-end">
                <button
                    type="button"
                    onClick={handleApply}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                >
                    Apply Filters
                </button>
            </div>
        </div>
    );
}
