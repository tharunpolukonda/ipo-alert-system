import { useState } from 'react'
import { TrendingUp, TrendingDown, Trash2, ChevronDown, ChevronUp, Calendar, DollarSign, Pencil } from 'lucide-react'
import { PortfolioCompany, iposApi } from '../api'
import DeleteConfirmationModal from './DeleteConfirmationModal'

interface Props {
    company: PortfolioCompany
    onDeleted: () => void
    onEdit: () => void
    showToast: (msg: string, type?: 'success' | 'error' | 'info') => void
}

export default function CompanyCard({ company, onDeleted, onEdit, showToast }: Props) {
    const [expanded, setExpanded] = useState(false)
    const [deleting, setDeleting] = useState(false)
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

    const isGain = (company.pct_change ?? 0) >= 0
    const pctDisplay = company.pct_change !== null
        ? `${company.pct_change >= 0 ? '+' : ''}${company.pct_change.toFixed(2)}%`
        : '—'

    const handleDelete = async () => {
        setDeleting(true)
        try {
            await iposApi.delete(company.id)
            showToast(`${company.company_name} removed`, 'success')
            onDeleted()
        } catch {
            showToast('Failed to delete', 'error')
        } finally {
            setDeleting(false)
            setShowDeleteConfirm(false)
        }
    }

    return (
        <div className="card" style={{ cursor: 'default', position: 'relative' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                <div>
                    <h3 style={{ fontSize: 17, fontWeight: 700, marginBottom: 4 }}>{company.company_name}</h3>
                    <span className="badge badge-purple">{company.sector}</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                    <span className={isGain ? 'gain-tag' : 'loss-tag'}>
                        {isGain ? <TrendingUp size={13} style={{ display: 'inline', marginRight: 4 }} /> : <TrendingDown size={13} style={{ display: 'inline', marginRight: 4 }} />}
                        {pctDisplay}
                    </span>
                    {company.cmp !== null && (
                        <span style={{ fontSize: 20, fontWeight: 800, fontFamily: 'JetBrains Mono, monospace', color: 'var(--text-primary)' }}>
                            ₹{company.cmp?.toLocaleString()}
                        </span>
                    )}
                </div>
            </div>

            {/* Key metrics */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
                <div style={{ background: 'var(--bg-input)', borderRadius: 8, padding: '10px 12px' }}>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', marginBottom: 3 }}>Invested</div>
                    <div style={{ fontSize: 16, fontWeight: 700, fontFamily: 'JetBrains Mono, monospace' }}>
                        ₹{company.invested.toLocaleString()}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                        {company.shares} sh @ ₹{company.buy_price}
                    </div>
                </div>
                <div style={{ background: 'var(--bg-input)', borderRadius: 8, padding: '10px 12px' }}>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', marginBottom: 3 }}>Current Value</div>
                    <div style={{ fontSize: 16, fontWeight: 700, fontFamily: 'JetBrains Mono, monospace', color: isGain ? 'var(--success)' : 'var(--danger)' }}>
                        {company.current_value !== null ? `₹${company.current_value.toLocaleString()}` : '—'}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                        {company.current_value !== null && company.invested > 0
                            ? `${company.pct_change && company.pct_change >= 0 ? '+' : ''}₹${(company.current_value - company.invested).toLocaleString(undefined, { maximumFractionDigits: 0 })}`
                            : 'CMP not available'
                        }
                    </div>
                </div>
            </div>

            {/* Expand toggle */}
            <button
                className="btn btn-ghost"
                style={{ width: '100%', justifyContent: 'center', fontSize: 12, padding: '6px' }}
                onClick={() => setExpanded(e => !e)}
            >
                IPO Details {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>

            {expanded && (
                <div style={{ marginTop: 12, padding: '14px', background: 'var(--bg-input)', borderRadius: 10 }}>
                    <div className="grid-2" style={{ gap: 10, marginBottom: 12 }}>
                        {[
                            { label: 'Issue Price', value: company.issue_price ? `₹${company.issue_price}` : '—' },
                            { label: 'Listing Price', value: company.listing_price ? `₹${company.listing_price}` : '—' },
                            { label: 'Listed On', value: company.listed_on || '—', icon: <Calendar size={12} /> },
                        ].map(({ label, value }) => (
                            <div key={label}>
                                <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', marginBottom: 3 }}>{label}</div>
                                <div style={{ fontSize: 14, fontWeight: 600 }}>{value}</div>
                            </div>
                        ))}
                    </div>

                    {/* % vs Issue and Listing */}
                    {company.cmp && (
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
                            {company.issue_price && (() => {
                                const issueNum = parseFloat(company.issue_price!)
                                if (!isNaN(issueNum) && issueNum > 0) {
                                    const pct = ((company.cmp! - issueNum) * 100 / issueNum)
                                    return (
                                        <div style={{ fontSize: 12, padding: '4px 10px', borderRadius: 6, background: pct >= 0 ? 'var(--success-bg)' : 'var(--danger-bg)', color: pct >= 0 ? 'var(--success)' : 'var(--danger)', fontWeight: 700 }}>
                                            vs Issue: {pct >= 0 ? '+' : ''}{pct.toFixed(2)}%
                                        </div>
                                    )
                                }
                            })()}
                            {company.listing_price && (() => {
                                const listNum = parseFloat(company.listing_price!)
                                if (!isNaN(listNum) && listNum > 0) {
                                    const pct = ((company.cmp! - listNum) * 100 / listNum)
                                    return (
                                        <div style={{ fontSize: 12, padding: '4px 10px', borderRadius: 6, background: pct >= 0 ? 'var(--success-bg)' : 'var(--danger-bg)', color: pct >= 0 ? 'var(--success)' : 'var(--danger)', fontWeight: 700 }}>
                                            vs Listing: {pct >= 0 ? '+' : ''}{pct.toFixed(2)}%
                                        </div>
                                    )
                                }
                            })()}
                        </div>
                    )}
                </div>
            )}

            {/* Delete & Edit Actions */}
            <div style={{ position: 'absolute', top: 12, right: 12, display: 'flex', gap: 4 }}>
                <button
                    className="btn btn-ghost btn-icon"
                    style={{ color: 'var(--text-muted)' }}
                    onClick={onEdit}
                    title="Edit"
                >
                    <Pencil size={14} />
                </button>
                <button
                    className="btn btn-ghost btn-icon"
                    style={{ color: 'var(--text-muted)' }}
                    onClick={() => setShowDeleteConfirm(true)}
                    disabled={deleting}
                    title="Remove"
                >
                    {deleting ? <span className="spinner" style={{ width: 14, height: 14 }} /> : <Trash2 size={14} />}
                </button>
            </div>

            {showDeleteConfirm && (
                <DeleteConfirmationModal
                    title="Confirm Delete"
                    message={`Are you sure you want to delete ${company.company_name}? This action cannot be undone.`}
                    onConfirm={handleDelete}
                    onCancel={() => setShowDeleteConfirm(false)}
                    loading={deleting}
                />
            )}
        </div>
    )
}
