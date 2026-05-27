'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Plus, Phone, Mail, MapPin, Eye } from 'lucide-react'
import PageHeader from '@/components/ui/PageHeader'
import SearchInput from '@/components/ui/SearchInput'
import Pagination from '@/components/ui/Pagination'
import Modal from '@/components/ui/Modal'
import { debtorsApi } from '@/lib/api'
import { formatCurrency, riskClass, riskLabel, getInitials } from '@/lib/utils'
import { getPermissions } from '@/lib/permissions'
import { useToast } from '@/contexts/toast'
import { useAuth } from '@/contexts/auth'
import type { Debtor, DebtorCreate } from '@/types'

export default function DebtorsPage() {
  const toast = useToast()
  const { user } = useAuth()
  const perms = getPermissions(user?.role)
  const [debtors, setDebtors] = useState<Debtor[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<Partial<DebtorCreate>>({ category: 'entreprise' })
  const [errors, setErrors] = useState<Record<string, string>>({})

  const PER_PAGE = 15

  async function load() {
    setLoading(true)
    try {
      const data = await debtorsApi.list({ page, per_page: PER_PAGE, search: search || undefined })
      setDebtors(data.items ?? [])
      setTotal(data.total ?? 0)
    } catch { /* ignore */ }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [page, search])

  function handleSearch(v: string) { setSearch(v); setPage(1) }

  function set(key: string, val: string) {
    setForm(f => ({ ...f, [key]: val }))
    setErrors(e => ({ ...e, [key]: '' }))
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    const errs: Record<string, string> = {}
    if (!form.name?.trim()) errs.name = 'Nom requis'
    if (Object.keys(errs).length) { setErrors(errs); return }
    setSaving(true)
    try {
      await debtorsApi.create(form as Record<string, unknown>)
      toast('success', 'Débiteur créé', form.name)
      setShowModal(false)
      setForm({ category: 'entreprise' })
      load()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? 'Erreur lors de la création'
      toast('error', 'Erreur', msg)
    } finally { setSaving(false) }
  }

  return (
    <div className="animate-fadeIn">
      <PageHeader
        title="Débiteurs"
        subtitle={`${total} débiteur${total > 1 ? 's' : ''} enregistré${total > 1 ? 's' : ''}`}
        actions={
          perms.canCreateDebtor ? (
            <button className="btn-primary" onClick={() => setShowModal(true)}>
              <Plus size={16} /> Nouveau débiteur
            </button>
          ) : undefined
        }
      />

      {/* Filters */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        <SearchInput value={search} onChange={handleSearch} placeholder="Rechercher un débiteur…" />
      </div>

      {/* Table */}
      <div className="card">
        <div className="table-container" style={{ border: 'none' }}>
          <table>
            <thead>
              <tr>
                <th>Débiteur</th>
                <th>Contact</th>
                <th>Ville</th>
                <th>Dû total</th>
                <th>Payé</th>
                <th>Risque</th>
                <th style={{ width: 40 }}></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [...Array(6)].map((_, i) => (
                  <tr key={i}>
                    {[...Array(7)].map((_, j) => (
                      <td key={j}><div className="skeleton" style={{ height: 14, borderRadius: 4 }} /></td>
                    ))}
                  </tr>
                ))
              ) : debtors.length === 0 ? (
                <tr>
                  <td colSpan={7}>
                    <div className="empty-state">
                      <span style={{ fontSize: '2rem' }}>🔍</span>
                      <span>Aucun débiteur trouvé</span>
                      <button className="btn-primary" onClick={() => setShowModal(true)}>
                        <Plus size={14} /> Ajouter un débiteur
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                debtors.map(d => (
                  <tr key={d.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                        <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'var(--primary-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700, color: 'var(--primary)', flexShrink: 0 }}>
                          {getInitials(d.name)}
                        </div>
                        <div>
                          <div style={{ fontWeight: 500, color: 'var(--foreground)' }}>{d.name}</div>
                          {d.company_name && <div style={{ fontSize: '0.75rem', color: 'var(--foreground-muted)' }}>{d.company_name}</div>}
                        </div>
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                        {d.phone && <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.8125rem', color: 'var(--foreground-muted)' }}><Phone size={11} />{d.phone}</span>}
                        {d.email && <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.8125rem', color: 'var(--foreground-muted)' }}><Mail size={11} />{d.email}</span>}
                      </div>
                    </td>
                    <td>
                      {d.city && <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: 'var(--foreground-muted)', fontSize: '0.8125rem' }}><MapPin size={11} />{d.city}</span>}
                    </td>
                    <td style={{ fontWeight: 600, color: 'var(--foreground)' }}>{formatCurrency(d.total_due)}</td>
                    <td style={{ color: 'var(--status-paid)', fontWeight: 500 }}>{formatCurrency(d.total_paid)}</td>
                    <td><span className={`badge ${riskClass(d.risk_level)}`}>{riskLabel(d.risk_level)}</span></td>
                    <td>
                      <Link href={`/debtors/${d.id}`} className="btn-ghost" style={{ padding: '0.3rem 0.5rem' }}>
                        <Eye size={15} />
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <Pagination page={page} totalPages={Math.ceil(total / PER_PAGE)} total={total} perPage={PER_PAGE} onChange={setPage} />
      </div>

      {/* Create modal */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title="Nouveau débiteur">
        <form onSubmit={handleCreate} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="form-group">
            <label className="form-label">Nom complet / Raison sociale *</label>
            <input className="input-base" placeholder="Pharmacie Centrale" value={form.name ?? ''} onChange={e => set('name', e.target.value)} style={errors.name ? { borderColor: 'var(--status-late)' } : {}} />
            {errors.name && <span className="form-error">{errors.name}</span>}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div className="form-group">
              <label className="form-label">Téléphone</label>
              <input className="input-base" placeholder="+225 07 00 00 00" value={form.phone ?? ''} onChange={e => set('phone', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input className="input-base" type="email" placeholder="contact@…" value={form.email ?? ''} onChange={e => set('email', e.target.value)} />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div className="form-group">
              <label className="form-label">Catégorie</label>
              <select className="input-base" value={form.category ?? 'entreprise'} onChange={e => set('category', e.target.value)}>
                <option value="entreprise">Entreprise</option>
                <option value="particulier">Particulier</option>
                <option value="administration">Administration</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Ville</label>
              <input className="input-base" placeholder="Abidjan" value={form.city ?? ''} onChange={e => set('city', e.target.value)} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Nom entreprise (si particulier)</label>
            <input className="input-base" placeholder="Sa société" value={form.company_name ?? ''} onChange={e => set('company_name', e.target.value)} />
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
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
