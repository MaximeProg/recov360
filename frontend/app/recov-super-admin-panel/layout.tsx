'use client'
import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import {
  LayoutDashboard, Building2, FileText, LogOut,
  Shield, CreditCard, BarChart3, ChevronRight, Settings, Menu,
} from 'lucide-react'
import ThemeToggle from '@/components/layout/ThemeToggle'
import { superAdminApi, saTokens } from '@/lib/api'

const BASE = '/recov-super-admin-panel'

const NAV = [
  { href: BASE,                    label: 'Vue globale',        icon: LayoutDashboard, exact: true },
  { href: `${BASE}/companies`,     label: 'Entreprises',        icon: Building2 },
  { href: `${BASE}/plans`,         label: 'Plans & Abonnements',icon: CreditCard },
  { href: `${BASE}/transactions`,  label: 'Transactions',       icon: BarChart3 },
  { href: `${BASE}/logs`,          label: 'Audit logs',         icon: FileText },
  { href: `${BASE}/settings`,      label: 'Paramètres',         icon: Settings },
]

/* ── Palette bleue centralisée ── */
const BLUE = '#2563EB'
const BLUE_DARK = '#1D4ED8'
const BLUE_LIGHT = '#60A5FA'   // texte clair sur fond sombre
const BLUE_15  = 'rgba(37,99,235,0.15)'
const BLUE_08  = 'rgba(37,99,235,0.08)'
const BLUE_20  = 'rgba(37,99,235,0.20)'
const BLUE_25  = 'rgba(37,99,235,0.25)'

interface SAUser { email: string; first_name?: string; last_name?: string }

export default function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const router   = useRouter()
  const pathname = usePathname()
  const [saUser, setSaUser]       = useState<SAUser | null>(null)
  const [status, setStatus]       = useState<'checking' | 'authorized' | 'denied'>('checking')
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const isLoginPage = pathname === `${BASE}/login`

  useEffect(() => {
    if (isLoginPage) { setStatus('authorized'); return }
    if (!saTokens.access) { router.replace(`${BASE}/login`); return }
    Promise.all([superAdminApi.me(), superAdminApi.stats()])
      .then(([me]) => { setSaUser(me); setStatus('authorized') })
      .catch(() => { saTokens.clear(); router.replace(`${BASE}/login`) })
  }, [pathname])

  const handleLogout = () => { saTokens.clear(); router.replace(`${BASE}/login`) }

  if (isLoginPage) return <>{children}</>

  if (status === 'checking' || !saUser) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#0F172A' }}>
        <div style={{ textAlign: 'center', color: '#94A3B8' }}>
          <Shield size={32} color={BLUE} style={{ marginBottom: 12 }} />
          <div style={{ fontSize: '0.875rem' }}>Vérification des accès…</div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--background)', overflow: 'hidden' }}>

      {/* ── Backdrop mobile ── */}
      {sidebarOpen && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 35 }}
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Sidebar ── */}
      <aside className={`sa-sidebar${sidebarOpen ? ' open' : ''}`} style={{
        width: 256,
        background: '#0F172A',
        display: 'flex', flexDirection: 'column',
        position: 'fixed', left: 0, top: 0, height: '100vh', zIndex: 40,
        borderRight: '1px solid rgba(255,255,255,0.06)',
      }}>
        {/* Logo */}
        <div style={{ padding: '1.5rem 1.25rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              width: 40, height: 40,
              background: `linear-gradient(135deg, ${BLUE}, ${BLUE_DARK})`,
              borderRadius: '10px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: `0 4px 12px rgba(37,99,235,0.35)`,
            }}>
              <Shield size={22} color="white" />
            </div>
            <div>
              <div style={{ color: 'white', fontWeight: 700, fontSize: '0.9375rem' }}>Recov360</div>
              <div style={{ fontSize: '0.6875rem', fontWeight: 600, color: BLUE_LIGHT, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                Espace Opérateur
              </div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav style={{ flex: 1, padding: '1rem 0', overflowY: 'auto' }}>
          <div style={{ padding: '0 1rem 0.5rem', fontSize: '0.6875rem', fontWeight: 600, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Administration
          </div>
          {NAV.map(item => {
            const isActive = item.exact ? pathname === item.href : pathname.startsWith(item.href)
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.75rem',
                  padding: '0.625rem 1rem', margin: '0.125rem 0.625rem',
                  borderRadius: '8px', textDecoration: 'none', fontSize: '0.875rem',
                  background: isActive ? BLUE_15 : 'transparent',
                  color: isActive ? BLUE_LIGHT : '#94A3B8',
                  borderLeft: isActive ? `3px solid ${BLUE}` : '3px solid transparent',
                  paddingLeft: isActive ? 'calc(1rem - 3px)' : '1rem',
                  transition: 'all 0.15s',
                  fontWeight: isActive ? 600 : 400,
                }}
              >
                <Icon size={16} style={{ flexShrink: 0 }} />
                <span style={{ flex: 1 }}>{item.label}</span>
                {isActive && <ChevronRight size={13} style={{ opacity: 0.6 }} />}
              </Link>
            )
          })}
        </nav>

        {/* Profil + déconnexion */}
        <div style={{ padding: '0.75rem', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          <div style={{ marginBottom: '0.625rem' }}>
            <ThemeToggle />
          </div>
          <div style={{
            background: BLUE_08,
            border: `1px solid ${BLUE_20}`,
            borderRadius: '10px', padding: '0.75rem',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '0.625rem' }}>
              <div style={{
                width: 34, height: 34,
                background: `linear-gradient(135deg, ${BLUE}, ${BLUE_DARK})`,
                borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '0.7rem', fontWeight: 800, color: 'white', flexShrink: 0,
              }}>
                {saUser.first_name?.[0]?.toUpperCase() ?? 'S'}{saUser.last_name?.[0]?.toUpperCase() ?? 'A'}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ color: '#E2E8F0', fontSize: '0.8rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {saUser.email}
                </div>
                <div style={{ color: BLUE_LIGHT, fontSize: '0.7rem', fontWeight: 600 }}>Super Admin</div>
              </div>
            </div>
            <button
              onClick={handleLogout}
              style={{
                width: '100%',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.375rem',
                background: BLUE_08, border: `1px solid ${BLUE_25}`,
                borderRadius: '6px', padding: '0.4rem', color: BLUE_LIGHT,
                cursor: 'pointer', fontSize: '0.8rem', fontWeight: 500,
              }}
            >
              <LogOut size={13} /> Déconnexion
            </button>
          </div>
        </div>
      </aside>

      {/* ── Contenu principal ── */}
      <div className="sa-main" style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        {/* Bandeau bleu */}
        <div className="sa-banner" style={{
          background: `linear-gradient(90deg, ${BLUE}, ${BLUE_DARK})`,
          display: 'flex', alignItems: 'center', gap: '0.625rem',
        }}>
          {/* Hamburger (mobile uniquement) */}
          <button
            className="sa-hamburger"
            onClick={() => setSidebarOpen(o => !o)}
            aria-label="Ouvrir le menu"
          >
            <Menu size={18} />
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', fontWeight: 600, color: 'white', flex: 1 }}>
            <Shield size={13} />
            Interface Opérateur Recov360 — Accès restreint
          </div>
          <span className="sa-banner-email" style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.75)', fontFamily: 'monospace' }}>
            {saUser.email}
          </span>
        </div>
        <main className="sa-content" style={{ flex: 1 }}>
          {children}
        </main>
      </div>
    </div>
  )
}
