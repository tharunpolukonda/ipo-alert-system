import { useState } from 'react'
import { X, Tag } from 'lucide-react'
import { sectorsApi } from '../api'

interface Props {
    onClose: () => void
    onCreated: (name: string) => void
}

export default function AddSectorModal({ onClose, onCreated }: Props) {
    const [name, setName] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    const handleSubmit = async () => {
        if (!name.trim()) { setError('Sector name is required'); return }
        setLoading(true)
        setError('')
        try {
            await sectorsApi.create(name.trim())
            onCreated(name.trim())
            onClose()
        } catch (e: unknown) {
            const err = e as { response?: { data?: { detail?: string } } }
            setError(err?.response?.data?.detail || 'Failed to create sector')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
            <div className="modal" style={{ maxWidth: 420 }}>
                <div className="modal-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{
                            width: 36, height: 36, borderRadius: 10, background: 'rgba(139,92,246,0.15)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#a78bfa'
                        }}>
                            <Tag size={18} />
                        </div>
                        <h2 className="modal-title">Add Sector</h2>
                    </div>
                    <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={18} /></button>
                </div>

                <div className="modal-body" style={{ paddingTop: 20 }}>
                    <div className="form-group">
                        <label className="form-label">Sector Name</label>
                        <input
                            className="form-input"
                            placeholder="e.g. Technology, Banking, Pharma..."
                            value={name}
                            onChange={e => setName(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                            autoFocus
                        />
                        {error && (
                            <p style={{ color: 'var(--danger)', fontSize: 13, marginTop: 4 }}>{error}</p>
                        )}
                    </div>
                </div>

                <div className="modal-footer">
                    <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
                    <button className="btn btn-primary" onClick={handleSubmit} disabled={loading}>
                        {loading ? <span className="spinner" /> : null}
                        {loading ? 'Saving...' : 'Add Sector'}
                    </button>
                </div>
            </div>
        </div>
    )
}
