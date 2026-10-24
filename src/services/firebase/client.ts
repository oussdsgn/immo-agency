import { getApps, initializeApp, type FirebaseApp } from 'firebase/app'
import { connectAuthEmulator, getAuth, type Auth } from 'firebase/auth'
import { connectFirestoreEmulator, getFirestore, type Firestore } from 'firebase/firestore'
import { firebaseConfig, firebaseEmulatorHost } from '@/config/firebase'

export interface FirebaseHandles {
  app: FirebaseApp
  auth: Auth
  db: Firestore
}

let handles: FirebaseHandles | null = null

/** Shared Firebase app for the resident app and the dashboard (one per page). */
export function firebase(): FirebaseHandles {
  if (handles) return handles
  const app = getApps()[0] ?? initializeApp(firebaseEmulatorHost ? { ...firebaseConfig, projectId: 'demo-immo-agency' } : firebaseConfig)
  const auth = getAuth(app)
  const db = getFirestore(app)
  if (firebaseEmulatorHost) {
    connectAuthEmulator(auth, `http://${firebaseEmulatorHost}:9099`, { disableWarnings: true })
    connectFirestoreEmulator(db, firebaseEmulatorHost, 8080)
  }
  handles = { app, auth, db }
  return handles
}
