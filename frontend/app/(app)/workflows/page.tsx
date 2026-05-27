'use client'
import { useEffect, useState } from 'react'
import { Plus, Workflow, Mail, MessageSquare, Clock, ToggleLeft, ToggleRight, Trash2, Calendar, AlertCircle } from 'lucide-react'
import PageHeader from '@/components/ui/PageHeader'
import Modal from '@/components/ui/Modal'
import { workflowsApi } from '@/lib/api'
import { formatDate } from '@/lib/utils'
import { useToast } from '@/contexts/toast'
import type { WorkflowRule, MessageTemplate, PromiseToPay } from '@/types'

type Tab = 'rules' | 'templates' | 'promises'

export default function WorkflowsPage() {
  const toast = useToast()
  const [tab, setTab] = useState<Tab>('rules')
  const [rules, setRules] = useState<WorkflowRule[]>([])
  const [templates, setTemplates] = useState<MessageTemplate[]>([])
  const [promises, setPromises] = useState<PromiseToPay[]>([])
  const [loading, setLoading] = useState(true)
  const [showRuleModal, setShowRuleModal] = useState(false)
  const [showTemplateModal, setShowTemplateModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [ruleForm, setRuleForm] = useState({ name: '', trigger_days: '-7', channel: 'email', level: 'niveau_1', template_id: '' })
  const [tplForm, setTplForm] = useState({ name: '', channel: 'email', subject: '', body: '', variables: 'debtor_name,invoice_number,amount,due_date' })

  async function load() {
    setLoading(true)
    try {
      const [r, t, p] = await Promise.all([
        workflowsApi.listRules(),
        workflowsApi.listTemplates(),
        workflowsApi.listPromises({ per_page: 50 }),
      ])
      setRules(r)
      setTemplates(t)
      setPromises(p.items ?? [])
    } catch { /* ignore */ }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  async function createRule(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      await workflowsApi.createRule({
        name: ruleForm.name, trigger_days: Number(ruleForm.trigger_days),
        channel: ruleForm.channel, level: ruleForm.level,
        template_id: ruleForm.template_id || undefined,
      })
      toast('success', 'Règle créée')
      setShowRuleModal(false)
      setRuleForm({ name: '', trigger_days: '-7', channel: 'email', level: 'niveau_1', template_id: '' })
      load()
    } catch { toast('error', 'Erreur', 'Impossible de créer la règle') }
    finally { setSaving(false) }
  }

  async function createTemplate(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      await workflowsApi.createTemplate({
        name: tplForm.name, channel: tplForm.channel,
        subject: tplForm.subject || undefined, body: tplForm.body,
        variables: tplForm.variables.split(',').map(v => v.trim()).filter(Boolean),
      })
      toast('success', 'Template créé')
      setShowTemplateModal(false)
      setTplForm({ name: '', channel: 'email', subject: '', body: '', variables: 'debtor_name,invoice_number,amount,due_date' })
      load()
    } catch { toast('error', 'Erreur', 'Impossible de créer le template') }
    finally { setSaving(false) }
  }

  async function deleteRule(id: string) {
    try { await workflowsApi.deleteRule(id); toast('success', 'Règle supprimée'); load() }
    catch { toast('error', 'Erreur') }
  }

  async function deleteTemplate(id: string) {
    try { await workflowsApi.deleteTemplate(id); toast('success', 'Template supprimé'); load() }
    catch { toast('error', 'Erreur') }
  }

  const triggerDayLabel = (days: number) => {
    if (days < 0) return `J${days} avant échéance`
    if (days === 0) return `Jour J (échéance)`
    return `J+${days} après échéance`
  }

  const channelIcon = (ch: string) => ch === 'email' ? <Mail size={14} /> : <MessageSquare size={14} />
  const promiseStatusColor: Record<string, string> = {
    en_attente: 'var(--status-pending)', honore: 'var(--status-paid)',
    non_honore: 'var(--status-late)', en_cours: 'var(--status-partial)',
  }
  const promiseStatusLabel: Record<string, string> = {
    en_attente: 'En attente', honore: 'Honoré',
    non_honore: 'Non honoré', en_cours: 'En cours',
  }

  return (
    <div className="animate-fadeIn">
      <PageHeader
        title="Workflows & Relances"
        subtitle="Automatisez vos scénarios de recouvrement"
        actions={
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {tab === 'rules' && <button className="btn-primary" onClick={() => setShowRuleModal(true)}><Plus size={15} /> Nouvelle règle</button>}
            {tab === 'templates' && <button className="btn-primary" onClick={() => setShowTemplateModal(true)}><Plus size={15} /> Nouveau template</button>}
          </div>
        }
      />

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.25rem', background: 'var(--border-muted)', borderRadius: 'var(--radius)', padding: '0.25rem', marginBottom: '1.25rem', width: 'fit-content' }}>
        {([['rules', 'Règles', rules.length], ['templates', 'Templates', templates.length], ['promises', 'Promesses', promises.length]] as const).map(([t, label, count]) => (
          <button key={t} className={`tab-trigger${tab === t ? ' active' : ''}`} onClick={() => setTab(t)} style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
            {label}
            <span style={{ background: tab === t ? 'rgba(255,255,255,0.2)' : 'var(--border)', color: tab === t ? 'var(--foreground)' : 'var(--foreground-subtle)', borderRadius: '999px', padding: '0 6px', fontSize: '0.7rem', fontWeight: 600 }}>
              {count}
            </span>
          </button>
        ))}
      </div>

      {/* Rules tab */}
      {tab === 'rules' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {loading ? [...Array(3)].map((_, i) => <div key={i} className="skeleton" style={{ height: 80, borderRadius: 'var(--radius-lg)' }} />) :
            rules.length === 0 ? (
              <div className="card empty-state" style={{ padding: '3rem' }}>
                <Workflow size={36} style={{ color: 'var(--foreground-subtle)' }} />
                <span>Aucune règle configurée</span>
                <button className="btn-primary" onClick={() => setShowRuleModal(true)}><Plus size={14} /> Créer une règle</button>
              </div>
            ) : (
              rules.map(rule => (
                <div key={rule.id} className="card" style={{ padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ width: 40, height: 40, borderRadius: '10px', background: 'var(--primary-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)', flexShrink: 0 }}>
                    <Clock size={18} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, color: 'var(--foreground)', marginBottom: '0.25rem' }}>{rule.name}</div>
                    <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.8125rem', color: 'var(--foreground-muted)' }}>
                        <Clock size={12} /> {triggerDayLabel(rule.trigger_days)}
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.8125rem', color: 'var(--foreground-muted)' }}>
                        {channelIcon(rule.channel)} {rule.channel}
                      </span>
                      <span style={{ fontSize: '0.75rem', background: 'var(--border-muted)', padding: '0.1rem 0.5rem', borderRadius: '999px', color: 'var(--foreground-muted)' }}>
                        {rule.level.replace('_', ' ')}
                      </span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '0.75rem', color: rule.is_active ? 'var(--status-paid)' : 'var(--foreground-subtle)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      {rule.is_active ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
                      {rule.is_active ? 'Actif' : 'Inactif'}
                    </span>
                    <button className="btn-ghost" style={{ color: 'var(--status-late)', padding: '0.3rem 0.5rem' }} onClick={() => deleteRule(rule.id)}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))
            )}
        </div>
      )}

      {/* Templates tab */}
      {tab === 'templates' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px,1fr))', gap: '0.75rem' }}>
          {loading ? [...Array(3)].map((_, i) => <div key={i} className="skeleton" style={{ height: 140, borderRadius: 'var(--radius-lg)' }} />) :
            templates.length === 0 ? (
              <div className="card empty-state" style={{ padding: '3rem', gridColumn: '1/-1' }}>
                <Mail size={36} style={{ color: 'var(--foreground-subtle)' }} />
                <span>Aucun template</span>
                <button className="btn-primary" onClick={() => setShowTemplateModal(true)}><Plus size={14} /> Créer un template</button>
              </div>
            ) : (
              templates.map(t => (
                <div key={t.id} className="card" style={{ padding: '1.25rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                    <div>
                      <div style={{ fontWeight: 600, color: 'var(--foreground)' }}>{t.name}</div>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem', color: 'var(--foreground-muted)', marginTop: '0.2rem' }}>
                        {channelIcon(t.channel)} {t.channel}
                      </span>
                    </div>
                    <button className="btn-ghost" style={{ color: 'var(--status-late)', padding: '0.3rem 0.5rem' }} onClick={() => deleteTemplate(t.id)}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                  {t.subject && <div style={{ fontSize: '0.8125rem', fontWeight: 500, color: 'var(--foreground)', marginBottom: '0.5rem' }}>{t.subject}</div>}
                  <div style={{ fontSize: '0.8125rem', color: 'var(--foreground-muted)', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {t.body}
                  </div>
                  {t.variables?.length > 0 && (
                    <div style={{ marginTop: '0.75rem', display: 'flex', gap: '0.25rem', flexWrap: 'wrap' }}>
                      {t.variables.map(v => (
                        <span key={v} style={{ background: 'var(--primary-muted)', color: 'var(--primary)', fontSize: '0.7rem', padding: '0.1rem 0.4rem', borderRadius: 4 }}>
                          {`{{${v}}}`}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
        </div>
      )}

      {/* Promises tab */}
      {tab === 'promises' && (
        <div className="card">
          <div className="table-container" style={{ border: 'none' }}>
            <table>
              <thead>
                <tr><th>Facture</th><th>Date promise</th><th>Montant promis</th><th>Statut</th><th>Notes</th></tr>
              </thead>
              <tbody>
                {loading ? [...Array(4)].map((_, i) => (
                  <tr key={i}>{[...Array(5)].map((_, j) => <td key={j}><div className="skeleton" style={{ height: 14, borderRadius: 4 }} /></td>)}</tr>
                )) : promises.length === 0 ? (
                  <tr><td colSpan={5}>
                    <div className="empty-state">
                      <Calendar size={28} style={{ color: 'var(--foreground-subtle)' }} />
                      <span>Aucune promesse de paiement</span>
                    </div>
                  </td></tr>
                ) : (
                  promises.map(p => (
                    <tr key={p.id}>
                      <td><span style={{ fontFamily: 'monospace', fontSize: '0.8rem', background: 'var(--border-muted)', padding: '0.15rem 0.4rem', borderRadius: 3 }}>{p.invoice_id.slice(0, 8)}…</span></td>
                      <td style={{ whiteSpace: 'nowrap' }}>{formatDate(p.promised_date)}</td>
                      <td style={{ fontWeight: 600 }}>{p.promised_amount.toLocaleString('fr-FR')}</td>
                      <td>
                        <span className="badge" style={{ background: `${promiseStatusColor[p.status]}18`, color: promiseStatusColor[p.status] }}>
                          {p.status === 'non_honore' && <AlertCircle size={11} />}
                          {promiseStatusLabel[p.status]}
                        </span>
                      </td>
                      <td style={{ color: 'var(--foreground-muted)', fontSize: '0.8125rem' }}>{p.notes ?? '–'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create Rule Modal */}
      <Modal open={showRuleModal} onClose={() => setShowRuleModal(false)} title="Nouvelle règle de workflow">
        <form onSubmit={createRule} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="form-group">
            <label className="form-label">Nom de la règle *</label>
            <input className="input-base" placeholder="Rappel J-7 avant échéance" value={ruleForm.name} onChange={e => setRuleForm(f => ({ ...f, name: e.target.value }))} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div className="form-group">
              <label className="form-label">Déclencheur (jours)</label>
              <input className="input-base" type="number" placeholder="-7" value={ruleForm.trigger_days} onChange={e => setRuleForm(f => ({ ...f, trigger_days: e.target.value }))} />
              <span className="form-hint">Négatif = avant / Positif = après l'échéance</span>
            </div>
            <div className="form-group">
              <label className="form-label">Canal</label>
              <select className="input-base" value={ruleForm.channel} onChange={e => setRuleForm(f => ({ ...f, channel: e.target.value }))}>
                <option value="email">Email</option>
                <option value="sms">SMS</option>
                <option value="both">Email + SMS</option>
              </select>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Niveau d'escalade</label>
            <select className="input-base" value={ruleForm.level} onChange={e => setRuleForm(f => ({ ...f, level: e.target.value }))}>
              <option value="niveau_1">Niveau 1 — Rappel amical</option>
              <option value="niveau_2">Niveau 2 — Relance formelle</option>
              <option value="niveau_3">Niveau 3 — Mise en demeure</option>
              <option value="niveau_4">Niveau 4 — Action juridique</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Template (optionnel)</label>
            <select className="input-base" value={ruleForm.template_id} onChange={e => setRuleForm(f => ({ ...f, template_id: e.target.value }))}>
              <option value="">Aucun template</option>
              {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
            <button type="button" className="btn-secondary" onClick={() => setShowRuleModal(false)}>Annuler</button>
            <button type="submit" className="btn-primary" disabled={saving || !ruleForm.name}>Créer</button>
          </div>
        </form>
      </Modal>

      {/* Create Template Modal */}
      <Modal open={showTemplateModal} onClose={() => setShowTemplateModal(false)} title="Nouveau template de message">
        <form onSubmit={createTemplate} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div className="form-group">
              <label className="form-label">Nom *</label>
              <input className="input-base" placeholder="Rappel J-7" value={tplForm.name} onChange={e => setTplForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Canal</label>
              <select className="input-base" value={tplForm.channel} onChange={e => setTplForm(f => ({ ...f, channel: e.target.value }))}>
                <option value="email">Email</option>
                <option value="sms">SMS</option>
              </select>
            </div>
          </div>
          {tplForm.channel === 'email' && (
            <div className="form-group">
              <label className="form-label">Objet</label>
              <input className="input-base" placeholder="Rappel paiement — {{invoice_number}}" value={tplForm.subject} onChange={e => setTplForm(f => ({ ...f, subject: e.target.value }))} />
            </div>
          )}
          <div className="form-group">
            <label className="form-label">Corps du message *</label>
            <textarea className="input-base" rows={5} placeholder="Bonjour {{debtor_name}}, votre facture {{invoice_number}} de {{amount}} est due le {{due_date}}." value={tplForm.body} onChange={e => setTplForm(f => ({ ...f, body: e.target.value }))} style={{ resize: 'vertical', fontFamily: 'monospace', fontSize: '0.8125rem' }} />
          </div>
          <div className="form-group">
            <label className="form-label">Variables disponibles</label>
            <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap' }}>
              {['debtor_name', 'invoice_number', 'amount', 'due_date', 'company_name', 'amount_paid'].map(v => (
                <button key={v} type="button" onClick={() => setTplForm(f => ({ ...f, body: f.body + `{{${v}}}` }))}
                  style={{ background: 'var(--primary-muted)', color: 'var(--primary)', border: 'none', borderRadius: 4, padding: '0.2rem 0.5rem', fontSize: '0.75rem', cursor: 'pointer' }}>
                  {`{{${v}}}`}
                </button>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
            <button type="button" className="btn-secondary" onClick={() => setShowTemplateModal(false)}>Annuler</button>
            <button type="submit" className="btn-primary" disabled={saving || !tplForm.name || !tplForm.body}>Créer</button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
