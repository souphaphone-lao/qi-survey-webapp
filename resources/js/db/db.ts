/**
 * IndexedDB Database Instance
 *
 * This file creates and exports the Dexie database instance for offline storage.
 * The database schema is defined with proper indexes for efficient querying.
 */

import Dexie, { type EntityTable } from 'dexie';
import type {
    SurveyAppDB,
    CachedQuestionnaire,
    OfflineSubmission,
    OfflineFile,
    SyncQueueItem,
} from './schema';

// Create the database instance
const db = new Dexie('SurveyAppDB') as Dexie & {
    questionnaires: EntityTable<CachedQuestionnaire, 'id'>;
    submissions: EntityTable<OfflineSubmission, 'localId'>;
    files: EntityTable<OfflineFile, 'id'>;
    syncQueue: EntityTable<SyncQueueItem, 'id'>;
};

// Define schema version 1
db.version(1).stores({
    // Questionnaires: indexed by id, code, [code+version], and cachedAt
    questionnaires: 'id, code, [code+version], cachedAt',

    // Submissions: indexed by localId (primary), id (server ID), questionnaireId, institutionId, synced, and createdAt
    submissions: 'localId, id, questionnaireId, institutionId, synced, createdAt',

    // Files: indexed by id (primary), submissionLocalId, and synced
    files: 'id, submissionLocalId, synced',

    // Sync Queue: auto-increment id (primary), indexed by type, itemId, priority, and createdAt
    syncQueue: '++id, type, itemId, priority, createdAt',
});

export { db };
