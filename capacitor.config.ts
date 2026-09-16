import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.cirklebook.app',
  appName: 'Cirklebook',
  webDir: 'www',
  server: {
    hostname: 'cirklebook.com',
    androidScheme: 'https',
    iosScheme: 'https'
  },
  plugins: {
    CapacitorHttp: { enabled: true },
    SplashScreen: {
      launchAutoHide: true,
      showSpinner: false
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert']
    }
  }
};

export default config;

