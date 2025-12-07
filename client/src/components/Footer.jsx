// src/components/Footer.js

import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Logo from './Logo';

// ASSUMPTION: Footer receives the settings prop
const Footer = ({ settings }) => {
    const { t } = useTranslation();
    const currentYear = new Date().getFullYear();

    // Check if the icon should be enabled
    const showXIcon = settings?.isXIconEnabled ?? false;
    const xUrl = settings?.xAccountUrl;

    return (
        <footer className="bg-gray-900 border-t border-gray-800 mt-12 md:mt-20">
            <div className="container mx-auto py-8 px-4 sm:px-6 lg:px-8">
                <div className="flex flex-col md:flex-row items-center justify-between gap-6 flex-wrap md:flex-nowrap">

                    {/* Left: Logo */}
                    <div className="flex-shrink-0">
                        <Logo />
                    </div>

                    {/* Center: Links */}
                    <div className="flex flex-wrap lg:flex-nowrap justify-center gap-x-6 text-gray-400 whitespace-nowrap">
                        <Link to="/about" className="hover:text-white">{t('footer.about')}</Link>
                        <Link to="/contact" className="hover:text-white">{t('footer.contact')}</Link>
                        <Link to="/terms" className="hover:text-white">{t('footer.terms')}</Link>
                        <Link to="/privacy" className="hover:text-white">{t('footer.privacy')}</Link>
                        <Link to="/whitepaper" className="hover:text-white">{t('footer.whitepaper')}</Link>

                        {/* --- X ICON LINK (FIXED ALIGNMENT) --- */}
                        {showXIcon && xUrl && (
                            <a
                                href={xUrl}
                                target="_blank"
                                rel="noopener noreferrer nofollow"
                                // FIX: Use inline-flex items-center and remove ms-4 (margin-start)
                                className="text-gray-400 hover:text-white inline-flex items-center"
                                title="Follow us on X"
                            >
                                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                                </svg>
                            </a>
                        )}
                        {/* ------------------------- */}
                    </div>

                    {/* Right: Placeholder (language selector) */}
                    <div className="flex justify-center md:justify-end flex-shrink-0"></div>
                </div>

                <div className="text-center text-gray-500 mt-8 pt-8 border-t border-gray-800">
                    &copy; {currentYear} stockpredictorai.com. {t('footer.copyright')}
                </div>
            </div>
        </footer>
    );
};

export default Footer;