// src/components/VerifiedTick.js
import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { useTranslation } from 'react-i18next';
import ReactDOM from 'react-dom'; // Import ReactDOM for Portal

const VerifiedTick = ({ onClick, size }) => {
    const { t } = useTranslation();
    const [isPopoverVisible, setIsPopoverVisible] = useState(false);
    // Use state for inline styles for dynamic positioning
    const [popoverStyle, setPopoverStyle] = useState({ opacity: 0, top: 0, left: 0 });
    const buttonRef = useRef(null);
    const popoverRef = useRef(null); // Ref for the popover itself

    // Close popover on outside click
    useEffect(() => {
        const handleClickOutside = (event) => {
            // Close if click is outside the button AND outside the popover
            if (buttonRef.current && !buttonRef.current.contains(event.target) &&
                popoverRef.current && !popoverRef.current.contains(event.target)) {
                setIsPopoverVisible(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Calculate position when popover opens
    useLayoutEffect(() => {
        if (isPopoverVisible && buttonRef.current && popoverRef.current) {
            const buttonRect = buttonRef.current.getBoundingClientRect();
            const popoverRect = popoverRef.current.getBoundingClientRect();
            const margin = 8; // Space between tick and popover

            // Calculate initial top position (above the button)
            let top = buttonRect.top - popoverRect.height - margin + window.scrollY;

            // Calculate initial centered left position
            let left = buttonRect.left + (buttonRect.width / 2) - (popoverRect.width / 2) + window.scrollX;

            // Adjust left if it goes off-screen left
            if (left < margin) {
                left = margin + window.scrollX;
            }
            // Adjust left if it goes off-screen right
            else if (left + popoverRect.width > window.innerWidth - margin) {
                left = window.innerWidth - popoverRect.width - margin + window.scrollX;
            }

            // Adjust top if it goes off-screen top (unlikely but possible)
             if (top < margin + window.scrollY) {
                // Position below instead
                 top = buttonRect.bottom + margin + window.scrollY;
             }


            setPopoverStyle({
                opacity: 1,
                top: `${top}px`,
                left: `${left}px`,
                position: 'absolute', // Use absolute positioning relative to body/scroll container
            });
        } else {
            // Reset position and hide when not visible
            setPopoverStyle(prev => ({ ...prev, opacity: 0 }));
        }
    }, [isPopoverVisible]); // Rerun when visibility changes

    const handleClick = (e) => {
        e.stopPropagation();
        if (onClick) {
             // If an onClick handler is provided (like in ProfileHeader for modal), use it
            onClick();
        } else {
             // Otherwise, toggle the popover
            setIsPopoverVisible((prev) => !prev);
        }
    };

    // Define the popover element separately
    const popoverElement = isPopoverVisible ? (
        <div
            ref={popoverRef}
            // Use inline style for position, Tailwind for others
            style={popoverStyle}
            className={`w-48 bg-gray-900 border border-gray-700 text-white text-xs rounded-lg p-3 z-50 shadow-lg transition-opacity duration-150 ease-in-out`} // z-50 or higher
        >
            <p className="font-bold text-white mb-1">{t('verifiedTick.title')}</p>
            <p className="text-gray-400">{t('verifiedTick.description')}</p>
        </div>
    ) : null;


    return (
        <div className="relative flex-shrink-0 inline-block"> {/* Ensure wrapper takes minimal space */}
            <button onClick={handleClick} aria-label={t('verifiedTick.ariaLabel')} ref={buttonRef}>
                <svg
                    className={`text-green-400 align-middle`} // Added align-middle
                    width={size ? `${size}rem` : "1.25rem"}
                    height={size ? `${size}rem` : "1.25rem"}
                    fill="currentColor"
                    viewBox="0 0 20 20"
                >
                    <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                        clipRule="evenodd"
                    />
                </svg>
            </button>

            {/* Use Portal to render the popover at the body level, avoiding parent overflow/z-index issues */}
            {ReactDOM.createPortal(popoverElement, document.body)}
        </div>
    );
};

export default VerifiedTick;