import React from 'react';

const TermsPage = () => (
    <div className="max-w-4xl mx-auto text-gray-300">
        <h1 className="text-4xl font-bold text-white text-center mb-8">Terms of Service</h1>
        <div className="bg-gray-800 p-8 rounded-lg space-y-4 text-gray-300">
            <h2 className="text-xl font-semibold text-white">1. Acceptance of Terms</h2>
            <p>By accessing or using the StockPredictor website ("Service"), you agree to be bound by these Terms of Service. If you disagree with any part of the terms, you may not access the Service.</p>

            <h2 className="text-xl font-semibold text-white">2. No Financial Advice</h2>
            <p>The information, predictions, and scores provided on this Service are for informational and entertainment purposes only. Nothing on this website constitutes financial, investment, legal, or tax advice. You are solely responsible for your own investment decisions.</p>

            <h2 className="text-xl font-semibold text-white">3. User Conduct</h2>
            <p>You agree not to use the Service to post or transmit any material which is malicious, defamatory, or otherwise violates any law. You are responsible for all predictions and content posted under your account.</p>

            <h2 className="text-xl font-semibold text-white">4. Limitation of Liability</h2>
            <p>In no event shall StockPredictor, nor its directors or employees, be liable for any indirect, incidental, special, consequential or punitive damages, including without limitation, loss of profits, data, or other intangible losses, resulting from your access to or use of the Service.</p>
        </div>
    </div>
);

export default TermsPage;