import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.ezgym.app',
  appName: 'Ez Gym',
  webDir: 'www',
  server: {
    androidScheme: 'https',
    cleartext: true,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1200,
      launchAutoHide: true,
      backgroundColor: '#000000',
      showSpinner: false,
      androidScaleType: 'CENTER_CROP',
    },
    CapacitorSQLite: {
      iosDatabaseLocation: 'Library',
      androidDatabaseLocation: 'default',
    },
  },
};

export default config;
