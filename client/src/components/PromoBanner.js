import React, { useState } from 'react';

const PromoBanner = () => {
    const [isVisible, setIsVisible] = useState(true);

    if (!isVisible) {
        return null;
    }

    // Construct the full, dynamic URL for the login link
    const loginUrl = `${process.env.REACT_APP_API_URL}/auth/google`;

    return (
        <div className="bg-green-800 bg-opacity-50 text-center p-3 rounded-lg mb-8 relative animate-fade-in">
            <p className="text-white">
                🎉 **Launch Offer:** Sign up now for free lifetime access. This offer is for a limited time! 
                <a href={`${process.env.REACT_APP_API_URL}/auth/google`} className="font-bold underline hover:text-blue-300 ml-2">
                    Join Now
                </a>
            </p>
            <button 
                onClick={() => setIsVisible(false)} 
                className="absolute top-0 right-0 mt-2 mr-3 text-white opacity-50 hover:opacity-100 text-2xl"
                aria-label="Close banner"
            >
                &times;
            </button>
        </div>
    );
};

export default PromoBanner;