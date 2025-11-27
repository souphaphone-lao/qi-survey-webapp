import { useState, useEffect, useCallback } from 'react';
import { syncService, type SyncStatus } from '@/services/syncService';
import { useOnlineStatus } from './useOnlineStatus';

interface UseSyncEngineReturn {
    /** Whether sync is currently in progress */
    isSyncing: boolean;

    /** Number of items completed */
    completed: number;

    /** Total number of items to sync */
    total: number;

    /** Number of pending items */
    pendingCount: number;

    /** Current item being synced */
    currentItem?: SyncStatus['currentItem'];

    /** Manually trigger sync */
    manualSync: () => void;

    /** Retry a specific failed item */
    retry: (itemId: number) => Promise<void>;

    /** Get queue status */
    getQueueStatus: () => Promise<{
        pending: number;
        failed: number;
        total: number;
    }>;

    /** Clear all failed items */
    clearFailedItems: () => Promise<number>;
}

/**
 * Hook for managing sync engine in React components.
 *
 * Features:
 * - Auto-syncs when connection is restored
 * - Provides sync progress and status
 * - Allows manual sync trigger
 * - Manages sync queue
 *
 * Usage:
 * ```tsx
 * const { isSyncing, pendingCount, manualSync } = useSyncEngine();
 *
 * if (pendingCount > 0) {
 *   return <button onClick={manualSync}>Sync {pendingCount} items</button>;
 * }
 * ```
 */
export function useSyncEngine(): UseSyncEngineReturn {
    const { isOnline } = useOnlineStatus();

    const [syncStatus, setSyncStatus] = useState<SyncStatus>({
        syncing: false,
        completed: 0,
        total: 0,
    });

    const [hasAutoSynced, setHasAutoSynced] = useState(false);

    // Subscribe to sync status updates
    useEffect(() => {
        const unsubscribe = syncService.onChange(setSyncStatus);
        return unsubscribe;
    }, []);

    // Auto-sync when connection is restored
    useEffect(() => {
        if (isOnline && !syncStatus.syncing && !hasAutoSynced) {
            console.log('[useSyncEngine] Connection restored, triggering auto-sync');

            // Small delay to let other hooks settle
            const timer = setTimeout(() => {
                syncService.sync();
                setHasAutoSynced(true);
            }, 500);

            return () => clearTimeout(timer);
        }

        // Reset auto-sync flag when going offline
        if (!isOnline) {
            setHasAutoSynced(false);
        }
    }, [isOnline, syncStatus.syncing, hasAutoSynced]);

    /**
     * Manually trigger sync.
     * Only works when online and not already syncing.
     */
    const manualSync = useCallback(() => {
        if (!isOnline) {
            console.warn('[useSyncEngine] Cannot sync while offline');
            return;
        }

        if (syncStatus.syncing) {
            console.warn('[useSyncEngine] Sync already in progress');
            return;
        }

        console.log('[useSyncEngine] Manual sync triggered');
        syncService.sync();
    }, [isOnline, syncStatus.syncing]);

    /**
     * Retry a specific failed item.
     *
     * @param itemId - Sync queue item ID
     */
    const retry = useCallback(async (itemId: number) => {
        if (!isOnline) {
            throw new Error('Cannot retry while offline');
        }

        console.log(`[useSyncEngine] Retrying item ${itemId}`);
        await syncService.retry(itemId);
    }, [isOnline]);

    /**
     * Get current queue status.
     */
    const getQueueStatus = useCallback(async () => {
        return await syncService.getQueueStatus();
    }, []);

    /**
     * Clear all failed items from queue.
     */
    const clearFailedItems = useCallback(async () => {
        const count = await syncService.clearFailedItems();
        console.log(`[useSyncEngine] Cleared ${count} failed item(s)`);
        return count;
    }, []);

    return {
        isSyncing: syncStatus.syncing,
        completed: syncStatus.completed,
        total: syncStatus.total,
        pendingCount: syncStatus.total - syncStatus.completed,
        currentItem: syncStatus.currentItem,
        manualSync,
        retry,
        getQueueStatus,
        clearFailedItems,
    };
}
