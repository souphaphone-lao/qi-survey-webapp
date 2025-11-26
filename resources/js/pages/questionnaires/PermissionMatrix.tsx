import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { questionnairesApi, departmentsApi, institutionsApi, questionPermissionsApi } from '@/services/api';
import type { Department, Institution, QuestionPermission } from '@/types';

interface PermissionMatrixProps {
    questionnaireId: number;
}

interface PermissionState {
    [questionName: string]: {
        [departmentId: number]: boolean;
    };
}

export default function PermissionMatrix({ questionnaireId }: PermissionMatrixProps) {
    const queryClient = useQueryClient();
    const [selectedInstitution, setSelectedInstitution] = useState<number | null>(null);
    const [permissions, setPermissions] = useState<PermissionState>({});
    const [initialPermissions, setInitialPermissions] = useState<PermissionState>({});
    const [hasChanges, setHasChanges] = useState(false);

    // Fetch questionnaire
    const { data: questionnaire, isLoading: loadingQuestionnaire } = useQuery({
        queryKey: ['questionnaires', questionnaireId],
        queryFn: () => questionnairesApi.get(questionnaireId),
    });

    // Fetch institutions
    const { data: institutions } = useQuery({
        queryKey: ['institutions', 'all'],
        queryFn: () => institutionsApi.getAll(),
    });

    // Fetch departments for selected institution
    const { data: departments, isLoading: loadingDepartments } = useQuery({
        queryKey: ['departments', 'list', selectedInstitution],
        queryFn: () => departmentsApi.getAll({ institution_id: selectedInstitution || undefined }),
        enabled: !!selectedInstitution,
    });

    // Fetch existing permissions
    const { data: existingPermissions, isLoading: loadingPermissions } = useQuery({
        queryKey: ['questionnaires', questionnaireId, 'permissions'],
        queryFn: () => questionPermissionsApi.byQuestionnaire(questionnaireId),
    });

    // Extract question names from questionnaire schema
    const questions = React.useMemo(() => {
        if (!questionnaire?.surveyjs_json?.pages) return [];

        const questionList: { name: string; title: string }[] = [];

        questionnaire.surveyjs_json.pages.forEach((page) => {
            page.elements?.forEach((element) => {
                if (element.name) {
                    questionList.push({
                        name: element.name,
                        title: element.title || element.name,
                    });
                }
            });
        });

        return questionList;
    }, [questionnaire]);

    // Initialize permissions from existing data
    useEffect(() => {
        if (existingPermissions && selectedInstitution && departments) {
            const newPermissions: PermissionState = {};

            // Initialize all to false
            questions.forEach((question) => {
                newPermissions[question.name] = {};
                departments.forEach((dept) => {
                    newPermissions[question.name][dept.id] = false;
                });
            });

            // Set existing permissions to true
            existingPermissions
                .filter((perm) => perm.institution_id === selectedInstitution)
                .forEach((perm) => {
                    if (newPermissions[perm.question_name]) {
                        newPermissions[perm.question_name][perm.department_id] = true;
                    }
                });

            setPermissions(newPermissions);
            setInitialPermissions(JSON.parse(JSON.stringify(newPermissions)));
            setHasChanges(false);
        }
    }, [existingPermissions, selectedInstitution, departments, questions]);

    // Save mutation
    const saveMutation = useMutation({
        mutationFn: async (data: Partial<QuestionPermission>[]) => {
            return questionPermissionsApi.bulkStore(data);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['questionnaires', questionnaireId, 'permissions'] });
            setInitialPermissions(JSON.parse(JSON.stringify(permissions)));
            setHasChanges(false);
        },
    });

    // Toggle single permission
    const handleToggle = (questionName: string, departmentId: number) => {
        setPermissions((prev) => ({
            ...prev,
            [questionName]: {
                ...prev[questionName],
                [departmentId]: !prev[questionName]?.[departmentId],
            },
        }));
        setHasChanges(true);
    };

    // Toggle entire row (all departments for a question)
    const handleToggleRow = (questionName: string) => {
        if (!departments) return;

        const allChecked = departments.every((dept) => permissions[questionName]?.[dept.id]);

        setPermissions((prev) => ({
            ...prev,
            [questionName]: departments.reduce(
                (acc, dept) => ({
                    ...acc,
                    [dept.id]: !allChecked,
                }),
                {}
            ),
        }));
        setHasChanges(true);
    };

    // Toggle entire column (all questions for a department)
    const handleToggleColumn = (departmentId: number) => {
        const allChecked = questions.every((q) => permissions[q.name]?.[departmentId]);

        setPermissions((prev) => {
            const newPermissions = { ...prev };
            questions.forEach((question) => {
                if (!newPermissions[question.name]) {
                    newPermissions[question.name] = {};
                }
                newPermissions[question.name][departmentId] = !allChecked;
            });
            return newPermissions;
        });
        setHasChanges(true);
    };

    // Save changes
    const handleSave = () => {
        if (!selectedInstitution) return;

        const permissionsArray: Partial<QuestionPermission>[] = [];

        Object.entries(permissions).forEach(([questionName, depts]) => {
            Object.entries(depts).forEach(([departmentId, canEdit]) => {
                if (canEdit) {
                    permissionsArray.push({
                        questionnaire_id: questionnaireId,
                        question_name: questionName,
                        institution_id: selectedInstitution,
                        department_id: Number(departmentId),
                        permission_type: 'edit',
                    });
                }
            });
        });

        saveMutation.mutate(permissionsArray);
    };

    // Reset changes
    const handleReset = () => {
        setPermissions(JSON.parse(JSON.stringify(initialPermissions)));
        setHasChanges(false);
    };

    const isLoading = loadingQuestionnaire || loadingDepartments || loadingPermissions;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h2 className="text-2xl font-bold text-gray-900">Permission Matrix</h2>
                <p className="mt-1 text-sm text-gray-500">
                    Manage which departments can edit specific questions in this questionnaire
                </p>
            </div>

            {/* Institution Filter */}
            <div className="bg-white shadow sm:rounded-lg p-6">
                <label htmlFor="institution" className="block text-sm font-medium text-gray-700">
                    Select Institution
                </label>
                <select
                    id="institution"
                    value={selectedInstitution || ''}
                    onChange={(e) => setSelectedInstitution(Number(e.target.value) || null)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                >
                    <option value="">-- Select an institution --</option>
                    {institutions?.map((inst) => (
                        <option key={inst.id} value={inst.id}>
                            {inst.name} ({inst.code})
                        </option>
                    ))}
                </select>
            </div>

            {/* Permission Grid */}
            {selectedInstitution && (
                <div className="bg-white shadow sm:rounded-lg overflow-hidden">
                    {isLoading ? (
                        <div className="p-12 text-center">
                            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                            <p className="mt-2 text-sm text-gray-500">Loading permissions...</p>
                        </div>
                    ) : questions.length === 0 ? (
                        <div className="p-12 text-center">
                            <p className="text-sm text-gray-500">No questions found in this questionnaire</p>
                        </div>
                    ) : !departments || departments.length === 0 ? (
                        <div className="p-12 text-center">
                            <p className="text-sm text-gray-500">
                                No departments found for this institution
                            </p>
                        </div>
                    ) : (
                        <>
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-300">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="sticky left-0 z-10 bg-gray-50 px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                                                Question
                                            </th>
                                            <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wide text-gray-500">
                                                <button
                                                    onClick={() => handleToggleRow(questions[0]?.name)}
                                                    className="text-indigo-600 hover:text-indigo-900"
                                                    title="Toggle all"
                                                >
                                                    All
                                                </button>
                                            </th>
                                            {departments.map((dept) => (
                                                <th
                                                    key={dept.id}
                                                    className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wide text-gray-500"
                                                >
                                                    <div className="flex flex-col items-center">
                                                        <span className="mb-1">{dept.name}</span>
                                                        <button
                                                            onClick={() => handleToggleColumn(dept.id)}
                                                            className="text-indigo-600 hover:text-indigo-900 text-xs"
                                                            title="Toggle column"
                                                        >
                                                            Toggle
                                                        </button>
                                                    </div>
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200 bg-white">
                                        {questions.map((question) => (
                                            <tr key={question.name} className="hover:bg-gray-50">
                                                <td className="sticky left-0 z-10 bg-white whitespace-nowrap px-4 py-3 text-sm font-medium text-gray-900">
                                                    <div className="max-w-xs truncate" title={question.title}>
                                                        {question.title}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    <button
                                                        onClick={() => handleToggleRow(question.name)}
                                                        className="text-indigo-600 hover:text-indigo-900 text-xs"
                                                        title="Toggle row"
                                                    >
                                                        Toggle
                                                    </button>
                                                </td>
                                                {departments.map((dept) => (
                                                    <td key={dept.id} className="px-4 py-3 text-center">
                                                        <input
                                                            type="checkbox"
                                                            checked={
                                                                permissions[question.name]?.[dept.id] || false
                                                            }
                                                            onChange={() => handleToggle(question.name, dept.id)}
                                                            className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                                        />
                                                    </td>
                                                ))}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Actions */}
                            <div className="border-t border-gray-200 bg-gray-50 px-4 py-3 sm:px-6">
                                <div className="flex items-center justify-between">
                                    <div className="text-sm text-gray-500">
                                        {hasChanges ? (
                                            <span className="text-amber-600 font-medium">
                                                You have unsaved changes
                                            </span>
                                        ) : (
                                            <span>All changes saved</span>
                                        )}
                                    </div>
                                    <div className="flex gap-3">
                                        <button
                                            type="button"
                                            onClick={handleReset}
                                            disabled={!hasChanges || saveMutation.isPending}
                                            className="inline-flex items-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            Reset
                                        </button>
                                        <button
                                            type="button"
                                            onClick={handleSave}
                                            disabled={!hasChanges || saveMutation.isPending}
                                            className="inline-flex items-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            {saveMutation.isPending ? (
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
                                                    Saving...
                                                </>
                                            ) : (
                                                'Save Permissions'
                                            )}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            )}
        </div>
    );
}
