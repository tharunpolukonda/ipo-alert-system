import axios from 'axios'

const BASE_URL = import.meta.env.VITE_API_BASE_URL || ''

export const api = axios.create({
    baseURL: BASE_URL,
    headers: { 'Content-Type': 'application/json' },
})

/** Call this after login to attach user_id to every backend request */
export function setApiUserId(userId: string | null) {
    if (userId) {
        api.defaults.headers.common['x-user-id'] = userId
    } else {
        delete api.defaults.headers.common['x-user-id']
    }
}

// ── Types ────────────────────────────────────────────────────────

export interface Sector {
    id: string
    name: string
    created_at: string
}

export interface Ipo {
    id: string
    user_id?: string
    company_name: string
    sector_id?: string
    sector_name?: string
    portfolio: boolean
    no_of_shares?: number
    buy_price?: number
    groww_link?: string
    listed_on?: string
    issue_price?: string
    listing_price?: string
    issue_size?: string
    qib_subscription?: string
    nii_subscription?: string
    rii_subscription?: string
    total_subscription?: string
    created_at: string
}

export interface AlertRule {
    id: string
    user_id?: string
    type: 'base' | 'sector' | 'company'
    sector_id?: string
    sector_name?: string
    company_name?: string
    gain_pct: number
    loss_pct: number
    created_at: string
}

export interface GrowwScrapeResult {
    listed_on: string | null
    issue_price: string | null
    listing_price: string | null
    issue_size: string | null
    qib_subscription: string | null
    nii_subscription: string | null
    rii_subscription: string | null
    total_subscription: string | null
    success: boolean
    error?: string | null
    warning?: string | null
}

export interface CmpResult {
    company_name: string
    price: number | null
    success: boolean
    error?: string | null
}

export interface PortfolioCompany {
    id: string
    company_name: string
    sector: string
    sector_id?: string
    portfolio: boolean
    shares: number
    buy_price: number
    cmp: number | null
    invested: number
    current_value: number | null
    pct_change: number | null
    groww_link?: string
    issue_price?: string
    listing_price?: string
    listed_on?: string
    issue_size?: string
    qib_subscription?: string
    nii_subscription?: string
    rii_subscription?: string
    total_subscription?: string
}

export interface PortfolioSummary {
    companies: PortfolioCompany[]
    total_invested: number
    total_current_value: number
    total_pct_change: number
}

// ── API Calls ────────────────────────────────────────────────────

export const sectorsApi = {
    list: () => api.get<Sector[]>('/api/sectors').then(r => r.data),
    create: (name: string) => api.post<Sector>('/api/sectors', { name }).then(r => r.data),
    delete: (id: string) => api.delete(`/api/sectors/${id}`).then(r => r.data),
}

export const iposApi = {
    list: (portfolioOnly = false) =>
        api.get<Ipo[]>('/api/ipos', { params: { portfolio_only: portfolioOnly } }).then(r => r.data),
    create: (data: Partial<Ipo>) => api.post<Ipo>('/api/ipos', data).then(r => r.data),
    update: (id: string, data: Partial<Ipo>) => api.put<Ipo>(`/api/ipos/${id}`, data).then(r => r.data),
    delete: (id: string) => api.delete(`/api/ipos/${id}`).then(r => r.data),
}

export const scrapeApi = {
    groww: (url: string) => api.post<GrowwScrapeResult>('/api/scrape/groww', { url }).then(r => r.data),
    cmp: (companyName: string) =>
        api.get<CmpResult>(`/api/scrape/cmp/${encodeURIComponent(companyName)}`).then(r => r.data),
}

export const alertRulesApi = {
    list: () => api.get<AlertRule[]>('/api/alert-rules').then(r => r.data),
    create: (data: Omit<AlertRule, 'id' | 'created_at'>) =>
        api.post<AlertRule>('/api/alert-rules', data).then(r => r.data),
    update: (id: string, data: Partial<AlertRule>) =>
        api.put<AlertRule>(`/api/alert-rules/${id}`, data).then(r => r.data),
    delete: (id: string) => api.delete(`/api/alert-rules/${id}`).then(r => r.data),
}

export const portfolioApi = {
    summary: () => api.get<PortfolioSummary>('/api/portfolio/summary').then(r => r.data),
}
