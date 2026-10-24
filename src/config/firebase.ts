import type { FirebaseOptions } from 'firebase/app'

/**
 * Firebase web configuration of the IMMO Agency project.
 *
 * These values are public by design (they ship in every Firebase web/mobile
 * app); data is protected by firebase/firestore.rules. Each value can be
 * overridden with a VITE_FIREBASE_* variable, e.g. for a staging project.
 * Never put a service-account key here.
 */
export const firebaseConfig: FirebaseOptions = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY ?? 'AIzaSyD5ojWqdzkYApzTKAxZtACznMjbfoVDiWk',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ?? 'immo-agency-53c66.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID ?? 'immo-agency-53c66',
  storageBucket: 'immo-agency-53c66.firebasestorage.app',
  messagingSenderId: '626195724182',
  appId: import.meta.env.VITE_FIREBASE_APP_ID ?? '1:626195724182:web:66ff6d62eca5fd8a3ecfb7',
}

/**
 * Host of the local Firebase emulators (e.g. "127.0.0.1"), for development and
 * the end-to-end tests. Unset in production builds.
 */
export const firebaseEmulatorHost = import.meta.env.VITE_FIREBASE_EMULATOR as string | undefined
