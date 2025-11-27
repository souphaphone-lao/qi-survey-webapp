import React from 'react';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
} from 'recharts';
import type { InstitutionBreakdown } from '@/types';

interface InstitutionBarChartProps {
    data: InstitutionBreakdown[];
    maxInstitutions?: number;
}

export function InstitutionBarChart({ data, maxInstitutions = 10 }: InstitutionBarChartProps) {
    // Sort by total submissions and take top N
    const topInstitutions = [...data]
        .sort((a, b) => b.total_submissions - a.total_submissions)
        .slice(0, maxInstitutions);

    const chartData = topInstitutions.map((item) => ({
        name: item.code,
        fullName: item.name,
        Draft: item.draft,
        Submitted: item.submitted,
        Approved: item.approved,
        Rejected: item.rejected,
    }));

    return (
        <ResponsiveContainer width="100%" height={400}>
            <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                <YAxis />
                <Tooltip
                    content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                            const data = payload[0].payload;
                            return (
                                <div className="bg-white p-3 border border-gray-200 rounded shadow-lg">
                                    <p className="font-semibold text-gray-900">{data.fullName}</p>
                                    <p className="text-sm text-gray-600 mt-1">
                                        Draft: {data.Draft}
                                    </p>
                                    <p className="text-sm text-gray-600">
                                        Submitted: {data.Submitted}
                                    </p>
                                    <p className="text-sm text-gray-600">
                                        Approved: {data.Approved}
                                    </p>
                                    <p className="text-sm text-gray-600">
                                        Rejected: {data.Rejected}
                                    </p>
                                </div>
                            );
                        }
                        return null;
                    }}
                />
                <Legend />
                <Bar dataKey="Draft" stackId="a" fill="#94a3b8" />
                <Bar dataKey="Submitted" stackId="a" fill="#3b82f6" />
                <Bar dataKey="Approved" stackId="a" fill="#22c55e" />
                <Bar dataKey="Rejected" stackId="a" fill="#ef4444" />
            </BarChart>
        </ResponsiveContainer>
    );
}
