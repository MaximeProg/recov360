'use client'
import { useEffect, useState } from 'react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts'
import {
  DollarSign, TrendingUp, AlertTriangle, Users, CheckCircle,
  Clock, Zap, ArrowRight, RefreshCw,
} from 'lucide-react'
import PageHeader from '@/components/ui/PageHeader'
import StatCard from '@/components/ui/StatCard'
import { reportsApi, scoringApi, invoicesApi } from '@/lib/api'
import { formatCurrency, formatDate, statusLabel, statusClass, riskClass, riskLabel } from '@/lib/utils'
import type { Dashboard, MonthlyEvolution, DebtorScore, Invoice } from '@/types'
import Link from 'next/link'

const STATUS_COLORS: Record<string, string> = {
  en_attente: '#3B82F6', partiellement_paye: '#8B5CF6',
  en_retard: '#EF4444', solde: '#10B981', litige: '#F97316',
}

export default function DashboardPage() {
  const [kpis, setKpis] = useState<Dashboard | null>(null)
  const [evolution, setEvolution] = useState<MonthlyEvolution[]>([])
  const [topRisky, setTopRisky] = useState<DebtorScore[]>([])
  const [recentInvoices, setRecentInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  async function load(silent = false) {
    if (!silent) setLoading(true)
    else setRefreshing(true)
    try {
      const [k, ev, risky, inv] = await Promise.all([
        reportsApi.dashboard(),
        reportsApi.monthlyEvolution(),
        scoringApi.topRisky(5),
        invoicesApi.list({ page: 1, per_page: 5, status: 'en_retard' }),
      ])
      setKpis(k)
      setEvolution(ev.reverse ? ev.reverse() : ev)
      setTopRisky(risky)
      setRecentInvoices(inv.items ?? [])
    } catch { /* ignore */ }
    finally { setLoading(false); setRefreshing(false) }
  }

  useEffect(() => { load() }, [])

  const pieData = kpis ? Object.entries(kpis.by_status).map(([k, v]) => ({
    name: statusLabel(k), value: v.count, color: STATUS_COLORS[k] ?? '#94a3b8',
  })).filter(d => d.value > 0) : []

  return (
    <div className="animate-fadeIn">
      <PageHeader
        title="Tableau de bord"
        subtitle={`Aperçu de votre activité de recouvrement`}
        actions={
          <button className="btn-secondary" onClick={() => load(true)} disabled={refreshing}>
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
            Actualiser
          </button>
        }
      />

      {/* KPI grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <StatCard
          title="Total créances"
          value={kpis ? formatCurrency(kpis.total_creances) : '–'}
          icon={<DollarSign size={18} />}
          color="var(--primary)"
          sub={`${kpis?.total_invoices ?? 0} factures`}
          loading={loading}
        />
        <StatCard
          title="Montant recouvré"
          value={kpis ? formatCurrency(kpis.total_recovered) : '–'}
          icon={<CheckCircle size={18} />}
          color="var(--status-paid)"
          trend={kpis ? Math.round(kpis.recovery_rate) : undefined}
          sub="taux de recouvrement"
          loading={loading}
        />
        <StatCard
          title="En retard"
          value={kpis ? formatCurrency(kpis.total_late) : '–'}
          icon={<AlertTriangle size={18} />}
          color="var(--status-late)"
          sub={`${kpis?.by_status?.en_retard?.count ?? 0} factures en retard`}
          loading={loading}
        />
        <StatCard
          title="Débiteurs actifs"
          value={kpis?.total_debtors ?? '–'}
          icon={<Users size={18} />}
          color="var(--status-partial)"
          loading={loading}
        />
      </div>

      {/* Charts row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '1rem', marginBottom: '1.5rem' }}>
        {/* Evolution chart */}
        <div className="card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <h3 style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 600, color: 'var(--foreground)' }}>
              Évolution mensuelle
            </h3>
            <span style={{ fontSize: '0.75rem', color: 'var(--foreground-muted)' }}>12 derniers mois</span>
          </div>
          {loading ? (
            <div className="skeleton" style={{ height: 200, borderRadius: 'var(--radius)' }} />
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={evolution} margin={{ top: 5, right: 5, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="totalGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563EB" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#2563EB" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="paidGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--foreground-muted)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--foreground-muted)' }} axisLine={false} tickLine={false} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
                <Tooltip
                  contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', fontSize: 12 }}
                  formatter={(v) => [formatCurrency(v as number), '']}
                />
                <Area type="monotone" dataKey="total" name="Créances" stroke="#2563EB" strokeWidth={2} fill="url(#totalGrad)" />
                <Area type="monotone" dataKey="paid" name="Recouvré" stroke="#10B981" strokeWidth={2} fill="url(#paidGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Pie chart */}
        <div className="card" style={{ padding: '1.25rem' }}>
          <h3 style={{ margin: '0 0 1rem', fontSize: '0.9375rem', fontWeight: 600, color: 'var(--foreground)' }}>
            Répartition des statuts
          </h3>
          {loading ? (
            <div className="skeleton" style={{ height: 180, borderRadius: '50%', width: 180, margin: '0 auto' }} />
          ) : pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="45%" innerRadius={52} outerRadius={78} paddingAngle={3} dataKey="value">
                  {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', fontSize: 12 }} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, color: 'var(--foreground-muted)' }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="empty-state" style={{ padding: '2rem 0' }}>
              <Clock size={28} style={{ color: 'var(--foreground-subtle)' }} />
              <span>Aucune donnée</span>
            </div>
          )}
        </div>
      </div>

      {/* Bottom row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        {/* Late invoices */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 1.25rem', borderBottom: '1px solid var(--border)' }}>
            <h3 style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 600, color: 'var(--foreground)', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
              <AlertTriangle size={16} style={{ color: 'var(--status-late)' }} />
              Créances en retard
            </h3>
            <Link href="/invoices?status=en_retard" style={{ fontSize: '0.8125rem', color: 'var(--primary)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              Voir tout <ArrowRight size={13} />
            </Link>
          </div>
          {loading ? (
            <div style={{ padding: '1rem' }}>
              {[...Array(3)].map((_, i) => <div key={i} className="skeleton" style={{ height: 48, marginBottom: 8, borderRadius: 'var(--radius)' }} />)}
            </div>
          ) : recentInvoices.length === 0 ? (
            <div className="empty-state" style={{ padding: '2rem' }}>
              <CheckCircle size={24} style={{ color: 'var(--status-paid)' }} />
              <span>Aucune créance en retard !</span>
            </div>
          ) : (
            <div>
              {recentInvoices.map(inv => (
                <Link key={inv.id} href={`/invoices/${inv.id}`} style={{ display: 'flex', alignItems: 'center', padding: '0.875rem 1.25rem', borderBottom: '1px solid var(--border-muted)', textDecoration: 'none', transition: 'background 0.1s' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--foreground)' }}>{inv.invoice_number}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--foreground-muted)' }}>Éch. {formatDate(inv.due_date)}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--status-late)' }}>{formatCurrency(inv.amount - inv.amount_paid)}</div>
                    <span className={`badge ${statusClass(inv.status)}`}>{statusLabel(inv.status)}</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Top risky debtors */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 1.25rem', borderBottom: '1px solid var(--border)' }}>
            <h3 style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 600, color: 'var(--foreground)', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
              <Zap size={16} style={{ color: 'var(--risk-high)' }} />
              Débiteurs à risque
            </h3>
            <Link href="/scoring" style={{ fontSize: '0.8125rem', color: 'var(--primary)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              Scoring <ArrowRight size={13} />
            </Link>
          </div>
          {loading ? (
            <div style={{ padding: '1rem' }}>
              {[...Array(3)].map((_, i) => <div key={i} className="skeleton" style={{ height: 48, marginBottom: 8, borderRadius: 'var(--radius)' }} />)}
            </div>
          ) : topRisky.length === 0 ? (
            <div className="empty-state" style={{ padding: '2rem' }}>
              <TrendingUp size={24} style={{ color: 'var(--foreground-subtle)' }} />
              <span>Aucun débiteur à risque</span>
            </div>
          ) : (
            <div>
              {topRisky.map((d, i) => (
                <Link key={d.debtor_id ?? i} href={`/debtors/${d.debtor_id}`} style={{ display: 'flex', alignItems: 'center', padding: '0.875rem 1.25rem', borderBottom: '1px solid var(--border-muted)', textDecoration: 'none', gap: '0.75rem' }}>
                  <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--border-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 700, color: 'var(--foreground-muted)', flexShrink: 0 }}>
                    {i + 1}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--foreground)' }}>{d.name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--foreground-muted)' }}>{formatCurrency(d.total_due)} dû</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span className={`badge ${riskClass(d.risk_level)}`}>{riskLabel(d.risk_level)}</span>
                    <div style={{ fontSize: '0.7rem', color: 'var(--foreground-subtle)', marginTop: 2 }}>Score {d.risk_score.toFixed(0)}</div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
