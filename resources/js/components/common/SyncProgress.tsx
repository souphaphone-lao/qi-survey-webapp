import React from 'react';
import { useSyncEngine } from '@/hooks/useSyncEngine';

/**
 * Sync Progress Component
 *
 * Displays sync progress when syncing submissions/files.
 * Shows as a toast notification in the bottom-right corner.
 */
export function SyncProgress() {
    const { isSyncing, completed, total, currentItem } = useSyncEngine();

    if (!isSyncing) {
        return null;
    }

    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

    return (
        <div className="fixed bottom-4 right-4 z-50 w-96 rounded-lg bg-white shadow-lg border border-gray-200">
            <div className="p-4">
                {/* Header */}
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                        <svg
                            className="h-5 w-5 text-blue-600 animate-spin"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                        >
                            <path
                                fillRule="evenodd"
                                d="M15.312 11.424a5.5 5.5 0 01-9.201 2.466l-.312-.311h2.433a.75.75 0 000-1.5H3.989a.75.75 0 00-.75.75v4.242a.75.75 0 001.5 0v-2.43l.31.31a7 7 0 0011.712-3.138.75.75 0 00-1.449-.39zm1.23-3.723a.75.75 0 00.219-.53V2.929a.75.75 0 00-1.5 0V5.36l-.31-.31A7 7 0 003.239 8.188a.75.75 0 101.448.389A5.5 5.5 0 0113.89 6.11l.311.31h-2.432a.75.75 0 000 1.5h4.243a.75.75 0 00.53-.219z"
                                clipRule="evenodd"
                            />
                        </svg>
                        <h3 className="text-sm font-semibold text-gray-900">
                            Syncing Data
                        </h3>
                    </div>
                    <span className="text-sm font-medium text-gray-600">
                        {completed}/{total}
                    </span>
                </div>

                {/* Progress Bar */}
                <div className="mb-3">
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-blue-600 transition-all duration-300 ease-out"
                            style={{ width: `${percentage}%` }}
                        />
                    </div>
                    <div className="mt-1 text-xs text-gray-500 text-right">
                        {percentage}% complete
                    </div>
                </div>

                {/* Current Item */}
                {currentItem && (
                    <div className="space-y-2">
                        <div className="flex items-start gap-2 text-sm">
                            {currentItem.status === 'syncing' && (
                                <>
                                    <svg
                                        className="h-4 w-4 text-blue-600 mt-0.5 animate-spin flex-shrink-0"
                                        viewBox="0 0 20 20"
                                        fill="currentColor"
                                    >
                                        <path
                                            fillRule="evenodd"
                                            d="M15.312 11.424a5.5 5.5 0 01-9.201 2.466l-.312-.311h2.433a.75.75 0 000-1.5H3.989a.75.75 0 00-.75.75v4.242a.75.75 0 001.5 0v-2.43l.31.31a7 7 0 0011.712-3.138.75.75 0 00-1.449-.39zm1.23-3.723a.75.75 0 00.219-.53V2.929a.75.75 0 00-1.5 0V5.36l-.31-.31A7 7 0 003.239 8.188a.75.75 0 101.448.389A5.5 5.5 0 0113.89 6.11l.311.31h-2.432a.75.75 0 000 1.5h4.243a.75.75 0 00.53-.219z"
                                            clipRule="evenodd"
                                        />
                                    </svg>
                                    <span className="text-gray-700">
                                        Syncing {currentItem.type}...
                                    </span>
                                </>
                            )}
                            {currentItem.status === 'success' && (
                                <>
                                    <svg
                                        className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0"
                                        viewBox="0 0 20 20"
                                        fill="currentColor"
                                    >
                                        <path
                                            fillRule="evenodd"
                                            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
                                            clipRule="evenodd"
                                        />
                                    </svg>
                                    <span className="text-gray-700">
                                        {currentItem.type} synced ✓
                                    </span>
                                </>
                            )}
                            {currentItem.status === 'error' && (
                                <>
                                    <svg
                                        className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0"
                                        viewBox="0 0 20 20"
                                        fill="currentColor"
                                    >
                                        <path
                                            fillRule="evenodd"
                                            d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z"
                                            clipRule="evenodd"
                                        />
                                    </svg>
                                    <div className="flex-1">
                                        <span className="text-red-700">
                                            Failed to sync {currentItem.type}
                                        </span>
                                        {currentItem.error && (
                                            <p className="text-xs text-red-600 mt-1">
                                                {currentItem.error}
                                            </p>
                                        )}
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                )}

                {/* Info Text */}
                <p className="mt-3 text-xs text-gray-500">
                    Please keep this tab open until sync completes.
                </p>
            </div>
        </div>
    );
}
