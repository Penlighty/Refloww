// capacitor.config.ts
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.inflow.app',
  appName: 'Inflow',
  webDir: 'out', // Updated to static export output folder
  plugins: {
    GoogleAuth: {
      scopes: ['profile', 'email'],
      clientId: '938128551688-rbgf5oe3qvrjuff3s2ccrur8lp0t8eog.apps.googleusercontent.com', // 🔴 USER ACTION: Replace with Web Client ID from Google Console
      forceCodeForRefreshToken: true,
    },
  },
};

export default config;
