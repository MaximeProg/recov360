import type { UserRole } from '@/types'

const ROLE_RANK: Record<UserRole, number> = {
  admin: 4,
  superviseur: 3,
  comptable: 2,
  agent: 1,
}

function atLeast(role: UserRole, min: UserRole): boolean {
  return ROLE_RANK[role] >= ROLE_RANK[min]
}

export function getPermissions(role: UserRole | undefined) {
  if (!role) return {} as ReturnType<typeof buildPerms>
  return buildPerms(role)
}

function buildPerms(role: UserRole) {
  const isAdmin       = atLeast(role, 'admin')
  const isSupervisor  = atLeast(role, 'superviseur')
  const isComptable   = atLeast(role, 'comptable')

  return {
    // Debtors
    canCreateDebtor:  isSupervisor,
    canDeleteDebtor:  isAdmin,
    canEditDebtor:    isSupervisor,
    canViewDebtors:   true,

    // Invoices
    canCreateInvoice: isSupervisor,
    canDeleteInvoice: isAdmin,
    canViewInvoices:  true,

    // Payments
    canRecordPayment: isComptable,

    // Reminders
    canSendReminder:  true, // all roles

    // Workflows
    canAccessWorkflows: isSupervisor,

    // Scoring
    canAccessScoring: isSupervisor,
    canComputeScores: isAdmin,

    // Reports
    canAccessReports: isComptable,

    // Team
    canManageTeam:  isAdmin,
    canViewTeam:    isSupervisor,

    // Settings
    canAccessSettings: isAdmin,

    // Super admin panel lives at /superadmin — completely separate from company space
  }
}

export type Permissions = ReturnType<typeof buildPerms>

/** Nav items visible for each role (company space only) */
export function getVisibleNav(role: UserRole | undefined): string[] {
  const p = getPermissions(role)
  const routes: string[] = ['/dashboard', '/debtors', '/invoices', '/notifications']
  if (p.canAccessWorkflows) routes.push('/workflows')
  if (p.canAccessScoring)   routes.push('/scoring')
  if (p.canAccessReports)   routes.push('/reports')
  if (p.canViewTeam)        routes.push('/team')
  if (p.canAccessSettings)  routes.push('/settings')
  routes.push('/subscription') // visible pour tous les rôles
  return routes
}
