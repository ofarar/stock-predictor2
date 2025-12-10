import React, { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';

const AdminBotReview = () => {
    const [pendingPredictions, setPendingPredictions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [botUser, setBotUser] = useState(null);

    const [pagination, setPagination] = useState({ page: 1, total: 0, totalPages: 1 });

    useEffect(() => {
        fetchPending(1);
        fetchBotUser();
    }, []);

    const fetchBotUser = async () => {
        try {
            const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/admin/bot-user`, { withCredentials: true });
            setBotUser(res.data);
        } catch (err) {
            console.error("Failed to fetch bot user", err);
        }
    };

    const fetchPending = async (page = 1) => {
        try {
            setLoading(true);
            const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/admin/predictions/pending?page=${page}&limit=20`, { withCredentials: true });

            // Handle both legacy (array) and new (object) formats temporarily for safety
            if (Array.isArray(res.data)) {
                setPendingPredictions(res.data);
            } else {
                if (page === 1) {
                    setPendingPredictions(res.data.predictions);
                } else {
                    setPendingPredictions(prev => [...prev, ...res.data.predictions]);
                }
                setPagination({
                    page: res.data.page,
                    total: res.data.total,
                    totalPages: res.data.totalPages
                });
            }
        } catch (error) {
            console.error("Error fetching pending predictions:", error);
            toast.error("Failed to load pending predictions.");
        } finally {
            setLoading(false);
        }
    };

    const [selectedIds, setSelectedIds] = useState(new Set());

    // --- CONFIRM MODAL STATE ---
    const [confirmModal, setConfirmModal] = useState({
        isOpen: false,
        title: '',
        message: '',
        onConfirm: null
    });

    const triggerConfirm = (title, message, onConfirm) => {
        setConfirmModal({ isOpen: true, title, message, onConfirm });
    };

    const renderConfirmModal = () => {
        if (!confirmModal.isOpen) return null;
        return (
            <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
                <div className="bg-gray-800 border border-gray-600 rounded-lg p-6 max-w-md w-full shadow-2xl relative">
                    <h3 className="text-xl font-bold text-white mb-2">{confirmModal.title}</h3>
                    <p className="text-gray-300 mb-6">{confirmModal.message}</p>
                    <div className="flex justify-end gap-3">
                        <button
                            onClick={() => setConfirmModal({ ...confirmModal, isOpen: false })}
                            className="px-4 py-2 rounded bg-gray-700 hover:bg-gray-600 text-white font-medium"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={() => {
                                if (confirmModal.onConfirm) confirmModal.onConfirm();
                                setConfirmModal({ ...confirmModal, isOpen: false });
                            }}
                            className="px-4 py-2 rounded bg-blue-600 hover:bg-blue-500 text-white font-bold shadow-lg"
                        >
                            Confirm
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    const toggleSelection = (id) => {
        const newSet = new Set(selectedIds);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setSelectedIds(newSet);
    };

    const toggleSelectAll = () => {
        if (selectedIds.size === pendingPredictions.length && pendingPredictions.length > 0) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(pendingPredictions.map(p => p._id)));
        }
    };

    const handleBulkAction = (status) => {
        if (selectedIds.size === 0) return;

        triggerConfirm(
            `${status === 'Active' ? 'Approve' : 'Reject'} Predictions`,
            `Are you sure you want to ${status === 'Active' ? 'APPROVE' : 'REJECT'} ${selectedIds.size} selected predictions?`,
            async () => {
                try {
                    await axios.put(`${import.meta.env.VITE_API_URL}/api/admin/predictions/bulk-status`, {
                        predictionIds: Array.from(selectedIds),
                        status
                    }, { withCredentials: true });

                    toast.success(`Bulk ${status} Successful!`);
                    setPendingPredictions(prev => prev.filter(p => !selectedIds.has(p._id)));
                    setSelectedIds(new Set());
                } catch (error) {
                    toast.error("Bulk action failed.");
                }
            }
        );
    };

    const handleModeration = async (id, status) => {
        try {
            await axios.put(`${import.meta.env.VITE_API_URL}/api/admin/predictions/${id}/status`, { status }, { withCredentials: true });
            toast.success(`Prediction ${status === 'Active' ? 'Approved' : 'Rejected'}!`);
            setPendingPredictions(prev => prev.filter(p => p._id !== id));
        } catch (error) {
            console.error("Error updating status:", error);
            toast.error("Failed to update status.");
        }
    };

    // ... (rest of botUser fetch and triggerBot)

    return (
        <div className="p-4 bg-gray-800 rounded-lg shadow-xl relative">
            {renderConfirmModal()}
            <div className="flex flex-col gap-6 mb-6">
                <div className="flex justify-between items-start">
                    <div>
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                            🤖 Bot Governance
                            <span className="bg-yellow-500 text-black text-xs px-2 py-1 rounded-full">
                                {pagination.total || pendingPredictions.length} Pending
                            </span>
                        </h2>

                        {/* BULK ACTIONS BAR */}
                        {selectedIds.size > 0 && (
                            <div className="mt-2 flex gap-2 items-center bg-gray-700/50 p-2 rounded border border-gray-600 animate-fade-in">
                                <span className="text-white text-sm font-bold ml-1">{selectedIds.size} Selected</span>
                                <button
                                    onClick={() => handleBulkAction('Active')}
                                    className="bg-green-600 hover:bg-green-500 text-white text-xs font-bold py-1 px-3 rounded shadow-sm"
                                >
                                    Approve Selected
                                </button>
                                <button
                                    onClick={() => handleBulkAction('Rejected')}
                                    className="bg-red-600 hover:bg-red-500 text-white text-xs font-bold py-1 px-3 rounded shadow-sm"
                                >
                                    Reject Selected
                                </button>
                            </div>
                        )}

                        {botUser && (
                            <div className="text-xs text-gray-400 mt-1 flex gap-3">
                                <span>Last Trained: {botUser.aiMetrics?.lastRetrained ? new Date(botUser.aiMetrics.lastRetrained).toLocaleDateString() : 'Never'}</span>
                                <span>Val Accuracy: {botUser.aiMetrics?.trainingAccuracy ? Number(botUser.aiMetrics.trainingAccuracy).toFixed(2) : 0}%</span>
                                <span>Model: {botUser.aiMetrics?.specialization || 'N/A'}</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* BOT CONTROLS */}
                <div className="flex flex-col gap-4 w-full">
                    {/* TRAINING CONTROLS (EXPENSIVE) */}
                    <div className="flex flex-col gap-2 p-3 bg-red-900/20 border border-red-800 rounded">
                        <span className="text-xs text-red-400 font-bold uppercase tracking-wider flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                            Model Training (Expensive Operations)
                        </span>
                        <div className="flex flex-wrap gap-2">
                            <button
                                onClick={() => {
                                    triggerConfirm(
                                        "Train Sigma Alpha",
                                        "This will fetch detailed macro/earnings data and retrain the event-driven model. This is an expensive operation. Proceed?",
                                        () => {
                                            axios.post(`${import.meta.env.VITE_API_URL}/api/admin/trigger-bots`, { interval: 'SigmaAlpha', mode: 'train' }, { withCredentials: true })
                                                .then(() => toast.success("Sigma Alpha Training Started!"))
                                                .catch(() => toast.error("Failed."));
                                        }
                                    );
                                }}
                                className="bg-gradient-to-r from-red-700 to-pink-700 text-white text-xs font-bold py-1.5 px-3 rounded hover:from-red-600 hover:to-pink-600 shadow-md border border-red-500"
                            >
                                Train Sigma Alpha
                            </button>
                            <div className="w-px bg-red-800 mx-1"></div>
                            {['Daily', 'Weekly', 'Monthly', 'Quarterly'].map(interval => (
                                <button
                                    key={interval}
                                    onClick={() => {
                                        triggerConfirm(
                                            `Retrain ${interval} Models`,
                                            `This will re-fetch history and train fresh models for the ${interval} fleet. Proceed?`,
                                            () => {
                                                axios.post(`${import.meta.env.VITE_API_URL}/api/admin/trigger-bots`, { interval, mode: 'train' }, { withCredentials: true })
                                                    .then(() => toast.success(`${interval} Training Started!`))
                                                    .catch(() => toast.error("Failed."));
                                            }
                                        );
                                    }}
                                    className="bg-red-900/60 border border-red-600 text-red-200 text-xs font-bold py-1.5 px-3 rounded hover:bg-red-800 transition-colors"
                                >
                                    Train {interval}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* INFERENCE CONTROLS */}
                    <div className="flex flex-col gap-2 p-3 bg-blue-900/20 border border-blue-800 rounded">
                        <span className="text-xs text-blue-400 font-bold uppercase tracking-wider flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                            Inference / Execution (Fast)
                        </span>
                        <div className="flex flex-wrap gap-2">
                            <button
                                onClick={() => {
                                    triggerConfirm(
                                        "Run Sigma Alpha Inference",
                                        "Do you want to run the Sigma Alpha inference cycle? This will generate new predictions based on the existing model.",
                                        () => {
                                            axios.post(`${import.meta.env.VITE_API_URL}/api/admin/trigger-bots`, { interval: 'SigmaAlpha', mode: 'inference' }, { withCredentials: true })
                                                .then(() => toast.success("Sigma Alpha Inference Started!"))
                                                .catch(() => toast.error("Failed."));
                                        }
                                    );
                                }}
                                className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-xs font-bold py-1.5 px-3 rounded hover:brightness-110 shadow-md border border-emerald-500"
                            >
                                Run Sigma Alpha
                            </button>
                            <div className="w-px bg-blue-800 mx-1"></div>
                            {['Daily', 'Weekly', 'Monthly', 'Quarterly'].map(interval => (
                                <button
                                    key={interval}
                                    onClick={() => {
                                        triggerConfirm(
                                            `Run ${interval} Inference`,
                                            `Do you want to run the ${interval} inference cycle? This is a fast operation.`,
                                            () => {
                                                axios.post(`${import.meta.env.VITE_API_URL}/api/admin/trigger-bots`, { interval, mode: 'inference' }, { withCredentials: true })
                                                    .then(() => toast.success(`${interval} Inference Started!`))
                                                    .catch(() => toast.error("Failed."));
                                            }
                                        );
                                    }}
                                    className="bg-blue-800/60 border border-blue-600 text-blue-200 text-xs font-bold py-1.5 px-3 rounded hover:bg-blue-700 transition-colors"
                                >
                                    Run {interval}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* PREDICTION LIST */}
            {loading ? <div className="text-white text-center py-4">Loading Pending Predictions...</div> : (
                pendingPredictions.length === 0 ? (
                    <div className="bg-gray-700/30 p-6 rounded-lg text-center text-gray-400 border border-gray-700 border-dashed">
                        <p>No pending predictions to review.</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {/* SELECT ALL */}
                        <div className="flex items-center gap-2 mb-2 px-2">
                            <input
                                type="checkbox"
                                checked={selectedIds.size === pendingPredictions.length && pendingPredictions.length > 0}
                                onChange={toggleSelectAll}
                                className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-blue-600 focus:ring-blue-500"
                            />
                            <span className="text-gray-400 text-xs uppercase font-bold tracking-wider">Select All on Page</span>
                        </div>

                        {pendingPredictions.map(pred => (
                            <div key={pred._id} className={`p-4 rounded-lg flex flex-col md:flex-row justify-between gap-4 border transition-colors ${selectedIds.has(pred._id) ? 'bg-blue-900/20 border-blue-500' : 'bg-gray-700 border-gray-600'}`}>
                                <div className="flex items-start gap-3 flex-grow">
                                    <input
                                        type="checkbox"
                                        checked={selectedIds.has(pred._id)}
                                        onChange={() => toggleSelection(pred._id)}
                                        className="mt-1.5 w-5 h-5 rounded border-gray-500 bg-gray-800 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                    />
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

                        {/* Pagination Controls */}
                        <div className="flex justify-between items-center mt-6 pt-4 border-t border-gray-700">
                            <div className="text-sm text-gray-400">
                                Page {pagination.page} of {pagination.totalPages}
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => fetchPending(pagination.page - 1)}
                                    disabled={pagination.page <= 1}
                                    className="bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-white px-3 py-1 rounded text-sm"
                                >
                                    Previous
                                </button>
                                <button
                                    onClick={() => fetchPending(pagination.page + 1)}
                                    disabled={pagination.page >= pagination.totalPages}
                                    className="bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-white px-3 py-1 rounded text-sm"
                                >
                                    Next
                                </button>
                            </div>
                        </div>

                    </div>
                )
            )}
        </div>
    );
};
export default AdminBotReview;


