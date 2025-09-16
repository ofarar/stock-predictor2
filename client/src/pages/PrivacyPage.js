import React from 'react';

const PrivacyPage = () => (
    <div className="max-w-4xl mx-auto text-gray-300">
        <h1 className="text-4xl font-bold text-white text-center mb-8">Privacy Policy</h1>
        <div className="bg-gray-800 p-8 rounded-lg space-y-4 text-gray-300">
            <h2 className="text-xl font-semibold text-white">1. Information Collection</h2>
            <p>We collect information to provide and improve our Service. When you register using Google, we receive your name, email address, and profile picture as provided by your Google account permissions.</p>

            <h2 className="text-xl font-semibold text-white">2. Use of Information</h2>
            <p>We use the information we collect to operate and maintain our Service, create your user profile, and communicate with you. We do not sell your personal information to third parties.</p>

            <h2 className="text-xl font-semibold text-white">3. Cookies</h2>
            <p>We use cookies to maintain your session after you log in. A cookie is a small piece of data stored on your computer. You can instruct your browser to refuse all cookies, but you may not be able to use some portions of our Service.</p>

            <h2 className="text-xl font-semibold text-white">4. Security</h2>
            <p>The security of your data is important to us, but remember that no method of transmission over the Internet is 100% secure. We strive to use commercially acceptable means to protect your Personal Information, but we cannot guarantee its absolute security.</p>
        </div>
    </div>
);

export default PrivacyPage;