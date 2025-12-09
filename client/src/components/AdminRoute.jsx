
import React from 'react';
import { Navigate } from 'react-router-dom';

const AdminRoute = ({ user, children, isAuthLoading }) => {
    if (isAuthLoading) {
        return null; // Or a loading spinner
    }

    if (!user || !user.isAdmin) {
        return <Navigate to="/" replace />;
    }

    return children;
};

export default AdminRoute;
