// src/pages/PaymentSuccessPage.js
import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next'; // Import useTranslation
import toast from 'react-hot-toast';
import axios from 'axios';

const PaymentSuccessPage = () => {
    const { t } = useTranslation(); // Get the translation function
    const navigate = useNavigate();
    const [userId, setUserId] = useState(null);

    useEffect(() => {
        axios.get(`${process.env.REACT_APP_API_URL}/auth/current_user`, { withCredentials: true })
            .then(res => {
                if (res.data && res.data._id) {
                    setUserId(res.data._id);
                } else {
                    // Use translation key for toast
                    toast.error(t('paymentSuccess.errorSession'));
                    navigate('/');
                }
            })
            .catch(() => {
                // Use translation key for toast
                toast.error(t('paymentSuccess.errorFetchUser'));
                navigate('/');
            });
    }, [navigate, t]); // Add t to dependency array

    useEffect(() => {
        if (userId) {
            // Use translation key for toast
            toast.success(t('paymentSuccess.toastSuccess'));
            const timer = setTimeout(() => {
                navigate(`/profile/${userId}`);
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [userId, navigate, t]); // Add t to dependency array

    return (
        <div className="text-center">
            {/* Use translation key */}
            <h1 className="text-3xl font-bold text-green-400">{t('paymentSuccess.title')}</h1>
            <p className="text-gray-300 mt-4">
                {/* Use translation key with conditional */}
                {userId ? t('paymentSuccess.redirecting') : t('paymentSuccess.verifyingSession')}
            </p>
            {userId && (
                <Link to={`/profile/${userId}`} className="text-blue-400 hover:underline mt-2 inline-block">
                    {/* Use translation key */}
                    {t('paymentSuccess.goNow')}
                </Link>
            )}
        </div>
    );
};

export default PaymentSuccessPage;