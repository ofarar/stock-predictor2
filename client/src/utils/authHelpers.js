import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';

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
