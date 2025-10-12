// src/components/VerifiedTick.js

import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';

const VerifiedTick = ({ onClick }) => {
    const { t } = useTranslation();
    const [isPopoverVisible, setIsPopoverVisible] = useState(false);
    const [popoverPositionClass, setPopoverPositionClass] = useState('left-1/2 -translate-x-1/2');
    const buttonRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (buttonRef.current && !buttonRef.current.contains(event.target)) {
                setIsPopoverVisible(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    useEffect(() => {
        if (isPopoverVisible && buttonRef.current) {
            const rect = buttonRef.current.getBoundingClientRect();
            const popoverWidth = 192;

            if (rect.right + (popoverWidth / 2) > window.innerWidth) {
                setPopoverPositionClass('right-0');
            } else if (rect.left - (popoverWidth / 2) < 0) {
                setPopoverPositionClass('left-0');
            } else {
                setPopoverPositionClass('left-1/2 -translate-x-1/2');
            }
        }
    }, [isPopoverVisible]);

    const handleClick = (e) => {
        e.stopPropagation();
        if (onClick) {
            onClick();
        } else {
            setIsPopoverVisible(prev => !prev);
        }
    };

    return (
        <div className="relative flex-shrink-0">
            <button onClick={handleClick} aria-label={t('verifiedTick.ariaLabel')} ref={buttonRef}>
                <svg className="w-5 h-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
            </button>

            {isPopoverVisible && (
                <div className={`absolute bottom-full mb-2 w-48 bg-gray-900 border border-gray-700 text-white text-xs rounded-lg p-3 z-20 shadow-lg animate-fade-in-fast ${popoverPositionClass}`}>
                    <p className="font-bold text-white mb-1">{t('verifiedTick.title')}</p>
                    <p className="text-gray-400">{t('verifiedTick.description')}</p>
                </div>
            )}
        </div>
    );
};

export default VerifiedTick;
