import React from 'react';
import { useTranslation } from 'react-i18next';

const LoginPage = () => {
    const { t } = useTranslation();
    return (
        <div className="flex flex-col items-center justify-center text-center mt-20">
            <h1 className="text-4xl font-bold text-white mb-4">{t('welcome_message')}</h1>
            <p className="text-gray-300 mb-8">{t('description')}</p>
            <a 
                href={`${process.env.REACT_APP_API_URL}/auth/google`}
                className="bg-blue-600 text-white font-bold py-3 px-6 rounded-lg flex items-center space-x-3 hover:bg-blue-700 transition"
            >
                {/* You can use an SVG icon for the Google logo here */}
                <span>{t('google_signin')}</span>
            </a>
        </div>
    );
};

export default LoginPage;
