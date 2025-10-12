// src/components/AvatarSelectionModal.js

import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';

const AvatarSelectionModal = ({ isOpen, onClose, onSave, initialAvatarUrl }) => {
    const { t } = useTranslation();

    // Avatar styles with translation keys
    const avatarStyles = [
        'adventurer', 'lorelei', 'miniavs', 'openPeeks', 'personas',
        'pixelArt', 'notionists', 'bottts', 'shapes', 'thumbs',
        'funEmoji', 'identicon', 'initials', 'rings'
    ];

    const [currentStyle, setCurrentStyle] = useState(avatarStyles[0]);
    const [currentSeed, setCurrentSeed] = useState('user');
    const [previewUrl, setPreviewUrl] = useState(initialAvatarUrl);

    const getAvatarUrl = useCallback((style, seed) => {
        return `https://api.dicebear.com/8.x/${style}/svg?seed=${seed}`;
    }, []);

    useEffect(() => {
        if (isOpen && initialAvatarUrl) {
            setPreviewUrl(initialAvatarUrl);
            try {
                const url = new URL(initialAvatarUrl);
                const style = url.pathname.split('/')[2];
                const seed = url.searchParams.get('seed');
                if (avatarStyles.includes(style)) setCurrentStyle(style);
                if (seed) setCurrentSeed(seed);
            } catch (e) {
                // ignore
            }
        }
    }, [isOpen, initialAvatarUrl]);

    useEffect(() => {
        setPreviewUrl(getAvatarUrl(currentStyle, currentSeed));
    }, [currentStyle, currentSeed, getAvatarUrl]);

    const randomizeAvatar = () => {
        setCurrentSeed(Math.random().toString(36).substring(7));
    };

    const handleSave = () => {
        onSave(previewUrl);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-50" onClick={onClose}>
            <div className="bg-gray-800 p-8 rounded-lg w-full max-w-md" onClick={e => e.stopPropagation()}>
                <h2 className="text-2xl font-bold text-white mb-6">{t('avatarModal.title')}</h2>

                <div className="flex flex-col sm:flex-row items-center gap-4">
                    <img
                        src={previewUrl}
                        alt="Avatar Preview"
                        className="w-24 h-24 rounded-full bg-white flex-shrink-0"
                    />
                    <div className="w-full space-y-3">
                        <div>
                            <label htmlFor="avatarStyle" className="block text-xs font-bold text-gray-400 mb-1">
                                {t('avatarModal.styleLabel')}
                            </label>
                            <select
                                id="avatarStyle"
                                value={currentStyle}
                                onChange={(e) => setCurrentStyle(e.target.value)}
                                className="w-full bg-gray-700 text-white p-2 rounded-md"
                            >
                                {avatarStyles.map(style => (
                                    <option key={style} value={style} className="capitalize">
                                        {t(`avatarModal.styles.${style}`)}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <button
                            type="button"
                            onClick={randomizeAvatar}
                            className="w-full bg-gray-600 text-white font-bold py-2 px-4 rounded-md hover:bg-gray-700"
                        >
                            {t('avatarModal.shuffleButton')}
                        </button>
                    </div>
                </div>

                <div className="flex justify-end gap-4 mt-8 pt-4 border-t border-gray-700">
                    <button
                        type="button"
                        onClick={onClose}
                        className="bg-gray-600 text-white font-bold py-2 px-4 rounded-md hover:bg-gray-700"
                    >
                        {t('avatarModal.cancelButton')}
                    </button>
                    <button
                        type="button"
                        onClick={handleSave}
                        className="bg-green-500 text-white font-bold py-2 px-4 rounded-md hover:bg-green-600"
                    >
                        {t('avatarModal.saveButton')}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AvatarSelectionModal;
