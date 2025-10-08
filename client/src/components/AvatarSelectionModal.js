// src/components/AvatarSelectionModal.js

import React, { useState, useEffect, useCallback } from 'react';

const AvatarSelectionModal = ({ isOpen, onClose, onSave, initialAvatarUrl }) => {
    const avatarStyles = [
        'adventurer', 'lorelei', 'miniavs', 'open-peeps', 'personas', 
        'pixel-art', 'notionists', 'bottts', 'shapes', 'thumbs', 
        'fun-emoji', 'identicon', 'initials', 'rings'
    ];

    const [currentStyle, setCurrentStyle] = useState(avatarStyles[0]);
    const [currentSeed, setCurrentSeed] = useState('user');
    const [previewUrl, setPreviewUrl] = useState(initialAvatarUrl);

    const getAvatarUrl = useCallback((style, seed) => {
        return `https://api.dicebear.com/8.x/${style}/svg?seed=${seed}`;
    }, []);

    useEffect(() => {
        // When the modal opens, parse the initial URL to set the state
        if (isOpen && initialAvatarUrl) {
            setPreviewUrl(initialAvatarUrl);
            try {
                const url = new URL(initialAvatarUrl);
                const style = url.pathname.split('/')[2];
                const seed = url.searchParams.get('seed');
                if (avatarStyles.includes(style)) setCurrentStyle(style);
                if (seed) setCurrentSeed(seed);
            } catch (e) { /* Ignore parsing errors */ }
        }
    }, [isOpen, initialAvatarUrl]);

    useEffect(() => {
        // Update the preview whenever the style or seed changes
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
                <h2 className="text-2xl font-bold text-white mb-6">Change Your Avatar</h2>
                
                <div className="flex flex-col sm:flex-row items-center gap-4">
                    <img
                        src={previewUrl}
                        alt="Avatar Preview"
                        className="w-24 h-24 rounded-full bg-white flex-shrink-0"
                    />
                    <div className="w-full space-y-3">
                        <div>
                            <label htmlFor="avatarStyle" className="block text-xs font-bold text-gray-400 mb-1">Style</label>
                            <select 
                                id="avatarStyle"
                                value={currentStyle}
                                onChange={(e) => setCurrentStyle(e.target.value)}
                                className="w-full bg-gray-700 text-white p-2 rounded-md"
                            >
                                {avatarStyles.map(style => (
                                    <option key={style} value={style} className="capitalize">{style.replace('-', ' ')}</option>
                                ))}
                            </select>
                        </div>
                        <button 
                            type="button"
                            onClick={randomizeAvatar}
                            className="w-full bg-gray-600 text-white font-bold py-2 px-4 rounded-md hover:bg-gray-700"
                        >
                            Shuffle
                        </button>
                    </div>
                </div>

                <div className="flex justify-end gap-4 mt-8 pt-4 border-t border-gray-700">
                    <button type="button" onClick={onClose} className="bg-gray-600 text-white font-bold py-2 px-4 rounded-md hover:bg-gray-700">
                        Cancel
                    </button>
                    <button type="button" onClick={handleSave} className="bg-green-500 text-white font-bold py-2 px-4 rounded-md hover:bg-green-600">
                        Save Avatar
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AvatarSelectionModal;