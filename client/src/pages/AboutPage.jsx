// src/pages/AboutPage.js

import React from 'react';
import { useTranslation } from 'react-i18next';

const AboutPage = () => {
    const { t } = useTranslation();

    const steps = [
        { 
            title: t('about_how_it_works_predict_title'), 
            text: t('about_how_it_works_predict_text'),
            icon: <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"></path></svg>
        },
        { 
            title: t('about_how_it_works_compete_title'), 
            text: t('about_how_it_works_compete_text'),
            icon: <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0h6"></path></svg>
        },
        { 
            title: t('about_how_it_works_follow_title'), 
            text: t('about_how_it_works_follow_text'),
            icon: <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm-9 0a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
        },
        { 
            title: t('about_how_it_works_golden_title'), 
            text: t('about_how_it_works_golden_text'),
            icon: <svg className="w-8 h-8 text-yellow-400" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path></svg>
        },
        { 
            title: t('about_how_it_works_track_title'), 
            text: t('about_how_it_works_track_text'),
            icon: <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path></svg>
        },
    ];

    return (
        <div className="max-w-5xl mx-auto text-gray-300 animate-fade-in">
            <h1 className="text-4xl font-bold text-white text-center mb-8">{t('about_title')}</h1>

            <div className="bg-gray-800 p-8 rounded-lg space-y-10">
                <section>
                    <h2 className="text-2xl font-semibold text-green-400 mb-3">{t('about_mission_title')}</h2>
                    <p>{t('about_mission_text')}</p>
                </section>

                <section>
                    <h2 className="text-2xl font-semibold text-green-400 mb-4">{t('about_how_it_works_title')}</h2>
                    
                    <div className="horizontal-fade">
                        <div className="flex gap-6 overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800 px-2">
                            {steps.map((step, index) => (
                                <div key={index} className="flex-shrink-0 w-64 flex flex-col items-center bg-gray-700 p-6 rounded-lg text-center">
                                    <div className="flex items-center justify-center w-16 h-16 rounded-full bg-gray-900 mb-4">
                                        {step.icon}
                                    </div>
                                    <h3 className="font-bold text-white text-lg mb-2">{step.title}</h3>
                                    <p className="text-sm text-gray-400">{step.text}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                <section>
                    <h2 className="text-2xl font-semibold text-green-400 mb-3">{t('rating_explained_title')}</h2>
                    <p>{t('rating_explained_text1')}</p>
                    <p className="mt-2">{t('rating_explained_text2')}</p>
                </section>
            </div>
        </div>
    );
};

export default AboutPage;