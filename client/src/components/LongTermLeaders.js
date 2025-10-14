// src/components/LongTermLeaders.js

import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import VerifiedTick from './VerifiedTick'; // Import the component

const LongTermLeaders = ({ leaders = [], settings }) => { // Accept settings prop
    const { t } = useTranslation();

    return (
        <div className="bg-gray-800 p-6 rounded-xl">
            <div className="flex items-center mb-4">
                <svg className="w-6 h-6 text-purple-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                </svg>
                <h3 className="text-xl font-bold text-white">{t('longTermLeaders.title')}</h3>
            </div>
            <p className="text-sm text-gray-400 mb-4">{t('longTermLeaders.description')}</p>
            <div className="space-y-3">
                {leaders.length > 0 ? leaders.map((leader) => (
                    <Link 
                        to={`/profile/${leader.userId}`} 
                        key={leader.userId} 
                        className="flex items-center bg-gray-700 p-2 rounded-lg hover:bg-gray-600"
                    >
                        <img 
                            src={leader.avatar || `https://avatar.iran.liara.run/public/boy?username=${leader.userId}`}
                            alt="avatar"
                            className={`w-8 h-8 rounded-full border-2 ${leader.isGoldenMember ? 'border-yellow-400' : 'border-gray-600'}`}
                        />
                        <div className="flex items-center gap-2 ml-3 flex-grow">
                            <span className="font-semibold text-white">{leader.username}</span>
                            {/* Add the VerifiedTick here */}
                            {settings?.isVerificationEnabled && leader.isVerified && <VerifiedTick />}
                        </div>
                        <span className="font-bold text-green-400">{leader.accuracy}% {t('longTermLeaders.accuracyLabel')}</span>
                    </Link>
                )) : (
                    <p className="text-gray-500 text-center py-4">{t('longTermLeaders.noData')}</p>
                )}
            </div>
        </div>
    );
};

export default LongTermLeaders;