import React, { useState } from 'react';

const PredictionJourney = ({ initial, target, current, priceLabel }) => {
    const [visibleTooltip, setVisibleTooltip] = useState(null);

    if (typeof initial !== 'number' || typeof target !== 'number') {
        return <div className="h-20"></div>;
    }

    const minPrice = Math.min(initial, target);
    const maxPrice = Math.max(initial, target);
    const range = maxPrice - minPrice;

    let zone = 'middle';
    let positionInZone = 50;

    if (typeof current === 'number') {
        if (current < minPrice) {
            zone = 'left';
        } else if (current > maxPrice) {
            zone = 'right';
        } else {
            if (range > 0) {
                positionInZone = ((current - minPrice) / range) * 100;
            }
        }
    }

    const isUpward = target > initial;

    const DashedLine = () => (
        <div className="h-2 bg-gray-700/50 rounded-full w-full" style={{
            backgroundImage: `repeating-linear-gradient(-45deg, transparent, transparent 4px, #4a5568 4px, #4a5568 5px)`,
            backgroundSize: '8px 8px'
        }}></div>
    );

    const CurrentPriceMarker = () => (
        <div className="absolute top-1/2 -translate-y-1/2" style={{ left: zone === 'middle' ? `${positionInZone}%` : '50%', transform: 'translateX(-50%)' }}>
            <div className="relative">
                <button onClick={() => setVisibleTooltip(visibleTooltip === 'current' ? null : 'current')} className="relative z-10">
                    <div className="w-4 h-4 rounded-full bg-blue-400 ring-4 ring-gray-800 transition-transform hover:scale-125"></div>
                    {visibleTooltip === 'current' && (
                        <span className="absolute top-full mt-2 left-1/2 -translate-x-1/2 whitespace-nowrap bg-gray-900 px-2 py-1 text-xs font-bold text-white rounded">${current.toFixed(2)} {priceLabel}</span>
                    )}
                </button>
            </div>
        </div>
    );
    
    return (
        <div className="my-12">
            <div className="relative w-full flex items-center">
                <div className="relative flex-1 h-2">
                    <DashedLine />
                    {zone === 'left' && <CurrentPriceMarker />}
                </div>

                <div className="relative flex-[2_2_0%] mx-2 h-2 bg-green-500 rounded-full">
                    {/* --- START: FIX FOR DOT ALIGNMENT --- */}
                    {/* Initial Marker */}
                    <div className="absolute top-1/2 -translate-y-1/2" style={{ left: isUpward ? '0%' : '100%', transform: 'translateX(-50%)' }}>
                        <div className="relative flex flex-col items-center">
                            <button onClick={() => setVisibleTooltip(visibleTooltip === 'initial' ? null : 'initial')} className="relative z-10">
                                <div className="w-3 h-3 bg-gray-400 rounded-full ring-2 ring-gray-800 transition-transform hover:scale-125"></div>
                                {visibleTooltip === 'initial' && (
                                    <span className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 whitespace-nowrap bg-gray-900 px-2 py-1 text-xs font-bold text-white rounded">${initial.toFixed(2)}</span>
                                )}
                            </button>
                            <span className="absolute top-full mt-2 text-xs text-gray-400">Initial</span>
                        </div>
                    </div>
                     {/* Target Marker */}
                     <div className="absolute top-1/2 -translate-y-1/2" style={{ left: isUpward ? '100%' : '0%', transform: 'translateX(-50%)' }}>
                        <div className="relative flex flex-col items-center">
                            <button onClick={() => setVisibleTooltip(visibleTooltip === 'target' ? null : 'target')} className="relative z-10">
                                <div className={`w-3 h-3 ${isUpward ? 'bg-green-400' : 'bg-red-400'} rounded-full ring-2 ring-gray-800 transition-transform hover:scale-125`}></div>
                                {visibleTooltip === 'target' && (
                                    <span className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 whitespace-nowrap bg-gray-900 px-2 py-1 text-xs font-bold text-white rounded">${target.toFixed(2)}</span>
                                )}
                            </button>
                            <span className={`absolute top-full mt-2 text-xs font-bold ${isUpward ? 'text-green-400' : 'text-red-400'}`}>Target</span>
                        </div>
                    </div>
                    {/* --- END: FIX FOR DOT ALIGNMENT --- */}

                    {zone === 'middle' && <CurrentPriceMarker />}
                </div>
                
                <div className="relative flex-1 h-2">
                    <DashedLine />
                    {zone === 'right' && <CurrentPriceMarker />}
                </div>
            </div>
        </div>
    );
};

export default PredictionJourney;