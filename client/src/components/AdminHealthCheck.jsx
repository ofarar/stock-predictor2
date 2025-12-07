import React, { useState } from 'react';
import PropTypes from 'prop-types';
import axios from 'axios';
import toast from 'react-hot-toast';

// 1. Add 'selected: true' to each check.
// This will make them all "on" by default.
const initialChecks = [
    // --- Internal Checks ---
    { id: 'mongodb', name: 'MongoDB Connection', status: 'pending', result: null, selected: true },
    { id: 'config-env', name: 'Server Configuration (.env)', status: 'pending', result: null, selected: true },
    { id: 'api-performance', name: 'API Performance (Profile Endpoint)', status: 'pending', result: null, selected: true },
    { id: 'db-integrity', name: 'Database Integrity (Orphans)', status: 'pending', result: null, selected: true },
    { id: 'badge-json', name: 'Admin Settings (Badge JSON)', status: 'pending', result: null, selected: true },

    // --- AI / Bot System ---
    { id: 'python-runtime', name: 'Python Runtime (v3.x)', status: 'pending', result: null, selected: true },
    { id: 'bot-user', name: 'AI Bot User Identity', status: 'pending', result: null, selected: true },
    { id: 'model-file', name: 'ML Engine File', status: 'pending', result: null, selected: true },

    // --- Core Services ---
    { id: 'cron', name: 'Cron Job (Scoring)', status: 'pending', result: null, selected: true },
    { id: 'email', name: 'Email Service', status: 'pending', result: null, selected: true },

    // --- External APIs ---
    { id: 'api-calls', name: 'Finance API Calls (Since Restart)', status: 'pending', result: null, selected: true },
    { id: 'finance-current', name: 'Finance API (Current Price)', status: 'pending', result: null, selected: true },
    { id: 'finance-historical', name: 'Finance API (Historical Data)', status: 'pending', result: null, selected: true },
    { id: 'nasdaq-api', name: 'NASDAQ Earnings API', status: 'pending', result: null, selected: true },
    { id: 'crypto-api', name: 'Crypto API (CoinGecko)', status: 'pending', result: null, selected: true },
    { id: 'avatar', name: 'Avatar API (DiceBear)', status: 'pending', result: null, selected: true },
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

StatusIcon.propTypes = {
    status: PropTypes.string.isRequired,
};

const AdminHealthCheck = () => {
    const [checks, setChecks] = useState(initialChecks);
    const [isLoading, setIsLoading] = useState(false);

    // 2. This new function updates the 'selected' state for one check
    const handleToggleCheck = (checkId) => {
        setChecks(prev =>
            prev.map(c =>
                c.id === checkId ? { ...c, selected: !c.selected } : c
            )
        );
    };

    // 3. This new function toggles all checkboxes on or off
    const handleToggleAll = () => {
        // Check if all are currently selected
        const allSelected = checks.every(c => c.selected);
        setChecks(prev =>
            prev.map(c => ({ ...c, selected: !allSelected }))
        );
    };

    // 4. This function is MODIFIED to only run selected checks
    const runChecks = async () => {
        setIsLoading(true);

        // Find which checks to run
        const checksToRun = checks.filter(c => c.selected);

        // Reset the status of *only* the selected checks
        setChecks(prev => prev.map(c =>
            c.selected ? { ...c, status: 'pending', result: null } : c
        ));

        for (const check of checksToRun) {
            // 1. Set the current check to 'running'
            setChecks(prev => prev.map(c =>
                c.id === check.id ? { ...c, status: 'running' } : c
            ));

            try {
                // 2. Call the backend endpoint
                const response = await axios.post(
                    `${import.meta.env.VITE_API_URL}/api/admin/health-check/${check.id}`,
                    {},
                    { withCredentials: true }
                );
                // 3. Update the check with the result (success or failed)
                setChecks(prev => prev.map(c =>
                    c.id === check.id ? { ...c, status: response.data.status, result: response.data } : c
                ));
            } catch (error) {
                // --- ADD THIS LINE ---
                console.error(`Health check for '${check.name}' failed:`, error);

                // Handle critical failures
                setChecks(prev => prev.map(c =>
                    c.id === check.id ? { ...c, status: 'failed', result: { details: error.message || 'Failed to run check.' } } : c // <-- MODIFIED THIS LINE
                ));
                toast.error(`Error running check for ${check.name}.`);
                // Note: We don't break the loop, so other checks can still try to run
            }
        }
        setIsLoading(false);
    };

    // 5. Helper value to determine button text
    const areAllSelected = checks.every(c => c.selected);
    const selectedCount = checks.filter(c => c.selected).length;

    return (
        <div className="bg-gray-800 p-6 rounded-lg">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
                <h2 className="text-xl font-bold text-white flex-shrink-0">System Health Check</h2>

                {/* 6. New Button Group */}
                <div className="flex items-center gap-2 w-full sm:w-auto">
                    <button
                        onClick={handleToggleAll}
                        disabled={isLoading}
                        className="bg-gray-600 text-white text-sm font-bold py-2 px-4 rounded-lg hover:bg-gray-500 disabled:bg-gray-600"
                    >
                        {areAllSelected ? 'Deselect All' : 'Select All'}
                    </button>
                    <button
                        onClick={runChecks}
                        disabled={isLoading || selectedCount === 0} // Disable if nothing is selected
                        className="flex-grow sm:flex-grow-0 bg-blue-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-500 disabled:bg-gray-600"
                    >
                        {isLoading ? 'Running...' : `Run Selected (${selectedCount})`}
                    </button>
                </div>
            </div>

            <div className="mt-4 space-y-3">
                {/* 7. Modified .map() loop to add checkboxes */}
                {checks.map(check => (
                    <div key={check.id} className="bg-gray-700 p-3 rounded-md">
                        <div className="flex justify-between items-center">
                            <div className="flex items-center gap-3">
                                <input
                                    type="checkbox"
                                    id={`check-${check.id}`}
                                    checked={check.selected}
                                    onChange={() => handleToggleCheck(check.id)}
                                    disabled={isLoading}
                                    className="h-5 w-5 rounded bg-gray-800 text-green-500 border-gray-600 focus:ring-green-500"
                                />
                                <label htmlFor={`check-${check.id}`} className="font-semibold text-white cursor-pointer">{check.name}</label>
                            </div>
                            <div className="flex items-center gap-4">
                                <span className="text-sm text-gray-400 hidden sm:block">
                                    {check.result?.latency}
                                </span>
                                <StatusIcon status={check.status} />
                            </div>
                        </div>

                        {/* 8. Show details (latency on mobile, and any result text) */}
                        {check.result && (
                            <>
                                <p className="text-xs text-gray-400 mt-1 sm:hidden">{check.result.latency}</p>
                                {check.status === 'failed' && (
                                    <p className="text-xs text-red-400 mt-1 break-words">{check.result.details}</p>
                                )}
                                {check.status === 'success' && check.result.details !== 'OK' && (
                                    <p className="text-xs text-gray-400 mt-1">{check.result.details}</p>
                                )}
                            </>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default AdminHealthCheck;