'use client'
import { useEffect, useState } from 'react'
import {
  CreditCard, Calendar, Users, FileText, CheckCircle,
  Clock, AlertTriangle, ArrowRight, RefreshCw, Zap,
} from 'lucide-react'
import PageHeader from '@/components/ui/PageHeader'
import Link from 'next/link'
import { subscriptionApi, publicApi } from '@/lib/api'
import { formatCurrency } from '@/lib/utils'
import type { PlanPublic, SubscriptionCurrent } from '@/types'

function statusConfig(status: string) {
  switch (status?.toUpperCase()) {
    case 'ACTIVE':
      return { label: 'Actif', color: '#10B981', bg: 'rgba(16,185,129,0.1)', icon: CheckCircle }
    case 'TRIAL':
      return { label: 'Essai gratuit', color: '#8B5CF6', bg: 'rgba(139,92,246,0.1)', icon: Zap }
    case 'EXPIRED':
      return { label: 'Expiré', color: '#EF4444', bg: 'rgba(239,68,68,0.1)', icon: AlertTriangle }
    case 'CANCELLED':
      return { label: 'Annulé', color: '#94A3B8', bg: 'rgba(148,163,184,0.1)', icon: AlertTriangle }
    default:
      return { label: status || 'Inconnu', color: '#64748B', bg: 'rgba(100,116,139,0.1)', icon: Clock }
  }
}

function daysRemaining(endDate: string | null): number | null {
  if (!endDate) return null
  const diff = new Date(endDate).getTime() - Date.now()
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)))
}

function formatDate(d: string | null): string {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
}

export default function SubscriptionPage() {
  const [sub, setSub] = useState<SubscriptionCurrent | null>(null)
  const [plan, setPlan] = useState<PlanPublic | null>(null)
  const [plans, setPlans] = useState<PlanPublic[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      subscriptionApi.current(),
      publicApi.plans(),
    ]).then(([s, ps]) => {
      setSub(s)
      setPlans(ps)
      if (s && ps) {
        const found = ps.find((p: PlanPublic) => p.slug === s.plan_slug)
        setPlan(found ?? null)
      }
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const days = daysRemaining(sub?.end_date ?? null)
  const sc = sub ? statusConfig(sub.status) : null
  const StatusIcon = sc?.icon ?? Clock

  // features est un dict {scoring: true, workflows: false, ...}
  // On affiche uniquement les fonctionnalités activées (valeur === true), avec un label lisible
  const FEATURE_LABELS: Record<string, string> = {
    scoring:          'Scoring de risque',
    workflows:        'Workflows automatisés',
    reports:          'Rapports avancés',
    api_access:       'Accès API',
    support_priority: 'Support prioritaire',
    email_reminders:  'Relances par e-mail',
    sms_reminders:    'Relances par SMS',
    exports:          'Exports PDF / Excel',
    multi_user:       'Gestion multi-utilisateurs',
    custom_branding:  'Personnalisation de marque',
  }

  const features: string[] = plan?.features
    ? Array.isArray(plan.features)
      // Cas tableau de strings (ex: ["Scoring", "Workflows"])
      ? (plan.features as string[]).filter(Boolean)
      // Cas dict booléen (ex: {scoring: true, workflows: false})
      : Object.entries(plan.features as unknown as Record<string, boolean>)
          .filter(([, v]) => v === true)
          .map(([k]) => FEATURE_LABELS[k] ?? k.replace(/_/g, ' '))
    : []

  // Plans supérieurs pour upsell
  const currentOrder = plan?.sort_order ?? 0
  const upgradePlans = plans
    .filter(p => p.sort_order > currentOrder && !p.is_free)
    .sort((a, b) => a.sort_order - b.sort_order)
    .slice(0, 2)

  if (loading) {
    return (
      <div style={{ padding: 'clamp(0.75rem, 3vw, 2rem)', display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--foreground-muted)' }}>
        <RefreshCw size={18} className="spin" />
        Chargement de l'abonnement…
      </div>
    )
  }

  if (!sub) {
    return (
      <div style={{ padding: 'clamp(0.75rem, 3vw, 2rem)' }}>
        <PageHeader title="Abonnement" subtitle="Gérez votre abonnement Recov360" />
        <div style={{
          marginTop: '2rem', padding: '3rem', textAlign: 'center',
          background: 'var(--surface)', borderRadius: '14px', border: '1px solid var(--border)',
        }}>
          <CreditCard size={48} style={{ color: 'var(--foreground-muted)', marginBottom: '1rem' }} />
          <h3 style={{ margin: '0 0 0.5rem', fontSize: '1.125rem', fontWeight: 600, color: 'var(--foreground)' }}>
            Aucun abonnement actif
          </h3>
          <p style={{ color: 'var(--foreground-muted)', marginBottom: '1.5rem' }}>
            Choisissez un plan pour accéder à toutes les fonctionnalités.
          </p>
          <Link href="/subscribe" style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
            padding: '0.625rem 1.25rem', borderRadius: '8px',
            background: 'var(--primary)', color: 'white', textDecoration: 'none',
            fontWeight: 600, fontSize: '0.875rem',
          }}>
            Choisir un plan <ArrowRight size={15} />
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div style={{ padding: 'clamp(0.75rem, 3vw, 2rem)', maxWidth: 900 }}>
      <PageHeader title="Abonnement" subtitle="Détails de votre abonnement en cours" />

      {/* Carte principale */}
      <div style={{
        marginTop: '1.5rem',
        background: 'var(--surface)',
        borderRadius: '14px',
        border: '1px solid var(--border)',
        overflow: 'hidden',
      }}>
        {/* Header de la carte */}
        <div style={{
          padding: '1.5rem',
          borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexWrap: 'wrap', gap: '1rem',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{
              width: 48, height: 48, borderRadius: '12px',
              background: 'var(--primary)', opacity: 0.9,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <CreditCard size={24} color="white" />
            </div>
            <div>
              <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--foreground)' }}>
                {plan?.name ?? sub.plan_slug}
              </div>
              {plan && (
                <div style={{ fontSize: '0.875rem', color: 'var(--foreground-muted)', marginTop: 2 }}>
                  {sub.is_yearly
                    ? `${formatCurrency(plan.price_yearly, plan.currency)} / an`
                    : plan.price_monthly === 0
                      ? 'Gratuit'
                      : `${formatCurrency(plan.price_monthly, plan.currency)} / mois`}
                </div>
              )}
            </div>
          </div>

          {/* Badge statut */}
          {sc && (
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
              padding: '0.375rem 0.875rem', borderRadius: '999px',
              background: sc.bg, color: sc.color, fontSize: '0.8125rem', fontWeight: 600,
            }}>
              <StatusIcon size={14} />
              {sc.label}
            </div>
          )}
        </div>

        {/* Grille d'infos */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
          gap: 0, borderBottom: '1px solid var(--border)',
        }}>
          {[
            {
              label: 'Date de début',
              value: formatDate(sub.start_date),
              icon: Calendar,
            },
            {
              label: 'Date d\'expiration',
              value: formatDate(sub.end_date),
              icon: Calendar,
            },
            {
              label: 'Jours restants',
              value: days !== null
                ? days === 0 ? 'Expiré aujourd\'hui' : `${days} jour${days > 1 ? 's' : ''}`
                : '—',
              icon: Clock,
              highlight: days !== null && days <= 7,
            },
            {
              label: 'Facturation',
              value: sub.is_yearly ? 'Annuelle' : 'Mensuelle',
              icon: CreditCard,
            },
          ].map((info, i) => {
            const Icon = info.icon
            return (
              <div key={i} style={{
                padding: '1rem',
                borderRight: i < 3 ? '1px solid var(--border)' : 'none',
                borderBottom: '1px solid var(--border)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', marginBottom: '0.375rem' }}>
                  <Icon size={13} style={{ color: 'var(--foreground-muted)' }} />
                  <span style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--foreground-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    {info.label}
                  </span>
                </div>
                <div style={{
                  fontSize: '0.9375rem', fontWeight: 600,
                  color: (info as any).highlight ? '#EF4444' : 'var(--foreground)',
                }}>
                  {info.value}
                </div>
              </div>
            )
          })}
        </div>

        {/* Limites du plan */}
        {plan && (
          <div style={{ padding: '1.375rem', borderBottom: '1px solid var(--border)' }}>
            <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--foreground-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '1rem' }}>
              Limites incluses
            </div>
            <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                <div style={{ width: 34, height: 34, borderRadius: '8px', background: 'rgba(59,130,246,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Users size={16} style={{ color: '#3B82F6' }} />
                </div>
                <div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--foreground-muted)' }}>Utilisateurs</div>
                  <div style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--foreground)' }}>
                    {plan.max_users === -1 ? 'Illimité' : plan.max_users}
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                <div style={{ width: 34, height: 34, borderRadius: '8px', background: 'rgba(139,92,246,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Users size={16} style={{ color: '#8B5CF6' }} />
                </div>
                <div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--foreground-muted)' }}>Débiteurs</div>
                  <div style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--foreground)' }}>
                    {plan.max_debtors === -1 ? 'Illimité' : plan.max_debtors}
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                <div style={{ width: 34, height: 34, borderRadius: '8px', background: 'rgba(16,185,129,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <FileText size={16} style={{ color: '#10B981' }} />
                </div>
                <div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--foreground-muted)' }}>Créances</div>
                  <div style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--foreground)' }}>
                    {plan.max_invoices === -1 ? 'Illimité' : plan.max_invoices}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Fonctionnalités */}
        {features.length > 0 && (
          <div style={{ padding: '1.375rem', borderBottom: upgradePlans.length > 0 ? '1px solid var(--border)' : 'none' }}>
            <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--foreground-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '1rem' }}>
              Fonctionnalités incluses
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '0.5rem' }}>
              {features.map((f: string, i: number) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <CheckCircle size={14} style={{ color: '#10B981', flexShrink: 0 }} />
                  <span style={{ fontSize: '0.875rem', color: 'var(--foreground)' }}>{f}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Upsell : plans supérieurs */}
        {upgradePlans.length > 0 && (
          <div style={{ padding: '1.375rem' }}>
            <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--foreground-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '1rem' }}>
              Passez à la vitesse supérieure
            </div>
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              {upgradePlans.map(p => (
                <div key={p.id.toString()} style={{
                  flex: '1 1 200px', padding: '1rem', borderRadius: '10px',
                  border: '1px solid var(--border)', background: 'var(--background)',
                }}>
                  <div style={{ fontWeight: 600, fontSize: '0.9375rem', color: 'var(--foreground)', marginBottom: '0.25rem' }}>{p.name}</div>
                  <div style={{ fontSize: '0.8125rem', color: 'var(--foreground-muted)', marginBottom: '0.75rem' }}>
                    {formatCurrency(p.price_monthly, p.currency)} / mois
                  </div>
                  <Link href="/subscribe" style={{
                    display: 'inline-flex', alignItems: 'center', gap: '0.375rem',
                    fontSize: '0.8125rem', fontWeight: 600,
                    color: 'var(--primary)', textDecoration: 'none',
                  }}>
                    Mettre à niveau <ArrowRight size={13} />
                  </Link>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Bouton gérer abonnement */}
      <div style={{ marginTop: '1.5rem', display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
        <Link href="/subscribe" style={{
          display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
          padding: '0.625rem 1.25rem', borderRadius: '8px',
          background: 'var(--primary)', color: 'white', textDecoration: 'none',
          fontWeight: 600, fontSize: '0.875rem',
        }}>
          <CreditCard size={15} /> Changer de plan
        </Link>
      </div>
    </div>
  )
}
