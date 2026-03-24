import { useState, useEffect, useCallback } from 'react'
import { ArrowLeft, Play, Trash2, List, CheckCircle, X, ExternalLink, Save, AlertTriangle, RefreshCw } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { automationApi, PendingIpo, ThrowoutIpo, Ipo } from '../api'
import { useGlobal } from '../contexts/GlobalContext'

export default function ScrapIpoAuto() {
    const navigate = useNavigate()
    const { sectors, showToast } = useGlobal()
    const [pendingIpos, setPendingIpos] = useState<PendingIpo[]>([])
    const [throwoutIpos, setThrowoutIpos] = useState<ThrowoutIpo[]>([])
    const [loading, setLoading] = useState(true)
    const [fetching, setFetching] = useState(false)
    const [showThrowout, setShowThrowout] = useState(false)

    // Form state for each pending IPO
    const [formStates, setFormStates] = useState<Record<string, {
        sector_id: string,
        portfolio: 'yes' | 'no',
        no_of_shares: string,
        buy_price: string
    }>>({})

    // Preview state
    const [previewIpo, setPreviewIpo] = useState<{ id: string, data: Partial<Ipo> } | null>(null)
    const [editingPreview, setEditingPreview] = useState<Partial<Ipo> | null>(null)

    const fetchData = useCallback(async () => {
        setLoading(true)
        try {
            const [pending, throwout] = await Promise.all([
                automationApi.listPending(),
                automationApi.listThrowout()
            ])
            setPendingIpos(pending)
            setThrowoutIpos(throwout)

            // Initialize form states for new pending items
            const newStates = { ...formStates }
            pending.forEach(ipo => {
                if (!newStates[ipo.id]) {
                    newStates[ipo.id] = {
                        sector_id: '',
                        portfolio: 'no',
                        no_of_shares: '',
                        buy_price: ''
                    }
                }
            })
            setFormStates(newStates)
        } catch {
            showToast('Failed to load data', 'error')
        } finally {
            setLoading(false)
        }
    }, [formStates, showToast])

    useEffect(() => { fetchData() }, [])

    const handleAutoFetch = async () => {
        setFetching(true)
        try {
            const res = await automationApi.autoFetch()
            showToast(res.message, res.added > 0 ? 'success' : 'info')
            fetchData()
        } catch {
            showToast('Failed to fetch IPOs', 'error')
        } finally {
            setFetching(false)
        }
    }

    const handleFormChange = (id: string, field: string, value: any) => {
        setFormStates(prev => ({
            ...prev,
            [id]: { ...prev[id], [field]: value }
        }))
    }

    const handlePrepareSubmit = (ipo: PendingIpo) => {
        const state = formStates[ipo.id]
        if (!state.sector_id) {
            showToast('Please select a sector', 'error')
            return
        }
        if (state.portfolio === 'yes') {
            if (!state.no_of_shares || isNaN(Number(state.no_of_shares))) {
                showToast('Enter valid shares', 'error')
                return
            }
            if (!state.buy_price || isNaN(Number(state.buy_price))) {
                showToast('Enter valid buy price', 'error')
                return
            }
        }

        const sector = sectors.find(s => s.id === state.sector_id)
        const data: Partial<Ipo> = {
            company_name: ipo.company_name,
            sector_id: state.sector_id,
            sector_name: sector?.name,
            portfolio: state.portfolio === 'yes',
            no_of_shares: state.portfolio === 'yes' ? Number(state.no_of_shares) : undefined,
            buy_price: state.portfolio === 'yes' ? Number(state.buy_price) : undefined,
            listed_on: ipo.listed_on,
            issue_price: ipo.issue_price,
            listing_price: ipo.listing_price,
            issue_size: ipo.issue_size,
            qib_subscription: ipo.qib_subscription,
            nii_subscription: ipo.nii_subscription,
            rii_subscription: ipo.rii_subscription,
            total_subscription: ipo.total_subscription,
        }
        setPreviewIpo({ id: ipo.id, data })
        setEditingPreview({ ...data })
    }

    const handleFinalSubmit = async () => {
        if (!previewIpo || !editingPreview) return
        try {
            await automationApi.submitPending(previewIpo.id, editingPreview)
            showToast('IPO added to tracker!', 'success')
            setPreviewIpo(null)
            setEditingPreview(null)
            fetchData()
        } catch {
            showToast('Failed to add IPO', 'error')
        }
    }

    const handleThrowout = async (ipo: PendingIpo) => {
        try {
            await automationApi.createThrowout({
                company_name: ipo.company_name,
                search_id: ipo.search_id
            })
            showToast('Company discarded', 'info')
            fetchData()
        } catch {
            showToast('Failed to discard company', 'error')
        }
    }

    const handleRestore = async (throwout: ThrowoutIpo) => {
        try {
            await automationApi.restoreThrowout(throwout.id)
            showToast('Company restored', 'success')
            fetchData()
        } catch {
            showToast('Failed to restore company', 'error')
        }
    }

    return (
        <div className="page">
            <div className="glow-bg" />

            <header className="page-header" style={{ position: 'relative', zIndex: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <button className="btn btn-ghost btn-icon" onClick={() => navigate('/')}>
                        <ArrowLeft size={18} />
                    </button>
                    <div>
                        <h1 className="page-title">IPO Automation</h1>
                        <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 4 }}>
                            Automatically fetch and add closed IPOs from Groww
                        </p>
                    </div>
                </div>

                <div style={{ display: 'flex', gap: 12 }}>
                    <button
                        className="btn btn-secondary"
                        onClick={() => setShowThrowout(!showThrowout)}
                        style={{ background: showThrowout ? 'rgba(59,130,246,0.1)' : undefined }}
                    >
                        <Trash2 size={16} /> {showThrowout ? 'Hide Throwouts' : 'Throwout List'}
                    </button>
                    <button
                        className="btn btn-primary"
                        onClick={handleAutoFetch}
                        disabled={fetching}
                    >
                        {fetching ? <span className="spinner" /> : <Play size={16} />}
                        {fetching ? 'Fetching...' : 'Start IPO Automate'}
                    </button>
                </div>
            </header>

            <div className="page-content" style={{ position: 'relative', zIndex: 5 }}>
                {showThrowout ? (
                    <div className="table-container fade-in">
                        <h2 style={{ fontSize: 18, fontWeight: 600, padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
                            Discarded Companies
                        </h2>
                        {throwoutIpos.length === 0 ? (
                            <div className="empty-state" style={{ padding: 60 }}>
                                <Trash2 size={40} style={{ color: 'var(--text-muted)', opacity: 0.5 }} />
                                <p>No companies in throwout list.</p>
                            </div>
                        ) : (
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>Company Name</th>
                                        <th>Search ID</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {throwoutIpos.map(t => (
                                        <tr key={t.id}>
                                            <td style={{ fontWeight: 600 }}>{t.company_name}</td>
                                            <td style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{t.search_id}</td>
                                            <td>
                                                <button className="btn btn-ghost btn-icon" onClick={() => handleRestore(t)} title="Restore">
                                                    <RefreshCw size={16} style={{ color: 'var(--accent-blue)' }} />
                                                    <span style={{ fontSize: 12, marginLeft: 6 }}>Willing to Add</span>
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                        <div className="section-header">
                            <h2 style={{ fontSize: 18, fontWeight: 600 }}>Pending Additions ({pendingIpos.length})</h2>
                        </div>

                        {loading ? (
                            <div className="empty-state">
                                <span className="spinner spinner-lg" />
                                <p>Loading pending IPOs...</p>
                            </div>
                        ) : pendingIpos.length === 0 ? (
                            <div className="empty-state" style={{ padding: 80 }}>
                                <List size={48} style={{ opacity: 0.2 }} />
                                <h3 style={{ marginTop: 16 }}>No pending IPOs</h3>
                                <p>Click "Start IPO Automate" to fetch new companies from Groww.</p>
                            </div>
                        ) : (
                            <div style={{ display: 'grid', gap: 16 }}>
                                {pendingIpos.map(ipo => {
                                    const state = formStates[ipo.id] || { sector_id: '', portfolio: 'no', no_of_shares: '', buy_price: '' }
                                    return (
                                        <div key={ipo.id} className="stat-card" style={{ padding: '24px', background: 'rgba(10,13,20,0.8)', backdropFilter: 'blur(10px)', border: '1px solid var(--border)' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
                                                <div>
                                                    <h3 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)' }}>{ipo.company_name}</h3>
                                                    <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                                                        <span className="badge" style={{ background: 'rgba(255,255,255,0.05)' }}>{ipo.issue_price ? `Issue: ₹${ipo.issue_price}` : 'Issue Price: —'}</span>
                                                        <span className="badge" style={{ background: 'rgba(255,255,255,0.05)' }}>{ipo.listing_price ? `Listing: ₹${ipo.listing_price}` : 'Listing Price: —'}</span>
                                                        <a href={ipo.groww_link} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-blue)', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
                                                            Groww Link <ExternalLink size={12} />
                                                        </a>
                                                    </div>
                                                </div>
                                                <button className="btn btn-ghost btn-icon" onClick={() => handleThrowout(ipo)} title="Discard this company">
                                                    <Trash2 size={18} style={{ color: 'var(--danger)' }} />
                                                </button>
                                            </div>

                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 20, alignItems: 'flex-end' }}>
                                                <div className="form-group">
                                                    <label className="form-label" style={{ fontSize: 12, opacity: 0.7 }}>Sector Name</label>
                                                    <select
                                                        className="form-select"
                                                        value={state.sector_id}
                                                        onChange={e => handleFormChange(ipo.id, 'sector_id', e.target.value)}
                                                    >
                                                        <option value="">Select Sector...</option>
                                                        {sectors.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                                    </select>
                                                </div>

                                                <div className="form-group">
                                                    <label className="form-label" style={{ fontSize: 12, opacity: 0.7 }}>In Portfolio?</label>
                                                    <div className="radio-group" style={{ height: 42, padding: '0 12px', background: 'rgba(255,255,255,0.03)' }}>
                                                        <label className="radio-option">
                                                            <input type="radio" checked={state.portfolio === 'yes'} onChange={() => handleFormChange(ipo.id, 'portfolio', 'yes')} /> Yes
                                                        </label>
                                                        <label className="radio-option">
                                                            <input type="radio" checked={state.portfolio === 'no'} onChange={() => handleFormChange(ipo.id, 'portfolio', 'no')} /> No
                                                        </label>
                                                    </div>
                                                </div>

                                                <button className="btn btn-primary" style={{ height: 42, padding: '0 20px' }} onClick={() => handlePrepareSubmit(ipo)}>
                                                    <CheckCircle size={16} /> Submit
                                                </button>
                                            </div>

                                            {state.portfolio === 'yes' && (
                                                <div className="grid-2 fade-in" style={{ gap: 16, marginTop: 16, maxWidth: 500 }}>
                                                    <div className="form-group">
                                                        <label className="form-label" style={{ fontSize: 12 }}>No. of Shares</label>
                                                        <input
                                                            className="form-input"
                                                            type="number"
                                                            placeholder="e.g. 100"
                                                            value={state.no_of_shares}
                                                            onChange={e => handleFormChange(ipo.id, 'no_of_shares', e.target.value)}
                                                        />
                                                    </div>
                                                    <div className="form-group">
                                                        <label className="form-label" style={{ fontSize: 12 }}>Buy Price (₹)</label>
                                                        <input
                                                            className="form-input"
                                                            type="number"
                                                            placeholder="e.g. 500"
                                                            value={state.buy_price}
                                                            onChange={e => handleFormChange(ipo.id, 'buy_price', e.target.value)}
                                                        />
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Preview Modal */}
            {previewIpo && editingPreview && (
                <div className="modal-overlay" style={{ zIndex: 1000 }}>
                    <div className="modal modal-lg" style={{ maxWidth: 700 }}>
                        <div className="modal-header">
                            <h2 className="modal-title">Preview & Finalize</h2>
                            <button className="btn btn-ghost btn-icon" onClick={() => setPreviewIpo(null)}><X size={18} /></button>
                        </div>
                        <div className="modal-body">
                            <div style={{ background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)', padding: 16, borderRadius: 12, marginBottom: 20, display: 'flex', gap: 12, alignItems: 'center' }}>
                                <AlertTriangle size={20} style={{ color: 'var(--accent-blue)' }} />
                                <p style={{ fontSize: 13 }}>Please review the scraped data. You can edit any field before the final save.</p>
                            </div>

                            <div className="grid-2" style={{ gap: 20 }}>
                                <div>
                                    <label className="form-label">Company Name</label>
                                    <input className="form-input" value={editingPreview.company_name} onChange={e => setEditingPreview({ ...editingPreview, company_name: e.target.value })} />
                                </div>
                                <div>
                                    <label className="form-label">Sector</label>
                                    <input className="form-input" disabled value={editingPreview.sector_name} />
                                </div>
                                <div>
                                    <label className="form-label">Listed On</label>
                                    <input className="form-input" value={editingPreview.listed_on || ''} onChange={e => setEditingPreview({ ...editingPreview, listed_on: e.target.value })} />
                                </div>
                                <div>
                                    <label className="form-label">Issue Price</label>
                                    <input className="form-input" value={editingPreview.issue_price || ''} onChange={e => setEditingPreview({ ...editingPreview, issue_price: e.target.value })} />
                                </div>
                                <div>
                                    <label className="form-label">Listing Price</label>
                                    <input className="form-input" value={editingPreview.listing_price || ''} onChange={e => setEditingPreview({ ...editingPreview, listing_price: e.target.value })} />
                                </div>
                                <div>
                                    <label className="form-label">Issue Size</label>
                                    <input className="form-input" value={editingPreview.issue_size || ''} onChange={e => setEditingPreview({ ...editingPreview, issue_size: e.target.value })} />
                                </div>
                                <div>
                                    <label className="form-label">QIB Sub.</label>
                                    <input className="form-input" value={editingPreview.qib_subscription || ''} onChange={e => setEditingPreview({ ...editingPreview, qib_subscription: e.target.value })} />
                                </div>
                                <div>
                                    <label className="form-label">NII Sub.</label>
                                    <input className="form-input" value={editingPreview.nii_subscription || ''} onChange={e => setEditingPreview({ ...editingPreview, nii_subscription: e.target.value })} />
                                </div>
                                <div>
                                    <label className="form-label">RII Sub.</label>
                                    <input className="form-input" value={editingPreview.rii_subscription || ''} onChange={e => setEditingPreview({ ...editingPreview, rii_subscription: e.target.value })} />
                                </div>
                                <div>
                                    <label className="form-label">Total Sub.</label>
                                    <input className="form-input" value={editingPreview.total_subscription || ''} onChange={e => setEditingPreview({ ...editingPreview, total_subscription: e.target.value })} />
                                </div>
                            </div>

                            {editingPreview.portfolio && (
                                <div style={{ marginTop: 20, padding: 16, background: 'rgba(16,185,129,0.05)', borderRadius: 12, border: '1px solid rgba(16,185,129,0.1)' }}>
                                    <h4 style={{ color: 'var(--success)', fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Portfolio Holdings</h4>
                                    <div className="grid-2" style={{ gap: 16 }}>
                                        <div>
                                            <label className="form-label">Shares</label>
                                            <input type="number" className="form-input" value={editingPreview.no_of_shares} onChange={e => setEditingPreview({ ...editingPreview, no_of_shares: Number(e.target.value) })} />
                                        </div>
                                        <div>
                                            <label className="form-label">Buy Price</label>
                                            <input type="number" className="form-input" value={editingPreview.buy_price} onChange={e => setEditingPreview({ ...editingPreview, buy_price: Number(e.target.value) })} />
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => setPreviewIpo(null)}>Cancel</button>
                            <button className="btn btn-primary" onClick={handleFinalSubmit}>
                                <Save size={16} /> Proceed & Save
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
