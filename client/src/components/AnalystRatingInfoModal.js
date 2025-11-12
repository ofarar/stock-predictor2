// src/components/AnalystRatingInfoModal.js
import React from 'react';
import { useTranslation } from 'react-i18next';

const InfoSection = ({ title, text }) => (
    <div className="bg-gray-700 p-3 rounded-md">
        <h3 className="font-bold text-green-400">{title}</h3>
        <p className="text-sm text-gray-300">{text}</p>
    </div>
);

const AnalystRatingInfoModal = ({ isOpen, onClose }) => {
    const { t } = useTranslation();

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-50 p-4" onClick={onClose}>
            <div className="bg-gray-800 p-6 rounded-lg w-full max-w-lg" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-bold text-white">{t('analystRatingInfo.title')}</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                    </button>
                </div>

                <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2 modern-scrollbar">
                    <p className="text-gray-300">{t('analystRatingInfo.description')}</p>
                    <InfoSection title={t('analystRatingInfo.section1.title')} text={t('analystRatingInfo.section1.text')} />
                    <InfoSection title={t('analystRatingInfo.section2.title')} text={t('analystRatingInfo.section2.text')} />
                    <InfoSection title={t('analystRatingInfo.section3.title')} text={t('analystRatingInfo.section3.text')} />
                    <InfoSection title={t('analystRatingInfo.section4.title')} text={t('analystRatingInfo.section4.text')} />
                </div>

                <div className="flex justify-end mt-6 pt-4 border-t border-gray-700">
                    <button onClick={onClose} className="bg-gray-600 text-white font-bold py-2 px-6 rounded-lg hover:bg-gray-700">
                        {t('common.close')}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AnalystRatingInfoModal;