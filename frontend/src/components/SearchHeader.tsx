import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Search, LogOut, RefreshCw, TrendingUp, Bell, Tag, Plus, X } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { iposApi, Ipo } from '../api'

interface Props {
    onRefresh?: () => void
    onAddIpo?: () => void
    onAddSector?: () => void
    refreshing?: boolean
    showActions?: boolean
}

export default function SearchHeader({
    onRefresh,
    onAddIpo,
    onAddSector,
    refreshing = false,
    showActions = true
}: Props) {
    const { userId, signOut } = useAuth()
    const navigate = useNavigate()
    const [query, setQuery] = useState('')
    const [allIpos, setAllIpos] = useState<Ipo[]>([])
    const [matchingIpos, setMatchingIpos] = useState<Ipo[]>([])
    const [showPopup, setShowPopup] = useState(false)
    const [loadingData, setLoadingData] = useState(false)

    useEffect(() => {
        if (!userId) return
        setLoadingData(true)
        iposApi.list()
            .then(setAllIpos)
            .catch(err => {
                console.error('SearchHeader fetch error:', err)
            })
            .finally(() => setLoadingData(false))
    }, [userId])

    const slugify = (text: string) => text.trim().replace(/\s+/g, '-')

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault()
        if (!query.trim()) return

        if (allIpos.length === 0 && loadingData) {
            alert('Syncing company data, please try again in a moment...')
            return
        }

        const q = query.toLowerCase().trim()
        const matches = allIpos.filter(ipo =>
            ipo.company_name.toLowerCase().includes(q)
        )

        if (matches.length === 0) {
            alert('No matching company found. Ensure you are logged in.')
        } else if (matches.length === 1) {
            navigate(`/search/${slugify(matches[0].company_name)}`)
            setQuery('')
        } else {
            setMatchingIpos(matches)
            setShowPopup(true)
        }
    }

    return (
        <>
            <nav className="navbar">
                <Link to="/" className="navbar-brand" style={{ gap: 8 }}>
                    <img
                        src="/assets/hoox_logo_premium_1771778134217.png"
                        alt="Hoox"
                        style={{ width: 'clamp(60px, 10vw, 80px)', height: 'auto' }}
                    />
                </Link>

                <div className="search-container" style={{ flex: '1 1 300px', maxWidth: 500 }}>
                    <form onSubmit={handleSearch} style={{ position: 'relative' }}>
                        <Search size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                        <input
                            type="text"
                            className="form-input"
                            placeholder={loadingData ? "Syncing..." : "Search company..."}
                            style={{ paddingLeft: 40, borderRadius: 24, paddingRight: 12, height: 40, background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)' }}
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                        />
                    </form>
                </div>

                <div className="navbar-actions">
                    {showActions && (
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                            {onRefresh && (
                                <button className="btn btn-secondary btn-sm" onClick={onRefresh} disabled={refreshing} style={{ background: '#000', color: 'var(--accent-blue)', borderColor: 'var(--border)', padding: '6px 8px' }}>
                                    <RefreshCw size={14} style={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }} />
                                </button>
                            )}
                            <Link to="/profited-losted" className="btn btn-secondary btn-sm" title="Profited/Losted" style={{ background: '#000', borderColor: 'var(--accent-blue)', color: 'var(--accent-blue)', padding: '6px 8px' }}>
                                <TrendingUp size={14} />
                            </Link>
                            <Link to="/alerts" className="btn btn-secondary btn-sm" title="Alerts" style={{ background: '#000', color: 'var(--accent-blue)', borderColor: 'var(--border)', padding: '6px 8px' }}>
                                <Bell size={14} />
                            </Link>
                            {onAddSector && (
                                <button className="btn btn-secondary btn-sm" onClick={onAddSector} title="Add Sector" style={{ background: '#000', color: 'var(--accent-blue)', borderColor: 'var(--border)', padding: '6px 8px' }}>
                                    <Tag size={14} />
                                </button>
                            )}
                            {onAddIpo && (
                                <button className="btn btn-secondary btn-sm" onClick={onAddIpo} title="Add IPO" style={{ background: '#000', color: 'var(--accent-blue)', borderColor: 'var(--border)', padding: '6px 8px' }}>
                                    <Plus size={14} />
                                </button>
                            )}
                        </div>
                    )}
                    <button className="btn btn-secondary btn-sm" onClick={signOut} title="Sign out" style={{ background: '#000', color: 'var(--danger)', borderColor: 'var(--border)', padding: '6px 8px' }}>
                        <LogOut size={16} />
                    </button>
                </div>
            </nav>

            {showPopup && (
                <div className="modal-overlay" onClick={() => setShowPopup(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 400 }}>
                        <div className="modal-header">
                            <h3 className="modal-title">Select Company</h3>
                            <button className="btn btn-ghost btn-icon" onClick={() => setShowPopup(false)}><X size={18} /></button>
                        </div>
                        <div className="modal-body" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                {matchingIpos.map(ipo => (
                                    <button
                                        key={ipo.id}
                                        className="btn btn-secondary"
                                        style={{ justifyContent: 'flex-start', textAlign: 'left', width: '100%', padding: '12px 16px' }}
                                        onClick={() => {
                                            navigate(`/search/${slugify(ipo.company_name)}`)
                                            setShowPopup(false)
                                            setQuery('')
                                        }}
                                    >
                                        <div>
                                            <div style={{ fontWeight: 600, fontSize: 15 }}>{ipo.company_name}</div>
                                            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{ipo.sector_name || 'No Sector'}</div>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}
