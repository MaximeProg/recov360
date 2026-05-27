'use client'
import { useEffect, useState } from 'react'
import { Save, RefreshCw, Phone, Mail, MapPin, Globe, MessageCircle, Settings } from 'lucide-react'
import { superAdminApi } from '@/lib/api'
import { useToast } from '@/contexts/toast'

interface ConfigField {
  key: string
  label: string
  category: 'contact' | 'social' | 'footer' | 'general'
  placeholder?: string
  icon?: React.ElementType
  type?: 'text' | 'url' | 'tel' | 'email' | 'textarea'
}

const FIELDS: ConfigField[] = [
  // Contact
  { key: 'phone', label: 'Téléphone principal', category: 'contact', placeholder: '+225 07 00 00 00 00', icon: Phone, type: 'tel' },
  { key: 'whatsapp', label: 'WhatsApp', category: 'contact', placeholder: '+225 07 00 00 00 00', icon: MessageCircle, type: 'tel' },
  { key: 'email', label: 'Email de contact', category: 'contact', placeholder: 'contact@recov360.com', icon: Mail, type: 'email' },
  { key: 'address', label: 'Adresse / Ville', category: 'contact', placeholder: 'Abidjan, Côte d\'Ivoire', icon: MapPin },
  // Réseaux sociaux
  { key: 'twitter', label: 'Lien Twitter / X', category: 'social', placeholder: 'https://twitter.com/recov360', icon: Globe, type: 'url' },
  { key: 'linkedin', label: 'Lien LinkedIn', category: 'social', placeholder: 'https://linkedin.com/company/recov360', icon: Globe, type: 'url' },
  { key: 'facebook', label: 'Lien Facebook', category: 'social', placeholder: 'https://facebook.com/recov360', icon: Globe, type: 'url' },
  // Footer
  { key: 'company_name', label: 'Nom de la société', category: 'footer', placeholder: 'Recov360' },
  { key: 'footer_tagline', label: 'Slogan du footer', category: 'footer', placeholder: 'La solution de recouvrement...', type: 'textarea' },
]

const CATEGORY_LABELS: Record<string, string> = {
  contact: 'Informations de contact',
  social: 'Réseaux sociaux',
  footer: 'Footer / Pied de page',
  general: 'Général',
}

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  contact: Phone,
  social: Globe,
  footer: Settings,
  general: Settings,
}

export default function SuperAdminSettingsPage() {
  const toast = useToast()
  const [config, setConfig] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty] = useState(false)

  async function load() {
    setLoading(true)
    try {
      const data = await superAdminApi.getConfig()
      setConfig(data)
    } catch {
      toast('error', 'Erreur chargement de la configuration')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  function handleChange(key: string, value: string) {
    setConfig(prev => ({ ...prev, [key]: value }))
    setDirty(true)
  }

  async function handleSave() {
    setSaving(true)
    try {
      const items = FIELDS.map(f => ({
        key: f.key,
        value: config[f.key] ?? '',
        label: f.label,
        category: f.category,
      }))
      await superAdminApi.updateConfig(items)
      toast('success', 'Configuration sauvegardée')
      setDirty(false)
    } catch {
      toast('error', 'Erreur lors de la sauvegarde')
    } finally {
      setSaving(false)
    }
  }

  const categories = [...new Set(FIELDS.map(f => f.category))]

  return (
    <div className="animate-fadeIn">
      {/* Header */}
      <div className="sa-page-header" style={{ marginBottom: '2rem' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.375rem', fontWeight: 800, color: 'var(--foreground)' }}>
            Paramètres de la plateforme
          </h1>
          <p style={{ margin: '0.25rem 0 0', fontSize: '0.875rem', color: 'var(--foreground-muted)' }}>
            Ces informations apparaissent sur le site public (footer, page d'accueil, pages de contact).
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
          <button className="btn-secondary" onClick={load} disabled={loading}>
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Actualiser
          </button>
          <button
            className="btn-primary"
            onClick={handleSave}
            disabled={saving || !dirty}
            style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', opacity: !dirty ? 0.6 : 1 }}
          >
            {saving ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
            Sauvegarder
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {[...Array(3)].map((_, i) => (
            <div key={i} className="card" style={{ padding: '1.5rem' }}>
              <div className="skeleton" style={{ height: 16, width: '30%', borderRadius: 4, marginBottom: 20 }} />
              {[...Array(2)].map((_, j) => (
                <div key={j} style={{ marginBottom: 16 }}>
                  <div className="skeleton" style={{ height: 12, width: '20%', borderRadius: 4, marginBottom: 6 }} />
                  <div className="skeleton" style={{ height: 40, borderRadius: 8 }} />
                </div>
              ))}
            </div>
          ))}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {categories.map(cat => {
            const fields = FIELDS.filter(f => f.category === cat)
            const CatIcon = CATEGORY_ICONS[cat] ?? Settings
            return (
              <div key={cat} className="card" style={{ padding: '1.5rem' }}>
                {/* Category header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '1.25rem', paddingBottom: '0.875rem', borderBottom: '1px solid var(--border)' }}>
                  <div style={{ width: 32, height: 32, borderRadius: '8px', background: '#DC262612', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <CatIcon size={16} color="#DC2626" />
                  </div>
                  <h3 style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 700, color: 'var(--foreground)' }}>
                    {CATEGORY_LABELS[cat]}
                  </h3>
                </div>

                {/* Fields */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
                  {fields.map(field => {
                    const FieldIcon = field.icon
                    return (
                      <div key={field.key}>
                        <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--foreground-muted)', marginBottom: '0.375rem' }}>
                          {field.label}
                        </label>
                        <div style={{ position: 'relative' }}>
                          {FieldIcon && (
                            <FieldIcon
                              size={15}
                              style={{ position: 'absolute', left: '0.75rem', top: field.type === 'textarea' ? '0.75rem' : '50%', transform: field.type === 'textarea' ? 'none' : 'translateY(-50%)', color: 'var(--foreground-subtle)', pointerEvents: 'none' }}
                            />
                          )}
                          {field.type === 'textarea' ? (
                            <textarea
                              className="input"
                              value={config[field.key] ?? ''}
                              onChange={e => handleChange(field.key, e.target.value)}
                              placeholder={field.placeholder}
                              rows={3}
                              style={{ paddingLeft: FieldIcon ? '2.25rem' : '0.875rem', width: '100%', resize: 'vertical', fontFamily: 'inherit', paddingTop: '0.625rem' }}
                            />
                          ) : (
                            <input
                              className="input"
                              type={field.type ?? 'text'}
                              value={config[field.key] ?? ''}
                              onChange={e => handleChange(field.key, e.target.value)}
                              placeholder={field.placeholder}
                              style={{ paddingLeft: FieldIcon ? '2.25rem' : '0.875rem', width: '100%' }}
                            />
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}

          {/* Save floating reminder if dirty */}
          {dirty && (
            <div style={{
              position: 'fixed', bottom: '1.5rem', right: '1.5rem',
              background: 'var(--surface)', border: '1px solid var(--border)',
              borderRadius: '12px', padding: '0.875rem 1.25rem',
              display: 'flex', alignItems: 'center', gap: '0.75rem',
              boxShadow: '0 8px 32px rgba(0,0,0,0.15)', zIndex: 100,
            }}>
              <span style={{ fontSize: '0.875rem', color: 'var(--foreground-muted)' }}>Modifications non sauvegardées</span>
              <button
                className="btn-primary"
                onClick={handleSave}
                disabled={saving}
                style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', padding: '0.5rem 1rem', fontSize: '0.875rem' }}
              >
                {saving ? <RefreshCw size={13} className="animate-spin" /> : <Save size={13} />}
                Sauvegarder
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
