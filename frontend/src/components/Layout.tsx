import React, { useState } from 'react'
import Sidebar from './Sidebar'
import './Layout.css'
import { useGlobal } from '../contexts/GlobalContext'
import IpoModal from './IpoModal'
import AddSectorModal from './AddSectorModal'
import Toast from './Toast'

interface LayoutProps {
    children: React.ReactNode
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
    const [collapsed, setCollapsed] = useState(false)
    const {
        sectors,
        refreshSectors,
        showIpoModal,
        setShowIpoModal,
        editingIpo,
        setEditingIpo,
        showAddSectorModal,
        setShowAddSectorModal,
        toast,
        showToast,
        hideToast
    } = useGlobal()

    return (
        <div className="app-container">
            <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} />
            <main className={`main-content ${collapsed ? 'collapsed' : ''}`}>
                {children}
            </main>

            {/* Global Modals */}
            {showIpoModal && (
                <IpoModal
                    sectors={sectors}
                    editingIpo={editingIpo}
                    onClose={() => { setShowIpoModal(false); setEditingIpo(null); }}
                    onSuccess={() => {
                        // We might need to refresh data on the current page.
                        // For now, refreshSectors is global.
                        refreshSectors()
                        // Use a custom event to notify pages to refresh their own data
                        window.dispatchEvent(new CustomEvent('ipo-updated'))
                    }}
                    showToast={showToast}
                />
            )}
            {showAddSectorModal && (
                <AddSectorModal
                    onClose={() => setShowAddSectorModal(false)}
                    onCreated={() => {
                        refreshSectors()
                        showToast('Sector added!', 'success')
                    }}
                />
            )}
            {toast && (
                <Toast
                    key={toast.id}
                    message={toast.message}
                    type={toast.type}
                    onClose={hideToast}
                />
            )}
        </div>
    )
}

export default Layout
