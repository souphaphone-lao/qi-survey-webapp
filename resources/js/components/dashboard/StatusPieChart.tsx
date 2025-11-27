import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import type { StatusDistribution } from '@/types';

interface StatusPieChartProps {
    data: StatusDistribution[];
}

const COLORS: Record<string, string> = {
    draft: '#94a3b8', // gray
    submitted: '#3b82f6', // blue
    approved: '#22c55e', // green
    rejected: '#ef4444', // red
};

const STATUS_LABELS: Record<string, string> = {
    draft: 'Draft',
    submitted: 'Submitted',
    approved: 'Approved',
    rejected: 'Rejected',
};

export function StatusPieChart({ data }: StatusPieChartProps) {
    const chartData = data.map((item) => ({
        name: STATUS_LABELS[item.status] || item.status,
        value: item.count,
        percentage: item.percentage,
    }));

    return (
        <ResponsiveContainer width="100%" height={300}>
            <PieChart>
                <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={(entry: any) => `${entry.name}: ${entry.percentage}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                >
                    {data.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[entry.status]} />
                    ))}
                </Pie>
                <Tooltip
                    formatter={(value: number) => [`${value}`, '']}
                />
                <Legend />
            </PieChart>
        </ResponsiveContainer>
    );
}
