import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { submissionsApi } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { useOfflineSubmissionsList } from '@/hooks/useOfflineSubmissionsList';
import type { SubmissionWithSyncStatus } from '@/hooks/useOfflineSubmissionsList';

type SyncFilter = 'all' | 'synced' | 'pending';

export default function SubmissionList() {
    const { hasPermission } = useAuth();
    const { isOnline } = useOnlineStatus();
    const { data, isLoading, error } = useQuery({
        queryKey: ['submissions'],
        queryFn: () => submissionsApi.list(),
        enabled: isOnline, // Only fetch when online
    });
    const {
        offlineSubmissions,
        isLoading: isLoadingOffline,
        error: offlineError,
        pendingCount,
    } = useOfflineSubmissionsList();

    const [syncFilter, setSyncFilter] = useState<SyncFilter>('all');

    // Merge online and offline submissions
    const allSubmissions = useMemo(() => {
        const online = data?.data || [];
        const offline = offlineSubmissions || [];

        // Deduplicate: if a submission exists both online and offline, prefer online
        const onlineIds = new Set(online.map(s => s.id));
        const uniqueOffline = offline.filter(s => !s.id || !onlineIds.has(s.id));

        // Mark online submissions as synced
        const onlineWithStatus: SubmissionWithSyncStatus[] = online.map(s => ({
            ...s,
            synced: true,
            syncStatus: 'synced' as const,
            isOffline: false as const,
        }));

        return [...onlineWithStatus, ...uniqueOffline];
    }, [data, offlineSubmissions]);

    // Filter submissions based on sync filter
    const filteredSubmissions = useMemo(() => {
        if (syncFilter === 'all') return allSubmissions;
        if (syncFilter === 'synced') return allSubmissions.filter(s => 'synced' in s && s.synced);
        if (syncFilter === 'pending') return allSubmissions.filter(s => 'synced' in s && !s.synced);
        return allSubmissions;
    }, [allSubmissions, syncFilter]);

    if ((isLoading || isLoadingOffline) && allSubmissions.length === 0) {
        return <div className="text-gray-500">Loading submissions...</div>;
    }

    if (error && offlineError) {
        return <div className="text-red-500">Failed to load submissions</div>;
    }

    const statusColors: Record<string, string> = {
        draft: 'bg-yellow-100 text-yellow-800',
        submitted: 'bg-blue-100 text-blue-800',
        approved: 'bg-green-100 text-green-800',
        rejected: 'bg-red-100 text-red-800'
    };

    const syncStatusBadge = (submission: SubmissionWithSyncStatus) => {
        if (!('synced' in submission)) return null;

        if (submission.synced) {
            return (
                <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-700">
                    <svg className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
                    </svg>
                    Synced
                </span>
            );
        }

        if (submission.syncStatus === 'error') {
            return (
                <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-1 text-xs font-medium text-red-700">
                    <svg className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
                    </svg>
                    Sync Error
                </span>
            );
        }

        return (
            <span className="inline-flex items-center gap-1 rounded-full bg-orange-100 px-2 py-1 text-xs font-medium text-orange-700">
                <svg className="h-3 w-3 animate-spin" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M15.312 11.424a5.5 5.5 0 01-9.201 2.466l-.312-.311h2.433a.75.75 0 000-1.5H3.989a.75.75 0 00-.75.75v4.242a.75.75 0 001.5 0v-2.43l.31.31a7 7 0 0011.712-3.138.75.75 0 00-1.449-.39zm1.23-3.723a.75.75 0 00.219-.53V2.929a.75.75 0 00-1.5 0V5.36l-.31-.31A7 7 0 003.239 8.188a.75.75 0 101.448.389A5.5 5.5 0 0113.89 6.11l.311.31h-2.432a.75.75 0 000 1.5h4.243a.75.75 0 00.53-.219z" clipRule="evenodd" />
                </svg>
                Pending
            </span>
        );
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-gray-900">Submissions</h1>
            </div>

            {/* Sync Status Filter */}
            {pendingCount > 0 && (
                <div className="bg-white shadow rounded-lg p-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <span className="text-sm font-medium text-gray-700">Filter:</span>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setSyncFilter('all')}
                                    className={`px-3 py-1 rounded-md text-sm font-medium ${
                                        syncFilter === 'all'
                                            ? 'bg-indigo-100 text-indigo-700'
                                            : 'text-gray-600 hover:bg-gray-100'
                                    }`}
                                >
                                    All ({allSubmissions.length})
                                </button>
                                <button
                                    onClick={() => setSyncFilter('synced')}
                                    className={`px-3 py-1 rounded-md text-sm font-medium ${
                                        syncFilter === 'synced'
                                            ? 'bg-green-100 text-green-700'
                                            : 'text-gray-600 hover:bg-gray-100'
                                    }`}
                                >
                                    Synced
                                </button>
                                <button
                                    onClick={() => setSyncFilter('pending')}
                                    className={`px-3 py-1 rounded-md text-sm font-medium ${
                                        syncFilter === 'pending'
                                            ? 'bg-orange-100 text-orange-700'
                                            : 'text-gray-600 hover:bg-gray-100'
                                    }`}
                                >
                                    Pending ({pendingCount})
                                </button>
                            </div>
                        </div>
                        {!isOnline && (
                            <span className="text-sm text-gray-500">
                                Offline - {pendingCount} submission{pendingCount !== 1 ? 's' : ''} waiting to sync
                            </span>
                        )}
                    </div>
                </div>
            )}

            <div className="overflow-hidden rounded-lg bg-white shadow">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Questionnaire</th>
                            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Institution</th>
                            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Created By</th>
                            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Status</th>
                            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Sync</th>
                            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Created</th>
                            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white">
                        {filteredSubmissions.length === 0 ? (
                            <tr>
                                <td colSpan={7} className="px-6 py-4 text-center text-sm text-gray-500">
                                    No submissions found
                                </td>
                            </tr>
                        ) : (
                            filteredSubmissions.map((s) => {
                                const key = 'localId' in s ? s.localId : `server-${s.id}`;
                                const submissionId = s.id || ('localId' in s ? s.localId : undefined);

                                return (
                                    <tr key={key}>
                                        <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">
                                            {s.questionnaire?.title || 'Unknown'}
                                        </td>
                                        <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                                            {s.institution?.name || 'Unknown'}
                                        </td>
                                        <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                                            {s.created_by?.name || 'You'}
                                        </td>
                                        <td className="whitespace-nowrap px-6 py-4">
                                            <span className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${statusColors[s.status]}`}>
                                                {s.status.charAt(0).toUpperCase() + s.status.slice(1)}
                                            </span>
                                        </td>
                                        <td className="whitespace-nowrap px-6 py-4">
                                            {syncStatusBadge(s)}
                                        </td>
                                        <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                                            {new Date(s.created_at).toLocaleDateString()}
                                        </td>
                                        <td className="whitespace-nowrap px-6 py-4 text-sm space-x-2">
                                            {submissionId && (
                                                <>
                                                    <Link to={`/submissions/${submissionId}`} className="text-indigo-600 hover:text-indigo-900">
                                                        View
                                                    </Link>
                                                    {s.can_be_edited && hasPermission('submissions.update') && (
                                                        <Link to={`/submissions/${submissionId}/edit`} className="text-green-600 hover:text-green-900">
                                                            Edit
                                                        </Link>
                                                    )}
                                                </>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
