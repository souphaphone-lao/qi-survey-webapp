import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { questionnairesApi } from '@/services/api';

export default function QuestionnaireForm() {
    const { id } = useParams();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const isEditing = !!id;

    const [formData, setFormData] = useState({ code: '', title: '', description: '', surveyjs_json: '', is_active: true });
    const [error, setError] = useState('');

    const { data: questionnaire, isLoading } = useQuery({ queryKey: ['questionnaire', id], queryFn: () => questionnairesApi.get(Number(id)), enabled: isEditing });

    useEffect(() => {
        if (questionnaire) {
            setFormData({ code: questionnaire.code, title: questionnaire.title, description: questionnaire.description || '', surveyjs_json: JSON.stringify(questionnaire.surveyjs_json, null, 2), is_active: questionnaire.is_active });
        }
    }, [questionnaire]);

    const mutation = useMutation({
        mutationFn: (data: typeof formData) => {
            try {
                const parsed = JSON.parse(data.surveyjs_json);
                const payload = { ...data, surveyjs_json: parsed };
                return isEditing ? questionnairesApi.update(Number(id), payload) : questionnairesApi.create(payload);
            } catch {
                throw new Error('Invalid JSON format');
            }
        },
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['questionnaires'] }); navigate('/questionnaires'); },
        onError: (err: unknown) => { setError(err instanceof Error ? err.message : 'An error occurred'); },
    });

    const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); setError(''); mutation.mutate(formData); };

    if (isEditing && isLoading) return <div className="text-gray-500">Loading...</div>;

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-gray-900">{isEditing ? 'Edit Questionnaire' : 'Create Questionnaire'}</h1>
            <form onSubmit={handleSubmit} className="space-y-6 rounded-lg bg-white p-6 shadow">
                {error && <div className="rounded-md bg-red-50 p-4 text-sm text-red-700">{error}</div>}
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                    <div><label className="block text-sm font-medium text-gray-700">Code</label><input type="text" required disabled={isEditing} value={formData.code} onChange={(e) => setFormData({ ...formData, code: e.target.value })} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm disabled:bg-gray-100" /></div>
                    <div><label className="block text-sm font-medium text-gray-700">Title</label><input type="text" required value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" /></div>
                    <div className="sm:col-span-2"><label className="block text-sm font-medium text-gray-700">Description</label><textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={2} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" /></div>
                    <div className="sm:col-span-2">
                        <label className="block text-sm font-medium text-gray-700">SurveyJS JSON</label>
                        <p className="mt-1 text-sm text-gray-500">Paste the JSON from <a href="https://surveyjs.io/create-free-survey" target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:text-indigo-500">surveyjs.io/create-free-survey</a></p>
                        <textarea required value={formData.surveyjs_json} onChange={(e) => setFormData({ ...formData, surveyjs_json: e.target.value })} rows={15} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm font-mono text-xs" placeholder='{"pages": [...]}' />
                    </div>
                    <div className="flex items-center"><input type="checkbox" checked={formData.is_active} onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })} className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" /><label className="ml-2 block text-sm text-gray-900">Active</label></div>
                </div>
                <div className="flex justify-end space-x-3"><button type="button" onClick={() => navigate('/questionnaires')} className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button><button type="submit" disabled={mutation.isPending} className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50">{mutation.isPending ? 'Saving...' : 'Save'}</button></div>
            </form>
        </div>
    );
}
