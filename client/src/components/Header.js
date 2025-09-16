import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import axios from 'axios';
import Logo from './Logo';

const Header = ({ user, onMakePredictionClick }) => {
    const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [notifications, setNotifications] = useState([]);
    const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
    const location = useLocation();
    const userDropdownRef = useRef(null);
    const notificationsDropdownRef = useRef(null);

    // This effect now only fetches notifications if the user is logged in
    useEffect(() => {
        if (user) {
            axios.get(`${process.env.REACT_APP_API_URL}/api/notifications`, { withCredentials: true })
                .then(notifRes => setNotifications(notifRes.data));
        }
    }, [user]);

    // This effect closes all dropdowns when the page changes
    useEffect(() => {
        setIsUserMenuOpen(false);
        setIsMobileMenuOpen(false);
        setIsNotificationsOpen(false);
    }, [location.pathname]);

    // This effect handles closing dropdowns when clicking outside of them
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (userDropdownRef.current && !userDropdownRef.current.contains(event.target)) setIsUserMenuOpen(false);
            if (notificationsDropdownRef.current && !notificationsDropdownRef.current.contains(event.target)) setIsNotificationsOpen(false);
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const unreadCount = notifications.filter(n => !n.read).length;

    const UserMenu = () => (
        <div className="relative" ref={userDropdownRef}>
            <button onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}>
                <img src={user?.avatar || `https://avatar.iran.liara.run/public/boy?username=${user?._id}`} alt="Avatar" className="w-10 h-10 rounded-full border-2 border-gray-600 hover:border-green-500" />
            </button>
            {isUserMenuOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-gray-800 rounded-lg shadow-xl py-2 z-20">
                    <div className="px-4 py-2 text-sm text-green-400 border-b border-gray-700">{user.username}</div>
                    <Link to={`/profile/${user._id}`} className="flex items-center px-4 py-2 text-sm text-gray-300 hover:bg-gray-700"><svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>My Profile</Link>
                    <Link to="/profile/edit" className="flex items-center px-4 py-2 text-sm text-gray-300 hover:bg-gray-700"><svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.096 2.572-1.065z"></path><path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>Edit Profile</Link>
                    <div className="border-t border-gray-700 my-1"></div>
                    <a href={`${process.env.REACT_APP_API_URL}/auth/logout`} className="flex items-center w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-gray-700"><svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg>Logout</a>
                </div>
            )}
        </div>
    );

    return (
        <nav className="bg-gray-900 text-white shadow-lg mb-8 sm:mb-12">
            <div className="container mx-auto px-4 sm:px-6 py-4">
                <div className="flex justify-between items-center">
                    <div className="flex items-center space-x-8">
                        <Logo />
                        <div className="hidden md:flex items-center space-x-6">
                            <Link to="/scoreboard" className="flex items-center gap-2 text-gray-300 hover:text-white transition-colors"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0h6"></path></svg>Scoreboard</Link>
                        </div>
                    </div>

                    <div className="flex items-center space-x-4">
                        <div className="hidden md:flex items-center space-x-4">
                            <button onClick={() => onMakePredictionClick(null)} className="flex items-center gap-2 bg-green-500 text-white font-semibold px-4 py-2 rounded-md hover:bg-green-600 transition">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg>
                                Make a Prediction
                            </button>
                            {user ? (
                                <>
                                    <div className="relative" ref={notificationsDropdownRef}>
                                        <button onClick={() => setIsNotificationsOpen(!isNotificationsOpen)} className="relative p-2">
                                            <svg className="w-6 h-6 text-gray-300 hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path></svg>
                                            {unreadCount > 0 && <span className="absolute top-1 right-1 block h-2.5 w-2.5 rounded-full bg-red-500 border-2 border-gray-900"></span>}
                                        </button>
                                        {isNotificationsOpen && (
                                            <div className="absolute right-0 mt-2 w-80 bg-gray-800 rounded-lg shadow-xl p-2 z-20">
                                                <div className="p-2 font-bold text-white">Notifications</div>
                                                {notifications.length > 0 ? notifications.map(n => (
                                                    <Link to={n.link} key={n._id} className="block p-2 text-sm text-gray-300 hover:bg-gray-700 rounded">{n.message}</Link>
                                                )) : <p className="p-2 text-sm text-gray-500">No new notifications.</p>}
                                            </div>
                                        )}
                                    </div>
                                    <UserMenu />
                                </>
                            ) : (
                                <a href={`${process.env.REACT_APP_API_URL}/auth/logout`} className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700">Log In</a>
                            )}
                        </div>
                        <div className="md:hidden">
                            <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
                                {isMobileMenuOpen ? <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg> : <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16m-7 6h7"></path></svg>}
                            </button>
                        </div>
                    </div>
                </div>
                {isMobileMenuOpen && (
                    <div className="md:hidden mt-4">
                        {user && <button onClick={onMakePredictionClick} className="w-full mb-2 bg-green-500 text-white font-semibold px-4 py-2 rounded-md">Make a Prediction</button>}
                        <Link to="/scoreboard" className="block py-2 px-4 text-sm hover:bg-gray-700 rounded">Scoreboard</Link>
                        {user && <Link to={`/profile/${user._id}`} className="block py-2 px-4 text-sm hover:bg-gray-700 rounded">My Profile</Link>}
                        {user && <Link to="/profile/edit" className="block py-2 px-4 text-sm hover:bg-gray-700 rounded">Edit Profile</Link>}
                        <div className="border-t border-gray-700 my-2"></div>
                        <div className="mt-2">
                            {user
                                ? <a href={`${process.env.REACT_APP_API_URL}/auth/logout`} className="block w-full text-center py-2 px-4 text-sm bg-red-600 rounded">Logout</a>
                                : <a href={`${process.env.REACT_APP_API_URL}/auth/google`} className="block py-2 px-4 text-sm bg-blue-600 rounded">Log In</a>
                            }
                        </div>
                    </div>
                )}
            </div>
        </nav>
    );
};

export default Header;