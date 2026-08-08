// src/components/Logo.js
import React from 'react';
import { Link } from 'react-router-dom';

const Logo = () => {
    return (
        <Link to="/" className="flex items-center space-x-2">
            {/* Logo Image */}
            <img src="/logo.png" alt="StockPredictorAI Logo" className="w-8 h-8 object-contain" />

            {/* This div handles the responsive text */}
            <div className="flex flex-row items-center sm:flex-col sm:items-start">

                {/* Logo Text: Visible on both mobile and desktop */}
                <span className="inline font-bold text-lg sm:text-2xl text-white">
                    Stock<span className="text-green-400">Predictor</span>
                    {/* --- NEW "AI" TEXT --- */}
                    <span className="text-xl text-gray-300 ms-1">AI</span>
                </span>
            </div>

        </Link>
    );
};

export default Logo;