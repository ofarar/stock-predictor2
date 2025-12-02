import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';
import axios from 'axios';

import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';

export const handleGoogleLogin = async (redirectPath = '/') => {
    const refCode = localStorage.getItem('referralCode');

    if (Capacitor.isNativePlatform()) {
        try {
            const user = await GoogleAuth.signIn();
            // Send ID token to backend for verification and session creation
            const response = await axios.post(`${import.meta.env.VITE_API_URL}/auth/google/native`, {
                idToken: user.authentication.idToken
            }, { withCredentials: true });

            if (response.data.success) {
                window.location.href = redirectPath;
            }
        } catch (error) {
            console.error("Google Sign-In failed", error);
            // Fallback or alert
        }
    } else {
        let url = `${import.meta.env.VITE_API_URL}/auth/google?redirect=${redirectPath}`;
        if (refCode) {
            url += `&ref=${refCode}`;
        }
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
