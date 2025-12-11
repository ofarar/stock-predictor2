import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import toast from 'react-hot-toast';
import axios from 'axios';
import TickerAutocomplete from './TickerAutocomplete';

const GoldPredictModal = ({ isOpen, onClose, onPredictionSuccess }) => {
    const [predictionResult, setPredictionResult] = useState(null);
    const [ticker, setTicker] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    // Reset state when modal opens/closes
    React.useEffect(() => {
        if (isOpen) {
            setPredictionResult(null);
            setTicker('');
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleRunAnalysis = async () => {
        if (!ticker) return toast.error("Please enter a ticker.");

        setIsLoading(true);
        // const toastId = toast.loading(`Analyzing ${ticker} with Gold Engine...`);

        try {
            const res = await axios.post(
                `${import.meta.env.VITE_API_URL}/api/admin/predict-gold`,
                { ticker },
                { withCredentials: true }
            );

            // toast.dismiss(toastId);
            setPredictionResult(res.data);

            // Optional: Still show a small toast for history/confirmation
            toast.success("Analysis Complete!");

            if (onPredictionSuccess) onPredictionSuccess(res.data);
            // onClose(); // formatted: Don't close, show result!
        } catch (error) {
            // toast.dismiss(toastId);
            toast.error(error.response?.data?.message || "Analysis Failed");
        } finally {
            setIsLoading(false);
        }
    };

    // --- RENDER RESULT VIEW ---
    const renderResultView = () => {
        if (!predictionResult) return null;
        const { ticker, current_price, prediction, target_price, pct_move, timeframe, rationale, interval } = predictionResult;
        const isBullish = prediction === 'Bullish';

        return (
            <div className="flex flex-col items-center animate-fade-in">
                <div className="w-full border-b border-gray-600 pb-4 mb-4 flex justify-between items-start">
                    <div>
                        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                            ⚡ {ticker}
                            <span className="text-sm font-normal text-gray-400 bg-gray-700 px-2 py-0.5 rounded-full border border-gray-600">
                                {interval === '1d' ? 'Daily' : 'Intraday'}
                            </span>
                        </h2>
                        <div className="text-gray-400 text-sm mt-1">Current: <span className="text-white font-mono">${current_price?.toFixed(2)}</span></div>
                    </div>
                    {/* Timeframe Badge */}
                    <div className="flex flex-col items-end">
                        <span className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Horizon</span>
                        <span className="bg-yellow-500/10 text-yellow-400 border border-yellow-500/50 px-3 py-1 rounded font-mono text-sm shadow-sm whitespace-nowrap">
                            ⏱ {timeframe}
                        </span>
                    </div>
                </div>

                <div className={`w-full p-6 rounded-xl border mb-6 flex flex-col items-center text-center shadow-2xl relative overflow-hidden ${isBullish ? 'bg-green-900/20 border-green-500/50' : 'bg-red-900/20 border-red-500/50'}`}>
                    <div className={`absolute top-0 left-0 w-full h-1 ${isBullish ? 'bg-green-500' : 'bg-red-500'}`}></div>

                    <span className={`text-3xl font-black uppercase tracking-widest mb-2 ${isBullish ? 'text-green-400' : 'text-red-400'}`}>
                        {prediction}
                    </span>

                    <div className="flex items-baseline gap-2 mb-4">
                        <span className="text-gray-300 text-lg">Target:</span>
                        <span className="text-white text-4xl font-mono font-bold">${target_price?.toFixed(2)}</span>
                    </div>

                    <span className={`px-3 py-1 rounded text-sm font-bold border ${isBullish ? 'bg-green-900/40 text-green-300 border-green-500/30' : 'bg-red-900/40 text-red-300 border-red-500/30'}`}>
                        Expected Move: {pct_move > 0 ? '+' : ''}{(pct_move * 100).toFixed(2)}%
                    </span>
                </div>

                <div className="w-full bg-gray-900/50 p-4 rounded border border-gray-700 mb-6">
                    <span className="text-xs text-gray-500 uppercase font-bold block mb-1">AI Rationale</span>
                    <p className="text-gray-300 text-sm italic leading-relaxed">"{rationale}"</p>
                </div>

                <button
                    onClick={onClose}
                    className="w-full bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 rounded-lg transition-colors border border-gray-600"
                >
                    Close Result
                </button>
            </div>
        );
    };

    return ReactDOM.createPortal(
        <div
            className="fixed inset-0 bg-black bg-opacity-75 backdrop-blur-sm flex justify-center items-center z-[60] animate-fade-in"
            onClick={onClose}
        >
            <div
                className="relative bg-gray-800 border border-yellow-500/50 rounded-xl shadow-2xl p-6 w-full max-w-md overflow-visible animate-pop-in"
                onClick={e => e.stopPropagation()}
            >
                {!predictionResult && (
                    <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                )}

                {!predictionResult ? (
                    <>
                        <div className="flex flex-col items-center mb-6">
                            <span className="text-4xl mb-2">⚡</span>
                            <h2 className="text-2xl font-bold text-white">Instant Predict</h2>
                            <p className="text-gray-400 text-sm mt-1 text-center">
                                Run short-term technical analysis on any asset.
                            </p>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1">Stock Ticker</label>
                                <TickerAutocomplete
                                    value={ticker}
                                    onChange={setTicker}
                                    onSelect={(val) => setTicker(val)}
                                    placeholder="e.g. AAPL, BTC-USD, GLD"
                                    className="bg-gray-900 border-gray-700"
                                />
                                <p className="text-[10px] text-gray-500 mt-1 text-right">Targets Intraday (1H). Fallback to Daily.</p>
                            </div>

                            <button
                                onClick={handleRunAnalysis}
                                disabled={isLoading || !ticker}
                                className={`w-full py-3 rounded-lg font-bold text-lg shadow-lg flex justify-center items-center gap-2 mt-4 transition-all
                                    ${isLoading || !ticker
                                        ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                                        : 'bg-gradient-to-r from-yellow-600 to-amber-600 text-white hover:from-yellow-500 hover:to-amber-500 hover:shadow-yellow-500/20'
                                    }`}
                            >
                                {isLoading ? (
                                    <>
                                        <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                        Analyzing...
                                    </>
                                ) : (
                                    'Run Analysis'
                                )}
                            </button>
                        </div>
                    </>
                ) : (
                    renderResultView()
                )}
            </div>
        </div>,
        document.body
    );
};

export default GoldPredictModal;
