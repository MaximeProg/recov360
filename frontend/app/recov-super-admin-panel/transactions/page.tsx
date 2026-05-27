'use client'
import { useEffect, useState } from 'react'
import { RefreshCw, BarChart3, CheckCircle, XCircle, Clock, AlertCircle } from 'lucide-react'
import { superAdminApi } from '@/lib/api'
import { formatCurrency, formatDate } from '@/lib/utils'
import { useToast } from '@/contexts/toast'

interface Transaction {
  id: string; company_id: string; fedapay_id?: string
  amount: number; currency: string; status: string
  description?: string; customer_email?: string; created_at: string
}

const STATUS_MAP: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  approved:  { label: 'Approuvé',   color: '#059669', icon: CheckCircle },
  pending:   { label: 'En attente', color: '#D97706', icon: Clock },
  declined:  { label: 'Refusé',     color: '#DC2626', icon: XCircle },
  cancelled: { label: 'Annulé',     color: '#64748B', icon: XCircle },
}

export default function TransactionsPage() {
  const toast = useToast()
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading]           = useState(true)
  const [total, setTotal]               = useState(0)

  async function load() {
    setLoading(true)
    try {
      const data  = await superAdminApi.transactions()
      const items = Array.isArray(data) ? data : data.items ?? []
      setTransactions(items)
      setTotal(data.total ?? items.length)
    } catch { toast('error', 'Erreur chargement') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const totalRevenue  = transactions.filter(t => t.status === 'approved').reduce((s, t) => s + t.amount, 0)
  const pendingCount  = transactions.filter(t => t.status === 'pending').length
  const approvedCount = transactions.filter(t => t.status === 'approved').length

  const kpis = [
    { label: 'Total transactions', value: total,                        color: '#2563EB', icon: BarChart3    },
    { label: 'Revenus encaissés',  value: formatCurrency(totalRevenue), color: '#059669', icon: CheckCircle  },
    { label: 'Confirmées',         value: approvedCount,                color: '#059669', icon: CheckCircle  },
    { label: 'En attente',         value: pendingCount,                 color: '#D97706', icon: Clock        },
  ]

  return (
    <div className="animate-fadeIn">
      <div className="sa-page-header">
        <div>
          <h1 style={{ margin: 0, fontSize: '1.375rem', fontWeight: 800, color: 'var(--foreground)' }}>Transactions FedaPay</h1>
          <p style={{ margin: '0.25rem 0 0', fontSize: '0.875rem', color: 'var(--foreground-muted)' }}>
            Paiements d'abonnements effectués sur la plateforme
          </p>
        </div>
        <button className="btn-secondary" onClick={load} disabled={loading}>
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Actualiser
        </button>
      </div>

      {/* KPIs — sans bordure colorée en haut */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        {kpis.map((k, i) => {
          const Icon = k.icon
          return (
            <div key={i} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.375rem' }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--foreground-muted)', fontWeight: 500 }}>{k.label}</div>
                <div style={{ padding: '0.375rem', borderRadius: '8px', background: k.color + '18' }}>
                  <Icon size={15} color={k.color} />
                </div>
              </div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--foreground)' }}>{k.value}</div>
            </div>
          )
        })}
      </div>

      <div className="card">
        <div className="table-container" style={{ border: 'none' }}>
          <table>
            <thead>
              <tr>
                <th>Date</th><th>Client</th><th>Montant</th>
                <th>Statut</th><th>Description</th><th>FedaPay ID</th>
              </tr>
            </thead>
            <tbody>
              {loading ? [...Array(8)].map((_, i) => (
                <tr key={i}>{[...Array(6)].map((_, j) => <td key={j}><div className="skeleton" style={{ height: 13, borderRadius: 3 }} /></td>)}</tr>
              )) : transactions.length === 0 ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: '3rem', color: 'var(--foreground-muted)' }}>
                  <BarChart3 size={32} style={{ display: 'block', margin: '0 auto 0.75rem', opacity: 0.3 }} />
                  Aucune transaction enregistrée
                </td></tr>
              ) : transactions.map(tx => {
                const s = STATUS_MAP[tx.status] ?? { label: tx.status, color: '#64748B', icon: AlertCircle }
                const SIcon = s.icon
                return (
                  <tr key={tx.id}>
                    <td style={{ fontSize: '0.8125rem', color: 'var(--foreground-muted)', whiteSpace: 'nowrap' }}>{formatDate(tx.created_at)}</td>
                    <td style={{ fontSize: '0.8125rem' }}>{tx.customer_email ?? <span style={{ color: 'var(--foreground-muted)' }}>–</span>}</td>
                    <td style={{ fontWeight: 700, color: tx.status === 'approved' ? '#059669' : 'var(--foreground)' }}>
                      {formatCurrency(tx.amount)}
                      <span style={{ fontSize: '0.7rem', color: 'var(--foreground-muted)', marginLeft: '0.25rem' }}>{tx.currency}</span>
                    </td>
                    <td>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.8125rem', color: s.color, fontWeight: 500 }}>
                        <SIcon size={13} /> {s.label}
                      </span>
                    </td>
                    <td style={{ fontSize: '0.8125rem', color: 'var(--foreground-muted)', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {tx.description ?? '–'}
                    </td>
                    <td style={{ fontSize: '0.75rem', fontFamily: 'monospace', color: 'var(--foreground-muted)' }}>{tx.fedapay_id ?? '–'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
