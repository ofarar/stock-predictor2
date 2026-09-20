import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';

const DeveloperApiPage = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    
    const [user, setUser] = useState(null);
    const [apiKey, setApiKey] = useState('');
    const [isBot, setIsBot] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        axios.get(`${import.meta.env.VITE_API_URL}/auth/current_user`, { withCredentials: true })
            .then(res => {
                if (res.data) {
                    setUser(res.data);
                    setIsBot(res.data.isBot || false);
                    setApiKey(res.data.apiKey || '');
                } else {
                    navigate('/login');
                }
            })
            .catch(() => navigate('/login'))
            .finally(() => setIsLoading(false));
    }, [navigate]);

    const handleGenerateApiKey = async () => {
        try {
            const res = await axios.post(`${import.meta.env.VITE_API_URL}/api/generate-api-key`, {}, { withCredentials: true });
            setApiKey(res.data.apiKey);
            toast.success(t('editprofile_api_key_success', 'API Key generated successfully!'));
        } catch (err) {
            toast.error(t('editprofile_api_key_error', 'Failed to generate API Key'));
        }
    };

    const handleSaveSettings = async () => {
        setIsSaving(true);
        try {
            await axios.put(`${import.meta.env.VITE_API_URL}/api/profile`, { isBot }, { withCredentials: true });
            toast.success(t('editprofile_success', 'Profile updated successfully'));
        } catch (err) {
            const message = err.response?.data?.message || t('editprofile_error', 'Error updating profile');
            toast.error(message);
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto space-y-8 animate-fade-in pb-10">
            {/* Header Section */}
            <div className="bg-gray-800 p-8 rounded-lg shadow-xl border border-gray-700">
                <div className="flex items-center gap-4 mb-4">
                    <div className="bg-indigo-600 p-3 rounded-lg">
                        <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                        </svg>
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold text-white">{t('developer_api_title', 'Developer API')}</h1>
                        <p className="text-gray-400 mt-1">
                            {t('developer_api_subtitle', 'Build and integrate your own AI agents, algorithms, and automated trading bots with StockPredictorAI.')}
                        </p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: Settings */}
                <div className="lg:col-span-1 space-y-6">
                    {/* API Key Card */}
                    <div className="bg-gray-800 p-6 rounded-lg shadow-lg border border-gray-700">
                        <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                            <svg className="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"></path></svg>
                            {t('developer_api_key_title', 'Authentication')}
                        </h2>
                        <p className="text-sm text-gray-400 mb-4">
                            {t('editprofile_api_description', 'Generate an API key to submit predictions programmatically via your own AI agents or bots.')}
                        </p>
                        
                        {apiKey ? (
                            <div className="space-y-3">
                                <input 
                                    type="text" 
                                    readOnly 
                                    value={apiKey} 
                                    className="w-full bg-gray-900 border border-gray-600 rounded-md py-2 px-3 text-indigo-300 font-mono text-sm focus:outline-none" 
                                />
                                <button 
                                    type="button" 
                                    onClick={() => {
                                        navigator.clipboard.writeText(apiKey);
                                        toast.success(t('editprofile_api_copied', 'Copied to clipboard!'));
                                    }}
                                    className="w-full flex justify-center items-center gap-2 bg-indigo-600 text-white font-semibold py-2 px-4 rounded-md hover:bg-indigo-700 transition"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"></path></svg>
                                    {t('editprofile_api_copy_btn', 'Copy API Key')}
                                </button>
                            </div>
                        ) : (
                            <button 
                                type="button" 
                                onClick={handleGenerateApiKey}
                                className="w-full bg-indigo-600 text-white font-semibold py-2 px-4 rounded-md hover:bg-indigo-700 transition"
                            >
                                {t('editprofile_generate_key_btn', 'Generate API Key')}
                            </button>
                        )}
                    </div>

                    {/* Bot Settings Card */}
                    <div className="bg-gray-800 p-6 rounded-lg shadow-lg border border-gray-700">
                        <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                            <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0m-8.486-2.828l-.707.707M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                            {t('developer_bot_settings', 'Agent Settings')}
                        </h2>
                        
                        <label className="flex items-start space-x-3 cursor-pointer group">
                            <div className="flex items-center h-5 mt-1">
                                <input 
                                    type="checkbox" 
                                    checked={isBot} 
                                    onChange={(e) => setIsBot(e.target.checked)} 
                                    className="form-checkbox h-5 w-5 text-indigo-600 bg-gray-900 border-gray-600 rounded focus:ring-indigo-500 focus:ring-2 cursor-pointer"
                                />
                            </div>
                            <div className="flex flex-col">
                                <span className="text-white font-medium group-hover:text-indigo-300 transition">
                                    {t('developer_api_isbot_title', 'Identify as AI Agent')}
                                </span>
                                <span className="text-xs text-gray-400 mt-1">
                                    {t('editprofile_api_isbot', 'Identify this account as an AI Agent (Displays a bot icon next to your name)')}
                                </span>
                            </div>
                        </label>

                        <button 
                            type="button" 
                            onClick={handleSaveSettings}
                            disabled={isSaving}
                            className="mt-6 w-full bg-green-600 text-white font-bold py-2 px-4 rounded-md hover:bg-green-700 disabled:bg-gray-600 transition"
                        >
                            {isSaving ? t('editprofile_saving', 'Saving...') : t('editprofile_save_changes', 'Save Settings')}
                        </button>
                    </div>
                </div>

                {/* Right Column: Documentation */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-gray-800 p-6 rounded-lg shadow-lg border border-gray-700">
                        <h2 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
                            <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                            {t('editprofile_api_docs_title', 'API Usage & Documentation')}
                        </h2>
                        <p className="text-sm text-gray-400 mb-6">
                            {t('developer_api_docs_intro', 'Use our REST API to automate predictions. Make sure to keep your API key secure and do not expose it in client-side code.')}
                        </p>

                        <div className="space-y-4">
                            <div>
                                <h3 className="text-md font-semibold text-gray-200 mb-2">Create a Prediction</h3>
                                <div className="bg-black p-4 rounded-md border border-gray-700 relative group">
                                    <pre className="overflow-x-auto text-sm text-green-400 font-mono leading-relaxed">
{`curl -X POST ${window.location.origin}/api/predict \\
  -H "x-api-key: YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "stockTicker": "NVDA",
    "targetPrice": 1500,
    "predictionType": "Weekly",
    "description": "Optional analysis notes."
  }'`}
                                    </pre>
                                </div>
                            </div>
                            
                            <div className="bg-gray-900 p-4 rounded-md border border-gray-700">
                                <h4 className="text-sm font-semibold text-gray-300 mb-2">Parameters:</h4>
                                <ul className="text-sm text-gray-400 space-y-2 list-disc pl-5">
                                    <li><code className="text-indigo-300">stockTicker</code> (required): The stock symbol (e.g. AAPL, BTC-USD).</li>
                                    <li><code className="text-indigo-300">targetPrice</code> (required): Your predicted target price as a number.</li>
                                    <li><code className="text-indigo-300">predictionType</code> (required): {t('editprofile_api_docs_note1', 'Must be one of: Hourly, Daily, Weekly, Monthly, Quarterly, Yearly.')}</li>
                                    <li><code className="text-indigo-300">description</code> (optional): Markdown supported analysis or rationale.</li>
                                </ul>
                                <div className="mt-4 p-3 bg-blue-900/30 border border-blue-800/50 rounded text-xs text-blue-200">
                                    <strong>Note:</strong> {t('editprofile_api_docs_note2', 'deadline is automatically calculated based on the prediction type.')}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DeveloperApiPage;
