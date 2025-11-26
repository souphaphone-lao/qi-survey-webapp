import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { submissionsApi } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';
import type { Submission } from '@/types';

interface SubmissionActionsProps {
    submission: Submission;
    onUpdate?: () => void;
}

export default function SubmissionActions({ submission, onUpdate }: SubmissionActionsProps) {
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const [showRejectModal, setShowRejectModal] = useState(false);
    const [rejectComments, setRejectComments] = useState('');
    const [rejectError, setRejectError] = useState('');

    // Check permissions
    const canSubmit =
        submission.status === 'draft' && submission.created_by?.id === user?.id;
    const canApprove =
        submission.status === 'submitted' && user?.permissions?.includes('submissions.approve');
    const canReject = canApprove;

    // Submit mutation
    const submitMutation = useMutation({
        mutationFn: () => submissionsApi.submit(submission.id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['submissions'] });
            if (onUpdate) onUpdate();
        },
    });

    // Approve mutation
    const approveMutation = useMutation({
        mutationFn: () => submissionsApi.approve(submission.id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['submissions'] });
            if (onUpdate) onUpdate();
        },
    });

    // Reject mutation
    const rejectMutation = useMutation({
        mutationFn: (comments: string) => submissionsApi.reject(submission.id, comments),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['submissions'] });
            setShowRejectModal(false);
            setRejectComments('');
            setRejectError('');
            if (onUpdate) onUpdate();
        },
    });

    const handleRejectClick = () => {
        setShowRejectModal(true);
        setRejectComments('');
        setRejectError('');
    };

    const handleRejectConfirm = () => {
        if (rejectComments.trim().length < 10) {
            setRejectError('Rejection comments must be at least 10 characters');
            return;
        }

        rejectMutation.mutate(rejectComments);
    };

    // Don't show actions if none are available
    if (!canSubmit && !canApprove && !canReject) {
        return null;
    }

    return (
        <>
            <div className="flex flex-wrap gap-2">
                {canSubmit && (
                    <button
                        onClick={() => submitMutation.mutate()}
                        disabled={submitMutation.isPending}
                        className="inline-flex items-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {submitMutation.isPending ? (
                            <>
                                <svg
                                    className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                >
                                    <circle
                                        className="opacity-25"
                                        cx="12"
                                        cy="12"
                                        r="10"
                                        stroke="currentColor"
                                        strokeWidth="4"
                                    />
                                    <path
                                        className="opacity-75"
                                        fill="currentColor"
                                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                    />
                                </svg>
                                Submitting...
                            </>
                        ) : (
                            'Submit for Review'
                        )}
                    </button>
                )}

                {canApprove && (
                    <button
                        onClick={() => approveMutation.mutate()}
                        disabled={approveMutation.isPending}
                        className="inline-flex items-center rounded-md bg-green-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-green-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {approveMutation.isPending ? (
                            <>
                                <svg
                                    className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                >
                                    <circle
                                        className="opacity-25"
                                        cx="12"
                                        cy="12"
                                        r="10"
                                        stroke="currentColor"
                                        strokeWidth="4"
                                    />
                                    <path
                                        className="opacity-75"
                                        fill="currentColor"
                                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                    />
                                </svg>
                                Approving...
                            </>
                        ) : (
                            <>
                                <svg
                                    className="-ml-1 mr-2 h-4 w-4"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    strokeWidth="2"
                                    stroke="currentColor"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                                    />
                                </svg>
                                Approve
                            </>
                        )}
                    </button>
                )}

                {canReject && (
                    <button
                        onClick={handleRejectClick}
                        disabled={rejectMutation.isPending}
                        className="inline-flex items-center rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <svg
                            className="-ml-1 mr-2 h-4 w-4"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth="2"
                            stroke="currentColor"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                        </svg>
                        Reject
                    </button>
                )}
            </div>

            {/* Reject Modal */}
            {showRejectModal && (
                <div className="fixed inset-0 z-50 overflow-y-auto">
                    <div className="flex min-h-screen items-center justify-center px-4 pt-4 pb-20 text-center sm:block sm:p-0">
                        {/* Backdrop */}
                        <div
                            className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
                            onClick={() => !rejectMutation.isPending && setShowRejectModal(false)}
                        />

                        {/* Modal */}
                        <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
                            <div>
                                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                                    <svg
                                        className="h-6 w-6 text-red-600"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        strokeWidth="1.5"
                                        stroke="currentColor"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
                                        />
                                    </svg>
                                </div>
                                <div className="mt-3 text-center sm:mt-5">
                                    <h3 className="text-lg font-semibold leading-6 text-gray-900">
                                        Reject Submission
                                    </h3>
                                    <div className="mt-4">
                                        <label
                                            htmlFor="rejection-comments"
                                            className="block text-left text-sm font-medium text-gray-700 mb-2"
                                        >
                                            Please explain why this submission is being rejected
                                            <span className="text-red-500"> *</span>
                                        </label>
                                        <textarea
                                            id="rejection-comments"
                                            rows={4}
                                            value={rejectComments}
                                            onChange={(e) => {
                                                setRejectComments(e.target.value);
                                                setRejectError('');
                                            }}
                                            placeholder="Minimum 10 characters required..."
                                            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                                            disabled={rejectMutation.isPending}
                                        />
                                        {rejectError && (
                                            <p className="mt-1 text-sm text-red-600">{rejectError}</p>
                                        )}
                                        <p className="mt-1 text-xs text-gray-500 text-left">
                                            {rejectComments.length} / 1000 characters
                                        </p>
                                    </div>
                                </div>
                            </div>
                            <div className="mt-5 sm:mt-6 sm:grid sm:grid-flow-row-dense sm:grid-cols-2 sm:gap-3">
                                <button
                                    type="button"
                                    onClick={handleRejectConfirm}
                                    disabled={rejectComments.trim().length < 10 || rejectMutation.isPending}
                                    className="inline-flex w-full justify-center rounded-md bg-red-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 disabled:opacity-50 disabled:cursor-not-allowed sm:col-start-2"
                                >
                                    {rejectMutation.isPending ? 'Rejecting...' : 'Confirm Rejection'}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setShowRejectModal(false)}
                                    disabled={rejectMutation.isPending}
                                    className="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed sm:col-start-1 sm:mt-0"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
