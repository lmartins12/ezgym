import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.ezgym.app',
  appName: 'ezgym',
  webDir: 'www',
  server: {
    androidScheme: 'https',
    cleartext: true,
  },
  plugins: {
    CapacitorSQLite: {
      iosDatabaseLocation: 'Library',
      androidDatabaseLocation: 'default',
    },
  },
};

export default config;
