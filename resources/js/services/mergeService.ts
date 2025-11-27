import { submissionsApi } from './api';
import type { OfflineSubmission } from '@/db/schema';
import type { Submission } from '@/types';

/**
 * Service for merging offline and online submission changes.
 *
 * Implements per-question merge strategy:
 * - Local changes to specific questions always win (last-write-wins)
 * - Unmodified questions use server values
 * - Logs conflicts for debugging
 */
export class MergeService {
    /**
     * Merge offline submission changes with latest server version.
     *
     * Algorithm:
     * 1. Fetch latest server version
     * 2. If server is newer than local cache, merge:
     *    - Start with server answers
     *    - Overwrite only locally modified questions
     * 3. If server is same/older, use local version
     *
     * @param local - Offline submission from IndexedDB
     * @param serverId - Server submission ID
     * @returns Merged answers object
     */
    async mergeSubmission(
        local: OfflineSubmission,
        serverId: number
    ): Promise<{
        mergedAnswers: Record<string, unknown>;
        conflicts: string[];
        serverNewer: boolean;
    }> {
        try {
            // Fetch latest server version
            const serverSubmission = await submissionsApi.get(serverId);

            // Compare timestamps
            const serverUpdatedAt = new Date(serverSubmission.updated_at);
            const localSyncedAt = local.syncedAt || local.createdAt;
            const serverNewer = serverUpdatedAt > localSyncedAt;

            // If server hasn't changed since we last synced, just use local
            if (!serverNewer) {
                console.log(`[MergeService] Server unchanged, using local version`);
                return {
                    mergedAnswers: local.answersJson,
                    conflicts: [],
                    serverNewer: false,
                };
            }

            // Server is newer - perform merge
            console.log(`[MergeService] Server is newer, merging changes`);
            console.log(`  Server updated: ${serverUpdatedAt.toISOString()}`);
            console.log(`  Local synced: ${localSyncedAt.toISOString()}`);

            const merged = { ...serverSubmission.answers_json };
            const conflicts: string[] = [];

            // Overwrite only questions the user modified locally
            for (const questionName of local.modifiedQuestions) {
                const localValue = local.answersJson[questionName];
                const serverValue = serverSubmission.answers_json[questionName];

                // Check if there's a conflict (both changed)
                if (
                    serverValue !== undefined &&
                    JSON.stringify(localValue) !== JSON.stringify(serverValue)
                ) {
                    conflicts.push(questionName);
                    console.log(`  Conflict on "${questionName}": local wins`);
                    console.log(`    Server value:`, serverValue);
                    console.log(`    Local value:`, localValue);
                }

                // Local always wins for modified questions
                merged[questionName] = localValue;
            }

            if (conflicts.length > 0) {
                console.log(`[MergeService] Resolved ${conflicts.length} conflict(s)`);
            }

            return {
                mergedAnswers: merged,
                conflicts,
                serverNewer: true,
            };
        } catch (error) {
            console.error('[MergeService] Failed to merge submission:', error);
            throw error;
        }
    }

    /**
     * Check if submission has potential conflicts with server.
     * Used for pre-sync conflict detection.
     *
     * @param local - Offline submission
     * @param server - Server submission
     * @returns Array of conflicting question names
     */
    detectConflicts(
        local: OfflineSubmission,
        server: Submission
    ): string[] {
        const conflicts: string[] = [];

        for (const questionName of local.modifiedQuestions) {
            const localValue = local.answersJson[questionName];
            const serverValue = server.answers_json[questionName];

            if (
                serverValue !== undefined &&
                JSON.stringify(localValue) !== JSON.stringify(serverValue)
            ) {
                conflicts.push(questionName);
            }
        }

        return conflicts;
    }

    /**
     * Get human-readable conflict summary.
     *
     * @param conflicts - Array of conflicting question names
     * @returns Formatted conflict message
     */
    getConflictSummary(conflicts: string[]): string {
        if (conflicts.length === 0) {
            return 'No conflicts';
        }

        if (conflicts.length === 1) {
            return `1 conflict resolved (question: ${conflicts[0]})`;
        }

        return `${conflicts.length} conflicts resolved (questions: ${conflicts.join(', ')})`;
    }
}

export const mergeService = new MergeService();
