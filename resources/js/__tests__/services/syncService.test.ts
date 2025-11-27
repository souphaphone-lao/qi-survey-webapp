import { syncService, SyncService } from '@/services/syncService';
import { mergeService } from '@/services/mergeService';
import { db } from '@/db/db';
import { submissionsApi } from '@/services/api';

// Mock dependencies
jest.mock('@/services/mergeService');
jest.mock('@/services/api');

const mockMergeService = mergeService as jest.Mocked<typeof mergeService>;
const mockSubmissionsApi = submissionsApi as jest.Mocked<typeof submissionsApi>;

describe('SyncService', () => {
    beforeEach(async () => {
        // Reset database
        await db.delete();
        await db.open();

        // Reset mocks
        jest.clearAllMocks();
    });

    afterEach(async () => {
        await db.delete();
    });

    describe('sync()', () => {
        it('does nothing when sync queue is empty', async () => {
            const listener = jest.fn();
            syncService.onChange(listener);

            await syncService.sync();

            expect(listener).toHaveBeenCalledWith({
                syncing: false,
                completed: 0,
                total: 0,
            });

            expect(mockSubmissionsApi.create).not.toHaveBeenCalled();
            expect(mockSubmissionsApi.update).not.toHaveBeenCalled();
        });

        it('syncs new submission to server', async () => {
            // Add submission to IndexedDB
            await db.submissions.add({
                localId: 'local-123',
                questionnaireId: 1,
                institutionId: 5,
                status: 'draft',
                answersJson: { question1: 'answer1' },
                synced: false,
                modifiedQuestions: ['question1'],
                createdAt: new Date(),
                updatedAt: new Date(),
            });

            // Add to sync queue
            await db.syncQueue.add({
                type: 'submission',
                itemId: 'local-123',
                priority: 2,
                attempts: 0,
                createdAt: new Date(),
            });

            // Mock API response
            mockSubmissionsApi.create.mockResolvedValue({
                id: 456,
                questionnaire_id: 1,
                institution_id: 5,
                status: 'draft',
                answers_json: { question1: 'answer1' },
                submitted_at: null,
                approved_at: null,
                rejected_at: null,
                rejection_comments: null,
                can_be_edited: true,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            });

            await syncService.sync();

            // Verify API was called
            expect(mockSubmissionsApi.create).toHaveBeenCalledWith(1, {
                answers_json: { question1: 'answer1' },
                status: 'draft',
            });

            // Verify submission marked as synced
            const submission = await db.submissions.get('local-123');
            expect(submission?.synced).toBe(true);
            expect(submission?.id).toBe(456);
            expect(submission?.syncedAt).toBeDefined();

            // Verify sync queue cleared
            const queueItems = await db.syncQueue.toArray();
            expect(queueItems).toHaveLength(0);
        });

        it('updates existing submission on server', async () => {
            // Add submission to IndexedDB (with server ID)
            await db.submissions.add({
                localId: 'local-123',
                id: 456, // Has server ID
                questionnaireId: 1,
                institutionId: 5,
                status: 'draft',
                answersJson: { question1: 'updated answer' },
                synced: false,
                modifiedQuestions: ['question1'],
                createdAt: new Date('2025-01-15'),
                updatedAt: new Date('2025-01-20'),
            });

            // Add to sync queue
            await db.syncQueue.add({
                type: 'submission',
                itemId: 'local-123',
                priority: 2,
                attempts: 0,
                createdAt: new Date(),
            });

            // Mock merge service
            mockMergeService.mergeSubmission.mockResolvedValue({
                mergedAnswers: { question1: 'updated answer', question2: 'server value' },
                conflicts: [],
                serverNewer: false,
            });

            // Mock API response
            mockSubmissionsApi.update.mockResolvedValue({
                id: 456,
                questionnaire_id: 1,
                institution_id: 5,
                status: 'draft',
                answers_json: { question1: 'updated answer', question2: 'server value' },
                submitted_at: null,
                approved_at: null,
                rejected_at: null,
                rejection_comments: null,
                can_be_edited: true,
                created_at: '2025-01-15',
                updated_at: '2025-01-20',
            });

            await syncService.sync();

            // Verify merge was called
            expect(mockMergeService.mergeSubmission).toHaveBeenCalled();

            // Verify API was called with merged data
            expect(mockSubmissionsApi.update).toHaveBeenCalledWith(456, {
                answers_json: { question1: 'updated answer', question2: 'server value' },
                status: 'draft',
            });

            // Verify submission marked as synced
            const submission = await db.submissions.get('local-123');
            expect(submission?.synced).toBe(true);
            expect(submission?.syncedAt).toBeDefined();
        });

        it('handles sync failures with retry tracking', async () => {
            // Add submission to IndexedDB
            await db.submissions.add({
                localId: 'local-123',
                questionnaireId: 1,
                institutionId: 5,
                status: 'draft',
                answersJson: { question1: 'answer1' },
                synced: false,
                modifiedQuestions: ['question1'],
                createdAt: new Date(),
                updatedAt: new Date(),
            });

            // Add to sync queue
            const queueItemId = await db.syncQueue.add({
                type: 'submission',
                itemId: 'local-123',
                priority: 2,
                attempts: 0,
                createdAt: new Date(),
            });

            // Mock API error
            mockSubmissionsApi.create.mockRejectedValue(new Error('Network error'));

            await syncService.sync();

            // Verify sync queue item still exists with incremented attempts
            const queueItem = await db.syncQueue.get(queueItemId);
            expect(queueItem?.attempts).toBe(1);
            expect(queueItem?.error).toBe('Network error');
            expect(queueItem?.lastAttemptAt).toBeDefined();

            // Verify submission not marked as synced
            const submission = await db.submissions.get('local-123');
            expect(submission?.synced).toBe(false);
        });

        it('processes sync queue in priority order', async () => {
            // Add high priority item
            await db.submissions.add({
                localId: 'high-priority',
                questionnaireId: 1,
                institutionId: 5,
                status: 'submitted', // submitted = high priority
                answersJson: { question1: 'answer1' },
                synced: false,
                modifiedQuestions: ['question1'],
                createdAt: new Date(),
                updatedAt: new Date(),
            });

            await db.syncQueue.add({
                type: 'submission',
                itemId: 'high-priority',
                priority: 1, // High priority
                attempts: 0,
                createdAt: new Date(),
            });

            // Add normal priority item
            await db.submissions.add({
                localId: 'normal-priority',
                questionnaireId: 2,
                institutionId: 5,
                status: 'draft',
                answersJson: { question1: 'answer1' },
                synced: false,
                modifiedQuestions: ['question1'],
                createdAt: new Date(),
                updatedAt: new Date(),
            });

            await db.syncQueue.add({
                type: 'submission',
                itemId: 'normal-priority',
                priority: 2, // Normal priority
                attempts: 0,
                createdAt: new Date(),
            });

            const syncOrder: string[] = [];

            mockSubmissionsApi.create.mockImplementation(async (questionnaireId: number) => {
                syncOrder.push(questionnaireId === 1 ? 'high-priority' : 'normal-priority');
                return {
                    id: questionnaireId,
                    questionnaire_id: questionnaireId,
                    institution_id: 5,
                    status: 'draft',
                    answers_json: {},
                    submitted_at: null,
                    approved_at: null,
                    rejected_at: null,
                    rejection_comments: null,
                    can_be_edited: true,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                };
            });

            await syncService.sync();

            // Verify high priority processed first
            expect(syncOrder).toEqual(['high-priority', 'normal-priority']);
        });

        it('emits progress events during sync', async () => {
            // Add 3 submissions
            for (let i = 1; i <= 3; i++) {
                await db.submissions.add({
                    localId: `local-${i}`,
                    questionnaireId: i,
                    institutionId: 5,
                    status: 'draft',
                    answersJson: { question1: 'answer1' },
                    synced: false,
                    modifiedQuestions: ['question1'],
                    createdAt: new Date(),
                    updatedAt: new Date(),
                });

                await db.syncQueue.add({
                    type: 'submission',
                    itemId: `local-${i}`,
                    priority: 2,
                    attempts: 0,
                    createdAt: new Date(),
                });
            }

            const progressEvents: any[] = [];
            const unsubscribe = syncService.onChange((status) => {
                progressEvents.push(status);
            });

            mockSubmissionsApi.create.mockResolvedValue({
                id: 1,
                questionnaire_id: 1,
                institution_id: 5,
                status: 'draft',
                answers_json: {},
                submitted_at: null,
                approved_at: null,
                rejected_at: null,
                rejection_comments: null,
                can_be_edited: true,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            });

            await syncService.sync();

            unsubscribe();

            // Verify we got progress events
            expect(progressEvents.length).toBeGreaterThan(0);

            // Check start event
            expect(progressEvents[0]).toMatchObject({
                syncing: true,
                completed: 0,
                total: 3,
            });

            // Check end event
            expect(progressEvents[progressEvents.length - 1]).toMatchObject({
                syncing: false,
                completed: 3,
                total: 3,
            });
        });
    });

    describe('getQueueStatus()', () => {
        it('returns queue statistics', async () => {
            // Add pending item
            await db.syncQueue.add({
                type: 'submission',
                itemId: 'pending',
                priority: 2,
                attempts: 0,
                createdAt: new Date(),
            });

            // Add failed item (max retries reached)
            await db.syncQueue.add({
                type: 'submission',
                itemId: 'failed',
                priority: 2,
                attempts: 5,
                createdAt: new Date(),
                error: 'Max retries reached',
            });

            const status = await syncService.getQueueStatus();

            expect(status).toEqual({
                pending: 1,
                failed: 1,
                total: 2,
            });
        });
    });

    describe('clearFailedItems()', () => {
        it('removes failed items from queue', async () => {
            // Add failed items
            await db.syncQueue.add({
                type: 'submission',
                itemId: 'failed-1',
                priority: 2,
                attempts: 5,
                createdAt: new Date(),
            });

            await db.syncQueue.add({
                type: 'submission',
                itemId: 'failed-2',
                priority: 2,
                attempts: 6,
                createdAt: new Date(),
            });

            // Add pending item
            await db.syncQueue.add({
                type: 'submission',
                itemId: 'pending',
                priority: 2,
                attempts: 1,
                createdAt: new Date(),
            });

            const count = await syncService.clearFailedItems();

            expect(count).toBe(2);

            // Verify only pending item remains
            const remaining = await db.syncQueue.toArray();
            expect(remaining).toHaveLength(1);
            expect(remaining[0].itemId).toBe('pending');
        });
    });
});
