'use client'
import { useEffect, useState } from 'react'
import {
  Search, RefreshCw, CheckCircle, XCircle, CreditCard,
  Trash2, Power, PowerOff, Eye, ChevronDown, Users, FileText, Building2,
} from 'lucide-react'
import { superAdminApi } from '@/lib/api'
import { formatDate } from '@/lib/utils'
import { useToast } from '@/contexts/toast'
import Modal from '@/components/ui/Modal'

interface Company {
  id: string; name: string; email: string; phone?: string
  country?: string; plan: string; is_active: boolean
  total_users?: number; total_debtors?: number; total_invoices?: number
  created_at?: string
}

const PLANS = ['starter', 'pro', 'enterprise']
const PLAN_COLOR: Record<string, string> = {
  starter: '#64748B', pro: '#2563EB', enterprise: '#059669',
}

export default function SuperAdminCompaniesPage() {
  const toast = useToast()
  const [companies, setCompanies] = useState<Company[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [actionCompany, setActionCompany] = useState<Company | null>(null)
  const [actionType, setActionType] = useState<'delete' | 'status' | 'plan' | 'view' | null>(null)
  const [working, setWorking] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState('')

  async function load() {
    setLoading(true)
    try {
      const data = await superAdminApi.companies(search || undefined)
      setCompanies(Array.isArray(data) ? data : data.items ?? [])
    } catch { toast('error', 'Erreur chargement') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  // Recherche avec debounce
  useEffect(() => {
    const t = setTimeout(load, 350)
    return () => clearTimeout(t)
  }, [search])

  async function toggleStatus(c: Company) {
    setWorking(true)
    try {
      await superAdminApi.setStatus(c.id, !c.is_active)
      toast('success', c.is_active ? 'Entreprise suspendue' : 'Entreprise réactivée')
      setCompanies(prev => prev.map(x => x.id === c.id ? { ...x, is_active: !c.is_active } : x))
    } catch { toast('error', 'Erreur') }
    finally { setWorking(false); setActionCompany(null); setActionType(null) }
  }

  async function changePlan(c: Company, plan: string) {
    setWorking(true)
    try {
      await superAdminApi.setPlan(c.id, plan)
      toast('success', `Plan changé → ${plan}`)
      setCompanies(prev => prev.map(x => x.id === c.id ? { ...x, plan } : x))
    } catch { toast('error', 'Erreur') }
    finally { setWorking(false); setActionCompany(null); setActionType(null) }
  }

  async function deleteCompany(c: Company) {
    setWorking(true)
    try {
      await superAdminApi.deleteCompany(c.id)
      toast('success', 'Entreprise supprimée')
      setCompanies(prev => prev.filter(x => x.id !== c.id))
    } catch { toast('error', 'Erreur suppression') }
    finally { setWorking(false); setActionCompany(null); setActionType(null) }
  }

  return (
    <div className="animate-fadeIn">
      <div className="sa-page-header">
        <div>
          <h1 style={{ margin: 0, fontSize: '1.375rem', fontWeight: 800, color: 'var(--foreground)' }}>Entreprises</h1>
          <p style={{ margin: '0.25rem 0 0', fontSize: '0.875rem', color: 'var(--foreground-muted)' }}>
            {companies.length} entreprise{companies.length > 1 ? 's' : ''} enregistrée{companies.length > 1 ? 's' : ''}
          </p>
        </div>
        <button className="btn-secondary" onClick={load} disabled={loading}>
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Actualiser
        </button>
      </div>

      {/* Recherche */}
      <div className="sa-search-wrap">
        <div style={{ position: 'relative', maxWidth: 400 }}>
          <Search size={15} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--foreground-subtle)' }} />
          <input
            className="input" placeholder="Rechercher par nom ou email…"
            value={search} onChange={e => setSearch(e.target.value)}
            style={{ paddingLeft: '2.25rem', width: '100%' }}
          />
        </div>
      </div> {/* /sa-search-wrap */}

      <div className="card">
        <div className="table-container" style={{ border: 'none' }}>
          <table>
            <thead>
              <tr>
                <th>Entreprise</th>
                <th>Plan</th>
                <th>Données</th>
                <th>Statut</th>
                <th>Inscription</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? [...Array(8)].map((_, i) => (
                <tr key={i}>{[...Array(6)].map((_, j) => <td key={j}><div className="skeleton" style={{ height: 13, borderRadius: 3 }} /></td>)}</tr>
              )) : companies.map(c => (
                <tr key={c.id}>
                  <td>
                    <div style={{ fontWeight: 600, color: 'var(--foreground)', fontSize: '0.875rem' }}>{c.name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--foreground-subtle)' }}>{c.email}</div>
                    {c.country && <div style={{ fontSize: '0.7rem', color: 'var(--foreground-subtle)' }}>{c.country}</div>}
                  </td>
                  <td>
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
                      padding: '0.2rem 0.6rem', borderRadius: '20px',
                      fontSize: '0.75rem', fontWeight: 600, textTransform: 'capitalize',
                      background: (PLAN_COLOR[c.plan] ?? '#64748B') + '20',
                      color: PLAN_COLOR[c.plan] ?? '#64748B',
                    }}>
                      <CreditCard size={11} /> {c.plan}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.75rem', color: 'var(--foreground-muted)' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <Users size={12} /> {c.total_users ?? 0}
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <Building2 size={12} /> {c.total_debtors ?? 0}
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <FileText size={12} /> {c.total_invoices ?? 0}
                      </span>
                    </div>
                  </td>
                  <td>
                    {c.is_active
                      ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.8125rem', color: '#059669', fontWeight: 500 }}><CheckCircle size={13} /> Actif</span>
                      : <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.8125rem', color: '#DC2626', fontWeight: 500 }}><XCircle size={13} /> Suspendu</span>
                    }
                  </td>
                  <td style={{ fontSize: '0.8125rem', color: 'var(--foreground-muted)' }}>
                    {c.created_at ? formatDate(c.created_at) : '–'}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.375rem' }}>
                      {/* Changer plan */}
                      <div style={{ position: 'relative' }}>
                        <button
                          className="btn-ghost" style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                          onClick={() => { setActionCompany(c); setSelectedPlan(c.plan); setActionType('plan') }}
                        >
                          <CreditCard size={12} /> Plan <ChevronDown size={11} />
                        </button>
                      </div>
                      {/* Activer/Suspendre */}
                      <button
                        className="btn-ghost" style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem', display: 'flex', alignItems: 'center', gap: '0.25rem', color: c.is_active ? '#EA580C' : '#059669' }}
                        onClick={() => { setActionCompany(c); setActionType('status') }}
                      >
                        {c.is_active ? <><PowerOff size={12} /> Suspendre</> : <><Power size={12} /> Réactiver</>}
                      </button>
                      {/* Supprimer */}
                      <button
                        className="btn-ghost" style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem', display: 'flex', alignItems: 'center', gap: '0.25rem', color: '#DC2626' }}
                        onClick={() => { setActionCompany(c); setActionType('delete') }}
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!loading && companies.length === 0 && (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: '3rem', color: 'var(--foreground-muted)' }}>
                  Aucune entreprise trouvée
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal changer plan */}
      {actionType === 'plan' && actionCompany && (
        <Modal open title={`Changer le plan — ${actionCompany.name}`} onClose={() => { setActionCompany(null); setActionType(null) }} size="sm">
          <p style={{ fontSize: '0.875rem', color: 'var(--foreground-muted)', marginBottom: '1rem' }}>
            Plan actuel : <strong style={{ textTransform: 'capitalize' }}>{actionCompany.plan}</strong>
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.25rem' }}>
            {PLANS.map(plan => (
              <button
                key={plan}
                onClick={() => setSelectedPlan(plan)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.75rem',
                  padding: '0.75rem 1rem', border: `2px solid ${selectedPlan === plan ? PLAN_COLOR[plan] : 'var(--border)'}`,
                  borderRadius: '8px', cursor: 'pointer',
                  background: selectedPlan === plan ? (PLAN_COLOR[plan] + '12') : 'var(--surface)',
                  color: 'var(--foreground)', textTransform: 'capitalize', fontWeight: selectedPlan === plan ? 600 : 400,
                  fontSize: '0.875rem',
                }}
              >
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: PLAN_COLOR[plan], flexShrink: 0 }} />
                {plan}
                {plan === actionCompany.plan && <span style={{ marginLeft: 'auto', fontSize: '0.75rem', color: 'var(--foreground-subtle)' }}>Actuel</span>}
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
            <button className="btn-secondary" onClick={() => { setActionCompany(null); setActionType(null) }}>Annuler</button>
            <button
              className="btn-primary"
              disabled={working || selectedPlan === actionCompany.plan}
              onClick={() => changePlan(actionCompany, selectedPlan)}
              style={{ background: '#2563EB' }}
            >
              Appliquer
            </button>
          </div>
        </Modal>
      )}

      {/* Modal suspendre/réactiver */}
      {actionType === 'status' && actionCompany && (
        <Modal open title={actionCompany.is_active ? "Suspendre l'entreprise" : "Réactiver l'entreprise"} onClose={() => { setActionCompany(null); setActionType(null) }} size="sm">
          <p style={{ fontSize: '0.875rem', color: 'var(--foreground-muted)', marginBottom: '1.25rem' }}>
            {actionCompany.is_active
              ? `Suspendre ${actionCompany.name} bloquera l'accès à tous ses utilisateurs. Cette action est réversible.`
              : `Réactiver ${actionCompany.name} restaurera l'accès à tous ses utilisateurs.`
            }
          </p>
          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
            <button className="btn-secondary" onClick={() => { setActionCompany(null); setActionType(null) }}>Annuler</button>
            <button
              disabled={working}
              onClick={() => toggleStatus(actionCompany)}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.375rem',
                padding: '0.5rem 1rem', borderRadius: '8px', border: 'none',
                background: actionCompany.is_active ? '#EA580C' : '#059669',
                color: 'white', cursor: 'pointer', fontWeight: 600, fontSize: '0.875rem',
              }}
            >
              {actionCompany.is_active ? <><PowerOff size={14} /> Suspendre</> : <><Power size={14} /> Réactiver</>}
            </button>
          </div>
        </Modal>
      )}

      {/* Modal supprimer */}
      {actionType === 'delete' && actionCompany && (
        <Modal open title="Supprimer l'entreprise" onClose={() => { setActionCompany(null); setActionType(null) }} size="sm">
          <div style={{ textAlign: 'center', padding: '0.5rem 0 1.5rem' }}>
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#DC262620', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
              <Trash2 size={24} color="#DC2626" />
            </div>
            <h3 style={{ margin: '0 0 0.5rem', color: 'var(--foreground)' }}>Êtes-vous sûr ?</h3>
            <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--foreground-muted)' }}>
              Cette action supprimera définitivement <strong>{actionCompany.name}</strong> et toutes ses données (utilisateurs, débiteurs, créances…). Cette opération est irréversible.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
            <button className="btn-secondary" onClick={() => { setActionCompany(null); setActionType(null) }}>Annuler</button>
            <button
              disabled={working}
              onClick={() => deleteCompany(actionCompany)}
              style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', padding: '0.5rem 1rem', borderRadius: '8px', border: 'none', background: '#DC2626', color: 'white', cursor: 'pointer', fontWeight: 600, fontSize: '0.875rem' }}
            >
              <Trash2 size={14} /> Supprimer définitivement
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}
