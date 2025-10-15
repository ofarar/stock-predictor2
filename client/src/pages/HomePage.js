import React, { useState, useEffect } from 'react';
import axios from 'axios';
import DailyLeaderboard from '../components/DailyLeaderboard';
import LongTermLeaders from '../components/LongTermLeaders';
import HourlyWinnersFeed from '../components/HourlyWinnersFeed';
import PromoBanner from '../components/PromoBanner';
import MarketWatch from '../components/MarketWatch';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';
import PredictionModal from '../components/PredictionModal';

// FIX: The component now only uses the 'settings' passed in from App.js
const HomePage = ({ user, settings }) => {
    const { t } = useTranslation();
    const [widgetData, setWidgetData] = useState({
        dailyLeaders: [],
        longTermLeaders: [],
        hourlyWinners: []
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
                // FIX: The redundant API call for '/api/settings' has been removed.
                const [hourlyRes, dailyRes, longTermRes] = await Promise.all([
                    axios.get(`${process.env.REACT_APP_API_URL}/api/widgets/hourly-winners`),
                    axios.get(`${process.env.REACT_APP_API_URL}/api/widgets/daily-leaders`),
                    axios.get(`${process.env.REACT_APP_API_URL}/api/widgets/long-term-leaders`),
                ]);

                setWidgetData({
                    hourlyWinners: hourlyRes.data,
                    dailyLeaders: dailyRes.data,
                    longTermLeaders: longTermRes.data,
                });
            } catch (error) {
                console.error("Failed to load dashboard data", error);
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
            {/* This now correctly uses the 'settings' prop */}
            {!user && settings?.isPromoBannerActive && <PromoBanner />}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">

                {/* Main Column: Focused on recent results and top performers */}
                <div className="lg:col-span-2 flex flex-col gap-8">
                    {/* The 'settings' prop is correctly passed down to the widgets */}
                    <HourlyWinnersFeed winners={widgetData.hourlyWinners} settings={settings} />
                    <DailyLeaderboard leaders={widgetData.dailyLeaders} settings={settings} />
                </div>

                {/* Sidebar Column: Focused on market context and all-time greats */}
                <div className="lg:col-span-1 flex flex-col gap-8">
                    <MarketWatch />
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