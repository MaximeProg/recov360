/* ─── Auth ─── */
export interface LoginPayload { email: string; password: string }
export interface RegisterPayload {
  company_name: string; company_email: string
  first_name: string; last_name: string; email: string; password: string
}
export interface AuthTokens { access_token: string; refresh_token: string; token_type: string }
export interface User {
  id: string; email: string; first_name: string; last_name: string
  phone?: string; role: UserRole; is_active: boolean; is_verified: boolean
  avatar_url?: string; fcm_token?: string; company_id: string
  created_at: string; updated_at: string
}
export type UserRole = 'admin' | 'comptable' | 'agent' | 'superviseur'

/* ─── Company ─── */
export interface Company {
  id: string; name: string; email: string; phone?: string
  address?: string; country: string; city?: string; sector?: string
  logo_url?: string; primary_color: string; secondary_color: string
  signature?: string; is_active: boolean; plan: string
  smtp_config?: Record<string, string>; branding?: Record<string, string>
  created_at: string; updated_at: string
}
export interface CompanyUpdate {
  name?: string; phone?: string; address?: string; city?: string
  sector?: string; primary_color?: string; secondary_color?: string; signature?: string
}

/* ─── Debtor ─── */
export type DebtorCategory = 'particulier' | 'entreprise' | 'administration'
export type RiskLevel = 'faible' | 'moyen' | 'eleve' | 'critique'
export interface Debtor {
  id: string; company_id: string; created_by: string
  name: string; phone?: string; email?: string; address?: string
  company_name?: string; city?: string; country: string
  category: DebtorCategory; risk_level: RiskLevel; risk_score: number
  identity_doc_url?: string; photo_url?: string
  tags: string[]; notes: DebtorNote[]
  total_due: number; total_paid: number
  created_at: string; updated_at: string
}
export interface DebtorNote { content: string; author: string; created_at: string }
export interface DebtorCreate {
  name: string; phone?: string; email?: string; address?: string
  company_name?: string; city?: string; category: DebtorCategory
  tags?: string[]
}
export interface DebtorUpdate {
  name?: string; phone?: string; email?: string; address?: string
  company_name?: string; city?: string; category?: DebtorCategory; tags?: string[]
}

/* ─── Invoice ─── */
export type InvoiceStatus = 'en_attente' | 'partiellement_paye' | 'en_retard' | 'solde' | 'litige'
export type PaymentMethod = 'especes' | 'virement' | 'cheque' | 'mobile_money' | 'autre'
export interface Invoice {
  id: string; company_id: string; debtor_id: string; created_by: string
  invoice_number: string; description?: string; currency: string
  amount: number; amount_paid: number; penalty_rate: number; penalty_amount: number
  due_date: string; paid_date?: string; status: InvoiceStatus
  pdf_url?: string; reminder_level: number; notes?: string
  created_at: string; updated_at: string
}
export interface InvoiceCreate {
  debtor_id: string; amount: number; due_date: string
  currency?: string; description?: string; penalty_rate?: number
  notes?: string; invoice_number?: string
}
export interface Payment {
  id: string; invoice_id: string; company_id: string; created_by: string
  amount: number; payment_date: string; method: PaymentMethod
  reference?: string; proof_url?: string; notes?: string
  created_at: string; updated_at: string
}
export interface PaymentCreate {
  amount: number; payment_date: string; method: PaymentMethod
  reference?: string; notes?: string
}

/* ─── Notification ─── */
export type NotificationType =
  | 'nouvelle_creance' | 'paiement_recu' | 'retard_important'
  | 'relance_envoyee' | 'promesse_non_tenue' | 'escalade_dossier'
  | 'echec_relance' | 'score_critique'
export interface Notification {
  id: string; company_id: string; user_id: string
  title: string; message: string
  notification_type: NotificationType; is_read: boolean
  action_url?: string; entity_type?: string; entity_id?: string
  created_at: string
}

/* ─── Workflow ─── */
export type WorkflowChannel = 'email' | 'sms' | 'both'
export type WorkflowLevel = 'niveau_1' | 'niveau_2' | 'niveau_3' | 'niveau_4'
export interface WorkflowRule {
  id: string; company_id: string; template_id?: string
  name: string; trigger_days: number
  channel: WorkflowChannel; level: WorkflowLevel
  is_active: boolean; order: number
  created_at: string
}
export interface WorkflowRuleCreate {
  name: string; trigger_days: number; channel: WorkflowChannel
  level: WorkflowLevel; template_id?: string
}
export type TemplateChannel = 'email' | 'sms'
export interface MessageTemplate {
  id: string; company_id: string; name: string
  channel: TemplateChannel; subject?: string; body: string
  variables: string[]; language: string
  is_default: boolean; is_active: boolean
  created_at: string
}
export interface MessageTemplateCreate {
  name: string; channel: TemplateChannel; subject?: string; body: string
  variables?: string[]; language?: string
}
export type PromiseStatus = 'en_attente' | 'honore' | 'non_honore' | 'en_cours'
export interface PromiseToPay {
  id: string; invoice_id: string; debtor_id: string; company_id: string
  promised_date: string; promised_amount: number
  status: PromiseStatus; notes?: string
  created_at: string
}
export interface PromiseCreate {
  invoice_id: string; debtor_id: string
  promised_date: string; promised_amount: number; notes?: string
}

/* ─── Reminder ─── */
export type ReminderChannel = 'email' | 'sms'
export type ReminderStatus = 'envoye' | 'echec' | 'en_attente'
export interface Reminder {
  id: string; invoice_id: string; company_id: string
  channel: ReminderChannel; status: ReminderStatus
  recipient_email?: string; recipient_phone?: string
  error_message?: string; sent_at?: string
  created_at: string
}

/* ─── Scoring ─── */
export interface DebtorScore {
  debtor_id: string; name: string; risk_level: RiskLevel; risk_score: number
  total_due: number; total_paid: number; payment_rate: number
}
export interface RiskSummary {
  critique: number; eleve: number; moyen: number; faible: number; total: number
}

/* ─── Reports ─── */
export interface Dashboard {
  total_creances: number; total_recovered: number
  total_late: number; recovery_rate: number
  total_debtors: number; total_invoices: number
  by_status: Record<InvoiceStatus, { count: number; amount: number }>
}
export interface MonthlyEvolution {
  month: string; total: number; paid: number
}
export interface AgentReport {
  agent_id: string; total_invoices: number; total_recovered: number
}

/* ─── Pagination ─── */
export interface PaginatedResponse<T> {
  items: T[]; total: number; page: number
  per_page: number; total_pages: number
}

/* ─── Plans & Abonnements ─── */
export interface PlanPublic {
  id: string
  name: string
  slug: string
  description: string | null
  price_monthly: number
  price_yearly: number
  currency: string
  max_users: number
  max_debtors: number
  max_invoices: number
  features: string[] | Record<string, string> | null
  is_free: boolean
  trial_days: number
  sort_order: number
}

export interface SubscriptionCurrent {
  id: string
  company_id: string
  plan_slug: string
  status: string
  start_date: string | null
  end_date: string | null
  is_yearly: boolean
  created_at: string
}

/* ─── Admin ─── */
export interface AuditLog {
  id: string; company_id: string; user_id?: string
  action: string; entity_type?: string; entity_id?: string
  description?: string; ip_address?: string; user_agent?: string
  created_at: string
}
export interface PlatformStats {
  total_companies: number; active_companies: number
  total_users: number; total_invoices: number
  total_amount_due: number; total_amount_recovered: number
  total_debtors?: number; total_creances?: number
  global_recovery_rate?: number
}
