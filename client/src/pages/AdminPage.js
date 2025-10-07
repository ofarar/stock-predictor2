import React, { useState, useEffect } from 'react';
import axios from 'axios';

const AdminPage = () => {
    const [settings, setSettings] = useState(null); // Initialize as null
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        axios.get(`${process.env.REACT_APP_API_URL}/api/settings`)
            .then(res => {
                // If no settings exist in DB, start with a default object
                setSettings(res.data || { isPromoBannerActive: true });
                setLoading(false);
            });
    }, []);

    const handleCheckboxChange = (e) => {
        setSettings({ ...settings, [e.target.name]: e.target.checked });
    };

    const handleSave = () => {
        axios.put(`${process.env.REACT_APP_API_URL}/api/settings/admin`, settings, { withCredentials: true })
            .then(() => alert('Settings saved!'))
            .catch(() => alert('Error saving settings.'));
    };

    if (loading) return <div className="text-center text-white">Loading Settings...</div>;

    return (
        <div className="max-w-4xl mx-auto bg-gray-800 p-8 rounded-lg">
            <h1 className="text-3xl font-bold text-white mb-6">Admin Dashboard</h1>
            <div className="space-y-6">
                <div className="bg-gray-700 p-4 rounded-lg">
                    <h2 className="text-xl font-bold text-white mb-3">Site Features</h2>
                    <div className="flex items-center justify-between">
                        <label htmlFor="isPromoBannerActive" className="text-gray-300">Promotional Banner</label>
                        <input
                            type="checkbox"
                            id="isPromoBannerActive"
                            name="isPromoBannerActive"
                            // Use optional chaining (?.) as a safety check
                            checked={settings?.isPromoBannerActive || false}
                            onChange={handleCheckboxChange}
                            className="w-6 h-6 rounded"
                        />
                    </div>
                </div>
                <button onClick={handleSave} className="bg-green-500 text-white font-bold py-2 px-6 rounded-lg">
                    Save Settings
                </button>
            </div>
        </div>
    );
};

export default AdminPage;