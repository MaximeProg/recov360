'use client'
import { useEffect, useState } from 'react'
import { Plus, Edit2, Trash2, CreditCard, RefreshCw, Check, X } from 'lucide-react'
import { superAdminApi } from '@/lib/api'
import { formatCurrency } from '@/lib/utils'
import { useToast } from '@/contexts/toast'
import Modal from '@/components/ui/Modal'

interface Plan {
  id: string; name: string; slug: string; description?: string
  price_monthly: number; price_yearly: number; currency: string
  max_users: number; max_debtors: number; max_invoices: number
  features?: Record<string, boolean>; is_free: boolean; is_active: boolean
  trial_days: number; sort_order: number
}

const DEFAULT_FEATURES: Record<string, boolean> = {
  scoring: false, workflows: false, reports: false, api_access: false, support_priority: false,
}

const FEATURE_LABELS: Record<string, string> = {
  scoring: 'Scoring IA', workflows: 'Workflows automatisés',
  reports: 'Rapports avancés', api_access: 'Accès API',
  support_priority: 'Support prioritaire',
}

export default function PlansPage() {
  const toast = useToast()
  const [plans, setPlans] = useState<Plan[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editPlan, setEditPlan] = useState<Plan | null>(null)
  const [deletePlan, setDeletePlan] = useState<Plan | null>(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<{
    name: string; slug: string; description: string
    price_monthly: number; price_yearly: number; currency: string
    max_users: number; max_debtors: number; max_invoices: number
    is_free: boolean; is_active: boolean; trial_days: number; sort_order: number
    features: Record<string, boolean>
  }>({
    name: '', slug: '', description: '',
    price_monthly: 0, price_yearly: 0, currency: 'XOF',
    max_users: 5, max_debtors: 100, max_invoices: 500,
    is_free: false, is_active: true, trial_days: 14, sort_order: 0,
    features: { ...DEFAULT_FEATURES },
  })

  async function load() {
    setLoading(true)
    try {
      const data = await superAdminApi.plans()
      setPlans(Array.isArray(data) ? data : [])
    } catch { toast('error', 'Erreur chargement') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  function openCreate() {
    setEditPlan(null)
    setForm({ name: '', slug: '', description: '', price_monthly: 0, price_yearly: 0, currency: 'XOF', max_users: 5, max_debtors: 100, max_invoices: 500, is_free: false, is_active: true, trial_days: 14, sort_order: plans.length, features: { ...DEFAULT_FEATURES } })
    setShowModal(true)
  }

  function openEdit(p: Plan) {
    setEditPlan(p)
    setForm({
      name: p.name, slug: p.slug, description: p.description ?? '',
      price_monthly: p.price_monthly, price_yearly: p.price_yearly,
      currency: p.currency, max_users: p.max_users, max_debtors: p.max_debtors,
      max_invoices: p.max_invoices, is_free: p.is_free, is_active: p.is_active,
      trial_days: p.trial_days, sort_order: p.sort_order,
      features: { ...DEFAULT_FEATURES, ...(p.features ?? {}) },
    })
    setShowModal(true)
  }

  async function save() {
    setSaving(true)
    try {
      const payload = { ...form, price_monthly: Number(form.price_monthly), price_yearly: Number(form.price_yearly), max_users: Number(form.max_users), max_debtors: Number(form.max_debtors), max_invoices: Number(form.max_invoices), trial_days: Number(form.trial_days), sort_order: Number(form.sort_order) }
      if (editPlan) {
        const updated = await superAdminApi.updatePlan(editPlan.id, payload)
        setPlans(prev => prev.map(p => p.id === editPlan.id ? updated : p))
        toast('success', 'Plan mis à jour')
      } else {
        const created = await superAdminApi.createPlan(payload)
        setPlans(prev => [...prev, created])
        toast('success', 'Plan créé')
      }
      setShowModal(false)
    } catch { toast('error', 'Erreur sauvegarde') }
    finally { setSaving(false) }
  }

  async function confirmDelete() {
    if (!deletePlan) return
    setSaving(true)
    try {
      await superAdminApi.deletePlan(deletePlan.id)
      setPlans(prev => prev.filter(p => p.id !== deletePlan.id))
      toast('success', 'Plan supprimé')
      setDeletePlan(null)
    } catch { toast('error', 'Erreur suppression') }
    finally { setSaving(false) }
  }

  return (
    <div className="animate-fadeIn">
      <div className="sa-page-header">
        <div>
          <h1 style={{ margin: 0, fontSize: '1.375rem', fontWeight: 800, color: 'var(--foreground)' }}>Plans & Abonnements</h1>
          <p style={{ margin: '0.25rem 0 0', fontSize: '0.875rem', color: 'var(--foreground-muted)' }}>
            Définissez les offres proposées aux entreprises
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
          <button className="btn-secondary" onClick={load} disabled={loading}><RefreshCw size={14} /></button>
          <button
            onClick={openCreate}
            style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', padding: '0.5rem 1rem', background: '#2563EB', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '0.875rem' }}
          >
            <Plus size={15} /> Nouveau plan
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
        {loading ? [...Array(3)].map((_, i) => (
          <div key={i} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '1.5rem', height: 260 }}>
            <div className="skeleton" style={{ height: 16, width: '60%', borderRadius: 4, marginBottom: 12 }} />
            <div className="skeleton" style={{ height: 36, width: '40%', borderRadius: 4, marginBottom: 8 }} />
            <div className="skeleton" style={{ height: 12, width: '80%', borderRadius: 4 }} />
          </div>
        )) : plans.map(p => (
          <div key={p.id} style={{
            background: 'var(--surface)', border: `2px solid ${p.is_active ? 'var(--border)' : 'var(--border-muted)'}`,
            borderRadius: '12px', padding: '1.5rem',
            opacity: p.is_active ? 1 : 0.6,
            position: 'relative', overflow: 'hidden',
          }}>
            {!p.is_active && (
              <div style={{ position: 'absolute', top: 12, right: 12 }}>
                <span style={{ padding: '0.15rem 0.5rem', background: 'var(--border)', borderRadius: '4px', fontSize: '0.7rem', color: 'var(--foreground-muted)' }}>Inactif</span>
              </div>
            )}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <CreditCard size={16} color="#2563EB" />
                  <span style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--foreground)', textTransform: 'capitalize' }}>{p.name}</span>
                  {p.is_free && <span style={{ padding: '0.1rem 0.4rem', background: '#05966920', color: '#059669', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 600 }}>Gratuit</span>}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--foreground-subtle)', fontFamily: 'monospace', marginTop: '0.125rem' }}>{p.slug}</div>
              </div>
            </div>
            <div style={{ marginBottom: '1rem' }}>
              <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--foreground)', lineHeight: 1 }}>
                {p.is_free ? 'Gratuit' : formatCurrency(p.price_monthly)}
                {!p.is_free && <span style={{ fontSize: '0.875rem', fontWeight: 400, color: 'var(--foreground-muted)' }}>/mois</span>}
              </div>
              {!p.is_free && p.price_yearly > 0 && (
                <div style={{ fontSize: '0.8rem', color: 'var(--foreground-muted)', marginTop: '0.125rem' }}>
                  ou {formatCurrency(p.price_yearly)}/an
                </div>
              )}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', marginBottom: '1rem' }}>
              {[
                `${p.max_users} utilisateurs`,
                `${p.max_debtors} débiteurs`,
                `${p.max_invoices} créances`,
                `${p.trial_days}j d'essai`,
              ].map((f, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.8125rem', color: 'var(--foreground-muted)' }}>
                  <Check size={13} color="#059669" /> {f}
                </div>
              ))}
              {p.features && Object.entries(p.features).filter(([, v]) => v).map(([k]) => (
                <div key={k} style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.8125rem', color: 'var(--foreground-muted)' }}>
                  <Check size={13} color="#059669" /> {FEATURE_LABELS[k] ?? k}
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
              <button className="btn-secondary" style={{ flex: 1, fontSize: '0.8125rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem' }} onClick={() => openEdit(p)}>
                <Edit2 size={13} /> Modifier
              </button>
              <button className="btn-ghost" style={{ fontSize: '0.8125rem', color: '#DC2626', display: 'flex', alignItems: 'center', gap: '0.25rem' }} onClick={() => setDeletePlan(p)}>
                <Trash2 size={13} />
              </button>
            </div>
          </div>
        ))}
        {!loading && plans.length === 0 && (
          <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '4rem 2rem', color: 'var(--foreground-muted)' }}>
            <CreditCard size={40} style={{ margin: '0 auto 1rem', opacity: 0.3 }} />
            <div>Aucun plan créé. Créez votre premier plan d'abonnement.</div>
          </div>
        )}
      </div>

      {/* Modal créer/modifier plan */}
      {showModal && (
        <Modal open title={editPlan ? `Modifier — ${editPlan.name}` : 'Nouveau plan'} onClose={() => setShowModal(false)} size="lg">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group" style={{ gridColumn: '1/-1' }}>
              <label className="label">Nom du plan *</label>
              <input className="input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="ex: Pro" />
            </div>
            <div className="form-group">
              <label className="label">Slug (identifiant unique) *</label>
              <input className="input" value={form.slug} onChange={e => setForm(f => ({ ...f, slug: e.target.value.toLowerCase().replace(/\s/g, '-') }))} placeholder="ex: pro" />
            </div>
            <div className="form-group">
              <label className="label">Devise</label>
              <select className="input" value={form.currency} onChange={e => setForm(f => ({ ...f, currency: e.target.value }))}>
                <option value="XOF">XOF (FCFA)</option>
                <option value="EUR">EUR (€)</option>
                <option value="USD">USD ($)</option>
              </select>
            </div>
            <div className="form-group">
              <label className="label">Prix mensuel (FCFA)</label>
              <input className="input" type="number" value={form.price_monthly} onChange={e => setForm(f => ({ ...f, price_monthly: +e.target.value }))} disabled={form.is_free} />
            </div>
            <div className="form-group">
              <label className="label">Prix annuel (FCFA)</label>
              <input className="input" type="number" value={form.price_yearly} onChange={e => setForm(f => ({ ...f, price_yearly: +e.target.value }))} disabled={form.is_free} />
            </div>
            <div className="form-group">
              <label className="label">Max utilisateurs</label>
              <input className="input" type="number" value={form.max_users} onChange={e => setForm(f => ({ ...f, max_users: +e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="label">Max débiteurs</label>
              <input className="input" type="number" value={form.max_debtors} onChange={e => setForm(f => ({ ...f, max_debtors: +e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="label">Max créances</label>
              <input className="input" type="number" value={form.max_invoices} onChange={e => setForm(f => ({ ...f, max_invoices: +e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="label">Jours d'essai gratuit</label>
              <input className="input" type="number" value={form.trial_days} onChange={e => setForm(f => ({ ...f, trial_days: +e.target.value }))} />
            </div>
            <div className="form-group" style={{ gridColumn: '1/-1' }}>
              <label className="label">Description</label>
              <textarea className="input" rows={2} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Décrivez ce plan en quelques mots…" />
            </div>
            <div style={{ gridColumn: '1/-1' }}>
              <div className="label" style={{ marginBottom: '0.5rem' }}>Fonctionnalités incluses</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.375rem' }}>
                {Object.entries(FEATURE_LABELS).map(([key, label]) => (
                  <label key={key} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.875rem', padding: '0.5rem', borderRadius: '6px', background: form.features[key] ? 'rgba(37,99,235,0.08)' : 'transparent', border: `1px solid ${form.features[key] ? 'rgba(37,99,235,0.35)' : 'var(--border)'}` }}>
                    <input type="checkbox" checked={!!form.features[key]} onChange={e => setForm(f => ({ ...f, features: { ...f.features, [key]: e.target.checked } }))} />
                    {label}
                  </label>
                ))}
              </div>
            </div>
            <div style={{ gridColumn: '1/-1', display: 'flex', gap: '1.5rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.875rem' }}>
                <input type="checkbox" checked={form.is_free} onChange={e => setForm(f => ({ ...f, is_free: e.target.checked, price_monthly: e.target.checked ? 0 : f.price_monthly }))} /> Plan gratuit
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.875rem' }}>
                <input type="checkbox" checked={form.is_active} onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} /> Actif (visible)
              </label>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
            <button className="btn-secondary" onClick={() => setShowModal(false)}>Annuler</button>
            <button
              disabled={saving || !form.name || !form.slug}
              onClick={save}
              style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', padding: '0.5rem 1.25rem', background: '#2563EB', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '0.875rem' }}
            >
              {saving ? <RefreshCw size={14} className="animate-spin" /> : <Check size={14} />}
              {editPlan ? 'Enregistrer' : 'Créer'}
            </button>
          </div>
        </Modal>
      )}

      {/* Modal confirmer suppression */}
      {deletePlan && (
        <Modal open title="Supprimer le plan" onClose={() => setDeletePlan(null)} size="sm">
          <div style={{ textAlign: 'center', padding: '0.5rem 0 1.5rem' }}>
            <div style={{ width: 52, height: 52, borderRadius: '50%', background: '#DC262618', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
              <Trash2 size={22} color="#DC2626" />
            </div>
            <h3 style={{ margin: '0 0 0.5rem', color: 'var(--foreground)' }}>Supprimer « {deletePlan.name} » ?</h3>
            <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--foreground-muted)' }}>
              Les entreprises ayant ce plan garderont leur abonnement en cours, mais le plan ne sera plus proposé.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
            <button className="btn-secondary" onClick={() => setDeletePlan(null)}>Annuler</button>
            <button disabled={saving} onClick={confirmDelete} style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', padding: '0.5rem 1rem', background: '#DC2626', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '0.875rem' }}>
              <Trash2 size={14} /> Supprimer
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}
