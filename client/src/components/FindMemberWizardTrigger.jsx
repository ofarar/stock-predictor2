import React from 'react';
import { useTranslation } from 'react-i18next';

const FindMemberWizardTrigger = ({ onClick }) => {
    const { t } = useTranslation();

    return (
        <div className="col-span-full bg-gray-800 rounded-lg p-6 my-8 text-center border-2 border-dashed border-gray-600 hover:border-yellow-400 transition-all duration-300">
            <h3 className="text-2xl font-bold text-yellow-400 mb-2">{t('find_member_wizard.trigger_title')}</h3>
            <p className="text-gray-300 mb-4 max-w-2xl mx-auto">{t('find_member_wizard.trigger_description')}</p>
            <button
                onClick={onClick}
                className="bg-yellow-500 text-gray-900 font-bold py-2 px-6 rounded-lg hover:bg-yellow-400 transition-transform transform hover:scale-105"
            >
                {t('find_member_wizard.trigger_button')}
            </button>
        </div>
    );
};

export default FindMemberWizardTrigger;