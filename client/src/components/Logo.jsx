// src/components/Logo.js
import React from 'react';
import { Link } from 'react-router-dom';

const Logo = () => {
    return (
        <Link to="/" className="flex items-center space-x-2">
            {/* SVG Icon (Always visible) */}
            <svg className="w-8 h-8 text-green-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"></path>
            </svg>

            {/* This div handles the responsive text and BETA tag */}
            <div className="flex flex-row items-center sm:flex-col sm:items-start">
                
                {/* Logo Text: Hidden on mobile, visible on desktop */}
                <span className="hidden sm:inline font-bold text-2xl text-white">
                    Stock<span className="text-green-400">Predictor</span>
                    {/* --- NEW "AI" TEXT --- */}
                    <span className="text-xl text-gray-300 ms-1">AI</span>
                </span>
                
                {/* Beta Tag (no change) */}
                <span className="bg-yellow-400 text-black text-xs font-bold px-2 py-0.5 rounded-md sm:w-fit sm:-mt-1">
                    BETA
                </span>
            </div>
            
        </Link>
    );
};

export default Logo;