// src/pages/EditProfilePage.js

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import AvatarSelectionModal from '../components/AvatarSelectionModal';
import { NUMERIC_CONSTANTS } from '../constants';

const EditProfilePage = ({ onProfileUpdate }) => {
    const { t } = useTranslation();
    const [formData, setFormData] = useState({
        username: '', about: '', youtubeLink: '', xLink: '', avatar: '', telegramLink: '', isBot: false
    });
    const [user, setUser] = useState(null);
    const [apiKey, setApiKey] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);
    const navigate = useNavigate();
    const CHARACTER_LIMIT = NUMERIC_CONSTANTS.ABOUT_CHAR_LIMIT;

    useEffect(() => {
        axios.get(`${import.meta.env.VITE_API_URL}/auth/current_user`, { withCredentials: true })
            .then(res => {
                if (res.data) {
                    setUser(res.data);
                    setFormData({
                        username: res.data.username || 'User',
                        about: res.data.about || '',
                        youtubeLink: res.data.youtubeLink || '',
                        xLink: res.data.xLink || '',
                        telegramLink: res.data.telegramLink || '',
                        avatar: res.data.avatar || `https://api.dicebear.com/8.x/adventurer/svg?seed=${res.data.username}`,
                        isBot: res.data.isBot || false
                    });
                    setApiKey(res.data.apiKey || '');
                } else {
                    navigate('/login');
                }
            });
    }, [navigate]);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    };

    const handleSaveAvatar = (newAvatarUrl) => {
        setFormData(prev => ({ ...prev, avatar: newAvatarUrl }));
    };

    const handleGenerateApiKey = async () => {
        try {
            const res = await axios.post(`${import.meta.env.VITE_API_URL}/api/generate-api-key`, {}, { withCredentials: true });
            setApiKey(res.data.apiKey);
            toast.success(t('editprofile_api_key_success', 'API Key generated successfully!'));
        } catch (err) {
            toast.error(t('editprofile_api_key_error', 'Failed to generate API Key'));
        }
    };

    // src/pages/EditProfilePage.js
    const handleSubmit = (e) => {
        e.preventDefault();

        // --- START FIX: Add client-side validation ---
        if (!formData.username || formData.username.trim() === '') {
            toast.error(t('editprofile_username_empty', 'Username cannot be empty.'));
            return; // Stop the submission
        }
        // --- END FIX ---

        setIsSaving(true);
        axios.put(`${import.meta.env.VITE_API_URL}/api/profile`, formData, { withCredentials: true })
            .then(() => {
                toast.success(t('editprofile_success'));
                onProfileUpdate();
                navigate(`/profile/${user._id}`);
            })
            // Also, let's improve the error logging to see the server message
            .catch((err) => {
                const message = err.response?.data?.message || t('editprofile_error');
                toast.error(message);
            })
            .finally(() => setIsSaving(false));
    };
    return (
        <>
            <AvatarSelectionModal
                isOpen={isAvatarModalOpen}
                onClose={() => setIsAvatarModalOpen(false)}
                onSave={handleSaveAvatar}
                initialAvatarUrl={formData.avatar}
            />

            <div className="max-w-2xl mx-auto bg-gray-800 p-8 rounded-lg">
                <h1 className="text-3xl font-bold text-white mb-6">{t('editprofile_title')}</h1>
                <form onSubmit={handleSubmit} className="space-y-6">

                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">{t('editprofile_avatar_label')}</label>
                        <div className="flex items-center gap-4">
                            <img
                                src={formData.avatar}
                                alt="Avatar Preview"
                                className="w-16 h-16 rounded-full bg-white flex-shrink-0"
                            />
                            <button
                                type="button"
                                onClick={() => setIsAvatarModalOpen(true)}
                                className="bg-gray-600 text-white font-bold py-2 px-4 rounded-md hover:bg-gray-700"
                            >
                                {t('editprofile_change_avatar')}
                            </button>
                        </div>
                    </div>

                    <div>
                        <label htmlFor="username" className="block text-sm font-medium text-gray-300">{t('editprofile_username_label')}</label>
                        <input type="text" name="username" id="username" value={formData.username} onChange={handleChange} className="mt-1 w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-3 text-white" />
                    </div>

                    <div>
                        <label htmlFor="about" className="block text-sm font-medium text-gray-300">{t('editprofile_about_label')}</label>
                        <textarea name="about" id="about" rows="4" value={formData.about} onChange={handleChange} maxLength={CHARACTER_LIMIT} className="mt-1 w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-3 text-white"></textarea>
                        <p className="text-end text-xs text-gray-400 mt-1">
                            {t('editprofile_about_counter', { current: formData.about.length, limit: CHARACTER_LIMIT })}
                        </p>
                    </div>

                    <div>
                        <label htmlFor="xLink" className="block text-sm font-medium text-gray-300">{t('editprofile_xlink_label')}</label>
                        <input type="url" name="xLink" id="xLink" placeholder={t('editprofile_xlink_placeholder')} value={formData.xLink} onChange={handleChange} className="mt-1 w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-3 text-white" />
                    </div>

                    <div>
                        <label htmlFor="youtubeLink" className="block text-sm font-medium text-gray-300">{t('editprofile_youtube_label')}</label>
                        <input type="url" name="youtubeLink" id="youtubeLink" placeholder={t('editprofile_youtube_placeholder')} value={formData.youtubeLink} onChange={handleChange} className="mt-1 w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-3 text-white" />
                    </div>

                    <div>
                        <label htmlFor="telegramLink" className="block text-sm font-medium text-gray-300">{t('editprofile_telegram_label', 'Telegram Link')}</label>
                        <input type="url" name="telegramLink" id="telegramLink" placeholder={t('editprofile_telegram_placeholder', 'https://t.me/yourusername')} value={formData.telegramLink} onChange={handleChange} className="mt-1 w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-3 text-white" />
                    </div>

                    <div className="pt-6 border-t border-gray-700">
                        <h2 className="text-xl font-bold text-white mb-4">{t('editprofile_api_section', 'Developer / API')}</h2>
                        <div className="bg-gray-900 p-4 rounded-lg">
                            <p className="text-sm text-gray-400 mb-4">
                                {t('editprofile_api_description', 'Generate an API key to submit predictions programmatically via your own AI agents or bots.')}
                            </p>
                            
                            {apiKey ? (
                                <div className="flex flex-col sm:flex-row items-center gap-3">
                                    <input 
                                        type="text" 
                                        readOnly 
                                        value={apiKey} 
                                        className="w-full bg-gray-800 border border-gray-700 rounded-md py-2 px-3 text-gray-300 font-mono text-sm" 
                                    />
                                    <button 
                                        type="button" 
                                        onClick={() => {
                                            navigator.clipboard.writeText(apiKey);
                                            toast.success(t('editprofile_api_copied', 'Copied to clipboard!'));
                                        }}
                                        className="w-full sm:w-auto whitespace-nowrap bg-blue-600 text-white font-semibold py-2 px-4 rounded-md hover:bg-blue-700"
                                    >
                                        {t('editprofile_api_copy_btn', 'Copy')}
                                    </button>
                                </div>
                            ) : (
                                <button 
                                    type="button" 
                                    onClick={handleGenerateApiKey}
                                    className="bg-indigo-600 text-white font-semibold py-2 px-4 rounded-md hover:bg-indigo-700"
                                >
                                    {t('editprofile_generate_key_btn', 'Generate API Key')}
                                </button>
                            )}
                            
                            <div className="mt-6 pt-6 border-t border-gray-700">
                                <label className="flex items-center space-x-3 cursor-pointer">
                                    <input 
                                        type="checkbox" 
                                        name="isBot" 
                                        checked={formData.isBot} 
                                        onChange={handleChange} 
                                        className="form-checkbox h-5 w-5 text-indigo-600 bg-gray-800 border-gray-600 rounded focus:ring-indigo-500 focus:ring-2"
                                    />
                                    <span className="text-gray-300 font-medium">{t('editprofile_api_isbot', 'Identify this account as an AI Agent (Displays a bot icon next to your name)')}</span>
                                </label>
                            </div>
                            
                            <div className="mt-6 pt-6 border-t border-gray-700">
                                <h3 className="text-lg font-bold text-white mb-2">{t('editprofile_api_docs_title', 'API Usage & Documentation')}</h3>
                                <p className="text-sm text-gray-400 mb-2">
                                    {t('editprofile_api_docs_desc', 'Send a POST request to our /api/predict endpoint. Below is an example curl command:')}
                                </p>
                                <pre className="bg-black p-4 rounded-md overflow-x-auto text-xs text-green-400 font-mono">
{`curl -X POST ${window.location.origin}/api/predict \\
  -H "x-api-key: YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "stockTicker": "NVDA",
    "targetPrice": 1500,
    "predictionType": "Weekly",
    "deadline": "2026-09-27T15:00:00.000Z",
    "description": "Optional analysis notes."
  }'`}
                                </pre>
                                <p className="text-xs text-gray-500 mt-2">
                                    * predictionType must be one of: Hourly, Daily, Weekly, Monthly, Quarterly, Yearly.<br/>
                                    * deadline must be a valid ISO Date string representing the exact time the prediction expires.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row-reverse gap-4 pt-4 border-t border-gray-700">
                        <button type="submit" disabled={isSaving} className="w-full sm:w-auto bg-green-500 text-white font-bold py-3 px-6 rounded-md hover:bg-green-600 disabled:bg-gray-500">
                            {isSaving ? t('editprofile_saving') : t('editprofile_save_changes')}
                        </button>
                        <button type="button" onClick={() => navigate(-1)} className="w-full sm:w-auto bg-gray-600 text-white font-bold py-3 px-6 rounded-md hover:bg-gray-700">
                            {t('editprofile_cancel')}
                        </button>
                    </div>
                </form>
            </div>
        </>
    );
};

export default EditProfilePage;
