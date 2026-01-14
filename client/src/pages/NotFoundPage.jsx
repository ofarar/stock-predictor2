import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const NotFoundPage = () => {
    const { t } = useTranslation();

    return (
        <div className="min-h-[70vh] flex flex-col items-center justify-center text-center px-4">
            <h1 className="text-6xl md:text-8xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-600 mb-4">
                404
            </h1>
            <h2 className="text-2xl md:text-3xl font-bold text-gray-200 mb-6">
                {t('errors.pageNotFound', 'Page Not Found')}
            </h2>
            <p className="text-gray-400 max-w-md mb-8 text-lg">
                {t('errors.pageNotFoundDesc', "The page you are looking for might have been removed, had its name changed, or is temporarily unavailable.")}
            </p>

            <Link
                to="/"
                className="px-8 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white rounded-xl font-medium transition-all transform hover:scale-105 shadow-lg shadow-blue-900/20"
            >
                {t('common.backToHome', 'Back to Home')}
            </Link>
        </div>
    );
};

export default NotFoundPage;
