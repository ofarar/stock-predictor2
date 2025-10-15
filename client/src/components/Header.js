// src/components/Header.js
import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Logo from './Logo';
import GlobalSearch from './GlobalSearch';
import VerifiedTick from './VerifiedTick';
import NotificationBell from './NotificationBell'; // <-- Import the new component

const Header = ({ user, onMakePredictionClick, settings }) => {
    const { t } = useTranslation();
    const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const location = useLocation();
    const userDropdownRef = useRef(null);

    // All notification logic has been moved to the NotificationBell component

    useEffect(() => {
        setIsUserMenuOpen(false);
        setIsMobileMenuOpen(false);
    }, [location.pathname]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (userDropdownRef.current && !userDropdownRef.current.contains(event.target)) {
                setIsUserMenuOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const UserMenu = () => (
        <div className="relative" ref={userDropdownRef}>
            <button onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}>
                <img
                    src={user?.avatar || `https://avatar.iran.liara.run/public/boy?username=${user?._id}`}
                    alt="Avatar"
                    className={`w-10 h-10 rounded-full border-2 ${user.isGoldenMember ? 'border-yellow-400' : 'border-gray-600'} hover:border-green-500`}
                />
            </button>
            {isUserMenuOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-gray-800 rounded-lg shadow-xl py-2 z-40">
                    <div className="px-4 py-2 text-sm text-green-400 border-b border-gray-700 flex items-center gap-2">
                        {user.username}
                        {settings?.isVerificationEnabled && user.isVerified && <VerifiedTick />}
                    </div>
                    <Link to={`/profile/${user._id}`} className="flex items-center px-4 py-2 text-sm text-gray-300 hover:bg-gray-700">{t('header.userMenu.myProfile')}</Link>
                    {user.isAdmin && (<Link to="/admin" className="flex items-center px-4 py-2 text-sm text-yellow-400 hover:bg-gray-700">{t('header.userMenu.admin')}</Link>)}
                    <div className="border-t border-gray-700 my-1"></div>
                    <a href={`${process.env.REACT_APP_API_URL}/auth/logout`} className="flex items-center w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-gray-700">{t('header.userMenu.logout')}</a>
                </div>
            )}
        </div>
    );

    return (
        <nav className="bg-gray-900 text-white shadow-lg mb-2 sm:mb-6">
            <div className="container mx-auto px-4 sm:px-6 py-4">
                <div className="flex justify-between items-center">

                    {/* --- LEFT SIDE --- */}
                    <div className="flex items-center space-x-8">
                        <Logo />
                        <div className="hidden md:flex items-center space-x-6">
                            {/* Desktop Nav Links */}
                            {settings?.isAIWizardEnabled && (
                                <Link to="/ai-wizard" className="flex items-center gap-2 text-gray-300 hover:text-white transition-colors whitespace-nowrap">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0m-8.486-2.828l-.707.707M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                                    {t('header.aiWizard')}
                                </Link>
                            )}
                            {user && (
                                <Link to="/watchlist" className="flex items-center gap-2 text-gray-300 hover:text-white transition-colors whitespace-nowrap">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path></svg>
                                    {t('header.watchlist')}
                                </Link>
                            )}
                            {user && (user.isGoldenMember || user.goldenSubscriptions?.length > 0) && (
                                <Link to="/golden-feed" className="flex items-center gap-2 text-gray-300 hover:text-white transition-colors whitespace-nowrap">
                                    <svg className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path></svg>
                                    {t('header.goldenFeed')}
                                </Link>
                            )}
                            <Link to="/explore" className="flex items-center gap-2 text-gray-300 hover:text-white transition-colors whitespace-nowrap">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                                {t('header.explore')}
                            </Link>
                            <Link to="/scoreboard" className="flex items-center gap-2 text-gray-300 hover:text-white transition-colors whitespace-nowrap"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0h6"></path></svg>{t('header.scoreboard')}</Link>
                        </div>
                    </div>

                    {/* --- RIGHT SIDE --- */}
                    <div className="flex items-center space-x-4">
                        <div className="hidden sm:block"><GlobalSearch /></div>

                        {/* Desktop User Actions */}
                        <div className="hidden md:flex items-center space-x-4">
                            <button onClick={() => onMakePredictionClick(null)} className="flex items-center gap-2 bg-green-500 text-white font-semibold px-4 py-2 rounded-md hover:bg-green-600 transition">
                                <svg className="w-5 h-5" /* ... */></svg>
                                {t('header.buttons.makePrediction')}
                            </button>
                            {user ? (
                                <>
                                    <NotificationBell user={user} />
                                    <UserMenu />
                                </>
                            ) : (
                                <a href={`${process.env.REACT_APP_API_URL}/auth/google`} className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700">{t('header.buttons.login')}</a>
                            )}
                        </div>

                        {/* Mobile User Actions */}
                        <div className="md:hidden flex items-center gap-2">

                            <button onClick={() => onMakePredictionClick(null)} className="text-2xl bg-green-500 text-white rounded-full w-[1.5em] h-[1.5em] flex items-center justify-center hover:bg-green-600" title={t('header.buttons.makePrediction')}>
                                <svg className="w-[0.7em] h-[0.7em]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg>
                            </button>
                            {user && <NotificationBell user={user} />}
                            <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2">
                                {isMobileMenuOpen ? (<svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>) : (<svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" /></svg>)}
                            </button>
                        </div>
                    </div>
                </div>
                <div className="md:hidden flex justify-center mt-2 w-full">
                    <div className="w-full px-4 sm:px-6 max-w-md"><GlobalSearch /></div>
                </div>

                {isMobileMenuOpen && (
                    <div className="md:hidden mt-4 space-y-1">
                        {user && <Link to="/watchlist" className="flex items-center gap-3 py-2 px-4 text-sm hover:bg-gray-700 rounded"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path></svg>{t('header.mobileMenu.watchlist')}</Link>}
                        <Link to="/explore" className="flex items-center gap-3 py-2 px-4 text-sm hover:bg-gray-700 rounded"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>{t('header.mobileMenu.explore')}</Link>
                        <Link to="/scoreboard" className="flex items-center gap-3 py-2 px-4 text-sm hover:bg-gray-700 rounded"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0h6"></path></svg>{t('header.mobileMenu.scoreboard')}</Link>
                        {user && (user.isGoldenMember || user.goldenSubscriptions?.length > 0) && (<Link to="/golden-feed" className="flex items-center gap-3 py-2 px-4 text-sm text-yellow-400 hover:bg-gray-700 rounded"><svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path></svg>{t('header.mobileMenu.goldenFeed')}</Link>)}
                        {settings?.isAIWizardEnabled && <Link to="/ai-wizard" className="flex items-center gap-3 py-2 px-4 text-sm hover:bg-gray-700 rounded"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0m-8.486-2.828l-.707.707M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>{t('header.mobileMenu.aiWizard', 'AI Portfolio Assist')}</Link>}
                        {user && <Link to={`/profile/${user._id}`} className="flex items-center gap-3 py-2 px-4 text-sm hover:bg-gray-700 rounded"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>{t('header.mobileMenu.myProfile')}</Link>}
                        {user && user.isAdmin && <Link to="/admin" className="flex items-center gap-3 py-2 px-4 text-sm text-yellow-400 hover:bg-gray-700 rounded"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>{t('header.mobileMenu.adminPanel')}</Link>}
                        <div className="border-t border-gray-700 my-2"></div>
                        <div className="mt-2">
                            {user ? <a href={`${process.env.REACT_APP_API_URL}/auth/logout`} className="block w-full text-center py-2 px-4 text-sm bg-red-600 rounded">{t('header.mobileMenu.logout')}</a> : <a href={`${process.env.REACT_APP_API_URL}/auth/google`} className="block w-full text-center py-2 px-4 text-sm bg-blue-600 rounded text-center">{t('header.mobileMenu.login')}</a>}
                        </div>
                    </div>
                )}
            </div>
        </nav>
    );
};

export default Header;