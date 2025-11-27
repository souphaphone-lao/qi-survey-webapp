import { useState } from 'react';
import type { DashboardFilters } from '@/types';

export function useDashboardFilters(initialFilters: DashboardFilters = {}) {
    const [filters, setFilters] = useState<DashboardFilters>(initialFilters);

    const updateFilter = <K extends keyof DashboardFilters>(
        key: K,
        value: DashboardFilters[K]
    ) => {
        setFilters((prev) => ({
            ...prev,
            [key]: value,
        }));
    };

    const clearFilter = (key: keyof DashboardFilters) => {
        setFilters((prev) => {
            const newFilters = { ...prev };
            delete newFilters[key];
            return newFilters;
        });
    };

    const clearAllFilters = () => {
        setFilters({});
    };

    const hasActiveFilters = Object.keys(filters).length > 0;

    return {
        filters,
        updateFilter,
        clearFilter,
        clearAllFilters,
        hasActiveFilters,
        setFilters,
    };
}
