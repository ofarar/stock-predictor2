// src/pages/AdminPage.js

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import AdminPanel from '../components/AdminPanel';

const AdminPage = () => {
    const [settings, setSettings] = useState(null);
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
                return axios.get(`${process.env.REACT_APP_API_URL}/api/settings`);
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

    const handleSaveSettings = (settingsKey) => {
        let settingsToSave = {};
        if (settingsKey === 'badgeSettings') {
            try {
                settingsToSave = { badgeSettings: JSON.parse(badgeSettingsJson) };
            } catch (e) {
                return toast.error("Invalid JSON format for badges. Please check syntax.");
            }
        } else {
            settingsToSave = { isPromoBannerActive: settings.isPromoBannerActive };
        }

        const promise = axios.put(`${process.env.REACT_APP_API_URL}/api/settings/admin`, settingsToSave, { withCredentials: true });
        toast.promise(promise, {
            loading: 'Saving settings...',
            success: 'Settings saved successfully!',
            error: 'Error saving settings.'
        });
    };

    if (loading) return <div className="text-center text-white">Loading Admin Dashboard...</div>;

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            <h1 className="text-3xl font-bold text-white">Admin Dashboard</h1>
            
            <div className="bg-gray-800 p-6 rounded-lg">
                <h2 className="text-xl font-bold text-white mb-4">Site Settings</h2>
                <div className="space-y-4">
                    <div className="flex items-center justify-between bg-gray-700 p-4 rounded-lg">
                        <label htmlFor="isPromoBannerActive" className="text-gray-300">Show Promotional Banner for Guests</label>
                        <input
                            type="checkbox"
                            id="isPromoBannerActive"
                            name="isPromoBannerActive"
                            checked={settings?.isPromoBannerActive || false}
                            onChange={(e) => setSettings({ ...settings, isPromoBannerActive: e.target.checked })}
                            className="w-6 h-6 rounded text-green-500 bg-gray-900 border-gray-600 focus:ring-green-600"
                        />
                    </div>
                    <div className="flex justify-end">
                        <button onClick={() => handleSaveSettings('promoBanner')} className="bg-green-500 text-white font-bold py-2 px-6 rounded-lg hover:bg-green-600">
                            Save Site Settings
                        </button>
                    </div>
                </div>
            </div>

            <div className="bg-gray-800 p-6 rounded-lg">
                <h2 className="text-xl font-bold text-white mb-4">Badge Rules Editor</h2>
                <p className="text-sm text-gray-400 mb-2">Edit badge rules in JSON format. Changes will apply the next time badges are calculated.</p>
                <textarea
                    value={badgeSettingsJson}
                    onChange={(e) => setBadgeSettingsJson(e.target.value)}
                    className="w-full h-96 bg-gray-900 text-green-400 font-mono p-4 rounded-md border border-gray-700"
                />
                <div className="flex justify-end mt-4">
                    <button onClick={() => handleSaveSettings('badgeSettings')} className="bg-green-500 text-white font-bold py-2 px-6 rounded-lg hover:bg-green-600">
                        Save Badge Rules
                    </button>
                </div>
            </div>

            <AdminPanel />
        </div>
    );
};

export default AdminPage;