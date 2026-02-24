import { X, AlertTriangle } from 'lucide-react'

interface Props {
    title: string
    message: string
    onConfirm: () => void
    onCancel: () => void
    loading?: boolean
}

export default function DeleteConfirmationModal({
    title,
    message,
    onConfirm,
    onCancel,
    loading = false
}: Props) {
    return (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onCancel()}>
            <div className="modal" style={{ maxWidth: 400 }}>
                <div className="modal-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{
                            width: 36, height: 36, borderRadius: 10,
                            background: 'var(--danger-bg)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--danger)'
                        }}>
                            <AlertTriangle size={18} />
                        </div>
                        <h2 className="modal-title" style={{ background: 'var(--danger)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{title}</h2>
                    </div>
                    <button className="btn btn-ghost btn-icon" onClick={onCancel}><X size={18} /></button>
                </div>

                <div className="modal-body">
                    <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>{message}</p>
                </div>

                <div className="modal-footer">
                    <button className="btn btn-secondary" onClick={onCancel}>Cancel</button>
                    <button className="btn btn-danger" onClick={onConfirm} disabled={loading}>
                        {loading ? <span className="spinner" style={{ width: 14, height: 14, borderTopColor: 'white' }} /> : 'Delete Permanently'}
                    </button>
                </div>
            </div>
        </div>
    )
}
