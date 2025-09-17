import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler } from 'chart.js';

// Register the necessary components for Chart.js
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

const StockChart = ({ ticker }) => {
    const [chartData, setChartData] = useState(null);

    useEffect(() => {
        axios.get(`${process.env.REACT_APP_API_URL}/api/stock/${ticker}/historical`)
            .then(res => {
                // The data from yahoo-finance2 is a direct array
                const historicalData = res.data;
                if (historicalData && historicalData.length > 0) {
                    setChartData({
                        // Format the date for the labels
                        labels: historicalData.map(v => new Date(v.date).toLocaleDateString()),
                        datasets: [{
                            label: `${ticker} Price`,
                            // Use the 'close' property for the price
                            data: historicalData.map(v => v.close),
                            borderColor: '#22c55e',
                            backgroundColor: 'rgba(34, 197, 94, 0.1)',
                            fill: true,
                            tension: 0.1,
                            pointRadius: 0, // Hide the points on the line
                        }]
                    });
                }
            })
            .catch(err => console.error("Failed to fetch chart data", err));
    }, [ticker]);

    const options = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
        },
        scales: {
            x: {
                ticks: { color: '#9ca3af', maxTicksLimit: 8 }, // Limit number of date labels
                grid: { color: 'rgba(255, 255, 255, 0.1)' }
            },
            y: {
                ticks: { color: '#9ca3af' },
                grid: { color: 'rgba(255, 255, 255, 0.1)' }
            }
        }
    };

    if (!chartData) {
        return <div className="h-96 flex items-center justify-center text-gray-500 bg-gray-800 rounded-lg">Loading Chart...</div>;
    }

    return (
        <div className="bg-gray-800 p-4 sm:p-6 rounded-lg h-96">
            <Line options={options} data={chartData} />
        </div>
    );
};

export default StockChart;