// src/components/EditPredictionModal.js
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import TimePenaltyBar from './TimePenaltyBar';
import InfoModal from './InfoModal';
import { formatPercentage } from '../utils/formatters';
import { getPredictionDetails } from '../utils/timeHelpers';

const EditPredictionModal = ({ isOpen, onClose, prediction, onUpdate }) => {
    const { t, i18n } = useTranslation();

    const [target, setTarget] = useState('');
    const [reason, setReason] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);
    const [formState, setFormState] = useState({ isOpen: true, message: '', barWidth: '100%' });

    useEffect(() => {
        if (prediction) {
            setTarget(prediction.targetPrice.toFixed(2));
            setReason(''); // Clear reason for each new edit
            const details = getPredictionDetails(prediction.predictionType, t, i18n);
            setFormState(details);
        }
    }, [prediction, t, i18n]);

    const handleSubmit = (e) => {
        e.preventDefault();
        setIsSaving(true);
        axios.put(`${import.meta.env.VITE_API_URL}/api/predictions/${prediction._id}/edit`, {
            newTargetPrice: parseFloat(target),
            reason: reason,
        }, { withCredentials: true })
            .then(() => {
                toast.success(t('editPredictionModal.successToast'));
                if (onUpdate) onUpdate(); // Refetch data on the parent page
                onClose();
            })
            .catch(err => toast.error(err.response?.data?.message || t('editPredictionModal.errorToast')))
            .finally(() => setIsSaving(false));
    };

    if (!isOpen || !prediction) return null;

    // Resilient Percentage Calculation: Use original target as base if needed
    let percentageChange = null;
    const originalTarget = prediction.history.length > 0
        ? prediction.history[prediction.history.length - 1].newTargetPrice // Last edited price
        : prediction.targetPriceAtCreation; // Original prediction price

    if (originalTarget > 0 && target) {
        percentageChange = ((parseFloat(target) - originalTarget) / originalTarget) * 100;
    }

    return (
        <>
            <InfoModal isOpen={isInfoModalOpen} onClose={() => setIsInfoModalOpen(false)} />
            <div className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-50 p-4" onClick={onClose}>
                <div className="bg-gray-800 p-6 rounded-lg w-full max-w-md" onClick={e => e.stopPropagation()}>
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-2xl font-bold text-white">{t('editPredictionModal.title', { ticker: prediction.stockTicker })}</h2>
                        <button onClick={onClose} className="text-gray-400 hover:text-white">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <TimePenaltyBar
                            message={formState.message}
                            barWidth={formState.barWidth}
                            onInfoClick={() => setIsInfoModalOpen(true)}
                        />

                        <div>
                            <label className="block text-xs font-bold text-gray-400 mb-1">{t('editPredictionModal.newTargetPriceLabel')}</label>
                            <div className="flex items-center gap-2 bg-gray-900 rounded-md pe-2">
                                <input type="number" step="0.01" value={target} onChange={(e) => setTarget(e.target.value)} className="w-full bg-transparent p-2 text-white focus:outline-none" />
                                {/* Conditionally render the percentage */}
                                {typeof percentageChange === 'number' ? (
                                    <span className={`font-bold text-sm ${percentageChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                        {formatPercentage(percentageChange, i18n.language)}
                                    </span>
                                ) : (
                                    <span className="font-bold text-sm text-gray-500">...</span>
                                )}
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm text-gray-300">{t('editPredictionModal.reasonLabel')}</label>
                            <textarea placeholder={t('editPredictionModal.reasonPlaceholder')} value={reason} onChange={(e) => setReason(e.target.value)} maxLength={500} className="mt-1 w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-3 text-white text-sm" rows="3" />
                        </div>

                        <div className="flex justify-end gap-4 pt-4 border-t border-gray-700">
                            <button type="button" onClick={onClose} className="bg-gray-600 font-bold py-2 px-4 rounded-md">{t('editPredictionModal.cancelButton')}</button>
                            <button type="submit" disabled={isSaving || !formState.isOpen} className="bg-green-500 text-white font-bold py-2 px-4 rounded-md disabled:bg-gray-500">
                                {isSaving ? t('editPredictionModal.savingButton') : t('editPredictionModal.saveButton')}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </>
    );
};

export default EditPredictionModal;