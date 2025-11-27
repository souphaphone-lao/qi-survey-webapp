import React from 'react';
import { useExportsList, useDownloadExport, useDeleteExport } from '@/hooks/useExport';
import type { ExportJob } from '@/types';

export function ExportHistory() {
    const { data: exportsData, isLoading } = useExportsList();
    const downloadExport = useDownloadExport();
    const deleteExport = useDeleteExport();

    const getStatusBadge = (status: ExportJob['status']) => {
        const badges = {
            pending: 'bg-yellow-100 text-yellow-800',
            processing: 'bg-blue-100 text-blue-800',
            completed: 'bg-green-100 text-green-800',
            failed: 'bg-red-100 text-red-800',
        };

        return (
            <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${badges[status]}`}
            >
                {status.charAt(0).toUpperCase() + status.slice(1)}
            </span>
        );
    };

    const formatFileSize = (bytes: number | null) => {
        if (!bytes) return 'N/A';
        const kb = bytes / 1024;
        if (kb < 1024) return `${kb.toFixed(2)} KB`;
        const mb = kb / 1024;
        return `${mb.toFixed(2)} MB`;
    };

    const formatDate = (dateStr: string | null) => {
        if (!dateStr) return 'N/A';
        return new Date(dateStr).toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const handleDownload = (exportJob: ExportJob) => {
        if (exportJob.status === 'completed' && !exportJob.is_expired) {
            downloadExport.mutate(exportJob.id);
        }
    };

    const handleDelete = (id: number) => {
        if (window.confirm('Are you sure you want to delete this export?')) {
            deleteExport.mutate(id);
        }
    };

    if (isLoading) {
        return (
            <div className="bg-white rounded-lg shadow p-6">
                <div className="text-center text-gray-600">Loading exports...</div>
            </div>
        );
    }

    if (!exportsData || exportsData.data.length === 0) {
        return (
            <div className="bg-white rounded-lg shadow p-6">
                <p className="text-center text-gray-500">No export history found.</p>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Export History</h3>
            </div>

            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Questionnaire
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Format
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Status
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                File Size
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Created
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Expires
                            </th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Actions
                            </th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {exportsData.data.map((exportJob) => (
                            <tr key={exportJob.id}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                    {exportJob.questionnaire_code}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 uppercase">
                                    {exportJob.format}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    {getStatusBadge(exportJob.status)}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {formatFileSize(exportJob.file_size)}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {formatDate(exportJob.created_at)}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {exportJob.is_expired ? (
                                        <span className="text-red-600">Expired</span>
                                    ) : (
                                        formatDate(exportJob.expires_at)
                                    )}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                    <div className="flex justify-end space-x-2">
                                        {exportJob.status === 'completed' && !exportJob.is_expired && (
                                            <button
                                                onClick={() => handleDownload(exportJob)}
                                                disabled={downloadExport.isPending}
                                                className="text-indigo-600 hover:text-indigo-900 disabled:opacity-50"
                                            >
                                                Download
                                            </button>
                                        )}
                                        {exportJob.status === 'failed' && exportJob.error_message && (
                                            <span
                                                className="text-red-600 cursor-help"
                                                title={exportJob.error_message}
                                            >
                                                Error
                                            </span>
                                        )}
                                        <button
                                            onClick={() => handleDelete(exportJob.id)}
                                            disabled={deleteExport.isPending}
                                            className="text-red-600 hover:text-red-900 disabled:opacity-50"
                                        >
                                            Delete
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {exportsData.meta && (
                <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
                    <div className="text-sm text-gray-700">
                        Showing {exportsData.meta.from} to {exportsData.meta.to} of{' '}
                        {exportsData.meta.total} exports
                    </div>
                </div>
            )}
        </div>
    );
}
