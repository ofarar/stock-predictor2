import React from 'react';
import axios from 'axios';

const AdminPanel = () => {
    const handleEvaluate = () => {
        if (window.confirm("Are you sure you want to manually evaluate all active predictions?")) {
            axios.post(`${process.env.REACT_APP_API_URL}/api/admin/evaluate`, {}, { withCredentials: true })
                .then(res => alert("Success! Evaluation job started. Check server logs."))
                .catch(err => alert("Error: You might not be an admin."));
        }
    };

    return (
        <div className="bg-yellow-900 bg-opacity-50 border border-yellow-600 p-4 rounded-lg mt-8">
            <h3 className="text-xl font-bold text-yellow-300">Admin Panel</h3>
            <p className="text-yellow-400 text-sm my-2">These actions are for testing purposes only.</p>
            <button 
                onClick={handleEvaluate}
                className="bg-yellow-500 text-black font-bold py-2 px-4 rounded hover:bg-yellow-400"
            >
                Evaluate Predictions Now
            </button>
        </div>
    );
};

export default AdminPanel;