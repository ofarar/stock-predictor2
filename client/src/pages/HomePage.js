import React, { useState, useEffect } from 'react';
import axios from 'axios';
import DailyLeaderboard from '../components/DailyLeaderboard';
import FamousStocks from '../components/FamousStocks';
import LongTermLeaders from '../components/LongTermLeaders';
import HourlyWinnersFeed from '../components/HourlyWinnersFeed';
import CommunityFeed from '../components/CommunityFeed'; // Import CommunityFeed

const HomePage = () => {
    const [widgetData, setWidgetData] = useState({
        dailyLeaders: [],
        famousStocks: [],
        longTermLeaders: [],
        hourlyWinners: [],
        communityFeed: []
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchWidgetData = async () => {
            try {
                // Use Promise.all to fetch all data in parallel for faster loading
                const [hourlyRes, dailyRes, longTermRes, famousRes, communityRes] = await Promise.all([
                    axios.get('http://localhost:5001/api/widgets/hourly-winners'),
                    axios.get('http://localhost:5001/api/widgets/daily-leaders'),
                    axios.get('http://localhost:5001/api/widgets/long-term-leaders'),
                    axios.get('http://localhost:5001/api/widgets/famous-stocks'),
                    axios.get('http://localhost:5001/api/widgets/community-feed')
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
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            {/* Main column with performance widgets */}
            <div className="lg:col-span-2 space-y-8">
                <HourlyWinnersFeed winners={widgetData.hourlyWinners} />
                <DailyLeaderboard leaders={widgetData.dailyLeaders} />
                <CommunityFeed feedItems={widgetData.communityFeed} /> {/* Add CommunityFeed back */}
            </div>

            {/* Sidebar column for other feeds */}
            <div className="lg:col-span-1 space-y-8">
                <FamousStocks stocks={widgetData.famousStocks} />
                <LongTermLeaders leaders={widgetData.longTermLeaders} />
            </div>
        </div>
    );
};

export default HomePage;