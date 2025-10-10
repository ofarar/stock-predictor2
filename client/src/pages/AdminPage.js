// src/pages/AdminPage.js

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import AdminPanel from '../components/AdminPanel';
import AdminUserList from '../components/AdminUserList';

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
                return toast.error("Invalid JSON format. Please check syntax.");
            }
        } else {
            settingsToSave = { isPromoBannerActive: settings.isPromoBannerActive };
        }
        const promise = axios.put(`${process.env.REACT_APP_API_URL}/api/settings/admin`, settingsToSave, { withCredentials: true });
        toast.promise(promise, { loading: 'Saving...', success: 'Settings saved!', error: 'Error saving.' });
    };

    if (loading) return <div className="text-center text-white">Loading Admin Dashboard...</div>;

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            <h1 className="text-3xl font-bold text-white">Admin Dashboard</h1>

            <AdminUserList />

            <div className="bg-gray-800 p-6 rounded-lg">
                <h2 className="text-xl font-bold text-white mb-4">Current Badge Rules</h2>
                <div className="space-y-4">
                    {settings?.badgeSettings && Object.entries(settings.badgeSettings).map(([id, badge]) => (
                        <div key={id} className="bg-gray-700 p-4 rounded-lg">
                            <h3 className="font-bold text-lg text-white">{badge.name}</h3>
                            <p className="text-sm text-gray-400 italic mb-2">{badge.description}</p>
                            <div className="flex gap-4">
                                {badge.tiers && Object.entries(badge.tiers).map(([tier, criteria]) => (
                                    <div key={tier} className="text-center text-xs">
                                        <p className="font-bold">{tier}</p>
                                        <p className="text-gray-300">Score > {criteria.score}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="bg-gray-800 p-6 rounded-lg">
                <h2 className="text-xl font-bold text-white mb-4">Badge Rules JSON Editor</h2>
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