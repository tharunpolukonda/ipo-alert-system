import { useEffect } from 'react'
import { CheckCircle, XCircle, Info, X } from 'lucide-react'

interface ToastProps {
    message: string
    type: 'success' | 'error' | 'info'
    onClose: () => void
    duration?: number
}

export default function Toast({ message, type, onClose, duration = 4000 }: ToastProps) {
    useEffect(() => {
        const t = setTimeout(onClose, duration)
        return () => clearTimeout(t)
    }, [onClose, duration])

    const icons = {
        success: <CheckCircle size={18} />,
        error: <XCircle size={18} />,
        info: <Info size={18} />,
    }

    return (
        <div className={`toast toast-${type}`}>
            {icons[type]}
            <span style={{ flex: 1 }}>{message}</span>
            <button className="btn btn-ghost btn-icon" onClick={onClose} style={{ marginLeft: 8 }}>
                <X size={14} />
            </button>
        </div>
    )
}
