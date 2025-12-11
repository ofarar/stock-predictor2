import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import TickerAutocomplete from './TickerAutocomplete';

const AdminBotReview = () => {
    const [pendingPredictions, setPendingPredictions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [botUser, setBotUser] = useState(null);
    const [activeJobs, setActiveJobs] = useState([]);
    const [triggerLoading, setTriggerLoading] = useState(false);

    const [pagination, setPagination] = useState({ page: 1, total: 0, totalPages: 1 });
    const [searchQuery, setSearchQuery] = useState('');
    const [specificTicker, setSpecificTicker] = useState('');
    const [sentimentConfig, setSentimentConfig] = useState({ sector: 'All', sentiment: 'Neutral' });
    const [selectedIds, setSelectedIds] = useState(new Set());
    const [confirmModal, setConfirmModal] = useState({
        isOpen: false, title: '', message: '', onConfirm: null
    });

    useEffect(() => {
        fetchPending(1);
        fetchBotUser();

        // Poll for active jobs
        const checkJobs = async () => {
            try {
                const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/admin/active-jobs`, { withCredentials: true });
                setActiveJobs(res.data.activeJobs || []);
            } catch (err) {
                console.error("Failed to poll active jobs", err);
            }
        };
        checkJobs();
        const interval = setInterval(checkJobs, 3000);
        return () => clearInterval(interval);
    }, []);

    const fetchBotUser = async () => {
        try {
            const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/admin/bot-user`, { withCredentials: true });
            setBotUser(res.data);
        } catch (err) {
            console.error("Failed to fetch bot user", err);
        }
    };

    const fetchPending = async (page = 1, search = searchQuery) => {
        try {
            setLoading(true);
            const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/admin/predictions/pending?page=${page}&limit=20&search=${search}`, { withCredentials: true });
            if (Array.isArray(res.data)) {
                setPendingPredictions(res.data);
            } else {
                if (page === 1) setPendingPredictions(res.data.predictions);
                else setPendingPredictions(prev => [...prev, ...res.data.predictions]);
                setPagination({ page: res.data.page, total: res.data.total, totalPages: res.data.totalPages });
            }
        } catch (error) {
            console.error("Error fetching predictions:", error);
            toast.error("Failed to load predictions.");
        } finally {
            setLoading(false);
        }
    };

    const handleStopJob = (jobId) => {
        triggerConfirm(`Stop ${jobId} Job`, `Are you sure you want to FORCE STOP the ${jobId} job?`, async () => {
            try {
                await axios.post(`${import.meta.env.VITE_API_URL}/api/admin/stop-job`, { jobId }, { withCredentials: true });
                toast.success(`Job ${jobId} stopped.`);
                setActiveJobs(prev => prev.filter(j => j !== jobId));
            } catch (err) {
                toast.error("Failed to stop job.");
            }
        });
    };

    const handleTriggerBot = (interval, mode) => {
        const extraMsg = specificTicker ? ` for ${specificTicker} ONLY` : '';
        triggerConfirm(`Confirm ${interval} Run`, `Run ${interval} bot batch in ${mode} mode${extraMsg}?`, async () => {
            setTriggerLoading(true);
            try {
                await axios.post(`${import.meta.env.VITE_API_URL}/api/admin/trigger-bots`, {
                    interval,
                    mode,
                    ticker: specificTicker,
                    sentimentOverrides: sentimentConfig
                }, { withCredentials: true });
                toast.success(`${interval} Bots Triggered!`);
                setActiveJobs(prev => [...prev, interval]);
                setSpecificTicker(''); // Reset after trigger
            } catch (err) {
                console.error(err);
                toast.error("Failed to trigger bots.");
            } finally {
                setTriggerLoading(false);
            }
        });
    };

    const triggerConfirm = (title, message, onConfirm) => setConfirmModal({ isOpen: true, title, message, onConfirm });

    const renderConfirmModal = () => {
        if (!confirmModal.isOpen) return null;
        return ReactDOM.createPortal(
            <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100] p-4 animate-fade-in">
                <div className="bg-gray-800 border border-gray-600 rounded-lg p-6 max-w-md w-full shadow-2xl relative animate-pop-in" onClick={e => e.stopPropagation()}>
                    <h3 className="text-xl font-bold text-white mb-2">{confirmModal.title}</h3>
                    <p className="text-gray-300 mb-6">{confirmModal.message}</p>
                    <div className="flex justify-end gap-3">
                        <button onClick={() => setConfirmModal({ ...confirmModal, isOpen: false })} className="px-4 py-2 rounded bg-gray-700 hover:bg-gray-600 text-white font-medium">Cancel</button>
                        <button onClick={() => { if (confirmModal.onConfirm) confirmModal.onConfirm(); setConfirmModal({ ...confirmModal, isOpen: false }); }} className="px-4 py-2 rounded bg-blue-600 hover:bg-blue-500 text-white font-bold shadow-lg">Confirm</button>
                    </div>
                </div>
            </div>,
            document.body
        );
    };

    const toggleSelection = (id) => {
        const newSet = new Set(selectedIds);
        if (newSet.has(id)) newSet.delete(id); else newSet.add(id);
        setSelectedIds(newSet);
    };

    const toggleSelectAll = () => {
        if (selectedIds.size === pendingPredictions.length && pendingPredictions.length > 0) setSelectedIds(new Set());
        else setSelectedIds(new Set(pendingPredictions.map(p => p._id)));
    };

    const handleBulkAction = (status) => {
        if (selectedIds.size === 0) return;
        triggerConfirm(`${status} Predictions`, `Are you sure?`, async () => {
            try {
                await axios.put(`${import.meta.env.VITE_API_URL}/api/admin/predictions/bulk-status`, { predictionIds: Array.from(selectedIds), status }, { withCredentials: true });
                toast.success(`Bulk ${status} Successful!`);
                setSelectedIds(new Set());
                fetchPending(pagination.page);
            } catch (error) { toast.error("Bulk action failed."); }
        });
    };

    const handleModeration = async (id, status) => {
        try {
            await axios.put(`${import.meta.env.VITE_API_URL}/api/admin/predictions/${id}/status`, { status }, { withCredentials: true });
            toast.success(`Prediction ${status}!`);
            setPendingPredictions(prev => {
                const updated = prev.filter(p => p._id !== id);
                if (updated.length === 0) fetchPending(pagination.page); // Auto-fetch if empty
                return updated;
            });
        } catch (error) { toast.error("Failed to update status."); }
    };

    const handleGlobalAction = (status) => {
        triggerConfirm(`${status} ALL Pending`, `DANGER: This will ${status} EVERY pending prediction (${pagination.total || pendingPredictions.length} items). Are you sure?`, async () => {
            try {
                await axios.put(`${import.meta.env.VITE_API_URL}/api/admin/predictions/all-status`, { status }, { withCredentials: true });
                toast.success(`Globally ${status} Successful!`);
                fetchPending(1); // Reset to page 1
                setSelectedIds(new Set());
            } catch (error) { toast.error("Global action failed."); }
        });
    };

    const renderControlCard = (title, interval, colorClass) => {
        const isRunning = activeJobs.includes(interval);
        return (
            <div className={`p-4 rounded-lg bg-gray-800 border ${colorClass} flex flex-col justify-between`}>
                <div>
                    <h4 className="font-bold text-lg text-white mb-2">{title}</h4>
                    <p className="text-xs text-gray-400 mb-4">Interval: {interval}</p>
                </div>
                {/* Specific Ticker Autocomplete */}
                <div className="flex gap-2 mb-2">
                    <TickerAutocomplete
                        value={specificTicker}
                        onChange={(val) => setSpecificTicker(val)}
                        placeholder="Ticker (Optional)"
                        className="w-full bg-gray-900 border border-gray-700 rounded px-2 py-1 text-xs text-white text-center tracking-wider"
                    />
                </div>
                {isRunning ? (
                    <div className="flex flex-col gap-2">
                        <div className="text-yellow-400 text-sm font-mono animate-pulse">Running...</div>
                        <button onClick={() => handleStopJob(interval)} className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-2 rounded text-sm">STOP EXECUTION</button>
                    </div>
                ) : (
                    <div className="flex gap-2">
                        <button onClick={() => handleTriggerBot(interval, 'inference')} disabled={triggerLoading} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 rounded text-xs">Run Daily</button>
                        <button onClick={() => handleTriggerBot(interval, 'train')} disabled={triggerLoading} className="flex-1 bg-pink-600 hover:bg-pink-700 text-white font-bold py-2 rounded text-xs">Train</button>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="p-4 bg-gray-800 rounded-lg shadow-xl relative">
            {renderConfirmModal()}
            <div className="flex flex-col gap-6 mb-6">
                <div className="flex justify-between items-start">
                    <div>
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                            🤖 Bot Governance <span className="bg-yellow-500 text-black text-xs px-2 py-1 rounded-full">{pagination.total || pendingPredictions.length} Pending</span>
                        </h2>
                        {/* Moved Actions to below Bot Controls */}
                        {botUser && (
                            <div className="text-xs text-gray-400 mt-1 flex gap-3">
                                <span>Last Trained: {botUser.aiMetrics?.lastRetrained ? new Date(botUser.aiMetrics.lastRetrained).toLocaleDateString() : 'Never'}</span>
                                <span>Val Accuracy: {botUser.aiMetrics?.trainingAccuracy ? Number(botUser.aiMetrics.trainingAccuracy).toFixed(2) : 0}%</span>
                            </div>
                        )}
                    </div>

                    {/* Search Autocomplete */}
                    {/* Moved Search to below Bot Controls */}
                </div>

                {/* SENTIMENT CONTROLS */}
                <div className="bg-gray-700/30 p-4 rounded mb-6 border border-gray-600">
                    <h3 className="text-white font-bold text-sm mb-3 flex items-center gap-2">📢 Market Sentiment Override <span className="text-gray-400 text-xs font-normal">(Effects next run)</span></h3>
                    <div className="flex gap-4 items-center flex-wrap">
                        <div className="flex flex-col">
                            <label className="text-xs text-gray-400 mb-1">Target Sector</label>
                            <select value={sentimentConfig.sector} onChange={(e) => setSentimentConfig({ ...sentimentConfig, sector: e.target.value })} className="bg-gray-800 text-white border border-gray-600 rounded px-3 py-1 text-sm outline-none focus:border-blue-500">
                                <option value="All">All Market</option>
                                <option value="Technology">Technology</option>
                                <option value="Finance">Finance</option>
                                <option value="Energy">Energy</option>
                                <option value="Healthcare">Healthcare</option>
                                <option value="Consumer">Consumer</option>
                            </select>
                        </div>
                        <div className="flex flex-col">
                            <label className="text-xs text-gray-400 mb-1">Sentiment Bias</label>
                            <select value={sentimentConfig.sentiment} onChange={(e) => setSentimentConfig({ ...sentimentConfig, sentiment: e.target.value })} className="bg-gray-800 text-white border border-gray-600 rounded px-3 py-1 text-sm outline-none focus:border-blue-500">
                                <option value="Strong Bearish">Strong Bearish (-10%)</option>
                                <option value="Bearish">Bearish (-5%)</option>
                                <option value="Neutral">Neutral (0%)</option>
                                <option value="Bullish">Bullish (+5%)</option>
                                <option value="Strong Bullish">Strong Bullish (+10%)</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* BOT CONTROLS */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                    {renderControlCard("Daily Fleet", "Daily", "border-blue-500")}
                    {renderControlCard("Weekly Fleet", "Weekly", "border-purple-500")}
                    {renderControlCard("Monthly Fleet", "Monthly", "border-green-500")}
                    {renderControlCard("Quarterly Fleet", "Quarterly", "border-yellow-500")}
                </div>

                {/* SIGMA ALPHA SPECIAL */}
                <div className="p-3 bg-red-900/20 border border-red-800 rounded flex justify-between items-center">
                    <span className="text-xs text-red-400 font-bold uppercase flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>Sigma Alpha (Expensive)</span>
                    <div className="flex gap-2">
                        {activeJobs.includes('SigmaAlpha') ? (
                            <button onClick={() => handleStopJob('SigmaAlpha')} className="bg-red-600 hover:bg-red-700 text-white font-bold py-1.5 px-3 rounded text-xs">STOP</button>
                        ) : (
                            <>
                                <button onClick={() => handleTriggerBot('SigmaAlpha', 'inference')} className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold py-1.5 px-3 rounded border border-emerald-500">Run Inference</button>
                                <button onClick={() => handleTriggerBot('SigmaAlpha', 'train')} className="bg-red-700 hover:bg-red-600 text-white text-xs font-bold py-1.5 px-3 rounded border border-red-500">Train Model</button>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* NEW: Global Controls Bar (Search & Bulk Actions) */}
            <div className="bg-gray-700/40 p-4 rounded mb-6 border border-gray-600 flex flex-col md:flex-row gap-4 justify-between items-center">
                {/* Global Approve/Reject */}
                <div className="flex gap-2 w-full md:w-auto">
                    <button onClick={() => handleGlobalAction('Active')} className="flex-1 md:flex-none px-4 py-2 bg-green-700 hover:bg-green-600 text-white text-xs font-bold rounded shadow border border-green-500 whitespace-nowrap">
                        Approve ALL ({pagination.total || pendingPredictions.length})
                    </button>
                    <button onClick={() => handleGlobalAction('Rejected')} className="flex-1 md:flex-none px-4 py-2 bg-red-700 hover:bg-red-600 text-white text-xs font-bold rounded shadow border border-red-500 whitespace-nowrap">
                        Reject ALL
                    </button>
                </div>

                {/* Search */}
                <div className="flex gap-2 w-full md:w-auto items-center">
                    <div className="flex-grow">
                        <TickerAutocomplete
                            value={searchQuery}
                            onChange={(val) => setSearchQuery(val)}
                            onSelect={(val) => { setSearchQuery(val); fetchPending(1, val); }}
                            placeholder="Search Pending..."
                            className="bg-gray-900 border border-gray-500 rounded px-3 py-2 text-sm w-full outline-none focus:border-blue-500"
                        />
                    </div>
                    <button onClick={() => fetchPending(1, searchQuery)} className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded text-sm font-bold shadow-lg">
                        Go
                    </button>
                </div>
            </div>

            {/* PREDICTION LIST */}
            {loading ? <div className="text-white text-center py-4">Loading...</div> : (
                pendingPredictions.length === 0 ? <div className="bg-gray-700/30 p-6 rounded-lg text-center text-gray-400 border border-gray-700 border-dashed"><p>No pending predictions.</p></div> : (
                    <div className="space-y-4">
                        <div className="flex justify-between items-center bg-gray-700/30 p-2 rounded mb-4">
                            <div className="flex items-center gap-2 px-2">
                                <input type="checkbox" checked={selectedIds.size === pendingPredictions.length && pendingPredictions.length > 0} onChange={toggleSelectAll} className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-blue-600" />
                                <span className="text-gray-400 text-xs uppercase font-bold tracking-wider">Select All</span>
                            </div>
                            {selectedIds.size > 0 && (
                                <div className="flex gap-2 items-center">
                                    <span className="text-white text-sm font-bold mr-2">{selectedIds.size} Selected</span>
                                    <button onClick={() => handleBulkAction('Active')} className="bg-green-600 hover:bg-green-500 text-white text-xs font-bold py-1 px-3 rounded shadow-sm">Approve Selected</button>
                                    <button onClick={() => handleBulkAction('Rejected')} className="bg-red-600 hover:bg-red-500 text-white text-xs font-bold py-1 px-3 rounded shadow-sm">Reject Selected</button>
                                </div>
                            )}
                        </div>
                        {pendingPredictions.map(pred => (
                            <div key={pred._id} className={`p-4 rounded-lg flex flex-col md:flex-row justify-between gap-4 border transition-colors ${selectedIds.has(pred._id) ? 'bg-blue-900/20 border-blue-500' : 'bg-gray-700 border-gray-600'}`}>
                                <div className="flex items-start gap-3 flex-grow">
                                    <input type="checkbox" checked={selectedIds.has(pred._id)} onChange={() => toggleSelection(pred._id)} className="mt-1.5 w-5 h-5 rounded border-gray-500 bg-gray-800 text-blue-600 cursor-pointer" />
                                    <div className="flex-grow">
                                        <div className="flex items-center gap-2 mb-2"><span className="font-bold text-green-400 text-lg">{pred.stockTicker}</span><span className={`text-xs px-2 py-0.5 rounded ${pred.userId?.isBot ? 'bg-purple-900 text-purple-200 border border-purple-500' : 'bg-blue-900 text-blue-200'}`}>{pred.userId?.isBot ? 'AI BOT' : 'USER'}</span><span className="text-gray-400 text-sm">Target: ${pred.targetPrice}</span></div>
                                        <div className="text-gray-300 text-sm italic bg-gray-900/50 p-3 rounded border border-gray-600 max-h-60 overflow-y-auto whitespace-pre-wrap font-mono">"{pred.description}"</div>
                                        <div className="text-xs text-gray-500 mt-2 flex justify-between"><span>Current: ${pred.priceAtCreation}</span><span>{new Date(pred.createdAt).toLocaleString()}</span></div>
                                    </div>
                                </div>
                                <div className="flex flex-row md:flex-col justify-center gap-2 min-w-[100px]">
                                    <button onClick={() => handleModeration(pred._id, 'Active')} className="bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded text-sm font-bold shadow-lg">Approve</button>
                                    <button onClick={() => handleModeration(pred._id, 'Rejected')} className="bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded text-sm font-bold shadow-lg">Reject</button>
                                </div>
                            </div>
                        ))}
                        <div className="flex justify-between items-center mt-6 pt-4 border-t border-gray-700">
                            <div className="text-sm text-gray-400">Page {pagination.page} of {pagination.totalPages}</div>
                            <div className="flex gap-2">
                                <button onClick={() => fetchPending(pagination.page - 1)} disabled={pagination.page <= 1} className="bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-white px-3 py-1 rounded text-sm">Previous</button>
                                <button onClick={() => fetchPending(pagination.page + 1)} disabled={pagination.page >= pagination.totalPages} className="bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-white px-3 py-1 rounded text-sm">Next</button>
                            </div>
                        </div>
                    </div>
                )
            )}
        </div>
    );
};
export default AdminBotReview;
