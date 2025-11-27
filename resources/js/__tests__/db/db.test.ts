/**
 * IndexedDB Setup Tests
 *
 * Tests the Dexie database instance and schema configuration.
 */

import { db } from '@/db/db';
import type { OfflineSubmission, CachedQuestionnaire, OfflineFile, SyncQueueItem } from '@/db/schema';

describe('IndexedDB Setup', () => {
    beforeEach(async () => {
        // Ensure database is open before each test
        if (!db.isOpen()) {
            await db.open();
        }
    });

    afterEach(async () => {
        // Clean up: delete and recreate database after each test
        await db.delete();
    });

    afterAll(async () => {
        // Final cleanup
        await db.delete();
    });

    it('creates database successfully', async () => {
        expect(db.isOpen()).toBe(true);
        expect(db.name).toBe('SurveyAppDB');
    });

    it('has correct table names', () => {
        const tables = db.tables.map(t => t.name);
        expect(tables).toContain('questionnaires');
        expect(tables).toContain('submissions');
        expect(tables).toContain('files');
        expect(tables).toContain('syncQueue');
    });

    describe('Submissions table', () => {
        it('can insert and retrieve submission', async () => {
            const submission: OfflineSubmission = {
                localId: 'test-uuid-1',
                questionnaireId: 1,
                institutionId: 1,
                status: 'draft',
                answersJson: { q1: 'answer1', q2: 'answer2' },
                synced: false,
                createdAt: new Date(),
                updatedAt: new Date(),
                modifiedQuestions: ['q1'],
            };

            await db.submissions.add(submission);

            const retrieved = await db.submissions.get('test-uuid-1');
            expect(retrieved).toBeDefined();
            expect(retrieved?.localId).toBe('test-uuid-1');
            expect(retrieved?.answersJson).toEqual({ q1: 'answer1', q2: 'answer2' });
            expect(retrieved?.synced).toBe(false);
        });

        it('can update submission', async () => {
            const submission: OfflineSubmission = {
                localId: 'test-uuid-2',
                questionnaireId: 1,
                institutionId: 1,
                status: 'draft',
                answersJson: { q1: 'answer1' },
                synced: false,
                createdAt: new Date(),
                updatedAt: new Date(),
                modifiedQuestions: ['q1'],
            };

            await db.submissions.add(submission);

            await db.submissions.update('test-uuid-2', {
                answersJson: { q1: 'updated answer' },
                synced: true,
                modifiedQuestions: ['q1'],
            });

            const retrieved = await db.submissions.get('test-uuid-2');
            expect(retrieved?.answersJson).toEqual({ q1: 'updated answer' });
            expect(retrieved?.synced).toBe(true);
        });

        it('can query unsynced submissions', async () => {
            await db.submissions.bulkAdd([
                {
                    localId: 'uuid-1',
                    questionnaireId: 1,
                    institutionId: 1,
                    status: 'draft',
                    answersJson: {},
                    synced: false,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    modifiedQuestions: [],
                },
                {
                    localId: 'uuid-2',
                    questionnaireId: 1,
                    institutionId: 1,
                    status: 'draft',
                    answersJson: {},
                    synced: true,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    modifiedQuestions: [],
                },
                {
                    localId: 'uuid-3',
                    questionnaireId: 1,
                    institutionId: 1,
                    status: 'draft',
                    answersJson: {},
                    synced: false,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    modifiedQuestions: [],
                },
            ]);

            // Filter approach (works with fake-indexeddb)
            const all = await db.submissions.toArray();
            const unsynced = all.filter(s => !s.synced);
            expect(unsynced).toHaveLength(2);
        });
    });

    describe('Questionnaires table', () => {
        it('can cache questionnaire', async () => {
            const questionnaire: CachedQuestionnaire = {
                id: 1,
                code: 'SURVEY-1',
                version: 1,
                title: 'Test Survey',
                surveyjs_json: { pages: [] },
                permissions: [],
                cachedAt: new Date(),
            };

            await db.questionnaires.add(questionnaire);

            const retrieved = await db.questionnaires.get(1);
            expect(retrieved).toBeDefined();
            expect(retrieved?.code).toBe('SURVEY-1');
        });

        it('can query by code and version', async () => {
            await db.questionnaires.bulkAdd([
                {
                    id: 1,
                    code: 'SURVEY-1',
                    version: 1,
                    title: 'Test Survey v1',
                    surveyjs_json: {},
                    permissions: [],
                    cachedAt: new Date(),
                },
                {
                    id: 2,
                    code: 'SURVEY-1',
                    version: 2,
                    title: 'Test Survey v2',
                    surveyjs_json: {},
                    permissions: [],
                    cachedAt: new Date(),
                },
            ]);

            const results = await db.questionnaires.where('[code+version]').equals(['SURVEY-1', 2]).toArray();
            expect(results).toHaveLength(1);
            expect(results[0].version).toBe(2);
        });
    });

    describe('Files table', () => {
        it('can store file metadata', async () => {
            const file: OfflineFile = {
                id: 'file-uuid-1',
                submissionLocalId: 'submission-uuid-1',
                questionName: 'photo',
                fileName: 'test.jpg',
                fileType: 'image/jpeg',
                fileSize: 1024,
                blob: new Blob(['test'], { type: 'image/jpeg' }),
                synced: false,
                createdAt: new Date(),
            };

            await db.files.add(file);

            const retrieved = await db.files.get('file-uuid-1');
            expect(retrieved).toBeDefined();
            expect(retrieved?.fileName).toBe('test.jpg');
            expect(retrieved?.synced).toBe(false);
        });

        it('can query files by submission', async () => {
            await db.files.bulkAdd([
                {
                    id: 'file-1',
                    submissionLocalId: 'sub-1',
                    questionName: 'photo1',
                    fileName: 'img1.jpg',
                    fileType: 'image/jpeg',
                    fileSize: 1024,
                    synced: false,
                    createdAt: new Date(),
                },
                {
                    id: 'file-2',
                    submissionLocalId: 'sub-1',
                    questionName: 'photo2',
                    fileName: 'img2.jpg',
                    fileType: 'image/jpeg',
                    fileSize: 2048,
                    synced: false,
                    createdAt: new Date(),
                },
                {
                    id: 'file-3',
                    submissionLocalId: 'sub-2',
                    questionName: 'photo3',
                    fileName: 'img3.jpg',
                    fileType: 'image/jpeg',
                    fileSize: 512,
                    synced: false,
                    createdAt: new Date(),
                },
            ]);

            const filesForSub1 = await db.files.where('submissionLocalId').equals('sub-1').toArray();
            expect(filesForSub1).toHaveLength(2);
        });
    });

    describe('Sync Queue table', () => {
        it('can add items to sync queue', async () => {
            const queueItem: SyncQueueItem = {
                type: 'submission',
                itemId: 'submission-uuid-1',
                priority: 2,
                attempts: 0,
                createdAt: new Date(),
            };

            const id = await db.syncQueue.add(queueItem);
            expect(id).toBeDefined();

            const retrieved = await db.syncQueue.get(id);
            expect(retrieved).toBeDefined();
            expect(retrieved?.type).toBe('submission');
            expect(retrieved?.priority).toBe(2);
        });

        it('can query queue by priority', async () => {
            await db.syncQueue.bulkAdd([
                {
                    type: 'file',
                    itemId: 'file-1',
                    priority: 1,
                    attempts: 0,
                    createdAt: new Date(),
                },
                {
                    type: 'submission',
                    itemId: 'sub-1',
                    priority: 2,
                    attempts: 0,
                    createdAt: new Date(),
                },
                {
                    type: 'submission',
                    itemId: 'sub-2',
                    priority: 1,
                    attempts: 0,
                    createdAt: new Date(),
                },
            ]);

            const highPriority = await db.syncQueue.where('priority').equals(1).toArray();
            expect(highPriority).toHaveLength(2);
        });

        it('can process queue in priority order', async () => {
            await db.syncQueue.bulkAdd([
                {
                    type: 'submission',
                    itemId: 'sub-low',
                    priority: 3,
                    attempts: 0,
                    createdAt: new Date(),
                },
                {
                    type: 'file',
                    itemId: 'file-high',
                    priority: 1,
                    attempts: 0,
                    createdAt: new Date(),
                },
                {
                    type: 'submission',
                    itemId: 'sub-normal',
                    priority: 2,
                    attempts: 0,
                    createdAt: new Date(),
                },
            ]);

            const ordered = await db.syncQueue.orderBy('priority').toArray();
            expect(ordered[0].priority).toBe(1);
            expect(ordered[1].priority).toBe(2);
            expect(ordered[2].priority).toBe(3);
        });
    });
});
