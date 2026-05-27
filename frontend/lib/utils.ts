import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, formatDistanceToNow, isAfter, parseISO } from 'date-fns'
import { fr } from 'date-fns/locale'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number, currency = 'XOF'): string {
  if (currency === 'XOF' || currency === 'XAF') {
    return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(amount) + ' ' + currency
  }
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency }).format(amount)
}

export function formatDate(date: string | Date, fmt = 'dd/MM/yyyy'): string {
  try {
    const d = typeof date === 'string' ? parseISO(date) : date
    return format(d, fmt, { locale: fr })
  } catch { return '-' }
}

export function formatRelative(date: string | Date): string {
  try {
    const d = typeof date === 'string' ? parseISO(date) : date
    return formatDistanceToNow(d, { addSuffix: true, locale: fr })
  } catch { return '-' }
}

export function isOverdue(dueDate: string): boolean {
  try { return isAfter(new Date(), parseISO(dueDate)) } catch { return false }
}

export function getInitials(name: string): string {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

export function truncate(str: string, n = 40): string {
  return str.length > n ? str.slice(0, n - 1) + '…' : str
}

export function statusLabel(status: string): string {
  const map: Record<string, string> = {
    en_attente: 'En attente',
    partiellement_paye: 'Partiel',
    en_retard: 'En retard',
    solde: 'Soldé',
    litige: 'Litige',
  }
  return map[status] ?? status
}

export function statusClass(status: string): string {
  const map: Record<string, string> = {
    en_attente: 'badge-pending',
    partiellement_paye: 'badge-partial',
    en_retard: 'badge-late',
    solde: 'badge-paid',
    litige: 'badge-dispute',
  }
  return map[status] ?? 'badge-pending'
}

export function riskLabel(level: string): string {
  const map: Record<string, string> = {
    faible: 'Faible', moyen: 'Moyen', eleve: 'Élevé', critique: 'Critique',
  }
  return map[level] ?? level
}

export function riskClass(level: string): string {
  const map: Record<string, string> = {
    faible: 'badge-risk-low', moyen: 'badge-risk-medium',
    eleve: 'badge-risk-high', critique: 'badge-risk-critical',
  }
  return map[level] ?? 'badge-risk-low'
}

export function roleLabel(role: string): string {
  const map: Record<string, string> = {
    admin: 'Administrateur', comptable: 'Comptable',
    agent: 'Agent', superviseur: 'Superviseur',
  }
  return map[role] ?? role
}

export function paymentMethodLabel(method: string): string {
  const map: Record<string, string> = {
    especes: 'Espèces', virement: 'Virement', cheque: 'Chèque',
    mobile_money: 'Mobile Money', autre: 'Autre',
  }
  return map[method] ?? method
}

export function recoveryRate(paid: number, total: number): number {
  if (total === 0) return 0
  return Math.min(100, Math.round((paid / total) * 100))
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function debounce<T extends (...args: any[]) => void>(fn: T, ms: number): T {
  let timer: ReturnType<typeof setTimeout>
  return ((...args: Parameters<T>) => {
    clearTimeout(timer)
    timer = setTimeout(() => fn(...args), ms)
  }) as T
}
