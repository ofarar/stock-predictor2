import React, { useState } from 'react';

const PerformanceChart = () => {
    const [chartFilter, setChartFilter] = useState('Daily');
    const types = ['Hourly', 'Daily', 'Weekly', 'Quarterly', 'Yearly'];

    return (
        <div className="bg-gray-800 p-6 rounded-lg">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-white">Performance Chart</h3>
                <div className="flex space-x-1 bg-gray-700 p-1 rounded-md">
                    {types.map(type => (
                        <button key={type} onClick={() => setChartFilter(type)} 
                            className={`px-2 py-1 text-xs rounded ${chartFilter === type ? 'bg-green-500' : ''}`}>
                            {type}
                        </button>
                    ))}
                </div>
            </div>
            <div className="h-64 flex items-center justify-center text-gray-500">
                Chart Placeholder
            </div>
        </div>
    );
};

export default PerformanceChart;