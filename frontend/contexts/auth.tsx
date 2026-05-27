'use client'
import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { tokens, authApi } from '@/lib/api'
import type { User } from '@/types'

interface AuthCtx {
  user: User | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  refresh: () => Promise<void>
}

const AuthContext = createContext<AuthCtx | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  async function load() {
    if (!tokens.access) { setLoading(false); return }
    try { setUser(await authApi.me()) }
    catch { tokens.clear(); setUser(null) }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  async function login(email: string, password: string) {
    const data = await authApi.login(email, password)
    tokens.set(data.access_token, data.refresh_token)
    setUser(await authApi.me())
  }

  async function logout() {
    try { await authApi.logout() } catch { /* ignore */ }
    tokens.clear(); setUser(null)
    window.location.href = '/login'
  }

  async function refresh() { await load() }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be inside AuthProvider')
  return ctx
}
