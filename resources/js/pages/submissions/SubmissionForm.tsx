import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Model } from 'survey-core';
import { Survey } from 'survey-react-ui';
import 'survey-core/defaultV2.min.css';
import { questionnairesApi, submissionsApi } from '@/services/api';

export default function SubmissionForm() {
    const { id, questionnaireId } = useParams();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const isEditing = !!id;

    const [surveyModel, setSurveyModel] = useState<Model | null>(null);
    const [error, setError] = useState('');

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
            if (submission?.answers_json) {
                model.data = submission.answers_json;
            }

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
    }, [questionnaire, submission]);

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

    const handleSaveDraft = () => {
        if (surveyModel) {
            saveMutation.mutate(surveyModel.data);
        }
    };

    const handleSubmit = () => {
        if (surveyModel) {
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
                    disabled={saveMutation.isPending}
                    className="rounded-md border border-indigo-600 bg-white px-4 py-2 text-sm font-medium text-indigo-600 hover:bg-indigo-50 disabled:opacity-50"
                >
                    {saveMutation.isPending ? 'Saving...' : 'Save Draft'}
                </button>
                <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={submitMutation.isPending}
                    className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
                >
                    {submitMutation.isPending ? 'Submitting...' : 'Submit'}
                </button>
            </div>
        </div>
    );
}
