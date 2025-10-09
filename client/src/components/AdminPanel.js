// src/components/AdminPanel.js

import React from 'react';
import axios from 'axios';
import toast from 'react-hot-toast'; // Make sure toast is imported

const AdminPanel = () => {
    const handleEvaluate = () => {
        if (window.confirm("Are you sure you want to manually evaluate all active predictions?")) {
            axios.post(`${process.env.REACT_APP_API_URL}/api/admin/evaluate`, {}, { withCredentials: true })
                .then(res => toast.success("Evaluation job started."))
                .catch(err => toast.error("Error: You might not be an admin."));
        }
    };

    // Function for the new button
    const handleRecalculateBadges = () => {
        if (window.confirm("Are you sure you want to recalculate badges for ALL existing users? This may take some time.")) {
            const promise = axios.post(`${process.env.REACT_APP_API_URL}/api/admin/recalculate-badges`, {}, { withCredentials: true });

            toast.promise(promise, {
                loading: 'Recalculating all badges...',
                success: 'Badges recalculated successfully!',
                error: 'Failed to recalculate badges.'
            });
        }
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
                {/* New Button */}
                <button 
                    onClick={handleRecalculateBadges}
                    className="bg-blue-500 text-white font-bold py-2 px-4 rounded hover:bg-blue-400"
                >
                    Recalculate All Badges
                </button>
            </div>
        </div>
    );
};

export default AdminPanel;