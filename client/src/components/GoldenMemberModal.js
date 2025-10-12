// src/components/GoldenMemberModal.js

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';

const GoldenMemberModal = ({ isOpen, onClose, user, onUpdate }) => {
    const { t } = useTranslation();
    const [price, setPrice] = useState(5);
    const [description, setDescription] = useState('');
    const [acceptingNew, setAcceptingNew] = useState(true);

    useEffect(() => {
        if (user) {
            setPrice(user.goldenMemberPrice || 5);
            setDescription(user.goldenMemberDescription || t('goldenMemberModal.defaultDescription'));
            setAcceptingNew(user.acceptingNewSubscribers !== false);
        }
    }, [user]);

    if (!isOpen) return null;

    const handleSubmit = (e) => {
        e.preventDefault();
        const settings = {
            isGoldenMember: true,
            price: parseFloat(price),
            description: description,
            acceptingNewSubscribers: acceptingNew,
        };

        // --- LOGGING ---
        console.log("Frontend: Sending these settings to the server:", settings);
        // ---------------

        axios.put(`${process.env.REACT_APP_API_URL}/api/profile/golden-member`, settings, { withCredentials: true })
            .then(() => {
                toast.success(t('goldenMemberModal.updateSuccess'));
                onUpdate();
                onClose();
            })
            .catch(err => {
                toast.error(err.response?.data?.message || t('goldenMemberModal.updateFail'));
            });
    };

    const handleDeactivate = () => {
        const settings = {
            isGoldenMember: false,
            price,
            description,
            acceptingNewSubscribers: acceptingNew
        };
        // --- LOGGING ---
        console.log("Frontend: Sending DEACTIVATION settings:", settings);
        // ---------------
        axios.put(`${process.env.REACT_APP_API_URL}/api/profile/golden-member`, settings, { withCredentials: true })
            .then(() => {
                toast.success(t('goldenMemberModal.deactivateSuccess'));
                onUpdate();
                onClose();
            })
            .catch(err => {
                toast.error(err.response?.data?.message || t('goldenMemberModal.deactivateFail'));
            });
    }

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-50 p-4" onClick={onClose}>
            <div className="relative bg-gray-800 p-8 rounded-xl shadow-2xl w-full max-w-lg text-gray-300" onClick={e => e.stopPropagation()}>
                <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                </button>
                <h2 className="text-2xl font-bold text-white mb-4">{t('goldenMemberModal.title')}</h2>
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label htmlFor="price" className="block text-sm font-medium text-gray-300">{t('goldenMemberModal.priceLabel')}</label>
                        <input type="number" name="price" id="price" min="1" max="500" step="1" value={price} onChange={e => setPrice(e.target.value)}
                            className="mt-1 w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-3 text-white" />
                    </div>
                    <div>
                        <label htmlFor="description" className="block text-sm font-medium text-gray-300">{t('goldenMemberModal.descriptionLabel')}</label>
                        <textarea name="description" id="description" rows="3" value={description} onChange={e => setDescription(e.target.value)}
                            className="mt-1 w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-3 text-white"></textarea>
                    </div>
                    <div className="flex items-center justify-between bg-gray-700 p-3 rounded-md">
                        <label htmlFor="acceptingNew" className="text-sm font-medium text-gray-300">{t('goldenMemberModal.acceptingNewLabel')}</label>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" id="acceptingNew" checked={acceptingNew} onChange={() => setAcceptingNew(!acceptingNew)} className="sr-only peer" />
                            <div className="w-11 h-6 bg-gray-600 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
                        </label>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-4">
                        <button type="submit" className="w-full bg-yellow-500 text-black font-bold py-3 px-4 rounded-md hover:bg-yellow-400">
                            {user.isGoldenMember ? t('goldenMemberModal.updateButton') : t('goldenMemberModal.activateButton')}
                        </button>
                        {user.isGoldenMember && (
                            <button type="button" onClick={handleDeactivate} className="w-full bg-red-600 text-white font-bold py-3 px-4 rounded-md hover:bg-red-700">{t('goldenMemberModal.deactivateButton')}</button>
                        )}
                    </div>
                </form>
            </div>
        </div>
    );
};

export default GoldenMemberModal;