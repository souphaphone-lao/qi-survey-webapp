import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { institutionsApi } from '@/services/api';

export default function InstitutionForm() {
    const { id } = useParams();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const isEditing = !!id;

    const [formData, setFormData] = useState({ name: '', code: '', level: 'central' as const, parent_institution_id: '', is_active: true });
    const [error, setError] = useState('');

    const { data: institution, isLoading } = useQuery({ queryKey: ['institution', id], queryFn: () => institutionsApi.get(Number(id)), enabled: isEditing });
    const { data: institutions } = useQuery({ queryKey: ['institutions-list'], queryFn: () => institutionsApi.getAll() });

    useEffect(() => {
        if (institution) {
            setFormData({ name: institution.name, code: institution.code, level: institution.level, parent_institution_id: institution.parent_institution_id?.toString() || '', is_active: institution.is_active });
        }
    }, [institution]);

    const mutation = useMutation({
        mutationFn: (data: typeof formData) => {
            const payload = { ...data, parent_institution_id: data.parent_institution_id ? Number(data.parent_institution_id) : null };
            return isEditing ? institutionsApi.update(Number(id), payload) : institutionsApi.create(payload);
        },
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['institutions'] }); navigate('/institutions'); },
        onError: (err: unknown) => { setError((err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'An error occurred'); },
    });

    const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); setError(''); mutation.mutate(formData); };

    if (isEditing && isLoading) return <div className="text-gray-500">Loading...</div>;

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-gray-900">{isEditing ? 'Edit Institution' : 'Create Institution'}</h1>
            <form onSubmit={handleSubmit} className="space-y-6 rounded-lg bg-white p-6 shadow">
                {error && <div className="rounded-md bg-red-50 p-4 text-sm text-red-700">{error}</div>}
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                    <div><label className="block text-sm font-medium text-gray-700">Name</label><input type="text" required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" /></div>
                    <div><label className="block text-sm font-medium text-gray-700">Code</label><input type="text" required value={formData.code} onChange={(e) => setFormData({ ...formData, code: e.target.value })} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" /></div>
                    <div><label className="block text-sm font-medium text-gray-700">Level</label><select required value={formData.level} onChange={(e) => setFormData({ ...formData, level: e.target.value as 'central' | 'province' | 'district' })} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"><option value="central">Central</option><option value="province">Province</option><option value="district">District</option></select></div>
                    <div><label className="block text-sm font-medium text-gray-700">Parent Institution</label><select value={formData.parent_institution_id} onChange={(e) => setFormData({ ...formData, parent_institution_id: e.target.value })} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"><option value="">None</option>{institutions?.filter(i => i.id !== Number(id)).map((i) => (<option key={i.id} value={i.id}>{i.name}</option>))}</select></div>
                    <div className="flex items-center"><input type="checkbox" checked={formData.is_active} onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })} className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" /><label className="ml-2 block text-sm text-gray-900">Active</label></div>
                </div>
                <div className="flex justify-end space-x-3"><button type="button" onClick={() => navigate('/institutions')} className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button><button type="submit" disabled={mutation.isPending} className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50">{mutation.isPending ? 'Saving...' : 'Save'}</button></div>
            </form>
        </div>
    );
}
