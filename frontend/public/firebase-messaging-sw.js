/**
 * Service Worker Firebase Messaging — Recov360
 * Gère les notifications push reçues en arrière-plan (app fermée ou onglet inactif).
 * Ce fichier DOIT être à la racine de /public pour être accessible sur /.
 */

importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js')
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js')

firebase.initializeApp({
  apiKey:            'AIzaSyDPvBS8Qjh1NUy4z7Km2-cYdj6pWj1VPgM',
  authDomain:        'recov360-30e46.firebaseapp.com',
  projectId:         'recov360-30e46',
  storageBucket:     'recov360-30e46.firebasestorage.app',
  messagingSenderId: '980407222397',
  appId:             '1:980407222397:web:4cdf4e2bf2a5bae1a1f114',
})

const messaging = firebase.messaging()

/**
 * Notification reçue en arrière-plan.
 * Firebase affiche automatiquement la notification système.
 * On peut personnaliser ici (icône, badge, actions...).
 */
messaging.onBackgroundMessage(payload => {
  const title = payload.notification?.title || 'Recov360'
  const body  = payload.notification?.body  || 'Vous avez une nouvelle notification'

  self.registration.showNotification(title, {
    body,
    icon:  '/icon-192.png',   // ajouter ce fichier dans /public si besoin
    badge: '/badge-72.png',
    data:  payload.data ?? {},
    requireInteraction: false,
  })
})

/** Clic sur la notification → ouvre ou focus l'app */
self.addEventListener('notificationclick', event => {
  event.notification.close()
  const url = event.notification.data?.action_url || '/'
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(windowClients => {
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus()
        }
      }
      return clients.openWindow(url)
    })
  )
})
