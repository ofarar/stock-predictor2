import React from 'react';
import ReactDOM from 'react-dom';
import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';

const DirectionAccuracyInfoModal = ({ isOpen, onClose }) => {
    const { t } = useTranslation();

    if (!isOpen) return null;

    return ReactDOM.createPortal(
        <div
            className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-50 p-4"
            onClick={onClose}
            onKeyDown={(e) => { if (e.key === 'Escape') onClose(); }}
            role="button"
            tabIndex="-1"
        >
            <div className="bg-gray-800 p-6 rounded-lg w-full max-w-lg" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-bold text-white">{t('directionAccuracyInfoModal.title', 'Understanding Direction Accuracy')}</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                    </button>
                </div>

                <div className="space-y-4 max-h-[70vh] overflow-y-auto pe-2 modern-scrollbar">
                    <p className="text-gray-300">
                        {t('directionAccuracyInfoModal.description', 'This metric shows how often a user correctly predicts whether the price will go up or down, regardless of the exact target price.')}
                    </p>
                    <div className="bg-gray-700 p-3 rounded-md">
                        <h3 className="font-bold text-green-400">{t('directionAccuracyInfoModal.howItWorks', 'How it works')}</h3>
                        <p className="text-sm text-gray-300 mt-1">
                            {t('directionAccuracyInfoModal.explanation', 'If a user predicts a price increase and the price actually increases (even if it misses the target), it counts as a correct directional prediction. The same applies for predicted price decreases.')}
                        </p>
                    </div>
                </div>

                <div className="flex justify-end mt-6 pt-4 border-t border-gray-700">
                    <button onClick={onClose} className="bg-gray-600 text-white font-bold py-2 px-6 rounded-lg hover:bg-gray-700">
                        {t('common.close', 'Close')}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};

DirectionAccuracyInfoModal.propTypes = {
    isOpen: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired,
};

export default DirectionAccuracyInfoModal;
