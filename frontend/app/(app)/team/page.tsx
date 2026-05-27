'use client'
import { useEffect, useState } from 'react'
import { Plus, Mail, Phone, Shield, Trash2 } from 'lucide-react'
import PageHeader from '@/components/ui/PageHeader'
import Modal from '@/components/ui/Modal'
import { usersApi } from '@/lib/api'
import { getInitials, roleLabel } from '@/lib/utils'
import { useToast } from '@/contexts/toast'
import type { User, UserRole } from '@/types'

const ROLE_COLORS: Record<UserRole, string> = {
  admin: 'var(--primary)',
  superviseur: 'var(--status-partial)',
  comptable: 'var(--risk-medium)',
  agent: 'var(--foreground-muted)',
}

export default function TeamPage() {
  const toast = useToast()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ email: '', first_name: '', last_name: '', password: '', role: 'agent' as UserRole, phone: '' })
  const [errors, setErrors] = useState<Record<string, string>>({})

  async function load() {
    setLoading(true)
    try {
      const data = await usersApi.list({ per_page: 100 })
      setUsers(data.items ?? [])
    } catch { /* ignore */ }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  function set(key: string, val: string) {
    setForm(f => ({ ...f, [key]: val }))
    setErrors(e => ({ ...e, [key]: '' }))
  }

  async function createUser(e: React.FormEvent) {
    e.preventDefault()
    const errs: Record<string, string> = {}
    if (!form.email) errs.email = 'Email requis'
    if (!form.first_name) errs.first_name = 'Prénom requis'
    if (!form.last_name) errs.last_name = 'Nom requis'
    if (!form.password || form.password.length < 8) errs.password = 'Minimum 8 caractères'
    if (Object.keys(errs).length) { setErrors(errs); return }
    setSaving(true)
    try {
      await usersApi.create({
        email: form.email, first_name: form.first_name, last_name: form.last_name,
        password: form.password, role: form.role, phone: form.phone || undefined,
      })
      toast('success', 'Utilisateur créé', `${form.first_name} ${form.last_name}`)
      setShowModal(false)
      setForm({ email: '', first_name: '', last_name: '', password: '', role: 'agent', phone: '' })
      load()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? 'Erreur'
      toast('error', 'Erreur', msg)
    } finally { setSaving(false) }
  }

  async function deleteUser(id: string, name: string) {
    if (!confirm(`Supprimer ${name} ?`)) return
    try { await usersApi.delete(id); toast('success', 'Utilisateur supprimé'); load() }
    catch { toast('error', 'Erreur') }
  }

  const inp = (key: string) => ({ style: errors[key] ? { borderColor: 'var(--status-late)' } : {} })

  return (
    <div className="animate-fadeIn">
      <PageHeader
        title="Équipe"
        subtitle={`${users.length} membre${users.length > 1 ? 's' : ''}`}
        actions={
          <button className="btn-primary" onClick={() => setShowModal(true)}>
            <Plus size={15} /> Ajouter un membre
          </button>
        }
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '0.875rem' }}>
        {loading ? (
          [...Array(4)].map((_, i) => <div key={i} className="skeleton" style={{ height: 120, borderRadius: 'var(--radius-lg)' }} />)
        ) : users.map(user => (
          <div key={user.id} className="card" style={{ padding: '1.25rem', display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
            <div style={{ width: 48, height: 48, borderRadius: '50%', background: ROLE_COLORS[user.role] + '20', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.875rem', fontWeight: 700, color: ROLE_COLORS[user.role], flexShrink: 0 }}>
              {getInitials(`${user.first_name} ${user.last_name}`)}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem', flexWrap: 'wrap' }}>
                <span style={{ fontWeight: 600, color: 'var(--foreground)', fontSize: '0.9375rem' }}>
                  {user.first_name} {user.last_name}
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem', fontWeight: 500, padding: '0.15rem 0.5rem', borderRadius: '999px', background: ROLE_COLORS[user.role] + '18', color: ROLE_COLORS[user.role] }}>
                  <Shield size={10} /> {roleLabel(user.role)}
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.8125rem', color: 'var(--foreground-muted)' }}>
                  <Mail size={12} /> {user.email}
                </span>
                {user.phone && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.8125rem', color: 'var(--foreground-muted)' }}>
                    <Phone size={12} /> {user.phone}
                  </span>
                )}
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.375rem', flexShrink: 0 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: user.is_active ? 'var(--status-paid)' : 'var(--foreground-subtle)' }} title={user.is_active ? 'Actif' : 'Inactif'} />
              <button className="btn-ghost" style={{ color: 'var(--status-late)', padding: '0.3rem 0.4rem' }} onClick={() => deleteUser(user.id, `${user.first_name} ${user.last_name}`)}>
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>

      <Modal open={showModal} onClose={() => setShowModal(false)} title="Ajouter un membre">
        <form onSubmit={createUser} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div className="form-group">
              <label className="form-label">Prénom *</label>
              <input className="input-base" {...inp('first_name')} placeholder="Awa" value={form.first_name} onChange={e => set('first_name', e.target.value)} />
              {errors.first_name && <span className="form-error">{errors.first_name}</span>}
            </div>
            <div className="form-group">
              <label className="form-label">Nom *</label>
              <input className="input-base" {...inp('last_name')} placeholder="Diallo" value={form.last_name} onChange={e => set('last_name', e.target.value)} />
              {errors.last_name && <span className="form-error">{errors.last_name}</span>}
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Email *</label>
            <input className="input-base" type="email" {...inp('email')} placeholder="awa@societe.ci" value={form.email} onChange={e => set('email', e.target.value)} />
            {errors.email && <span className="form-error">{errors.email}</span>}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div className="form-group">
              <label className="form-label">Rôle</label>
              <select className="input-base" value={form.role} onChange={e => set('role', e.target.value)}>
                <option value="agent">Agent</option>
                <option value="comptable">Comptable</option>
                <option value="superviseur">Superviseur</option>
                <option value="admin">Administrateur</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Téléphone</label>
              <input className="input-base" placeholder="+225 07 00 00 00" value={form.phone} onChange={e => set('phone', e.target.value)} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Mot de passe temporaire *</label>
            <input className="input-base" type="password" {...inp('password')} placeholder="Minimum 8 caractères" value={form.password} onChange={e => set('password', e.target.value)} />
            {errors.password && <span className="form-error">{errors.password}</span>}
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
            <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>Annuler</button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? <span className="animate-spin" style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', display: 'inline-block' }} /> : null}
              Créer
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
