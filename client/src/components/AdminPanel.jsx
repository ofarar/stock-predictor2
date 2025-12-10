// src/components/AdminPanel.js

import React from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';

const AdminPanel = () => {
    const handleEvaluate = () => {
        if (globalThis.confirm("Are you sure you want to manually evaluate all active predictions?")) {
            axios.post(`${import.meta.env.VITE_API_URL}/api/admin/evaluate`, {}, { withCredentials: true })
                .then(() => toast.success("Evaluation job started."))
                .catch(() => toast.error("Error: You might not be an admin."));
        }
    };

    const handleRecalculateAnalytics = () => {
        if (globalThis.confirm("Are you sure you want to recalculate ALL analyst ratings?")) {
            const promise = axios.post(`${import.meta.env.VITE_API_URL}/api/admin/recalculate-analytics`, {}, { withCredentials: true });
            toast.promise(promise, {
                loading: 'Recalculating all analytics...',
                success: 'Analytics recalculated successfully!',
                error: 'Failed to recalculate analytics.'
            });
        }
    };

    const handleCleanupOrphans = () => {
        if (globalThis.confirm("Are you sure you want to delete ALL predictions that belong to non-existent users? This cannot be undone.")) {
            const promise = axios.post(`${import.meta.env.VITE_API_URL}/api/admin/cleanup-orphans`, {}, { withCredentials: true });

            toast.promise(promise, {
                loading: 'Scanning and deleting orphaned data...',
                success: (res) => `Cleanup complete! ${res.data.deletedCount} items removed.`,
                error: 'Failed to run cleanup job.'
            });
        }
    };

    // --- NEW: Sentry Test Function ---
    const handleTestSentry = () => {
        // We call the backend endpoint directly. 
        // Since it throws an error, the axios promise will fail (catch).
        axios.get(`${import.meta.env.VITE_API_URL}/debug-sentry`)
            .then(() => {
                // We should actually never get here if the server crashes properly
                toast.success("Request sent.");
            })
            .catch((err) => {
                // A 500 error means Sentry caught it!
                console.error("Sentry Test Error:", err);
                toast.success("Error triggered! Check your Sentry Dashboard.");
            });
    };

    return (
        <div className="bg-yellow-900 bg-opacity-50 border border-yellow-600 p-6 rounded-lg mt-8">
            <h3 className="text-xl font-bold text-yellow-300">Admin Panel</h3>
            <p className="text-yellow-400 text-sm my-2">These actions are for testing and maintenance purposes.</p>
            <div className="flex flex-wrap gap-4 mt-4">
                <button
                    onClick={handleEvaluate}
                    className="bg-yellow-500 text-black font-bold py-2 px-4 rounded hover:bg-yellow-400"
                >
                    Evaluate Predictions Now
                </button>

                <button
                    onClick={handleRecalculateAnalytics}
                    className="bg-blue-500 text-white font-bold py-2 px-4 rounded hover:bg-blue-400"
                >
                    Recalculate All Analytics
                </button>

                <button
                    onClick={handleCleanupOrphans}
                    className="bg-purple-600 text-white font-bold py-2 px-4 rounded hover:bg-purple-500"
                >
                    Cleanup Orphaned Predictions
                </button>

                {/* --- NEW BUTTON --- */}
                <button
                    onClick={handleTestSentry}
                    className="bg-red-600 text-white font-bold py-2 px-4 rounded hover:bg-red-500"
                >
                    Trigger Sentry Error
                </button>
            </div>
        </div>
    );
};

export default AdminPanel;