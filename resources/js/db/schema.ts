/**
 * IndexedDB Schema for Offline Storage
 *
 * This schema defines the structure for offline data storage using Dexie.js.
 * All data stored here is client-side only and will be synced to the server
 * when the user comes back online.
 */

import { QuestionPermission } from '@/types/questionnaire';

export interface CachedQuestionnaire {
    id: number;
    code: string;
    version: number;
    title: string;
    surveyjs_json: object;
    permissions: QuestionPermission[];
    cachedAt: Date;
}

export interface OfflineSubmission {
    id?: number; // Server ID (optional for new submissions)
    localId: string; // UUID for local submissions
    questionnaireId: number;
    institutionId: number;
    status: 'draft' | 'submitted' | 'approved' | 'rejected';
    answersJson: Record<string, any>;
    synced: boolean;
    syncedAt?: Date;
    createdAt: Date;
    updatedAt: Date;
    modifiedQuestions: string[]; // Track which questions changed locally
}

export interface OfflineFile {
    id: string; // UUID
    submissionLocalId: string;
    questionName: string;
    fileName: string;
    fileType: string;
    fileSize: number;
    blob?: Blob; // Removed after successful upload to free space
    synced: boolean;
    uploadedPath?: string;
    createdAt: Date;
}

export interface SyncQueueItem {
    id?: number;
    type: 'submission' | 'file';
    itemId: string; // submissionLocalId or fileId
    priority: number; // 1=high, 2=normal, 3=low
    attempts: number;
    lastAttemptAt?: Date;
    error?: string;
    createdAt: Date;
}

export interface SurveyAppDB {
    questionnaires: CachedQuestionnaire;
    submissions: OfflineSubmission;
    files: OfflineFile;
    syncQueue: SyncQueueItem;
}
