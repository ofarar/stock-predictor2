import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import { io } from 'socket.io-client';

// Import all necessary components
import DailyLeaderboard from '../components/DailyLeaderboard';
import LongTermLeaders from '../components/LongTermLeaders';
import HourlyWinnersFeed from '../components/HourlyWinnersFeed';
import PromoBanner from '../components/PromoBanner';
import MarketWatch from '../components/MarketWatch';
import PredictionModal from '../components/PredictionModal';

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

    // Effect to open prediction modal via URL parameter
    useEffect(() => {
        const params = new URLSearchParams(location.search);
        if (params.get('action') === 'predict') {
            setPredictionModalOpen(true);
        }
    }, [location]);

    // Effect for all data fetching and real-time updates
    useEffect(() => {
        const fetchAllData = async () => {
            setLoading(true);
            try {
                const [
                    hourlyWinnersRes,
                    dailyLeadersRes,
                    longTermLeadersRes
                ] = await Promise.all([
                    axios.get(`${import.meta.env.VITE_API_URL}/api/widgets/hourly-winners`),
                    axios.get(`${import.meta.env.VITE_API_URL}/api/widgets/daily-leaders`),
                    axios.get(`${import.meta.env.VITE_API_URL}/api/widgets/long-term-leaders`)
                ]);

                setWidgetData({
                    hourlyWinners: hourlyWinnersRes.data,
                    dailyLeaders: dailyLeadersRes.data,
                    longTermLeaders: longTermLeadersRes.data
                });

            } catch (err) {
                console.error("Failed to load homepage widgets:", err);
                toast.error(t('homepage.toast.errorLoad'));
            } finally {
                setLoading(false);
            }
        };

        fetchAllData();

        // --- START: REAL-TIME UPDATE ---
        const socket = io(import.meta.env.VITE_API_URL);

        socket.on('famous-stocks-update', (newFamousStocksData) => {
            // Update the correct part of the widgetData state
            setWidgetData(prevData => ({
                ...prevData,
                famousStocks: newFamousStocksData.stocks,
                isFamousHistorical: newFamousStocksData.isHistorical,
            }));
        });

        // Disconnect on component unmount
        return () => {
            socket.disconnect();
        };
        // --- END: REAL-TIME UPDATE ---

    }, [t]); // Dependency array includes 't' for toast translation

    if (loading) {
        return <div className="text-center text-gray-400 py-10">{t('loading_dashboard')}</div>;
    }

    return (
        <div className="space-y-8 animate-fade-in">
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