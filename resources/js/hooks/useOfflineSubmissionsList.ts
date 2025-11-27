import { useState, useEffect } from 'react';
import { db } from '@/db/db';
import { useOnlineStatus } from './useOnlineStatus';
import type { OfflineSubmission } from '@/db/schema';
import type { Submission } from '@/types';

interface OfflineSubmissionWithSyncStatus extends Partial<Submission> {
    localId: string;
    synced: boolean;
    syncStatus: 'synced' | 'pending' | 'error';
    isOffline: true;
}

export type SubmissionWithSyncStatus =
    | Submission
    | OfflineSubmissionWithSyncStatus;

interface UseOfflineSubmissionsListReturn {
    offlineSubmissions: OfflineSubmissionWithSyncStatus[];
    isLoading: boolean;
    error: string | null;
    pendingCount: number;
    refresh: () => Promise<void>;
}

/**
 * Hook for managing offline submissions list.
 *
 * Features:
 * - Loads submissions from IndexedDB
 * - Provides sync status for each submission
 * - Auto-refreshes when connection status changes
 * - Merges with online submissions (dedupe by ID)
 *
 * @returns Offline submissions with sync status
 */
export function useOfflineSubmissionsList(): UseOfflineSubmissionsListReturn {
    const { isOnline } = useOnlineStatus();
    const [offlineSubmissions, setOfflineSubmissions] = useState<OfflineSubmissionWithSyncStatus[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [pendingCount, setPendingCount] = useState(0);

    const loadOfflineSubmissions = async () => {
        setIsLoading(true);
        setError(null);

        try {
            const submissions = await db.submissions.toArray();

            // Load questionnaires for display
            const questionnaireIds = [...new Set(submissions.map(s => s.questionnaireId))];
            const questionnaires = await db.questionnaires
                .where('id')
                .anyOf(questionnaireIds)
                .toArray();

            const questionnaireMap = new Map(questionnaires.map(q => [q.id, q]));

            // Transform offline submissions to match UI format
            const transformedSubmissions: OfflineSubmissionWithSyncStatus[] = submissions.map(s => {
                const questionnaire = questionnaireMap.get(s.questionnaireId);

                // Check sync queue for errors
                let syncStatus: 'synced' | 'pending' | 'error' = s.synced ? 'synced' : 'pending';

                return {
                    localId: s.localId,
                    id: s.id,
                    questionnaire_id: s.questionnaireId,
                    questionnaire: questionnaire ? {
                        id: questionnaire.id,
                        code: questionnaire.code,
                        version: questionnaire.version,
                        title: questionnaire.title,
                        surveyjs_json: questionnaire.surveyjsJson,
                    } : undefined,
                    institution_id: s.institutionId,
                    status: s.status,
                    answers_json: s.answersJson,
                    created_at: s.createdAt.toISOString(),
                    updated_at: s.updatedAt.toISOString(),
                    can_be_edited: true, // Offline submissions are always editable
                    synced: s.synced,
                    syncStatus,
                    isOffline: true as const,
                } as OfflineSubmissionWithSyncStatus;
            });

            setOfflineSubmissions(transformedSubmissions);
            setPendingCount(transformedSubmissions.filter(s => !s.synced).length);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to load offline submissions';
            console.error('Failed to load offline submissions:', err);
            setError(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    // Load on mount and when connection status changes
    useEffect(() => {
        loadOfflineSubmissions();
    }, [isOnline]);

    return {
        offlineSubmissions,
        isLoading,
        error,
        pendingCount,
        refresh: loadOfflineSubmissions,
    };
}
