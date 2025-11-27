import React from 'react';

interface VersionBadgeProps {
    version: number;
    isActive: boolean;
    isDeprecated: boolean;
}

export const VersionBadge: React.FC<VersionBadgeProps> = ({ version, isActive, isDeprecated }) => {
    const getBadgeClass = () => {
        if (isActive) {
            return 'bg-green-100 text-green-800';
        }
        if (isDeprecated) {
            return 'bg-gray-100 text-gray-600';
        }
        return 'bg-blue-100 text-blue-800';
    };

    const getLabel = () => {
        if (isActive) {
            return `v${version} (Active)`;
        }
        if (isDeprecated) {
            return `v${version} (Deprecated)`;
        }
        return `v${version}`;
    };

    return (
        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getBadgeClass()}`}>
            {getLabel()}
        </span>
    );
};
