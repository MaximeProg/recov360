'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Shield, Eye, EyeOff, LogIn, Mail, Lock, AlertTriangle } from 'lucide-react'
import { superAdminApi, saTokens } from '@/lib/api'

const BLUE      = '#2563EB'
const BLUE_DARK = '#1D4ED8'

export default function SuperAdminLoginPage() {
  const router = useRouter()
  const [email, setEmail]             = useState('')
  const [password, setPassword]       = useState('')
  const [showPwd, setShowPwd]         = useState(false)
  const [loading, setLoading]         = useState(false)
  const [error, setError]             = useState('')
  const [checkingSession, setCheckingSession] = useState(true)

  useEffect(() => {
    if (!saTokens.access) { setCheckingSession(false); return }
    superAdminApi.stats()
      .then(() => router.replace('/recov-super-admin-panel'))
      .catch(() => { saTokens.clear(); setCheckingSession(false) })
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email || !password) { setError('Email et mot de passe requis'); return }
    setError('')
    setLoading(true)
    try {
      await superAdminApi.login(email, password)
      try {
        await superAdminApi.stats()
      } catch {
        saTokens.clear()
        setError("Accès refusé. Ce compte n'est pas autorisé à accéder à l'espace opérateur.")
        return
      }
      router.replace('/recov-super-admin-panel')
    } catch (err: unknown) {
      saTokens.clear()
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      setError(msg ?? 'Email ou mot de passe incorrect')
    } finally {
      setLoading(false)
    }
  }

  if (checkingSession) {
    return (
      <div style={{ minHeight: '100vh', background: '#050E1A', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <Shield size={32} color={BLUE} />
          <div style={{ marginTop: 12, color: '#64748B', fontSize: '0.875rem' }}>Vérification…</div>
        </div>
      </div>
    )
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #050E1A 0%, #0F172A 50%, #0A0F1A 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '1.5rem',
    }}>
      {/* Fond décoratif bleu */}
      <div style={{ position: 'fixed', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 0 }}>
        <div style={{ position: 'absolute', top: '-20%', left: '-10%', width: 600, height: 600, borderRadius: '50%', background: 'radial-gradient(circle, rgba(37,99,235,0.07) 0%, transparent 70%)' }} />
        <div style={{ position: 'absolute', bottom: '-20%', right: '-10%', width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle, rgba(37,99,235,0.05) 0%, transparent 70%)' }} />
      </div>

      <div style={{ width: '100%', maxWidth: 420, position: 'relative', zIndex: 1 }}>
        {/* Logo + titre */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{
            width: 64, height: 64,
            background: `linear-gradient(135deg, ${BLUE}, ${BLUE_DARK})`,
            borderRadius: '16px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 1rem',
            boxShadow: 'rgba(37,99,235,0.4) 0 8px 32px',
          }}>
            <Shield size={32} color="white" />
          </div>
          <h1 style={{ color: 'white', fontWeight: 800, fontSize: '1.5rem', margin: '0 0 0.375rem' }}>
            Recov360
          </h1>
          <div style={{
            display: 'inline-block',
            padding: '0.25rem 0.875rem',
            background: 'rgba(37,99,235,0.15)',
            border: '1px solid rgba(37,99,235,0.3)',
            borderRadius: '20px',
            color: '#93C5FD',
            fontSize: '0.75rem',
            fontWeight: 700,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
          }}>
            Espace Opérateur — Accès restreint
          </div>
        </div>

        {/* Card */}
        <div style={{
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(37,99,235,0.15)',
          borderRadius: '16px',
          padding: '2rem',
          backdropFilter: 'blur(12px)',
        }}>
          <h2 style={{ color: 'white', fontWeight: 700, fontSize: '1.125rem', margin: '0 0 0.375rem' }}>
            Connexion administrateur
          </h2>
          <p style={{ color: '#64748B', fontSize: '0.875rem', margin: '0 0 1.75rem' }}>
            Réservé aux opérateurs de la plateforme Recov360.
          </p>

          <form onSubmit={handleSubmit} noValidate>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* Email */}
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#94A3B8', marginBottom: '0.375rem' }}>
                  Email
                </label>
                <div style={{ position: 'relative' }}>
                  <Mail size={15} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#475569', pointerEvents: 'none' }} />
                  <input
                    type="email" value={email} onChange={e => setEmail(e.target.value)}
                    placeholder="admin@recov360.com" autoComplete="email"
                    style={{
                      width: '100%', paddingLeft: '2.25rem', paddingRight: '0.875rem',
                      height: 42, background: 'rgba(255,255,255,0.05)',
                      border: `1px solid ${error ? 'rgba(239,68,68,0.5)' : 'rgba(255,255,255,0.08)'}`,
                      borderRadius: '8px', color: 'white', fontSize: '0.9375rem',
                      outline: 'none', boxSizing: 'border-box',
                    }}
                  />
                </div>
              </div>

              {/* Mot de passe */}
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#94A3B8', marginBottom: '0.375rem' }}>
                  Mot de passe
                </label>
                <div style={{ position: 'relative' }}>
                  <Lock size={15} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#475569', pointerEvents: 'none' }} />
                  <input
                    type={showPwd ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••" autoComplete="current-password"
                    style={{
                      width: '100%', paddingLeft: '2.25rem', paddingRight: '2.75rem',
                      height: 42, background: 'rgba(255,255,255,0.05)',
                      border: `1px solid ${error ? 'rgba(239,68,68,0.5)' : 'rgba(255,255,255,0.08)'}`,
                      borderRadius: '8px', color: 'white', fontSize: '0.9375rem',
                      outline: 'none', boxSizing: 'border-box',
                    }}
                  />
                  <button type="button" onClick={() => setShowPwd(v => !v)}
                    style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#475569', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                    {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              {/* Erreur */}
              {error && (
                <div style={{
                  display: 'flex', alignItems: 'flex-start', gap: '0.5rem',
                  padding: '0.75rem', borderRadius: '8px',
                  background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)',
                  color: '#FCA5A5', fontSize: '0.8125rem',
                }}>
                  <AlertTriangle size={15} style={{ flexShrink: 0, marginTop: 1 }} />
                  {error}
                </div>
              )}

              {/* Bouton connexion */}
              <button
                type="submit" disabled={loading}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                  width: '100%', height: 44, marginTop: '0.25rem',
                  background: loading ? 'rgba(37,99,235,0.5)' : `linear-gradient(135deg, ${BLUE}, ${BLUE_DARK})`,
                  color: 'white', border: 'none', borderRadius: '8px',
                  fontWeight: 700, fontSize: '0.9375rem', cursor: loading ? 'wait' : 'pointer',
                  boxShadow: 'rgba(37,99,235,0.3) 0 4px 16px',
                  transition: 'all 0.2s',
                }}
              >
                {loading
                  ? <span style={{ width: 18, height: 18, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.8s linear infinite' }} />
                  : <><LogIn size={17} /> Accéder à l'espace opérateur</>
                }
              </button>
            </div>
          </form>
        </div>

        <div style={{ textAlign: 'center', marginTop: '1.5rem', color: '#334155', fontSize: '0.8rem' }}>
          🔒 Accès autorisé uniquement aux administrateurs de la plateforme.<br />
          Toutes les tentatives de connexion sont enregistrées.
        </div>
        <div style={{ textAlign: 'center', marginTop: '1rem' }}>
          <a href="/" style={{ color: '#475569', fontSize: '0.8125rem', textDecoration: 'none' }}>
            ← Retour au site public
          </a>
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        input::placeholder { color: #334155; }
        input:focus { border-color: rgba(37,99,235,0.6) !important; outline: none; }
      `}</style>
    </div>
  )
}
