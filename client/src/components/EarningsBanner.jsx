import React, { useMemo, useRef, useEffect, useState, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { DateTime } from 'luxon';
import { FaBullhorn, FaTimes } from 'react-icons/fa';

const EarningsBanner = ({ calendar = [], onMakePredictionClick, isActive = true }) => {
    const { t, i18n } = useTranslation();
    const location = useLocation();
    const [isVisible, setIsVisible] = useState(true);
    const isRTL = i18n.language === 'ar';

    // Refs for animation and interaction
    const containerRef = useRef(null);
    const contentRef = useRef(null);
    const requestRef = useRef(null);
    const positionRef = useRef(0);
    const speedRef = useRef(1.5); // Base speed
    const lastTouchX = useRef(0);

    // Determine if we are on a stock-specific page
    const currentTicker = useMemo(() => {
        const pathParts = location.pathname.split('/');
        return pathParts.length > 2 && pathParts[1] === 'stock' ? pathParts[2].toUpperCase() : null;
    }, [location.pathname]);

    // Format and Filter Messages
    const formattedMessages = useMemo(() => {
        if (!calendar || calendar.length === 0) return [];

        let messages = calendar.map(item => {
            const earningsDate = DateTime.fromISO(item.earningsDate).setLocale(i18n.language);
            const relativeDay = earningsDate.toFormat('cccc');
            const message = t('earningsBanner.message', {
                ticker: item.ticker,
                day: relativeDay
            });

            return {
                ticker: item.ticker,
                message: message
            };
        });

        if (currentTicker) {
            messages = messages.filter(m => m.ticker === currentTicker);
        }

        return messages;
    }, [calendar, i18n.language, t, currentTicker]);

    // Ensure enough items for seamless loop
    const displayList = useMemo(() => {
        if (formattedMessages.length === 0) return [];
        return [...formattedMessages, ...formattedMessages, ...formattedMessages, ...formattedMessages];
    }, [formattedMessages]);

    const colorClass = currentTicker ? 'bg-yellow-700/80 border-b border-yellow-600' : 'bg-green-700/80 border-b border-green-600';

    // Reset position when language changes to avoid jumpiness
    useEffect(() => {
        positionRef.current = 0;
    }, [i18n.language]);

    // Animation Loop
    const animate = useCallback(() => {
        if (containerRef.current && contentRef.current) {
            const totalWidth = contentRef.current.scrollWidth;
            const singleSetWidth = totalWidth / 4;

            if (isRTL) {
                // RTL: Move Right (Positive)
                positionRef.current += speedRef.current;
                if (positionRef.current >= singleSetWidth) {
                    positionRef.current -= singleSetWidth;
                }
            } else {
                // LTR: Move Left (Negative)
                positionRef.current -= speedRef.current;
                if (positionRef.current <= -singleSetWidth) {
                    positionRef.current += singleSetWidth;
                }
            }

            // Boundary checks to prevent runaway values if tab is inactive
            if (positionRef.current > totalWidth) positionRef.current = 0;
            if (positionRef.current < -totalWidth) positionRef.current = 0;

            containerRef.current.style.transform = `translateX(${positionRef.current}px)`;

            const baseSpeed = 1.5;
            if (speedRef.current > baseSpeed) {
                speedRef.current *= 0.95;
                if (speedRef.current < baseSpeed) speedRef.current = baseSpeed;
            } else if (speedRef.current < baseSpeed) {
                speedRef.current += 0.1;
                if (speedRef.current > baseSpeed) speedRef.current = baseSpeed;
            }
        }
        requestRef.current = requestAnimationFrame(animate);
    }, [isRTL]);

    useEffect(() => {
        if (isActive && isVisible && formattedMessages.length > 0) {
            requestRef.current = requestAnimationFrame(animate);
        }
        return () => {
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
        };
    }, [isActive, isVisible, formattedMessages, animate]);

    // Interaction Handlers
    const handleWheel = (e) => {
        const boost = Math.abs(e.deltaY) * 0.05;
        speedRef.current += boost;
        if (speedRef.current > 20) speedRef.current = 20;
    };

    const handleTouchStart = (e) => {
        lastTouchX.current = e.touches[0].clientX;
    };

    const handleTouchMove = (e) => {
        const currentX = e.touches[0].clientX;
        const deltaX = lastTouchX.current - currentX;
        lastTouchX.current = currentX;

        if (isRTL) {
            speedRef.current -= deltaX * 0.5;
        } else {
            speedRef.current += deltaX * 0.5;
        }

        if (speedRef.current > 20) speedRef.current = 20;
        if (speedRef.current < 0) speedRef.current = 0;
    };

    // Early return AFTER all hooks
    if (!isActive || !isVisible || formattedMessages.length === 0) {
        return null;
    }

    return (
        <div className="relative group pt-[env(safe-area-inset-top)] bg-gray-900" dir={isRTL ? 'rtl' : 'ltr'}>
            <div
                className={`w-full ${colorClass} text-white py-2 overflow-hidden flex-shrink-0 cursor-grab active:cursor-grabbing relative z-20`}
                onWheel={handleWheel}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
            >
                <div
                    ref={containerRef}
                    className="flex whitespace-nowrap will-change-transform"
                    style={{ flexDirection: 'row' }}
                >
                    <div ref={contentRef} className="flex">
                        {displayList.map((item, index) => (
                            <div key={`${item.ticker}-${index}`} className="flex items-center gap-2 px-4">
                                <FaBullhorn className="w-4 h-4 flex-shrink-0" />
                                <span className="font-semibold text-sm flex-shrink-0">
                                    {t('earningsBanner.headline')}
                                </span>

                                <span className="text-sm me-4 flex-shrink-0">
                                    {item.message}
                                </span>

                                <button
                                    onClick={() => onMakePredictionClick({ symbol: item.ticker })}
                                    className="text-sm font-bold underline hover:text-gray-200 transition-colors flex-shrink-0"
                                >
                                    {t('earningsBanner.makePrediction')}
                                </button>

                                {item.ticker !== currentTicker && (
                                    <Link
                                        to={`/stock/${item.ticker}`}
                                        className="text-sm font-bold ms-2 flex-shrink-0 underline hover:text-gray-200 transition-colors"
                                    >
                                        {t('earningsBanner.viewStock', { ticker: item.ticker })}
                                    </Link>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Close Button */}
            <div className={`absolute top-0 bottom-0 ${isRTL ? 'left-2' : 'right-2'} z-30 flex items-center pt-[env(safe-area-inset-top)] pointer-events-none`}>
                <button
                    onClick={() => setIsVisible(false)}
                    className="bg-black/20 hover:bg-black/40 text-white p-1 rounded-full transition-colors pointer-events-auto"
                    aria-label="Close banner"
                >
                    <FaTimes className="w-3 h-3" />
                </button>
            </div>
        </div>
    );
};

export default EarningsBanner;