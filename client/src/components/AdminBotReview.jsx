import React, { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';

const AdminBotReview = () => {
    const [pendingPredictions, setPendingPredictions] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchPending();
    }, []);

    const fetchPending = async () => {
        try {
            const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/admin/predictions/pending`, { withCredentials: true });
            setPendingPredictions(res.data);
        } catch (error) {
            console.error("Error fetching pending predictions:", error);
            toast.error("Failed to load pending predictions.");
        } finally {
            setLoading(false);
        }
    };

    const handleModeration = async (id, status) => {
        try {
            await axios.put(`${import.meta.env.VITE_API_URL}/api/admin/predictions/${id}/status`, { status }, { withCredentials: true });
            toast.success(`Prediction ${status === 'Active' ? 'Approved' : 'Rejected'}!`);
            // Remove from list locally
            setPendingPredictions(prev => prev.filter(p => p._id !== id));
        } catch (error) {
            console.error("Error updating status:", error);
            toast.error("Failed to update status.");
        }
    };

    // Early returns removed to ensure Controls are always visible.
    // Loading and Empty states are handled in the main render block.

    const [botUser, setBotUser] = useState(null);

    useEffect(() => {
        fetchBotUser();
    }, []);

    const fetchBotUser = async () => {
        try {
            const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/admin/all-users?isBot=true`, { withCredentials: true });
            if (res.data && res.data.length > 0) {
                setBotUser(res.data[0]);
            }
        } catch (error) {
            console.error("Error fetching bot user:", error);
        }
    };

    const triggerBot = async (mode) => {
        try {
            toast.loading(`Starting ${mode} sequence...`);
            await axios.post(`${import.meta.env.VITE_API_URL}/api/admin/trigger-bot`, { mode }, { withCredentials: true });
            toast.dismiss();
            toast.success(`Bot triggered in ${mode} mode!`);
        } catch (error) {
            toast.dismiss();
            toast.error("Failed to trigger bot.");
        }
    };

    // ... (rest of moderation logic)

    return (
        <div className="bg-gray-800 p-6 rounded-lg mb-8">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        🤖 Bot Governance
                        <span className="bg-yellow-500 text-black text-xs px-2 py-1 rounded-full">{pendingPredictions.length} Pending</span>
                    </h2>
                    {botUser && (
                        <div className="text-xs text-gray-400 mt-1 flex gap-3">
                            <span>Last Trained: {botUser.aiMetrics?.lastRetrained ? new Date(botUser.aiMetrics.lastRetrained).toLocaleDateString() : 'Never'}</span>
                            <span>Val Accuracy: {botUser.aiMetrics?.trainingAccuracy || 0}%</span>
                            <span>Model: {botUser.aiMetrics?.specialization || 'N/A'}</span>
                        </div>
                    )}
                </div>

                <div className="flex gap-2">
                    <button
                        onClick={() => triggerBot('inference')}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded text-xs font-bold transition-colors"
                    >
                        ⚡ Run Daily Inference
                    </button>
                    <button
                        onClick={() => triggerBot('train')}
                        className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-1.5 rounded text-xs font-bold transition-colors"
                    >
                        🧠 Run Quarterly Training
                    </button>
                </div>
            </div>

            {loading ? <div>Loading Pending Predictions...</div> : (
                pendingPredictions.length === 0 ? (
                    <div className="bg-gray-700/30 p-6 rounded-lg text-center text-gray-400 border border-gray-700 border-dashed">
                        <p>No pending predictions to review.</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {pendingPredictions.map(pred => (
                            <div key={pred._id} className="bg-gray-700 p-4 rounded-lg flex flex-col md:flex-row justify-between gap-4 border border-gray-600">
                                <div className="flex-grow">
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className="font-bold text-green-400 text-lg">{pred.stockTicker}</span>
                                        <span className={`text-xs px-2 py-0.5 rounded ${pred.userId?.isBot ? 'bg-purple-900 text-purple-200 border border-purple-500' : 'bg-blue-900 text-blue-200'}`}>
                                            {pred.userId?.isBot ? 'AI BOT' : 'USER'}
                                        </span>
                                        <span className="text-gray-400 text-sm">Target: ${pred.targetPrice}</span>
                                    </div>
                                    <div className="text-gray-300 text-sm italic bg-gray-900/50 p-3 rounded border border-gray-600 max-h-60 overflow-y-auto whitespace-pre-wrap font-mono">
                                        "{pred.description}"
                                    </div>
                                    <div className="text-xs text-gray-500 mt-2 flex justify-between">
                                        <span>Current: ${pred.priceAtCreation}</span>
                                        <span>{new Date(pred.createdAt).toLocaleString()}</span>
                                    </div>
                                </div>
                                <div className="flex flex-row md:flex-col justify-center gap-2 min-w-[100px]">
                                    <button
                                        onClick={() => handleModeration(pred._id, 'Active')}
                                        className="bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded text-sm font-bold shadow-lg"
                                    >
                                        Approve
                                    </button>
                                    <button
                                        onClick={() => handleModeration(pred._id, 'Rejected')}
                                        className="bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded text-sm font-bold shadow-lg"
                                    >
                                        Reject
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )
            )}
        </div>
    );
};

export default AdminBotReview;
