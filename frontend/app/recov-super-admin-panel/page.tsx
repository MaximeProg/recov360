'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  Building2, Users, BarChart3, TrendingUp, RefreshCw,
  ArrowRight, CheckCircle, XCircle, CreditCard, Globe,
} from 'lucide-react'
import { superAdminApi } from '@/lib/api'
import { formatCurrency, formatDate } from '@/lib/utils'
import type { PlatformStats } from '@/types'

interface Company {
  id: string; name: string; email: string; plan: string
  is_active: boolean; total_users?: number; total_debtors?: number
  total_invoices?: number; created_at?: string
}

/* Carte KPI sans bordure colorée — icône colorée suffit */
function KpiCard({ label, value, sub, color, icon }: {
  label: string; value: string | number; sub?: string; color: string; icon: React.ReactNode
}) {
  return (
    <div style={{
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: '12px',
      padding: '1.25rem',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: '0.8rem', color: 'var(--foreground-muted)', fontWeight: 500, marginBottom: '0.375rem' }}>{label}</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--foreground)', lineHeight: 1 }}>{value}</div>
          {sub && <div style={{ fontSize: '0.75rem', color: 'var(--foreground-muted)', marginTop: '0.25rem' }}>{sub}</div>}
        </div>
        <div style={{ padding: '0.625rem', borderRadius: '10px', background: color + '18', color }}>{icon}</div>
      </div>
    </div>
  )
}

const PLAN_COLOR: Record<string, string> = {
  starter: '#64748B', pro: '#2563EB', enterprise: '#059669',
}

export default function SuperAdminPage() {
  const [stats, setStats]       = useState<PlatformStats | null>(null)
  const [companies, setCompanies] = useState<Company[]>([])
  const [loading, setLoading]   = useState(true)

  async function load() {
    setLoading(true)
    try {
      const [s, c] = await Promise.all([superAdminApi.stats(), superAdminApi.companies()])
      setStats(s)
      setCompanies(Array.isArray(c) ? c : c.items ?? [])
    } catch { }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const activeRate = stats && stats.total_companies > 0
    ? Math.round((stats.active_companies / stats.total_companies) * 100)
    : 0

  return (
    <div className="animate-fadeIn">
      <div className="sa-page-header" style={{ marginBottom: '1.75rem' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.375rem', fontWeight: 800, color: 'var(--foreground)' }}>Vue globale de la plateforme</h1>
          <p style={{ margin: '0.25rem 0 0', fontSize: '0.875rem', color: 'var(--foreground-muted)' }}>Tableau de bord opérateur Recov360</p>
        </div>
        <button className="btn-secondary" onClick={load} disabled={loading}>
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Actualiser
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.75rem' }}>
        {loading ? [...Array(6)].map((_, i) => (
          <div key={i} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '1.25rem', height: 110 }}>
            <div className="skeleton" style={{ height: 12, width: '60%', borderRadius: 4, marginBottom: 8 }} />
            <div className="skeleton" style={{ height: 28, width: '40%', borderRadius: 4 }} />
          </div>
        )) : (<>
          <KpiCard label="Entreprises totales"    value={stats?.total_companies ?? 0}                      sub={activeRate + '% actives'}  color="#2563EB" icon={<Globe size={20} />} />
          <KpiCard label="Entreprises actives"    value={stats?.active_companies ?? 0}                                                     color="#059669" icon={<CheckCircle size={20} />} />
          <KpiCard label="Utilisateurs"           value={stats?.total_users ?? 0}                                                           color="#7C3AED" icon={<Users size={20} />} />
          <KpiCard label="Débiteurs suivis"       value={stats?.total_debtors ?? 0}                                                         color="#0891B2" icon={<Building2 size={20} />} />
          <KpiCard label="Créances totales"       value={stats ? formatCurrency(stats.total_amount_due ?? 0) : '–'}                        color="#059669" icon={<BarChart3 size={20} />} />
          <KpiCard label="Taux de recouvrement"   value={stats ? (stats.global_recovery_rate ?? 0) + '%' : '–'}                            color="#EA580C" icon={<TrendingUp size={20} />} />
        </>)}
      </div>

      <div className="card">
        <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h3 style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 700, color: 'var(--foreground)' }}>Dernières entreprises</h3>
          <Link href="/recov-super-admin-panel/companies" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.8125rem', color: '#2563EB', textDecoration: 'none', fontWeight: 500 }}>
            Voir tout <ArrowRight size={14} />
          </Link>
        </div>
        <div className="table-container" style={{ border: 'none' }}>
          <table>
            <thead><tr><th>Entreprise</th><th>Plan</th><th>Utilisateurs</th><th>Statut</th><th>Inscription</th></tr></thead>
            <tbody>
              {loading ? [...Array(5)].map((_, i) => (
                <tr key={i}>{[...Array(5)].map((_, j) => <td key={j}><div className="skeleton" style={{ height: 13, borderRadius: 3 }} /></td>)}</tr>
              )) : companies.slice(0, 8).map(c => (
                <tr key={c.id}>
                  <td>
                    <div style={{ fontWeight: 600, color: 'var(--foreground)', fontSize: '0.875rem' }}>{c.name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--foreground-muted)' }}>{c.email}</div>
                  </td>
                  <td>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', padding: '0.2rem 0.6rem', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 600, background: (PLAN_COLOR[c.plan] ?? '#64748B') + '20', color: PLAN_COLOR[c.plan] ?? '#64748B', textTransform: 'capitalize' }}>
                      <CreditCard size={11} /> {c.plan}
                    </span>
                  </td>
                  <td style={{ fontSize: '0.8125rem', color: 'var(--foreground-muted)' }}>{c.total_users ?? 0}</td>
                  <td>
                    {c.is_active
                      ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.8125rem', color: '#059669' }}><CheckCircle size={13} /> Actif</span>
                      : <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.8125rem', color: '#DC2626' }}><XCircle size={13} /> Suspendu</span>
                    }
                  </td>
                  <td style={{ fontSize: '0.8125rem', color: 'var(--foreground-muted)' }}>{c.created_at ? formatDate(c.created_at) : '–'}</td>
                </tr>
              ))}
              {!loading && companies.length === 0 && (
                <tr><td colSpan={5} style={{ textAlign: 'center', padding: '2rem', color: 'var(--foreground-muted)' }}>Aucune entreprise</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
