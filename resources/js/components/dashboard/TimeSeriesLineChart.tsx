import React from 'react';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
} from 'recharts';
import type { TimeSeriesData } from '@/types';

interface TimeSeriesLineChartProps {
    data: TimeSeriesData[];
}

export function TimeSeriesLineChart({ data }: TimeSeriesLineChartProps) {
    const formattedData = data.map((item) => ({
        ...item,
        date: new Date(item.date).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
        }),
    }));

    return (
        <ResponsiveContainer width="100%" height={400}>
            <LineChart data={formattedData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line
                    type="monotone"
                    dataKey="draft"
                    stroke="#94a3b8"
                    name="Draft"
                    strokeWidth={2}
                />
                <Line
                    type="monotone"
                    dataKey="submitted"
                    stroke="#3b82f6"
                    name="Submitted"
                    strokeWidth={2}
                />
                <Line
                    type="monotone"
                    dataKey="approved"
                    stroke="#22c55e"
                    name="Approved"
                    strokeWidth={2}
                />
                <Line
                    type="monotone"
                    dataKey="rejected"
                    stroke="#ef4444"
                    name="Rejected"
                    strokeWidth={2}
                />
                <Line
                    type="monotone"
                    dataKey="total"
                    stroke="#8b5cf6"
                    name="Total"
                    strokeWidth={2}
                    strokeDasharray="5 5"
                />
            </LineChart>
        </ResponsiveContainer>
    );
}
