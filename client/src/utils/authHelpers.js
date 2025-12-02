import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';
import axios from 'axios';

export const handleGoogleLogin = async (redirectPath = '/') => {
    const refCode = localStorage.getItem('referralCode');
    let url = `${import.meta.env.VITE_API_URL}/auth/google?redirect=${redirectPath}`;

    if (refCode) {
        url += `&ref=${refCode}`;
    }

    if (Capacitor.isNativePlatform()) {
        url += '&mobile=true';
        // Open in system browser for Google Auth
        await Browser.open({ url });
    } else {
        window.location.href = url;
    }
};

export const handleLogout = async () => {
    try {
        await axios.get(`${import.meta.env.VITE_API_URL}/auth/logout?type=json`, { withCredentials: true });
        window.location.href = '/';
    } catch (error) {
        console.error("Logout failed", error);
        alert(`Logout failed: ${error.message}`);
        // Fallback to hard redirect if API fails
        window.location.href = `${import.meta.env.VITE_API_URL}/auth/logout`;
    }
};
