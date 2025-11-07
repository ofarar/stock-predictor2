// src/components/StockChart.js

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Line } from 'react-chartjs-2';
import { useTranslation } from 'react-i18next';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler } from 'chart.js';
import { format } from 'date-fns'; // 1. Import the 'format' function
import { formatNumericDate } from '../utils/formatters'; // 2. Keep your numeric date formatter

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

const StockChart = ({ ticker }) => {
    const { t, i18n } = useTranslation();
    const [chartData, setChartData] = useState(null);
    const [error, setError] = useState(false);

    useEffect(() => {
        setChartData(null); // Reset data to show loading
        setError(false);    // Reset error on new ticker

        axios.get(`${process.env.REACT_APP_API_URL}/api/stock/${ticker}/historical`)
            .then(res => {
                const historicalData = res.data;
                if (historicalData && historicalData.length > 0) {
                    setChartData({
                        labels: historicalData.map(v => format(new Date(v.date), 'yyyy-MM-dd')),
                        datasets: [{
                            label: t('stockChart.priceLabel', { ticker }),
                            data: historicalData.map(v => v.close),
                            borderColor: '#22c55e',
                            backgroundColor: 'rgba(34, 197, 94, 0.1)',
                            fill: true,
                            tension: 0.1,
                            pointRadius: 0,
                            pointHoverRadius: 5,
                        }]
                    });
                } else {
                    // Handle API returning empty data as an error
                    setError(true);
                }
            })
            .catch(err => {
                console.error("Failed to fetch chart data", err);
                setError(true); // <-- 2. SET ERROR ON CATCH
            });
    }, [ticker, t, i18n.language]); // Add i18n.language as a dependency

    const options = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
            tooltip: {
                mode: 'index',
                intersect: false,
                // Add this callbacks object
                callbacks: {
                    title: function (context) {
                        const label = context[0].label;
                        // Use the same formatter as the axis ticks
                        return formatNumericDate(label, i18n.language);
                    }
                }
            },
        },
        scales: {
            x: {
                ticks: {
                    color: '#9ca3af',
                    maxTicksLimit: 8,
                    // 4. This callback now correctly receives the clean date string
                    callback: function (value) {
                        const label = this.getLabelForValue(value);
                        return formatNumericDate(label, i18n.language);
                    }
                },
                grid: { color: 'rgba(255, 255, 255, 0.1)' }
            },
            y: {
                ticks: { color: '#9ca3af' },
                grid: { color: 'rgba(255, 255, 255, 0.1)' }
            }
        }
    };

    // First, check for the error
    if (error) {
        return (
            <div className="bg-gray-800 p-4 sm:p-6 rounded-lg h-96 flex flex-col items-center justify-center text-center">
                <svg className="w-12 h-12 text-yellow-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                <h4 className="font-bold text-white">{t('stockPage.chart.unavailableTitle')}</h4>
                <p className="text-sm text-gray-400">{t('stockPage.chart.unavailableDescription')}</p>
            </div>
        );
    }

    if (!chartData) {
        return (
            <div className="h-96 flex items-center justify-center text-gray-500 bg-gray-800 rounded-lg">
                {t('stockChart.loading')}
            </div>
        );
    }

    // Finally, show the chart
    return (
        <div className="bg-gray-800 p-4 sm:p-6 rounded-lg h-96">
            <Line options={options} data={chartData} />
        </div>
    );
};

export default StockChart;