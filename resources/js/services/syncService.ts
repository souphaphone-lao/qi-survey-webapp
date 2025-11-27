import { db } from '@/db/db';
import { mergeService } from './mergeService';
import { submissionsApi } from './api';
import { fileSyncService } from './fileSyncService';
import type { SyncQueueItem } from '@/db/schema';

/**
 * Sync status for tracking sync progress
 */
export interface SyncStatus {
    syncing: boolean;
    completed: number;
    total: number;
    currentItem?: {
        type: 'submission' | 'file';
        id: string;
        status: 'syncing' | 'success' | 'error';
        error?: string;
    };
}

/**
 * Listener function type for sync status updates
 */
type SyncStatusListener = (status: SyncStatus) => void;

/**
 * Service for orchestrating offline submission synchronization.
 *
 * Features:
 * - Processes sync queue in priority order
 * - Handles submission and file uploads
 * - Implements exponential backoff for retries
 * - Emits progress events for UI updates
 * - Thread-safe (prevents concurrent syncs)
 */
export class SyncService {
    private isSyncing = false;
    private listeners: SyncStatusListener[] = [];
    private maxRetries = 5;
    private retryDelays = [1000, 2000, 4000, 8000, 16000]; // Exponential backoff in ms

    /**
     * Start synchronization process.
     * Processes all items in sync queue in priority order.
     */
    async sync(): Promise<void> {
        // Prevent concurrent syncs
        if (this.isSyncing) {
            console.log('[SyncService] Sync already in progress, skipping');
            return;
        }

        this.isSyncing = true;
        console.log('[SyncService] Starting sync...');

        try {
            // Get all items from sync queue ordered by priority (1 = high, 2 = normal)
            const queueItems = await db.syncQueue
                .orderBy('priority')
                .toArray();

            const total = queueItems.length;

            if (total === 0) {
                console.log('[SyncService] No items to sync');
                this.notifyListeners({
                    syncing: false,
                    completed: 0,
                    total: 0,
                });
                return;
            }

            console.log(`[SyncService] Found ${total} item(s) to sync`);

            let completed = 0;

            // Notify start of sync
            this.notifyListeners({
                syncing: true,
                completed: 0,
                total,
            });

            for (const item of queueItems) {
                try {
                    // Notify current item
                    this.notifyListeners({
                        syncing: true,
                        completed,
                        total,
                        currentItem: {
                            type: item.type,
                            id: item.itemId,
                            status: 'syncing',
                        },
                    });

                    if (item.type === 'submission') {
                        await this.syncSubmission(item);
                    } else if (item.type === 'file') {
                        await this.syncFile(item);
                    }

                    // Remove from queue on success
                    await db.syncQueue.delete(item.id!);

                    completed++;

                    // Notify success
                    this.notifyListeners({
                        syncing: true,
                        completed,
                        total,
                        currentItem: {
                            type: item.type,
                            id: item.itemId,
                            status: 'success',
                        },
                    });

                    console.log(`[SyncService] Synced ${item.type} ${item.itemId} (${completed}/${total})`);
                } catch (error) {
                    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

                    // Update attempts and error
                    await db.syncQueue.update(item.id!, {
                        attempts: item.attempts + 1,
                        lastAttemptAt: new Date(),
                        error: errorMessage,
                    });

                    // Notify error
                    this.notifyListeners({
                        syncing: true,
                        completed,
                        total,
                        currentItem: {
                            type: item.type,
                            id: item.itemId,
                            status: 'error',
                            error: errorMessage,
                        },
                    });

                    // Check if max retries reached
                    if (item.attempts + 1 >= this.maxRetries) {
                        console.error(
                            `[SyncService] Max retries (${this.maxRetries}) reached for ${item.type} ${item.itemId}`
                        );
                    } else {
                        console.warn(
                            `[SyncService] Failed to sync ${item.type} ${item.itemId} (attempt ${item.attempts + 1}/${this.maxRetries}):`,
                            errorMessage
                        );
                    }
                }
            }

            console.log(`[SyncService] Sync complete: ${completed}/${total} succeeded`);

            // Notify completion
            this.notifyListeners({
                syncing: false,
                completed,
                total,
            });
        } catch (error) {
            console.error('[SyncService] Sync failed:', error);

            // Notify error
            this.notifyListeners({
                syncing: false,
                completed: 0,
                total: 0,
            });
        } finally {
            this.isSyncing = false;
        }
    }

    /**
     * Sync a single submission to the server.
     *
     * @param item - Sync queue item
     */
    private async syncSubmission(item: SyncQueueItem): Promise<void> {
        const localId = item.itemId;
        const local = await db.submissions.get(localId);

        if (!local) {
            throw new Error(`Submission ${localId} not found in IndexedDB`);
        }

        if (local.synced) {
            console.log(`[SyncService] Submission ${localId} already synced, skipping`);
            return;
        }

        if (local.id) {
            // Update existing submission
            console.log(`[SyncService] Updating submission ${local.id} on server`);

            // Merge with server version
            const { mergedAnswers, conflicts } = await mergeService.mergeSubmission(local, local.id);

            if (conflicts.length > 0) {
                console.log(`[SyncService] ${mergeService.getConflictSummary(conflicts)}`);
            }

            // Update on server
            await submissionsApi.update(local.id, {
                answers_json: mergedAnswers,
                status: local.status,
            });

            // Mark as synced in IndexedDB
            await db.submissions.update(localId, {
                synced: true,
                syncedAt: new Date(),
            });

            console.log(`[SyncService] Submission ${local.id} updated successfully`);
        } else {
            // Create new submission
            console.log(`[SyncService] Creating new submission on server`);

            const response = await submissionsApi.create(local.questionnaireId, {
                answers_json: local.answersJson,
                status: local.status,
            });

            // Update with server ID
            await db.submissions.update(localId, {
                id: response.id,
                synced: true,
                syncedAt: new Date(),
            });

            console.log(`[SyncService] Submission created with ID ${response.id}`);
        }

        // Upload associated files
        try {
            const hasPendingFiles = await fileSyncService.hasPendingFiles(localId);
            if (hasPendingFiles) {
                console.log(`[SyncService] Uploading files for submission ${localId}`);
                await fileSyncService.uploadSubmissionFiles(localId);
            }
        } catch (error) {
            console.warn(`[SyncService] Failed to upload files for submission ${localId}:`, error);
            // Don't throw - submission was synced successfully, files can be retried
        }
    }

    /**
     * Sync a single file to the server.
     *
     * @param item - Sync queue item
     */
    private async syncFile(item: SyncQueueItem): Promise<void> {
        const fileId = item.itemId;

        console.log(`[SyncService] Uploading file ${fileId}`);

        await fileSyncService.uploadFile(fileId);

        console.log(`[SyncService] File ${fileId} uploaded successfully`);
    }

    /**
     * Retry a failed sync item with exponential backoff.
     *
     * @param itemId - Sync queue item ID
     */
    async retry(itemId: number): Promise<void> {
        const item = await db.syncQueue.get(itemId);
        if (!item) {
            throw new Error(`Sync queue item ${itemId} not found`);
        }

        // Calculate delay based on attempts (exponential backoff)
        const delay = this.retryDelays[Math.min(item.attempts, this.retryDelays.length - 1)];

        console.log(`[SyncService] Retrying ${item.type} ${item.itemId} after ${delay}ms`);

        // Wait for delay
        await new Promise(resolve => setTimeout(resolve, delay));

        // Retry sync for this specific item
        try {
            if (item.type === 'submission') {
                await this.syncSubmission(item);
            } else if (item.type === 'file') {
                await this.syncFile(item);
            }

            // Remove from queue on success
            await db.syncQueue.delete(itemId);

            console.log(`[SyncService] Retry successful for ${item.type} ${item.itemId}`);
        } catch (error) {
            // Update attempts
            await db.syncQueue.update(itemId, {
                attempts: item.attempts + 1,
                lastAttemptAt: new Date(),
                error: error instanceof Error ? error.message : 'Unknown error',
            });

            throw error;
        }
    }

    /**
     * Get current sync queue status.
     *
     * @returns Sync queue statistics
     */
    async getQueueStatus(): Promise<{
        pending: number;
        failed: number;
        total: number;
    }> {
        const items = await db.syncQueue.toArray();

        const failed = items.filter(item => item.attempts >= this.maxRetries).length;
        const pending = items.filter(item => item.attempts < this.maxRetries).length;

        return {
            pending,
            failed,
            total: items.length,
        };
    }

    /**
     * Clear all failed items from sync queue.
     * Use with caution - this will permanently remove failed sync items.
     */
    async clearFailedItems(): Promise<number> {
        const items = await db.syncQueue.toArray();
        const failedItems = items.filter(item => item.attempts >= this.maxRetries);

        for (const item of failedItems) {
            await db.syncQueue.delete(item.id!);
        }

        console.log(`[SyncService] Cleared ${failedItems.length} failed item(s)`);

        return failedItems.length;
    }

    /**
     * Subscribe to sync status updates.
     *
     * @param callback - Function to call on status change
     * @returns Unsubscribe function
     */
    onChange(callback: SyncStatusListener): () => void {
        this.listeners.push(callback);

        return () => {
            this.listeners = this.listeners.filter(l => l !== callback);
        };
    }

    /**
     * Notify all listeners of status change.
     *
     * @param status - Current sync status
     */
    private notifyListeners(status: SyncStatus): void {
        this.listeners.forEach(listener => listener(status));
    }
}

export const syncService = new SyncService();
