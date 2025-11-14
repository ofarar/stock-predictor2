// src/components/PromoBanner.js
import React, { useState } from 'react';
import { useTranslation, Trans } from 'react-i18next';

const PromoBanner = () => {
    const [isVisible, setIsVisible] = useState(true);
    const { t } = useTranslation(); // <-- This 't' is now used

    if (!isVisible) {
        return null;
    }

    const loginUrl = `${process.env.REACT_APP_API_URL}/auth/google`;

    return (
        <div className="bg-gradient-to-r from-blue-500 to-green-500 text-center p-4 rounded-lg mb-8 relative shadow-lg">
            {/* FIX: Add pr-8 to make room for the close button */}
            <p className="text-white font-medium pr-8">
                <Trans 
                    i18nKey="promoBanner.creatorPoolText"
                    components={[
                        <strong />, // <0>
                        <span className="font-bold text-yellow-300" />, // <1>
                        // FIX: Pass text *inside* the <a> tag
                        <a href={loginUrl} className="font-bold underline hover:text-white ml-2 whitespace-nowrap">
                        </a> // <2>
                    ]}
                />
            </p>
            <button 
                onClick={() => setIsVisible(false)} 
                className="absolute top-3 right-3 text-white opacity-70 hover:opacity-100 text-2xl"
                aria-label="Close banner"
            >
                &times;
            </button>
        </div>
    );
};

export default PromoBanner;