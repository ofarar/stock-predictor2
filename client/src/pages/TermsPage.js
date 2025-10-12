import React from 'react';
import { useTranslation } from 'react-i18next';

const TermsPage = () => {
    const { t } = useTranslation();

    return (
        <div className="max-w-4xl mx-auto text-gray-300">
            <h1 className="text-4xl font-bold text-white text-center mb-8">
                {t('terms_page.title')}
            </h1>
            <div className="bg-gray-800 p-8 rounded-lg space-y-4 text-gray-300">
                <h2 className="text-xl font-semibold text-white">
                    {t('terms_page.sections.acceptance_of_terms.title')}
                </h2>
                <p>{t('terms_page.sections.acceptance_of_terms.content')}</p>

                <h2 className="text-xl font-semibold text-white">
                    {t('terms_page.sections.no_financial_advice.title')}
                </h2>
                <p>{t('terms_page.sections.no_financial_advice.content')}</p>

                <h2 className="text-xl font-semibold text-white">
                    {t('terms_page.sections.user_conduct.title')}
                </h2>
                <p>{t('terms_page.sections.user_conduct.content')}</p>

                <h2 className="text-xl font-semibold text-white">
                    {t('terms_page.sections.limitation_of_liability.title')}
                </h2>
                <p>{t('terms_page.sections.limitation_of_liability.content')}</p>
            </div>
        </div>
    );
};

export default TermsPage;
