// src/pages/AdminPage.js

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import AdminPanel from '../components/AdminPanel';
import AdminUserList from '../components/AdminUserList';
import AIWizardWaitlist from '../components/AIWizardWaitlist';
import AdminHealthCheck from '../components/AdminHealthCheck';
import AdminBotReview from '../components/AdminBotReview';

// DEFINED ORDER: Users -> Governance -> Health -> Options -> Settings
const TAB_NAMES = {
    USERS: 'Users',
    GOVERNANCE: 'Bot Governance',
    SYS_HEALTH: 'System Health',
    OPTIONS: 'Admin Options',
    SETTINGS: 'Settings'
};

const AdminPage = () => {
    // Default to Users tab as requested
    const [activeTab, setActiveTab] = useState(TAB_NAMES.USERS);
    const [settings, setSettings] = useState({
        isVerificationEnabled: false,
        verificationPrice: 0,
        isAIWizardEnabled: false,
        maxPredictionsPerDay: 10,
        badgeSettings: {},
        isFinanceApiEnabled: true,
        isPromoBannerActive: true,
        isEarningsBannerActive: true,
        isXIconEnabled: true,
        xAccountUrl: 'https://x.com/SPredictor25790'
    });
    const [loading, setLoading] = useState(true);
    const [badgeSettingsJson, setBadgeSettingsJson] = useState('');
    const navigate = useNavigate();

    useEffect(() => {
        axios.get(`${import.meta.env.VITE_API_URL}/auth/current_user`, { withCredentials: true })
            .then(res => {
                if (!res.data || !res.data.isAdmin) {
                    toast.error("You are not authorized to view this page.");
                    navigate('/');
                    return;
                }
                return axios.get(`${import.meta.env.VITE_API_URL}/api/settings`, { withCredentials: true });
            })
            .then(settingsRes => {
                if (settingsRes) {
                    setSettings(settingsRes.data);
                    setBadgeSettingsJson(JSON.stringify(settingsRes.data.badgeSettings, null, 2));
                }
            })
            .catch(() => navigate('/'))
            .finally(() => setLoading(false));
    }, [navigate]);

    const handleSettingsChange = (key, value) => {
        setSettings(prev => ({ ...prev, [key]: value }));
    };

    const handleSaveAllSettings = () => {
        let badgeSettings;
        try {
            badgeSettings = JSON.parse(badgeSettingsJson);
        } catch (e) {
            return toast.error("Invalid JSON format in Badge Rules. Please check syntax.");
        }

        const settingsToSave = {
            isVerificationEnabled: settings.isVerificationEnabled,
            verificationPrice: parseFloat(settings.verificationPrice) || 0,
            isAIWizardEnabled: settings.isAIWizardEnabled,
            maxPredictionsPerDay: parseInt(settings.maxPredictionsPerDay) || 20,
            badgeSettings: badgeSettings,
            isFinanceApiEnabled: settings.isFinanceApiEnabled,
            isPromoBannerActive: settings.isPromoBannerActive,
            isEarningsBannerActive: settings.isEarningsBannerActive,
            isXIconEnabled: settings.isXIconEnabled,
            xAccountUrl: settings.xAccountUrl
        };

        const promise = axios.put(`${import.meta.env.VITE_API_URL}/api/settings/admin`, settingsToSave, { withCredentials: true });
        toast.promise(promise, { loading: 'Saving all settings...', success: 'Settings saved!', error: 'Error saving.' });
    };

    if (loading) return <div className="text-center text-white">Loading Admin Dashboard...</div>;

    const renderCombinedSettings = () => (
        <div className="space-y-6">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-white">Global Settings</h2>
                <button onClick={handleSaveAllSettings} className="bg-green-500 text-white font-bold py-2 px-6 rounded-lg hover:bg-green-600 shadow-lg">
                    Save Changes
                </button>
            </div>

            <div className="bg-gray-800 p-6 rounded-lg space-y-4">
                <h3 className="text-lg font-bold text-gray-300 border-b border-gray-700 pb-2">General Features</h3>
                {/* Promo Banner */}
                <div className="flex items-center justify-between bg-gray-700 p-3 rounded-md">
                    <label htmlFor="isPromoBannerActive" className="font-medium text-gray-300">Enable Promo Banner</label>
                    <input type="checkbox" id="isPromoBannerActive" checked={settings.isPromoBannerActive ?? true} onChange={(e) => handleSettingsChange('isPromoBannerActive', e.target.checked)} className="h-5 w-5 rounded bg-gray-900 text-green-500 border-gray-600" />
                </div>
                {/* Earnings Banner */}
                <div className="flex items-center justify-between bg-gray-700 p-3 rounded-md">
                    <label htmlFor="isEarningsBannerActive" className="font-medium text-gray-300">Enable Earnings Banner</label>
                    <input type="checkbox" id="isEarningsBannerActive" checked={settings.isEarningsBannerActive ?? true} onChange={(e) => handleSettingsChange('isEarningsBannerActive', e.target.checked)} className="h-5 w-5 rounded bg-gray-900 text-green-500 border-gray-600" />
                </div>
                {/* X Icon */}
                <div className="flex items-center justify-between bg-gray-700 p-3 rounded-md">
                    <label htmlFor="isXIconEnabled" className="font-medium text-gray-300">Show Footer X Icon</label>
                    <input type="checkbox" id="isXIconEnabled" checked={settings.isXIconEnabled ?? true} onChange={(e) => handleSettingsChange('isXIconEnabled', e.target.checked)} className="h-5 w-5 rounded bg-gray-900 text-green-500 border-gray-600" />
                </div>
                <div className='pl-2'>
                    <label className="block text-sm font-medium text-gray-400">X Account URL</label>
                    <input type="url" value={settings.xAccountUrl} onChange={(e) => handleSettingsChange('xAccountUrl', e.target.value)} className="mt-1 w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-3 text-white" />
                </div>
            </div>

            <div className="bg-gray-800 p-6 rounded-lg space-y-4">
                <h3 className="text-lg font-bold text-gray-300 border-b border-gray-700 pb-2">Core Features</h3>
                {/* Finance API */}
                <div className="flex items-center justify-between bg-gray-700 p-3 rounded-md">
                    <label htmlFor="isFinanceApiEnabled" className="font-medium text-gray-300">Enable Live Finance API</label>
                    <input type="checkbox" id="isFinanceApiEnabled" checked={settings.isFinanceApiEnabled} onChange={(e) => handleSettingsChange('isFinanceApiEnabled', e.target.checked)} className="h-5 w-5 rounded bg-gray-900 text-green-500 border-gray-600" />
                </div>
                {/* Global Prediction Limit */}
                <div>
                    <label className="block text-sm font-medium text-gray-300">Global Max Predictions / Day</label>
                    <input type="number" value={settings.maxPredictionsPerDay} onChange={(e) => handleSettingsChange('maxPredictionsPerDay', e.target.value)} className="mt-1 w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-3 text-white" />
                </div>
            </div>

            <div className="bg-gray-800 p-6 rounded-lg space-y-4">
                <h3 className="text-lg font-bold text-gray-300 border-b border-gray-700 pb-2">Module Configs</h3>
                {/* AI Wizard */}
                <div className="flex items-center justify-between bg-gray-700 p-3 rounded-md">
                    <label htmlFor="isAIWizardEnabled" className="font-medium text-gray-300">Enable AI Wizard</label>
                    <input type="checkbox" id="isAIWizardEnabled" checked={settings.isAIWizardEnabled} onChange={(e) => handleSettingsChange('isAIWizardEnabled', e.target.checked)} className="h-5 w-5 rounded bg-gray-900 text-green-500 border-gray-600" />
                </div>
                {/* Verification */}
                <div className="flex items-center justify-between bg-gray-700 p-3 rounded-md">
                    <label htmlFor="isVerificationEnabled" className="font-medium text-gray-300">Enable &quot;Get Verified&quot;</label>
                    <input type="checkbox" id="isVerificationEnabled" checked={settings.isVerificationEnabled} onChange={(e) => handleSettingsChange('isVerificationEnabled', e.target.checked)} className="h-5 w-5 rounded bg-gray-900 text-green-500 border-gray-600" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-300">Verification Price ($)</label>
                    <input type="number" step="0.01" value={settings.verificationPrice} onChange={(e) => handleSettingsChange('verificationPrice', e.target.value)} className="mt-1 w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-3 text-white" />
                </div>
            </div>

            <div className="bg-gray-800 p-6 rounded-lg">
                <h2 className="text-xl font-bold text-white mb-4">Badge Rules JSON</h2>
                <textarea
                    value={badgeSettingsJson}
                    onChange={(e) => setBadgeSettingsJson(e.target.value)}
                    className="w-full h-96 bg-gray-900 text-green-400 font-mono p-4 rounded-md border border-gray-700 text-sm"
                />
            </div>
        </div>
    );

    return (
        <div className="max-w-6xl mx-auto pb-20">
            <h1 className="text-3xl font-bold text-white mb-6 px-4 sm:px-0">Admin Dashboard</h1>

            {/* Navigation: Responsive Switch */}
            <div className="px-4 sm:px-0 mb-8">
                {/* MOBILE: Select Dropdown */}
                <div className="block sm:hidden">
                    <label htmlFor="admin-tab-select" className="sr-only">Select Tab</label>
                    <select
                        id="admin-tab-select"
                        value={activeTab}
                        onChange={(e) => setActiveTab(e.target.value)}
                        className="block w-full rounded-md border-gray-600 bg-gray-800 text-white py-3 px-4 focus:border-blue-500 focus:ring-blue-500"
                    >
                        {Object.values(TAB_NAMES).map((tabName) => (
                            <option key={tabName} value={tabName}>{tabName}</option>
                        ))}
                    </select>
                </div>

                {/* DESKTOP: Buttons (Horizontal list) */}
                <div className="hidden sm:flex space-x-2 bg-gray-800 p-2 rounded-lg">
                    {Object.values(TAB_NAMES).map(tabName => (
                        <button
                            key={tabName}
                            onClick={() => setActiveTab(tabName)}
                            className={`px-4 py-2 rounded-md font-bold whitespace-nowrap transition-colors flex-1 text-center ${activeTab === tabName
                                    ? 'bg-blue-600 text-white shadow-lg'
                                    : 'text-gray-400 hover:text-white hover:bg-gray-700'
                                }`}
                        >
                            {tabName}
                        </button>
                    ))}
                </div>
            </div>

            {/* Tab Content */}
            <div className="px-4 sm:px-0">
                {activeTab === TAB_NAMES.USERS && (
                    <div className="space-y-8 animate-fade-in">
                        <AdminUserList settings={settings} />
                        {/* Moved Waitlist here as requested */}
                        {settings.isAIWizardEnabled && (
                            <div className="pt-6 border-t border-gray-700">
                                <AIWizardWaitlist settings={settings} />
                            </div>
                        )}
                    </div>
                )}

                {activeTab === TAB_NAMES.GOVERNANCE && (
                    <div className="animate-fade-in">
                        <AdminBotReview />
                    </div>
                )}

                {activeTab === TAB_NAMES.SYS_HEALTH && (
                    <div className="animate-fade-in">
                        <AdminHealthCheck />
                    </div>
                )}

                {activeTab === TAB_NAMES.OPTIONS && (
                    <div className="animate-fade-in">
                        <AdminPanel />
                    </div>
                )}

                {activeTab === TAB_NAMES.SETTINGS && (
                    <div className="animate-fade-in">
                        {renderCombinedSettings()}
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminPage;