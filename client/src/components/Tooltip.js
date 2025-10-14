// src/components/Tooltip.js
import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import ReactDOM from 'react-dom';

const Tooltip = ({ text, children }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [position, setPosition] = useState({ top: 0, left: 0 });
    const wrapperRef = useRef(null);
    const tooltipRef = useRef(null);

    // This effect handles closing the tooltip when tapping outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // This effect calculates the tooltip's absolute position on the page
    useLayoutEffect(() => {
        if (isOpen && wrapperRef.current && tooltipRef.current) {
            const triggerRect = wrapperRef.current.getBoundingClientRect();
            const tooltipRect = tooltipRef.current.getBoundingClientRect();
            
            // Calculate position to appear above the trigger element
            const top = triggerRect.top - tooltipRect.height - 8; // 8px margin
            let left = triggerRect.left + (triggerRect.width / 2) - (tooltipRect.width / 2);

            // Adjust if it goes off-screen
            if (left < 0) left = 8;
            if (left + tooltipRect.width > window.innerWidth) {
                left = window.innerWidth - tooltipRect.width - 8;
            }

            setPosition({ top, left });
        }
    }, [isOpen, text]);

    const tooltipElement = (
        <span
            ref={tooltipRef}
            className="fixed px-2 py-1 bg-gray-900 text-white text-xs rounded-md z-50"
            style={{ top: position.top, left: position.left, opacity: isOpen ? 1 : 0 }}
        >
            {text}
        </span>
    );

    return (
        <div ref={wrapperRef}>
            <div onClick={() => setIsOpen(prev => !prev)} className="cursor-pointer">
                {children}
            </div>
            {/* The portal teleports the tooltip to the document body */}
            {ReactDOM.createPortal(tooltipElement, document.body)}
        </div>
    );
};

export default Tooltip;