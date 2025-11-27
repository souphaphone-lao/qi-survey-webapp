import React from 'react';
import type { TrendData } from '@/types';

interface SummaryCardProps {
    title: string;
    value: number;
    trend?: TrendData;
    icon?: React.ReactNode;
    color?: 'blue' | 'green' | 'red' | 'gray' | 'purple';
}

const colorClasses = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    red: 'bg-red-50 text-red-600',
    gray: 'bg-gray-50 text-gray-600',
    purple: 'bg-purple-50 text-purple-600',
};

export function SummaryCard({ title, value, trend, icon, color = 'blue' }: SummaryCardProps) {
    const getTrendColor = (change: number) => {
        if (change > 0) return 'text-green-600';
        if (change < 0) return 'text-red-600';
        return 'text-gray-600';
    };

    const getTrendIcon = (change: number) => {
        if (change > 0) return '↑';
        if (change < 0) return '↓';
        return '→';
    };

    return (
        <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
                <div className="flex-1">
                    <p className="text-sm font-medium text-gray-600">{title}</p>
                    <p className="mt-2 text-3xl font-semibold text-gray-900">{value.toLocaleString()}</p>
                    {trend && (
                        <p className={`mt-2 text-sm ${getTrendColor(trend.change)}`}>
                            <span className="font-medium">
                                {getTrendIcon(trend.change)} {Math.abs(trend.change)}%
                            </span>
                            <span className="text-gray-600 ml-2">
                                from {trend.previous} last month
                            </span>
                        </p>
                    )}
                </div>
                {icon && (
                    <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
                        {icon}
                    </div>
                )}
            </div>
        </div>
    );
}
