'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import {
  LayoutDashboard, Users, FileText, Bell, BarChart3,
  Settings, LogOut, Workflow, ChevronRight,
  TrendingUp, Building2, PanelLeftClose, PanelLeftOpen, CreditCard,
} from 'lucide-react'
import { useAuth } from '@/contexts/auth'
import { getInitials, roleLabel } from '@/lib/utils'
import { getVisibleNav } from '@/lib/permissions'
import ThemeToggle from './ThemeToggle'
import { companyApi } from '@/lib/api'
import { BOTTOM_NAV_ITEMS } from './BottomNav'

const ALL_NAV = [
  { href: '/dashboard',     label: 'Tableau de bord', icon: LayoutDashboard },
  { href: '/debtors',       label: 'Débiteurs',        icon: Users },
  { href: '/invoices',      label: 'Créances',         icon: FileText },
  { href: '/workflows',     label: 'Workflows',        icon: Workflow },
  { href: '/scoring',       label: 'Scoring',          icon: TrendingUp },
  { href: '/reports',       label: 'Rapports',         icon: BarChart3 },
  { href: '/notifications', label: 'Notifications',    icon: Bell },
  { href: '/team',          label: 'Équipe',           icon: Building2 },
  { href: '/subscription',  label: 'Abonnement',       icon: CreditCard },
  { href: '/settings',      label: 'Paramètres',       icon: Settings },
]

/** Routes déjà accessibles via la bottom nav — exclues du sidebar mobile */
const BOTTOM_NAV_HREFS = new Set(BOTTOM_NAV_ITEMS.map(i => i.href))

interface Props {
  open: boolean
  collapsed: boolean
  onClose: () => void
  onToggleCollapse: () => void
}

export default function Sidebar({ open, collapsed, onClose, onToggleCollapse }: Props) {
  const pathname = usePathname()
  const { user, logout } = useAuth()
  const [companyName, setCompanyName] = useState('')
  const [companyLogo, setCompanyLogo] = useState('')
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    companyApi.get().then(c => {
      if (c.name)     setCompanyName(c.name)
      if (c.logo_url) setCompanyLogo(c.logo_url)
    }).catch(() => {})
  }, [])

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 1024)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  const visibleRoutes = getVisibleNav(user?.role)
  const allVisible   = ALL_NAV.filter(item => visibleRoutes.includes(item.href))

  /**
   * Sur mobile : on affiche uniquement les items qui ne sont PAS dans la bottom nav
   * (Dashboard, Débiteurs, Créances, Rapports, Alertes sont déjà accessibles en bas)
   * Sur desktop : on affiche tout.
   */
  const navItems = isMobile
    ? allVisible.filter(item => !BOTTOM_NAV_HREFS.has(item.href))
    : allVisible

  return (
    <>
      {/* Backdrop mobile */}
      {open && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 30 }}
          onClick={onClose}
        />
      )}

      <aside className={`sidebar${open ? ' open' : ''}${collapsed ? ' collapsed' : ''}`}>

        {/* En-tête sidebar : logo + bouton réduire/étendre */}
        <div style={{
          padding: collapsed ? '1rem 0' : '1.25rem 1rem 0.75rem',
          display: 'flex', alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'space-between',
          gap: '0.5rem',
        }}>
          {!collapsed && (
            <Link
              href="/dashboard"
              style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', textDecoration: 'none', overflow: 'hidden', flex: 1 }}
            >
              {companyLogo ? (
                <img
                  src={companyLogo} alt="Logo"
                  style={{ width: 32, height: 32, objectFit: 'contain', borderRadius: '6px', background: 'rgba(255,255,255,0.1)', padding: 2, flexShrink: 0 }}
                />
              ) : (
                <div style={{ width: 32, height: 32, background: 'var(--primary)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <TrendingUp size={18} color="white" />
                </div>
              )}
              <div style={{ overflow: 'hidden' }}>
                <div style={{ color: 'white', fontWeight: 700, fontSize: '0.9375rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {companyName || 'Recov360'}
                </div>
                {companyName && (
                  <div style={{ color: '#64748b', fontSize: '0.65rem', marginTop: 1 }}>Recov360</div>
                )}
              </div>
            </Link>
          )}

          {collapsed && (
            <Link href="/dashboard" style={{ display: 'flex', textDecoration: 'none' }} onClick={onClose}>
              {companyLogo
                ? <img src={companyLogo} alt="Logo" style={{ width: 32, height: 32, objectFit: 'contain', borderRadius: '6px', background: 'rgba(255,255,255,0.1)', padding: 2 }} />
                : <div style={{ width: 32, height: 32, background: 'var(--primary)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><TrendingUp size={18} color="white" /></div>
              }
            </Link>
          )}

          {/* Bouton réduire/étendre — desktop uniquement */}
          <button
            onClick={onToggleCollapse}
            title={collapsed ? 'Étendre le menu' : 'Réduire le menu'}
            className="sidebar-collapse-btn"
            style={{ color: '#64748b', padding: '0.25rem', background: 'none', border: 'none', cursor: 'pointer', borderRadius: '6px', display: 'flex', alignItems: 'center' }}
          >
            {collapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
          </button>
        </div>

        {/* Navigation */}
        <nav style={{ flex: 1, padding: '0.5rem 0', marginTop: '0.25rem' }}>
          {!collapsed && (
            <div style={{ padding: '0 0.75rem 0.5rem', fontSize: '0.7rem', fontWeight: 600, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              {isMobile ? 'Autres' : 'Navigation'}
            </div>
          )}
          {navItems.map(item => {
            const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={`sidebar-nav-item${isActive ? ' active' : ''}`}
                title={collapsed ? item.label : undefined}
              >
                <Icon className="icon" />
                {!collapsed && <span className="sidebar-label">{item.label}</span>}
                {!collapsed && isActive && <ChevronRight size={14} style={{ marginLeft: 'auto', opacity: 0.6 }} />}
              </Link>
            )
          })}
        </nav>

        {/* Bas : thème + profil */}
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', padding: collapsed ? '0.75rem 0.5rem' : '0.75rem' }}>
          {!collapsed && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '0.5rem' }}>
              <ThemeToggle />
            </div>
          )}
          {collapsed && (
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.5rem' }}>
              <ThemeToggle />
            </div>
          )}
          {user && (
            collapsed ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                <Link href="/settings/profile" title={`${user.first_name} ${user.last_name}`} style={{ textDecoration: 'none' }} onClick={onClose}>
                  <div style={{ width: 32, height: 32, background: 'var(--primary)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700, color: 'white' }}>
                    {getInitials(`${user.first_name} ${user.last_name}`)}
                  </div>
                </Link>
                <button onClick={logout} title="Déconnexion" style={{ color: '#64748b', background: 'none', border: 'none', cursor: 'pointer', padding: '0.25rem', borderRadius: '4px' }}>
                  <LogOut size={14} />
                </button>
              </div>
            ) : (
              <Link href="/settings/profile" style={{ textDecoration: 'none' }} onClick={onClose}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', padding: '0.5rem', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', cursor: 'pointer' }}>
                  <div style={{ width: 32, height: 32, background: 'var(--primary)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700, color: 'white', flexShrink: 0 }}>
                    {getInitials(`${user.first_name} ${user.last_name}`)}
                  </div>
                  <div style={{ flex: 1, overflow: 'hidden' }}>
                    <div style={{ color: '#e2e8f0', fontSize: '0.8125rem', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {user.first_name} {user.last_name}
                    </div>
                    <div style={{ color: '#64748b', fontSize: '0.7rem' }}>{roleLabel(user.role)}</div>
                  </div>
                  <button
                    onClick={e => { e.preventDefault(); e.stopPropagation(); logout() }}
                    title="Déconnexion"
                    style={{ color: '#64748b', background: 'none', border: 'none', cursor: 'pointer', padding: '0.25rem', borderRadius: '4px' }}
                  >
                    <LogOut size={15} />
                  </button>
                </div>
              </Link>
            )
          )}
        </div>
      </aside>
    </>
  )
}
