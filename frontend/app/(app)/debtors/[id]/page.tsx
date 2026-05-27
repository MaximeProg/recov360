'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { Phone, Mail, MapPin, FileText, TrendingUp, Plus, MessageSquare, Send } from 'lucide-react'
import PageHeader from '@/components/ui/PageHeader'
import StatCard from '@/components/ui/StatCard'
import Modal from '@/components/ui/Modal'
import { debtorsApi, invoicesApi, notificationsApi } from '@/lib/api'
import { formatCurrency, formatDate, statusClass, statusLabel, riskClass, riskLabel, recoveryRate, getInitials } from '@/lib/utils'
import { useToast } from '@/contexts/toast'
import type { Debtor, Invoice } from '@/types'
import Link from 'next/link'

export default function DebtorDetailPage() {
  const { id } = useParams<{ id: string }>()
  const toast = useToast()
  const [debtor, setDebtor] = useState<Debtor | null>(null)
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'overview' | 'invoices' | 'notes'>('overview')
  const [showNote, setShowNote] = useState(false)
  const [showReminder, setShowReminder] = useState(false)
  const [noteContent, setNoteContent] = useState('')
  const [reminderInvoiceId, setReminderInvoiceId] = useState('')
  const [reminderChannel, setReminderChannel] = useState('email')
  const [reminderMsg, setReminderMsg] = useState('')
  const [saving, setSaving] = useState(false)

  async function load() {
    setLoading(true)
    try {
      const [d, inv] = await Promise.all([
        debtorsApi.get(id),
        invoicesApi.list({ debtor_id: id, per_page: 50 }),
      ])
      setDebtor(d)
      setInvoices(inv.items ?? [])
    } catch { /* ignore */ }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [id])

  const rate = debtor ? recoveryRate(debtor.total_paid, debtor.total_due) : 0

  async function addNote(e: React.FormEvent) {
    e.preventDefault()
    if (!noteContent.trim() || !debtor) return
    setSaving(true)
    try {
      await debtorsApi.addNote(id, noteContent, 'Vous')
      toast('success', 'Note ajoutée')
      setNoteContent(''); setShowNote(false); load()
    } catch { toast('error', 'Erreur', 'Impossible d\'ajouter la note') }
    finally { setSaving(false) }
  }

  async function sendReminder(e: React.FormEvent) {
    e.preventDefault()
    if (!reminderInvoiceId) return
    setSaving(true)
    try {
      await notificationsApi.sendReminder({ invoice_id: reminderInvoiceId, channel: reminderChannel, message: reminderMsg || undefined })
      toast('success', 'Relance envoyée !')
      setShowReminder(false); setReminderMsg(''); setReminderInvoiceId('')
    } catch { toast('error', 'Erreur', 'Envoi échoué') }
    finally { setSaving(false) }
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {[...Array(4)].map((_, i) => <div key={i} className="skeleton" style={{ height: 80, borderRadius: 'var(--radius-lg)' }} />)}
      </div>
    )
  }

  if (!debtor) return <div className="empty-state">Débiteur introuvable</div>

  return (
    <div className="animate-fadeIn">
      <PageHeader
        title={debtor.name}
        subtitle={debtor.company_name}
        breadcrumbs={[{ label: 'Débiteurs', href: '/debtors' }, { label: debtor.name }]}
        actions={
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button className="btn-secondary" onClick={() => setShowNote(true)}>
              <MessageSquare size={15} /> Ajouter note
            </button>
            <button className="btn-primary" onClick={() => setShowReminder(true)}>
              <Send size={15} /> Envoyer relance
            </button>
          </div>
        }
      />

      {/* Profile card */}
      <div className="card" style={{ padding: '1.5rem', marginBottom: '1rem', display: 'flex', gap: '1.25rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem', fontWeight: 700, color: 'white', flexShrink: 0 }}>
          {getInitials(debtor.name)}
        </div>
        <div style={{ flex: 1, minWidth: 200 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
            <h2 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 700, color: 'var(--foreground)' }}>{debtor.name}</h2>
            <span className={`badge ${riskClass(debtor.risk_level)}`}>{riskLabel(debtor.risk_level)}</span>
            <span className="badge" style={{ background: 'var(--border-muted)', color: 'var(--foreground-muted)' }}>{debtor.category}</span>
          </div>
          <div style={{ display: 'flex', gap: '1.25rem', flexWrap: 'wrap' }}>
            {debtor.phone && <span style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.875rem', color: 'var(--foreground-muted)' }}><Phone size={14} />{debtor.phone}</span>}
            {debtor.email && <span style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.875rem', color: 'var(--foreground-muted)' }}><Mail size={14} />{debtor.email}</span>}
            {debtor.city && <span style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.875rem', color: 'var(--foreground-muted)' }}><MapPin size={14} />{debtor.city}</span>}
          </div>
          {/* Progress bar */}
          <div style={{ marginTop: '0.875rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--foreground-muted)' }}>Taux de recouvrement</span>
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: rate >= 70 ? 'var(--status-paid)' : rate >= 30 ? 'var(--risk-medium)' : 'var(--status-late)' }}>{rate}%</span>
            </div>
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${rate}%`, background: rate >= 70 ? 'var(--status-paid)' : rate >= 30 ? 'var(--risk-medium)' : 'var(--status-late)' }} />
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem', minWidth: 160 }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--foreground-muted)' }}>Score de risque</div>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--foreground)', lineHeight: 1 }}>{debtor.risk_score.toFixed(0)}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--foreground-subtle)' }}>/ 100 points</div>
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.75rem', marginBottom: '1rem' }}>
        <StatCard title="Total dû" value={formatCurrency(debtor.total_due)} icon={<FileText size={16} />} color="var(--primary)" />
        <StatCard title="Total payé" value={formatCurrency(debtor.total_paid)} icon={<TrendingUp size={16} />} color="var(--status-paid)" />
        <StatCard title="Reste dû" value={formatCurrency(debtor.total_due - debtor.total_paid)} icon={<FileText size={16} />} color="var(--status-late)" />
        <StatCard title="Factures" value={invoices.length} icon={<FileText size={16} />} color="var(--status-partial)" />
      </div>

      {/* Tabs */}
      <div className="card">
        <div style={{ padding: '0.875rem 1.25rem', borderBottom: '1px solid var(--border)', display: 'flex', gap: '0.25rem' }}>
          {(['overview', 'invoices', 'notes'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} className="tab-trigger" style={{ ...(tab === t ? { background: 'var(--surface)', color: 'var(--foreground)', boxShadow: 'var(--shadow-sm)' } : {}) }}>
              {t === 'overview' ? 'Aperçu' : t === 'invoices' ? `Factures (${invoices.length})` : `Notes (${debtor.notes?.length ?? 0})`}
            </button>
          ))}
        </div>

        <div style={{ padding: '1.25rem' }}>
          {tab === 'invoices' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '0.75rem' }}>
                <Link href={`/invoices/new?debtor_id=${id}`} className="btn-primary">
                  <Plus size={15} /> Nouvelle facture
                </Link>
              </div>
              {invoices.length === 0 ? (
                <div className="empty-state"><FileText size={24} style={{ color: 'var(--foreground-subtle)' }} /><span>Aucune facture</span></div>
              ) : (
                <div className="table-container">
                  <table>
                    <thead>
                      <tr><th>Numéro</th><th>Montant</th><th>Payé</th><th>Échéance</th><th>Statut</th><th></th></tr>
                    </thead>
                    <tbody>
                      {invoices.map(inv => (
                        <tr key={inv.id}>
                          <td style={{ fontWeight: 500 }}>{inv.invoice_number}</td>
                          <td>{formatCurrency(inv.amount)}</td>
                          <td style={{ color: 'var(--status-paid)' }}>{formatCurrency(inv.amount_paid)}</td>
                          <td>{formatDate(inv.due_date)}</td>
                          <td><span className={`badge ${statusClass(inv.status)}`}>{statusLabel(inv.status)}</span></td>
                          <td><Link href={`/invoices/${inv.id}`} className="btn-ghost" style={{ padding: '0.25rem 0.5rem' }}><FileText size={14} /></Link></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {tab === 'notes' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '0.75rem' }}>
                <button className="btn-secondary" onClick={() => setShowNote(true)}><Plus size={14} /> Ajouter</button>
              </div>
              {!debtor.notes?.length ? (
                <div className="empty-state"><MessageSquare size={24} style={{ color: 'var(--foreground-subtle)' }} /><span>Aucune note</span></div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {[...debtor.notes].reverse().map((n, i) => (
                    <div key={i} style={{ background: 'var(--border-muted)', borderRadius: 'var(--radius)', padding: '0.875rem 1rem', borderLeft: '3px solid var(--primary)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.375rem' }}>
                        <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--foreground)' }}>{n.author}</span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--foreground-subtle)' }}>{formatDate(n.created_at, 'dd/MM/yyyy HH:mm')}</span>
                      </div>
                      <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--foreground-muted)', lineHeight: 1.5 }}>{n.content}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === 'overview' && (
            <div style={{ display: 'grid', gap: '0.75rem' }}>
              {[
                { label: 'Catégorie', value: debtor.category },
                { label: 'Pays', value: debtor.country },
                { label: 'Ville', value: debtor.city },
                { label: 'Tags', value: debtor.tags?.join(', ') },
                { label: 'Enregistré le', value: formatDate(debtor.created_at) },
              ].filter(r => r.value).map(r => (
                <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.625rem 0', borderBottom: '1px solid var(--border-muted)', fontSize: '0.875rem' }}>
                  <span style={{ color: 'var(--foreground-muted)' }}>{r.label}</span>
                  <span style={{ fontWeight: 500, color: 'var(--foreground)' }}>{r.value}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Add note modal */}
      <Modal open={showNote} onClose={() => setShowNote(false)} title="Ajouter une note">
        <form onSubmit={addNote} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="form-group">
            <label className="form-label">Note</label>
            <textarea className="input-base" rows={4} placeholder="Écrire une note…" value={noteContent} onChange={e => setNoteContent(e.target.value)} style={{ resize: 'vertical' }} />
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
            <button type="button" className="btn-secondary" onClick={() => setShowNote(false)}>Annuler</button>
            <button type="submit" className="btn-primary" disabled={saving || !noteContent.trim()}>Enregistrer</button>
          </div>
        </form>
      </Modal>

      {/* Reminder modal */}
      <Modal open={showReminder} onClose={() => setShowReminder(false)} title="Envoyer une relance">
        <form onSubmit={sendReminder} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="form-group">
            <label className="form-label">Facture</label>
            <select className="input-base" value={reminderInvoiceId} onChange={e => setReminderInvoiceId(e.target.value)}>
              <option value="">-- Choisir une facture --</option>
              {invoices.filter(i => i.status !== 'solde').map(i => (
                <option key={i.id} value={i.id}>{i.invoice_number} — {formatCurrency(i.amount - i.amount_paid)}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Canal</label>
            <select className="input-base" value={reminderChannel} onChange={e => setReminderChannel(e.target.value)}>
              <option value="email">Email</option>
              <option value="sms">SMS</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Message personnalisé (optionnel)</label>
            <textarea className="input-base" rows={3} placeholder="Laisser vide pour utiliser le template…" value={reminderMsg} onChange={e => setReminderMsg(e.target.value)} style={{ resize: 'vertical' }} />
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
            <button type="button" className="btn-secondary" onClick={() => setShowReminder(false)}>Annuler</button>
            <button type="submit" className="btn-primary" disabled={saving || !reminderInvoiceId}>
              <Send size={14} /> Envoyer
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
