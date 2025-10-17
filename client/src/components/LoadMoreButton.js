import React from 'react';
import { useTranslation } from 'react-i18next';

const LoadMoreButton = ({ onClick, isLoading, hasMore }) => {
    const { t } = useTranslation();

    if (!hasMore) {
        return null;
    }

    return (
        <div className="flex items-center justify-center my-8">
            {/* Left line */}
            <div className="flex-1 border-t border-gray-700" />

            {/* Button */}
            <button
                onClick={onClick}
                disabled={isLoading}
                className="mx-4 bg-gray-800 px-6 py-2 text-sm font-bold text-gray-300 rounded-full border border-gray-700 hover:bg-gray-700 hover:text-white disabled:bg-gray-600 disabled:cursor-not-allowed"
            >
                {isLoading ? t('explore_loading') : t('explore_load_more')}
            </button>

            {/* Right line */}
            <div className="flex-1 border-t border-gray-700" />
        </div>
    );
};

export default LoadMoreButton;
