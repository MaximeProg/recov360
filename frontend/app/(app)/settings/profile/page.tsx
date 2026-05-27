'use client'
import { useState } from 'react'
import { Save, Lock, User } from 'lucide-react'
import PageHeader from '@/components/ui/PageHeader'
import { authApi } from '@/lib/api'
import { useAuth } from '@/contexts/auth'
import { useToast } from '@/contexts/toast'
import { getInitials, roleLabel } from '@/lib/utils'

export default function ProfilePage() {
  const { user } = useAuth()
  const toast = useToast()
  const [pwdForm, setPwdForm] = useState({ current: '', newPwd: '', confirm: '' })
  const [pwdErrors, setPwdErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  async function changePassword(e: React.FormEvent) {
    e.preventDefault()
    const errs: Record<string, string> = {}
    if (!pwdForm.current) errs.current = 'Requis'
    if (!pwdForm.newPwd || pwdForm.newPwd.length < 8) errs.newPwd = 'Minimum 8 caractères'
    if (pwdForm.newPwd !== pwdForm.confirm) errs.confirm = 'Ne correspond pas'
    if (Object.keys(errs).length) { setPwdErrors(errs); return }
    setSaving(true)
    try {
      await authApi.changePassword(pwdForm.current, pwdForm.newPwd)
      toast('success', 'Mot de passe modifié')
      setPwdForm({ current: '', newPwd: '', confirm: '' })
      setPwdErrors({})
    } catch { toast('error', 'Erreur', 'Mot de passe actuel incorrect') }
    finally { setSaving(false) }
  }

  if (!user) return null

  return (
    <div className="animate-fadeIn" style={{ maxWidth: 640, margin: '0 auto' }}>
      <PageHeader
        title="Mon profil"
        subtitle="Informations de votre compte"
        breadcrumbs={[{ label: 'Paramètres', href: '/settings' }, { label: 'Profil' }]}
      />

      {/* Identity card */}
      <div className="card" style={{ padding: '1.75rem', marginBottom: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', marginBottom: '1.5rem' }}>
          <div style={{
            width: 64, height: 64, borderRadius: '50%',
            background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '1.25rem', fontWeight: 700, color: 'white', flexShrink: 0,
          }}>
            {getInitials(`${user.first_name} ${user.last_name}`)}
          </div>
          <div>
            <div style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--foreground)' }}>
              {user.first_name} {user.last_name}
            </div>
            <div style={{ fontSize: '0.875rem', color: 'var(--foreground-muted)', marginTop: '0.125rem' }}>
              {user.email}
            </div>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.375rem', fontSize: '0.75rem', fontWeight: 600, padding: '0.2rem 0.625rem', borderRadius: '999px', background: 'var(--primary-muted)', color: 'var(--primary)' }}>
              <User size={11} /> {roleLabel(user.role)}
            </span>
          </div>
        </div>
        <div style={{ display: 'grid', gap: '0.625rem' }}>
          {[
            { label: 'Email', value: user.email },
            { label: 'Prénom', value: user.first_name },
            { label: 'Nom', value: user.last_name },
            { label: 'Rôle', value: roleLabel(user.role) },
          ].map(r => (
            <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid var(--border-muted)', fontSize: '0.875rem' }}>
              <span style={{ color: 'var(--foreground-muted)' }}>{r.label}</span>
              <span style={{ fontWeight: 500, color: 'var(--foreground)' }}>{r.value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Change password */}
      <div className="card" style={{ padding: '1.75rem' }}>
        <h3 style={{ margin: '0 0 1.25rem', fontSize: '1rem', fontWeight: 600, color: 'var(--foreground)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Lock size={16} /> Changer le mot de passe
        </h3>
        <form onSubmit={changePassword} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="form-group">
            <label className="form-label">Mot de passe actuel</label>
            <input className="input-base" type="password" style={pwdErrors.current ? { borderColor: 'var(--status-late)' } : {}} value={pwdForm.current} onChange={e => setPwdForm(f => ({ ...f, current: e.target.value }))} />
            {pwdErrors.current && <span className="form-error">{pwdErrors.current}</span>}
          </div>
          <div className="form-group">
            <label className="form-label">Nouveau mot de passe</label>
            <input className="input-base" type="password" style={pwdErrors.newPwd ? { borderColor: 'var(--status-late)' } : {}} value={pwdForm.newPwd} onChange={e => setPwdForm(f => ({ ...f, newPwd: e.target.value }))} />
            {pwdErrors.newPwd && <span className="form-error">{pwdErrors.newPwd}</span>}
          </div>
          <div className="form-group">
            <label className="form-label">Confirmer le nouveau mot de passe</label>
            <input className="input-base" type="password" style={pwdErrors.confirm ? { borderColor: 'var(--status-late)' } : {}} value={pwdForm.confirm} onChange={e => setPwdForm(f => ({ ...f, confirm: e.target.value }))} />
            {pwdErrors.confirm && <span className="form-error">{pwdErrors.confirm}</span>}
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving
                ? <span className="animate-spin" style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', display: 'inline-block' }} />
                : <Save size={15} />}
              Enregistrer
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
