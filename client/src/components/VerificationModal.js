import React from 'react';

const VerificationModal = ({ isOpen, onClose, onConfirm, price }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-50" onClick={onClose}>
            <div className="bg-gray-800 p-8 rounded-lg w-full max-w-md text-center" onClick={e => e.stopPropagation()}>
                <h2 className="text-2xl font-bold text-white mb-4">Become a Verified Predictor</h2>
                <p className="text-gray-300 mb-6">Gain credibility and visibility in the community with a verified badge.</p>
                
                <ul className="text-left space-y-3 mb-8 text-gray-300">
                    <li className="flex items-center gap-3">
                        <span className="text-green-400">✓</span>
                        <span>Get a **green checkmark** next to your name across the site.</span>
                    </li>
                    <li className="flex items-center gap-3">
                        <span className="text-green-400">✓</span>
                        <span>Your predictions get featured in the **"Verified Only"** filter on the Explore page.</span>
                    </li>
                     <li className="flex items-center gap-3">
                        <span className="text-green-400">✓</span>
                        <span>Get recommended as a **Verified Expert** on relevant Watchlist pages.</span>
                    </li>
                </ul>

                <button 
                    onClick={onConfirm}
                    className="w-full bg-green-500 text-white font-bold py-3 px-6 rounded-lg hover:bg-green-600"
                >
                    Get Verified for ${price}
                </button>
            </div>
        </div>
    );
};

export default VerificationModal;