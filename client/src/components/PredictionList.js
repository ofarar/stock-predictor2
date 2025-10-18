import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import MiniPredictionCard from './MiniPredictionCard';
import LoadMoreButton from './LoadMoreButton'; // Import the button

// Accepts userId and status instead of 'predictions' array
const PredictionList = ({ titleKey, userId, predictionStatus, quotes, isOwnProfile, onEditClick, emptyTextKey }) => {
    const { t } = useTranslation();
    
    // Internal state for managing predictions
    const [items, setItems] = useState([]);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(0);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);

    // Function to fetch predictions for a specific page
    const fetchPredictions = useCallback(async (pageNum) => {
        if (pageNum === 1) setLoading(true); else setLoadingMore(true);
        try {
            const response = await axios.get(
                `${process.env.REACT_APP_API_URL}/api/profile/${userId}/predictions/${predictionStatus}`,
                { params: { page: pageNum, limit: 6 }, withCredentials: true }
            );
            const { items: newItems, totalPages: newTotalPages, currentPage } = response.data;
            
            setItems(prev => pageNum === 1 ? newItems : [...prev, ...newItems]);
            setPage(currentPage);
            setTotalPages(newTotalPages);
        } catch (error) {
            toast.error(`Failed to load ${predictionStatus.toLowerCase()} predictions.`);
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    }, [userId, predictionStatus]);

    // Fetch first page on mount or when key props change
    useEffect(() => {
        if (userId && predictionStatus) {
            fetchPredictions(1);
        }
    }, [fetchPredictions, userId, predictionStatus]); // Rerun if userId or status changes

    const handleLoadMore = () => {
        if (!loadingMore && page < totalPages) {
            fetchPredictions(page + 1);
        }
    };

    return (
        <div className="bg-gray-800 p-6 rounded-lg">
            <h3 className="text-xl font-bold text-white mb-4">{t(titleKey)}</h3>
            {loading && page === 1 ? (
                <p className="text-gray-500 text-center py-4">Loading...</p> // Simple loading state
            ) : items.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-3">
                    {items.map(p => (
                        <MiniPredictionCard
                            key={p._id}
                            prediction={p}
                            // Pass current price if available in the quotes map
                            currentPrice={quotes ? quotes[p.stockTicker] : undefined}
                            isOwnProfile={isOwnProfile}
                            onEditClick={onEditClick}
                        />
                    ))}
                </div>
            ) : <p className="text-gray-500 text-center py-4">{t(emptyTextKey)}</p>}
            
            {/* Use the LoadMoreButton */}
            <LoadMoreButton
                onClick={handleLoadMore}
                isLoading={loadingMore}
                hasMore={page < totalPages}
            />
        </div>
    );
};

export default PredictionList;