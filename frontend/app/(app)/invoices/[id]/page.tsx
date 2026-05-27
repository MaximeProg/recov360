'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { CreditCard, Send, Download, Plus, Check, AlertTriangle } from 'lucide-react'
import PageHeader from '@/components/ui/PageHeader'
import StatCard from '@/components/ui/StatCard'
import Modal from '@/components/ui/Modal'
import { invoicesApi, notificationsApi } from '@/lib/api'
import { formatCurrency, formatDate, statusClass, statusLabel, paymentMethodLabel, recoveryRate } from '@/lib/utils'
import { getPermissions } from '@/lib/permissions'
import { useToast } from '@/contexts/toast'
import { useAuth } from '@/contexts/auth'
import type { Invoice, Payment } from '@/types'

export default function InvoiceDetailPage() {
  const { id } = useParams<{ id: string }>()
  const toast = useToast()
  const { user } = useAuth()
  const perms = getPermissions(user?.role)
  const [invoice, setInvoice] = useState<Invoice | null>(null)
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)
  const [showPayment, setShowPayment] = useState(false)
  const [showReminder, setShowReminder] = useState(false)
  const [saving, setSaving] = useState(false)
  const [payForm, setPayForm] = useState({ amount: '', payment_date: new Date().toISOString().slice(0, 10), method: 'virement', reference: '', notes: '' })
  const [reminderChannel, setReminderChannel] = useState('email')
  const [reminderMsg, setReminderMsg] = useState('')

  async function load() {
    setLoading(true)
    try {
      const [inv, pays] = await Promise.all([invoicesApi.get(id), invoicesApi.payments(id)])
      setInvoice(inv)
      setPayments(Array.isArray(pays) ? pays : [])
    } catch { /* ignore */ }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [id])

  async function addPayment(e: React.FormEvent) {
    e.preventDefault()
    if (!payForm.amount || !invoice) return
    setSaving(true)
    try {
      await invoicesApi.addPayment(id, {
        amount: Number(payForm.amount),
        payment_date: payForm.payment_date,
        method: payForm.method,
        reference: payForm.reference || undefined,
        notes: payForm.notes || undefined,
      })
      toast('success', 'Paiement enregistré', formatCurrency(Number(payForm.amount)))
      setShowPayment(false)
      setPayForm({ amount: '', payment_date: new Date().toISOString().slice(0, 10), method: 'virement', reference: '', notes: '' })
      load()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? 'Erreur'
      toast('error', 'Erreur', msg)
    } finally { setSaving(false) }
  }

  async function sendReminder(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      await notificationsApi.sendReminder({ invoice_id: id, channel: reminderChannel, message: reminderMsg || undefined })
      toast('success', 'Relance envoyée !')
      setShowReminder(false)
    } catch { toast('error', 'Erreur', 'Envoi échoué') }
    finally { setSaving(false) }
  }

  if (loading || !invoice) return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {[...Array(4)].map((_, i) => <div key={i} className="skeleton" style={{ height: 80, borderRadius: 'var(--radius-lg)' }} />)}
    </div>
  )

  const reste = invoice.amount + invoice.penalty_amount - invoice.amount_paid
  const rate = recoveryRate(invoice.amount_paid, invoice.amount + invoice.penalty_amount)
  const isSolde = invoice.status === 'solde'

  return (
    <div className="animate-fadeIn">
      <PageHeader
        title={invoice.invoice_number}
        subtitle={invoice.description}
        breadcrumbs={[{ label: 'Créances', href: '/invoices' }, { label: invoice.invoice_number }]}
        actions={
          !isSolde ? (
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button className="btn-secondary" onClick={() => setShowReminder(true)}>
                <Send size={15} /> Relancer
              </button>
              {perms.canRecordPayment && (
                <button className="btn-primary" onClick={() => setShowPayment(true)}>
                  <Plus size={15} /> Enregistrer paiement
                </button>
              )}
            </div>
          ) : (
            <span className="badge badge-paid" style={{ fontSize: '0.875rem', padding: '0.4rem 1rem' }}>
              <Check size={14} /> Soldée
            </span>
          )
        }
      />

      {/* Status banner */}
      {invoice.status === 'en_retard' && (
        <div style={{ background: 'var(--status-late-bg)', border: '1px solid var(--status-late)', borderRadius: 'var(--radius)', padding: '0.75rem 1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--status-late)' }}>
          <AlertTriangle size={16} />
          <span style={{ fontWeight: 500, fontSize: '0.875rem' }}>Cette créance est en retard depuis le {formatDate(invoice.due_date)}.</span>
        </div>
      )}

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: '0.75rem', marginBottom: '1rem' }}>
        <StatCard title="Montant total" value={formatCurrency(invoice.amount, invoice.currency)} color="var(--primary)" />
        <StatCard title="Montant payé" value={formatCurrency(invoice.amount_paid, invoice.currency)} color="var(--status-paid)" />
        <StatCard title="Reste dû" value={formatCurrency(reste, invoice.currency)} color={reste > 0 ? 'var(--status-late)' : 'var(--status-paid)'} />
        {invoice.penalty_amount > 0 && <StatCard title="Pénalités" value={formatCurrency(invoice.penalty_amount, invoice.currency)} color="var(--status-dispute)" />}
      </div>

      {/* Progress */}
      <div className="card" style={{ padding: '1.25rem', marginBottom: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.625rem' }}>
          <span style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--foreground)' }}>Progression du recouvrement</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span className={`badge ${statusClass(invoice.status)}`}>{statusLabel(invoice.status)}</span>
            <span style={{ fontWeight: 700, fontSize: '1rem', color: rate >= 100 ? 'var(--status-paid)' : 'var(--foreground)' }}>{rate}%</span>
          </div>
        </div>
        <div className="progress-bar" style={{ height: 10 }}>
          <div className="progress-fill" style={{
            width: `${rate}%`,
            background: rate >= 100 ? 'var(--status-paid)' : rate >= 50 ? 'var(--primary)' : 'var(--status-late)',
          }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem', fontSize: '0.75rem', color: 'var(--foreground-muted)' }}>
          <span>0 {invoice.currency}</span>
          <span>{formatCurrency(invoice.amount + invoice.penalty_amount, invoice.currency)}</span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '1rem' }}>
        {/* Payments list */}
        <div className="card">
          <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h3 style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 600, color: 'var(--foreground)' }}>
              Historique des paiements
            </h3>
            {!isSolde && perms.canRecordPayment && (
              <button className="btn-primary" style={{ padding: '0.375rem 0.75rem', fontSize: '0.8125rem' }} onClick={() => setShowPayment(true)}>
                <Plus size={13} /> Paiement
              </button>
            )}
          </div>
          {payments.length === 0 ? (
            <div className="empty-state" style={{ padding: '2.5rem' }}>
              <CreditCard size={28} style={{ color: 'var(--foreground-subtle)' }} />
              <span>Aucun paiement enregistré</span>
            </div>
          ) : (
            <div>
              {payments.map(p => (
                <div key={p.id} style={{ display: 'flex', alignItems: 'center', padding: '0.875rem 1.25rem', borderBottom: '1px solid var(--border-muted)', gap: '0.75rem' }}>
                  <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--status-paid-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <CreditCard size={16} style={{ color: 'var(--status-paid)' }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--foreground)' }}>{paymentMethodLabel(p.method)}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--foreground-muted)' }}>{formatDate(p.payment_date)}{p.reference ? ` · ${p.reference}` : ''}</div>
                  </div>
                  <div style={{ fontWeight: 700, color: 'var(--status-paid)', fontSize: '0.9375rem' }}>+{formatCurrency(p.amount, invoice.currency)}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Invoice info */}
        <div className="card" style={{ padding: '1.25rem', alignSelf: 'flex-start' }}>
          <h3 style={{ margin: '0 0 1rem', fontSize: '0.9375rem', fontWeight: 600, color: 'var(--foreground)' }}>Détails</h3>
          {[
            { label: 'Numéro', value: invoice.invoice_number },
            { label: 'Devise', value: invoice.currency },
            { label: 'Taux pénalité', value: `${invoice.penalty_rate}%/mois` },
            { label: 'Date d\'échéance', value: formatDate(invoice.due_date) },
            invoice.paid_date ? { label: 'Date de solde', value: formatDate(invoice.paid_date) } : null,
            { label: 'Niveau de relance', value: `Niveau ${invoice.reminder_level}` },
            { label: 'Créée le', value: formatDate(invoice.created_at) },
            invoice.notes ? { label: 'Notes', value: invoice.notes } : null,
          ].filter(Boolean).map(r => (
            <div key={r!.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid var(--border-muted)', fontSize: '0.875rem', gap: '0.5rem' }}>
              <span style={{ color: 'var(--foreground-muted)', flexShrink: 0 }}>{r!.label}</span>
              <span style={{ fontWeight: 500, color: 'var(--foreground)', textAlign: 'right' }}>{r!.value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Payment modal */}
      <Modal open={showPayment} onClose={() => setShowPayment(false)} title="Enregistrer un paiement">
        <form onSubmit={addPayment} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ background: 'var(--border-muted)', borderRadius: 'var(--radius)', padding: '0.75rem 1rem', fontSize: '0.875rem', color: 'var(--foreground-muted)' }}>
            Reste dû : <strong style={{ color: 'var(--status-late)' }}>{formatCurrency(reste, invoice.currency)}</strong>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div className="form-group">
              <label className="form-label">Montant *</label>
              <input className="input-base" type="number" min="1" max={reste} step="1" placeholder={String(reste)} value={payForm.amount} onChange={e => setPayForm(f => ({ ...f, amount: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Date</label>
              <input className="input-base" type="date" value={payForm.payment_date} onChange={e => setPayForm(f => ({ ...f, payment_date: e.target.value }))} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Mode de paiement</label>
            <select className="input-base" value={payForm.method} onChange={e => setPayForm(f => ({ ...f, method: e.target.value }))}>
              {['especes', 'virement', 'cheque', 'mobile_money', 'autre'].map(m => <option key={m} value={m}>{paymentMethodLabel(m)}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Référence (optionnel)</label>
            <input className="input-base" placeholder="N° chèque, virement…" value={payForm.reference} onChange={e => setPayForm(f => ({ ...f, reference: e.target.value }))} />
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
            <button type="button" className="btn-secondary" onClick={() => setShowPayment(false)}>Annuler</button>
            <button type="submit" className="btn-primary" disabled={saving || !payForm.amount}>
              {saving ? <span className="animate-spin" style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', display: 'inline-block' }} /> : null}
              <Check size={14} /> Enregistrer
            </button>
          </div>
        </form>
      </Modal>

      {/* Reminder modal */}
      <Modal open={showReminder} onClose={() => setShowReminder(false)} title="Envoyer une relance">
        <form onSubmit={sendReminder} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="form-group">
            <label className="form-label">Canal</label>
            <select className="input-base" value={reminderChannel} onChange={e => setReminderChannel(e.target.value)}>
              <option value="email">Email</option>
              <option value="sms">SMS</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Message personnalisé (optionnel)</label>
            <textarea className="input-base" rows={3} placeholder="Laisser vide pour utiliser le template configuré…" value={reminderMsg} onChange={e => setReminderMsg(e.target.value)} style={{ resize: 'vertical' }} />
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
            <button type="button" className="btn-secondary" onClick={() => setShowReminder(false)}>Annuler</button>
            <button type="submit" className="btn-primary" disabled={saving}>
              <Send size={14} /> Envoyer
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
