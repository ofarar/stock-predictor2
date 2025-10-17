import React, { useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';

// Define the checks to be performed in order
const initialChecks = [
    // --- Internal Checks ---
    { id: 'mongodb', name: 'MongoDB Connection', status: 'pending', result: null },
    { id: 'config-env', name: 'Server Configuration (.env)', status: 'pending', result: null },
    { id: 'api-performance', name: 'API Performance (Profile Endpoint)', status: 'pending', result: null },
    { id: 'db-integrity', name: 'Database Integrity (Orphans)', status: 'pending', result: null },
    { id: 'badge-json', name: 'Admin Settings (Badge JSON)', status: 'pending', result: null },

    // --- Core Services ---
    { id: 'cron', name: 'Cron Job (Scoring)', status: 'pending', result: null },
    { id: 'email', name: 'Email Service', status: 'pending', result: null },

    // --- External APIs ---
    { id: 'yahoo-current', name: 'Yahoo Finance (Current Price)', status: 'pending', result: null },
    { id: 'yahoo-historical', name: 'Yahoo Finance (Historical Data)', status: 'pending', result: null },
    { id: 'avatar', name: 'Avatar API (DiceBear)', status: 'pending', result: null },
];

const StatusIcon = ({ status }) => {
    switch (status) {
        case 'running':
            return <svg className="animate-spin h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>;
        case 'success':
            return <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>;
        case 'failed':
            return <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>;
        case 'pending':
        default:
            return <div className="w-5 h-5 rounded-full bg-gray-600"></div>;
    }
};

const AdminHealthCheck = () => {
    const [checks, setChecks] = useState(initialChecks);
    const [isLoading, setIsLoading] = useState(false);

    const runChecks = async () => {
        setIsLoading(true);
        setChecks(initialChecks); // Reset to pending state before starting

        for (const check of initialChecks) {
            // 1. Set the current check to 'running'
            setChecks(prev => prev.map(c => c.id === check.id ? { ...c, status: 'running' } : c));

            try {
                // 2. Call the new backend endpoint for this specific service
                const response = await axios.post(
                    `${process.env.REACT_APP_API_URL}/api/admin/health-check/${check.id}`,
                    {},
                    { withCredentials: true }
                );
                // 3. Update the check with the result (success or failed)
                setChecks(prev => prev.map(c => c.id === check.id ? { ...c, status: response.data.status, result: response.data } : c));
            } catch (error) {
                // Handle critical failures (e.g., user is not an admin)
                setChecks(prev => prev.map(c => c.id === check.id ? { ...c, status: 'failed', result: { details: 'Failed to run check.' } } : c));
                toast.error(`Error running check for ${check.name}.`);
                break; // Stop the loop on a critical error
            }
        }
        setIsLoading(false);
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

            <div className="mt-4 space-y-3">
                {checks.map(check => (
                    <div key={check.id} className="bg-gray-700 p-3 rounded-md">
                        <div className="flex justify-between items-center">
                            <p className="font-semibold text-white">{check.name}</p>
                            <div className="flex items-center gap-4">
                                {check.result && <span className="text-sm text-gray-400">{check.result.latency}</span>}
                                <StatusIcon status={check.status} />
                            </div>
                        </div>
                        {check.status === 'failed' && check.result && (
                            <p className="text-xs text-red-400 mt-1 break-words">{check.result.details}</p>
                        )}
                        {check.status === 'success' && check.result && check.result.details !== 'OK' && (
                            <p className="text-xs text-gray-400 mt-1">{check.result.details}</p>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default AdminHealthCheck;