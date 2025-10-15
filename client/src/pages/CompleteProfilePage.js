import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useTranslation, Trans } from 'react-i18next'; // Import Trans

const CompleteProfilePage = () => {
    const { t } = useTranslation(); // Initialize i18n
    const [suggestedUsername, setSuggestedUsername] = useState('');
    const [username, setUsername] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        // Fetch the pending profile data from the server
        axios.get(`${process.env.REACT_APP_API_URL}/api/pending-profile`, { withCredentials: true })
            .then(res => {
                if (res.data && res.data.suggestedUsername) {
                    setSuggestedUsername(res.data.suggestedUsername);
                    setUsername(res.data.suggestedUsername);
                } else {
                    // If there's no pending profile, maybe the user landed here by mistake.
                    navigate('/');
                }
            })
            .catch(err => {
                console.error('Error fetching pending profile:', err);
                navigate('/');
            });
    }, [navigate]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        if (!username.trim()) {
            setError(t('completeProfile.error.empty'));
            setLoading(false);
            return;
        }

        try {
            const response = await axios.post(`${process.env.REACT_APP_API_URL}/api/complete-registration`, { username }, { withCredentials: true });
            if (response.data.success) {
                // Registration is complete, the user is logged in.
                // Redirect to the homepage or dashboard.
                window.location.href = '/'; // Full page reload to update user state
            } else {
                setError(response.data.message || t('completeProfile.error.generic'));
            }
        } catch (err) {
            if (err.response && err.response.data && err.response.data.message) {
                // For server-side messages, we can map them to translation keys if they are consistent
                if (err.response.data.message === 'This username is already taken. Please choose another.') {
                    setError(t('completeProfile.error.taken'));
                } else {
                    setError(err.response.data.message);
                }
            } else {
                setError(t('completeProfile.error.failed'));
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex items-center justify-center pt-10">
            <div className="w-full max-w-md p-8 space-y-6 bg-gray-800 rounded-lg shadow-md">
                <h1 className="text-2xl font-bold text-center text-white">{t('completeProfile.title')}</h1>
                <p className="text-center text-gray-400">
                    <Trans i18nKey="completeProfile.subtitle" values={{ username: suggestedUsername }}>
                        The username <span className="font-semibold text-white">{{username}}</span> is already taken. Please choose a different one to complete your registration.
                    </Trans>
                </p>
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label htmlFor="username" className="text-sm font-medium text-gray-300">
                            {t('completeProfile.usernameLabel')}
                        </label>
                        <input
                            id="username"
                            name="username"
                            type="text"
                            required
                            className="w-full px-3 py-2 mt-1 text-white bg-gray-700 border border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 placeholder-gray-400"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                        />
                    </div>

                    {error && <p className="text-sm text-red-500">{error}</p>}

                    <div>
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                        >
                            {loading ? t('completeProfile.savingButton') : t('completeProfile.completeButton')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CompleteProfilePage;
