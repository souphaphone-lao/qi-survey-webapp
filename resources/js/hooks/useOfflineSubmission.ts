import { useState, useEffect, useCallback, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { db } from '@/db/db';
import { useOnlineStatus } from './useOnlineStatus';
import { useAuth } from '@/contexts/AuthContext';
import type { OfflineSubmission } from '@/db/schema';

interface UseOfflineSubmissionOptions {
    questionnaireId: number;
    existingSubmissionId?: number;
    initialAnswers?: Record<string, unknown>;
}

interface UseOfflineSubmissionReturn {
    localId: string;
    answers: Record<string, unknown>;
    modifiedQuestions: string[];
    updateAnswer: (questionName: string, value: unknown) => void;
    setAnswers: (answers: Record<string, unknown>) => void;
    saveSubmission: (status?: 'draft' | 'submitted') => Promise<{ localId: string; saved: 'locally' | 'server' }>;
    saving: boolean;
    savedLocally: boolean;
    lastSavedAt: Date | null;
    error: string | null;
}

/**
 * Hook for managing submissions with offline support.
 *
 * Features:
 * - Auto-saves to IndexedDB every 30 seconds when offline
 * - Tracks which questions have been modified for conflict resolution
 * - Adds submissions to sync queue for later upload
 * - Seamlessly works online and offline
 *
 * @param options - Configuration options
 * @returns Submission management functions and state
 */
export function useOfflineSubmission({
    questionnaireId,
    existingSubmissionId,
    initialAnswers = {},
}: UseOfflineSubmissionOptions): UseOfflineSubmissionReturn {
    const { isOnline } = useOnlineStatus();
    const { user } = useAuth();

    // Generate or use existing local ID
    const [localId] = useState(() => {
        // If editing existing submission, use its ID as localId (for now)
        // When we load from IndexedDB, we'll use the stored localId
        return existingSubmissionId ? `server-${existingSubmissionId}` : uuidv4();
    });

    const [answers, setAnswersState] = useState<Record<string, unknown>>(initialAnswers);
    const [modifiedQuestions, setModifiedQuestions] = useState<string[]>([]);
    const [saving, setSaving] = useState(false);
    const [savedLocally, setSavedLocally] = useState(false);
    const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Use ref to track auto-save timer
    const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
    const answersRef = useRef(answers);
    answersRef.current = answers;

    // Load existing offline submission on mount
    useEffect(() => {
        const loadOfflineSubmission = async () => {
            try {
                const existingOfflineSubmission = await db.submissions.get(localId);
                if (existingOfflineSubmission) {
                    setAnswersState(existingOfflineSubmission.answersJson);
                    setModifiedQuestions(existingOfflineSubmission.modifiedQuestions);
                    setSavedLocally(!existingOfflineSubmission.synced);
                    setLastSavedAt(existingOfflineSubmission.updatedAt);
                }
            } catch (err) {
                console.error('Failed to load offline submission:', err);
            }
        };

        loadOfflineSubmission();
    }, [localId]);

    // Auto-save to IndexedDB every 30 seconds when offline
    useEffect(() => {
        if (!isOnline && Object.keys(answersRef.current).length > 0) {
            // Clear existing timer
            if (autoSaveTimerRef.current) {
                clearInterval(autoSaveTimerRef.current);
            }

            // Set up auto-save every 30 seconds
            autoSaveTimerRef.current = setInterval(() => {
                saveToIndexedDB('draft');
            }, 30000); // 30 seconds

            return () => {
                if (autoSaveTimerRef.current) {
                    clearInterval(autoSaveTimerRef.current);
                }
            };
        }
    }, [isOnline]);

    /**
     * Save submission to IndexedDB
     */
    const saveToIndexedDB = useCallback(async (status: 'draft' | 'submitted' = 'draft') => {
        if (!user?.institution_id) {
            setError('User institution not found');
            return;
        }

        setSaving(true);
        setError(null);

        try {
            const now = new Date();
            const submission: OfflineSubmission = {
                localId,
                id: existingSubmissionId,
                questionnaireId,
                institutionId: user.institution_id,
                status,
                answersJson: answersRef.current,
                synced: false,
                modifiedQuestions,
                createdAt: lastSavedAt || now,
                updatedAt: now,
            };

            await db.submissions.put(submission);

            // Add to sync queue if not already there
            const existingQueueItem = await db.syncQueue
                .where('itemId')
                .equals(localId)
                .first();

            if (!existingQueueItem) {
                await db.syncQueue.add({
                    type: 'submission',
                    itemId: localId,
                    priority: status === 'submitted' ? 1 : 2, // High priority for submitted, normal for draft
                    attempts: 0,
                    createdAt: now,
                });
            }

            setSavedLocally(true);
            setLastSavedAt(now);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to save to IndexedDB';
            console.error('Failed to save to IndexedDB:', err);
            setError(errorMessage);
            throw err;
        } finally {
            setSaving(false);
        }
    }, [localId, questionnaireId, existingSubmissionId, modifiedQuestions, user, lastSavedAt]);

    /**
     * Update a single answer and track modification
     */
    const updateAnswer = useCallback((questionName: string, value: unknown) => {
        setAnswersState(prev => ({ ...prev, [questionName]: value }));
        setModifiedQuestions(prev =>
            prev.includes(questionName) ? prev : [...prev, questionName]
        );
        setError(null);
    }, []);

    /**
     * Set all answers at once (for initial load or bulk updates)
     */
    const setAnswers = useCallback((newAnswers: Record<string, unknown>) => {
        setAnswersState(newAnswers);
        // Track all question names as modified
        setModifiedQuestions(Object.keys(newAnswers));
        setError(null);
    }, []);

    /**
     * Save submission (either to server if online, or to IndexedDB if offline)
     */
    const saveSubmission = useCallback(async (status: 'draft' | 'submitted' = 'draft') => {
        if (!isOnline) {
            // Save to IndexedDB when offline
            await saveToIndexedDB(status);
            return { localId, saved: 'locally' as const };
        }

        // When online, save to server (handled by parent component)
        // This hook primarily handles offline scenarios
        // The parent component will use mutations to save to server
        return { localId, saved: 'server' as const };
    }, [isOnline, localId, saveToIndexedDB]);

    return {
        localId,
        answers,
        modifiedQuestions,
        updateAnswer,
        setAnswers,
        saveSubmission,
        saving,
        savedLocally,
        lastSavedAt,
        error,
    };
}
