import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.stockpredictorai.app',
  appName: 'StockPredictorAI',
  webDir: 'dist',
  server: {
    androidScheme: 'http',
    cleartext: true
  },
  plugins: {
    GoogleAuth: {
      scopes: ['profile', 'email'],
      serverClientId: '645392634302-rfhrct0ds4qmukha4fds46rcsv8kfp86.apps.googleusercontent.com',
      forceCodeForRefreshToken: true,
    },
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"],
    },
  },
};

export default config;
