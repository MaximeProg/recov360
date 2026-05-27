'use client'
import { useState } from 'react'
import { Mail, ArrowLeft, CheckCircle } from 'lucide-react'
import Link from 'next/link'
import { authApi } from '@/lib/api'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email) { setError('Email requis'); return }
    setLoading(true)
    setError('')
    try {
      await authApi.forgotPassword(email)
      setSent(true)
    } catch {
      setError('Une erreur est survenue. Vérifiez votre adresse email.')
    } finally {
      setLoading(false)
    }
  }

  if (sent) {
    return (
      <div style={{ textAlign: 'center', padding: '2rem' }}>
        <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--status-paid-bg, #D1FAE5)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.25rem' }}>
          <CheckCircle size={32} style={{ color: 'var(--status-paid)' }} />
        </div>
        <h2 style={{ margin: '0 0 0.5rem', fontSize: '1.25rem', fontWeight: 700, color: 'var(--foreground)' }}>Email envoyé</h2>
        <p style={{ margin: '0 0 1.5rem', fontSize: '0.9375rem', color: 'var(--foreground-muted)', lineHeight: 1.6 }}>
          Si un compte existe pour <strong>{email}</strong>, vous recevrez un lien de réinitialisation dans quelques minutes.
        </p>
        <Link href="/login" className="btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none' }}>
          <ArrowLeft size={15} /> Retour à la connexion
        </Link>
      </div>
    )
  }

  return (
    <div>
      <div style={{ marginBottom: '1.75rem' }}>
        <h2 style={{ margin: '0 0 0.375rem', fontSize: '1.5rem', fontWeight: 700, color: 'var(--foreground)' }}>Mot de passe oublié</h2>
        <p style={{ margin: 0, fontSize: '0.9375rem', color: 'var(--foreground-muted)' }}>
          Entrez votre adresse email pour recevoir un lien de réinitialisation.
        </p>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.125rem' }}>
        <div className="form-group">
          <label className="form-label">Adresse email</label>
          <div style={{ position: 'relative' }}>
            <Mail size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--foreground-muted)' }} />
            <input
              className="input-base"
              type="email"
              placeholder="vous@societe.ci"
              value={email}
              onChange={e => { setEmail(e.target.value); setError('') }}
              style={{ paddingLeft: '2.25rem', ...(error ? { borderColor: 'var(--status-late)' } : {}) }}
              autoFocus
            />
          </div>
          {error && <span className="form-error">{error}</span>}
        </div>

        <button type="submit" className="btn-primary" disabled={loading} style={{ width: '100%', justifyContent: 'center', padding: '0.75rem' }}>
          {loading
            ? <span className="animate-spin" style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', display: 'inline-block' }} />
            : 'Envoyer le lien'}
        </button>

        <div style={{ textAlign: 'center' }}>
          <Link href="/login" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.875rem', color: 'var(--primary)', textDecoration: 'none' }}>
            <ArrowLeft size={14} /> Retour à la connexion
          </Link>
        </div>
      </form>
    </div>
  )
}
