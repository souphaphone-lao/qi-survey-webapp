/**
 * Connection Status Indicator
 *
 * Displays the current online/offline status in the UI.
 * Shows sync progress and errors when applicable.
 */

import React from 'react';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { useSyncEngine } from '@/hooks/useSyncEngine';

export function ConnectionStatus() {
    const { isOnline } = useOnlineStatus();
    const { isSyncing, pendingCount, manualSync } = useSyncEngine();

    // Syncing state (blue)
    if (isSyncing) {
        return (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-50">
                <svg
                    className="w-4 h-4 text-blue-600 animate-spin"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                >
                    <path
                        fillRule="evenodd"
                        d="M15.312 11.424a5.5 5.5 0 01-9.201 2.466l-.312-.311h2.433a.75.75 0 000-1.5H3.989a.75.75 0 00-.75.75v4.242a.75.75 0 001.5 0v-2.43l.31.31a7 7 0 0011.712-3.138.75.75 0 00-1.449-.39zm1.23-3.723a.75.75 0 00.219-.53V2.929a.75.75 0 00-1.5 0V5.36l-.31-.31A7 7 0 003.239 8.188a.75.75 0 101.448.389A5.5 5.5 0 0113.89 6.11l.311.31h-2.432a.75.75 0 000 1.5h4.243a.75.75 0 00.53-.219z"
                        clipRule="evenodd"
                    />
                </svg>
                <span className="text-sm font-medium text-blue-700">
                    Syncing...
                </span>
            </div>
        );
    }

    // Pending items (online but not synced) - show manual sync button
    if (isOnline && pendingCount > 0) {
        return (
            <button
                onClick={manualSync}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-orange-50 hover:bg-orange-100 transition-colors"
                title={`${pendingCount} item${pendingCount !== 1 ? 's' : ''} pending sync`}
            >
                <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
                <span className="text-sm font-medium text-orange-700">
                    Sync ({pendingCount})
                </span>
            </button>
        );
    }

    // Online (green)
    if (isOnline) {
        return (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-50">
                <div
                    className="w-2 h-2 rounded-full bg-green-500"
                    aria-label="Online"
                />
                <span className="text-sm font-medium text-green-700">
                    Online
                </span>
            </div>
        );
    }

    // Offline (orange)
    return (
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-50">
            <div
                className="w-2 h-2 rounded-full bg-orange-500"
                aria-label="Offline"
            />
            <span className="text-sm font-medium text-orange-700">
                Offline
            </span>
        </div>
    );
}
