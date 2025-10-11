import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import VerifiedTick from './VerifiedTick';

const AIWizardWaitlist = ({ settings }) => {
    const [waitlist, setWaitlist] = useState([]);
    const [loading, setLoading] = useState(true);
    const [visibleCount, setVisibleCount] = useState(10); // State for "Load More"

    useEffect(() => {
        axios.get(`${process.env.REACT_APP_API_URL}/api/admin/ai-wizard-waitlist`, { withCredentials: true })
            .then(res => setWaitlist(res.data))
            .catch(err => console.error("Could not fetch AI waitlist", err))
            .finally(() => setLoading(false));
    }, []);

    if (loading) return <div className="text-center text-gray-400 py-4">Loading waitlist...</div>;

    return (
        <div className="bg-gray-800 p-6 rounded-lg">
            <h2 className="text-xl font-bold text-white mb-4">AI Portfolio Assist Waitlist ({waitlist.length})</h2>
            <div className="space-y-3">
                {waitlist.length > 0 ? (
                    // Use .slice() to only show the visible portion of the list
                    waitlist.slice(0, visibleCount).map(entry => (
                        entry.userId && (
                            <div key={entry._id} className="bg-gray-700 p-3 rounded-lg flex items-center justify-between">
                                <div className="flex items-center">
                                    <img src={entry.userId.avatar} alt="avatar" className="w-10 h-10 rounded-full" />
                                    <div className="flex items-center gap-2 ml-4">
                                        <Link to={`/profile/${entry.userId._id}`} className="font-semibold text-white hover:underline">{entry.userId.username}</Link>
                                        {settings?.isVerificationEnabled && entry.userId.isVerified && <VerifiedTick />}
                                    </div>
                                </div>
                                <p className="text-sm text-gray-400">Joined: {new Date(entry.createdAt).toLocaleDateString()}</p>
                            </div>
                        )
                    ))
                ) : (
                    <p className="text-gray-500 text-center py-4">No one has joined the waitlist yet.</p>
                )}
            </div>

            {/* "Load More" Button */}
            {visibleCount < waitlist.length && (
                <div className="text-center mt-6">
                    <button 
                        onClick={() => setVisibleCount(prev => prev + 10)}
                        className="bg-gray-700 text-white font-bold py-2 px-6 rounded-lg hover:bg-gray-600"
                    >
                        Load More
                    </button>
                </div>
            )}
        </div>
    );
};

export default AIWizardWaitlist;