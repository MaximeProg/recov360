'use client'
import { Suspense, useEffect, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Plus, FileText, Eye } from 'lucide-react'
import PageHeader from '@/components/ui/PageHeader'
import SearchInput from '@/components/ui/SearchInput'
import Pagination from '@/components/ui/Pagination'
import { invoicesApi } from '@/lib/api'
import { formatCurrency, formatDate, statusClass, statusLabel, truncate } from '@/lib/utils'
import { getPermissions } from '@/lib/permissions'
import { useAuth } from '@/contexts/auth'
import type { Invoice, InvoiceStatus } from '@/types'

const STATUSES: { value: InvoiceStatus | ''; label: string }[] = [
  { value: '', label: 'Tous' },
  { value: 'en_attente', label: 'En attente' },
  { value: 'partiellement_paye', label: 'Partiel' },
  { value: 'en_retard', label: 'En retard' },
  { value: 'solde', label: 'Soldé' },
  { value: 'litige', label: 'Litige' },
]

/* ── Composant interne (utilise useSearchParams) ── */
function InvoicesContent() {
  const { user } = useAuth()
  const perms = getPermissions(user?.role)
  const searchParams = useSearchParams()
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>(searchParams.get('status') ?? '')
  const [loading, setLoading] = useState(true)
  const PER_PAGE = 15

  async function load() {
    setLoading(true)
    try {
      const data = await invoicesApi.list({
        page, per_page: PER_PAGE,
        search: search || undefined,
        status: statusFilter || undefined,
      })
      setInvoices(data.items ?? [])
      setTotal(data.total ?? 0)
    } catch { /* ignore */ }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [page, search, statusFilter])

  function handleSearch(v: string) { setSearch(v); setPage(1) }
  function handleStatus(v: string) { setStatusFilter(v); setPage(1) }

  const totalAmount = invoices.reduce((s, i) => s + i.amount, 0)
  const totalPaid = invoices.reduce((s, i) => s + i.amount_paid, 0)

  return (
    <div className="animate-fadeIn">
      <PageHeader
        title="Créances"
        subtitle={`${total} facture${total > 1 ? 's' : ''}`}
        actions={
          perms.canCreateInvoice ? (
            <Link href="/invoices/new" className="btn-primary">
              <Plus size={16} /> Nouvelle créance
            </Link>
          ) : undefined
        }
      />

      {/* Summary bar */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px,1fr))', gap: '0.75rem', marginBottom: '1rem' }}>
        {[
          { label: 'Total créances', value: formatCurrency(totalAmount), color: 'var(--primary)' },
          { label: 'Total recouvré', value: formatCurrency(totalPaid), color: 'var(--status-paid)' },
          { label: 'Solde restant', value: formatCurrency(totalAmount - totalPaid), color: 'var(--status-late)' },
        ].map(s => (
          <div key={s.label} className="card" style={{ padding: '0.875rem 1rem' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--foreground-muted)', marginBottom: '0.25rem' }}>{s.label}</div>
            <div style={{ fontSize: '1.125rem', fontWeight: 700, color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <SearchInput value={search} onChange={handleSearch} placeholder="N° facture, description…" />
        <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap' }}>
          {STATUSES.map(s => (
            <button
              key={s.value}
              onClick={() => handleStatus(s.value)}
              style={{
                padding: '0.375rem 0.75rem', borderRadius: '999px', fontSize: '0.8125rem', cursor: 'pointer',
                border: statusFilter === s.value ? 'none' : '1.5px solid var(--border)',
                background: statusFilter === s.value ? 'var(--primary)' : 'var(--surface)',
                color: statusFilter === s.value ? 'white' : 'var(--foreground-muted)',
                fontWeight: 500, transition: 'all 0.15s',
              }}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="card">
        <div className="table-container" style={{ border: 'none' }}>
          <table>
            <thead>
              <tr>
                <th>Numéro</th>
                <th>Description</th>
                <th>Montant</th>
                <th>Payé</th>
                <th>Reste dû</th>
                <th>Échéance</th>
                <th>Statut</th>
                <th style={{ width: 40 }}></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [...Array(6)].map((_, i) => (
                  <tr key={i}>{[...Array(8)].map((_, j) => (
                    <td key={j}><div className="skeleton" style={{ height: 14, borderRadius: 4 }} /></td>
                  ))}</tr>
                ))
              ) : invoices.length === 0 ? (
                <tr><td colSpan={8}>
                  <div className="empty-state">
                    <FileText size={32} style={{ color: 'var(--foreground-subtle)' }} />
                    <span>Aucune créance{statusFilter ? ` avec le statut "${statusLabel(statusFilter)}"` : ''}</span>
                    {perms.canCreateInvoice && <Link href="/invoices/new" className="btn-primary"><Plus size={14} /> Créer une créance</Link>}
                  </div>
                </td></tr>
              ) : (
                invoices.map(inv => {
                  const reste = inv.amount + inv.penalty_amount - inv.amount_paid
                  return (
                    <tr key={inv.id}>
                      <td>
                        <span style={{ fontFamily: 'monospace', fontSize: '0.8rem', background: 'var(--border-muted)', padding: '0.2rem 0.4rem', borderRadius: 4 }}>
                          {inv.invoice_number}
                        </span>
                      </td>
                      <td style={{ color: 'var(--foreground-muted)', maxWidth: 180 }}>{truncate(inv.description ?? '–', 35)}</td>
                      <td style={{ fontWeight: 600 }}>{formatCurrency(inv.amount, inv.currency)}</td>
                      <td style={{ color: 'var(--status-paid)' }}>{formatCurrency(inv.amount_paid, inv.currency)}</td>
                      <td style={{ color: reste > 0 ? 'var(--status-late)' : 'var(--status-paid)', fontWeight: 500 }}>
                        {formatCurrency(reste, inv.currency)}
                      </td>
                      <td style={{ color: 'var(--foreground-muted)', whiteSpace: 'nowrap' }}>{formatDate(inv.due_date)}</td>
                      <td><span className={`badge ${statusClass(inv.status)}`}>{statusLabel(inv.status)}</span></td>
                      <td>
                        <Link href={`/invoices/${inv.id}`} className="btn-ghost" style={{ padding: '0.3rem 0.5rem' }}>
                          <Eye size={15} />
                        </Link>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
        <Pagination page={page} totalPages={Math.ceil(total / PER_PAGE)} total={total} perPage={PER_PAGE} onChange={setPage} />
      </div>
    </div>
  )
}

/* ── Export page — Suspense obligatoire pour useSearchParams ── */
export default function InvoicesPage() {
  return (
    <Suspense fallback={
      <div className="animate-fadeIn">
        <div style={{ height: 60, background: 'var(--surface)', borderRadius: 12, marginBottom: '1rem' }} className="skeleton" />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px,1fr))', gap: '0.75rem', marginBottom: '1rem' }}>
          {[...Array(3)].map((_, i) => <div key={i} className="skeleton" style={{ height: 70, borderRadius: 12 }} />)}
        </div>
        <div className="card skeleton" style={{ height: 300 }} />
      </div>
    }>
      <InvoicesContent />
    </Suspense>
  )
}
