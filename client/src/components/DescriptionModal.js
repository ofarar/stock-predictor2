// src/components/DescriptionModal.js
import React from 'react';
import { useTranslation } from 'react-i18next';

const DescriptionModal = ({ isOpen, onClose, description }) => {
    const { t } = useTranslation();
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-50" onClick={onClose}>
            <div className="bg-gray-800 p-6 rounded-lg w-full max-w-lg" onClick={e => e.stopPropagation()}>
                <h3 className="text-lg font-bold text-white mb-2">{t('descriptionModal.title')}</h3>
                <p className="text-gray-300 whitespace-pre-wrap">{description}</p>
            </div>
        </div>
    );
};

export default DescriptionModal;