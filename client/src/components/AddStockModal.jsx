// src/components/AddStockModal.js
import React, { useState } from 'react';
import PropTypes from 'prop-types'
import { useTranslation } from 'react-i18next';
import StockFilterSearch from './StockFilterSearch';

const AddStockModal = ({ isOpen, onClose, onAdd }) => {
    const { t } = useTranslation();
    const [selectedStock, setSelectedStock] = useState('');

    const handleAdd = async () => {
        if (selectedStock) {
            try {
                await onAdd(selectedStock, 'add');
                onClose();
            } catch (error) {
                console.error("Failed to add stock:", error);
            }
        }
    };

    if (!isOpen) {
        return null;
    }

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-50 p-4" onClick={onClose}>
            <div className="bg-gray-800 p-6 rounded-lg w-full max-w-md" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-bold text-white">{t('watchlistPage.addStockModal.title')}</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                    </button>
                </div>

                <div className="space-y-4">
                    <label className="block text-xs font-bold text-gray-400 mb-1">{t('watchlistPage.addStockModal.searchLabel')}</label>
                    {/* The onStockSelect prop now updates our local state */}
                    <StockFilterSearch onStockSelect={setSelectedStock} />
                </div>

                <div className="flex justify-end gap-4 mt-8 pt-4 border-t border-gray-700">
                    <button onClick={onClose} className="bg-gray-600 font-bold py-2 px-4 rounded-md">{t('common.close')}</button>
                    <button
                        onClick={handleAdd}
                        // The button is enabled as long as there's a stock symbol selected
                        disabled={!selectedStock}
                        className="bg-green-500 text-white font-bold py-2 px-4 rounded-md disabled:bg-gray-500"
                    >
                        {t('watchlistPage.addStockModal.addButton')}
                    </button>
                </div>
            </div>
        </div>
    );
};

AddStockModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onAdd: PropTypes.func.isRequired,
};
export default AddStockModal;