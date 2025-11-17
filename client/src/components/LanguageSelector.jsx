// src/components/LanguageSelector.js
import React from 'react';
import { useTranslation } from 'react-i18next';
import axios from 'axios';

const languages = [
    { code: 'en', name: 'English', flag: '🇬🇧' },
    { code: 'tr', name: 'Türkçe', flag: '🇹🇷' },
    { code: 'fr', name: 'Français', flag: '🇫🇷' },
    { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
    { code: 'es', name: 'Español', flag: '🇪🇸' },
    { code: 'ru', name: 'Русский', flag: '🇷🇺' },
    { code: 'zh', name: '中文', flag: '🇨🇳' },
];

const LanguageSelector = ({ user }) => {
    const { i18n } = useTranslation();

    const handleLanguageChange = async (e) => {
        const newLang = e.target.value;
        i18n.changeLanguage(newLang);
        if (user) {
            try {
                await axios.put(`${import.meta.env.VITE_API_URL}/api/profile/language`, { language: newLang }, { withCredentials: true });
            } catch (error) {
                console.error('Failed to save language preference:', error);
            }
        }
    };

    return (
        <div className="relative">
            <select
                onChange={handleLanguageChange}
                value={i18n.language}
                className="bg-gray-800 text-white rounded-md p-2 appearance-none cursor-pointer"
            >
                {languages.map((lang) => (
                    <option key={lang.code} value={lang.code}>
                        {lang.flag} {lang.name}
                    </option>
                ))}
            </select>
        </div>
    );
};

export default LanguageSelector;
