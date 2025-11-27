import React from 'react';
import { useDashboardOverview, useDashboardInstitutions } from '@/hooks/useDashboardData';
import { useDashboardFilters } from '@/hooks/useDashboardFilters';
import { FilterPanel } from '@/components/dashboard/FilterPanel';
import { SummaryCard } from '@/components/dashboard/SummaryCard';
import { StatusPieChart } from '@/components/dashboard/StatusPieChart';
import { InstitutionBarChart } from '@/components/dashboard/InstitutionBarChart';

export default function DashboardOverview() {
    const { filters, updateFilter, clearAllFilters, hasActiveFilters } = useDashboardFilters();

    const {
        data: overview,
        isLoading: overviewLoading,
        error: overviewError,
    } = useDashboardOverview(filters);

    const {
        data: institutions,
        isLoading: institutionsLoading,
    } = useDashboardInstitutions(filters);

    if (overviewLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-gray-600">Loading dashboard...</div>
            </div>
        );
    }

    if (overviewError) {
        return (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                Error loading dashboard data. Please try again.
            </div>
        );
    }

    if (!overview) {
        return null;
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
                <p className="mt-2 text-gray-600">
                    Overview of submissions and performance metrics
                </p>
            </div>

            <FilterPanel
                filters={filters}
                onFilterChange={updateFilter}
                onClearFilters={clearAllFilters}
                hasActiveFilters={hasActiveFilters}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <SummaryCard
                    title="Total Submissions"
                    value={overview.summary.total_submissions}
                    trend={overview.trends.total}
                    color="blue"
                    icon={
                        <svg
                            className="w-8 h-8"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                            />
                        </svg>
                    }
                />

                <SummaryCard
                    title="Draft"
                    value={overview.summary.draft}
                    color="gray"
                    icon={
                        <svg
                            className="w-8 h-8"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                            />
                        </svg>
                    }
                />

                <SummaryCard
                    title="Submitted"
                    value={overview.summary.submitted}
                    color="purple"
                    icon={
                        <svg
                            className="w-8 h-8"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                            />
                        </svg>
                    }
                />

                <SummaryCard
                    title="Approved"
                    value={overview.summary.approved}
                    trend={overview.trends.approved}
                    color="green"
                    icon={
                        <svg
                            className="w-8 h-8"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                        </svg>
                    }
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-lg shadow p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                        Status Distribution
                    </h3>
                    {overview.status_distribution.length > 0 ? (
                        <StatusPieChart data={overview.status_distribution} />
                    ) : (
                        <p className="text-gray-500 text-center py-8">No data available</p>
                    )}
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                        Submissions by Institution
                    </h3>
                    {!institutionsLoading && institutions && institutions.length > 0 ? (
                        <InstitutionBarChart data={institutions} />
                    ) : (
                        <p className="text-gray-500 text-center py-8">
                            {institutionsLoading ? 'Loading...' : 'No data available'}
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}
