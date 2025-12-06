import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';
import axios from 'axios';

import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';

export const handleGoogleLogin = async (redirectPath = '/') => {
    const refCode = localStorage.getItem('referralCode');

    if (Capacitor.isNativePlatform()) {
        try {
            alert("Step A: Starting handleGoogleLogin");

            // Check if plugin is available
            if (!GoogleAuth) {
                alert("CRITICAL: GoogleAuth object is undefined!");
                return;
            }

            const user = await GoogleAuth.signIn();

            if (!user) {
                console.error("GoogleAuth.signIn() returned null/undefined user");
                return;
            }

            console.log('Native Google Sign-In success:', user);

            const apiUrl = `${import.meta.env.VITE_API_URL}/auth/google/native`;

            // Send ID token to backend for verification and session creation
            const response = await axios.post(apiUrl, {
                idToken: user.authentication.idToken,
                refCode: refCode
            }, { withCredentials: true });

            console.log('Backend response:', response.data);

            if (response.data.success) {
                window.location.href = redirectPath;
            } else {
                console.error(`Backend verification failed: ${response.data.message}`);
            }
        } catch (error) {
            console.error("Google Sign-In failed", error);

            const errorDetails = {
                message: error.message,
                status: error.response?.status,
                data: error.response?.data,
                url: `${import.meta.env.VITE_API_URL}/auth/google/native`
            };
        }
    } else {
        // Web Fallback
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
        window.location.href = `${import.meta.env.VITE_API_URL}/auth/logout`;
    }
};
