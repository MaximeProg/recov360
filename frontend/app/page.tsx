'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  Shield, ArrowRight, Check, ChevronDown,
  BarChart3, Bell, FileText, Users,
  TrendingUp, Workflow, Mail, Phone, MapPin,
  ExternalLink, Globe2, MessageCircle, Menu, X,
} from 'lucide-react'
import { publicApi } from '@/lib/api'
import { formatCurrency } from '@/lib/utils'

/* ─── Types ─────────────────────────────────────────────────────── */
interface Plan {
  id: string; name: string; slug: string; description?: string
  price_monthly: number; price_yearly: number; currency: string
  max_users: number; max_debtors: number; max_invoices: number
  features?: Record<string, boolean>; is_free: boolean; trial_days: number
}

/* ─── Contenu ────────────────────────────────────────────────────── */
const NAV_LINKS = [
  { label: 'Fonctionnalités', href: 'features' },
  { label: 'Comment ça marche', href: 'how' },
  { label: 'Tarifs', href: 'pricing' },
  { label: 'FAQ', href: 'faq' },
]

const FEATURES = [
  {
    icon: TrendingUp,
    title: 'Tableau de bord en temps réel',
    desc: 'Visualisez en un coup d\'œil l\'état de toutes vos créances, les échéances à venir et le taux de recouvrement de votre équipe.',
  },
  {
    icon: Users,
    title: 'Gestion des débiteurs',
    desc: 'Chaque débiteur dispose d\'un profil complet avec historique des paiements, des relances et des promesses effectuées.',
  },
  {
    icon: Bell,
    title: 'Relances multicanal',
    desc: 'Envoyez des relances par SMS, email ou WhatsApp selon le canal préféré de chaque débiteur, au bon moment.',
  },
  {
    icon: Workflow,
    title: 'Automatisation par règles',
    desc: 'Définissez des règles de relance automatiques (J+7, J+30, J+60…) et laissez la plateforme travailler à votre place.',
  },
  {
    icon: BarChart3,
    title: 'Rapports détaillés',
    desc: 'Exportez vos données en CSV ou Excel. Analysez les performances par agent, par période ou par segment de débiteurs.',
  },
  {
    icon: FileText,
    title: 'Suivi des promesses',
    desc: 'Enregistrez les engagements de paiement et recevez une alerte automatique en cas de non-respect à la date convenue.',
  },
]

const HOW_STEPS = [
  {
    num: '01',
    title: 'Importez vos créances',
    desc: 'Ajoutez manuellement vos débiteurs ou importez votre portefeuille existant. La configuration prend moins de 10 minutes.',
  },
  {
    num: '02',
    title: 'Configurez votre stratégie',
    desc: 'Définissez vos scénarios de relance selon le type de créance, le montant et le profil de risque du débiteur.',
  },
  {
    num: '03',
    title: 'Suivez et encaissez',
    desc: 'La plateforme envoie les relances, enregistre les réponses et met à jour votre tableau de bord en temps réel.',
  },
]

const TESTIMONIALS = [
  {
    text: 'Avant Recov360, nos agents passaient 60% de leur temps à relancer manuellement. Aujourd\'hui, ils se concentrent sur les cas complexes. Notre taux de recouvrement a progressé de 34 points en un semestre.',
    author: 'Adjoua Konan',
    role: 'Responsable Recouvrement',
    company: 'Micro Finance Côte d\'Ivoire',
    initials: 'AK',
  },
  {
    text: 'La fonctionnalité de scoring nous a permis d\'identifier nos débiteurs à risque bien avant les premières échéances manquées. On intervient maintenant de façon préventive.',
    author: 'Seydou Traoré',
    role: 'Directeur Financier',
    company: 'Distribution Ouest SARL',
    initials: 'ST',
  },
  {
    text: 'L\'interface est claire, la prise en main a été immédiate pour notre équipe. Le support répond rapidement. Je recommande sans hésiter à tous mes confrères de la finance.',
    author: 'Fatoumata Baldé',
    role: 'Comptable principale',
    company: 'Groupe Kadidia Import-Export',
    initials: 'FB',
  },
]

const STATS = [
  { value: '38 pts', label: 'Gain moyen sur le taux de recouvrement' },
  { value: '65%', label: 'Réduction du temps de traitement manuel' },
  { value: '< 10 min', label: 'Pour configurer et démarrer' },
  { value: '99.6%', label: 'Disponibilité de la plateforme' },
]

const FAQS = [
  {
    q: 'Mes données sont-elles sécurisées ?',
    a: 'Oui. Les données sont chiffrées en transit (TLS 1.3) et au repos. L\'accès est strictement limité à votre entreprise. Chaque action est tracée dans un journal d\'audit.',
  },
  {
    q: 'Puis-je changer de plan en cours d\'abonnement ?',
    a: 'Absolument. Vous pouvez passer à un plan supérieur à tout moment. Le changement est effectif immédiatement et la facturation est ajustée au prorata.',
  },
  {
    q: 'Quels moyens de paiement sont acceptés ?',
    a: 'Nous acceptons les paiements via FedaPay : Mobile Money (Orange Money, MTN MoMo, Wave), carte bancaire, et virement. Tous les modes disponibles dans votre pays sont proposés.',
  },
  {
    q: 'Y a-t-il un engagement de durée ?',
    a: 'Non. Les abonnements mensuels sont sans engagement, résiliables à tout moment. L\'abonnement annuel est prépayé et donne droit à une réduction de 20%.',
  },
  {
    q: 'L\'essai gratuit nécessite-t-il une carte bancaire ?',
    a: 'Non. L\'essai de 14 jours (30 jours pour Enterprise) est entièrement gratuit, sans carte requise. Vous ne saisissez vos informations de paiement qu\'à la fin de l\'essai si vous choisissez de continuer.',
  },
]

const FEATURE_LABELS: Record<string, string> = {
  scoring: 'Scoring de risque IA',
  workflows: 'Workflows automatisés',
  reports: 'Rapports & exports',
  api_access: 'Accès API',
  support_priority: 'Support prioritaire',
}

/* ─── Composants ─────────────────────────────────────────────────── */
function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div style={{ borderBottom: '1px solid #E2E8F0' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '1.25rem 0', background: 'none', border: 'none', cursor: 'pointer',
          textAlign: 'left', gap: '1rem',
        }}
      >
        <span style={{ fontWeight: 600, fontSize: '1rem', color: '#0F172A', lineHeight: 1.4 }}>{q}</span>
        <ChevronDown
          size={18}
          color="#64748B"
          style={{ flexShrink: 0, transition: 'transform 0.2s', transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}
        />
      </button>
      {open && (
        <div style={{ paddingBottom: '1.25rem', fontSize: '0.9375rem', color: '#475569', lineHeight: 1.75 }}>
          {a}
        </div>
      )}
    </div>
  )
}

/* ─── Page ───────────────────────────────────────────────────────── */
export default function LandingPage() {
  const [plans, setPlans] = useState<Plan[]>([])
  const [plansLoading, setPlansLoading] = useState(true)
  const [isYearly, setIsYearly] = useState(false)
  const [activeSection, setActiveSection] = useState('')
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [siteConfig, setSiteConfig] = useState<Record<string, string>>({
    phone: '+225 07 00 00 00 00',
    whatsapp: '+225 07 00 00 00 00',
    email: 'contact@recov360.com',
    address: 'Abidjan, Côte d\'Ivoire',
    twitter: '',
    linkedin: '',
    facebook: '',
    footer_tagline: 'La plateforme de gestion et d\'automatisation du recouvrement pour les entreprises d\'Afrique de l\'Ouest.',
    company_name: 'Recov360',
  })

  useEffect(() => {
    publicApi.plans()
      .then(data => setPlans(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setPlansLoading(false))

    publicApi.config()
      .then(data => { if (data && typeof data === 'object') setSiteConfig(prev => ({ ...prev, ...data })) })
      .catch(() => {})
  }, [])

  // Intersection Observer pour activer le lien nav correspondant
  useEffect(() => {
    const sections = NAV_LINKS.map(l => l.href)
    const observers: IntersectionObserver[] = []

    sections.forEach(id => {
      const el = document.getElementById(id)
      if (!el) return
      const obs = new IntersectionObserver(
        entries => {
          entries.forEach(e => {
            if (e.isIntersecting) setActiveSection(id)
          })
        },
        { rootMargin: '-40% 0px -50% 0px', threshold: 0 }
      )
      obs.observe(el)
      observers.push(obs)
    })

    return () => observers.forEach(o => o.disconnect())
  }, [])

  function scrollTo(id: string) {
    const el = document.getElementById(id)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const PLAN_STYLE: Record<string, { accent: string; featured: boolean }> = {
    starter:    { accent: '#475569', featured: false },
    pro:        { accent: '#2563EB', featured: true  },
    enterprise: { accent: '#6D28D9', featured: false },
  }

  return (
    <div style={{ fontFamily: "'Inter', system-ui, -apple-system, sans-serif", background: '#FFFFFF', color: '#0F172A', lineHeight: 1.6 }}>

      {/* ── Navbar ────────────────────────────────────────────────── */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 100,
        background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(16px)',
        borderBottom: '1px solid #F1F5F9',
      }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 1.5rem', display: 'flex', alignItems: 'center', height: 68 }}>
          {/* Logo */}
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', textDecoration: 'none', marginRight: '2.5rem', flexShrink: 0 }}>
            <div style={{ width: 36, height: 36, background: '#1E40AF', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Shield size={20} color="white" />
            </div>
            <span style={{ fontWeight: 800, fontSize: '1.125rem', color: '#0F172A', letterSpacing: '-0.01em' }}>Recov360</span>
          </Link>

          {/* Desktop nav */}
          <nav className="landing-desktop-nav">
            {NAV_LINKS.map(({ label, href }) => (
              <button
                key={href}
                onClick={() => scrollTo(href)}
                style={{
                  border: 'none', cursor: 'pointer',
                  padding: '0.5rem 0.75rem', borderRadius: '8px',
                  fontSize: '0.875rem', fontWeight: activeSection === href ? 600 : 500,
                  color: activeSection === href ? '#1E40AF' : '#475569',
                  background: activeSection === href ? '#EFF6FF' : 'transparent',
                  transition: 'all 0.15s',
                  whiteSpace: 'nowrap',
                }}
              >
                {label}
              </button>
            ))}
          </nav>

          {/* Spacer (mobile) */}
          <div style={{ flex: 1 }} />

          {/* Desktop Actions */}
          <div className="landing-desktop-actions" style={{ alignItems: 'center', gap: '0.625rem' }}>
            <Link href="/login" style={{ padding: '0.5rem 1rem', fontSize: '0.9rem', fontWeight: 500, color: '#475569', textDecoration: 'none', borderRadius: '8px', border: '1px solid #E2E8F0', background: 'white' }}>
              Connexion
            </Link>
            <Link href="/subscribe" style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', padding: '0.5rem 1.125rem', background: '#1E40AF', color: 'white', borderRadius: '8px', fontWeight: 600, fontSize: '0.9rem', textDecoration: 'none' }}>
              Démarrer <ArrowRight size={15} />
            </Link>
          </div>

          {/* Mobile hamburger */}
          <button
            className="landing-mobile-btn"
            onClick={() => setMobileNavOpen(o => !o)}
            aria-label={mobileNavOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
          >
            {mobileNavOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        {/* Mobile nav dropdown */}
        {mobileNavOpen && (
          <div style={{
            background: 'white', borderTop: '1px solid #F1F5F9',
            padding: '0.75rem 1rem 1rem',
          }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.125rem', marginBottom: '0.75rem' }}>
              {NAV_LINKS.map(({ label, href }) => (
                <button
                  key={href}
                  onClick={() => { scrollTo(href); setMobileNavOpen(false) }}
                  style={{
                    display: 'block', width: '100%', textAlign: 'left',
                    padding: '0.75rem 1rem', border: 'none', cursor: 'pointer',
                    borderRadius: '8px', fontSize: '1rem', fontWeight: 500,
                    color: activeSection === href ? '#1E40AF' : '#475569',
                    background: activeSection === href ? '#EFF6FF' : 'transparent',
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '0.625rem', paddingTop: '0.75rem', borderTop: '1px solid #F1F5F9' }}>
              <Link
                href="/login"
                onClick={() => setMobileNavOpen(false)}
                style={{ flex: 1, textAlign: 'center', padding: '0.75rem', border: '1px solid #E2E8F0', borderRadius: '8px', color: '#475569', textDecoration: 'none', fontWeight: 500, fontSize: '0.9375rem' }}
              >
                Connexion
              </Link>
              <Link
                href="/subscribe"
                onClick={() => setMobileNavOpen(false)}
                style={{ flex: 1, textAlign: 'center', padding: '0.75rem', background: '#1E40AF', color: 'white', borderRadius: '8px', fontWeight: 600, fontSize: '0.9375rem', textDecoration: 'none' }}
              >
                Démarrer
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* ── Hero ──────────────────────────────────────────────────── */}
      <section style={{
        background: 'linear-gradient(160deg, #0F172A 0%, #1E3A6E 55%, #1E40AF 100%)',
        padding: '7rem 1.5rem 6rem',
        position: 'relative', overflow: 'hidden',
      }}>
        {/* Motif décoratif */}
        <div aria-hidden style={{ position: 'absolute', inset: 0, opacity: 0.04, backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 39px, #fff 39px, #fff 40px), repeating-linear-gradient(90deg, transparent, transparent 39px, #fff 39px, #fff 40px)' }} />
        <div aria-hidden style={{ position: 'absolute', right: '-10%', top: '-20%', width: '60%', height: '140%', background: 'radial-gradient(circle, rgba(59,130,246,0.15) 0%, transparent 70%)' }} />

        <div style={{ position: 'relative', maxWidth: 760, margin: '0 auto', textAlign: 'center', color: 'white' }}>
          <h1 style={{ fontSize: 'clamp(2.25rem, 5.5vw, 3.75rem)', fontWeight: 900, lineHeight: 1.08, letterSpacing: '-0.03em', margin: '0 0 1.5rem' }}>
            Gérez vos impayés.{' '}
            <br />
            <span style={{ color: '#60A5FA' }}>Récupérez ce qui vous est dû.</span>
          </h1>
          <p style={{ fontSize: 'clamp(1rem, 2vw, 1.1875rem)', color: 'rgba(255,255,255,0.72)', maxWidth: 580, margin: '0 auto 2.5rem', lineHeight: 1.75 }}>
            Recov360 centralise la gestion de vos créances, automatise vos relances et vous donne une visibilité complète sur votre portefeuille d'impayés.
          </p>
          <div style={{ display: 'flex', gap: '0.875rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/subscribe" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.875rem 1.75rem', background: '#2563EB', borderRadius: '10px', fontWeight: 700, color: 'white', textDecoration: 'none', fontSize: '1rem', boxShadow: '0 4px 24px rgba(37,99,235,0.45)' }}>
              Essai gratuit 14 jours <ArrowRight size={17} />
            </Link>
            <button onClick={() => scrollTo('how')} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.875rem 1.5rem', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.18)', borderRadius: '10px', fontWeight: 600, color: 'white', fontSize: '1rem', cursor: 'pointer' }}>
              Comment ça marche
            </button>
          </div>
          <p style={{ marginTop: '1.25rem', fontSize: '0.8125rem', color: 'rgba(255,255,255,0.4)' }}>
            Aucune carte bancaire requise · Annulation sans frais
          </p>
        </div>
      </section>

      {/* ── Stats ─────────────────────────────────────────────────── */}
      <section style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '3rem 1.5rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0' }}>
          {STATS.map((s, i) => (
            <div key={i} style={{ textAlign: 'center', padding: '1.25rem 1.5rem', borderRight: i < STATS.length - 1 ? '1px solid #E2E8F0' : 'none' }}>
              <div style={{ fontSize: 'clamp(1.75rem, 3vw, 2.25rem)', fontWeight: 900, color: '#0F172A', letterSpacing: '-0.02em', lineHeight: 1 }}>{s.value}</div>
              <div style={{ fontSize: '0.875rem', color: '#64748B', marginTop: '0.375rem', lineHeight: 1.4 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Fonctionnalités ───────────────────────────────────────── */}
      <section id="features" style={{ padding: '6rem 1.5rem', background: 'white' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ maxWidth: 560, marginBottom: '3.5rem' }}>
            <h2 style={{ fontSize: 'clamp(1.75rem, 3.5vw, 2.5rem)', fontWeight: 800, lineHeight: 1.15, margin: '0 0 1rem', letterSpacing: '-0.02em' }}>
              Une plateforme complète, pas une simple liste de contacts
            </h2>
            <p style={{ fontSize: '1.0625rem', color: '#64748B', margin: 0, lineHeight: 1.7 }}>
              Recov360 couvre l'intégralité du processus de recouvrement, de la première relance jusqu'à l'encaissement.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
            {FEATURES.map(({ icon: Icon, title, desc }) => (
              <div key={title} style={{ padding: '1.75rem', borderRadius: '14px', border: '1px solid #E2E8F0', background: 'white', transition: 'box-shadow 0.2s' }}>
                <div style={{ width: 48, height: 48, borderRadius: '12px', background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.125rem' }}>
                  <Icon size={22} color="#1D4ED8" />
                </div>
                <h3 style={{ margin: '0 0 0.5rem', fontSize: '1.0625rem', fontWeight: 700, color: '#0F172A', lineHeight: 1.3 }}>{title}</h3>
                <p style={{ margin: 0, fontSize: '0.9375rem', color: '#64748B', lineHeight: 1.65 }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Comment ça marche ─────────────────────────────────────── */}
      <section id="how" style={{ padding: '6rem 1.5rem', background: '#F8FAFC' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', maxWidth: 540, margin: '0 auto 4rem' }}>
            <h2 style={{ fontSize: 'clamp(1.75rem, 3.5vw, 2.5rem)', fontWeight: 800, lineHeight: 1.15, margin: '0 0 1rem', letterSpacing: '-0.02em' }}>
              Opérationnel en moins d'une heure
            </h2>
            <p style={{ fontSize: '1.0625rem', color: '#64748B', margin: 0, lineHeight: 1.7 }}>
              Pas de formation longue, pas de consultant requis. Votre équipe peut commencer à relancer dès aujourd'hui.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '2rem' }}>
            {HOW_STEPS.map((step, idx) => (
              <div key={idx} style={{ position: 'relative' }}>
                <div style={{ fontSize: '4rem', fontWeight: 900, color: '#E2E8F0', lineHeight: 1, marginBottom: '0.875rem', letterSpacing: '-0.04em' }}>{step.num}</div>
                <h3 style={{ margin: '0 0 0.625rem', fontSize: '1.125rem', fontWeight: 700, color: '#0F172A' }}>{step.title}</h3>
                <p style={{ margin: 0, fontSize: '0.9375rem', color: '#64748B', lineHeight: 1.65 }}>{step.desc}</p>
                {idx < HOW_STEPS.length - 1 && (
                  <div aria-hidden style={{ position: 'absolute', top: '2rem', right: '-1rem', fontSize: '1.25rem', color: '#CBD5E1', display: 'none' }}>→</div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Témoignages ───────────────────────────────────────────── */}
      <section style={{ padding: '6rem 1.5rem', background: 'white' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', maxWidth: 480, margin: '0 auto 3.5rem' }}>
            <h2 style={{ fontSize: 'clamp(1.75rem, 3.5vw, 2.25rem)', fontWeight: 800, lineHeight: 1.15, margin: '0 0 0.75rem', letterSpacing: '-0.02em' }}>
              Ce que disent nos clients
            </h2>
            <p style={{ fontSize: '1.0625rem', color: '#64748B', margin: 0 }}>
              Des équipes financières qui ont transformé leur processus de recouvrement.
            </p>
          </div>
          <div className="testimonials-scroll">
            {TESTIMONIALS.map((t, i) => (
              <div key={i} className="testimonials-card" style={{ padding: '2rem', border: '1px solid #E2E8F0', borderRadius: '16px', background: 'white', display: 'flex', flexDirection: 'column' }}>
                {/* Quote */}
                <div style={{ fontSize: '1.5rem', color: '#CBD5E1', marginBottom: '0.75rem', lineHeight: 1 }}>"</div>
                <p style={{ margin: '0 0 1.5rem', fontSize: '0.9375rem', color: '#334155', lineHeight: 1.75, flex: 1, fontStyle: 'italic' }}>{t.text}</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#1E40AF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 700, color: 'white', flexShrink: 0 }}>
                    {t.initials}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.9375rem', color: '#0F172A' }}>{t.author}</div>
                    <div style={{ fontSize: '0.8125rem', color: '#64748B' }}>{t.role} · {t.company}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ───────────────────────────────────────────────── */}
      <section id="pricing" style={{ padding: '6rem 1.5rem', background: '#F8FAFC' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', maxWidth: 540, margin: '0 auto 2.5rem' }}>
            <h2 style={{ fontSize: 'clamp(1.75rem, 3.5vw, 2.5rem)', fontWeight: 800, lineHeight: 1.15, margin: '0 0 1rem', letterSpacing: '-0.02em' }}>
              Des tarifs clairs, sans surprise
            </h2>
            <p style={{ fontSize: '1.0625rem', color: '#64748B', margin: '0 0 1.75rem' }}>
              Commencez avec l'essai gratuit. Choisissez votre plan uniquement quand vous êtes prêt.
            </p>

            {/* Toggle mensuel / annuel */}
            <div style={{ display: 'inline-flex', background: 'white', border: '1px solid #E2E8F0', borderRadius: '10px', padding: '0.25rem' }}>
              {[{ label: 'Mensuel', val: false }, { label: 'Annuel  −20%', val: true }].map(opt => (
                <button
                  key={String(opt.val)}
                  onClick={() => setIsYearly(opt.val)}
                  style={{
                    padding: '0.5rem 1.25rem', borderRadius: '8px', border: 'none', cursor: 'pointer',
                    fontSize: '0.875rem', fontWeight: 600,
                    background: isYearly === opt.val ? '#1E40AF' : 'transparent',
                    color: isYearly === opt.val ? 'white' : '#64748B',
                    transition: 'all 0.2s',
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {plansLoading ? (
            <div className="plans-grid" style={{ gap: '1.25rem' }}>
              {[...Array(3)].map((_, i) => (
                <div key={i} style={{ background: 'white', borderRadius: '16px', height: 460, border: '1px solid #E2E8F0', animation: 'pulse 2s infinite' }} />
              ))}
            </div>
          ) : plans.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '4rem', color: '#94A3B8' }}>
              Les plans seront disponibles prochainement. Contactez-nous pour un devis.
            </div>
          ) : (
            <div className="plans-grid">
              {plans.map(plan => {
                const style = PLAN_STYLE[plan.slug] ?? { accent: '#64748B', featured: false }
                const price = isYearly ? plan.price_yearly : plan.price_monthly
                return (
                  <div
                    key={plan.id}
                    style={{
                      background: style.featured ? '#0F172A' : 'white',
                      border: `2px solid ${style.featured ? '#2563EB' : '#E2E8F0'}`,
                      borderRadius: '16px',
                      padding: '2rem',
                      position: 'relative',
                      boxShadow: style.featured ? '0 20px 60px rgba(37,99,235,0.2)' : 'none',
                      transform: style.featured ? 'translateY(-8px)' : 'none',
                    }}
                  >
                    {style.featured && (
                      <div style={{ position: 'absolute', top: -14, left: '50%', transform: 'translateX(-50%)', background: '#2563EB', color: 'white', padding: '0.25rem 1rem', borderRadius: '20px', fontSize: '0.78rem', fontWeight: 700, whiteSpace: 'nowrap', letterSpacing: '0.04em' }}>
                        RECOMMANDÉ
                      </div>
                    )}

                    <div style={{ marginBottom: '1.25rem' }}>
                      <div style={{ fontWeight: 800, fontSize: '0.875rem', color: style.featured ? 'white' : '#0F172A', marginBottom: '0.375rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        {plan.name}
                      </div>
                      {plan.description && (
                        <div style={{ fontSize: '0.875rem', color: style.featured ? 'rgba(255,255,255,0.55)' : '#64748B', lineHeight: 1.5 }}>
                          {plan.description}
                        </div>
                      )}
                    </div>

                    <div style={{ marginBottom: '1.75rem', paddingBottom: '1.75rem', borderBottom: `1px solid ${style.featured ? 'rgba(255,255,255,0.1)' : '#F1F5F9'}` }}>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.25rem' }}>
                        <span style={{ fontSize: '2.75rem', fontWeight: 900, color: style.featured ? 'white' : '#0F172A', letterSpacing: '-0.03em', lineHeight: 1 }}>
                          {formatCurrency(price)}
                        </span>
                        <span style={{ fontSize: '0.9rem', color: style.featured ? 'rgba(255,255,255,0.5)' : '#94A3B8', fontWeight: 400 }}>
                          /{isYearly ? 'an' : 'mois'}
                        </span>
                      </div>
                      {plan.trial_days > 0 && (
                        <div style={{ marginTop: '0.5rem', fontSize: '0.8125rem', color: '#22C55E', fontWeight: 500 }}>
                          {plan.trial_days} jours d'essai gratuit inclus
                        </div>
                      )}
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem', marginBottom: '2rem' }}>
                      {[
                        `${plan.max_users} utilisateur${plan.max_users > 1 ? 's' : ''}`,
                        `${plan.max_debtors.toLocaleString()} débiteurs`,
                        `${plan.max_invoices.toLocaleString()} créances`,
                      ].map(f => (
                        <div key={f} style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', fontSize: '0.9rem', color: style.featured ? 'rgba(255,255,255,0.8)' : '#334155' }}>
                          <Check size={15} color={style.featured ? '#60A5FA' : style.accent} strokeWidth={2.5} />
                          {f}
                        </div>
                      ))}
                      {plan.features && Object.entries(plan.features).filter(([, v]) => v).map(([k]) => (
                        <div key={k} style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', fontSize: '0.9rem', color: style.featured ? 'rgba(255,255,255,0.8)' : '#334155' }}>
                          <Check size={15} color={style.featured ? '#60A5FA' : style.accent} strokeWidth={2.5} />
                          {FEATURE_LABELS[k] ?? k}
                        </div>
                      ))}
                    </div>

                    <Link
                      href="/subscribe"
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.375rem',
                        padding: '0.8125rem', borderRadius: '10px', fontWeight: 700, fontSize: '0.9375rem',
                        textDecoration: 'none', transition: 'all 0.2s',
                        background: style.featured ? '#2563EB' : style.accent + '12',
                        color: style.featured ? 'white' : style.accent,
                        border: style.featured ? 'none' : `1.5px solid ${style.accent}30`,
                      }}
                    >
                      Commencer l'essai gratuit <ArrowRight size={16} />
                    </Link>
                  </div>
                )
              })}
            </div>
          )}

          <p style={{ textAlign: 'center', marginTop: '2rem', fontSize: '0.875rem', color: '#94A3B8' }}>
            Tous les prix sont hors taxes · Paiement sécurisé via FedaPay (Mobile Money, carte, virement)
          </p>
        </div>
      </section>

      {/* ── FAQ ───────────────────────────────────────────────────── */}
      <section id="faq" style={{ padding: '6rem 1.5rem', background: 'white' }}>
        <div style={{ maxWidth: 720, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <h2 style={{ fontSize: 'clamp(1.75rem, 3.5vw, 2.25rem)', fontWeight: 800, lineHeight: 1.15, margin: '0 0 0.75rem', letterSpacing: '-0.02em' }}>
              Questions fréquentes
            </h2>
            <p style={{ fontSize: '1.0625rem', color: '#64748B', margin: 0 }}>
              Tout ce que vous devez savoir avant de démarrer.
            </p>
          </div>
          <div style={{ borderTop: '1px solid #E2E8F0' }}>
            {FAQS.map(({ q, a }) => <FaqItem key={q} q={q} a={a} />)}
          </div>
        </div>
      </section>

      {/* ── CTA final ─────────────────────────────────────────────── */}
      <section style={{ padding: '6rem 1.5rem', background: 'linear-gradient(135deg, #0F172A 0%, #1E3A6E 100%)', textAlign: 'center', color: 'white' }}>
        <div style={{ maxWidth: 620, margin: '0 auto' }}>
          <h2 style={{ fontSize: 'clamp(1.875rem, 4vw, 2.875rem)', fontWeight: 900, lineHeight: 1.1, margin: '0 0 1.125rem', letterSpacing: '-0.025em' }}>
            Prêt à reprendre le contrôle de vos créances ?
          </h2>
          <p style={{ fontSize: '1.0625rem', color: 'rgba(255,255,255,0.65)', margin: '0 0 2.5rem', lineHeight: 1.7 }}>
            Démarrez votre essai gratuit sans engagement. Aucune carte bancaire requise.
          </p>
          <div style={{ display: 'flex', gap: '0.875rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/subscribe" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.9375rem 2rem', background: '#2563EB', borderRadius: '10px', color: 'white', fontWeight: 700, fontSize: '1rem', textDecoration: 'none', boxShadow: '0 4px 24px rgba(37,99,235,0.45)' }}>
              Commencer gratuitement <ArrowRight size={17} />
            </Link>
            <Link href="/login" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.9375rem 1.75rem', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '10px', color: 'white', fontWeight: 600, fontSize: '1rem', textDecoration: 'none' }}>
              Se connecter
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ────────────────────────────────────────────────── */}
      <footer id="contact" style={{ background: '#050E1A', color: '#94A3B8', padding: '4rem 1.5rem 2rem' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          {/* Colonnes */}
          <div className="landing-footer-grid">
            {/* Marque */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '1rem' }}>
                <div style={{ width: 34, height: 34, background: '#1E40AF', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Shield size={18} color="white" />
                </div>
                <span style={{ fontWeight: 800, color: 'white', fontSize: '1rem' }}>{siteConfig.company_name || 'Recov360'}</span>
              </div>
              <p style={{ fontSize: '0.9rem', lineHeight: 1.7, margin: '0 0 1.25rem', maxWidth: 300 }}>
                {siteConfig.footer_tagline || "La plateforme de gestion et d'automatisation du recouvrement pour les entreprises d'Afrique de l'Ouest."}
              </p>
              <div style={{ display: 'flex', gap: '0.625rem' }}>
                {siteConfig.whatsapp && (
                  <a href={`https://wa.me/${siteConfig.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" aria-label="WhatsApp" style={{ width: 34, height: 34, border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748B', textDecoration: 'none' }}>
                    <MessageCircle size={15} />
                  </a>
                )}
                {siteConfig.linkedin && (
                  <a href={siteConfig.linkedin} target="_blank" rel="noopener noreferrer" aria-label="LinkedIn" style={{ width: 34, height: 34, border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748B', textDecoration: 'none' }}>
                    <ExternalLink size={15} />
                  </a>
                )}
                {siteConfig.twitter && (
                  <a href={siteConfig.twitter} target="_blank" rel="noopener noreferrer" aria-label="Twitter / X" style={{ width: 34, height: 34, border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748B', textDecoration: 'none' }}>
                    <Globe2 size={15} />
                  </a>
                )}
                {siteConfig.facebook && (
                  <a href={siteConfig.facebook} target="_blank" rel="noopener noreferrer" aria-label="Facebook" style={{ width: 34, height: 34, border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748B', textDecoration: 'none' }}>
                    <Globe2 size={15} />
                  </a>
                )}
              </div>
            </div>

            {/* Produit */}
            <div>
              <div style={{ fontWeight: 700, color: 'white', fontSize: '0.875rem', marginBottom: '1rem', letterSpacing: '0.04em', textTransform: 'uppercase' }}>Produit</div>
              {[
                { label: 'Fonctionnalités', href: '#features' },
                { label: 'Tarifs', href: '#pricing' },
                { label: 'Comment ça marche', href: '#how' },
                { label: 'FAQ', href: '#faq' },
              ].map(item => (
                <div key={item.label} style={{ marginBottom: '0.625rem' }}>
                  <a href={item.href} style={{ fontSize: '0.9rem', color: '#64748B', textDecoration: 'none', transition: 'color 0.15s' }}>{item.label}</a>
                </div>
              ))}
            </div>

            {/* Accès */}
            <div>
              <div style={{ fontWeight: 700, color: 'white', fontSize: '0.875rem', marginBottom: '1rem', letterSpacing: '0.04em', textTransform: 'uppercase' }}>Accès</div>
              {[
                { label: 'Se connecter', href: '/login' },
                { label: 'Créer un compte', href: '/register' },
                { label: "Choisir un plan", href: '/subscribe' },
              ].map(item => (
                <div key={item.label} style={{ marginBottom: '0.625rem' }}>
                  <a href={item.href} style={{ fontSize: '0.9rem', color: '#64748B', textDecoration: 'none', transition: 'color 0.15s' }}>{item.label}</a>
                </div>
              ))}
            </div>

            {/* Contact */}
            <div>
              <div style={{ fontWeight: 700, color: 'white', fontSize: '0.875rem', marginBottom: '1rem', letterSpacing: '0.04em', textTransform: 'uppercase' }}>Contact</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {siteConfig.email && (
                  <a href={`mailto:${siteConfig.email}`} style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', fontSize: '0.9rem', color: '#64748B', textDecoration: 'none' }}>
                    <Mail size={15} /> {siteConfig.email}
                  </a>
                )}
                {siteConfig.phone && (
                  <a href={`tel:${siteConfig.phone.replace(/\s/g, '')}`} style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', fontSize: '0.9rem', color: '#64748B', textDecoration: 'none' }}>
                    <Phone size={15} /> {siteConfig.phone}
                  </a>
                )}
                {siteConfig.whatsapp && (
                  <a href={`https://wa.me/${siteConfig.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', fontSize: '0.9rem', color: '#64748B', textDecoration: 'none' }}>
                    <MessageCircle size={15} /> WhatsApp
                  </a>
                )}
                {siteConfig.address && (
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.625rem', fontSize: '0.9rem' }}>
                    <MapPin size={15} style={{ flexShrink: 0, marginTop: '0.15rem' }} />
                    <span>{siteConfig.address}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Bas du footer */}
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
            <p style={{ margin: 0, fontSize: '0.8125rem' }}>
              © {new Date().getFullYear()} {siteConfig.company_name || 'Recov360'}. Tous droits réservés.
            </p>
            <div style={{ display: 'flex', gap: '1.5rem' }}>
              {["Confidentialité", "Conditions d'utilisation", "Mentions légales"].map(item => (
                <a key={item} href="#" style={{ fontSize: '0.8125rem', color: '#475569', textDecoration: 'none' }}>{item}</a>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
