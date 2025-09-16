import React from 'react';
import { Link } from 'react-router-dom';
import Logo from './Logo';

const Footer = () => {
    const currentYear = new Date().getFullYear();
    return (
        <footer className="bg-gray-900 border-t border-gray-800 mt-20">
            <div className="container mx-auto py-8 px-6">
                <div className="flex flex-col md:flex-row justify-between items-center">
                    <div className="mb-4 md:mb-0"><Logo /></div>
                    <div className="flex space-x-6 text-gray-400">
                        <Link to="/about" className="hover:text-white">About</Link>
                        <Link to="/terms" className="hover:text-white">Terms of Service</Link>
                        <Link to="/privacy" className="hover:text-white">Privacy Policy</Link>
                    </div>
                </div>
                <div className="text-center text-gray-500 mt-8">&copy; {currentYear} StockPredictor. All rights reserved.</div>
            </div>
        </footer>
    );
};

export default Footer;