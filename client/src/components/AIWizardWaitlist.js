// src/components/AIWizardWaitlist.js

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import VerifiedTick from './VerifiedTick';
import LoadMoreButton from './LoadMoreButton'; // Ensure LoadMoreButton is imported

const AIWizardWaitlist = ({ settings }) => {
    const [waitlist, setWaitlist] = useState([]);
    const [loading, setLoading] = useState(true);
    const [visibleCount, setVisibleCount] = useState(10);

    useEffect(() => {
        axios.get(`${process.env.REACT_APP_API_URL}/api/admin/ai-wizard-waitlist`, { withCredentials: true })
            .then(res => setWaitlist(res.data))
            .catch(err => console.error("Could not fetch AI waitlist", err))
            .finally(() => setLoading(false));
    }, []);

    if (loading) return <div className="text-center text-gray-400 py-4">Loading waitlist...</div>;

    return (
        <div className="bg-gray-800 p-4 sm:p-6 rounded-lg">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4">
                <h2 className="text-xl font-bold text-white">AI Portfolio Assist Waitlist</h2>
                <span className="text-gray-400 font-semibold">Total: {waitlist.length}</span>
            </div>
            <div className="space-y-3">
                {waitlist.length > 0 ? (
                    waitlist.slice(0, visibleCount).map((entry, index) => {
                        // Ensure userId exists before trying to access properties
                        if (!entry.userId) return null;

                        // --- Start: Logic to split username ---
                        const username = entry.userId.username || ''; // Handle potential missing username
                        const usernameParts = username.split(' ');
                        const lastWord = usernameParts.pop() || '';
                        const usernameWithoutLastWord = usernameParts.join(' ');
                        // --- End: Logic to split username ---

                        return (
                            <div key={entry._id} className="bg-gray-700 p-3 rounded-lg flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    {/* Index Number */}
                                    <span className="text-gray-400 w-6 text-right flex-shrink-0">{index + 1}.</span>
                                    {/* Avatar */}
                                    <img
                                        src={entry.userId.avatar || `https://avatar.iran.liara.run/public/boy?username=${entry.userId._id}`}
                                        alt="avatar"
                                        className="w-10 h-10 rounded-full flex-shrink-0"
                                    />
                                    {/* Username and Tick - Updated */}
                                    <div className="font-semibold text-white">
                                        {/* Render username parts with non-breaking span for last word + tick */}
                                        {usernameWithoutLastWord && <span>{usernameWithoutLastWord} </span>}
                                        <span className="inline-block whitespace-nowrap">
                                            <span>{lastWord}</span>
                                            {/* Conditionally render tick */}
                                            {settings?.isVerificationEnabled && entry.userId.isVerified && (
                                                <span className="ml-1 inline-block align-middle">
                                                    <VerifiedTick />
                                                </span>
                                            )}
                                        </span>
                                    </div>
                                </div>
                                {/* Joined Date */}
                                <p className="text-sm text-gray-400 flex-shrink-0 ml-4">
                                    Joined: {new Date(entry.createdAt).toLocaleDateString()}
                                </p>
                            </div>
                        );
                    })
                ) : (
                    <p className="text-gray-500 text-center py-4">No one has joined the waitlist yet.</p>
                )}
            </div>

            {/* "Load More" Button */}
            {visibleCount < waitlist.length && (
                <LoadMoreButton
                    onClick={() => setVisibleCount(prev => prev + 10)}
                    hasMore={visibleCount < waitlist.length}
                />
            )}
        </div>
    );
};

export default AIWizardWaitlist;