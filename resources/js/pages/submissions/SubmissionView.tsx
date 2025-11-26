import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Model } from 'survey-core';
import { Survey } from 'survey-react-ui';
import 'survey-core/defaultV2.min.css';
import { submissionsApi } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';

export default function SubmissionView() {
    const { id } = useParams();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { hasPermission } = useAuth();

    const [surveyModel, setSurveyModel] = useState<Model | null>(null);
    const [rejectModal, setRejectModal] = useState(false);
    const [rejectComment, setRejectComment] = useState('');
    const [error, setError] = useState('');

    const { data: submission, isLoading } = useQuery({
        queryKey: ['submission', id],
        queryFn: () => submissionsApi.get(Number(id)),
    });

    useEffect(() => {
        if (submission?.questionnaire?.surveyjs_json) {
            const model = new Model(submission.questionnaire.surveyjs_json);
            model.data = submission.answers_json || {};
            model.mode = 'display';
            setSurveyModel(model);
        }
    }, [submission]);

    const approveMutation = useMutation({
        mutationFn: () => submissionsApi.approve(Number(id)),
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['submission', id] }); },
        onError: (err: unknown) => { setError((err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Error'); },
    });

    const rejectMutation = useMutation({
        mutationFn: () => submissionsApi.reject(Number(id), rejectComment),
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['submission', id] }); setRejectModal(false); },
        onError: (err: unknown) => { setError((err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Error'); },
    });

    if (isLoading) return <div className="text-gray-500">Loading...</div>;
    if (!submission) return <div className="text-red-500">Submission not found</div>;

    const statusColors: Record<string, string> = { draft: 'bg-yellow-100 text-yellow-800', submitted: 'bg-blue-100 text-blue-800', approved: 'bg-green-100 text-green-800', rejected: 'bg-red-100 text-red-800' };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-gray-900">Submission Details</h1>
                <span className={`inline-flex rounded-full px-3 py-1 text-sm font-semibold ${statusColors[submission.status]}`}>{submission.status.charAt(0).toUpperCase() + submission.status.slice(1)}</span>
            </div>

            {error && <div className="rounded-md bg-red-50 p-4 text-sm text-red-700">{error}</div>}

            <div className="rounded-lg bg-white p-6 shadow">
                <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div><dt className="text-sm font-medium text-gray-500">Questionnaire</dt><dd className="mt-1 text-sm text-gray-900">{submission.questionnaire?.title}</dd></div>
                    <div><dt className="text-sm font-medium text-gray-500">Institution</dt><dd className="mt-1 text-sm text-gray-900">{submission.institution?.name}</dd></div>
                    <div><dt className="text-sm font-medium text-gray-500">Created By</dt><dd className="mt-1 text-sm text-gray-900">{submission.created_by?.name}</dd></div>
                    <div><dt className="text-sm font-medium text-gray-500">Created At</dt><dd className="mt-1 text-sm text-gray-900">{new Date(submission.created_at).toLocaleString()}</dd></div>
                    {submission.submitted_at && <div><dt className="text-sm font-medium text-gray-500">Submitted At</dt><dd className="mt-1 text-sm text-gray-900">{new Date(submission.submitted_at).toLocaleString()}</dd></div>}
                    {submission.approved_at && <div><dt className="text-sm font-medium text-gray-500">Approved By</dt><dd className="mt-1 text-sm text-gray-900">{submission.approved_by?.name} on {new Date(submission.approved_at).toLocaleString()}</dd></div>}
                    {submission.rejected_at && <div className="sm:col-span-2"><dt className="text-sm font-medium text-gray-500">Rejected By</dt><dd className="mt-1 text-sm text-gray-900">{submission.rejected_by?.name} on {new Date(submission.rejected_at).toLocaleString()}</dd><dt className="mt-2 text-sm font-medium text-gray-500">Rejection Comments</dt><dd className="mt-1 text-sm text-red-600">{submission.rejection_comments}</dd></div>}
                </dl>
            </div>

            {surveyModel && <div className="rounded-lg bg-white p-6 shadow"><Survey model={surveyModel} /></div>}

            <div className="flex justify-end space-x-3">
                <button onClick={() => navigate('/submissions')} className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">Back</button>
                {submission.can_be_edited && hasPermission('submissions.update') && <button onClick={() => navigate(`/submissions/${id}/edit`)} className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500">Edit</button>}
                {submission.status === 'submitted' && hasPermission('submissions.approve') && (<>
                    <button onClick={() => approveMutation.mutate()} disabled={approveMutation.isPending} className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-500 disabled:opacity-50">{approveMutation.isPending ? 'Approving...' : 'Approve'}</button>
                    <button onClick={() => setRejectModal(true)} className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-500">Reject</button>
                </>)}
            </div>

            {rejectModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
                    <div className="rounded-lg bg-white p-6 shadow-xl w-full max-w-md">
                        <h3 className="text-lg font-medium text-gray-900 mb-4">Reject Submission</h3>
                        <textarea value={rejectComment} onChange={(e) => setRejectComment(e.target.value)} rows={4} placeholder="Enter rejection comments..." className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" />
                        <div className="mt-4 flex justify-end space-x-3">
                            <button onClick={() => setRejectModal(false)} className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
                            <button onClick={() => rejectMutation.mutate()} disabled={rejectMutation.isPending || !rejectComment.trim()} className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-500 disabled:opacity-50">{rejectMutation.isPending ? 'Rejecting...' : 'Reject'}</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
