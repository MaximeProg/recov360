'use client'
export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Save, ArrowLeft } from 'lucide-react'
import PageHeader from '@/components/ui/PageHeader'
import { invoicesApi, debtorsApi } from '@/lib/api'
import { useToast } from '@/contexts/toast'
import type { Debtor } from '@/types'

export default function NewInvoicePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const toast = useToast()
  const [debtors, setDebtors] = useState<Debtor[]>([])
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    debtor_id: searchParams.get('debtor_id') ?? '',
    amount: '',
    due_date: '',
    currency: 'XOF',
    description: '',
    penalty_rate: '0',
    notes: '',
    invoice_number: '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    debtorsApi.list({ per_page: 100 }).then(d => setDebtors(d.items ?? []))
  }, [])

  function set(key: string, val: string) {
    setForm(f => ({ ...f, [key]: val }))
    setErrors(e => ({ ...e, [key]: '' }))
  }

  function validate() {
    const errs: Record<string, string> = {}
    if (!form.debtor_id) errs.debtor_id = 'Débiteur requis'
    if (!form.amount || isNaN(Number(form.amount)) || Number(form.amount) <= 0) errs.amount = 'Montant invalide'
    if (!form.due_date) errs.due_date = 'Date d\'échéance requise'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return
    setSaving(true)
    try {
      const inv = await invoicesApi.create({
        debtor_id: form.debtor_id,
        amount: Number(form.amount),
        due_date: form.due_date,
        currency: form.currency,
        description: form.description || undefined,
        penalty_rate: Number(form.penalty_rate),
        notes: form.notes || undefined,
        invoice_number: form.invoice_number || undefined,
      })
      toast('success', 'Créance créée', `Facture ${inv.invoice_number}`)
      router.push(`/invoices/${inv.id}`)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? 'Erreur lors de la création'
      toast('error', 'Erreur', msg)
    } finally { setSaving(false) }
  }

  const inp = (key: string) => ({
    className: 'input-base',
    style: errors[key] ? { borderColor: 'var(--status-late)' } : {},
  })

  return (
    <div className="animate-fadeIn" style={{ maxWidth: 640, margin: '0 auto' }}>
      <PageHeader
        title="Nouvelle créance"
        breadcrumbs={[{ label: 'Créances', href: '/invoices' }, { label: 'Nouvelle' }]}
        actions={
          <button className="btn-secondary" onClick={() => router.back()}>
            <ArrowLeft size={15} /> Retour
          </button>
        }
      />

      <div className="card" style={{ padding: '1.75rem' }}>
        <form onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

          {/* Débiteur */}
          <div className="form-group">
            <label className="form-label">Débiteur *</label>
            <select {...inp('debtor_id')} value={form.debtor_id} onChange={e => set('debtor_id', e.target.value)}>
              <option value="">-- Sélectionner un débiteur --</option>
              {debtors.map(d => <option key={d.id} value={d.id}>{d.name}{d.company_name ? ` (${d.company_name})` : ''}</option>)}
            </select>
            {errors.debtor_id && <span className="form-error">{errors.debtor_id}</span>}
          </div>

          {/* Numéro & description */}
          <div className="form-group">
            <label className="form-label">Numéro de facture <span style={{ color: 'var(--foreground-subtle)' }}>(auto-généré si vide)</span></label>
            <input {...inp('invoice_number')} placeholder="FAC-2026-001" value={form.invoice_number} onChange={e => set('invoice_number', e.target.value)} />
          </div>

          <div className="form-group">
            <label className="form-label">Description</label>
            <input {...inp('description')} placeholder="Livraison médicaments Avril 2026" value={form.description} onChange={e => set('description', e.target.value)} />
          </div>

          {/* Amount + currency */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px', gap: '0.75rem' }}>
            <div className="form-group">
              <label className="form-label">Montant *</label>
              <input {...inp('amount')} type="number" min="0" step="1" placeholder="1 500 000" value={form.amount} onChange={e => set('amount', e.target.value)} />
              {errors.amount && <span className="form-error">{errors.amount}</span>}
            </div>
            <div className="form-group">
              <label className="form-label">Devise</label>
              <select className="input-base" value={form.currency} onChange={e => set('currency', e.target.value)}>
                {['XOF', 'XAF', 'EUR', 'USD', 'GNF'].map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
          </div>

          {/* Due date + penalty */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div className="form-group">
              <label className="form-label">Date d'échéance *</label>
              <input {...inp('due_date')} type="date" value={form.due_date} onChange={e => set('due_date', e.target.value)} />
              {errors.due_date && <span className="form-error">{errors.due_date}</span>}
            </div>
            <div className="form-group">
              <label className="form-label">Taux de pénalité (%/mois)</label>
              <input className="input-base" type="number" min="0" max="100" step="0.1" placeholder="0" value={form.penalty_rate} onChange={e => set('penalty_rate', e.target.value)} />
            </div>
          </div>

          {/* Notes */}
          <div className="form-group">
            <label className="form-label">Notes internes</label>
            <textarea className="input-base" rows={3} placeholder="Informations complémentaires…" value={form.notes} onChange={e => set('notes', e.target.value)} style={{ resize: 'vertical' }} />
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
            <button type="button" className="btn-secondary" onClick={() => router.back()}>Annuler</button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving
                ? <span className="animate-spin" style={{ width: 15, height: 15, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', display: 'inline-block' }} />
                : <><Save size={15} /> Enregistrer</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
