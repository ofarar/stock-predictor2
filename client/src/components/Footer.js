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
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-center">
                    {/* Logo on the left */}
                    <div className="flex justify-center md:justify-start">
                        <Logo />
                    </div>
                    
                    {/* Links in the center */}
                    <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-gray-400">
                        <Link to="/about" className="hover:text-white">{t('footer.about')}</Link>
                        <Link to="/contact" className="hover:text-white">{t('footer.contact')}</Link>
                        <Link to="/terms" className="hover:text-white">{t('footer.terms')}</Link>
                        <Link to="/privacy" className="hover:text-white">{t('footer.privacy')}</Link>
                    </div>

                    {/* Language selector on the right */}
                    <div className="flex justify-center md:justify-end">
                        
                    </div>
                </div>
                <div className="text-center text-gray-500 mt-8 pt-8 border-t border-gray-800">&copy; {currentYear} StockPredictor. {t('footer.copyright')}</div>
            </div>
        </footer>
    );
};

export default Footer;