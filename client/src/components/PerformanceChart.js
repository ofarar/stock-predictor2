import React, { useState, useMemo } from 'react';
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler } from 'chart.js';
import { format } from 'date-fns';
import { useTranslation } from 'react-i18next';
import { formatDate } from '../utils/formatters';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

const PerformanceChart = ({ chartData = [] }) => {
    const { t, i18n } = useTranslation();
    const [filter, setFilter] = useState('Overall');
    const types = ['Overall', 'Hourly', 'Daily', 'Weekly', 'Monthly', 'Yearly'];

    const filteredAndFormattedData = useMemo(() => {
        let dataPoints = chartData;

        if (filter !== 'Overall') {
            dataPoints = chartData.filter(p => p.predictionType === filter);
        }

        const dailyScores = dataPoints.reduce((acc, p) => {
            const day = format(new Date(p.createdAt), 'yyyy-MM-dd');
            if (!acc[day]) {
                acc[day] = { totalScore: 0, count: 0, predictions: [] };
            }
            acc[day].totalScore += p.score;
            acc[day].count++;
            acc[day].predictions.push(p.id);
            return acc;
        }, {});

        const labels = Object.keys(dailyScores).sort();
        const data = labels.map(label => dailyScores[label].totalScore / dailyScores[label].count);
        const predictionIds = labels.map(label => dailyScores[label].predictions);

        return { labels, datasets: [{ data, predictionIds }] };
    }, [chartData, filter]);

    const options = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
            x: {
                ticks: {
                    color: '#9ca3af',
                    maxTicksLimit: 10,
                    // Add this callback to format the date
                    callback: function (value, index, ticks) {
                        const label = this.getLabelForValue(value);
                        // Convert the string label into a Date object before formatting
                        return formatDate(new Date(label), i18n.language);
                    }
                },
                grid: { color: 'rgba(255, 255, 255, 0.1)' }
            },
            y: { ticks: { color: '#9ca3af' }, grid: { color: 'rgba(255, 255, 255, 0.1)' }, min: 0, max: 100 }
        },
        elements: {
            line: {
                borderColor: '#22c55e',
                backgroundColor: 'rgba(34, 197, 94, 0.2)',
                fill: true,
                tension: 0.3,
            },
            point: {
                radius: 4,
                hoverRadius: 6,
                backgroundColor: '#22c55e',
            }
        },
        onHover: (event, chartElement) => {
            event.native.target.style.cursor = chartElement[0] ? 'pointer' : 'default';
        }
    };

    return (
        <div className="bg-gray-800 p-4 sm:p-6 rounded-lg">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4">
                <h3 className="text-xl font-bold text-white mb-3 sm:mb-0">{t('performanceChart.title')}</h3>
                <div className="flex flex-wrap gap-1 bg-gray-700 p-1 rounded-md">
                    {types.map(type => (
                        <button
                            key={type}
                            onClick={() => setFilter(type)}
                            className={`px-3 py-1 text-xs font-bold rounded transition-colors ${filter === type ? 'bg-green-500 text-white' : 'hover:bg-gray-600 text-gray-300'}`}
                        >
                            {t(`performanceChart.filters.${type.toLowerCase()}`)}
                        </button>
                    ))}
                </div>
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
