'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Building2, User, Mail, Lock, Eye, EyeOff, ChevronRight, ChevronLeft, Check } from 'lucide-react'
import { authApi } from '@/lib/api'
import { tokens } from '@/lib/api'
import { useToast } from '@/contexts/toast'

const steps = ['Entreprise', 'Responsable', 'Confirmation']

export default function RegisterPage() {
  const router = useRouter()
  const toast = useToast()
  const [step, setStep] = useState(0)
  const [loading, setLoading] = useState(false)
  const [showPwd, setShowPwd] = useState(false)
  const [form, setForm] = useState({
    company_name: '', company_email: '',
    first_name: '', last_name: '', email: '', password: '', confirm_password: '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  function set(key: string, val: string) {
    setForm(f => ({ ...f, [key]: val }))
    setErrors(e => ({ ...e, [key]: '' }))
  }

  function validateStep() {
    const errs: Record<string, string> = {}
    if (step === 0) {
      if (!form.company_name.trim()) errs.company_name = 'Nom de l\'entreprise requis'
      if (!form.company_email.trim()) errs.company_email = 'Email entreprise requis'
      else if (!/\S+@\S+\.\S+/.test(form.company_email)) errs.company_email = 'Email invalide'
    }
    if (step === 1) {
      if (!form.first_name.trim()) errs.first_name = 'Prénom requis'
      if (!form.last_name.trim()) errs.last_name = 'Nom requis'
      if (!form.email.trim()) errs.email = 'Email requis'
      else if (!/\S+@\S+\.\S+/.test(form.email)) errs.email = 'Email invalide'
      if (!form.password) errs.password = 'Mot de passe requis'
      else if (form.password.length < 8) errs.password = 'Minimum 8 caractères'
      if (form.password !== form.confirm_password) errs.confirm_password = 'Les mots de passe ne correspondent pas'
    }
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  function next() { if (validateStep()) setStep(s => s + 1) }
  function prev() { setStep(s => s - 1) }

  async function handleSubmit() {
    setLoading(true)
    try {
      const data = await authApi.register({
        company_name: form.company_name,
        company_email: form.company_email,
        first_name: form.first_name,
        last_name: form.last_name,
        email: form.email,
        password: form.password,
      })
      tokens.set(data.access_token, data.refresh_token)
      toast('success', 'Compte créé !', 'Bienvenue sur Recov360')
      router.push('/dashboard')
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? 'Erreur lors de la création'
      toast('error', 'Erreur', msg)
    } finally { setLoading(false) }
  }

  const inputStyle = (key: string) => ({
    ...(errors[key] ? { borderColor: 'var(--status-late)' } : {}),
  })

  return (
    <div style={{ width: '100%', maxWidth: 480, animation: 'fadeIn 0.3s ease' }}>
      <div className="card" style={{ padding: '2rem' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--foreground)', marginBottom: '0.375rem' }}>
            Créer votre compte
          </h1>
          <p style={{ color: 'var(--foreground-muted)', fontSize: '0.875rem' }}>
            Démarrez votre recouvrement automatisé en 3 étapes
          </p>
        </div>

        {/* Stepper */}
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1.75rem', gap: '0.25rem' }}>
          {steps.map((label, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', flex: i < steps.length - 1 ? 1 : 'none' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem', flexShrink: 0 }}>
                <div style={{
                  width: 28, height: 28, borderRadius: '50%',
                  background: i < step ? 'var(--status-paid)' : i === step ? 'var(--primary)' : 'var(--border)',
                  color: i <= step ? 'white' : 'var(--foreground-muted)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '0.75rem', fontWeight: 700, transition: 'all 0.3s',
                }}>
                  {i < step ? <Check size={14} /> : i + 1}
                </div>
                <span style={{ fontSize: '0.65rem', color: i === step ? 'var(--primary)' : 'var(--foreground-muted)', fontWeight: i === step ? 600 : 400, whiteSpace: 'nowrap' }}>
                  {label}
                </span>
              </div>
              {i < steps.length - 1 && (
                <div style={{ flex: 1, height: 1.5, background: i < step ? 'var(--status-paid)' : 'var(--border)', margin: '0 0.375rem', marginBottom: '1rem', transition: 'background 0.3s' }} />
              )}
            </div>
          ))}
        </div>

        {/* Step 0: Company */}
        {step === 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', animation: 'slideIn 0.2s ease' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem', background: 'var(--primary-muted)', borderRadius: 'var(--radius)', marginBottom: '0.25rem' }}>
              <Building2 size={16} style={{ color: 'var(--primary)', flexShrink: 0 }} />
              <span style={{ fontSize: '0.8125rem', color: 'var(--primary)', fontWeight: 500 }}>Informations de votre entreprise</span>
            </div>
            <div className="form-group">
              <label className="form-label">Nom de l'entreprise *</label>
              <input className="input-base" style={inputStyle('company_name')} placeholder="Ma Société SARL" value={form.company_name} onChange={e => set('company_name', e.target.value)} />
              {errors.company_name && <span className="form-error">{errors.company_name}</span>}
            </div>
            <div className="form-group">
              <label className="form-label">Email professionnel *</label>
              <input className="input-base" type="email" style={inputStyle('company_email')} placeholder="contact@masociete.ci" value={form.company_email} onChange={e => set('company_email', e.target.value)} />
              {errors.company_email && <span className="form-error">{errors.company_email}</span>}
            </div>
          </div>
        )}

        {/* Step 1: Admin user */}
        {step === 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', animation: 'slideIn 0.2s ease' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem', background: 'var(--primary-muted)', borderRadius: 'var(--radius)', marginBottom: '0.25rem' }}>
              <User size={16} style={{ color: 'var(--primary)', flexShrink: 0 }} />
              <span style={{ fontSize: '0.8125rem', color: 'var(--primary)', fontWeight: 500 }}>Compte administrateur</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Prénom *</label>
                <input className="input-base" style={inputStyle('first_name')} placeholder="Kouamé" value={form.first_name} onChange={e => set('first_name', e.target.value)} />
                {errors.first_name && <span className="form-error">{errors.first_name}</span>}
              </div>
              <div className="form-group">
                <label className="form-label">Nom *</label>
                <input className="input-base" style={inputStyle('last_name')} placeholder="Konan" value={form.last_name} onChange={e => set('last_name', e.target.value)} />
                {errors.last_name && <span className="form-error">{errors.last_name}</span>}
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Email de connexion *</label>
              <input className="input-base" type="email" style={inputStyle('email')} placeholder="admin@masociete.ci" value={form.email} onChange={e => set('email', e.target.value)} />
              {errors.email && <span className="form-error">{errors.email}</span>}
            </div>
            <div className="form-group">
              <label className="form-label">Mot de passe *</label>
              <div style={{ position: 'relative' }}>
                <input className="input-base" type={showPwd ? 'text' : 'password'} style={{ ...inputStyle('password'), paddingRight: '2.5rem' }} placeholder="Minimum 8 caractères" value={form.password} onChange={e => set('password', e.target.value)} />
                <button type="button" onClick={() => setShowPwd(!showPwd)} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--foreground-subtle)', background: 'none', border: 'none', cursor: 'pointer' }}>
                  {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              {errors.password && <span className="form-error">{errors.password}</span>}
            </div>
            <div className="form-group">
              <label className="form-label">Confirmer le mot de passe *</label>
              <input className="input-base" type={showPwd ? 'text' : 'password'} style={inputStyle('confirm_password')} placeholder="••••••••" value={form.confirm_password} onChange={e => set('confirm_password', e.target.value)} />
              {errors.confirm_password && <span className="form-error">{errors.confirm_password}</span>}
            </div>
          </div>
        )}

        {/* Step 2: Summary */}
        {step === 2 && (
          <div style={{ animation: 'slideIn 0.2s ease' }}>
            <div style={{ background: 'var(--border-muted)', borderRadius: 'var(--radius-lg)', padding: '1.25rem', marginBottom: '1rem' }}>
              <h3 style={{ margin: '0 0 0.875rem', fontSize: '0.875rem', fontWeight: 600, color: 'var(--foreground)' }}>Récapitulatif</h3>
              {[
                { label: 'Entreprise', value: form.company_name },
                { label: 'Email entreprise', value: form.company_email },
                { label: 'Administrateur', value: `${form.first_name} ${form.last_name}` },
                { label: 'Email admin', value: form.email },
              ].map(r => (
                <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.875rem' }}>
                  <span style={{ color: 'var(--foreground-muted)' }}>{r.label}</span>
                  <span style={{ fontWeight: 500, color: 'var(--foreground)' }}>{r.value}</span>
                </div>
              ))}
            </div>
            <p style={{ fontSize: '0.8125rem', color: 'var(--foreground-muted)', textAlign: 'center' }}>
              En créant votre compte, vous acceptez nos conditions d'utilisation.
            </p>
          </div>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
          {step > 0 && (
            <button className="btn-secondary" onClick={prev} style={{ flex: 1, justifyContent: 'center' }}>
              <ChevronLeft size={16} /> Retour
            </button>
          )}
          {step < 2 ? (
            <button className="btn-primary" onClick={next} style={{ flex: 1, justifyContent: 'center' }}>
              Suivant <ChevronRight size={16} />
            </button>
          ) : (
            <button className="btn-primary" onClick={handleSubmit} disabled={loading} style={{ flex: 1, justifyContent: 'center' }}>
              {loading ? <span className="animate-spin" style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', display: 'inline-block' }} /> : <><Check size={16} /> Créer mon compte</>}
            </button>
          )}
        </div>

        <div style={{ textAlign: 'center', marginTop: '1rem', fontSize: '0.875rem', color: 'var(--foreground-muted)' }}>
          Déjà un compte ?{' '}
          <Link href="/login" style={{ color: 'var(--primary)', fontWeight: 500, textDecoration: 'none' }}>Se connecter</Link>
        </div>
      </div>
    </div>
  )
}
