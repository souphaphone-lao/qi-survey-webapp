import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { exportsApi } from '@/services/api';
import type { ExportFilters, ExportFormat } from '@/types';

export function useExportsList(params?: { questionnaire_code?: string; status?: string }) {
    return useQuery({
        queryKey: ['exports', params],
        queryFn: () => exportsApi.list(params),
        refetchInterval: (query) => {
            // Auto-refresh every 5 seconds if there are pending/processing exports
            const data = query.state.data;
            const hasPending = data?.data.some(
                (job) => job.status === 'pending' || job.status === 'processing'
            );
            return hasPending ? 5000 : false;
        },
    });
}

export function useExportJob(id: number | null) {
    return useQuery({
        queryKey: ['exports', id],
        queryFn: () => exportsApi.get(id!),
        enabled: !!id,
        refetchInterval: (query) => {
            // Auto-refresh every 5 seconds if pending/processing
            const status = query.state.data?.status;
            return status === 'pending' || status === 'processing' ? 5000 : false;
        },
    });
}

export function useCreateExport() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (params: {
            questionnaireCode: string;
            format: ExportFormat;
            filters?: ExportFilters;
        }) => exportsApi.create(params.questionnaireCode, params.format, params.filters),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['exports'] });
        },
    });
}

export function useDownloadExport() {
    return useMutation({
        mutationFn: async (id: number) => {
            const blob = await exportsApi.download(id);
            return { id, blob };
        },
        onSuccess: ({ blob }, id) => {
            // Create download link
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `export-${id}.csv`; // The backend sets the actual filename
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
        },
    });
}

export function useDeleteExport() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: number) => exportsApi.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['exports'] });
        },
    });
}
