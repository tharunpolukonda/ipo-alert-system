import React, { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { Sector, Ipo, sectorsApi } from '../api'
import { useAuth } from '../contexts/AuthContext'

interface GlobalContextType {
    sectors: Sector[]
    refreshSectors: () => Promise<void>
    showIpoModal: boolean
    setShowIpoModal: (show: boolean) => void
    editingIpo: Ipo | null
    setEditingIpo: (ipo: Ipo | null) => void
    showAddSectorModal: boolean
    setShowAddSectorModal: (show: boolean) => void
    toast: { message: string, type: 'success' | 'error' | 'info', id: number } | null
    showToast: (message: string, type?: 'success' | 'error' | 'info') => void
    hideToast: () => void
}

const GlobalContext = createContext<GlobalContextType | undefined>(undefined)

export const GlobalProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { userId } = useAuth()
    const [sectors, setSectors] = useState<Sector[]>([])
    const [showIpoModal, setShowIpoModal] = useState(false)
    const [editingIpo, setEditingIpo] = useState<Ipo | null>(null)
    const [showAddSectorModal, setShowAddSectorModal] = useState(false)
    const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' | 'info', id: number } | null>(null)

    const refreshSectors = useCallback(async () => {
        if (!userId) return
        try {
            const data = await sectorsApi.list()
            setSectors(data)
        } catch (err) {
            console.error('Failed to fetch sectors:', err)
        }
    }, [userId])

    useEffect(() => {
        refreshSectors()
    }, [refreshSectors])

    const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
        setToast({ message, type, id: Date.now() })
    }, [])

    const hideToast = useCallback(() => {
        setToast(null)
    }, [])

    return (
        <GlobalContext.Provider value={{
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
        }}>
            {children}
        </GlobalContext.Provider>
    )
}

export const useGlobal = () => {
    const context = useContext(GlobalContext)
    if (context === undefined) {
        throw new Error('useGlobal must be used within a GlobalProvider')
    }
    return context
}
