// src/components/GoldenMemberModal.js
import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';

const GoldenMemberModal = ({ isOpen, onClose, user, onUpdate }) => {
    const { t } = useTranslation();
    const [price, setPrice] = useState(5);
    const [description, setDescription] = useState('');
    const [acceptingNew, setAcceptingNew] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isCopied, setIsCopied] = useState(false); // Added for copy logic

    // Derived state based on user prop
    const isCurrentlyGolden = user?.isGoldenMember ?? false;
    const needsOnboarding = isCurrentlyGolden && (!user?.stripeConnectAccountId || !user?.stripeConnectOnboardingComplete);
    const onboardingComplete = isCurrentlyGolden && user?.stripeConnectAccountId && user?.stripeConnectOnboardingComplete;

    // --- Dynamic URL and Copy function (from previous solution) ---
    const profileUrl = `${window.location.origin}/profile/${user?._id}`;
    const copyProfileUrl = () => {
        navigator.clipboard.writeText(profileUrl);
        setIsCopied(true);
        toast.success(t('goldenMemberModal.onboarding.copiedUrl', 'Profile URL copied!'));
        setTimeout(() => setIsCopied(false), 2000);
    };
    // -------------------------------------------------------------

    // Effect to reset form state and set initial values (MUST run unconditionally)
    useEffect(() => {
        if (user) {
            setPrice(user.goldenMemberPrice || 5);
            setDescription(user.goldenMemberDescription || t('goldenMemberModal.defaultDescription'));
            setAcceptingNew(user.acceptingNewSubscribers !== false);
        } else {
            setPrice(5);
            setDescription(t('goldenMemberModal.defaultDescription'));
            setAcceptingNew(true);
        }
        setIsSaving(false);
    }, [isOpen, user, t]);

    // Close on ESC key
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    // Handles Activate / Update settings
    const handleSaveSettings = async (willBeGolden) => {
        setIsSaving(true);
        const settingsPayload = {
            isGoldenMember: willBeGolden,
            price: parseFloat(price),
            description: description,
            acceptingNewSubscribers: acceptingNew,
        };

        try {
            await axios.put(`${import.meta.env.VITE_API_URL}/api/profile/golden-member`, settingsPayload, { withCredentials: true });

            if (willBeGolden) {
                toast.success(isCurrentlyGolden ? t('goldenMemberModal.updateSuccess') : t('goldenMemberModal.activateSuccess', 'Golden Membership Activated!'));
                onUpdate(true);
                onClose();

            } else {
                toast.success(t('goldenMemberModal.deactivateSuccess'));
                onUpdate();
                onClose();
            }

        } catch (err) {
            toast.error(err.response?.data?.message || (willBeGolden ? t('goldenMemberModal.activateFail', 'Activation failed.') : t('goldenMemberModal.updateFail')));
        } finally {
            setIsSaving(false);
        }
    };

    // Handles redirecting user to Stripe for onboarding
    const handleStartOnboarding = async () => {
        setIsSaving(true);
        try {
            const response = await axios.post(`${import.meta.env.VITE_API_URL}/api/stripe/connect/onboarding-link`, {}, { withCredentials: true });
            if (response.data.url) {
                window.location.href = response.data.url;
            } else {
                throw new Error("Onboarding URL missing");
            }
        } catch (err) {
            toast.error("Could not start Stripe onboarding. Please try again later.");
            setIsSaving(false);
        }
    };

    // Handles Deactivation
    const handleDeactivate = () => {
        handleSaveSettings(false);
    }

    // --- The unconditional guard clause must come AFTER all hooks ---
    if (!isOpen || !user) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-50 p-4" onClick={onClose}>
            {/* 1. Main container with fixed height for small screens */}
            <div className="relative bg-gray-800 p-8 rounded-xl shadow-2xl w-full max-w-lg text-gray-300 flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
                <button onClick={onClose} disabled={isSaving} className="absolute top-4 end-4 text-gray-400 hover:text-white disabled:opacity-50">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                </button>
                <h2 className="text-2xl font-bold text-white mb-4 flex-shrink-0">{t('goldenMemberModal.title')}</h2>

                {/* 2. Scrollable Content Wrapper */}
                <div className="flex-grow overflow-y-auto modern-scrollbar pe-2">

                    {/* Form for Price, Description, Accepting New */}
                    <div className="space-y-6">
                        <div>
                            <label htmlFor="price" className="block text-sm font-medium text-gray-300">{t('goldenMemberModal.priceLabel')}</label>
                            <input type="number" name="price" id="price" min="1" max="500" step="1" value={price} onChange={e => setPrice(e.target.value)} disabled={isSaving}
                                className="mt-1 w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-3 text-white disabled:opacity-50" />
                        </div>
                        <div>
                            <label htmlFor="description" className="block text-sm font-medium text-gray-300">{t('goldenMemberModal.descriptionLabel')}</label>
                            <textarea name="description" id="description" rows="3" value={description} onChange={e => setDescription(e.target.value)} disabled={isSaving}
                                className="mt-1 w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-3 text-white disabled:opacity-50"></textarea>
                        </div>
                        <div className="flex items-center justify-between bg-gray-700 p-3 rounded-md">
                            <label htmlFor="acceptingNew" className="text-sm font-medium text-gray-300">{t('goldenMemberModal.acceptingNewLabel')}</label>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" id="acceptingNew" checked={acceptingNew} onChange={() => setAcceptingNew(!acceptingNew)} disabled={isSaving} className="sr-only peer disabled:opacity-50" />
                                <div className="w-11 h-6 bg-gray-600 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
                            </label>
                        </div>
                    </div>

                    {/* Stripe Onboarding Section (Conditional) */}
                    {isCurrentlyGolden && (
                        <div className="mt-6 pt-4 border-t border-gray-700 text-center">
                            {needsOnboarding && (
                                <>
                                    {/* Check if the restriction reason is present */}
                                    {user.stripeConnectRestrictions ? (
                                        // --- ACTION REQUIRED FOR DOCUMENTS ---
                                        <>
                                            <p className="text-xl font-bold text-red-500 mb-2">{t('goldenMemberModal.onboarding.documentTitle')}</p>
                                            <p className="text-sm mb-4">{t('goldenMemberModal.onboarding.documentPrompt')}</p>
                                        </>
                                    ) : (
                                        // --- STANDARD ONBOARDING PROMPT ---
                                        <>
                                            <p className="text-yellow-400 font-semibold mb-3">{t('goldenMemberModal.onboarding.actionRequired')}</p>
                                            <p className="text-sm mb-2">{t('goldenMemberModal.onboarding.connectPrompt')}</p>
                                        </>
                                    )}

                                    {/* COPYABLE URL TIP */}
                                    <p className="text-xs text-yellow-400 mb-3">{t('goldenMemberModal.onboarding.websiteTip')}</p>
                                    <div className="bg-gray-900 p-3 rounded-md flex items-center gap-2 mb-4">
                                        <input
                                            type="text"
                                            value={profileUrl}
                                            readOnly
                                            className="bg-transparent text-gray-400 w-full outline-none text-sm"
                                        />
                                        <button
                                            type="button"
                                            onClick={copyProfileUrl}
                                            className={`text-sm font-bold py-1 px-3 rounded-md transition-colors ${isCopied ? 'bg-green-500 text-white' : 'bg-gray-700 hover:bg-gray-600 text-white'}`}
                                        >
                                            {isCopied ? t('common.copied', 'Copied') : t('common.copy', 'Copy')}
                                        </button>
                                    </div>
                                    {/* END COPYABLE URL TIP */}

                                    <button
                                        type="button"
                                        onClick={handleStartOnboarding}
                                        disabled={isSaving}
                                        className="w-full sm:w-auto bg-indigo-600 text-white font-bold py-3 px-4 rounded-md hover:bg-indigo-700 disabled:opacity-50"
                                    >
                                        {isSaving ? "Processing..." : t('goldenMemberModal.onboarding.connectButton', 'Connect with Stripe')}
                                    </button>
                                </>
                            )}
                            {onboardingComplete && (
                                <p className="text-green-400 font-semibold">
                                    {t('goldenMemberModal.onboarding.complete')}
                                </p>
                            )}
                        </div>
                    )}
                </div>

                {/* 3. Main Action Buttons (Static Footer) */}
                <div className="flex flex-col sm:flex-row gap-4 mt-6 pt-4 border-t border-gray-700 flex-shrink-0">
                    <button type="button" onClick={() => handleSaveSettings(true)} disabled={isSaving || (isCurrentlyGolden && needsOnboarding)} className="w-full bg-yellow-500 text-black font-bold py-3 px-4 rounded-md hover:bg-yellow-400 disabled:bg-gray-500 disabled:cursor-not-allowed">
                        {isSaving ? "Saving..." : (isCurrentlyGolden ? t('goldenMemberModal.updateButton') : t('goldenMemberModal.activateButton'))}
                    </button>
                    {isCurrentlyGolden && (
                        <button type="button" onClick={handleDeactivate} disabled={isSaving} className="w-full bg-red-600 text-white font-bold py-3 px-4 rounded-md hover:bg-red-700 disabled:opacity-50">{t('goldenMemberModal.deactivateButton')}</button>
                    )}
                </div>
                {/* Tooltip for disabled Activate/Update button */}
                {isCurrentlyGolden && needsOnboarding && (
                    <p className="text-xs text-center text-yellow-400 mt-2">
                        {t('goldenMemberModal.onboarding.tooltip')}
                    </p>
                )}
            </div>
        </div>
    );
};

export default GoldenMemberModal;