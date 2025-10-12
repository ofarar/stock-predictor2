import React from 'react';
import { useTranslation } from 'react-i18next'; // 1. Import the hook

const AboutPage = () => {
    const { t } = useTranslation(); // 2. Get the translation function 't'
    return (
        <div className="max-w-4xl mx-auto text-gray-300 animate-fade-in">
            {/* 3. Replace text with the t() function and the key from your JSON file */}
            <h1 className="text-4xl font-bold text-white text-center mb-8">{t('about_title')}</h1>

            <div className="bg-gray-800 p-8 rounded-lg space-y-6">
                <section>
                    <h2 className="text-2xl font-semibold text-green-400 mb-3">{t('about_mission_title')}</h2>
                    <p>{t('about_mission_text')}</p>
                </section>

                <section>
                    <h2 className="text-2xl font-semibold text-green-400 mb-3">{t('about_how_it_works_title')}</h2>
                    <div className="grid md:grid-cols-3 gap-6 text-center">
                        <div className="bg-gray-700 p-4 rounded-lg">
                            <h3 className="font-bold text-white mb-2">{t('about_how_it_works_predict_title')}</h3>
                            <p className="text-sm">{t('about_how_it_works_predict_text')}</p>
                        </div>
                        <div className="bg-gray-700 p-4 rounded-lg">
                            <h3 className="font-bold text-white mb-2">{t('about_how_it_works_track_title')}</h3>
                            <p className="text-sm">{t('about_how_it_works_track_text')}</p>
                        </div>
                        <div className="bg-gray-700 p-4 rounded-lg">
                            <h3 className="font-bold text-white mb-2">{t('about_how_it_works_compete_title')}</h3>
                            <p className="text-sm">{t('about_how_it_works_compete_text')}</p>
                        </div>
                    </div>
                </section>

                <section>
                    <h2 className="text-2xl font-semibold text-green-400 mb-3">{t('scoring_explained_title')}</h2>
                    <p>
                        {t('scoring_explained_text1')}
                    </p>
                    <p className="mt-2">
                        {t('scoring_explained_text2')}
                    </p>
                </section>
            </div>
        </div>
    );
};

export default AboutPage;