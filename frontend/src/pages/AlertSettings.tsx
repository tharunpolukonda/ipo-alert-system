import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import {
    ArrowLeft, Bell, Plus, Trash2, Pencil, Check, X, Shield, Building2, User, LogOut
} from 'lucide-react'
import { alertRulesApi, sectorsApi, AlertRule, Sector } from '../api'
import { useAuth } from '../contexts/AuthContext'
import Toast from '../components/Toast'

interface ToastState { message: string; type: 'success' | 'error' | 'info'; id: number }

function EditableRule({
    rule, onUpdate, onDelete
}: {
    rule: AlertRule
    onUpdate: (id: string, gain: number, loss: number) => Promise<void>
    onDelete: (id: string) => Promise<void>
}) {
    const [editing, setEditing] = useState(false)
    const [gain, setGain] = useState(rule.gain_pct.toString())
    const [loss, setLoss] = useState(rule.loss_pct.toString())
    const [saving, setSaving] = useState(false)

    const handleSave = async () => {
        setSaving(true)
        await onUpdate(rule.id, parseFloat(gain), parseFloat(loss))
        setSaving(false)
        setEditing(false)
    }

    return (
        <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '14px 16px', background: 'var(--bg-input)', borderRadius: 10,
            border: '1px solid var(--border)', gap: 12, flexWrap: 'wrap'
        }}>
            <div style={{ flex: 1, minWidth: 160 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2 }}>
                    {rule.type === 'base' ? '🌐 Global Base Rule' : ''}
                    {rule.type === 'sector' ? `🏭 ${rule.sector_name || 'Sector'}` : ''}
                    {rule.type === 'company' ? `🏢 ${rule.company_name || 'Company'}` : ''}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    {rule.type === 'base' && 'Applies to all companies without a specific rule'}
                    {rule.type === 'sector' && 'Overrides base rule for this sector'}
                    {rule.type === 'company' && 'Overrides sector & base rules for this company'}
                </div>
            </div>

            {editing ? (
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span style={{ fontSize: 12, color: 'var(--success)', fontWeight: 700 }}>Gain</span>
                        <input className="form-input" type="number" value={gain}
                            onChange={e => setGain(e.target.value)}
                            style={{ width: 70, padding: '5px 8px', fontSize: 13 }} />
                        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>%</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span style={{ fontSize: 12, color: 'var(--danger)', fontWeight: 700 }}>Loss</span>
                        <input className="form-input" type="number" value={loss}
                            onChange={e => setLoss(e.target.value)}
                            style={{ width: 70, padding: '5px 8px', fontSize: 13 }} />
                        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>%</span>
                    </div>
                    <button className="btn btn-success btn-sm btn-icon" onClick={handleSave} disabled={saving}>
                        {saving ? <span className="spinner" style={{ width: 12, height: 12 }} /> : <Check size={14} />}
                    </button>
                    <button className="btn btn-ghost btn-icon" onClick={() => setEditing(false)}>
                        <X size={14} />
                    </button>
                </div>
            ) : (
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span className="gain-tag">+{rule.gain_pct}%</span>
                    <span className="loss-tag">{rule.loss_pct}%</span>
                    <button className="btn btn-ghost btn-icon" onClick={() => setEditing(true)} title="Edit">
                        <Pencil size={14} />
                    </button>
                    <button className="btn btn-ghost btn-icon" style={{ color: 'var(--danger)' }}
                        onClick={() => onDelete(rule.id)} title="Delete">
                        <Trash2 size={14} />
                    </button>
                </div>
            )}
        </div>
    )
}

// ── Add Sector Rule Modal ──────────────────────────────────────────
function AddSectorRuleModal({
    sectors, onClose, onCreated
}: { sectors: Sector[]; onClose: () => void; onCreated: () => void }) {
    const [sectorId, setSectorId] = useState('')
    const [sectorName, setSectorName] = useState('')
    const [gain, setGain] = useState('15')
    const [loss, setLoss] = useState('-15')
    const [loading, setLoading] = useState(false)

    const handleCreate = async () => {
        if (!sectorId) return
        setLoading(true)
        try {
            await alertRulesApi.create({ type: 'sector', sector_id: sectorId, sector_name: sectorName, gain_pct: parseFloat(gain), loss_pct: parseFloat(loss) })
            onCreated()
            onClose()
        } finally { setLoading(false) }
    }

    return (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
            <div className="modal" style={{ maxWidth: 460 }}>
                <div className="modal-header">
                    <h2 className="modal-title">Add Sector Rule</h2>
                    <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={18} /></button>
                </div>
                <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <div className="form-group">
                        <label className="form-label">Sector</label>
                        <select className="form-select" value={sectorId} onChange={e => {
                            setSectorId(e.target.value)
                            setSectorName(sectors.find(s => s.id === e.target.value)?.name || '')
                        }}>
                            <option value="">Select sector...</option>
                            {sectors.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                    </div>
                    <div className="grid-2" style={{ gap: 12 }}>
                        <div className="form-group">
                            <label className="form-label" style={{ color: 'var(--success)' }}>Gain Threshold (%)</label>
                            <input className="form-input" type="number" value={gain} onChange={e => setGain(e.target.value)} />
                        </div>
                        <div className="form-group">
                            <label className="form-label" style={{ color: 'var(--danger)' }}>Loss Threshold (%)</label>
                            <input className="form-input" type="number" value={loss} onChange={e => setLoss(e.target.value)} />
                        </div>
                    </div>
                </div>
                <div className="modal-footer">
                    <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
                    <button className="btn btn-primary" onClick={handleCreate} disabled={loading || !sectorId}>
                        {loading ? <span className="spinner" /> : null} Save Rule
                    </button>
                </div>
            </div>
        </div>
    )
}

// ── Add Company Rule Modal ────────────────────────────────────────
function AddCompanyRuleModal({
    onClose, onCreated
}: { onClose: () => void; onCreated: () => void }) {
    const [companyName, setCompanyName] = useState('')
    const [gain, setGain] = useState('15')
    const [loss, setLoss] = useState('-15')
    const [loading, setLoading] = useState(false)

    const handleCreate = async () => {
        if (!companyName.trim()) return
        setLoading(true)
        try {
            await alertRulesApi.create({ type: 'company', company_name: companyName.trim(), gain_pct: parseFloat(gain), loss_pct: parseFloat(loss) })
            onCreated()
            onClose()
        } finally { setLoading(false) }
    }

    return (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
            <div className="modal" style={{ maxWidth: 460 }}>
                <div className="modal-header">
                    <h2 className="modal-title">Add Company Rule</h2>
                    <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={18} /></button>
                </div>
                <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <div className="form-group">
                        <label className="form-label">Company Name</label>
                        <input className="form-input" placeholder="e.g. Tata Technologies" value={companyName}
                            onChange={e => setCompanyName(e.target.value)} />
                    </div>
                    <div className="grid-2" style={{ gap: 12 }}>
                        <div className="form-group">
                            <label className="form-label" style={{ color: 'var(--success)' }}>Gain Threshold (%)</label>
                            <input className="form-input" type="number" value={gain} onChange={e => setGain(e.target.value)} />
                        </div>
                        <div className="form-group">
                            <label className="form-label" style={{ color: 'var(--danger)' }}>Loss Threshold (%)</label>
                            <input className="form-input" type="number" value={loss} onChange={e => setLoss(e.target.value)} />
                        </div>
                    </div>
                </div>
                <div className="modal-footer">
                    <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
                    <button className="btn btn-primary" onClick={handleCreate} disabled={loading || !companyName.trim()}>
                        {loading ? <span className="spinner" /> : null} Save Rule
                    </button>
                </div>
            </div>
        </div>
    )
}

// ══ Main AlertSettings page ═══════════════════════════════════════
export default function AlertSettings() {
    const { signOut } = useAuth()
    const [rules, setRules] = useState<AlertRule[]>([])
    const [sectors, setSectors] = useState<Sector[]>([])
    const [loading, setLoading] = useState(true)
    const [toast, setToast] = useState<ToastState | null>(null)
    const [showSectorModal, setShowSectorModal] = useState(false)
    const [showCompanyModal, setShowCompanyModal] = useState(false)

    const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') =>
        setToast({ message, type, id: Date.now() })

    const fetchData = useCallback(async () => {
        try {
            const [r, s] = await Promise.all([alertRulesApi.list(), sectorsApi.list()])
            // Sort: base first, then sector, then company
            r.sort((a, b) => {
                const order = { base: 0, sector: 1, company: 2 }
                return (order[a.type] ?? 3) - (order[b.type] ?? 3)
            })
            setRules(r)
            setSectors(s)
        } catch { showToast('Failed to load rules', 'error') }
        finally { setLoading(false) }
    }, [])

    useEffect(() => { fetchData() }, [fetchData])

    const ensureBaseRule = async () => {
        const hasBase = rules.some(r => r.type === 'base')
        if (!hasBase) {
            await alertRulesApi.create({ type: 'base', gain_pct: 15, loss_pct: -15 })
            await fetchData()
        }
    }

    const handleUpdate = async (id: string, gain_pct: number, loss_pct: number) => {
        try {
            await alertRulesApi.update(id, { gain_pct, loss_pct })
            await fetchData()
            showToast('Rule updated', 'success')
        } catch { showToast('Update failed', 'error') }
    }

    const handleDelete = async (id: string) => {
        if (!confirm('Delete this rule? The next applicable rule will become active.')) return
        try {
            await alertRulesApi.delete(id)
            await fetchData()
            showToast('Rule deleted', 'success')
        } catch { showToast('Delete failed', 'error') }
    }

    const baseRules = rules.filter(r => r.type === 'base')
    const sectorRules = rules.filter(r => r.type === 'sector')
    const companyRules = rules.filter(r => r.type === 'company')

    return (
        <div className="page">
            <div className="glow-bg" />

            {/* Navbar */}
            <nav className="navbar" style={{ height: 72 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <Link to="/" className="btn btn-secondary btn-sm" style={{ padding: '8px', background: '#000', borderColor: 'var(--border)' }}>
                        <ArrowLeft size={20} color="var(--accent-blue)" />
                    </Link>
                    <img
                        src="/assets/hoox_logo_premium_1771778134217.png"
                        alt="Hoox"
                        style={{ width: 44, height: 'auto' }}
                    />
                </div>
                <div className="navbar-actions">
                    <button className="btn btn-secondary btn-sm" onClick={signOut} title="Sign out" style={{ background: '#000', color: 'var(--danger)', borderColor: 'var(--border)', padding: '4px 8px' }}>
                        <LogOut size={16} />
                    </button>
                </div>
            </nav>

            <div style={{ position: 'relative', zIndex: 1 }}>
                <div className="page-header">
                    <div>
                        <h1 className="page-title">Alert Rule Configuration</h1>
                        <p style={{ color: 'var(--text-muted)', fontSize: 14, marginTop: 4 }}>
                            Rules apply in priority order: Company → Sector → Base
                        </p>
                    </div>
                </div>

                <div className="page-content" style={{ paddingTop: 20, maxWidth: 900 }}>
                    {loading ? (
                        <div className="empty-state"><span className="spinner spinner-lg" /></div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>

                            {/* ── Base Rule ── */}
                            <div className="card" style={{ padding: 24 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                        <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(59,130,246,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-blue)' }}>
                                            <Shield size={18} />
                                        </div>
                                        <div>
                                            <h3 style={{ fontSize: 16, fontWeight: 700 }}>Base Rule</h3>
                                            <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Default rule applied to all companies</p>
                                        </div>
                                    </div>
                                    {baseRules.length === 0 && (
                                        <button className="btn btn-primary btn-sm" onClick={ensureBaseRule}>
                                            <Plus size={14} /> Create Base Rule
                                        </button>
                                    )}
                                </div>
                                {baseRules.length === 0 ? (
                                    <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 14 }}>
                                        No base rule set. Default is ±15%. Click above to create one.
                                    </div>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                        {baseRules.map(r => (
                                            <EditableRule key={r.id} rule={r} onUpdate={handleUpdate} onDelete={handleDelete} />
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* ── Sector Rules ── */}
                            <div className="card" style={{ padding: 24 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                        <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(139,92,246,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-purple)' }}>
                                            <Building2 size={18} />
                                        </div>
                                        <div>
                                            <h3 style={{ fontSize: 16, fontWeight: 700 }}>Sector-Specific Rules</h3>
                                            <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Overrides the base rule for specific sectors</p>
                                        </div>
                                    </div>
                                    <button className="btn btn-secondary btn-sm" onClick={() => setShowSectorModal(true)}>
                                        <Plus size={14} /> Add Sector Rule
                                    </button>
                                </div>
                                {sectorRules.length === 0 ? (
                                    <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 14 }}>
                                        No sector rules. Base rule applies to all sectors.
                                    </div>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                        {sectorRules.map(r => (
                                            <EditableRule key={r.id} rule={r} onUpdate={handleUpdate} onDelete={handleDelete} />
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* ── Company Rules ── */}
                            <div className="card" style={{ padding: 24 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                        <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(16,185,129,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-emerald)' }}>
                                            <User size={18} />
                                        </div>
                                        <div>
                                            <h3 style={{ fontSize: 16, fontWeight: 700 }}>Company-Specific Rules</h3>
                                            <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Highest priority — overrides sector & base rules</p>
                                        </div>
                                    </div>
                                    <button className="btn btn-secondary btn-sm" onClick={() => setShowCompanyModal(true)}>
                                        <Plus size={14} /> Add Company Rule
                                    </button>
                                </div>
                                {companyRules.length === 0 ? (
                                    <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 14 }}>
                                        No company rules. Sector or base rules apply.
                                    </div>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                        {companyRules.map(r => (
                                            <EditableRule key={r.id} rule={r} onUpdate={handleUpdate} onDelete={handleDelete} />
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Rule priority explanation */}
                            <div style={{
                                padding: '16px 20px',
                                background: 'rgba(59,130,246,0.06)',
                                border: '1px solid rgba(59,130,246,0.15)',
                                borderRadius: 12, fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.8
                            }}>
                                <strong style={{ color: 'var(--accent-blue)' }}>📋 How Rules Work:</strong><br />
                                Alerts trigger when CMP crosses <span className="gain">Gain%</span> or <span className="loss">Loss%</span> relative to both <strong>Issue Price</strong> and <strong>Listing Price</strong>.<br />
                                <strong>Priority:</strong> Company Rule → Sector Rule → Base Rule (default ±15%)<br />
                                Alerts are sent to Discord daily at <strong>2:00 PM IST</strong> (Mon–Fri).
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {showSectorModal && (
                <AddSectorRuleModal sectors={sectors} onClose={() => setShowSectorModal(false)} onCreated={fetchData} />
            )}
            {showCompanyModal && (
                <AddCompanyRuleModal onClose={() => setShowCompanyModal(false)} onCreated={fetchData} />
            )}

            {toast && (
                <Toast key={toast.id} message={toast.message} type={toast.type} onClose={() => setToast(null)} />
            )}
        </div>
    )
}
