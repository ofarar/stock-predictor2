import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';

// Import all necessary components
import DailyLeaderboard from '../components/DailyLeaderboard';
import LongTermLeaders from '../components/LongTermLeaders';
import HourlyWinnersFeed from '../components/HourlyWinnersFeed';
import PromoBanner from '../components/PromoBanner';
import MarketWatch from '../components/MarketWatch';
import FamousStocks from '../components/FamousStocks'; // <-- Import FamousStocks
import PredictionModal from '../components/PredictionModal';

const HomePage = ({ user, settings }) => {
    const { t } = useTranslation();
    const [widgetData, setWidgetData] = useState({
        dailyLeaders: [],
        longTermLeaders: [],
        hourlyWinners: [],
        famousStocks: [], // <-- Add state for famous stocks
        isFamousHistorical: false, // <-- Add state for historical flag
    });
    const [loading, setLoading] = useState(true);
    const [isPredictionModalOpen, setPredictionModalOpen] = useState(false);
    const location = useLocation();

    useEffect(() => {
        const params = new URLSearchParams(location.search);
        if (params.get('action') === 'predict') {
            setPredictionModalOpen(true);
        }
    }, [location]);

    useEffect(() => {
        const fetchAllData = async () => {
            try {
                // Add the new API call to the Promise.all array
                const [hourlyRes, dailyRes, longTermRes, famousRes] = await Promise.all([
                    axios.get(`${process.env.REACT_APP_API_URL}/api/widgets/hourly-winners`),
                    axios.get(`${process.env.REACT_APP_API_URL}/api/widgets/daily-leaders`),
                    axios.get(`${process.env.REACT_APP_API_URL}/api/widgets/long-term-leaders`),
                    axios.get(`${process.env.REACT_APP_API_URL}/api/widgets/famous-stocks`), // <-- New API call
                ]);

                // Update the state with all the fetched data
                setWidgetData({
                    hourlyWinners: hourlyRes.data,
                    dailyLeaders: dailyRes.data,
                    longTermLeaders: longTermRes.data,
                    famousStocks: famousRes.data.stocks, // <-- Store stocks
                    isFamousHistorical: famousRes.data.isHistorical, // <-- Store flag
                });
            } catch (error) {
                console.error("Failed to load dashboard data", error);
                // On failure, set sensible defaults to prevent crashes
                setWidgetData({ dailyLeaders: [], longTermLeaders: [], hourlyWinners: [], famousStocks: [] });
            } finally {
                setLoading(false);
            }
        };
        fetchAllData();
    }, []);

    if (loading) {
        return <div className="text-center text-gray-400 py-10">{t('loading_dashboard')}</div>;
    }

    return (
        <div className="space-y-8">
            {!user && settings?.isPromoBannerActive && <PromoBanner />}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
                {/* Main Column */}
                <div className="md:col-span-2 flex flex-col gap-8">
                    <HourlyWinnersFeed winners={widgetData.hourlyWinners} settings={settings} />
                    <DailyLeaderboard leaders={widgetData.dailyLeaders} settings={settings} />
                </div>

                {/* Sidebar Column */}
                <div className="md:col-span-1 flex flex-col gap-8">
                    <MarketWatch />
                    {/* Render FamousStocks with the fetched data */}
                    <FamousStocks 
                        stocks={widgetData.famousStocks} 
                        isHistorical={widgetData.isFamousHistorical} 
                    />
                    <LongTermLeaders leaders={widgetData.longTermLeaders} settings={settings} />
                </div>
            </div>

            {isPredictionModalOpen && (
                <PredictionModal
                    isOpen={isPredictionModalOpen}
                    onClose={() => setPredictionModalOpen(false)}
                    user={user}
                />
            )}
        </div>
    );
};

export default HomePage;