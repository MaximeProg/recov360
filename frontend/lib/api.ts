import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios'

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api/v1'

/* ════════════════════════════════════════════════════════════════════
   ESPACE ENTREPRISE  — tokens: access_token / refresh_token
   ════════════════════════════════════════════════════════════════════ */

export const api = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
})

export const tokens = {
  get access() { return typeof window !== 'undefined' ? localStorage.getItem('access_token') : null },
  get refresh() { return typeof window !== 'undefined' ? localStorage.getItem('refresh_token') : null },
  set(access: string, refresh: string) {
    localStorage.setItem('access_token', access)
    localStorage.setItem('refresh_token', refresh)
  },
  clear() {
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
  },
}

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = tokens.access
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

let isRefreshing = false
let waitQueue: Array<(token: string) => void> = []

api.interceptors.response.use(
  res => res,
  async (err: AxiosError) => {
    const original = err.config as InternalAxiosRequestConfig & { _retry?: boolean }
    if (err.response?.status === 401 && !original._retry) {
      original._retry = true
      if (isRefreshing) {
        return new Promise(resolve => {
          waitQueue.push(token => { original.headers.Authorization = `Bearer ${token}`; resolve(api(original)) })
        })
      }
      isRefreshing = true
      try {
        const refreshToken = tokens.refresh
        if (!refreshToken) throw new Error('no refresh token')
        const { data } = await axios.post(`${BASE_URL}/auth/refresh`, { refresh_token: refreshToken })
        tokens.set(data.access_token, data.refresh_token ?? refreshToken)
        waitQueue.forEach(cb => cb(data.access_token))
        waitQueue = []
        original.headers.Authorization = `Bearer ${data.access_token}`
        return api(original)
      } catch {
        tokens.clear()
        if (typeof window !== 'undefined') window.location.href = '/login'
        return Promise.reject(err)
      } finally { isRefreshing = false }
    }
    return Promise.reject(err)
  }
)

/* ════════════════════════════════════════════════════════════════════
   ESPACE SUPER ADMIN  — tokens: sa_access_token / sa_refresh_token
   Complètement séparé : instance Axios différente, clés localStorage différentes,
   redirection vers /recov-super-admin-panel/login en cas d'expiration.
   ════════════════════════════════════════════════════════════════════ */

export const saTokens = {
  get access() { return typeof window !== 'undefined' ? localStorage.getItem('sa_access_token') : null },
  get refresh() { return typeof window !== 'undefined' ? localStorage.getItem('sa_refresh_token') : null },
  set(access: string, refresh: string) {
    localStorage.setItem('sa_access_token', access)
    localStorage.setItem('sa_refresh_token', refresh)
  },
  clear() {
    localStorage.removeItem('sa_access_token')
    localStorage.removeItem('sa_refresh_token')
  },
}

export const saApi = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
})

saApi.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = saTokens.access
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

let saIsRefreshing = false
let saWaitQueue: Array<(token: string) => void> = []

saApi.interceptors.response.use(
  res => res,
  async (err: AxiosError) => {
    const original = err.config as InternalAxiosRequestConfig & { _retry?: boolean }
    if (err.response?.status === 401 && !original._retry) {
      original._retry = true
      if (saIsRefreshing) {
        return new Promise(resolve => {
          saWaitQueue.push(token => { original.headers.Authorization = `Bearer ${token}`; resolve(saApi(original)) })
        })
      }
      saIsRefreshing = true
      try {
        const refreshToken = saTokens.refresh
        if (!refreshToken) throw new Error('no sa refresh token')
        const { data } = await axios.post(`${BASE_URL}/auth/refresh`, { refresh_token: refreshToken })
        saTokens.set(data.access_token, data.refresh_token ?? refreshToken)
        saWaitQueue.forEach(cb => cb(data.access_token))
        saWaitQueue = []
        original.headers.Authorization = `Bearer ${data.access_token}`
        return saApi(original)
      } catch {
        saTokens.clear()
        if (typeof window !== 'undefined') window.location.href = '/recov-super-admin-panel/login'
        return Promise.reject(err)
      } finally { saIsRefreshing = false }
    }
    return Promise.reject(err)
  }
)

/* ─── Auth (espace entreprise) ─── */
export const authApi = {
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }).then(r => r.data),
  register: (data: Record<string, string>) =>
    api.post('/auth/register', data).then(r => r.data),
  me: () => api.get('/auth/me').then(r => r.data),
  logout: () => api.post('/auth/logout'),
  changePassword: (current_password: string, new_password: string) =>
    api.post('/auth/change-password', { current_password, new_password }),
  refresh: (refresh_token: string) =>
    api.post('/auth/refresh', { refresh_token }).then(r => r.data),
  forgotPassword: (email: string) =>
    api.post('/auth/forgot-password', { email }),
}

/* ─── Company ─── */
export const companyApi = {
  get: () => api.get('/companies/me').then(r => r.data),
  update: (data: Record<string, unknown>) => api.put('/companies/me', data).then(r => r.data),
  uploadLogo: (file: File) => {
    const fd = new FormData(); fd.append('file', file)
    return api.post('/companies/me/logo', fd, { headers: { 'Content-Type': 'multipart/form-data' } }).then(r => r.data)
  },
}

/* ─── Users ─── */
export const usersApi = {
  list: (params?: Record<string, unknown>) => api.get('/users', { params }).then(r => r.data),
  create: (data: Record<string, unknown>) => api.post('/users', data).then(r => r.data),
  update: (id: string, data: Record<string, unknown>) => api.put(`/users/${id}`, data).then(r => r.data),
  delete: (id: string) => api.delete(`/users/${id}`),
  /** Enregistre le token FCM de l'utilisateur connecté pour les notifications push */
  updateFcmToken: (fcm_token: string) => api.post('/users/me/fcm-token', { fcm_token }),
}

/* ─── Debtors ─── */
export const debtorsApi = {
  list: (params?: Record<string, unknown>) => api.get('/debtors', { params }).then(r => r.data),
  get: (id: string) => api.get(`/debtors/${id}`).then(r => r.data),
  create: (data: Record<string, unknown>) => api.post('/debtors', data).then(r => r.data),
  update: (id: string, data: Record<string, unknown>) => api.put(`/debtors/${id}`, data).then(r => r.data),
  delete: (id: string) => api.delete(`/debtors/${id}`),
  addNote: (id: string, content: string, author: string) =>
    api.post(`/debtors/${id}/notes`, { content, author }).then(r => r.data),
}

/* ─── Invoices ─── */
export const invoicesApi = {
  list: (params?: Record<string, unknown>) => api.get('/invoices', { params }).then(r => r.data),
  get: (id: string) => api.get(`/invoices/${id}`).then(r => r.data),
  create: (data: Record<string, unknown>) => api.post('/invoices', data).then(r => r.data),
  update: (id: string, data: Record<string, unknown>) => api.put(`/invoices/${id}`, data).then(r => r.data),
  delete: (id: string) => api.delete(`/invoices/${id}`),
  payments: (id: string) => api.get(`/invoices/${id}/payments`).then(r => r.data),
  addPayment: (id: string, data: Record<string, unknown>) =>
    api.post(`/invoices/${id}/payments`, data).then(r => r.data),
}

/* ─── Notifications ─── */
export const notificationsApi = {
  list: (params?: Record<string, unknown>) => api.get('/notifications', { params }).then(r => r.data),
  markRead: (id: string) => api.post(`/notifications/${id}/read`),
  markAllRead: () => api.post('/notifications/read-all'),
  sendReminder: (data: Record<string, unknown>) =>
    api.post('/notifications/reminders/send', data).then(r => r.data),
}

/* ─── Workflows ─── */
export const workflowsApi = {
  listTemplates: () => api.get('/workflows/templates').then(r => r.data),
  createTemplate: (data: Record<string, unknown>) => api.post('/workflows/templates', data).then(r => r.data),
  updateTemplate: (id: string, data: Record<string, unknown>) =>
    api.put(`/workflows/templates/${id}`, data).then(r => r.data),
  deleteTemplate: (id: string) => api.delete(`/workflows/templates/${id}`),
  listRules: () => api.get('/workflows/rules').then(r => r.data),
  createRule: (data: Record<string, unknown>) => api.post('/workflows/rules', data).then(r => r.data),
  updateRule: (id: string, data: Record<string, unknown>) =>
    api.put(`/workflows/rules/${id}`, data).then(r => r.data),
  deleteRule: (id: string) => api.delete(`/workflows/rules/${id}`),
  listPromises: (params?: Record<string, unknown>) =>
    api.get('/workflows/promises', { params }).then(r => r.data),
  createPromise: (data: Record<string, unknown>) => api.post('/workflows/promises', data).then(r => r.data),
  updatePromise: (id: string, data: Record<string, unknown>) =>
    api.put(`/workflows/promises/${id}`, data).then(r => r.data),
}

/* ─── Scoring ─── */
export const scoringApi = {
  getDebtor: (id: string) => api.get(`/scoring/debtors/${id}`).then(r => r.data),
  computeAll: () => api.post('/scoring/compute-all').then(r => r.data),
  topRisky: (limit = 10) => api.get('/scoring/top-risky', { params: { limit } }).then(r => r.data),
  summary: () => api.get('/scoring/summary').then(r => r.data),
}

/* ─── Reports ─── */
export const reportsApi = {
  dashboard: () => api.get('/reports/dashboard').then(r => r.data),
  monthlyEvolution: () => api.get('/reports/monthly-evolution').then(r => r.data),
  agents: () => api.get('/reports/agents').then(r => r.data),
  exportCsv: () => api.get('/reports/export/csv', { responseType: 'blob' }).then(r => r.data),
  exportExcel: () => api.get('/reports/export/excel', { responseType: 'blob' }).then(r => r.data),
}

/* ─── Admin entreprise ─── */
export const adminApi = {
  auditLogs: (params?: Record<string, unknown>) => api.get('/admin/audit-logs', { params }).then(r => r.data),
  teamStats: () => api.get('/admin/team/stats').then(r => r.data),
}

/* ─── Super Admin (utilise saApi + saTokens — TOTALEMENT SÉPARÉ) ─── */
export const superAdminApi = {
  // Authentification super admin
  login: async (email: string, password: string) => {
    // Appel direct axios (pas via saApi) pour éviter la boucle de refresh
    const { data } = await axios.post(`${BASE_URL}/auth/login`, { email, password })
    saTokens.set(data.access_token, data.refresh_token)
    return data
  },
  me: () => saApi.get('/auth/me').then(r => r.data),

  // Stats
  stats: () => saApi.get('/superadmin/stats').then(r => r.data),

  // Entreprises
  companies: (search?: string) => saApi.get('/superadmin/companies', { params: search ? { search } : {} }).then(r => r.data),
  company: (id: string) => saApi.get(`/superadmin/companies/${id}`).then(r => r.data),
  setPlan: (id: string, plan: string) => saApi.put(`/superadmin/companies/${id}/plan`, { plan }).then(r => r.data),
  setStatus: (id: string, is_active: boolean) => saApi.put(`/superadmin/companies/${id}/status`, { is_active }).then(r => r.data),
  deleteCompany: (id: string) => saApi.delete(`/superadmin/companies/${id}`),

  // Plans
  plans: () => saApi.get('/superadmin/plans').then(r => r.data),
  createPlan: (data: Record<string, unknown>) => saApi.post('/superadmin/plans', data).then(r => r.data),
  updatePlan: (id: string, data: Record<string, unknown>) => saApi.put(`/superadmin/plans/${id}`, data).then(r => r.data),
  deletePlan: (id: string) => saApi.delete(`/superadmin/plans/${id}`),

  // Transactions
  transactions: (params?: Record<string, unknown>) => saApi.get('/superadmin/transactions', { params }).then(r => r.data),

  // Audit logs
  auditLogs: (params?: Record<string, unknown>) => saApi.get('/superadmin/audit-logs', { params }).then(r => r.data),

  // Config plateforme
  getConfig: () => saApi.get('/superadmin/config').then(r => r.data),
  updateConfig: (items: Array<{ key: string; value: string; label: string; category: string }>) =>
    saApi.put('/superadmin/config', items).then(r => r.data),
}

/* ─── Abonnements (espace entreprise) ─── */
export const subscriptionApi = {
  current: () => api.get('/subscriptions/current').then(r => r.data),
  check: () => api.get('/subscriptions/check').then(r => r.data),
  checkout: (plan_id: string, is_yearly = false) =>
    api.post('/subscriptions/checkout', { plan_id, is_yearly }).then(r => r.data),
  verifyPayment: (transaction_id: string) =>
    api.get('/subscriptions/verify-payment', { params: { transaction_id } }).then(r => r.data),
}

/* ─── Plans & config publics (sans auth) ─── */
export const publicApi = {
  plans: () => api.get('/public/plans').then(r => r.data),
  config: () => api.get('/public/config').then(r => r.data),
}

export function downloadBlob(data: Blob, filename: string) {
  const url = URL.createObjectURL(data)
  const a = document.createElement('a')
  a.href = url; a.download = filename; a.click()
  URL.revokeObjectURL(url)
}
