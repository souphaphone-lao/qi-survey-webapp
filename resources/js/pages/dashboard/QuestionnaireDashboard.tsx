import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { questionnairesApi } from '@/services/api';
import { useDashboardQuestionnaire } from '@/hooks/useDashboardData';
import { useDashboardFilters } from '@/hooks/useDashboardFilters';
import { FilterPanel } from '@/components/dashboard/FilterPanel';
import { SummaryCard } from '@/components/dashboard/SummaryCard';
import { ExportModal } from '@/components/dashboard/ExportModal';
import { ExportHistory } from '@/components/dashboard/ExportHistory';

export default function QuestionnaireDashboard() {
    const [selectedCode, setSelectedCode] = useState<string>('');
    const [showExportModal, setShowExportModal] = useState(false);
    const { filters, updateFilter, clearAllFilters, hasActiveFilters } = useDashboardFilters();

    const { data: questionnaires, isLoading: questionnairesLoading } = useQuery({
        queryKey: ['questionnaires', 'list'],
        queryFn: () => questionnairesApi.getAll(),
    });

    const {
        data: stats,
        isLoading: statsLoading,
        error: statsError,
    } = useDashboardQuestionnaire(selectedCode, filters);

    // Get unique questionnaire codes
    const uniqueCodes = React.useMemo(() => {
        if (!questionnaires) return [];
        const codes = new Set(questionnaires.map((q) => q.code));
        return Array.from(codes);
    }, [questionnaires]);

    // Auto-select first questionnaire if none selected
    React.useEffect(() => {
        if (uniqueCodes.length > 0 && !selectedCode) {
            setSelectedCode(uniqueCodes[0]);
        }
    }, [uniqueCodes, selectedCode]);

    if (questionnairesLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-gray-600">Loading questionnaires...</div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-gray-900">Questionnaire Dashboard</h1>
                <p className="mt-2 text-gray-600">
                    Detailed statistics for individual questionnaires
                </p>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Questionnaire
                </label>
                <select
                    value={selectedCode}
                    onChange={(e) => setSelectedCode(e.target.value)}
                    className="w-full max-w-md rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                >
                    <option value="">Choose a questionnaire...</option>
                    {uniqueCodes.map((code) => {
                        const questionnaire = questionnaires?.find((q) => q.code === code);
                        return (
                            <option key={code} value={code}>
                                {questionnaire?.title || code}
                            </option>
                        );
                    })}
                </select>
            </div>

            {selectedCode && (
                <>
                    <FilterPanel
                        filters={filters}
                        onFilterChange={updateFilter}
                        onClearFilters={clearAllFilters}
                        hasActiveFilters={hasActiveFilters}
                    />

                    {statsLoading && (
                        <div className="flex items-center justify-center h-64">
                            <div className="text-gray-600">Loading statistics...</div>
                        </div>
                    )}

                    {statsError && (
                        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                            Error loading questionnaire statistics. Please try again.
                        </div>
                    )}

                    {stats && (
                        <>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
                                <SummaryCard
                                    title="Total Submissions"
                                    value={stats.summary.total_submissions}
                                    color="blue"
                                />
                                <SummaryCard
                                    title="Draft"
                                    value={stats.summary.draft}
                                    color="gray"
                                />
                                <SummaryCard
                                    title="Submitted"
                                    value={stats.summary.submitted}
                                    color="purple"
                                />
                                <SummaryCard
                                    title="Approved"
                                    value={stats.summary.approved}
                                    color="green"
                                />
                                <SummaryCard
                                    title="Rejected"
                                    value={stats.summary.rejected}
                                    color="red"
                                />
                            </div>

                            <div className="bg-white rounded-lg shadow p-6">
                                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                                    Submissions by Version
                                </h3>
                                {stats.version_breakdown.length > 0 ? (
                                    <div className="overflow-x-auto">
                                        <table className="min-w-full divide-y divide-gray-200">
                                            <thead className="bg-gray-50">
                                                <tr>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                        Version
                                                    </th>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                        Total Submissions
                                                    </th>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                        Approved
                                                    </th>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                        Approval Rate
                                                    </th>
                                                </tr>
                                            </thead>
                                            <tbody className="bg-white divide-y divide-gray-200">
                                                {stats.version_breakdown.map((version) => (
                                                    <tr key={version.version}>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                                            Version {version.version}
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                            {version.count}
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                            {version.approved}
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                            {version.count > 0
                                                                ? Math.round(
                                                                      (version.approved /
                                                                          version.count) *
                                                                          100
                                                                  )
                                                                : 0}
                                                            %
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                ) : (
                                    <p className="text-gray-500 text-center py-8">
                                        No data available
                                    </p>
                                )}
                            </div>

                            <div className="bg-white rounded-lg shadow p-6">
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="text-lg font-semibold text-gray-900">Export Data</h3>
                                    <button
                                        onClick={() => setShowExportModal(true)}
                                        className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                                    >
                                        Export Data
                                    </button>
                                </div>
                                <ExportHistory />
                            </div>
                        </>
                    )}
                </>
            )}

            {showExportModal && selectedCode && (
                <ExportModal
                    isOpen={showExportModal}
                    onClose={() => setShowExportModal(false)}
                    questionnaireCode={selectedCode}
                    questionnaireTitle={
                        questionnaires?.find((q) => q.code === selectedCode)?.title || selectedCode
                    }
                />
            )}
        </div>
    );
}
