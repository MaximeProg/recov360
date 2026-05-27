'use client'
import { useEffect, useState } from 'react'
import { RefreshCw, Zap } from 'lucide-react'
import PageHeader from '@/components/ui/PageHeader'
import { scoringApi } from '@/lib/api'
import { formatCurrency, riskClass, riskLabel, getInitials } from '@/lib/utils'
import { useToast } from '@/contexts/toast'
import type { DebtorScore, RiskSummary } from '@/types'
import Link from 'next/link'

export default function ScoringPage() {
  const toast = useToast()
  const [scores, setScores] = useState<DebtorScore[]>([])
  const [summary, setSummary] = useState<RiskSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [computing, setComputing] = useState(false)

  async function load() {
    setLoading(true)
    try {
      const [data, sum] = await Promise.all([
        scoringApi.topRisky(50),
        scoringApi.summary(),
      ])
      setScores(data)
      setSummary(sum)
    } catch { /* ignore */ }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  async function computeAll() {
    setComputing(true)
    try {
      const result = await scoringApi.computeAll()
      toast('success', 'Scores recalculés', `${result.updated ?? 0} débiteurs mis à jour`)
      load()
    } catch { toast('error', 'Erreur', 'Calcul échoué') }
    finally { setComputing(false) }
  }

  const levels = [
    { key: 'critique', label: 'Critique', color: 'var(--risk-critical)', bg: 'var(--risk-critical-bg)' },
    { key: 'eleve',    label: 'Élevé',    color: 'var(--risk-high)',     bg: 'var(--risk-high-bg)' },
    { key: 'moyen',    label: 'Moyen',    color: 'var(--risk-medium)',   bg: 'var(--risk-medium-bg)' },
    { key: 'faible',   label: 'Faible',   color: 'var(--risk-low)',      bg: 'var(--risk-low-bg)' },
  ] as const

  return (
    <div className="animate-fadeIn">
      <PageHeader
        title="Scoring des débiteurs"
        subtitle={summary
          ? `${summary.total} débiteurs · ${summary.critique} critiques · ${summary.eleve} élevés`
          : 'Chargement…'}
        actions={
          <button className="btn-primary" onClick={computeAll} disabled={computing}>
            {computing
              ? <span className="animate-spin" style={{ width: 15, height: 15, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', display: 'inline-block' }} />
              : <RefreshCw size={15} />}
            Recalculer les scores
          </button>
        }
      />

      {/* Risk summary — data from backend */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem', marginBottom: '1.25rem' }}>
        {levels.map(r => (
          <div key={r.key} style={{ background: r.bg, border: `1px solid ${r.color}30`, borderRadius: 'var(--radius-lg)', padding: '1rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {loading
              ? <div className="skeleton" style={{ width: '100%', height: 48, borderRadius: 'var(--radius)' }} />
              : <>
                  <div style={{ fontSize: '1.75rem', fontWeight: 800, color: r.color }}>
                    {summary?.[r.key] ?? 0}
                  </div>
                  <div>
                    <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: r.color }}>{r.label}</div>
                    <div style={{ fontSize: '0.75rem', color: r.color, opacity: 0.7 }}>débiteurs</div>
                  </div>
                </>
            }
          </div>
        ))}
      </div>

      {/* Scoring table */}
      <div className="card">
        <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Zap size={16} style={{ color: 'var(--primary)' }} />
          <h3 style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 600, color: 'var(--foreground)' }}>
            Classement par risque
          </h3>
        </div>
        <div className="table-container" style={{ border: 'none' }}>
          <table>
            <thead>
              <tr>
                <th style={{ width: 40 }}>#</th>
                <th>Débiteur</th>
                <th>Score</th>
                <th>Niveau</th>
                <th>Dû total</th>
                <th>Payé</th>
                <th>Taux</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [...Array(8)].map((_, i) => (
                  <tr key={i}>{[...Array(7)].map((_, j) => <td key={j}><div className="skeleton" style={{ height: 14, borderRadius: 4 }} /></td>)}</tr>
                ))
              ) : scores.length === 0 ? (
                <tr><td colSpan={7}>
                  <div className="empty-state" style={{ padding: '3rem' }}>
                    <Zap size={28} style={{ color: 'var(--foreground-subtle)' }} />
                    <span>Aucun score calculé</span>
                    <button className="btn-primary" onClick={computeAll}>Calculer maintenant</button>
                  </div>
                </td></tr>
              ) : (
                scores.map((s, i) => (
                  <tr key={s.debtor_id}>
                    <td style={{ color: 'var(--foreground-muted)', fontWeight: 500 }}>{i + 1}</td>
                    <td>
                      <Link href={`/debtors/${s.debtor_id}`} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none' }}>
                        <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'var(--primary-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 700, color: 'var(--primary)', flexShrink: 0 }}>
                          {getInitials(s.name)}
                        </div>
                        <span style={{ fontWeight: 500, color: 'var(--foreground)' }}>{s.name}</span>
                      </Link>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div style={{ flex: 1, maxWidth: 80 }}>
                          <div className="progress-bar" style={{ height: 5 }}>
                            <div className="progress-fill" style={{
                              width: `${s.risk_score}%`,
                              background: s.risk_level === 'critique' ? 'var(--risk-critical)'
                                : s.risk_level === 'eleve' ? 'var(--risk-high)'
                                : s.risk_level === 'moyen' ? 'var(--risk-medium)'
                                : 'var(--risk-low)',
                            }} />
                          </div>
                        </div>
                        <span style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--foreground)' }}>{s.risk_score.toFixed(0)}</span>
                      </div>
                    </td>
                    <td><span className={`badge ${riskClass(s.risk_level)}`}>{riskLabel(s.risk_level)}</span></td>
                    <td style={{ fontWeight: 600 }}>{formatCurrency(s.total_due)}</td>
                    <td style={{ color: 'var(--status-paid)' }}>{formatCurrency(s.total_paid)}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div className="progress-bar" style={{ height: 5, width: 60 }}>
                          <div className="progress-fill" style={{
                            width: `${s.payment_rate}%`,
                            background: s.payment_rate >= 70 ? 'var(--status-paid)' : 'var(--status-late)',
                          }} />
                        </div>
                        <span style={{ fontSize: '0.8125rem', fontWeight: 500, color: 'var(--foreground-muted)' }}>
                          {s.payment_rate.toFixed(0)}%
                        </span>
                      </div>
                    </td>
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
