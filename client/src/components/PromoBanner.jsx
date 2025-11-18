// src/components/PromoBanner.js

import React, { useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import SignupBenefitsModal from './SignupBenefitsModal';

const PromoBanner = () => {
    const { t } = useTranslation();
    const [isVisible, setIsVisible] = useState(true);
    const [isBenefitsOpen, setIsBenefitsOpen] = useState(false);

    if (!isVisible) {
        return null;
    }

    const loginUrl = `${import.meta.env.VITE_API_URL}/auth/google`;

    return (
        <>
            <SignupBenefitsModal isOpen={isBenefitsOpen} onClose={() => setIsBenefitsOpen(false)} />
            
            <div className="bg-gradient-to-r from-blue-600 to-green-600 text-center p-4 rounded-lg mb-8 relative shadow-lg flex flex-col sm:flex-row items-center justify-between gap-4">
                
                {/* Text Section */}
                <div className="text-white font-medium pr-8 text-left flex-grow">
                    <p className="mb-1">
                        <Trans
                            i18nKey="promoBanner.creatorPoolText"
                            components={[
                                <strong key="0" />, 
                                <span className="font-bold text-yellow-300" key="1" />, 
                                <a href={loginUrl} className="font-bold underline hover:text-white ml-2 whitespace-nowrap" key="2"></a> 
                            ]}
                        />
                    </p>
                </div>

                {/* Buttons Section */}
                <div className="flex items-center gap-3 flex-shrink-0">
                    <button
                        onClick={() => setIsBenefitsOpen(true)}
                        className="bg-white/20 hover:bg-white/30 text-white text-sm font-bold py-2 px-4 rounded-md transition"
                    >
                        {t('promoBanner.whyJoin', 'Why Join?')}
                    </button>
                    <a 
                        href={loginUrl}
                        className="bg-yellow-400 hover:bg-yellow-300 text-blue-900 text-sm font-bold py-2 px-4 rounded-md shadow-md transition-transform hover:scale-105"
                    >
                        {t('promoBanner.joinNow', 'Join Now')}
                    </a>
                </div>

                {/* Close X Button (THE FIX) */}
                <button
                    onClick={() => setIsVisible(false)}
                    className="absolute top-0 right-0 text-white/60 hover:text-white text-xl p-1 leading-none" // CHANGED top-1 right-1 to top-0 right-0
                    aria-label="Close banner"
                >
                    &times;
                </button>
            </div>
        </>
    );
};

export default PromoBanner;