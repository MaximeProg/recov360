'use client'
import { useEffect, useState } from 'react'
import { Download, RefreshCw, BarChart3, TrendingUp, Users } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area, Legend,
} from 'recharts'
import PageHeader from '@/components/ui/PageHeader'
import StatCard from '@/components/ui/StatCard'
import { reportsApi, downloadBlob } from '@/lib/api'
import { formatCurrency } from '@/lib/utils'
import { useToast } from '@/contexts/toast'
import type { Dashboard, MonthlyEvolution, AgentReport } from '@/types'

export default function ReportsPage() {
  const toast = useToast()
  const [kpis, setKpis] = useState<Dashboard | null>(null)
  const [evolution, setEvolution] = useState<MonthlyEvolution[]>([])
  const [agents, setAgents] = useState<AgentReport[]>([])
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState<'csv' | 'excel' | null>(null)

  async function load() {
    setLoading(true)
    try {
      const [k, ev, ag] = await Promise.all([
        reportsApi.dashboard(),
        reportsApi.monthlyEvolution(),
        reportsApi.agents(),
      ])
      setKpis(k)
      setEvolution(Array.isArray(ev) ? ev.reverse() : ev)
      setAgents(ag)
    } catch { /* ignore */ }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  async function exportFile(type: 'csv' | 'excel') {
    setExporting(type)
    try {
      const data = type === 'csv' ? await reportsApi.exportCsv() : await reportsApi.exportExcel()
      downloadBlob(data, `creances_${new Date().toISOString().slice(0,10)}.${type === 'csv' ? 'csv' : 'xlsx'}`)
      toast('success', 'Export téléchargé')
    } catch { toast('error', 'Erreur', 'Export échoué') }
    finally { setExporting(null) }
  }

  const barData = evolution.map(e => ({
    month: e.month,
    'Créances': e.total,
    'Recouvré': e.paid,
  }))

  return (
    <div className="animate-fadeIn">
      <PageHeader
        title="Rapports"
        subtitle="Analyse complète de votre activité de recouvrement"
        actions={
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button className="btn-secondary" onClick={() => load()} disabled={loading}>
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Actualiser
            </button>
            <button className="btn-secondary" onClick={() => exportFile('csv')} disabled={!!exporting}>
              <Download size={14} /> {exporting === 'csv' ? 'Export…' : 'CSV'}
            </button>
            <button className="btn-primary" onClick={() => exportFile('excel')} disabled={!!exporting}>
              <Download size={14} /> {exporting === 'excel' ? 'Export…' : 'Excel'}
            </button>
          </div>
        }
      />

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px,1fr))', gap: '0.875rem', marginBottom: '1.5rem' }}>
        <StatCard title="Total créances" value={kpis ? formatCurrency(kpis.total_creances) : '–'} icon={<BarChart3 size={18} />} color="var(--primary)" loading={loading} />
        <StatCard title="Total recouvré" value={kpis ? formatCurrency(kpis.total_recovered) : '–'} icon={<TrendingUp size={18} />} color="var(--status-paid)" trend={kpis?.recovery_rate} loading={loading} />
        <StatCard title="En retard" value={kpis ? formatCurrency(kpis.total_late) : '–'} icon={<BarChart3 size={18} />} color="var(--status-late)" loading={loading} />
        <StatCard title="Taux de recouvrement" value={kpis ? `${kpis.recovery_rate.toFixed(1)}%` : '–'} icon={<TrendingUp size={18} />} color="var(--status-partial)" loading={loading} />
        <StatCard title="Débiteurs" value={kpis?.total_debtors ?? '–'} icon={<Users size={18} />} color="var(--primary)" loading={loading} />
        <StatCard title="Factures total" value={kpis?.total_invoices ?? '–'} icon={<BarChart3 size={18} />} color="var(--foreground-muted)" loading={loading} />
      </div>

      {/* Répartition par statut */}
      {kpis && (
        <div className="card" style={{ padding: '1.25rem', marginBottom: '1.25rem' }}>
          <h3 style={{ margin: '0 0 1rem', fontSize: '0.9375rem', fontWeight: 600, color: 'var(--foreground)' }}>
            Répartition par statut
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px,1fr))', gap: '0.75rem' }}>
            {Object.entries(kpis.by_status).map(([status, data]) => {
              const colors: Record<string, string> = {
                en_attente: 'var(--status-pending)', partiellement_paye: 'var(--status-partial)',
                en_retard: 'var(--status-late)', solde: 'var(--status-paid)', litige: 'var(--status-dispute)',
              }
              const labels: Record<string, string> = {
                en_attente: 'En attente', partiellement_paye: 'Partiel',
                en_retard: 'En retard', solde: 'Soldé', litige: 'Litige',
              }
              return (
                <div key={status} style={{ background: 'var(--border-muted)', borderRadius: 'var(--radius)', padding: '0.875rem', borderLeft: `3px solid ${colors[status]}` }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--foreground-muted)', marginBottom: '0.25rem' }}>{labels[status]}</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 700, color: colors[status] }}>{data.count}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--foreground-subtle)', marginTop: '0.125rem' }}>{formatCurrency(data.amount)}</div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Charts */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
        <div className="card" style={{ padding: '1.25rem' }}>
          <h3 style={{ margin: '0 0 1rem', fontSize: '0.9375rem', fontWeight: 600, color: 'var(--foreground)' }}>Évolution mensuelle</h3>
          {loading ? <div className="skeleton" style={{ height: 220, borderRadius: 'var(--radius)' }} /> : (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={evolution} margin={{ top: 5, right: 5, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="rG1" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563EB" stopOpacity={0.15} /><stop offset="95%" stopColor="#2563EB" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="rG2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.15} /><stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--foreground-muted)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--foreground-muted)' }} axisLine={false} tickLine={false} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', fontSize: 12 }} formatter={(v) => [formatCurrency(v as number), '']} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
                <Area type="monotone" dataKey="total" name="Créances" stroke="#2563EB" strokeWidth={2} fill="url(#rG1)" />
                <Area type="monotone" dataKey="paid" name="Recouvré" stroke="#10B981" strokeWidth={2} fill="url(#rG2)" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="card" style={{ padding: '1.25rem' }}>
          <h3 style={{ margin: '0 0 1rem', fontSize: '0.9375rem', fontWeight: 600, color: 'var(--foreground)' }}>Comparaison mensuelle</h3>
          {loading ? <div className="skeleton" style={{ height: 220, borderRadius: 'var(--radius)' }} /> : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={barData} margin={{ top: 5, right: 5, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--foreground-muted)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--foreground-muted)' }} axisLine={false} tickLine={false} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', fontSize: 12 }} formatter={(v) => [formatCurrency(v as number), '']} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="Créances" fill="#2563EB" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Recouvré" fill="#10B981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Agent performance */}
      <div className="card">
        <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Users size={16} style={{ color: 'var(--primary)' }} />
          <h3 style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 600, color: 'var(--foreground)' }}>Performance par agent</h3>
        </div>
        <div className="table-container" style={{ border: 'none' }}>
          <table>
            <thead>
              <tr><th>Agent</th><th>Factures gérées</th><th>Montant recouvré</th></tr>
            </thead>
            <tbody>
              {loading ? [...Array(3)].map((_, i) => (
                <tr key={i}>{[...Array(3)].map((_, j) => <td key={j}><div className="skeleton" style={{ height: 14, borderRadius: 4 }} /></td>)}</tr>
              )) : agents.length === 0 ? (
                <tr><td colSpan={3}><div className="empty-state" style={{ padding: '2rem' }}><span>Aucune donnée</span></div></td></tr>
              ) : (
                agents.map(a => (
                  <tr key={a.agent_id}>
                    <td style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{a.agent_id.slice(0, 8)}…</td>
                    <td style={{ fontWeight: 500 }}>{a.total_invoices}</td>
                    <td style={{ color: 'var(--status-paid)', fontWeight: 600 }}>{formatCurrency(a.total_recovered)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
