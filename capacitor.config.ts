import type { CapacitorConfig } from '@capacitor/cli'

/**
 * Native Android shell around the web build (`dist/`).
 * The app content is identical to the web version, including the mock data.
 */
const config: CapacitorConfig = {
  appId: 'com.immoagency.resident',
  appName: 'IMMO Agency',
  webDir: 'dist',
  android: {
    // Plain-HTTP traffic is not needed; keep the default secure scheme.
    allowMixedContent: false,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 800,
      backgroundColor: '#FAF7F2',
      showSpinner: false,
    },
    StatusBar: {
      backgroundColor: '#FAF7F2',
      style: 'LIGHT',
    },
  },
}

export default config
