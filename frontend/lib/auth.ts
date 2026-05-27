import { tokens, authApi } from './api'
import type { User } from '@/types'

export async function getMe(): Promise<User | null> {
  if (!tokens.access) return null
  try { return await authApi.me() }
  catch { return null }
}

export function isAuthenticated(): boolean {
  return Boolean(tokens.access)
}

export async function logout() {
  try { await authApi.logout() } catch { /* ignore */ }
  tokens.clear()
  if (typeof window !== 'undefined') window.location.href = '/login'
}
