import { db } from '@/db/db';
import { fileStorageService } from './fileStorageService';
import axios from 'axios';

/**
 * Service for syncing file attachments to the server.
 *
 * Features:
 * - Upload files via multipart form data
 * - Track upload progress
 * - Handle upload errors
 * - Integrate with sync queue
 */
export class FileSyncService {
    /**
     * Upload a file to the server.
     *
     * @param fileId - File ID from IndexedDB
     * @param onProgress - Progress callback (0-100)
     * @returns Server response with file path
     */
    async uploadFile(
        fileId: string,
        onProgress?: (percentage: number) => void
    ): Promise<{ path: string; url: string }> {
        const fileRecord = await db.files.get(fileId);

        if (!fileRecord) {
            throw new Error(`File ${fileId} not found in IndexedDB`);
        }

        if (!fileRecord.blob) {
            throw new Error(`File ${fileId} has no blob (may have been cleaned up)`);
        }

        if (fileRecord.synced && fileRecord.uploadedPath) {
            console.log(`[FileSync] File ${fileId} already synced, skipping`);
            return {
                path: fileRecord.uploadedPath,
                url: fileRecord.uploadedPath,
            };
        }

        console.log(
            `[FileSync] Uploading file ${fileRecord.fileName} (${fileStorageService.formatBytes(fileRecord.fileSize)})`
        );

        // Create FormData for multipart upload
        const formData = new FormData();
        formData.append('file', fileRecord.blob, fileRecord.fileName);
        formData.append('submission_local_id', fileRecord.submissionLocalId);
        formData.append('question_name', fileRecord.questionName);

        try {
            // Upload to server
            const response = await axios.post<{ path: string; url: string }>(
                '/api/submissions/files/upload',
                formData,
                {
                    headers: {
                        'Content-Type': 'multipart/form-data',
                    },
                    onUploadProgress: (progressEvent) => {
                        if (progressEvent.total && onProgress) {
                            const percentage = Math.round(
                                (progressEvent.loaded * 100) / progressEvent.total
                            );
                            onProgress(percentage);
                        }
                    },
                }
            );

            // Mark as synced in IndexedDB
            await fileStorageService.markAsSynced(fileId, response.data.path, true);

            console.log(`[FileSync] File ${fileId} uploaded successfully to ${response.data.path}`);

            return response.data;
        } catch (error) {
            console.error(`[FileSync] Failed to upload file ${fileId}:`, error);
            throw error;
        }
    }

    /**
     * Upload all pending files for a submission.
     *
     * @param submissionLocalId - Submission local ID
     * @param onProgress - Progress callback for each file
     * @returns Array of uploaded file paths
     */
    async uploadSubmissionFiles(
        submissionLocalId: string,
        onProgress?: (fileId: string, percentage: number) => void
    ): Promise<{ fileId: string; path: string }[]> {
        const files = await db.files
            .where('submissionLocalId')
            .equals(submissionLocalId)
            .toArray();

        const pendingFiles = files.filter(f => !f.synced && f.blob);

        if (pendingFiles.length === 0) {
            console.log(`[FileSync] No pending files for submission ${submissionLocalId}`);
            return [];
        }

        console.log(`[FileSync] Uploading ${pendingFiles.length} file(s) for submission ${submissionLocalId}`);

        const results: { fileId: string; path: string }[] = [];

        for (const file of pendingFiles) {
            try {
                const result = await this.uploadFile(file.id, (percentage) => {
                    if (onProgress) {
                        onProgress(file.id, percentage);
                    }
                });

                results.push({
                    fileId: file.id,
                    path: result.path,
                });
            } catch (error) {
                console.error(`[FileSync] Failed to upload file ${file.id}:`, error);
                throw error;
            }
        }

        console.log(`[FileSync] Successfully uploaded ${results.length} file(s)`);

        return results;
    }

    /**
     * Check if a submission has pending file uploads.
     *
     * @param submissionLocalId - Submission local ID
     * @returns True if files need to be uploaded
     */
    async hasPendingFiles(submissionLocalId: string): Promise<boolean> {
        const count = await db.files
            .where('submissionLocalId')
            .equals(submissionLocalId)
            .filter(f => !f.synced && !!f.blob)
            .count();

        return count > 0;
    }

    /**
     * Get pending files count.
     *
     * @returns Number of files waiting to be uploaded
     */
    async getPendingFilesCount(): Promise<number> {
        return await db.files
            .filter(f => !f.synced && !!f.blob)
            .count();
    }

    /**
     * Retry failed file uploads.
     * Scans sync queue for failed file uploads and retries them.
     *
     * @returns Number of files retried
     */
    async retryFailedUploads(): Promise<number> {
        const failedItems = await db.syncQueue
            .where('type')
            .equals('file')
            .filter(item => item.attempts > 0 && item.attempts < 5)
            .toArray();

        let retriedCount = 0;

        for (const item of failedItems) {
            try {
                await this.uploadFile(item.itemId);
                await db.syncQueue.delete(item.id!);
                retriedCount++;
            } catch (error) {
                console.error(`[FileSync] Retry failed for file ${item.itemId}:`, error);
            }
        }

        console.log(`[FileSync] Retried ${retriedCount} failed upload(s)`);

        return retriedCount;
    }
}

export const fileSyncService = new FileSyncService();
