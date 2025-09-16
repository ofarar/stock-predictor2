import React from 'react';

const LoginPage = () => {
    return (
        <div className="flex flex-col items-center justify-center text-center mt-20">
            <h1 className="text-4xl font-bold text-white mb-4">Welcome to StockPredictor</h1>
            <p className="text-gray-300 mb-8">Sign in to start making predictions and build your virtual portfolio.</p>
            <a 
                href="http://localhost:5001/auth/google" 
                className="bg-blue-600 text-white font-bold py-3 px-6 rounded-lg flex items-center space-x-3 hover:bg-blue-700 transition"
            >
                {/* You can use an SVG icon for the Google logo here */}
                <span>Sign in with Google</span>
            </a>
        </div>
    );
};

export default LoginPage;