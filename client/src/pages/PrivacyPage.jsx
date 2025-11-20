// src/pages/PrivacyPage.js

import React from 'react';
import { useTranslation } from 'react-i18next';

// A small helper component to render sections consistently
const PrivacySection = ({ titleKey, textKey, children }) => {
    const { t } = useTranslation();
    return (
        <section className="space-y-2">
            <h2 className="text-xl font-semibold text-white">{t(titleKey)}</h2>
            {textKey && <p className="whitespace-pre-wrap">{t(textKey)}</p>}
            {children}
        </section>
    );
};

const PrivacyPage = () => {
    const { t } = useTranslation();

    return (
        <div className="max-w-4xl mx-auto text-gray-300">
            <h1 className="text-4xl font-bold text-white text-center mb-4">{t('privacy_title')}</h1>
            <p className="text-center text-gray-500 text-sm mb-8">{t('privacy_last_updated')}</p>
            
            <div className="bg-gray-800 p-8 rounded-lg space-y-6 text-gray-300">
                <PrivacySection titleKey="privacy_intro_title" textKey="privacy_intro_text" />
                
                <PrivacySection titleKey="info_collection_title">
                    <div className="pl-4 space-y-2">
                        <h3 className="text-lg font-semibold text-gray-200">{t('info_collection_a_title')}</h3>
                        <p className="whitespace-pre-wrap">{t('info_collection_a_text')}</p>
                        <h3 className="text-lg font-semibold text-gray-200">{t('info_collection_b_title')}</h3>
                        <p className="whitespace-pre-wrap">{t('info_collection_b_text')}</p>
                    </div>
                </PrivacySection>

                <PrivacySection titleKey="use_info_title" textKey="use_info_text" />

                <PrivacySection titleKey="sharing_title" textKey="sharing_text">
                    <ul className="list-disc list-inside pl-4 space-y-1">
                        <li>{t('sharing_list_a')}</li>
                        <li>{t('sharing_list_b')}</li>
                        <li>{t('sharing_list_c')}</li>
                        <li>{t('sharing_list_d')}</li>
                    </ul>
                </PrivacySection>
                
                <PrivacySection titleKey="gdpr_title" textKey="gdpr_intro">
                    <ul className="list-disc list-inside pl-4 space-y-2">
                        <li>{t('gdpr_list_a')}</li>
                        <li>{t('gdpr_list_b')}</li>
                        <li>{t('gdpr_list_c')}</li>
                        <li>{t('gdpr_list_d')}</li>
                    </ul>
                    <p>{t('gdpr_outro')}</p>
                </PrivacySection>
                
                <PrivacySection titleKey="retention_title" textKey="retention_text" />
                <PrivacySection titleKey="cookies_title" textKey="cookies_text" />
                <PrivacySection titleKey="children_title" textKey="children_text" />
                <PrivacySection titleKey="security_title" textKey="security_text" />
                <PrivacySection titleKey="updates_title" textKey="updates_text" />
                <PrivacySection titleKey="contact_title_2" textKey="contact_text" />
            </div>
        </div>
    );
};

export default PrivacyPage;