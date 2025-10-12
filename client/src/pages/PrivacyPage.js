// src/pages/PrivacyPage.js

import React from 'react';
import { useTranslation } from 'react-i18next';

const PrivacyPage = () => {
    const { t } = useTranslation();

    return (
        <div className="max-w-4xl mx-auto text-gray-300">
            <h1 className="text-4xl font-bold text-white text-center mb-8">{t('privacy_title')}</h1>
            <div className="bg-gray-800 p-8 rounded-lg space-y-4 text-gray-300">
                <h2 className="text-xl font-semibold text-white">{t('info_collection_title')}</h2>
                <p>{t('info_collection_text')}</p>

                <h2 className="text-xl font-semibold text-white">{t('use_info_title')}</h2>
                <p>{t('use_info_text')}</p>

                <h2 className="text-xl font-semibold text-white">{t('cookies_title')}</h2>
                <p>{t('cookies_text')}</p>

                <h2 className="text-xl font-semibold text-white">{t('security_title')}</h2>
                <p>{t('security_text')}</p>
            </div>
        </div>
    );
};

export default PrivacyPage;
