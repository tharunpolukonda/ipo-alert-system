import { useState, useEffect, useCallback } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import {
    ArrowLeft, TrendingUp, TrendingDown, Calendar, DollarSign, Building2,
    BarChart3, Globe, Trash2, Pencil, ShieldCheck, Info
} from 'lucide-react'
import { iposApi, portfolioApi, sectorsApi, scrapeApi, PortfolioCompany, Sector, Ipo } from '../api'
import SearchHeader from '../components/SearchHeader'
import IpoModal from '../components/IpoModal'
import DeleteConfirmationModal from '../components/DeleteConfirmationModal'
import Toast from '../components/Toast'

interface ToastState {
    message: string
    type: 'success' | 'error' | 'info'
    id: number
}

export default function CompanyDetailPage() {
    const { id, searchQuery } = useParams<{ id?: string, searchQuery?: string }>()
    const navigate = useNavigate()
    const [company, setCompany] = useState<PortfolioCompany | null>(null)
    const [sectors, setSectors] = useState<Sector[]>([])
    const [loading, setLoading] = useState(true)
    const [showIpoModal, setShowIpoModal] = useState(false)
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
    const [deleting, setDeleting] = useState(false)
    const [toast, setToast] = useState<ToastState | null>(null)

    const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
        setToast({ message, type, id: Date.now() })
    }

    const fetchData = useCallback(async () => {
        if (!id && !searchQuery) return
        setLoading(true)
        try {
            const [allIpos, summary, secs] = await Promise.all([
                iposApi.list(),
                portfolioApi.summary(),
                sectorsApi.list()
            ])

            const slugify = (text: string) => text.trim().replace(/\s+/g, '-')

            const ipoRecord = allIpos.find((i: Ipo) =>
                (id && i.id === id) ||
                (searchQuery && slugify(i.company_name) === searchQuery)
            )

            if (!ipoRecord) {
                showToast('Company not found', 'error')
                navigate('/')
                return
            }

            const portfolioRec = summary.companies.find((c: PortfolioCompany) => c.id === ipoRecord.id)

            // Merge Data: Portfolio data takes precedence for financial metrics, 
            // but IPO data provides the description and subscription fields.
            const mergedComp: PortfolioCompany = {
                ...ipoRecord,
                // Fields from IPO record (important for subscription data)
                qib_subscription: ipoRecord.qib_subscription,
                nii_subscription: ipoRecord.nii_subscription,
                rii_subscription: ipoRecord.rii_subscription,
                total_subscription: ipoRecord.total_subscription,
                issue_size: ipoRecord.issue_size,
                groww_link: ipoRecord.groww_link,

                // Fields from Portfolio record (if exists)
                id: ipoRecord.id,
                company_name: ipoRecord.company_name,
                sector: ipoRecord.sector_name || 'Unknown Sector',
                portfolio: ipoRecord.portfolio,
                shares: portfolioRec?.shares || 0,
                buy_price: portfolioRec?.buy_price || 0,
                cmp: portfolioRec?.cmp || null,
                invested: portfolioRec?.invested || 0,
                current_value: portfolioRec?.current_value || null,
                pct_change: portfolioRec?.pct_change || null,
            }

            // Fetch CMP if missing (e.g., non-portfolio stocks)
            if (mergedComp.cmp === null) {
                try {
                    const cmpRes = await scrapeApi.cmp(mergedComp.company_name)
                    if (cmpRes.success && cmpRes.price) {
                        mergedComp.cmp = cmpRes.price
                        // Also calculate pct change if listing/issue price exists
                        if (mergedComp.issue_price) {
                            const issue = parseFloat(mergedComp.issue_price.replace(/[^0-9.]/g, ''))
                            if (!isNaN(issue)) {
                                mergedComp.pct_change = ((cmpRes.price - issue) / issue) * 100
                                mergedComp.current_value = (mergedComp.shares || 0) * cmpRes.price
                            }
                        }
                    }
                } catch (e) {
                    console.error("Failed to fetch CMP:", e)
                }
            }

            setCompany(mergedComp)
            setSectors(secs)
        } catch (e) {
            console.error(e)
            showToast('Failed to load company details', 'error')
        } finally {
            setLoading(false)
        }
    }, [id, searchQuery, navigate])

    useEffect(() => {
        fetchData()
    }, [fetchData])

    const handleDelete = async () => {
        if (!company) return
        setDeleting(true)
        try {
            await iposApi.delete(company.id)
            showToast('Company removed', 'success')
            navigate('/')
        } catch {
            showToast('Failed to delete company', 'error')
        } finally {
            setDeleting(false)
            setShowDeleteConfirm(false)
        }
    }

    if (loading) {
        return (
            <div className="page" style={{ justifyContent: 'center', alignItems: 'center' }}>
                <div className="spinner" style={{ width: 40, height: 40 }} />
            </div>
        )
    }

    if (!company) return null

    const isGain = (company.pct_change ?? 0) >= 0
    const rupeeColor = company.portfolio ? '#FFD700' : 'inherit' // Gold for portfolio

    return (
        <div className="page">
            <div className="glow-bg" />

            <SearchHeader showActions={false} />

            <div style={{ position: 'relative', zIndex: 1, padding: '24px 40px' }}>
                <Link to="/" className="btn btn-ghost" style={{ marginBottom: 24, gap: 8, paddingLeft: 0 }}>
                    <ArrowLeft size={18} /> Back to Dashboard
                </Link>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32 }}>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                            <h1 className="page-title" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 12 }}>
                                {company.company_name}
                                {company.portfolio && (
                                    <div title="Portfolio Stock" style={{ color: '#FFD700', filter: 'drop-shadow(0 0 8px rgba(255,215,0,0.4))' }}>
                                        <div style={{ background: 'rgba(255,215,0,0.1)', border: '1px solid rgba(255,215,0,0.3)', width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <span style={{ fontSize: 18, fontWeight: 700 }}>₹</span>
                                        </div>
                                    </div>
                                )}
                            </h1>
                            {company.portfolio && (
                                <span className="badge badge-success" style={{ background: 'rgba(16,185,129,0.1)', color: 'var(--success)', border: '1px solid rgba(16,185,129,0.2)' }}>
                                    <ShieldCheck size={12} style={{ marginRight: 4 }} /> In Portfolio
                                </span>
                            )}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 16, color: 'var(--text-muted)', fontSize: 14 }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <Building2 size={14} /> {company.sector || 'Unknown Sector'}
                            </span>
                            {company.groww_link && (
                                <a href={company.groww_link} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--accent-blue)', textDecoration: 'none' }}>
                                    <Globe size={14} /> View on Groww
                                </a>
                            )}
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: 12 }}>
                        <button className="btn btn-secondary" onClick={() => setShowIpoModal(true)}>
                            <Pencil size={18} /> Edit Details
                        </button>
                        <button className="btn btn-danger" onClick={() => setShowDeleteConfirm(true)}>
                            <Trash2 size={18} /> Delete Tracking
                        </button>
                    </div>
                </div>

                <div className="grid-3" style={{ gap: 24, marginBottom: 32 }}>
                    <div className="stat-card">
                        <div className="stat-label">Last Traded Price</div>
                        <div className="stat-value" style={{ color: 'var(--text-primary)' }}>
                            <span style={{ color: rupeeColor }}>₹</span>{company.cmp?.toLocaleString() || 'N/A'}
                        </div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-label">Total Invested</div>
                        <div className="stat-value" style={{ color: 'var(--text-primary)' }}>
                            <span style={{ color: rupeeColor }}>₹</span>{company.invested?.toLocaleString() || '0'}
                        </div>
                    </div>
                    <div className="stat-card" style={{ borderLeftColor: isGain ? 'var(--success)' : 'var(--danger)' }}>
                        <div className="stat-label">Current Value</div>
                        <div className="stat-value" style={{ color: isGain ? 'var(--success)' : 'var(--danger)' }}>
                            <span style={{ color: rupeeColor }}>₹</span>{company.current_value?.toLocaleString() || '0'}
                            {company.pct_change !== null && (
                                <span style={{ fontSize: 16, marginLeft: 8, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                    ({isGain ? '+' : ''}{company.pct_change?.toFixed(2)}%)
                                    {isGain ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 24 }}>
                    <div className="card" style={{ padding: 24 }}>
                        <h3 style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '0 0 20px 0', fontSize: 18, color: 'var(--accent-blue)' }}>
                            <Info size={18} /> IPO Details
                        </h3>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
                            {[
                                { label: 'Listed On', val: company.listed_on || 'N/A', icon: <Calendar size={14} /> },
                                { label: 'Issue Price', val: company.issue_price ? `₹${company.issue_price}` : 'N/A', icon: <DollarSign size={14} /> },
                                { label: 'Listing Price', val: company.listing_price ? `₹${company.listing_price}` : 'N/A', icon: <TrendingUp size={14} /> },
                                { label: 'Issue Size', val: company.issue_size || 'N/A', icon: <BarChart3 size={14} /> },
                            ].map((item, idx) => (
                                <div key={idx}>
                                    <div style={{ color: 'var(--text-muted)', fontSize: 12, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                                        {item.icon} {item.label}
                                    </div>
                                    <div style={{ fontWeight: 600 }}>{item.val}</div>
                                </div>
                            ))}
                        </div>

                        <div style={{ marginTop: 24, padding: 16, background: 'rgba(255,255,255,0.03)', borderRadius: 12 }}>
                            <h4 style={{ margin: '0 0 12px 0', fontSize: 14, color: 'var(--text-secondary)' }}>Subscription Data</h4>
                            <div className="grid-4" style={{ gap: 12 }}>
                                {[
                                    { label: 'QIB', val: company.qib_subscription },
                                    { label: 'NII', val: company.nii_subscription },
                                    { label: 'RII', val: company.rii_subscription },
                                    { label: 'Total', val: company.total_subscription },
                                ].map((s, idx) => (
                                    <div key={idx}>
                                        <div style={{ color: 'var(--text-muted)', fontSize: 11 }}>{s.label}</div>
                                        <div style={{ fontWeight: 600, color: 'var(--accent-purple)' }}>{s.val || 'N/A'}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="card" style={{ padding: 24 }}>
                        <h3 style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '0 0 20px 0', fontSize: 18, color: 'var(--accent-purple)' }}>
                            <ShieldCheck size={18} /> Portfolio Info
                        </h3>
                        {company.portfolio ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                                <div>
                                    <div style={{ color: 'var(--text-muted)', fontSize: 12, marginBottom: 4 }}>Quantity (Shares)</div>
                                    <div style={{ fontSize: 24, fontWeight: 700 }}>{company.shares}</div>
                                </div>
                                <div style={{ height: 1, background: 'var(--border)' }} />
                                <div>
                                    <div style={{ color: 'var(--text-muted)', fontSize: 12, marginBottom: 4 }}>Average Buy Price</div>
                                    <div style={{ fontSize: 20, fontWeight: 600 }}>₹{company.buy_price}</div>
                                </div>
                                <div style={{ marginTop: 8, padding: 12, borderRadius: 8, background: isGain ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', color: isGain ? 'var(--success)' : 'var(--danger)', fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
                                    {isGain ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                                    Current profit/loss: ₹{Math.abs((company.current_value || 0) - (company.invested || 0)).toLocaleString()} {isGain ? 'Profit' : 'Loss'}
                                </div>
                            </div>
                        ) : (
                            <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-muted)' }}>
                                <p>This company is not in your portfolio.</p>
                                <button className="btn btn-secondary btn-sm" style={{ marginTop: 12 }} onClick={() => setShowIpoModal(true)}>
                                    Move to Portfolio
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {showIpoModal && (
                <IpoModal
                    sectors={sectors}
                    editingIpo={company as unknown as Ipo}
                    onClose={() => setShowIpoModal(false)}
                    onSuccess={fetchData}
                    showToast={showToast}
                />
            )}

            {showDeleteConfirm && (
                <DeleteConfirmationModal
                    title="Remove Tracking"
                    message={`Are you sure you want to stop tracking ${company.company_name}? This will remove all historical and portfolio data for this company.`}
                    onConfirm={handleDelete}
                    onCancel={() => setShowDeleteConfirm(false)}
                    loading={deleting}
                />
            )}

            {toast && (
                <Toast
                    key={toast.id}
                    message={toast.message}
                    type={toast.type}
                    onClose={() => setToast(null)}
                />
            )}
        </div>
    )
}
