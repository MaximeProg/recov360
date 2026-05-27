'use client'
import { Suspense, useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { CheckCircle, XCircle, RefreshCw, Shield, Clock } from 'lucide-react'
import { subscriptionApi } from '@/lib/api'

const MAX_ATTEMPTS = 8
const RETRY_DELAY = 3000

/* ── Composant interne (utilise useSearchParams) ── */
function CallbackContent() {
  const router = useRouter()
  const params = useSearchParams()
  const [status, setStatus] = useState<'checking' | 'success' | 'failed' | 'pending'>('checking')
  const [attempts, setAttempts] = useState(0)
  const attemptRef = useRef(0)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const transactionId = sessionStorage.getItem('pending_transaction_id')
    const fedapayStatus = params.get('status') ?? params.get('fedapay_status')

    if (fedapayStatus === 'declined' || fedapayStatus === 'cancelled') {
      setStatus('failed')
      return
    }

    if (!transactionId) {
      verifyBySubscriptionCheck()
      return
    }

    verifyByTransactionId(transactionId)

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  async function verifyByTransactionId(transactionId: string) {
    if (attemptRef.current >= MAX_ATTEMPTS) { setStatus('pending'); return }
    attemptRef.current += 1
    setAttempts(attemptRef.current)

    try {
      const result = await subscriptionApi.verifyPayment(transactionId)
      if (result.subscription_active || result.fedapay_status === 'approved') {
        sessionStorage.removeItem('pending_transaction_id')
        setStatus('success')
        setTimeout(() => router.replace('/dashboard'), 2500)
      } else if (result.fedapay_status === 'declined' || result.fedapay_status === 'cancelled') {
        sessionStorage.removeItem('pending_transaction_id')
        setStatus('failed')
      } else {
        timerRef.current = setTimeout(() => verifyByTransactionId(transactionId), RETRY_DELAY)
      }
    } catch {
      timerRef.current = setTimeout(() => verifyByTransactionId(transactionId), RETRY_DELAY)
    }
  }

  async function verifyBySubscriptionCheck() {
    if (attemptRef.current >= MAX_ATTEMPTS) { setStatus('pending'); return }
    attemptRef.current += 1
    setAttempts(attemptRef.current)

    try {
      const data = await subscriptionApi.check()
      if (data.active) {
        setStatus('success')
        setTimeout(() => router.replace('/dashboard'), 2500)
      } else {
        timerRef.current = setTimeout(verifyBySubscriptionCheck, RETRY_DELAY)
      }
    } catch {
      setStatus('failed')
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--background)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
      <div style={{ textAlign: 'center', maxWidth: 480 }}>
        {/* Logo */}
        <div style={{ width: 56, height: 56, background: 'linear-gradient(135deg, #2563EB, #1D4ED8)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 2rem' }}>
          <Shield size={28} color="white" />
        </div>

        {status === 'checking' && (
          <>
            <div style={{ width: 72, height: 72, borderRadius: '50%', background: '#2563EB12', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.25rem' }}>
              <RefreshCw size={32} style={{ color: '#2563EB', animation: 'spin 1s linear infinite' }} />
            </div>
            <h2 style={{ margin: '0 0 0.5rem', fontWeight: 700, fontSize: '1.25rem', color: 'var(--foreground)' }}>
              Vérification du paiement…
            </h2>
            <p style={{ color: 'var(--foreground-muted)', fontSize: '0.9375rem', margin: '0 0 1rem' }}>
              Nous confirmons votre paiement directement avec FedaPay. Veuillez patienter.
            </p>
            {attempts > 1 && (
              <p style={{ fontSize: '0.8125rem', color: 'var(--foreground-subtle)' }}>
                Tentative {attempts}/{MAX_ATTEMPTS}…
              </p>
            )}
          </>
        )}

        {status === 'success' && (
          <>
            <div style={{ width: 72, height: 72, borderRadius: '50%', background: '#05966912', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.25rem' }}>
              <CheckCircle size={40} color="#059669" />
            </div>
            <h2 style={{ margin: '0 0 0.5rem', fontWeight: 700, fontSize: '1.25rem', color: 'var(--foreground)' }}>
              Abonnement activé ! 🎉
            </h2>
            <p style={{ color: 'var(--foreground-muted)', fontSize: '0.9375rem' }}>
              Bienvenue sur Recov360. Vous allez être redirigé vers votre tableau de bord dans quelques secondes.
            </p>
          </>
        )}

        {status === 'failed' && (
          <>
            <div style={{ width: 72, height: 72, borderRadius: '50%', background: '#DC262612', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.25rem' }}>
              <XCircle size={40} color="#DC2626" />
            </div>
            <h2 style={{ margin: '0 0 0.5rem', fontWeight: 700, fontSize: '1.25rem', color: 'var(--foreground)' }}>
              Paiement non abouti
            </h2>
            <p style={{ color: 'var(--foreground-muted)', fontSize: '0.9375rem', marginBottom: '1.5rem' }}>
              Le paiement a été annulé ou refusé. Vous pouvez réessayer avec un autre moyen de paiement.
            </p>
            <button
              onClick={() => router.push('/subscribe')}
              style={{ padding: '0.75rem 1.75rem', background: '#2563EB', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '0.9375rem' }}
            >
              Choisir un plan
            </button>
          </>
        )}

        {status === 'pending' && (
          <>
            <div style={{ width: 72, height: 72, borderRadius: '50%', background: '#D9770612', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.25rem' }}>
              <Clock size={40} color="#D97706" />
            </div>
            <h2 style={{ margin: '0 0 0.5rem', fontWeight: 700, fontSize: '1.25rem', color: 'var(--foreground)' }}>
              Paiement en cours de traitement
            </h2>
            <p style={{ color: 'var(--foreground-muted)', fontSize: '0.9375rem', marginBottom: '1.5rem' }}>
              Votre paiement est en cours de validation. Il peut prendre quelques minutes à être confirmé.
              Vous pouvez accéder à votre espace dès que le paiement est confirmé.
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
              <button
                onClick={() => {
                  setStatus('checking')
                  attemptRef.current = 0
                  const id = sessionStorage.getItem('pending_transaction_id')
                  if (id) verifyByTransactionId(id); else verifyBySubscriptionCheck()
                }}
                style={{ padding: '0.75rem 1.25rem', background: '#2563EB', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '0.875rem' }}
              >
                Vérifier à nouveau
              </button>
              <button
                onClick={() => router.push('/dashboard')}
                style={{ padding: '0.75rem 1.25rem', background: 'transparent', color: 'var(--foreground-muted)', border: '1px solid var(--border)', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '0.875rem' }}
              >
                Aller au tableau de bord
              </button>
            </div>
          </>
        )}

        <div style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', color: 'var(--foreground-subtle)', fontSize: '0.8125rem' }}>
          <Shield size={13} />
          Vérification sécurisée via FedaPay — aucune donnée bancaire stockée
        </div>
      </div>
    </div>
  )
}

/* ── Fallback affiché pendant le chargement ── */
function CallbackFallback() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--background)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 56, height: 56, background: 'linear-gradient(135deg, #2563EB, #1D4ED8)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
          <Shield size={28} color="white" />
        </div>
        <RefreshCw size={28} style={{ color: '#2563EB', animation: 'spin 1s linear infinite' }} />
        <p style={{ marginTop: '1rem', color: 'var(--foreground-muted)', fontSize: '0.9375rem' }}>Chargement…</p>
      </div>
    </div>
  )
}

/* ── Export page — Suspense obligatoire pour useSearchParams ── */
export default function CallbackPage() {
  return (
    <Suspense fallback={<CallbackFallback />}>
      <CallbackContent />
    </Suspense>
  )
}
