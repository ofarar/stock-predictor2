import React, { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';

const AIWizardPage = ({ user }) => {
    const [isOnWaitlist, setIsOnWaitlist] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (user) {
            axios.get(`${process.env.REACT_APP_API_URL}/api/ai-wizard/waitlist-status`, { withCredentials: true })
                .then(res => setIsOnWaitlist(res.data.isOnWaitlist))
                .finally(() => setIsLoading(false));
        } else {
            setIsLoading(false);
        }
    }, [user]);

    const handleJoinWaitlist = () => { /* ... (this function is unchanged) ... */ };

    return (
        // --- FIX: Removed vertical padding 'py-12' and added 'pt-4' to reduce top space ---
        <div className="max-w-4xl mx-auto text-center animate-fade-in pt-4">
            <span className="bg-blue-500 text-white font-bold text-sm px-3 py-1 rounded-full">COMING SOON</span>
            <h1 className="text-4xl md:text-5xl font-bold text-white mt-4">AI Portfolio Assist</h1>
            <p className="text-lg text-gray-400 mt-4 max-w-2xl mx-auto">
                Get personalized stock recommendations based on the patterns of our top-performing predictors.
            </p>

            <div className="bg-gray-800 p-8 rounded-lg mt-10">
                <h2 className="text-2xl font-semibold text-green-400 mb-8">How It Works</h2>
                {/* --- FIX: Changed from a grid to a horizontally scrollable flex container --- */}
                <div className="flex gap-6 overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800">
                    <div className="flex-shrink-0 w-64 flex flex-col items-center">
                        <div className="flex items-center justify-center w-16 h-16 rounded-full bg-gray-700 mb-4">
                            <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"></path></svg>
                        </div>
                        <h3 className="font-bold text-white mb-2">Define Your Style</h3>
                        <p className="text-sm text-gray-400">Answer a few questions about your investment timeframe and interests.</p>
                    </div>
                    <div className="flex-shrink-0 w-64 flex flex-col items-center">
                        <div className="flex items-center justify-center w-16 h-16 rounded-full bg-gray-700 mb-4">
                            <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0m-8.486-2.828l-.707.707M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                        </div>
                        <h3 className="font-bold text-white mb-2">AI Analyzes Data</h3>
                        <p className="text-sm text-gray-400">Our system finds top predictors who consistently win in your areas of interest.</p>
                    </div>
                    <div className="flex-shrink-0 w-64 flex flex-col items-center">
                        <div className="flex items-center justify-center w-16 h-16 rounded-full bg-gray-700 mb-4">
                            <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"></path></svg>
                        </div>
                        <h3 className="font-bold text-white mb-2">Get Insights</h3>
                        <p className="text-sm text-gray-400">Receive a curated feed of stocks that our best analysts are watching.</p>
                    </div>
                </div>
            </div>

            <div className="mt-10">
                {user ? (
                    <button
                        onClick={handleJoinWaitlist}
                        disabled={isLoading || isOnWaitlist}
                        className="bg-green-500 text-white font-bold py-4 px-8 rounded-lg text-lg hover:bg-green-600 disabled:bg-gray-600 disabled:cursor-not-allowed transition-transform hover:scale-105"
                    >
                        {isLoading ? 'Checking status...' : (isOnWaitlist ? "You're on the waitlist!" : "Join the Early Access Waitlist")}
                    </button>
                ) : (
                    <a href={`${process.env.REACT_APP_API_URL}/auth/google`} className="bg-green-500 text-white font-bold py-4 px-8 rounded-lg text-lg hover:bg-green-600">
                        Sign In to Join the Waitlist
                    </a>
                )}
                <p className="text-sm text-gray-500 mt-4">
                    Be the first to know when it launches. Early registrants will get free access for a limited time!
                </p>
            </div>

            <div className="mt-12 border-t border-gray-700 pt-6">
                <p className="text-xs text-gray-600">
                    **Legal Note:** The AI Wizard provides insights based on historical user data for informational purposes only. It is not financial advice. All investment decisions should be made with your own research and due diligence.
                </p>
            </div>
        </div>
    );
};

export default AIWizardPage;