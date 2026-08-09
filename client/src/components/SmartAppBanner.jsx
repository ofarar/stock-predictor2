import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Capacitor } from '@capacitor/core';
import { IoClose } from 'react-icons/io5';

const SmartAppBanner = () => {
  const { t } = useTranslation();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Check if the user is on a mobile browser but NOT inside the native app
    const isNative = Capacitor.isNativePlatform();
    const userAgent = navigator.userAgent || navigator.vendor || window.opera;
    const isAndroid = /android/i.test(userAgent);
    
    // Check if user dismissed banner previously
    const hasDismissed = sessionStorage.getItem('smart_banner_dismissed');

    if (!isNative && isAndroid && !hasDismissed) {
      setIsVisible(true);
    }
  }, []);

  if (!isVisible) return null;

  const handleClose = () => {
    sessionStorage.setItem('smart_banner_dismissed', 'true');
    setIsVisible(false);
  };

  const handleInstall = () => {
    window.location.href = 'https://play.google.com/store/apps/details?id=com.stockpredictorai.app';
  };

  return (
    <div className="fixed top-0 left-0 w-full bg-gray-900 border-b border-gray-700 shadow-md z-[100] p-3 flex items-center justify-between transition-all duration-300">
      <div className="flex items-center gap-3 overflow-hidden">
        <button onClick={handleClose} className="text-gray-400 hover:text-white shrink-0">
          <IoClose size={24} />
        </button>
        <div className="w-10 h-10 bg-gradient-to-br from-gray-800 to-gray-900 rounded-lg flex items-center justify-center shrink-0 border border-gray-600 shadow-inner">
           {/* Basic app icon placeholder */}
           <span className="text-green-500 font-bold text-xl drop-shadow-md">S</span>
        </div>
        <div className="flex flex-col min-w-0">
          <span className="text-white font-semibold text-sm truncate tracking-wide">{t('smart_banner.app_name', 'StockPredictorAI')}</span>
          <span className="text-gray-400 text-xs truncate">{t('smart_banner.description', 'Get the app for a better experience')}</span>
        </div>
      </div>
      <button 
        onClick={handleInstall}
        className="ml-3 shrink-0 bg-green-500 hover:bg-green-400 text-gray-900 font-bold py-1.5 px-4 rounded-full text-sm shadow-lg hover:shadow-green-500/30 transition-all duration-200"
      >
        {t('smart_banner.install', 'Install')}
      </button>
    </div>
  );
};

export default SmartAppBanner;
