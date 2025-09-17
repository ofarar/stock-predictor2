import React from 'react';
import { Link } from 'react-router-dom';

const Logo = () => {
    return (
        <Link to="/" className="flex items-center space-x-2">
            {/* SVG Icon */}
            <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"></path>
            </svg>
            {/* This text will be hidden on small screens (mobile) and appear on larger screens */}
            <span className="hidden sm:inline font-bold text-2xl text-white">
                Stock<span className="text-green-400">Predictor</span>
            </span>
        </Link>
    );
};

export default Logo;