'use client'
import { useState, useEffect } from 'react'
import Sidebar from './Sidebar'
import Header from './Header'
import BottomNav from './BottomNav'
import { usePushNotifications } from '@/lib/usePushNotifications'

interface Props {
  children: React.ReactNode
  title?: string
  unreadCount?: number
}

export default function AppLayout({ children, title, unreadCount = 0 }: Props) {
  // Notifications push FCM — demande permission + enregistre le token
  usePushNotifications(true)

  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === 'undefined') return false
    return localStorage.getItem('sidebar-collapsed') === 'true'
  })

  useEffect(() => {
    localStorage.setItem('sidebar-collapsed', String(collapsed))
  }, [collapsed])

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar
        open={sidebarOpen}
        collapsed={collapsed}
        onClose={() => setSidebarOpen(false)}
        onToggleCollapse={() => setCollapsed(c => !c)}
      />
      <div className={`page-main${collapsed ? ' sidebar-collapsed' : ''}`} style={{ flex: 1, minWidth: 0 }}>
        <Header
          onMenuOpen={() => setSidebarOpen(true)}
          title={title}
          unreadCount={unreadCount}
        />
        <main className="app-main">
          {children}
        </main>
      </div>
      <BottomNav unreadCount={unreadCount} />
    </div>
  )
}
