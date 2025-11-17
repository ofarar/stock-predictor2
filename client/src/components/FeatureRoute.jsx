import React from 'react';
import { Navigate } from 'react-router-dom';

const FeatureRoute = ({ settings, featureFlag, children }) => {
    // If settings are not loaded yet, don't render the route's content
    if (!settings) {
        return null; // Or a loading spinner
    }

    // If the feature is enabled in settings, show the page.
    if (settings[featureFlag]) {
        return children;
    }

    // Otherwise, redirect to the homepage.
    return <Navigate to="/" replace />;
};

export default FeatureRoute;