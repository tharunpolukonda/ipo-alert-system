import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, TrendingUp, TrendingDown, Filter, LayoutGrid, List as ListIcon } from 'lucide-react'
import { iposApi, sectorsApi, portfolioApi, Ipo, Sector, PortfolioCompany } from '../api'
import SearchHeader from '../components/SearchHeader'

export default function ProfitedLostedPage() {
    const [allIpos, setAllIpos] = useState<Ipo[]>([])
    const [sectors, setSectors] = useState<Sector[]>([])
    const [portfolio, setPortfolio] = useState<PortfolioCompany[]>([])
    const [loading, setLoading] = useState(true)

    // Filters
    const [viewMode, setViewMode] = useState<'all' | 'portfolio'>('all')
    const [selectedSector, setSelectedSector] = useState<string>('all')
    const [hasInteracted, setHasInteracted] = useState(false)

    const fetchData = useCallback(async () => {
        try {
            const [secs, summary, all] = await Promise.all([
                sectorsApi.list(),
                portfolioApi.summary(),
                iposApi.list(),
            ])
            setSectors(secs || [])
            setPortfolio(summary?.companies || [])
            setAllIpos(all || [])
        } catch (err) {
            console.error('Failed to fetch data', err)
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => { fetchData() }, [fetchData])

    // ── Calculate Gain/Loss for a company ──────────────────────────
    const getChangeData = (item: Ipo | PortfolioCompany) => {
        const issuePrice = 'issue_price' in item ? parseFloat(item.issue_price || '0') : item.buy_price
        const cmp = 'cmp' in item ? (item.cmp || 0) : 0 // We might need to fetch CMP for non-portfolio items, 
        // but usually the list view uses stored listing_price if listed.

        // The user mentioned sorting by % change relative to %IP.
        // We'll use (CMP - Issue Price) / Issue Price if CMP is available.
        // If not, we use (Listing Price - Issue Price) / Issue Price as a historical profit measure.

        const listingPrice = parseFloat(item.listing_price || '0')
        const currentPrice = ('cmp' in item && item.cmp) ? item.cmp : listingPrice

        if (!issuePrice || !currentPrice) return null

        const pct = ((currentPrice - issuePrice) * 100 / issuePrice)
        return { pct, diff: currentPrice - issuePrice }
    }

    // ── Filtering & Sorting ────────────────────────────────────────
    const processLists = () => {
        if (!hasInteracted) return { profited: [], losted: [] }

        const baseList = viewMode === 'all' ? allIpos : portfolio
        const sectorFiltered = selectedSector === 'all'
            ? baseList
            : baseList.filter(item => {
                const sId = 'sector_id' in item ? item.sector_id : null
                return sId === selectedSector
            })

        const withChanges = sectorFiltered.map(item => ({
            item,
            change: getChangeData(item)
        })).filter(x => x.change !== null)

        const profited = withChanges
            .filter(x => x.change!.pct > 0)
            .sort((a, b) => b.change!.pct - a.change!.pct) // Descending by %IP

        const losted = withChanges
            .filter(x => x.change!.pct < 0)
            .sort((a, b) => a.change!.pct - b.change!.pct) // Most negative first

        return { profited, losted }
    }

    const { profited, losted } = processLists()

    return (
        <div className="page">
            <div className="glow-bg" />

            <SearchHeader showActions={false} />

            <div style={{ display: 'flex', gap: 12, padding: '16px 20px', background: 'rgba(15, 20, 32, 0.5)', borderBottom: '1px solid var(--border)', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#000', padding: '4px 12px', borderRadius: 10, border: '1px solid var(--border)', flex: '1 1 160px' }}>
                    <Filter size={14} color="var(--accent-blue)" />
                    <select
                        className="form-select"
                        style={{ background: 'none', border: 'none', color: 'white', fontSize: 13, fontWeight: 600, outline: 'none', cursor: 'pointer', paddingRight: 20, width: '100%' }}
                        value={viewMode}
                        onChange={(e) => { setViewMode(e.target.value as any); setHasInteracted(true) }}
                    >
                        <option value="all">🌐 All IPOs</option>
                        <option value="portfolio">💼 Portfolio Only</option>
                    </select>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#000', padding: '4px 12px', borderRadius: 10, border: '1px solid var(--border)', flex: '1 1 160px' }}>
                    <LayoutGrid size={14} color="var(--accent-purple)" />
                    <select
                        className="form-select"
                        style={{ background: 'none', border: 'none', color: 'white', fontSize: 13, fontWeight: 600, outline: 'none', cursor: 'pointer', paddingRight: 20, width: '100%' }}
                        value={selectedSector}
                        onChange={(e) => { setSelectedSector(e.target.value); setHasInteracted(true) }}
                    >
                        <option value="all">📁 All Sectors</option>
                        {sectors.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                </div>
            </div>

            <div className="page-content" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20, padding: '20px' }}>

                {/* Profited Column */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div style={{ padding: '10px 16px', borderRadius: 12, background: 'var(--success-bg)', border: '1px solid var(--success)', display: 'flex', alignItems: 'center', gap: 10 }}>
                        <TrendingUp size={18} color="var(--success)" />
                        <h2 style={{ fontSize: 16, fontWeight: 800, color: 'var(--success)', margin: 0 }}>PROFITED</h2>
                        <span style={{ marginLeft: 'auto', background: 'var(--success)', color: 'var(--bg-primary)', padding: '2px 6px', borderRadius: 4, fontSize: 11, fontWeight: 800 }}>
                            {profited.length}
                        </span>
                    </div>

                    {!hasInteracted ? (
                        <div className="empty-state" style={{ height: 200 }}>
                            <Filter size={32} />
                            <p style={{ fontSize: 14 }}>Select a filter to start</p>
                        </div>
                    ) : profited.length === 0 ? (
                        <div className="empty-state" style={{ height: 200 }}>
                            <p style={{ fontSize: 14 }}>None found</p>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {profited.map(({ item, change }) => (
                                <div key={item.id} className="card" style={{ padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div>
                                        <div style={{ fontWeight: 700, fontSize: 14 }}>{item.company_name}</div>
                                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                                            @ ₹{'issue_price' in item ? item.issue_price : item.buy_price}
                                        </div>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{ color: 'var(--success)', fontWeight: 800, fontSize: 16 }}>
                                            +{change?.pct.toFixed(1)}%
                                        </div>
                                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                                            +₹{change?.diff.toLocaleString()}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Losted Column */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div style={{ padding: '10px 16px', borderRadius: 12, background: 'var(--danger-bg)', border: '1px solid var(--danger)', display: 'flex', alignItems: 'center', gap: 10 }}>
                        <TrendingDown size={18} color="var(--danger)" />
                        <h2 style={{ fontSize: 16, fontWeight: 800, color: 'var(--danger)', margin: 0 }}>LOSTED</h2>
                        <span style={{ marginLeft: 'auto', background: 'var(--danger)', color: 'white', padding: '2px 6px', borderRadius: 4, fontSize: 11, fontWeight: 800 }}>
                            {losted.length}
                        </span>
                    </div>

                    {!hasInteracted ? (
                        <div className="empty-state" style={{ height: 200 }}>
                            <Filter size={32} />
                            <p style={{ fontSize: 14 }}>Select a filter to start</p>
                        </div>
                    ) : losted.length === 0 ? (
                        <div className="empty-state" style={{ height: 200 }}>
                            <p style={{ fontSize: 14 }}>None found</p>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {losted.map(({ item, change }) => (
                                <div key={item.id} className="card" style={{ padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div>
                                        <div style={{ fontWeight: 700, fontSize: 14 }}>{item.company_name}</div>
                                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                                            @ ₹{'issue_price' in item ? item.issue_price : item.buy_price}
                                        </div>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{ color: 'var(--danger)', fontWeight: 800, fontSize: 16 }}>
                                            {change?.pct.toFixed(1)}%
                                        </div>
                                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                                            -₹{Math.abs(change?.diff || 0).toLocaleString()}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

            </div>
        </div>
    )
}
