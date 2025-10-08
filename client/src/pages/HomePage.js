// src/pages/HomePage.js

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import DailyLeaderboard from '../components/DailyLeaderboard';
import LongTermLeaders from '../components/LongTermLeaders';
import HourlyWinnersFeed from '../components/HourlyWinnersFeed';
import PromoBanner from '../components/PromoBanner';
import TopMovers from '../components/TopMovers';

const HomePage = ({ user }) => {
    const [widgetData, setWidgetData] = useState({
        dailyLeaders: [],
        longTermLeaders: [],
        hourlyWinners: []
    });
    const [settings, setSettings] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchAllData = async () => {
            try {
                const [settingsRes, hourlyRes, dailyRes, longTermRes] = await Promise.all([
                    axios.get(`${process.env.REACT_APP_API_URL}/api/settings`),
                    axios.get(`${process.env.REACT_APP_API_URL}/api/widgets/hourly-winners`),
                    axios.get(`${process.env.REACT_APP_API_URL}/api/widgets/daily-leaders`),
                    axios.get(`${process.env.REACT_APP_API_URL}/api/widgets/long-term-leaders`),
                ]);

                setSettings(settingsRes.data);
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
        return <div className="text-center text-gray-400 py-10">Loading dashboard...</div>;
    }

    return (
        <div className="space-y-8">
            {!user && settings?.isPromoBannerActive && <PromoBanner />}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">

                {/* Main Column: Focused on recent results and top performers */}
                <div className="lg:col-span-2 flex flex-col gap-8">
                    <HourlyWinnersFeed winners={widgetData.hourlyWinners} />
                    <DailyLeaderboard leaders={widgetData.dailyLeaders} />
                </div>

                {/* Sidebar Column: Focused on market context and all-time greats */}
                <div className="lg:col-span-1 flex flex-col gap-8">
                    <TopMovers />
                    <LongTermLeaders leaders={widgetData.longTermLeaders} />
                </div>
            </div>
        </div>
    );
};

export default HomePage;