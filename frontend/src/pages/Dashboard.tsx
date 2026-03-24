import { useState, useEffect, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Plus, BarChart3, TrendingUp, TrendingDown, Pencil, Trash2 } from 'lucide-react'
import { portfolioApi, iposApi, setApiUserId, PortfolioSummary, Ipo } from '../api'
import { useAuth } from '../contexts/AuthContext'
import { useGlobal } from '../contexts/GlobalContext'
import CompanyCard from '../components/CompanyCard'
import SearchHeader from '../components/SearchHeader'

export default function Dashboard() {
    const navigate = useNavigate()
    const { userId } = useAuth()
    const {
        sectors,
        setShowIpoModal,
        setEditingIpo,
        setShowAddSectorModal,
        showToast
    } = useGlobal()

    const [portfolio, setPortfolio] = useState<PortfolioSummary | null>(null)
    const [allIpos, setAllIpos] = useState<Ipo[]>([])
    const [loading, setLoading] = useState(true)
    const [refreshing, setRefreshing] = useState(false)
    const [selectedSector, setSelectedSector] = useState<string>('all-portfolio')

    // Attach user ID to all backend requests
    useEffect(() => {
        setApiUserId(userId)
    }, [userId])

    const fetchData = useCallback(async (isRefresh = false) => {
        if (!userId) return
        if (isRefresh) setRefreshing(true)
        try {
            const [summary, all] = await Promise.all([
                portfolioApi.summary(),
                iposApi.list(),
            ])
            setPortfolio(summary)
            setAllIpos(all)
        } catch {
            showToast('Failed to load data. Check backend connection.', 'error')
        } finally {
            setLoading(false)
            setRefreshing(false)
        }
    }, [userId, showToast])

    useEffect(() => { fetchData() }, [fetchData])

    // Listen for global updates (from sidebar actions or modals in Layout)
    useEffect(() => {
        const handleUpdate = () => fetchData()
        window.addEventListener('ipo-updated', handleUpdate)
        return () => window.removeEventListener('ipo-updated', handleUpdate)
    }, [fetchData])

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

            <SearchHeader
                onRefresh={() => fetchData(true)}
                refreshing={refreshing}
            />

            <div style={{ position: 'relative', zIndex: 1 }}>
                <div className="stat-card-row" style={{ display: 'flex', alignItems: 'center', padding: '16px 40px 0', gap: 24 }}>
                    <img src="/assets/bull_premium_1771778168693.png" alt="Bull" className="mobile-hide" style={{ width: 140, height: 'auto', filter: 'drop-shadow(0 0 20px var(--accent-blue-glow))' }} />

                    <div style={{ flex: 1 }}>
                        <div className="grid-3" style={{ gap: 16 }}>
                            <div className="stat-card" style={{ borderLeft: '4px solid var(--accent-blue)', background: '#0a0d14' }}>
                                <div className="stat-label">Invested</div>
                                <div className="stat-value" style={{ color: 'var(--text-primary)' }}>
                                    ₹{stats.invested.toLocaleString()}
                                </div>
                            </div>
                            <div className="stat-card" style={{ borderLeft: `4px solid ${isGainTotal ? 'var(--success)' : 'var(--danger)'} `, background: '#0a0d14' }}>
                                <div className="stat-label">Current Value</div>
                                <div className="stat-value" style={{ color: isGainTotal ? 'var(--success)' : 'var(--danger)' }}>
                                    ₹{stats.current.toLocaleString()}
                                </div>
                            </div>
                            <div className="stat-card" style={{ borderLeft: `4px solid ${isGainTotal ? 'var(--success)' : 'var(--danger)'} `, background: '#0a0d14' }}>
                                <div className="stat-label">Change</div>
                                <div className="stat-value" style={{ display: 'flex', alignItems: 'center', gap: 8, color: isGainTotal ? 'var(--success)' : 'var(--danger)' }}>
                                    {isGainTotal ? <TrendingUp size={24} /> : <TrendingDown size={24} />}
                                    {isGainTotal ? '+' : ''}{stats.pct.toFixed(2)}%
                                </div>
                            </div>
                        </div>
                    </div>

                    <img src="/assets/bear_blue_premium_1771777968054.png" alt="Bear" className="mobile-hide" style={{ width: 140, height: 'auto', filter: 'drop-shadow(0 0 20px var(--danger-bg))' }} />
                </div>

                <div className="page-header" style={{ paddingTop: 32 }}>
                    <div>
                        <h1 className="page-title">
                            {selectedSector === 'all-portfolio' ? 'My Portfolio' :
                                selectedSector === 'all-ipos' ? 'All Tracked IPOs' :
                                    `${sectors.find(s => s.id === selectedSector)?.name} IPOs`}
                        </h1>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <label className="form-label" style={{ marginBottom: 0 }}>View:</label>
                        <select
                            className="form-select"
                            style={{ width: 220 }}
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

                <div className="page-content">
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
                            <button className="btn btn-primary" onClick={() => { setEditingIpo(null); setShowIpoModal(true); }}>
                                <Plus size={16} /> Add IPO
                            </button>
                        </div>
                    ) : (
                        selectedSector === 'all-portfolio' || (selectedSector !== 'all-ipos' && sectors.find(s => s.id === selectedSector)) ? (
                            <div className="grid-auto">
                                {filteredIpos.map(ipo => {
                                    const portfolioComp = portfolio?.companies?.find(c => c.id === ipo.id)
                                    if (portfolioComp) {
                                        return (
                                            <CompanyCard
                                                key={ipo.id}
                                                company={portfolioComp}
                                                onDeleted={() => fetchData()}
                                                onEdit={() => {
                                                    setEditingIpo(ipo)
                                                    setShowIpoModal(true)
                                                }}
                                                showToast={showToast}
                                            />
                                        )
                                    }
                                    return <div key={ipo.id} style={{ display: 'none' }}>{ipo.company_name}</div>
                                })}
                            </div>
                        ) : (
                            <div className="table-container">
                                <table className="data-table">
                                    <thead>
                                        <tr>
                                            <th>Company</th>
                                            <th>Sector</th>
                                            <th className="mobile-hide">Listed On</th>
                                            <th>Issue ₹</th>
                                            <th className="mobile-hide">Listing ₹</th>
                                            <th className="mobile-hide">Issue Size</th>
                                            <th>QIB</th>
                                            <th>NII</th>
                                            <th>RII</th>
                                            <th>Total</th>
                                            <th>Portfolio</th>
                                            <th style={{ textAlign: 'right' }}>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredIpos.map(ipo => (
                                            <tr key={ipo.id}>
                                                <td style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>
                                                    <Link to={`/search/${ipo.company_name.replace(/\s+/g, '-')}`} style={{ color: 'inherit', textDecoration: 'none' }} className="hover-link">
                                                        {ipo.company_name}
                                                    </Link>
                                                </td>
                                                <td><span className="badge badge-purple">{ipo.sector_name || '—'}</span></td>
                                                <td className="mobile-hide" style={{ color: 'var(--text-secondary)', fontSize: 13, whiteSpace: 'nowrap' }}>{ipo.listed_on || '—'}</td>
                                                <td style={{ fontFamily: 'JetBrains Mono, monospace' }}>{ipo.issue_price ? `₹${ipo.issue_price} ` : '—'}</td>
                                                <td className="mobile-hide" style={{ fontFamily: 'JetBrains Mono, monospace' }}>{ipo.listing_price ? `₹${ipo.listing_price} ` : '—'}</td>
                                                <td className="mobile-hide">{ipo.issue_size || '—'}</td>
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
                                                <td style={{ textAlign: 'right' }}>
                                                    <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                                                        <button
                                                            className="btn btn-ghost btn-icon btn-sm"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setEditingIpo(ipo);
                                                                setShowIpoModal(true);
                                                            }}
                                                            title="Edit"
                                                        >
                                                            <Pencil size={14} />
                                                        </button>
                                                        <button
                                                            className="btn btn-ghost btn-icon btn-sm"
                                                            style={{ color: 'var(--danger)' }}
                                                            onClick={async (e) => {
                                                                e.stopPropagation();
                                                                if (window.confirm(`Are you sure you want to delete ${ipo.company_name}?`)) {
                                                                    try {
                                                                        await iposApi.delete(ipo.id);
                                                                        showToast('IPO deleted', 'success');
                                                                        fetchData();
                                                                    } catch {
                                                                        showToast('Failed to delete IPO', 'error');
                                                                    }
                                                                }
                                                            }}
                                                            title="Delete"
                                                        >
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </div>
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
        </div>
    )
}
