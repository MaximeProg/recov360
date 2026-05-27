/**
 * Firebase client — configuration et instance messaging (push web).
 * Utiliser uniquement côté client ('use client' ou useEffect).
 */
import { initializeApp, getApps, getApp } from 'firebase/app'
import { getMessaging, getToken, onMessage, type Messaging } from 'firebase/messaging'

const firebaseConfig = {
  apiKey:            process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
  authDomain:        process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
  projectId:         process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
  storageBucket:     process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET!,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!,
  appId:             process.env.NEXT_PUBLIC_FIREBASE_APP_ID!,
}

/** Initialise Firebase une seule fois (pattern singleton Next.js) */
const app = getApps().length ? getApp() : initializeApp(firebaseConfig)

/**
 * Retourne l'instance Messaging.
 * Doit être appelé uniquement dans le navigateur (pas lors du SSR).
 */
export function getFirebaseMessaging(): Messaging | null {
  if (typeof window === 'undefined') return null
  try {
    return getMessaging(app)
  } catch {
    return null
  }
}

/**
 * Demande la permission de notification et récupère le token FCM.
 * Retourne null si permission refusée ou navigateur incompatible.
 */
export async function requestFcmToken(): Promise<string | null> {
  if (typeof window === 'undefined') return null
  if (!('Notification' in window)) return null
  if (!('serviceWorker' in navigator)) return null

  const messaging = getFirebaseMessaging()
  if (!messaging) return null

  try {
    const permission = await Notification.requestPermission()
    if (permission !== 'granted') return null

    const swReg = await navigator.serviceWorker.register('/firebase-messaging-sw.js')

    const token = await getToken(messaging, {
      vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY!,
      serviceWorkerRegistration: swReg,
    })

    return token ?? null
  } catch (err) {
    console.warn('[FCM] Impossible de récupérer le token:', err)
    return null
  }
}

/**
 * Écoute les messages FCM reçus quand l'app est au premier plan.
 * Retourne une fonction de nettoyage (unsubscribe).
 */
export function onForegroundMessage(
  callback: (payload: { notification?: { title?: string; body?: string }; data?: Record<string, string> }) => void
): () => void {
  const messaging = getFirebaseMessaging()
  if (!messaging) return () => {}
  return onMessage(messaging, callback)
}
