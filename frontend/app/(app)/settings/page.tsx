'use client'
import { useEffect, useState } from 'react'
import { Save, Building2, Palette, Lock, Upload } from 'lucide-react'
import PageHeader from '@/components/ui/PageHeader'
import { companyApi, authApi } from '@/lib/api'
import { useAuth } from '@/contexts/auth'
import { useToast } from '@/contexts/toast'
import type { Company } from '@/types'

type Tab = 'company' | 'branding' | 'security'

export default function SettingsPage() {
  const toast = useToast()
  const { user } = useAuth()
  const [tab, setTab] = useState<Tab>('company')
  const [company, setCompany] = useState<Partial<Company>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [pwdForm, setPwdForm] = useState({ current: '', newPwd: '', confirm: '' })
  const [pwdErrors, setPwdErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    companyApi.get().then(setCompany).catch(() => {}).finally(() => setLoading(false))
  }, [])

  async function saveCompany(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      await companyApi.update({
        name: company.name, phone: company.phone, city: company.city,
        address: company.address, sector: company.sector,
        primary_color: company.primary_color,
        secondary_color: company.secondary_color,
        signature: company.signature,
      })
      toast('success', 'Paramètres sauvegardés')
    } catch { toast('error', 'Erreur', 'Impossible de sauvegarder') }
    finally { setSaving(false) }
  }

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

  const inp = (val: string, onChange: (v: string) => void, err?: string) => (
    <div className="form-group" style={{ marginBottom: 0 }}>
      <input className="input-base" value={val} onChange={e => onChange(e.target.value)} style={err ? { borderColor: 'var(--status-late)' } : {}} />
      {err && <span className="form-error">{err}</span>}
    </div>
  )

  return (
    <div className="animate-fadeIn" style={{ maxWidth: 720, margin: '0 auto' }}>
      <PageHeader title="Paramètres" subtitle="Configuration de votre espace Recov360" />

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.25rem', background: 'var(--border-muted)', borderRadius: 'var(--radius)', padding: '0.25rem', width: 'fit-content', marginBottom: '1.5rem' }}>
        {([['company', 'Entreprise', Building2], ['branding', 'Apparence', Palette], ['security', 'Sécurité', Lock]] as const).map(([t, label, Icon]) => (
          <button key={t} className={`tab-trigger${tab === t ? ' active' : ''}`} onClick={() => setTab(t)} style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
            <Icon size={14} /> {label}
          </button>
        ))}
      </div>

      {/* Company tab */}
      {tab === 'company' && (
        <div className="card" style={{ padding: '1.75rem' }}>
          <h3 style={{ margin: '0 0 1.25rem', fontSize: '1rem', fontWeight: 600, color: 'var(--foreground)' }}>Informations de l'entreprise</h3>
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {[...Array(5)].map((_, i) => <div key={i} className="skeleton" style={{ height: 40, borderRadius: 'var(--radius)' }} />)}
            </div>
          ) : (
            <form onSubmit={saveCompany} style={{ display: 'flex', flexDirection: 'column', gap: '1.125rem' }}>
              <div className="form-group">
                <label className="form-label">Nom de l'entreprise</label>
                <input className="input-base" value={company.name ?? ''} onChange={e => setCompany(c => ({ ...c, name: e.target.value }))} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.875rem' }}>
                <div className="form-group">
                  <label className="form-label">Téléphone</label>
                  <input className="input-base" value={company.phone ?? ''} onChange={e => setCompany(c => ({ ...c, phone: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Ville</label>
                  <input className="input-base" value={company.city ?? ''} onChange={e => setCompany(c => ({ ...c, city: e.target.value }))} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Adresse</label>
                <input className="input-base" value={company.address ?? ''} onChange={e => setCompany(c => ({ ...c, address: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Secteur d'activité</label>
                <input className="input-base" placeholder="Pharmacie, Distribution, BTP…" value={company.sector ?? ''} onChange={e => setCompany(c => ({ ...c, sector: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Plan actuel</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span className="badge" style={{ background: 'var(--primary-muted)', color: 'var(--primary)', fontSize: '0.875rem', padding: '0.35rem 0.875rem' }}>
                    {company.plan ?? 'starter'}
                  </span>
                  <span style={{ fontSize: '0.8125rem', color: 'var(--foreground-muted)' }}>Contactez le support pour changer de plan</span>
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                <button type="submit" className="btn-primary" disabled={saving}>
                  {saving ? <span className="animate-spin" style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', display: 'inline-block' }} /> : <Save size={15} />}
                  Sauvegarder
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* Branding tab */}
      {tab === 'branding' && (
        <div className="card" style={{ padding: '1.75rem' }}>
          <h3 style={{ margin: '0 0 1.25rem', fontSize: '1rem', fontWeight: 600, color: 'var(--foreground)' }}>Personnalisation visuelle</h3>
          <form onSubmit={saveCompany} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.875rem' }}>
              <div className="form-group">
                <label className="form-label">Couleur principale</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <input type="color" value={company.primary_color ?? '#2563EB'} onChange={e => setCompany(c => ({ ...c, primary_color: e.target.value }))} style={{ width: 40, height: 36, border: 'none', background: 'none', cursor: 'pointer', borderRadius: 4 }} />
                  <input className="input-base" style={{ flex: 1 }} value={company.primary_color ?? '#2563EB'} onChange={e => setCompany(c => ({ ...c, primary_color: e.target.value }))} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Couleur secondaire</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <input type="color" value={company.secondary_color ?? '#1E40AF'} onChange={e => setCompany(c => ({ ...c, secondary_color: e.target.value }))} style={{ width: 40, height: 36, border: 'none', background: 'none', cursor: 'pointer', borderRadius: 4 }} />
                  <input className="input-base" style={{ flex: 1 }} value={company.secondary_color ?? '#1E40AF'} onChange={e => setCompany(c => ({ ...c, secondary_color: e.target.value }))} />
                </div>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Signature email</label>
              <textarea className="input-base" rows={4} placeholder="Cordialement, l'équipe Recouvrement de Ma Société" value={company.signature ?? ''} onChange={e => setCompany(c => ({ ...c, signature: e.target.value }))} style={{ resize: 'vertical' }} />
            </div>
            <div className="form-group">
              <label className="form-label">Logo de l'entreprise</label>
              {company.logo_url && (
                <img src={company.logo_url} alt="Logo" style={{ height: 60, objectFit: 'contain', marginBottom: '0.5rem', background: 'var(--border-muted)', padding: 8, borderRadius: 8 }} />
              )}
              <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem', cursor: 'pointer' }} className="btn-secondary">
                <Upload size={14} /> Changer le logo
                <input type="file" accept="image/*" style={{ display: 'none' }} onChange={async e => {
                  const file = e.target.files?.[0]
                  if (!file) return
                  try {
                    const result = await companyApi.uploadLogo(file)
                    setCompany(c => ({ ...c, logo_url: result.logo_url }))
                    toast('success', 'Logo mis à jour')
                  } catch { toast('error', 'Erreur', 'Upload échoué') }
                }} />
              </label>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button type="submit" className="btn-primary" disabled={saving}>
                <Save size={15} /> Sauvegarder
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Security tab */}
      {tab === 'security' && (
        <div className="card" style={{ padding: '1.75rem' }}>
          <h3 style={{ margin: '0 0 0.375rem', fontSize: '1rem', fontWeight: 600, color: 'var(--foreground)' }}>Changer le mot de passe</h3>
          <p style={{ margin: '0 0 1.5rem', fontSize: '0.875rem', color: 'var(--foreground-muted)' }}>
            Connecté en tant que <strong>{user?.email}</strong>
          </p>
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
                <Lock size={15} /> Modifier le mot de passe
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
