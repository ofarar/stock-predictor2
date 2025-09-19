import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';

const MyPredictions = () => {
    const [predictions, setPredictions] = useState([]);
    const [filter, setFilter] = useState('Active');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Fetch real prediction data from your backend
        axios.get(`${process.env.REACT_APP_API_URL}/api/my-predictions`, { withCredentials: true })
            .then(res => {
                setPredictions(res.data);
            })
            .catch(err => {
                console.error("Could not fetch predictions", err);
            })
            .finally(() => {
                setLoading(false);
            });
    }, []);

    const filteredPredictions = predictions.filter(p => {
        if (filter === 'History') return p.status === 'Assessed';
        return p.status === 'Active';
    });

    if (loading) {
        return <div className="text-gray-400 text-center p-4">Loading predictions...</div>;
    }

    return (
        <div className="bg-gray-800 p-6 rounded-lg">
            <h3 className="text-xl font-bold text-white mb-4">My Predictions</h3>
            
            <div className="flex border-b border-gray-700 mb-4">
                <button onClick={() => setFilter('Active')} className={`px-4 py-2 font-bold ${filter === 'Active' ? 'text-green-400 border-b-2 border-green-400' : 'text-gray-400'}`}>Active</button>
                <button onClick={() => setFilter('History')} className={`px-4 py-2 font-bold ${filter === 'History' ? 'text-green-400 border-b-2 border-green-400' : 'text-gray-400'}`}>History</button>
            </div>
            
            <div className="space-y-3">
                {filteredPredictions.length > 0 ? filteredPredictions.map(p => (
                    // This link now uses the real p._id from the database
                    <Link to={`/prediction/${p._id}`} key={p._id} className="block bg-gray-700 p-3 rounded-lg hover:bg-gray-600 transition-colors">
                        <div className="flex justify-between items-center text-sm">
                            <span className="font-bold text-white">{p.stockTicker}</span>
                            <span className="text-gray-400">{p.predictionType}</span>
                            <span className="text-gray-300">Target: ${p.targetPrice.toFixed(2)}</span>
                            {p.status === 'Assessed' && (
                               <span className={`font-bold ${p.score > 60 ? 'text-green-400' : 'text-red-400'}`}>
                                   Score: {p.score}
                               </span>
                            )}
                        </div>
                    </Link>
                )) : <p className="text-gray-500 text-center py-4">No {filter.toLowerCase()} predictions found.</p>}
            </div>
        </div>
    );
};

export default MyPredictions;