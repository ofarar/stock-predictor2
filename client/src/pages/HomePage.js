import React, { useState, useEffect } from 'react';
import axios from 'axios';
import DailyLeaderboard from '../components/DailyLeaderboard';
import FamousStocks from '../components/FamousStocks';
import LongTermLeaders from '../components/LongTermLeaders';
import HourlyWinnersFeed from '../components/HourlyWinnersFeed';
import CommunityFeed from '../components/CommunityFeed';
import PromoBanner from '../components/PromoBanner';

const HomePage = ({ user }) => {
    const [widgetData, setWidgetData] = useState({
        dailyLeaders: [],
        famousStocks: [],
        longTermLeaders: [],
        hourlyWinners: [],
        communityFeed: []
    });
    const [settings, setSettings] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchAllData = async () => {
            try {
                // Fetch all data in parallel for faster loading
                const [settingsRes, hourlyRes, dailyRes, longTermRes, famousRes, communityRes] = await Promise.all([
                    axios.get(`${process.env.REACT_APP_API_URL}/api/settings`),
                    axios.get(`${process.env.REACT_APP_API_URL}/api/widgets/hourly-winners`),
                    axios.get(`${process.env.REACT_APP_API_URL}/api/widgets/daily-leaders`),
                    axios.get(`${process.env.REACT_APP_API_URL}/api/widgets/long-term-leaders`),
                    axios.get(`${process.env.REACT_APP_API_URL}/api/widgets/famous-stocks`),
                    axios.get(`${process.env.REACT_APP_API_URL}/api/widgets/community-feed`)
                ]);

                setSettings(settingsRes.data);
                setWidgetData({
                    hourlyWinners: hourlyRes.data,
                    dailyLeaders: dailyRes.data,
                    longTermLeaders: longTermRes.data,
                    famousStocks: famousRes.data,
                    communityFeed: communityRes.data
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

                {/* Main Column */}
                <div className="lg:col-span-2 flex flex-col gap-8">
                    {/* These items will appear first on mobile */}
                    <HourlyWinnersFeed winners={widgetData.hourlyWinners} />
                    <DailyLeaderboard leaders={widgetData.dailyLeaders} />

                    {/* Desktop CommunityFeed */}
                    <div className="hidden lg:block mt-8">
                        <CommunityFeed feedItems={widgetData.communityFeed} />
                    </div>
                </div>

                {/* Sidebar Column */}
                <div className="lg:col-span-1 flex flex-col gap-8">
                    <FamousStocks stocks={widgetData.famousStocks} />
                    <LongTermLeaders leaders={widgetData.longTermLeaders} />
                </div>
            </div>
            {/* Mobile CommunityFeed */}
            <div className="lg:hidden">
                <CommunityFeed feedItems={widgetData.communityFeed} />
            </div>
        </div>
    );
};

export default HomePage;