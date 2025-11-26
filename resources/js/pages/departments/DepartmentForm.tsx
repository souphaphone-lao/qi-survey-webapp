import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { departmentsApi, institutionsApi } from '@/services/api';
import type { Department } from '@/types';

export default function DepartmentForm() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const isEditMode = !!id;

    const [formData, setFormData] = useState({
        name: '',
        code: '',
        institution_id: '',
        description: '',
        is_active: true,
    });

    const [errors, setErrors] = useState<Record<string, string[]>>({});

    // Fetch institutions
    const { data: institutions } = useQuery({
        queryKey: ['institutions', 'all'],
        queryFn: () => institutionsApi.getAll(),
    });

    // Fetch department for editing
    const { data: department, isLoading: loadingDepartment } = useQuery({
        queryKey: ['departments', id],
        queryFn: () => departmentsApi.get(Number(id)),
        enabled: isEditMode,
    });

    // Initialize form data when editing
    useEffect(() => {
        if (department) {
            setFormData({
                name: department.name,
                code: department.code,
                institution_id: String(department.institution_id),
                description: department.description || '',
                is_active: department.is_active,
            });
        }
    }, [department]);

    // Create mutation
    const createMutation = useMutation({
        mutationFn: (data: Partial<Department>) => departmentsApi.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['departments'] });
            navigate('/departments');
        },
        onError: (error: any) => {
            if (error.response?.data?.errors) {
                setErrors(error.response.data.errors);
            }
        },
    });

    // Update mutation
    const updateMutation = useMutation({
        mutationFn: (data: Partial<Department>) => departmentsApi.update(Number(id), data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['departments'] });
            navigate('/departments');
        },
        onError: (error: any) => {
            if (error.response?.data?.errors) {
                setErrors(error.response.data.errors);
            }
        },
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setErrors({});

        const submitData = {
            ...formData,
            institution_id: Number(formData.institution_id),
        };

        if (isEditMode) {
            updateMutation.mutate(submitData);
        } else {
            createMutation.mutate(submitData);
        }
    };

    const handleChange = (field: string, value: string | boolean) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
        // Clear error for this field
        if (errors[field]) {
            setErrors((prev) => {
                const newErrors = { ...prev };
                delete newErrors[field];
                return newErrors;
            });
        }
    };

    const isSubmitting = createMutation.isPending || updateMutation.isPending;

    if (isEditMode && loadingDepartment) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-gray-900">
                    {isEditMode ? 'Edit Department' : 'Create Department'}
                </h1>
                <p className="mt-1 text-sm text-gray-500">
                    {isEditMode
                        ? 'Update the department details below'
                        : 'Fill in the details to create a new department'}
                </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="bg-white shadow sm:rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                    <div className="space-y-6">
                        {/* Name */}
                        <div>
                            <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                                Name <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                id="name"
                                value={formData.name}
                                onChange={(e) => handleChange('name', e.target.value)}
                                className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm ${
                                    errors.name
                                        ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                                        : 'border-gray-300 focus:border-indigo-500 focus:ring-indigo-500'
                                }`}
                                required
                                disabled={isSubmitting}
                            />
                            {errors.name && (
                                <p className="mt-1 text-sm text-red-600">{errors.name[0]}</p>
                            )}
                        </div>

                        {/* Code */}
                        <div>
                            <label htmlFor="code" className="block text-sm font-medium text-gray-700">
                                Code <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                id="code"
                                value={formData.code}
                                onChange={(e) => handleChange('code', e.target.value.toUpperCase())}
                                className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm ${
                                    errors.code
                                        ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                                        : 'border-gray-300 focus:border-indigo-500 focus:ring-indigo-500'
                                }`}
                                placeholder="e.g., HR, IT, FIN"
                                required
                                disabled={isSubmitting}
                            />
                            <p className="mt-1 text-sm text-gray-500">
                                Unique code for this department within the institution
                            </p>
                            {errors.code && (
                                <p className="mt-1 text-sm text-red-600">{errors.code[0]}</p>
                            )}
                        </div>

                        {/* Institution */}
                        <div>
                            <label htmlFor="institution_id" className="block text-sm font-medium text-gray-700">
                                Institution <span className="text-red-500">*</span>
                            </label>
                            <select
                                id="institution_id"
                                value={formData.institution_id}
                                onChange={(e) => handleChange('institution_id', e.target.value)}
                                className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm ${
                                    errors.institution_id
                                        ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                                        : 'border-gray-300 focus:border-indigo-500 focus:ring-indigo-500'
                                }`}
                                required
                                disabled={isSubmitting}
                            >
                                <option value="">Select an institution</option>
                                {institutions?.map((inst) => (
                                    <option key={inst.id} value={inst.id}>
                                        {inst.name} ({inst.code})
                                    </option>
                                ))}
                            </select>
                            {errors.institution_id && (
                                <p className="mt-1 text-sm text-red-600">{errors.institution_id[0]}</p>
                            )}
                        </div>

                        {/* Description */}
                        <div>
                            <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                                Description
                            </label>
                            <textarea
                                id="description"
                                rows={3}
                                value={formData.description}
                                onChange={(e) => handleChange('description', e.target.value)}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                                placeholder="Optional description of this department"
                                disabled={isSubmitting}
                            />
                            {errors.description && (
                                <p className="mt-1 text-sm text-red-600">{errors.description[0]}</p>
                            )}
                        </div>

                        {/* Active Status */}
                        <div className="flex items-start">
                            <div className="flex h-5 items-center">
                                <input
                                    id="is_active"
                                    type="checkbox"
                                    checked={formData.is_active}
                                    onChange={(e) => handleChange('is_active', e.target.checked)}
                                    className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                    disabled={isSubmitting}
                                />
                            </div>
                            <div className="ml-3 text-sm">
                                <label htmlFor="is_active" className="font-medium text-gray-700">
                                    Active
                                </label>
                                <p className="text-gray-500">
                                    Inactive departments will not be available for assignment
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Actions */}
                <div className="bg-gray-50 px-4 py-3 text-right sm:px-6 flex justify-end gap-3">
                    <button
                        type="button"
                        onClick={() => navigate('/departments')}
                        disabled={isSubmitting}
                        className="inline-flex justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="inline-flex justify-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isSubmitting ? (
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
                                {isEditMode ? 'Updating...' : 'Creating...'}
                            </>
                        ) : (
                            <>{isEditMode ? 'Update Department' : 'Create Department'}</>
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
}
