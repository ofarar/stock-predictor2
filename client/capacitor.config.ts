import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.stockpredictorai.app',
  appName: 'StockPredictorAI',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  },
  plugins: {
    GoogleAuth: {
      scopes: ['profile', 'email'],
      serverClientId: '645392634302-8ig38o9ujs82m5qob8t06vm1qrmiu0vk.apps.googleusercontent.com', // Placeholder - User needs to replace this or I need to find it
      forceCodeForRefreshToken: true,
    },
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"],
    },
  }
};

export default config;
