'use client'
import Link from 'next/link'
import { Bell, Menu } from 'lucide-react'
import ThemeToggle from './ThemeToggle'
import { useAuth } from '@/contexts/auth'
import { getInitials } from '@/lib/utils'

interface Props {
  onMenuOpen?: () => void
  title?: string
  unreadCount?: number
}

export default function Header({ onMenuOpen, title, unreadCount = 0 }: Props) {
  const { user } = useAuth()

  return (
    <header style={{
      position: 'sticky', top: 0, zIndex: 20,
      background: 'var(--surface)',
      borderBottom: '1px solid var(--border)',
      padding: '0 1rem',
      height: 56,
      display: 'flex', alignItems: 'center', gap: '0.75rem',
    }}>

      {/* ── Hamburger : mobile uniquement (≤1023px), côté gauche ── */}
      {onMenuOpen && (
        <button
          onClick={onMenuOpen}
          className="header-hamburger"
          aria-label="Ouvrir le menu"
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            padding: '0.375rem', borderRadius: '8px',
            color: 'var(--foreground-muted)',
            transition: 'background 0.15s',
          }}
        >
          <Menu size={22} />
        </button>
      )}

      {/* Title — desktop seulement */}
      {title && (
        <h1 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--foreground)', margin: 0 }}
            className="hidden lg:block">
          {title}
        </h1>
      )}

      <div style={{ flex: 1 }} />

      {/* Actions droite */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
        <div className="hidden lg:block">
          <ThemeToggle />
        </div>

        {/* Cloche notifications */}
        <Link
          href="/notifications"
          style={{
            position: 'relative', display: 'flex', alignItems: 'center',
            padding: '0.375rem', borderRadius: '8px',
            color: 'var(--foreground-muted)', transition: 'background 0.15s',
            textDecoration: 'none',
          }}
        >
          <Bell size={20} />
          {unreadCount > 0 && (
            <span style={{
              position: 'absolute', top: 2, right: 2,
              width: 8, height: 8,
              background: 'var(--status-late)',
              borderRadius: '50%',
              border: '2px solid var(--surface)',
            }} />
          )}
        </Link>

        {/* Avatar utilisateur */}
        {user && (
          <Link
            href="/settings/profile"
            style={{
              display: 'flex', alignItems: 'center', gap: '0.5rem',
              textDecoration: 'none', padding: '0.25rem 0.5rem',
              borderRadius: '8px', transition: 'background 0.15s',
            }}
          >
            <div style={{
              width: 32, height: 32, background: 'var(--primary)',
              borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '0.75rem', fontWeight: 700, color: 'white', flexShrink: 0,
            }}>
              {getInitials(`${user.first_name} ${user.last_name}`)}
            </div>
            <div className="hidden lg:block" style={{ lineHeight: 1.2 }}>
              <div style={{ fontSize: '0.8125rem', fontWeight: 500, color: 'var(--foreground)' }}>
                {user.first_name}
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--foreground-muted)' }}>
                {user.role}
              </div>
            </div>
          </Link>
        )}
      </div>
    </header>
  )
}
