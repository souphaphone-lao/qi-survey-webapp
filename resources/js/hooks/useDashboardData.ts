import { useQuery } from '@tanstack/react-query';
import { dashboardApi } from '@/services/api';
import type { DashboardFilters } from '@/types';

export function useDashboardOverview(filters?: DashboardFilters) {
    return useQuery({
        queryKey: ['dashboard', 'overview', filters],
        queryFn: () => dashboardApi.getOverview(filters),
        staleTime: 5 * 60 * 1000, // 5 minutes
    });
}

export function useDashboardTrends(params: {
    period: 'daily' | 'weekly' | 'monthly';
    date_from: string;
    date_to: string;
} & DashboardFilters) {
    return useQuery({
        queryKey: ['dashboard', 'trends', params],
        queryFn: () => dashboardApi.getTrends(params),
        staleTime: 5 * 60 * 1000,
        enabled: !!params.date_from && !!params.date_to,
    });
}

export function useDashboardInstitutions(filters?: DashboardFilters) {
    return useQuery({
        queryKey: ['dashboard', 'institutions', filters],
        queryFn: () => dashboardApi.getInstitutionBreakdown(filters),
        staleTime: 5 * 60 * 1000,
    });
}

export function useDashboardQuestionnaire(code: string, filters?: DashboardFilters) {
    return useQuery({
        queryKey: ['dashboard', 'questionnaire', code, filters],
        queryFn: () => dashboardApi.getQuestionnaireStats(code, filters),
        staleTime: 5 * 60 * 1000,
        enabled: !!code,
    });
}
