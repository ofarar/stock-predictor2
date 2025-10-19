// src/pages/PaymentSuccessPage.js
import React, { useEffect, useState } from 'react'; // Import useState
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import axios from 'axios'; // Import axios

const PaymentSuccessPage = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [userId, setUserId] = useState(null); // State to hold the user ID

    // Fetch user ID on component mount
    useEffect(() => {
        axios.get(`${process.env.REACT_APP_API_URL}/auth/current_user`, { withCredentials: true })
            .then(res => {
                if (res.data && res.data._id) {
                    setUserId(res.data._id); // Store the fetched user ID
                } else {
                    // Handle case where user isn't found (shouldn't happen after payment, but good practice)
                    toast.error("Could not verify user session.");
                    navigate('/'); // Redirect home if no user
                }
            })
            .catch(() => {
                toast.error("Error fetching user data.");
                navigate('/'); // Redirect home on error
            });
    }, [navigate]);

    // Redirect when userId is available
    useEffect(() => {
        if (userId) { // Only run this effect if userId has been set
            toast.success("Payment successful! Your verification is now active.");
            // Redirect to the correct profile URL after a delay
            const timer = setTimeout(() => {
                navigate(`/profile/${userId}`); // Use the fetched userId
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [userId, navigate]); // Add userId as a dependency

    // Display loading or success message while waiting/redirecting
    return (
        <div className="text-center">
            <h1 className="text-3xl font-bold text-green-400">Success!</h1>
            <p className="text-gray-300 mt-4">
                {userId ? "Your payment was processed. Redirecting you to your profile..." : "Verifying session..."}
            </p>
            {/* Optionally keep the link, but update it once userId is available */}
            {userId && (
                <Link to={`/profile/${userId}`} className="text-blue-400 hover:underline mt-2 inline-block">
                    Go now
                </Link>
            )}
        </div>
    );
};

export default PaymentSuccessPage;