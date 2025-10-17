import React, { useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';

const AdminHealthCheck = () => {
    const [results, setResults] = useState(null);
    const [isLoading, setIsLoading] = useState(false);

    const runChecks = async () => {
        setIsLoading(true);
        setResults(null);
        try {
            const response = await axios.post(
                `${process.env.REACT_APP_API_URL}/api/admin/health-check`,
                {},
                { withCredentials: true }
            );
            setResults(response.data);
            toast.success('Health checks complete!');
        } catch (error) {
            toast.error('Failed to run health checks. You may not be an admin.');
        } finally {
            setIsLoading(false);
        }
    };

    const StatusIcon = ({ status }) => {
        const isSuccess = status === 'success';
        const title = isSuccess ? 'Operational' : 'Failed';
        const iconColor = isSuccess ? 'text-green-400' : 'text-red-400';
        
        return (
            <div title={title}>
                {isSuccess ? (
                    <svg className={`w-6 h-6 ${iconColor}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                ) : (
                    <svg className={`w-6 h-6 ${iconColor}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                )}
            </div>
        );
    };

    return (
        <div className="bg-gray-800 p-6 rounded-lg">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-white">System Health Check</h2>
                <button
                    onClick={runChecks}
                    disabled={isLoading}
                    className="bg-blue-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-500 disabled:bg-gray-600"
                >
                    {isLoading ? 'Running...' : 'Run Checks'}
                </button>
            </div>
            {isLoading && (
                 <div className="text-center p-4">
                    <svg className="animate-spin h-8 w-8 text-white mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                </div>
            )}
            {results && (
                <div className="mt-4 space-y-2">
                    {results.map(result => (
                        <div key={result.service} className="bg-gray-700 p-3 rounded-md flex justify-between items-center">
                            <div>
                                <p className="font-semibold text-white">{result.service}</p>
                                {result.status === 'failed' && <p className="text-xs text-red-400 max-w-md break-words">{result.details}</p>}
                            </div>
                            <div className="flex items-center gap-4">
                                <span className="text-sm text-gray-400">{result.latency}</span>
                                <StatusIcon status={result.status} />
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default AdminHealthCheck;