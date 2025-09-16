import React, { useState, useEffect } from 'react';
import axios from 'axios';
import DailyLeaderboard from '../components/DailyLeaderboard';
import FamousStocks from '../components/FamousStocks';
import LongTermLeaders from '../components/LongTermLeaders';
import HourlyWinnersFeed from '../components/HourlyWinnersFeed';
import CommunityFeed from '../components/CommunityFeed';
import PromoBanner from '../components/PromoBanner'; // 1. Import the new component

// 2. Accept the 'user' prop from App.js
const HomePage = ({ user }) => { 
    const [widgetData, setWidgetData] = useState({
        dailyLeaders: [],
        famousStocks: [],
        longTermLeaders: [],
        hourlyWinners: [],
        communityFeed: []
    });
    const [settings, setSettings] = useState({ isPromoBannerActive: false });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchWidgetData = async () => {
            try {
                // This fetches all widget data in parallel for faster loading
                const [hourlyRes, dailyRes, longTermRes, famousRes, communityRes] = await Promise.all([
                    axios.get(`${process.env.REACT_APP_API_URL}/api/widgets/hourly-winners`),
                    axios.get(`${process.env.REACT_APP_API_URL}/api/widgets/daily-leaders`),
                    axios.get(`${process.env.REACT_APP_API_URL}/api/widgets/long-term-leaders`),
                    axios.get(`${process.env.REACT_APP_API_URL}/api/widgets/famous-stocks`),
                    axios.get(`${process.env.REACT_APP_API_URL}/api/widgets/community-feed`)
                ]);

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

        fetchWidgetData();
    }, []);

    if (loading) {
        return <div className="text-center text-gray-400">Loading dashboard...</div>;
    }

    return (
        <div className="space-y-8">
            {/* 3. Conditionally render the banner if no user is logged in */}
             {!user && settings.isPromoBannerActive && <PromoBanner />}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                <div className="lg:col-span-2 space-y-8">
                    <HourlyWinnersFeed winners={widgetData.hourlyWinners} />
                    <DailyLeaderboard leaders={widgetData.dailyLeaders} />
                    <CommunityFeed feedItems={widgetData.communityFeed} />
                </div>

                <div className="lg:col-span-1 space-y-8">
                    <FamousStocks stocks={widgetData.famousStocks} />
                    <LongTermLeaders leaders={widgetData.longTermLeaders} />
                </div>
            </div>
        </div>
    );
};

export default HomePage;