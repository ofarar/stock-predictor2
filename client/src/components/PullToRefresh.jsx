import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

const PullToRefresh = ({ onRefresh, children }) => {
    const [startY, setStartY] = useState(0);
    const [currentY, setCurrentY] = useState(0);
    const [refreshing, setRefreshing] = useState(false);
    const containerRef = useRef(null);
    const contentRef = useRef(null);
    const location = useLocation();

    // Threshold to trigger refresh (in pixels)
    const PULL_THRESHOLD = 80;
    // Max pull distance visually
    const MAX_PULL = 120;

    useEffect(() => {
        // Reset state on route change just in case
        setStartY(0);
        setCurrentY(0);
        setRefreshing(false);
    }, [location]);

    const handleTouchStart = (e) => {
        // Only enable pull to refresh if we are at the top of the page
        if (window.scrollY === 0 && !refreshing) {
            setStartY(e.touches[0].clientY);
        }
    };

    const handleTouchMove = (e) => {
        if (startY === 0 || refreshing) return;

        const y = e.touches[0].clientY;
        const diff = y - startY;

        // Only allow pulling down, and logarithmic resistance
        if (diff > 0 && window.scrollY === 0) {
            // Prevent default to stop scrolling up while pulling
            // Note: This might interfere with normal scrolling if not careful,
            // but for P2R at top it's usually desired.
            // e.preventDefault(); // removed to prevent blocking UI interactions

            const dampened = Math.min(diff * 0.5, MAX_PULL);
            setCurrentY(dampened);
        }
    };

    const handleTouchEnd = async () => {
        if (startY === 0 || refreshing) return;

        if (currentY >= PULL_THRESHOLD) {
            setRefreshing(true);
            setCurrentY(PULL_THRESHOLD); // Snap to threshold
            try {
                await onRefresh();
            } finally {
                setRefreshing(false);
                setCurrentY(0);
                setStartY(0);
            }
        } else {
            // Spring back
            setCurrentY(0);
            setStartY(0);
        }
    };

    return (
        <div
            className="ptr-wrapper"
            ref={containerRef}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            style={{ minHeight: '100vh', position: 'relative' }}
        >
            {/* Loading Indicator */}
            <div
                style={{
                    height: `${currentY}px`,
                    overflow: 'hidden',
                    transition: refreshing ? 'height 0.2s' : 'height 0.2s ease-out',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '100%',
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    zIndex: 10
                }}
            >
                <div className={`p-2 rounded-full bg-gray-800 shadow-md transform transition-transform ${currentY > 20 ? 'opacity-100 scale-100' : 'opacity-0 scale-50'}`}>
                    {refreshing ? (
                        <svg className="animate-spin h-6 w-6 text-green-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                    ) : (
                        <svg className="h-6 w-6 text-gray-400 rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                        </svg>
                    )}
                </div>
            </div>

            {/* Content with transform push-down effect */}
            <div
                ref={contentRef}
                style={{
                    transform: `translateY(${currentY}px)`,
                    transition: refreshing ? 'transform 0.2s' : 'transform 0.2s ease-out',
                }}
            >
                {children}
            </div>
        </div>
    );
};

export default PullToRefresh;
