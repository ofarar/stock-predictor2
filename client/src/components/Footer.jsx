import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Logo from './Logo';

const Footer = () => {
    const { t } = useTranslation();
    const currentYear = new Date().getFullYear();

    return (
        <footer className="bg-gray-900 border-t border-gray-800 mt-12 md:mt-20">
            <div className="container mx-auto py-8 px-4 sm:px-6 lg:px-8">
                {/* Use flex for more natural layout control */}
                <div className="flex flex-col md:flex-row items-center justify-between gap-6 flex-wrap md:flex-nowrap">
                    
                    {/* Left: Logo */}
                    <div className="flex-shrink-0">
                        <Logo />
                    </div>

                    {/* Center: Links */}
                    <div className="flex flex-wrap md:flex-nowrap justify-center gap-x-6 text-gray-400 whitespace-nowrap overflow-x-auto">
                        <Link to="/about" className="hover:text-white">{t('footer.about')}</Link>
                        <Link to="/contact" className="hover:text-white">{t('footer.contact')}</Link>
                        <Link to="/terms" className="hover:text-white">{t('footer.terms')}</Link>
                        <Link to="/privacy" className="hover:text-white">{t('footer.privacy')}</Link>
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
