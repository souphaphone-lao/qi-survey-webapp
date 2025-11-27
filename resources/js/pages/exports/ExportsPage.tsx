import React from 'react';
import { ExportHistory } from '@/components/dashboard/ExportHistory';
import { useAuth } from '@/contexts/AuthContext';

export default function ExportsPage() {
    const { user } = useAuth();

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-gray-900">Exports</h1>
                <p className="mt-2 text-gray-600">
                    View and manage your data exports
                </p>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex">
                    <div className="flex-shrink-0">
                        <svg
                            className="h-5 w-5 text-blue-400"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                        >
                            <path
                                fillRule="evenodd"
                                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                                clipRule="evenodd"
                            />
                        </svg>
                    </div>
                    <div className="ml-3 flex-1">
                        <h3 className="text-sm font-medium text-blue-800">
                            About Exports
                        </h3>
                        <div className="mt-2 text-sm text-blue-700">
                            <p>
                                Export files are generated in the background and will be available for download once processing is complete.
                                Files expire after 24 hours for security purposes.
                            </p>
                            <ul className="list-disc list-inside mt-2 space-y-1">
                                <li>CSV files are compatible with Excel and Google Sheets</li>
                                <li>XLSX files preserve formatting and can include multiple sheets</li>
                                <li>Apply filters to export specific subsets of data</li>
                                <li>Large exports may take several minutes to process</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>

            <ExportHistory />

            {user && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <p className="text-sm text-gray-600">
                        To create a new export, navigate to the{' '}
                        <a
                            href="/dashboard/questionnaires"
                            className="text-indigo-600 hover:text-indigo-800 font-medium"
                        >
                            Questionnaire Dashboard
                        </a>{' '}
                        and click the "Export Data" button.
                    </p>
                </div>
            )}
        </div>
    );
}
