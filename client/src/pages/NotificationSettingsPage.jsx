import React, { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next'; // 1. Import the hook

const Toggle = ({ label, description, isEnabled, onToggle }) => (
    <div className="flex items-center justify-between bg-gray-700 p-4 rounded-lg">
        <div>
            <p className="font-semibold text-white">{label}</p>
            <p className="text-sm text-gray-400">{description}</p>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" checked={isEnabled} onChange={onToggle} className="sr-only peer" />
            <div className="w-11 h-6 bg-gray-600 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
        </label>
    </div>
);

const NotificationSettingsPage = () => {
    const { t } = useTranslation(); // 2. Get the translation function
    const [settings, setSettings] = useState(null);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        axios.get(`${import.meta.env.VITE_API_URL}/auth/current_user`, { withCredentials: true })
            .then(res => {
                if (res.data && res.data.notificationSettings) {
                    setSettings(res.data.notificationSettings);
                }
            });
    }, []);

    const handleToggle = (key) => {
        setSettings(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const handleSave = () => {
        setIsSaving(true);
        axios.put(`${import.meta.env.VITE_API_URL}/api/notification-settings`, settings, { withCredentials: true })
            .then(() => toast.success(t('settings_saved_success')))
            .catch(() => toast.error(t('settings_saved_error')))
            .finally(() => setIsSaving(false));
    };

    if (!settings) return <div className="text-center text-gray-400 py-10">{t('loading_settings')}</div>;

    return (
        <div className="max-w-2xl mx-auto bg-gray-800 p-8 rounded-lg">
            {/* 3. Replace all hard-coded text with the t() function */}
            <h1 className="text-3xl font-bold text-white mb-6">{t('notification_settings_title')}</h1>
            <div className="space-y-6">
                <Toggle
                    label={t('toggle_all_predictions_label')}
                    description={t('toggle_all_predictions_description')}
                    isEnabled={settings.allFollowedPredictions}
                    onToggle={() => handleToggle('allFollowedPredictions')}
                />
                <Toggle
                    label={t('toggle_short_term_label')}
                    description={t('toggle_short_term_description')}
                    isEnabled={settings.trustedShortTerm}
                    onToggle={() => handleToggle('trustedShortTerm')}
                />
                <Toggle
                    label={t('toggle_long_term_label')}
                    description={t('toggle_long_term_description')}
                    isEnabled={settings.trustedLongTerm}
                    onToggle={() => handleToggle('trustedLongTerm')}
                />
            </div>
            <div className="flex justify-end mt-8 pt-6 border-t border-gray-700">
                <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="bg-green-500 text-white font-bold py-3 px-6 rounded-md hover:bg-green-600 disabled:bg-gray-500"
                >
                    {isSaving ? t('saving') : t('save_changes')}
                </button>
            </div>
        </div>
    );
};

export default NotificationSettingsPage;