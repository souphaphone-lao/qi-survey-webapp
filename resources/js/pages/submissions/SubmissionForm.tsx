import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Model } from 'survey-core';
import { Survey } from 'survey-react-ui';
import 'survey-core/defaultV2.min.css';
import { questionnairesApi, submissionsApi } from '@/services/api';
import { useOfflineSubmission } from '@/hooks/useOfflineSubmission';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';

export default function SubmissionForm() {
    const { id, questionnaireId } = useParams();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const isEditing = !!id;
    const { isOnline } = useOnlineStatus();

    const [surveyModel, setSurveyModel] = useState<Model | null>(null);
    const [error, setError] = useState('');

    // Initialize offline submission hook
    const offlineSubmission = useOfflineSubmission({
        questionnaireId: Number(questionnaireId),
        existingSubmissionId: id ? Number(id) : undefined,
        initialAnswers: {},
    });

    const { data: submission, isLoading: isLoadingSubmission } = useQuery({
        queryKey: ['submission', id],
        queryFn: () => submissionsApi.get(Number(id)),
        enabled: isEditing,
    });

    const { data: questionnaire, isLoading: isLoadingQuestionnaire } = useQuery({
        queryKey: ['questionnaire', questionnaireId || submission?.questionnaire_id],
        queryFn: () => questionnairesApi.get(Number(questionnaireId || submission?.questionnaire_id)),
        enabled: !!(questionnaireId || submission?.questionnaire_id),
    });

    useEffect(() => {
        if (questionnaire?.surveyjs_json) {
            const model = new Model(questionnaire.surveyjs_json);

            // Load data from submission or offline submission
            const answersToLoad = submission?.answers_json || offlineSubmission.answers;
            if (Object.keys(answersToLoad).length > 0) {
                model.data = answersToLoad;
            }

            // Track changes for offline support
            model.onValueChanged.add((sender, options) => {
                offlineSubmission.updateAnswer(options.name, options.value);
            });

            // Apply read-only permissions for restricted questions
            if (submission?.question_permissions) {
                model.onAfterRenderQuestion.add((sender, options) => {
                    const questionName = options.question.name;
                    const canEdit = submission.question_permissions?.[questionName] ?? true;

                    if (!canEdit) {
                        // Make question read-only
                        options.question.readOnly = true;

                        // Add visual indicator (lock icon)
                        const titleElement = options.htmlElement.querySelector('.sd-question__title');
                        if (titleElement && !titleElement.querySelector('.permission-lock-icon')) {
                            const lockIcon = document.createElement('span');
                            lockIcon.className = 'permission-lock-icon ml-2 text-gray-400';
                            lockIcon.innerHTML = '🔒';
                            lockIcon.title = 'You do not have permission to edit this question';
                            titleElement.appendChild(lockIcon);
                        }

                        // Add styling to indicate read-only
                        options.htmlElement.classList.add('question-readonly');
                        options.htmlElement.style.opacity = '0.7';
                    }
                });
            }

            setSurveyModel(model);
        }
    }, [questionnaire, submission, offlineSubmission]);

    const saveMutation = useMutation({
        mutationFn: async (data: Record<string, unknown>) => {
            if (isEditing) {
                return submissionsApi.update(Number(id), { answers_json: data });
            }
            return submissionsApi.create(Number(questionnaireId), { answers_json: data });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['submissions'] });
            navigate('/submissions');
        },
        onError: (err: unknown) => {
            setError((err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'An error occurred');
        },
    });

    const submitMutation = useMutation({
        mutationFn: async (data: Record<string, unknown>) => {
            let submissionId = Number(id);
            if (!isEditing) {
                const created = await submissionsApi.create(Number(questionnaireId), { answers_json: data });
                submissionId = created.id;
            } else {
                await submissionsApi.update(submissionId, { answers_json: data });
            }
            return submissionsApi.submit(submissionId);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['submissions'] });
            navigate('/submissions');
        },
        onError: (err: unknown) => {
            setError((err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'An error occurred');
        },
    });

    const handleSaveDraft = async () => {
        if (!surveyModel) return;

        if (!isOnline) {
            // Save offline
            try {
                await offlineSubmission.saveSubmission('draft');
                setError('');
            } catch (err) {
                setError(offlineSubmission.error || 'Failed to save offline');
            }
        } else {
            // Save to server when online
            saveMutation.mutate(surveyModel.data);
        }
    };

    const handleSubmit = async () => {
        if (!surveyModel) return;

        if (!isOnline) {
            // Save for submission when back online
            try {
                await offlineSubmission.saveSubmission('submitted');
                setError('');
            } catch (err) {
                setError(offlineSubmission.error || 'Failed to save offline');
            }
        } else {
            // Submit to server when online
            submitMutation.mutate(surveyModel.data);
        }
    };

    if ((isEditing && isLoadingSubmission) || isLoadingQuestionnaire) {
        return <div className="text-gray-500">Loading...</div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-gray-900">
                    {isEditing ? 'Edit Submission' : 'New Submission'}
                    {questionnaire && ` - ${questionnaire.title}`}
                </h1>
            </div>

            {error && <div className="rounded-md bg-red-50 p-4 text-sm text-red-700">{error}</div>}

            {/* Offline Status Banner */}
            {!isOnline && (
                <div className="rounded-md bg-yellow-50 border border-yellow-200 p-4">
                    <div className="flex">
                        <div className="flex-shrink-0">
                            <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                            </svg>
                        </div>
                        <div className="ml-3">
                            <h3 className="text-sm font-medium text-yellow-800">You are offline</h3>
                            <div className="mt-2 text-sm text-yellow-700">
                                <p>Your changes are being saved locally and will sync when you reconnect.</p>
                                {offlineSubmission.lastSavedAt && (
                                    <p className="mt-1 text-xs">
                                        Last saved: {new Date(offlineSubmission.lastSavedAt).toLocaleTimeString()}
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Saved Locally Indicator */}
            {offlineSubmission.savedLocally && isOnline && (
                <div className="rounded-md bg-blue-50 border border-blue-200 p-4">
                    <div className="flex">
                        <div className="flex-shrink-0">
                            <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
                            </svg>
                        </div>
                        <div className="ml-3">
                            <h3 className="text-sm font-medium text-blue-800">Pending sync</h3>
                            <div className="mt-2 text-sm text-blue-700">
                                <p>This submission has offline changes waiting to be synced to the server.</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Rejection Comments Banner */}
            {submission?.status === 'rejected' && submission.rejection_comments && (
                <div className="rounded-lg border-l-4 border-red-400 bg-red-50 p-4">
                    <div className="flex">
                        <div className="flex-shrink-0">
                            <svg
                                className="h-5 w-5 text-red-400"
                                viewBox="0 0 20 20"
                                fill="currentColor"
                            >
                                <path
                                    fillRule="evenodd"
                                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z"
                                    clipRule="evenodd"
                                />
                            </svg>
                        </div>
                        <div className="ml-3">
                            <h3 className="text-sm font-medium text-red-800">Submission Rejected</h3>
                            <div className="mt-2 text-sm text-red-700">
                                <p>{submission.rejection_comments}</p>
                            </div>
                            <p className="mt-2 text-xs text-red-600">
                                Please address the issues above and resubmit.
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {surveyModel && (
                <div className="rounded-lg bg-white p-6 shadow">
                    <Survey model={surveyModel} />
                </div>
            )}

            <div className="flex justify-end space-x-3">
                <button
                    type="button"
                    onClick={() => navigate('/submissions')}
                    className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                    Cancel
                </button>
                <button
                    type="button"
                    onClick={handleSaveDraft}
                    disabled={offlineSubmission.saving || saveMutation.isPending}
                    className="rounded-md border border-indigo-600 bg-white px-4 py-2 text-sm font-medium text-indigo-600 hover:bg-indigo-50 disabled:opacity-50"
                >
                    {offlineSubmission.saving || saveMutation.isPending
                        ? 'Saving...'
                        : !isOnline
                        ? 'Save Locally'
                        : 'Save Draft'}
                </button>
                <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={!isOnline || submitMutation.isPending || offlineSubmission.saving}
                    className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
                    title={!isOnline ? 'You must be online to submit for review' : ''}
                >
                    {submitMutation.isPending ? 'Submitting...' : 'Submit for Review'}
                </button>
            </div>

            {/* Offline submit explanation */}
            {!isOnline && (
                <p className="text-sm text-gray-500 text-right mt-2">
                    You can save drafts offline, but must be online to submit for review.
                </p>
            )}
        </div>
    );
}
