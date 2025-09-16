import React, { useState, useEffect } from 'react';
import axios from 'axios';

const MyPredictions = () => {
    const [predictions, setPredictions] = useState([]);
    const [filter, setFilter] = useState('Active'); // 'Active' or 'Assessed'

    useEffect(() => {
        axios.get(`${process.env.REACT_APP_API_URL}/api/my-predictions`, { withCredentials: true })
            .then(res => setPredictions(res.data))
            .catch(err => console.error("Could not fetch predictions", err));
    }, []);

    const filteredPredictions = predictions.filter(p => p.status === filter);

    return (
        <div className="bg-gray-800 p-6 rounded-xl shadow-2xl mt-8">
            <h2 className="text-2xl font-bold text-white mb-4">My Predictions</h2>
            <div className="flex border-b border-gray-700 mb-4">
                <button onClick={() => setFilter('Active')} className={`px-4 py-2 ${filter === 'Active' ? 'text-green-400 border-b-2 border-green-400' : 'text-gray-400'}`}>Active</button>
                <button onClick={() => setFilter('Assessed')} className={`px-4 py-2 ${filter === 'Assessed' ? 'text-green-400 border-b-2 border-green-400' : 'text-gray-400'}`}>History</button>
            </div>
            <div>
                {filteredPredictions.length > 0 ? filteredPredictions.map(p => (
                    <div key={p._id} className="grid grid-cols-3 md:grid-cols-5 gap-4 p-2 border-b border-gray-700 items-center">
                        <span className="font-bold">{p.stockTicker}</span>
                        <span>Target: ${p.targetPrice.toFixed(2)}</span>
                        <span>Deadline: {new Date(p.deadline).toLocaleDateString()}</span>
                        {p.status === 'Assessed' && (
                           <span className={`font-bold ${p.score > 50 ? 'text-green-400' : 'text-red-400'}`}>
                               Score: {p.score}
                           </span>
                        )}
                    </div>
                )) : <p className="text-gray-400">No {filter.toLowerCase()} predictions found.</p>}
            </div>
        </div>
    );
};

export default MyPredictions;