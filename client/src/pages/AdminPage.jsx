import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import AdminPanel from '../components/AdminPanel';
import AdminUserList from '../components/AdminUserList';
import AIWizardWaitlist from '../components/AIWizardWaitlist';
import AdminHealthCheck from '../components/AdminHealthCheck';

const AdminPage = () => {
    const [settings, setSettings] = useState({
        isVerificationEnabled: false,
        verificationPrice: 0,
        isAIWizardEnabled: false, // Add initial state
        maxPredictionsPerDay: 10,
        badgeSettings: {},
        isFinanceApiEnabled: true
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
            isFinanceApiEnabled: settings.isFinanceApiEnabled
        };

        const promise = axios.put(`${import.meta.env.VITE_API_URL}/api/settings/admin`, settingsToSave, { withCredentials: true });
        toast.promise(promise, { loading: 'Saving all settings...', success: 'Settings saved!', error: 'Error saving.' });
    };

    if (loading) return <div className="text-center text-white">Loading Admin Dashboard...</div>;

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold text-white">Admin Dashboard</h1>
                <button onClick={handleSaveAllSettings} className="bg-green-500 text-white font-bold py-2 px-6 rounded-lg hover:bg-green-600">
                    Save All Settings
                </button>
            </div>

            <AdminHealthCheck />

            {/* --- NEW: The waitlist component is now here, conditionally rendered --- */}
            {settings.isAIWizardEnabled && <AIWizardWaitlist settings={settings} />}

            <AdminUserList settings={settings} />

            <div className="bg-gray-800 p-6 rounded-lg">
                <h2 className="text-xl font-bold text-white mb-4">General Settings</h2>
                {/* --- ADD THIS NEW TOGGLE --- */}
                <div className="flex items-center justify-between bg-gray-700 p-3 rounded-md mb-4">
                    <label htmlFor="isFinanceApiEnabled" className="font-medium text-gray-300">
                        Enable Live Finance API
                        <p className="text-xs text-gray-400">If disabled, the app will stop fetching new stock prices to save API quota.</p>
                    </label>
                    <input
                        type="checkbox"
                        id="isFinanceApiEnabled"
                        checked={settings.isFinanceApiEnabled}
                        onChange={(e) => handleSettingsChange('isFinanceApiEnabled', e.target.checked)}
                    />
                </div>
                {/* --- END OF NEW TOGGLE --- */}
                <div>
                    <label className="block text-sm font-medium text-gray-300">Max Predictions Per Day Per User</label>
                    <input
                        type="number"
                        value={settings.maxPredictionsPerDay}
                        onChange={(e) => handleSettingsChange('maxPredictionsPerDay', e.target.value)}
                        className="mt-1 w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-3 text-white"
                    />
                </div>
            </div>

            {/* --- NEW AI WIZARD SETTINGS SECTION --- */}
            <div className="bg-gray-800 p-6 rounded-lg">
                <h2 className="text-xl font-bold text-white mb-4">AI Wizard Feature</h2>
                <div className="flex items-center justify-between bg-gray-700 p-3 rounded-md">
                    <label htmlFor="isAIWizardEnabled" className="font-medium text-gray-300">Enable &quot;AI Wizard&quot; Page</label>
                    <input type="checkbox" id="isAIWizardEnabled" checked={settings.isAIWizardEnabled} onChange={(e) => handleSettingsChange('isAIWizardEnabled', e.target.checked)} />
                </div>
            </div>

            <div className="bg-gray-800 p-6 rounded-lg">
                <h2 className="text-xl font-bold text-white mb-4">Verification Feature</h2>
                <div className="space-y-4">
                    <div className="flex items-center justify-between bg-gray-700 p-3 rounded-md">
                        <label htmlFor="isVerificationEnabled" className="font-medium text-gray-300">Enable &quot;Get Verified&quot; Feature</label>
                        <input type="checkbox" id="isVerificationEnabled" checked={settings.isVerificationEnabled} onChange={(e) => handleSettingsChange('isVerificationEnabled', e.target.checked)} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-300">Verification Price ($)</label>
                        <input
                            type="number"
                            step="0.01"
                            value={settings.verificationPrice}
                            onChange={(e) => handleSettingsChange('verificationPrice', e.target.value)}
                            className="mt-1 w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-3 text-white"
                        />
                    </div>
                </div>
            </div>

            <div className="bg-gray-800 p-6 rounded-lg">
                <h2 className="text-xl font-bold text-white mb-4">Badge Rules JSON Editor</h2>
                <textarea
                    value={badgeSettingsJson}
                    onChange={(e) => setBadgeSettingsJson(e.target.value)}
                    className="w-full h-96 bg-gray-900 text-green-400 font-mono p-4 rounded-md border border-gray-700"
                />
            </div>

            <AdminPanel />
        </div>
    );
};

export default AdminPage;