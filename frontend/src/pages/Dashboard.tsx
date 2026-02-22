import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Tag, Bell, RefreshCw, TrendingUp, TrendingDown, BarChart3, LogOut, User } from 'lucide-react'
import { sectorsApi, portfolioApi, iposApi, setApiUserId, Sector, PortfolioSummary, Ipo } from '../api'
import { useAuth } from '../contexts/AuthContext'
import CompanyCard from '../components/CompanyCard'
import AddIpoModal from '../components/AddIpoModal'
import AddSectorModal from '../components/AddSectorModal'
import Toast from '../components/Toast'

interface ToastState {
    message: string
    type: 'success' | 'error' | 'info'
    id: number
}

export default function Dashboard() {
    const { userId, username, signOut } = useAuth()
    const [sectors, setSectors] = useState<Sector[]>([])
    const [portfolio, setPortfolio] = useState<PortfolioSummary | null>(null)
    const [allIpos, setAllIpos] = useState<Ipo[]>([])
    const [loading, setLoading] = useState(true)
    const [refreshing, setRefreshing] = useState(false)
    const [showAddIpo, setShowAddIpo] = useState(false)
    const [showAddSector, setShowAddSector] = useState(false)
    const [toast, setToast] = useState<ToastState | null>(null)
    const [selectedSector, setSelectedSector] = useState<string>('all-portfolio') // 'all-portfolio', 'all-ipos', or sector ID

    // Attach user ID to all backend requests
    useEffect(() => { setApiUserId(userId) }, [userId])

    const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
        setToast({ message, type, id: Date.now() })
    }

    const fetchData = useCallback(async (isRefresh = false) => {
        if (isRefresh) setRefreshing(true)
        try {
            const [secs, summary, all] = await Promise.all([
                sectorsApi.list(),
                portfolioApi.summary(),
                iposApi.list(),
            ])
            setSectors(secs)
            setPortfolio(summary)
            setAllIpos(all)
        } catch {
            showToast('Failed to load data. Check backend connection.', 'error')
        } finally {
            setLoading(false)
            setRefreshing(false)
        }
    }, [])

    useEffect(() => { fetchData() }, [fetchData])

    // ── Sector Filtering Logic ──────────────────────────────────────
    const filteredIpos = allIpos.filter(ipo => {
        if (selectedSector === 'all-portfolio') return ipo.portfolio
        if (selectedSector === 'all-ipos') return true
        return ipo.sector_id === selectedSector
    })

    // ── Calculate Stats for Selected Sector (if it's a portfolio view) ──
    const getStats = () => {
        if (!portfolio) return { invested: 0, current: 0, pct: 0 }

        let targetCompanies = portfolio.companies
        if (selectedSector !== 'all-portfolio' && selectedSector !== 'all-ipos') {
            targetCompanies = portfolio.companies.filter(c => c.sector_id === selectedSector || sectors.find(s => s.id === selectedSector)?.name === c.sector)
        }

        const invested = targetCompanies.reduce((acc, c) => acc + (c.invested || 0), 0)
        const current = targetCompanies.reduce((acc, c) => acc + (c.current_value || 0), 0)
        const pct = invested ? ((current - invested) * 100 / invested) : 0

        return { invested, current, pct }
    }

    const stats = getStats()
    const isGainTotal = stats.pct >= 0

    return (
        <div className="page">
            <div className="glow-bg" />

            {/* Navbar */}
            <nav className="navbar" style={{ height: 72 }}>
                <Link to="/" className="navbar-brand" style={{ gap: 12 }}>
                    <img
                        src="/assets/hoox_logo_premium_1771778134217.png"
                        alt="Hoox"
                        style={{ width: 48, height: 'auto' }}
                    />
                </Link>
                <div className="navbar-actions">
                    <button className="btn btn-secondary btn-sm" onClick={() => fetchData(true)} disabled={refreshing} style={{ background: '#000', color: 'var(--accent-blue)', borderColor: 'var(--border)' }}>
                        <RefreshCw size={14} style={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }} />
                        {refreshing ? 'Refreshing...' : 'Refresh'}
                    </button>
                    <Link to="/profited-losted" className="btn btn-secondary btn-sm" style={{ background: '#000', borderColor: 'var(--accent-blue)', color: 'var(--accent-blue)' }}>
                        <TrendingUp size={14} />
                        Profited/Losted
                    </Link>
                    <Link to="/alerts" className="btn btn-secondary btn-sm" style={{ background: '#000', color: 'var(--accent-blue)', borderColor: 'var(--border)' }}>
                        <Bell size={14} />
                        Alerts
                    </Link>
                    <button className="btn btn-secondary btn-sm" onClick={() => setShowAddSector(true)} style={{ background: '#000', color: 'var(--accent-blue)', borderColor: 'var(--border)' }}>
                        <Tag size={14} />
                        + Sector
                    </button>
                    <button className="btn btn-secondary btn-sm" onClick={() => setShowAddIpo(true)} style={{ background: '#000', color: 'var(--accent-blue)', borderColor: 'var(--border)' }}>
                        <Plus size={14} />
                        Add IPO
                    </button>
                    <div style={{ width: 1, height: 20, background: 'var(--border)', margin: '0 4px' }} />
                    <button className="btn btn-secondary btn-sm" onClick={signOut} title="Sign out" style={{ background: '#000', color: 'var(--danger)', borderColor: 'var(--border)', padding: '4px 8px' }}>
                        <LogOut size={16} />
                    </button>
                </div>
            </nav>

            <div style={{ position: 'relative', zIndex: 1 }}>
                {/* Visual Branding across the top */}
                <div style={{ display: 'flex', alignItems: 'center', padding: '32px 40px 0', gap: 24 }}>
                    <img src="/assets/bull_premium_1771778168693.png" alt="Bull" style={{ width: 140, height: 'auto', filter: 'drop-shadow(0 0 20px var(--accent-blue-glow))' }} />

                    <div style={{ flex: 1 }}>
                        <div className="grid-3" style={{ gap: 16 }}>
                            <div className="stat-card" style={{ borderLeft: '4px solid var(--accent-blue)', background: '#0a0d14' }}>
                                <div className="stat-label">Invested</div>
                                <div className="stat-value" style={{ color: 'var(--text-primary)' }}>
                                    ₹{stats.invested.toLocaleString()}
                                </div>
                            </div>
                            <div className="stat-card" style={{ borderLeft: `4px solid ${isGainTotal ? 'var(--success)' : 'var(--danger)'}`, background: '#0a0d14' }}>
                                <div className="stat-label">Current Value</div>
                                <div className="stat-value" style={{ color: isGainTotal ? 'var(--success)' : 'var(--danger)' }}>
                                    ₹{stats.current.toLocaleString()}
                                </div>
                            </div>
                            <div className="stat-card" style={{ borderLeft: `4px solid ${isGainTotal ? 'var(--success)' : 'var(--danger)'}`, background: '#0a0d14' }}>
                                <div className="stat-label">Change</div>
                                <div className="stat-value" style={{ display: 'flex', alignItems: 'center', gap: 8, color: isGainTotal ? 'var(--success)' : 'var(--danger)' }}>
                                    {isGainTotal ? <TrendingUp size={24} /> : <TrendingDown size={24} />}
                                    {isGainTotal ? '+' : ''}{stats.pct.toFixed(2)}%
                                </div>
                            </div>
                        </div>
                    </div>

                    <img src="/assets/bear_blue_premium_1771777968054.png" alt="Bear" style={{ width: 140, height: 'auto', filter: 'drop-shadow(0 0 20px var(--danger-bg))' }} />
                </div>

                {/* Filter Header */}
                <div className="page-header" style={{ paddingTop: 32 }}>
                    <div>
                        <h1 className="page-title" style={{ fontSize: 24 }}>
                            {selectedSector === 'all-portfolio' ? 'My Portfolio' :
                                selectedSector === 'all-ipos' ? 'All Tracked IPOs' :
                                    `${sectors.find(s => s.id === selectedSector)?.name} IPOs`}
                        </h1>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <label className="form-label" style={{ marginBottom: 0 }}>View Mode:</label>
                        <select
                            className="form-select"
                            style={{ width: 220, height: 38, fontSize: 13, fontWeight: 600 }}
                            value={selectedSector}
                            onChange={(e) => setSelectedSector(e.target.value)}
                        >
                            <optgroup label="General">
                                <option value="all-portfolio">💼 Portfolio IPOs</option>
                                <option value="all-ipos">🌐 All Tracked IPOs</option>
                            </optgroup>
                            {sectors.length > 0 && (
                                <optgroup label="Sector Specific">
                                    {sectors.map(s => (
                                        <option key={s.id} value={s.id}>📁 {s.name}</option>
                                    ))}
                                </optgroup>
                            )}
                        </select>
                    </div>
                </div>

                <div className="page-content" style={{ paddingTop: 20 }}>
                    {loading ? (
                        <div className="empty-state">
                            <span className="spinner spinner-lg" />
                            <p>Loading data...</p>
                        </div>
                    ) : filteredIpos.length === 0 ? (
                        <div className="empty-state">
                            <BarChart3 size={48} />
                            <h3 style={{ fontSize: 18, fontWeight: 600, color: 'var(--text-secondary)' }}>No companies found</h3>
                            <p>Try changing your filter or add a new IPO.</p>
                            <button className="btn btn-primary" onClick={() => setShowAddIpo(true)}>
                                <Plus size={16} /> Add IPO
                            </button>
                        </div>
                    ) : (
                        selectedSector === 'all-portfolio' || (selectedSector !== 'all-ipos' && sectors.find(s => s.id === selectedSector)) ? (
                            /* Sector-specific or Portfolio View (Card Grid) */
                            <div className="grid-auto">
                                {filteredIpos.map(ipo => {
                                    // Adapt Ipo to PortfolioCompany for CompanyCard if needed, 
                                    // or just filter the portfolio summary list.
                                    const portfolioComp = portfolio?.companies?.find(c => c.id === ipo.id)
                                    if (portfolioComp) {
                                        return (
                                            <CompanyCard
                                                key={ipo.id}
                                                company={portfolioComp}
                                                onDeleted={() => fetchData()}
                                                showToast={showToast}
                                            />
                                        )
                                    }
                                    // Fallback for non-portfolio items in sector view (Table instead of card for clarity)
                                    return <div key={ipo.id} style={{ display: 'none' }}>{ipo.company_name}</div>
                                })}
                            </div>
                        ) : (
                            /* All IPOs View (Table) */
                            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
                                <table className="data-table">
                                    <thead>
                                        <tr>
                                            <th>Company</th>
                                            <th>Sector</th>
                                            <th>Listed On</th>
                                            <th>Issue ₹</th>
                                            <th>Listing ₹</th>
                                            <th>Issue Size</th>
                                            <th>QIB</th>
                                            <th>NII</th>
                                            <th>RII</th>
                                            <th>Total Sub.</th>
                                            <th>Portfolio</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredIpos.map(ipo => (
                                            <tr key={ipo.id}>
                                                <td style={{ fontWeight: 600 }}>{ipo.company_name}</td>
                                                <td><span className="badge badge-purple">{ipo.sector_name || '—'}</span></td>
                                                <td style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{ipo.listed_on || '—'}</td>
                                                <td style={{ fontFamily: 'JetBrains Mono, monospace' }}>{ipo.issue_price ? `₹${ipo.issue_price}` : '—'}</td>
                                                <td style={{ fontFamily: 'JetBrains Mono, monospace' }}>{ipo.listing_price ? `₹${ipo.listing_price}` : '—'}</td>
                                                <td>{ipo.issue_size || '—'}</td>
                                                <td><span style={{ color: 'var(--accent-blue)', fontWeight: 600 }}>{ipo.qib_subscription || '—'}</span></td>
                                                <td><span style={{ color: 'var(--accent-cyan)', fontWeight: 600 }}>{ipo.nii_subscription || '—'}</span></td>
                                                <td><span style={{ color: 'var(--accent-emerald)', fontWeight: 600 }}>{ipo.rii_subscription || '—'}</span></td>
                                                <td><span style={{ fontWeight: 700 }}>{ipo.total_subscription || '—'}</span></td>
                                                <td>
                                                    {ipo.portfolio ? (
                                                        <span className="badge badge-emerald">Yes</span>
                                                    ) : (
                                                        <span className="badge" style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-muted)' }}>No</span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )
                    )}
                </div>
            </div>

            {/* Modals */}
            {showAddIpo && (
                <AddIpoModal
                    sectors={sectors}
                    onClose={() => setShowAddIpo(false)}
                    onCreated={() => fetchData()}
                    showToast={showToast}
                />
            )}
            {showAddSector && (
                <AddSectorModal
                    onClose={() => setShowAddSector(false)}
                    onCreated={() => {
                        sectorsApi.list().then(setSectors)
                        showToast('Sector added!', 'success')
                    }}
                />
            )}

            {/* Toast */}
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
