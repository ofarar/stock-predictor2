import React from 'react';

const AboutPage = () => {
    return (
        <div className="max-w-4xl mx-auto text-gray-300 animate-fade-in">
            <h1 className="text-4xl font-bold text-white text-center mb-8">About StockPredictor</h1>

            <div className="bg-gray-800 p-8 rounded-lg space-y-6">
                <section>
                    <h2 className="text-2xl font-semibold text-green-400 mb-3">Our Mission</h2>
                    <p>
                        StockPredictor was founded on the principle that the collective wisdom of informed individuals can be a powerful tool in navigating the financial markets. Our mission is to provide a platform where both novice investors and seasoned professionals can test their analytical skills, learn from the community, and build a transparent track record of their market predictions.
                    </p>
                </section>

                <section>
                    <h2 className="text-2xl font-semibold text-green-400 mb-3">How It Works</h2>
                    <div className="grid md:grid-cols-3 gap-6 text-center">
                        <div className="bg-gray-700 p-4 rounded-lg">
                            <h3 className="font-bold text-white mb-2">1. Predict</h3>
                            <p className="text-sm">Make predictions on thousands of assets with various timeframes, from hourly to yearly.</p>
                        </div>
                         <div className="bg-gray-700 p-4 rounded-lg">
                            <h3 className="font-bold text-white mb-2">2. Track</h3>
                            <p className="text-sm">Follow your active predictions and see how your historical forecasts have performed.</p>
                        </div>
                         <div className="bg-gray-700 p-4 rounded-lg">
                            <h3 className="font-bold text-white mb-2">3. Compete</h3>
                            <p className="text-sm">Climb the leaderboards by making accurate predictions and prove your skills to the community.</p>
                        </div>
                    </div>
                </section>

                <section>
                    <h2 className="text-2xl font-semibold text-green-400 mb-3">Scoring Explained</h2>
                    <p>
                        Our platform uses a **Proximity Scoring System** to reward accuracy. Instead of a simple "correct" or "incorrect," your score is based on how close your prediction was to the actual outcome.
                    </p>
                    <p className="mt-2">
                        For example, if a stock is at $152 and you predict it will be $150, you will receive a much higher score than someone who predicted $180. This system is designed to reward thoughtful analysis over random guesses. The maximum score for a perfect prediction is 100 points, with points decreasing the further your prediction is from the final price.
                    </p>
                </section>
            </div>
        </div>
    );
};

export default AboutPage;