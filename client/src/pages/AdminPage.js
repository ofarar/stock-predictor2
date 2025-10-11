import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import AdminPanel from '../components/AdminPanel';
import AdminUserList from '../components/AdminUserList';
import AIWizardWaitlist from '../components/AIWizardWaitlist';

const AdminPage = () => {
    const [settings, setSettings] = useState({
        isVerificationEnabled: false,
        verificationPrice: 0,
        isAIWizardEnabled: false, // Add initial state
        badgeSettings: {}
    });
    const [loading, setLoading] = useState(true);
    const [badgeSettingsJson, setBadgeSettingsJson] = useState('');
    const navigate = useNavigate();

    useEffect(() => {
        axios.get(`${process.env.REACT_APP_API_URL}/auth/current_user`, { withCredentials: true })
            .then(res => {
                if (!res.data || !res.data.isAdmin) {
                    toast.error("You are not authorized to view this page.");
                    navigate('/');
                    return;
                }
                return axios.get(`${process.env.REACT_APP_API_URL}/api/settings`, { withCredentials: true });
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
            badgeSettings: badgeSettings
        };

        const promise = axios.put(`${process.env.REACT_APP_API_URL}/api/settings/admin`, settingsToSave, { withCredentials: true });
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

            {/* --- NEW AI WIZARD SETTINGS SECTION --- */}
            <div className="bg-gray-800 p-6 rounded-lg">
                <h2 className="text-xl font-bold text-white mb-4">AI Wizard Feature</h2>
                <div className="flex items-center justify-between bg-gray-700 p-3 rounded-md">
                    <label htmlFor="isAIWizardEnabled" className="font-medium text-gray-300">Enable "AI Wizard" Page</label>
                    <input type="checkbox" id="isAIWizardEnabled" checked={settings.isAIWizardEnabled} onChange={(e) => handleSettingsChange('isAIWizardEnabled', e.target.checked)} />
                </div>
            </div>

            {/* --- NEW: The waitlist component is now here, conditionally rendered --- */}
            {settings.isAIWizardEnabled && <AIWizardWaitlist settings={settings} />}

            <div className="bg-gray-800 p-6 rounded-lg">
                <h2 className="text-xl font-bold text-white mb-4">Verification Feature</h2>
                <div className="space-y-4">
                    <div className="flex items-center justify-between bg-gray-700 p-3 rounded-md">
                        <label htmlFor="isVerificationEnabled" className="font-medium text-gray-300">Enable "Get Verified" Feature</label>
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

            <AdminUserList settings={settings} />

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