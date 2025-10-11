import React, { useState, useEffect, useRef } from 'react';

const VerifiedTick = ({ onClick }) => {
    const [isPopoverVisible, setIsPopoverVisible] = useState(false);
    const [popoverPositionClass, setPopoverPositionClass] = useState('left-1/2 -translate-x-1/2');
    const buttonRef = useRef(null);

    // This effect handles closing the popover when you click outside of it
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (buttonRef.current && !buttonRef.current.contains(event.target)) {
                setIsPopoverVisible(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // --- START: FIX FOR POPOVER OVERFLOW ---
    // This effect repositions the popover if it's too close to the screen edge.
    useEffect(() => {
        if (isPopoverVisible && buttonRef.current) {
            const rect = buttonRef.current.getBoundingClientRect();
            const popoverWidth = 192; // w-48 = 12rem = 192px

            if (rect.right + (popoverWidth / 2) > window.innerWidth) {
                setPopoverPositionClass('right-0'); // Align to the right
            } else if (rect.left - (popoverWidth / 2) < 0) {
                setPopoverPositionClass('left-0'); // Align to the left
            } else {
                setPopoverPositionClass('left-1/2 -translate-x-1/2'); // Default center
            }
        }
    }, [isPopoverVisible]);
    // --- END: FIX ---

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
            <button onClick={handleClick} aria-label="Verified Predictor" ref={buttonRef}>
                <svg className="w-5 h-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
            </button>

            {isPopoverVisible && (
                <div className={`absolute bottom-full mb-2 w-48 bg-gray-900 border border-gray-700 text-white text-xs rounded-lg p-3 z-20 shadow-lg animate-fade-in-fast ${popoverPositionClass}`}>
                    <p className="font-bold text-white mb-1">Verified Predictor</p>
                    <p className="text-gray-400">This user is a verified member of the community, indicating a commitment to the platform.</p>
                </div>
            )}
        </div>
    );
};

export default VerifiedTick;