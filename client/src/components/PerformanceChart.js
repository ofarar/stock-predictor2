// src/components/PerformanceChart.js
import React, { useMemo } from 'react';
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler } from 'chart.js';
import { format } from 'date-fns';
import { useTranslation } from 'react-i18next';
import { formatDate } from '../utils/formatters';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

const PerformanceChart = ({ chartData = [], activeFilter }) => {
    const { t, i18n } = useTranslation();
    
    // The filter type is now derived from the prop passed by ProfilePage.js
    const activeFilterType = activeFilter?.type || 'Overall';

    const filteredAndFormattedData = useMemo(() => {
        let dataPoints = chartData;

        // Filter data based on the activeFilter prop
        if (activeFilterType !== 'Overall') {
            dataPoints = chartData.filter(p => p.predictionType === activeFilterType);
        }

        const dailyRatings = dataPoints.reduce((acc, p) => {
            const day = format(new Date(p.createdAt), 'yyyy-MM-dd');
            if (!acc[day]) {
                acc[day] = { totalRating: 0, count: 0, predictions: [] };
            }
            // Use 'rating' (new) or 'score' (old) for data migration
            acc[day].totalRating += (p.rating || p.score || 0); 
            acc[day].count++;
            // Store the stock ticker for the tooltip
            if (p.stockTicker) {
                acc[day].predictions.push(p.stockTicker);
            }
            return acc;
        }, {});

        const sortedDays = Object.keys(dailyRatings).sort((a, b) => new Date(a) - new Date(b));

        return {
            labels: sortedDays,
            datasets: [{
                label: t('performanceChart.avgRatingLabel', 'Avg Rating'),
                // Calculate average using totalRating
                data: sortedDays.map(day => dailyRatings[day].totalRating / dailyRatings[day].count),
                borderColor: '#22c55e',
                backgroundColor: 'rgba(34, 197, 94, 0.1)',
                fill: true,
                tension: 0.1,
                pointRadius: 2,
                pointHoverRadius: 6,
            }],
            // Pass this for the tooltip
            dailyData: dailyRatings
        };
    }, [chartData, activeFilterType, t]);

    const options = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
            tooltip: {
                mode: 'index',
                intersect: false,
                backgroundColor: '#1F2937',
                titleColor: '#E5E7EB',
                bodyColor: '#D1D5DB',
                borderColor: '#4B5563',
                borderWidth: 1,
                padding: 10,
                callbacks: {
                    title: (context) => {
                        const day = context[0].label;
                        return formatDate(new Date(day), i18n.language);
                    },
                    label: (context) => {
                        // Use the correct "Rating" translation key
                        return t('performanceChart.tooltip.avgRating', { rating: context.parsed.y.toFixed(1) });
                    },
                    afterBody: (context) => {
                        // Add the "predictions" and "stocks" info
                        const dayData = filteredAndFormattedData.dailyData[context[0].label];
                        if (!dayData) return '';
                        
                        const tickers = [...new Set(dayData.predictions)]; // Get unique tickers
                        const predictionsLabel = t('performanceChart.tooltip.predictions', { count: dayData.count });
                        const tickersLabel = t('performanceChart.tooltip.stocks', { tickers: tickers.slice(0, 3).join(', ') });
                        
                        return `\n${predictionsLabel}\n${tickersLabel}${tickers.length > 3 ? '...' : ''}`;
                    }
                }
            },
        },
        scales: {
            x: {
                ticks: {
                    color: '#9ca3af',
                    maxTicksLimit: 8,
                    callback: function (value) {
                        const label = this.getLabelForValue(value);
                        return format(new Date(label), 'MMM d');
                    }
                },
                grid: { color: 'rgba(255, 255, 255, 0.1)' }
            },
            y: {
                beginAtZero: true,
                max: 100,
                ticks: { color: '#9ca3af' },
                grid: { color: 'rgba(255, 255, 255, 0.1)' }
            }
        },
        onHover: (event, chartElement) => {
            event.native.target.style.cursor = chartElement[0] ? 'pointer' : 'default';
        }
    };

    return (
        <div className="bg-gray-800 p-4 sm:p-6 rounded-lg">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4">
                {/* Header is clean, filters are removed */}
                <h3 className="text-xl font-bold text-white">{t('performanceChart.title')}</h3>
            </div>
            <div className="h-64">
                {filteredAndFormattedData.labels.length > 0 ? (
                    <Line options={options} data={filteredAndFormattedData} />
                ) : (
                    <div className="h-full flex items-center justify-center text-gray-500">{t('performanceChart.noData')}</div>
                )}
            </div>
        </div>
    );
};

export default PerformanceChart;