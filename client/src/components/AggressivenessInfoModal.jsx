// src/components/AggressivenessInfoModal.js
import React from 'react';
import ReactDOM from 'react-dom';
import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';

const InfoSection = ({ title, text }) => (
    <div className="bg-gray-700 p-3 rounded-md">
        <h3 className="font-bold text-green-400">{title}</h3>
        <p className="text-sm text-gray-300">{text}</p>
    </div>
);
InfoSection.propTypes = {
    title: PropTypes.string.isRequired,
    text: PropTypes.string.isRequired,
};

const AggressivenessInfoModal = ({ isOpen, onClose }) => {
    const { t } = useTranslation();

    if (!isOpen) return null;

    return ReactDOM.createPortal(
        // sonarlint-disable-next-line javascript:S6819
        <div
            className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-50 p-4"
            onClick={onClose}
            onKeyDown={(e) => { if (e.key === 'Escape') onClose(); }} // Closes on Escape key
            role="button" // Tells screen readers it's interactive
            tabIndex="-1" // Makes it focusable
        >
            {/* sonarlint-disable-next-line javascript:S6848, javascript:S1082 */}
            <div className="bg-gray-800 p-6 rounded-lg w-full max-w-lg" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-bold text-white">{t('aggressivenessInfoModal.title')}</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                    </button>
                </div>

                <div className="space-y-4 max-h-[70vh] overflow-y-auto pe-2 modern-scrollbar">
                    <p className="text-gray-300">{t('aggressivenessInfoModal.description')}</p>
                    <InfoSection title={t('aggressivenessInfoModal.defensiveTitle')} text={t('aggressivenessInfoModal.defensiveText')} />
                    <InfoSection title={t('aggressivenessInfoModal.neutralTitle')} text={t('aggressivenessInfoModal.neutralText')} />
                    <InfoSection title={t('aggressivenessInfoModal.offensiveTitle')} text={t('aggressivenessInfoModal.offensiveText')} />
                </div>

                <div className="flex justify-end mt-6 pt-4 border-t border-gray-700">
                    <button onClick={onClose} className="bg-gray-600 text-white font-bold py-2 px-6 rounded-lg hover:bg-gray-700">
                        {t('common.close')}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};

AggressivenessInfoModal.propTypes = {
    isOpen: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired,
};
export default AggressivenessInfoModal;