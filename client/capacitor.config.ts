import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.stockpredictorai.app',
  appName: 'StockPredictorAI',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;
