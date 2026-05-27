'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Shield, Check, CreditCard, RefreshCw, Star, Zap, ArrowRight } from 'lucide-react'
import { publicApi, subscriptionApi } from '@/lib/api'
import { formatCurrency } from '@/lib/utils'
import { useAuth } from '@/contexts/auth'

interface Plan {
  id: string; name: string; slug: string; description?: string
  price_monthly: number; price_yearly: number; currency: string
  max_users: number; max_debtors: number; max_invoices: number
  features?: Record<string, boolean>; is_free: boolean; trial_days: number
}

const FEATURE_LABELS: Record<string, string> = {
  scoring: 'Scoring IA des débiteurs', workflows: 'Workflows automatisés',
  reports: 'Rapports & exports', api_access: 'Accès API', support_priority: 'Support prioritaire',
}

const PLAN_ICONS: Record<string, React.ElementType> = {
  starter: Shield, pro: Zap, enterprise: Star,
}
const PLAN_COLORS: Record<string, string> = {
  starter: '#64748B', pro: '#2563EB', enterprise: '#7C3AED',
}

export default function SubscribePage() {
  const { user } = useAuth()
  const router = useRouter()
  const [plans, setPlans] = useState<Plan[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null)
  const [isYearly, setIsYearly] = useState(false)
  // paying contient l'ID du plan en cours de traitement (null si aucun)
  const [paying, setPaying] = useState<string | null>(null)

  useEffect(() => {
    publicApi.plans().then(data => {
      setPlans(Array.isArray(data) ? data : [])
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  // Si l'utilisateur a déjà un abonnement actif → rediriger
  useEffect(() => {
    if (!user) return
    subscriptionApi.check().then(data => {
      if (data.active) router.replace('/dashboard')
    }).catch(() => {})
  }, [user])

  async function subscribe(plan: Plan) {
    if (!user) { router.push('/login'); return }
    setPaying(plan.id)
    try {
      if (plan.is_free) {
        await subscriptionApi.checkout(plan.id, false)
        router.replace('/dashboard')
        return
      }
      const result = await subscriptionApi.checkout(plan.id, isYearly)
      if (result.checkout_url && result.transaction_id) {
        // Sauvegarder le transaction_id pour le vérifier après le retour FedaPay
        sessionStorage.setItem('pending_transaction_id', result.transaction_id)
        window.location.href = result.checkout_url
      } else {
        router.replace('/dashboard')
      }
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? 'Erreur paiement'
      alert(msg)
    } finally { setPaying(null) }
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--background)' }}>
      {/* Header */}
      <div style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)', padding: '0.875rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <div style={{ width: 32, height: 32, background: 'linear-gradient(135deg, #2563EB, #1D4ED8)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Shield size={18} color="white" />
        </div>
        <span style={{ fontWeight: 800, fontSize: '1.125rem', color: 'var(--foreground)', flexShrink: 0 }}>Recov360</span>
        {user && (
          <span style={{ marginLeft: 'auto', fontSize: '0.8125rem', color: 'var(--foreground-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>
            <span className="hidden lg:inline">Connecté en tant que </span><strong>{user.email}</strong>
          </span>
        )}
      </div>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: 'clamp(1.5rem, 5vw, 3rem) clamp(1rem, 4vw, 1.5rem)' }}>
        {/* Titre */}
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <h1 style={{ fontSize: '2.25rem', fontWeight: 800, color: 'var(--foreground)', margin: '0 0 0.75rem' }}>
            Choisissez votre plan
          </h1>
          <p style={{ fontSize: '1.0625rem', color: 'var(--foreground-muted)', margin: '0 0 1.5rem', maxWidth: 520, marginInline: 'auto' }}>
            Commencez avec un essai gratuit. Sans engagement. Annulable à tout moment.
          </p>

          {/* Toggle mensuel/annuel */}
          <div style={{ display: 'inline-flex', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px', padding: '0.25rem' }}>
            <button
              onClick={() => setIsYearly(false)}
              style={{ padding: '0.5rem 1.25rem', borderRadius: '6px', border: 'none', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 500, background: !isYearly ? '#2563EB' : 'transparent', color: !isYearly ? 'white' : 'var(--foreground-muted)', transition: 'all 0.15s' }}
            >
              Mensuel
            </button>
            <button
              onClick={() => setIsYearly(true)}
              style={{ padding: '0.5rem 1.25rem', borderRadius: '6px', border: 'none', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 500, background: isYearly ? '#2563EB' : 'transparent', color: isYearly ? 'white' : 'var(--foreground-muted)', transition: 'all 0.15s', display: 'flex', alignItems: 'center', gap: '0.375rem' }}
            >
              Annuel
              <span style={{ padding: '0.1rem 0.4rem', background: '#05966920', color: '#059669', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 700 }}>-20%</span>
            </button>
          </div>
        </div>

        {/* Plans */}
        {loading ? (
          <div className="plans-grid" style={{ gap: '1.25rem' }}>
            {[...Array(3)].map((_, i) => (
              <div key={i} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '16px', padding: '2rem', height: 400 }}>
                <div className="skeleton" style={{ height: 16, width: '60%', borderRadius: 4, marginBottom: 12 }} />
                <div className="skeleton" style={{ height: 40, width: '40%', borderRadius: 4, marginBottom: 16 }} />
                <div className="skeleton" style={{ height: 12, borderRadius: 4, marginBottom: 8 }} />
                <div className="skeleton" style={{ height: 12, width: '80%', borderRadius: 4 }} />
              </div>
            ))}
          </div>
        ) : (
          <div className="plans-grid" style={{ gap: '1.25rem' }}>
            {plans.map(plan => {
              const isSelected = selectedPlan?.id === plan.id
              const price = isYearly ? plan.price_yearly : plan.price_monthly
              const Icon = PLAN_ICONS[plan.slug] ?? CreditCard
              const color = PLAN_COLORS[plan.slug] ?? '#2563EB'
              const isPro = plan.slug === 'pro'

              return (
                <div
                  key={plan.id}
                  onClick={() => setSelectedPlan(plan)}
                  style={{
                    background: 'var(--surface)',
                    border: `2px solid ${isSelected ? color : isPro ? color + '40' : 'var(--border)'}`,
                    borderRadius: '16px', padding: '2rem',
                    cursor: 'pointer', position: 'relative',
                    boxShadow: isSelected ? `0 0 0 4px ${color}20` : isPro ? '0 8px 32px rgba(37,99,235,0.12)' : 'none',
                    transition: 'all 0.2s',
                  }}
                >
                  {isPro && (
                    <div style={{
                      position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)',
                      background: color, color: 'white', padding: '0.2rem 0.875rem',
                      borderRadius: '20px', fontSize: '0.75rem', fontWeight: 700,
                      whiteSpace: 'nowrap',
                    }}>
                      ⭐ Recommandé
                    </div>
                  )}

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
                    <div style={{ width: 44, height: 44, borderRadius: '10px', background: color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Icon size={22} color={color} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: '1.125rem', color: 'var(--foreground)', textTransform: 'capitalize' }}>{plan.name}</div>
                      {plan.description && (
                        <div style={{ fontSize: '0.8125rem', color: 'var(--foreground-muted)' }}>{plan.description}</div>
                      )}
                    </div>
                  </div>

                  <div style={{ marginBottom: '1.5rem' }}>
                    {plan.is_free ? (
                      <div style={{ fontSize: '2.5rem', fontWeight: 900, color: 'var(--foreground)', lineHeight: 1 }}>Gratuit</div>
                    ) : (
                      <>
                        <div style={{ fontSize: '2.5rem', fontWeight: 900, color, lineHeight: 1 }}>
                          {formatCurrency(price)}
                          <span style={{ fontSize: '1rem', fontWeight: 400, color: 'var(--foreground-muted)' }}>/{isYearly ? 'an' : 'mois'}</span>
                        </div>
                        {isYearly && plan.price_monthly > 0 && (
                          <div style={{ fontSize: '0.8125rem', color: '#059669', marginTop: '0.25rem' }}>
                            Économie de {formatCurrency((plan.price_monthly * 12) - plan.price_yearly)} vs mensuel
                          </div>
                        )}
                      </>
                    )}
                    {plan.trial_days > 0 && (
                      <div style={{ marginTop: '0.375rem', fontSize: '0.8125rem', color: 'var(--foreground-muted)' }}>
                        {plan.trial_days} jours d'essai gratuit
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.75rem' }}>
                    {[
                      `${plan.max_users} utilisateurs`,
                      `${plan.max_debtors} débiteurs`,
                      `${plan.max_invoices} créances`,
                    ].map((f, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: 'var(--foreground-muted)' }}>
                        <Check size={15} color={color} /> {f}
                      </div>
                    ))}
                    {plan.features && Object.entries(plan.features).filter(([, v]) => v).map(([k]) => (
                      <div key={k} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: 'var(--foreground-muted)' }}>
                        <Check size={15} color={color} /> {FEATURE_LABELS[k] ?? k}
                      </div>
                    ))}
                  </div>

                  <button
                    disabled={paying === plan.id}
                    onClick={e => { e.stopPropagation(); subscribe(plan) }}
                    style={{
                      width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.375rem',
                      padding: '0.75rem', border: 'none', borderRadius: '10px',
                      background: isSelected ? color : color + '18',
                      color: isSelected ? 'white' : color,
                      fontWeight: 700, fontSize: '0.9375rem',
                      cursor: paying === plan.id ? 'wait' : 'pointer', transition: 'all 0.2s',
                      opacity: paying !== null && paying !== plan.id ? 0.6 : 1,
                    }}
                  >
                    {paying === plan.id ? <RefreshCw size={16} className="animate-spin" /> : <ArrowRight size={16} />}
                    {paying === plan.id ? 'Traitement…' : plan.is_free ? 'Commencer gratuitement' : 'Choisir ce plan'}
                  </button>
                </div>
              )
            })}
          </div>
        )}

        {/* Trust */}
        <div style={{ textAlign: 'center', marginTop: '2.5rem', color: 'var(--foreground-muted)', fontSize: '0.875rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
          <Shield size={14} />
          Paiement sécurisé via FedaPay · Annulation à tout moment · Données hébergées en sécurité
        </div>
      </div>
    </div>
  )
}
