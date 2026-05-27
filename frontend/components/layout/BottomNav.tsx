'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Users, FileText, TrendingUp, BarChart3 } from 'lucide-react'

/** Items affichés dans la bottom nav mobile.
 *  Ces routes sont FILTRÉES du sidebar mobile pour éviter les doublons. */
export const BOTTOM_NAV_ITEMS = [
  { href: '/dashboard', label: 'Accueil',   icon: LayoutDashboard },
  { href: '/debtors',   label: 'Débiteurs', icon: Users           },
  { href: '/invoices',  label: 'Créances',  icon: FileText        },
  { href: '/scoring',   label: 'Scoring',   icon: TrendingUp      },
  { href: '/reports',   label: 'Rapports',  icon: BarChart3       },
]

interface Props { unreadCount?: number }

export default function BottomNav({ unreadCount = 0 }: Props) {
  const pathname = usePathname()

  return (
    <nav className="bottom-nav">
      {BOTTOM_NAV_ITEMS.map(item => {
        const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))
        const Icon = item.icon
        return (
          <Link key={item.href} href={item.href} className={`bottom-nav-item${isActive ? ' active' : ''}`}>
            <Icon size={22} />
            <span>{item.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
