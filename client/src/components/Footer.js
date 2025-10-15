import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import Logo from './Logo';

// ReactFlagsSelect import has been removed

const languages = {
    en: { nativeName: 'English', flag: '🇬🇧' },
    tr: { nativeName: 'Türkçe', flag: '🇹🇷' },
    de: { nativeName: 'Deutsch', flag: '🇩🇪' },
    es: { nativeName: 'Español', flag: '🇪🇸' },
    zh: { nativeName: '中文', flag: '🇨🇳' },
    ru: { nativeName: 'Русский', flag: '🇷🇺' },
    fr: { nativeName: 'Français', flag: '🇫🇷' }
};

const Footer = () => {
    const { t, i18n } = useTranslation();
    const currentYear = new Date().getFullYear();
    const [isLangOpen, setIsLangOpen] = useState(false);
    const langRef = useRef(null);

    // This effect handles closing the dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (langRef.current && !langRef.current.contains(event.target)) {
                setIsLangOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [langRef]);

    const changeLanguage = (lng) => {
        i18n.changeLanguage(lng);
        setIsLangOpen(false); // Close dropdown on selection
        axios.put(`${process.env.REACT_APP_API_URL}/api/profile/language`, { language: lng }, { withCredentials: true })
            .catch(err => console.error("Could not save language preference", err));
    };

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
                        <div className="relative" ref={langRef}>
                            <button
                                onClick={() => setIsLangOpen(prev => !prev)}
                                className="bg-gray-700 text-white py-2 px-4 rounded-md border border-gray-600 flex items-center justify-between w-36"
                            >
                                <span>{languages[i18n.language]?.flag}</span>
                                <span>{languages[i18n.language]?.nativeName}</span>
                                <svg className={`w-4 h-4 transition-transform ${isLangOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                            </button>

                            {isLangOpen && (
                                <div className="absolute bottom-full mb-2 w-full bg-gray-700 border border-gray-600 rounded-md overflow-hidden z-20">
                                    {Object.keys(languages).map((lng) => (
                                        <button
                                            key={lng}
                                            onClick={() => changeLanguage(lng)}
                                            className="w-full text-left py-2 px-4 text-white hover:bg-green-500 flex items-center gap-2"
                                        >
                                            <span>{languages[lng].flag}</span>
                                            <span>{languages[lng].nativeName}</span>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
                <div className="text-center text-gray-500 mt-8 pt-8 border-t border-gray-800">&copy; {currentYear} StockPredictor. {t('footer.copyright')}</div>
            </div>
        </footer>
    );
};

export default Footer;