'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, LogIn, Mail, Lock } from 'lucide-react'
import { useAuth } from '@/contexts/auth'
import { useToast } from '@/contexts/toast'

export default function LoginPage() {
  const router = useRouter()
  const { login } = useAuth()
  const toast = useToast()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPwd, setShowPwd] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const errs: Record<string, string> = {}
    if (!email) errs.email = 'Email requis'
    if (!password) errs.password = 'Mot de passe requis'
    if (Object.keys(errs).length) { setErrors(errs); return }
    setErrors({})
    setLoading(true)
    try {
      await login(email, password)
      router.push('/dashboard')
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? 'Identifiants incorrects'
      toast('error', 'Connexion échouée', msg)
    } finally { setLoading(false) }
  }

  return (
    <div style={{ width: '100%', maxWidth: 400, animation: 'fadeIn 0.3s ease' }}>
      {/* Card */}
      <div className="card" style={{ padding: '2rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--foreground)', marginBottom: '0.375rem' }}>
            Bon retour 👋
          </h1>
          <p style={{ color: 'var(--foreground-muted)', fontSize: '0.875rem' }}>
            Connectez-vous à votre espace Recov360
          </p>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {/* Email */}
            <div className="form-group">
              <label className="form-label">Email</label>
              <div style={{ position: 'relative' }}>
                <Mail size={15} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--foreground-subtle)', pointerEvents: 'none' }} />
                <input
                  type="email"
                  className="input-base"
                  style={{ paddingLeft: '2rem', ...(errors.email ? { borderColor: 'var(--status-late)' } : {}) }}
                  placeholder="vous@entreprise.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  autoComplete="email"
                />
              </div>
              {errors.email && <span className="form-error">{errors.email}</span>}
            </div>

            {/* Password */}
            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label className="form-label">Mot de passe</label>
                <Link href="/forgot-password" style={{ fontSize: '0.75rem', color: 'var(--primary)', textDecoration: 'none' }}>
                  Mot de passe oublié ?
                </Link>
              </div>
              <div style={{ position: 'relative' }}>
                <Lock size={15} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--foreground-subtle)', pointerEvents: 'none' }} />
                <input
                  type={showPwd ? 'text' : 'password'}
                  className="input-base"
                  style={{ paddingLeft: '2rem', paddingRight: '2.5rem', ...(errors.password ? { borderColor: 'var(--status-late)' } : {}) }}
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(!showPwd)}
                  style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--foreground-subtle)', background: 'none', border: 'none', cursor: 'pointer' }}
                >
                  {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              {errors.password && <span className="form-error">{errors.password}</span>}
            </div>

            <button
              type="submit"
              className="btn-primary"
              disabled={loading}
              style={{ width: '100%', justifyContent: 'center', padding: '0.7rem', marginTop: '0.5rem' }}
            >
              {loading ? (
                <span className="animate-spin" style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', display: 'inline-block' }} />
              ) : (
                <><LogIn size={16} /> Se connecter</>
              )}
            </button>
          </div>
        </form>

        <div style={{ textAlign: 'center', marginTop: '1.25rem', fontSize: '0.875rem', color: 'var(--foreground-muted)' }}>
          Pas encore de compte ?{' '}
          <Link href="/register" style={{ color: 'var(--primary)', fontWeight: 500, textDecoration: 'none' }}>
            Créer un compte
          </Link>
        </div>
      </div>
    </div>
  )
}
