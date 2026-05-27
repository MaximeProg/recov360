/**
 * Hook — Gestion des notifications push FCM.
 *
 * - Demande la permission au navigateur (une seule fois)
 * - Récupère le token FCM
 * - L'envoie au backend pour l'associer à l'utilisateur connecté
 * - Écoute les messages reçus quand l'app est au premier plan
 */
'use client'
import { useEffect, useRef } from 'react'
import { requestFcmToken, onForegroundMessage } from './firebase'
import { usersApi } from './api'

const FCM_TOKEN_KEY = 'recov360_fcm_token'

export function usePushNotifications(enabled: boolean = true) {
  const registered = useRef(false)

  useEffect(() => {
    if (!enabled || registered.current) return
    if (typeof window === 'undefined') return

    registered.current = true

    const register = async () => {
      try {
        const cached = sessionStorage.getItem(FCM_TOKEN_KEY)

        const token = await requestFcmToken()
        if (!token) return

        // N'envoyer au backend que si le token a changé depuis cette session
        if (token === cached) return

        await usersApi.updateFcmToken(token)
        sessionStorage.setItem(FCM_TOKEN_KEY, token)
        console.debug('[FCM] Token enregistré:', token.slice(0, 20) + '...')
      } catch (err) {
        console.warn('[FCM] Erreur enregistrement:', err)
      }
    }

    // Petit délai pour ne pas bloquer le rendu initial
    const t = setTimeout(register, 3000)
    return () => clearTimeout(t)
  }, [enabled])

  // Écoute les messages au premier plan et les affiche comme toast natif
  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return

    const unsubscribe = onForegroundMessage(payload => {
      const title = payload.notification?.title || 'Recov360'
      const body  = payload.notification?.body  || ''

      // Affichage via l'API Notification native (si permission accordée)
      if (Notification.permission === 'granted') {
        new Notification(title, {
          body,
          icon: '/icon-192.png',
        })
      }
    })

    return unsubscribe
  }, [enabled])
}
