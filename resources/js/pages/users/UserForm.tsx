import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usersApi, institutionsApi } from '@/services/api';

export default function UserForm() {
    const { id } = useParams();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const isEditing = !!id;

    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        institution_id: '',
        role: 'enumerator',
        is_active: true,
    });
    const [error, setError] = useState('');

    const { data: user, isLoading: isLoadingUser } = useQuery({
        queryKey: ['user', id],
        queryFn: () => usersApi.get(Number(id)),
        enabled: isEditing,
    });

    const { data: institutions } = useQuery({
        queryKey: ['institutions-list'],
        queryFn: () => institutionsApi.getAll(),
    });

    useEffect(() => {
        if (user) {
            setFormData({
                name: user.name,
                email: user.email,
                password: '',
                institution_id: user.institution_id?.toString() || '',
                role: user.roles?.[0] || 'enumerator',
                is_active: user.is_active,
            });
        }
    }, [user]);

    const mutation = useMutation({
        mutationFn: (data: typeof formData) => {
            const payload = {
                ...data,
                institution_id: Number(data.institution_id),
            };
            if (isEditing) {
                return usersApi.update(Number(id), payload);
            }
            return usersApi.create(payload as typeof payload & { password: string });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['users'] });
            navigate('/users');
        },
        onError: (err: unknown) => {
            if (err && typeof err === 'object' && 'response' in err) {
                const axiosError = err as { response?: { data?: { message?: string } } };
                setError(axiosError.response?.data?.message || 'An error occurred');
            } else {
                setError('An error occurred');
            }
        },
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        mutation.mutate(formData);
    };

    if (isEditing && isLoadingUser) {
        return <div className="text-gray-500">Loading user...</div>;
    }

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-gray-900">{isEditing ? 'Edit User' : 'Create User'}</h1>
            <form onSubmit={handleSubmit} className="space-y-6 rounded-lg bg-white p-6 shadow">
                {error && <div className="rounded-md bg-red-50 p-4 text-sm text-red-700">{error}</div>}
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Name</label>
                        <input type="text" required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Email</label>
                        <input type="email" required value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Password {isEditing && '(leave blank to keep current)'}</label>
                        <input type="password" required={!isEditing} value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Institution</label>
                        <select required value={formData.institution_id} onChange={(e) => setFormData({ ...formData, institution_id: e.target.value })} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm">
                            <option value="">Select Institution</option>
                            {institutions?.map((inst) => (<option key={inst.id} value={inst.id}>{inst.name}</option>))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Role</label>
                        <select required value={formData.role} onChange={(e) => setFormData({ ...formData, role: e.target.value })} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm">
                            <option value="admin">Admin</option>
                            <option value="enumerator">Enumerator</option>
                            <option value="viewer">Viewer</option>
                        </select>
                    </div>
                    <div className="flex items-center">
                        <input type="checkbox" checked={formData.is_active} onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })} className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
                        <label className="ml-2 block text-sm text-gray-900">Active</label>
                    </div>
                </div>
                <div className="flex justify-end space-x-3">
                    <button type="button" onClick={() => navigate('/users')} className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
                    <button type="submit" disabled={mutation.isPending} className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50">{mutation.isPending ? 'Saving...' : 'Save'}</button>
                </div>
            </form>
        </div>
    );
}
