import { db } from '@/db/db';
import { v4 as uuidv4 } from 'uuid';
import type { OfflineFile } from '@/db/schema';

/**
 * Service for managing file storage in IndexedDB.
 *
 * Features:
 * - Store file blobs locally
 * - Track file metadata
 * - Monitor storage quota
 * - Clean up synced files
 */
export class FileStorageService {
    private readonly maxFileSize = 50 * 1024 * 1024; // 50MB per file
    private readonly maxTotalStorage = 500 * 1024 * 1024; // 500MB total

    /**
     * Store a file in IndexedDB.
     *
     * @param file - File object from input
     * @param submissionLocalId - Associated submission local ID
     * @param questionName - Question name this file answers
     * @returns File ID
     */
    async storeFile(
        file: File,
        submissionLocalId: string,
        questionName: string
    ): Promise<string> {
        // Validate file size
        if (file.size > this.maxFileSize) {
            throw new Error(
                `File size (${this.formatBytes(file.size)}) exceeds maximum allowed size (${this.formatBytes(this.maxFileSize)})`
            );
        }

        // Check available storage
        await this.ensureStorageAvailable(file.size);

        // Create file record
        const fileId = uuidv4();
        const offlineFile: OfflineFile = {
            id: fileId,
            submissionLocalId,
            questionName,
            fileName: file.name,
            fileType: file.type,
            fileSize: file.size,
            blob: file,
            synced: false,
            createdAt: new Date(),
        };

        await db.files.add(offlineFile);

        console.log(
            `[FileStorage] Stored file ${file.name} (${this.formatBytes(file.size)}) for submission ${submissionLocalId}`
        );

        return fileId;
    }

    /**
     * Get a file from IndexedDB.
     *
     * @param fileId - File ID
     * @returns File record or undefined
     */
    async getFile(fileId: string): Promise<OfflineFile | undefined> {
        return await db.files.get(fileId);
    }

    /**
     * Get all files for a submission.
     *
     * @param submissionLocalId - Submission local ID
     * @returns Array of file records
     */
    async getFilesBySubmission(submissionLocalId: string): Promise<OfflineFile[]> {
        return await db.files
            .where('submissionLocalId')
            .equals(submissionLocalId)
            .toArray();
    }

    /**
     * Delete a file from IndexedDB.
     *
     * @param fileId - File ID
     */
    async deleteFile(fileId: string): Promise<void> {
        await db.files.delete(fileId);
        console.log(`[FileStorage] Deleted file ${fileId}`);
    }

    /**
     * Mark file as synced and optionally remove blob to save space.
     *
     * @param fileId - File ID
     * @param uploadedPath - Server path where file was uploaded
     * @param removeBlob - Whether to remove blob from storage (default: true)
     */
    async markAsSynced(
        fileId: string,
        uploadedPath: string,
        removeBlob = true
    ): Promise<void> {
        const updates: Partial<OfflineFile> = {
            synced: true,
            uploadedPath,
        };

        if (removeBlob) {
            updates.blob = undefined; // Remove blob to free space
        }

        await db.files.update(fileId, updates);

        console.log(`[FileStorage] Marked file ${fileId} as synced${removeBlob ? ' and removed blob' : ''}`);
    }

    /**
     * Get storage statistics.
     *
     * @returns Storage usage information
     */
    async getStorageStats(): Promise<{
        usedBytes: number;
        fileCount: number;
        syncedCount: number;
        pendingCount: number;
        largestFile: { name: string; size: number } | null;
    }> {
        const files = await db.files.toArray();

        const usedBytes = files.reduce((total, file) => {
            return total + (file.blob ? file.fileSize : 0);
        }, 0);

        const syncedCount = files.filter(f => f.synced).length;
        const pendingCount = files.filter(f => !f.synced).length;

        let largestFile: { name: string; size: number } | null = null;
        if (files.length > 0) {
            const largest = files.reduce((max, file) =>
                file.fileSize > max.fileSize ? file : max
            );
            largestFile = {
                name: largest.fileName,
                size: largest.fileSize,
            };
        }

        return {
            usedBytes,
            fileCount: files.length,
            syncedCount,
            pendingCount,
            largestFile,
        };
    }

    /**
     * Clean up synced files to free storage space.
     * Removes blobs but keeps metadata.
     *
     * @returns Number of files cleaned
     */
    async cleanupSyncedFiles(): Promise<number> {
        const syncedFiles = await db.files
            .where('synced')
            .equals(1) // Dexie boolean index
            .toArray();

        let cleanedCount = 0;

        for (const file of syncedFiles) {
            if (file.blob) {
                await db.files.update(file.id, {
                    blob: undefined,
                });
                cleanedCount++;
            }
        }

        console.log(`[FileStorage] Cleaned up ${cleanedCount} synced file(s)`);

        return cleanedCount;
    }

    /**
     * Ensure sufficient storage is available for a file.
     *
     * @param requiredBytes - Bytes needed
     * @throws Error if storage quota would be exceeded
     */
    private async ensureStorageAvailable(requiredBytes: number): Promise<void> {
        const stats = await this.getStorageStats();
        const totalAfter = stats.usedBytes + requiredBytes;

        if (totalAfter > this.maxTotalStorage) {
            // Try cleaning up synced files first
            const cleaned = await this.cleanupSyncedFiles();

            if (cleaned > 0) {
                const newStats = await this.getStorageStats();
                const newTotalAfter = newStats.usedBytes + requiredBytes;

                if (newTotalAfter > this.maxTotalStorage) {
                    throw new Error(
                        `Storage quota exceeded. Used: ${this.formatBytes(newStats.usedBytes)}, ` +
                        `Required: ${this.formatBytes(requiredBytes)}, ` +
                        `Maximum: ${this.formatBytes(this.maxTotalStorage)}. ` +
                        `Please sync and delete old submissions to free space.`
                    );
                }
            } else {
                throw new Error(
                    `Storage quota exceeded. Used: ${this.formatBytes(stats.usedBytes)}, ` +
                    `Required: ${this.formatBytes(requiredBytes)}, ` +
                    `Maximum: ${this.formatBytes(this.maxTotalStorage)}. ` +
                    `Please sync and delete old submissions to free space.`
                );
            }
        }
    }

    /**
     * Format bytes to human-readable size.
     *
     * @param bytes - Number of bytes
     * @returns Formatted string (e.g., "1.5 MB")
     */
    formatBytes(bytes: number): string {
        if (bytes === 0) return '0 Bytes';

        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));

        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    /**
     * Get browser storage estimate (if supported).
     *
     * @returns Storage estimate or null if not supported
     */
    async getBrowserStorageEstimate(): Promise<{
        usage: number;
        quota: number;
        percentage: number;
    } | null> {
        if (!navigator.storage || !navigator.storage.estimate) {
            return null;
        }

        try {
            const estimate = await navigator.storage.estimate();
            const usage = estimate.usage || 0;
            const quota = estimate.quota || 0;
            const percentage = quota > 0 ? (usage / quota) * 100 : 0;

            return {
                usage,
                quota,
                percentage,
            };
        } catch (error) {
            console.error('[FileStorage] Failed to get storage estimate:', error);
            return null;
        }
    }
}

export const fileStorageService = new FileStorageService();
