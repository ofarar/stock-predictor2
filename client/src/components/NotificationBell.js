// src/components/NotificationBell.js
import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { formatPercentage } from '../utils/formatters';

const getNotificationIcon = (type) => {
    if (type === 'GoldenPost') {
        return <svg className="w-5 h-5 mr-3 text-yellow-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path></svg>;
    }
    switch (type) {
        case 'NewFollower':
            return <svg className="w-5 h-5 mr-3 text-blue-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>;
        case 'BadgeEarned':
            return <svg className="w-5 h-5 mr-3 text-yellow-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"></path></svg>;
        case 'GoldenPost':
            return <svg className="w-5 h-5 mr-3 text-yellow-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path></svg>;

        default: // NewPrediction
            return <svg className="w-5 h-5 mr-3 text-green-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"></path></svg>;
    }
}

const NotificationBell = ({ user }) => {
    const { t, i18n } = useTranslation();
    const [notifications, setNotifications] = useState([]);
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);
    const [setIsNotificationsOpen] = useState(false);
    const isInitialMount = useRef(true);

    useEffect(() => {
        if (user) {
            axios.get(`${process.env.REACT_APP_API_URL}/api/notifications`, { withCredentials: true })
                .then(res => setNotifications(res.data));
        }
    }, [user]);

    const unreadCount = notifications.filter(n => !n.read).length;

    useEffect(() => {
        if (isInitialMount.current) {
            isInitialMount.current = false;
            return;
        }

        if (!isOpen && unreadCount > 0) {
            axios.post(`${process.env.REACT_APP_API_URL}/api/notifications/mark-read`, {}, { withCredentials: true })
                .then(() => {
                    const readNotifications = notifications.map(n => ({ ...n, read: true }));
                    setNotifications(readNotifications);
                });
        }
    }, [isOpen]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleBellClick = () => {
        setIsOpen(prev => !prev);
    };

    const handleClearNotifications = () => {
        const promise = axios.delete(`${process.env.REACT_APP_API_URL}/api/notifications/clear`, { withCredentials: true });

        toast.promise(promise, {
            loading: t('header.notifications.clearAll'),
            success: t('header.notifications.clearSuccess'),
            error: t('header.notifications.clearError'),
        });

        promise.then(() => {
            setNotifications([]);
            setIsOpen(false); // Close the dropdown on success
        }).catch(() => {
            // The toast handles showing the error, so no extra action is needed here.
        });
    };

    const hasUnreadGoldenPost = notifications.some(n => n.type === 'GoldenPost' && !n.read);

    return (
        <div className="relative" ref={dropdownRef}>
            <button onClick={handleBellClick} className="relative p-2">
                <svg className="w-6 h-6 text-gray-300 hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path></svg>
                {unreadCount > 0 && (
                    <span className={`absolute top-1 right-1 block h-2.5 w-2.5 rounded-full border-2 border-gray-900 ${hasUnreadGoldenPost ? 'bg-yellow-400' : 'bg-red-500'}`}></span>
                )}
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-gray-800 rounded-lg shadow-xl flex flex-col z-40">
                    <div className="p-2 font-bold text-white border-b border-gray-700">{t('header.notifications.title')}</div>
                    <div className="max-h-96 overflow-y-auto">
                        {notifications.length > 0 ? notifications.map(n => {
                            // Create a new object for interpolation to avoid mutating metadata
                            const interpolation = { ...n.metadata };

                            if (interpolation.badgeName) {
                                const badgeKey = interpolation.badgeName.toLowerCase().replace(/ /g, '_');
                                interpolation.badgeName = t(`badges.${badgeKey}.name`, interpolation.badgeName);
                            }
                            if (interpolation.predictionType) {
                                interpolation.predictionType = t(`predictionTypes.${interpolation.predictionType.toLowerCase()}`);
                            }

                            return (
                                <Link to={n.link} key={n._id} onClick={() => setIsOpen(false)} className="flex items-start p-2 text-sm text-gray-300 hover:bg-gray-700 rounded">
                                    {getNotificationIcon(n.type)}
                                    <div className="flex-grow">
                                        <span className={!n.read ? 'font-bold' : ''}>{t(n.messageKey, interpolation)}</span>
                                        {n.metadata?.percentage != null && (
                                            <span className={`ml-1 font-bold ${n.metadata.percentage >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                                ({formatPercentage(n.metadata.percentage, i18n.language)})
                                            </span>
                                        )}
                                    </div>
                                </Link>
                            );
                        }) : <p className="p-2 text-sm text-gray-500">{t('header.notifications.noNew')}</p>}
                    </div>
                    {notifications.length > 0 && (
                        <div className="border-t border-gray-700 p-2 text-center">
                            <button onClick={handleClearNotifications} className="text-xs text-red-500 hover:text-red-400 hover:underline">
                                {t('header.notifications.clearAll')}
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default NotificationBell;