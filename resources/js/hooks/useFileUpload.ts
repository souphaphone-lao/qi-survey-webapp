import { useState, useCallback } from 'react';
import { fileStorageService } from '@/services/fileStorageService';
import { db } from '@/db/db';

interface UseFileUploadOptions {
    submissionLocalId: string;
    questionName: string;
    maxFiles?: number;
    acceptedTypes?: string[];
}

interface FileWithId {
    id: string;
    file: File;
    progress: number;
    uploaded: boolean;
    error?: string;
}

interface UseFileUploadReturn {
    files: FileWithId[];
    uploading: boolean;
    addFiles: (files: FileList | File[]) => Promise<void>;
    removeFile: (fileId: string) => Promise<void>;
    clearAll: () => void;
    error: string | null;
    storageUsed: string;
}

/**
 * Hook for managing file uploads in submissions.
 *
 * Features:
 * - Add multiple files
 * - Store files in IndexedDB
 * - Track upload progress
 * - Remove files
 * - Validate file types and sizes
 *
 * Usage:
 * ```tsx
 * const { files, addFiles, removeFile, uploading, error } = useFileUpload({
 *   submissionLocalId: 'abc-123',
 *   questionName: 'photo_upload',
 *   maxFiles: 5,
 *   acceptedTypes: ['image/*', 'application/pdf']
 * });
 * ```
 */
export function useFileUpload(options: UseFileUploadOptions): UseFileUploadReturn {
    const {
        submissionLocalId,
        questionName,
        maxFiles = 10,
        acceptedTypes,
    } = options;

    const [files, setFiles] = useState<FileWithId[]>([]);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [storageUsed, setStorageUsed] = useState('0 Bytes');

    /**
     * Update storage stats
     */
    const updateStorageStats = useCallback(async () => {
        const stats = await fileStorageService.getStorageStats();
        setStorageUsed(fileStorageService.formatBytes(stats.usedBytes));
    }, []);

    /**
     * Load existing files for this question
     */
    const loadExistingFiles = useCallback(async () => {
        const existingFiles = await db.files
            .where('submissionLocalId')
            .equals(submissionLocalId)
            .filter(f => f.questionName === questionName)
            .toArray();

        const fileList: FileWithId[] = existingFiles.map(f => ({
            id: f.id,
            file: new File([], f.fileName, { type: f.fileType }),
            progress: 100,
            uploaded: f.synced,
            error: undefined,
        }));

        setFiles(fileList);
        await updateStorageStats();
    }, [submissionLocalId, questionName, updateStorageStats]);

    /**
     * Validate file type
     */
    const validateFileType = useCallback((file: File): boolean => {
        if (!acceptedTypes || acceptedTypes.length === 0) {
            return true;
        }

        return acceptedTypes.some(type => {
            if (type.endsWith('/*')) {
                // Handle wildcard types like "image/*"
                const baseType = type.slice(0, -2);
                return file.type.startsWith(baseType);
            }
            return file.type === type;
        });
    }, [acceptedTypes]);

    /**
     * Add files to upload queue
     */
    const addFiles = useCallback(async (newFiles: FileList | File[]) => {
        setError(null);
        setUploading(true);

        try {
            const fileArray = Array.from(newFiles);

            // Check max files limit
            if (files.length + fileArray.length > maxFiles) {
                throw new Error(`Maximum ${maxFiles} file(s) allowed`);
            }

            // Validate and store each file
            for (const file of fileArray) {
                // Validate file type
                if (!validateFileType(file)) {
                    throw new Error(
                        `File type "${file.type}" not accepted. Allowed types: ${acceptedTypes?.join(', ')}`
                    );
                }

                // Store file in IndexedDB
                try {
                    const fileId = await fileStorageService.storeFile(
                        file,
                        submissionLocalId,
                        questionName
                    );

                    // Add to sync queue
                    await db.syncQueue.add({
                        type: 'file',
                        itemId: fileId,
                        priority: 2, // Normal priority
                        attempts: 0,
                        createdAt: new Date(),
                    });

                    // Add to local state
                    setFiles(prev => [
                        ...prev,
                        {
                            id: fileId,
                            file,
                            progress: 0,
                            uploaded: false,
                        },
                    ]);
                } catch (err) {
                    const errorMessage = err instanceof Error ? err.message : 'Failed to store file';
                    console.error(`Failed to store file ${file.name}:`, err);
                    throw new Error(`${file.name}: ${errorMessage}`);
                }
            }

            await updateStorageStats();
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to add files';
            setError(errorMessage);
            console.error('Failed to add files:', err);
        } finally {
            setUploading(false);
        }
    }, [
        files.length,
        maxFiles,
        validateFileType,
        acceptedTypes,
        submissionLocalId,
        questionName,
        updateStorageStats,
    ]);

    /**
     * Remove a file
     */
    const removeFile = useCallback(async (fileId: string) => {
        try {
            await fileStorageService.deleteFile(fileId);

            // Remove from sync queue
            const queueItems = await db.syncQueue
                .where('itemId')
                .equals(fileId)
                .toArray();

            for (const item of queueItems) {
                await db.syncQueue.delete(item.id!);
            }

            setFiles(prev => prev.filter(f => f.id !== fileId));
            await updateStorageStats();
        } catch (err) {
            console.error(`Failed to remove file ${fileId}:`, err);
            setError('Failed to remove file');
        }
    }, [updateStorageStats]);

    /**
     * Clear all files
     */
    const clearAll = useCallback(() => {
        setFiles([]);
        setError(null);
    }, []);

    return {
        files,
        uploading,
        addFiles,
        removeFile,
        clearAll,
        error,
        storageUsed,
    };
}
