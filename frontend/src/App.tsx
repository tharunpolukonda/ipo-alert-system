import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import AuthPage from './pages/AuthPage'
import Dashboard from './pages/Dashboard'
import AlertSettings from './pages/AlertSettings'
import ProfitedLostedPage from './pages/ProfitedLostedPage'
import CompanyDetailPage from './pages/CompanyDetailPage'

function ProtectedRoutes() {
    const { session, loading } = useAuth()

    if (loading) {
        return (
            <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)' }}>
                <span className="spinner spinner-lg" />
            </div>
        )
    }

    if (!session) {
        return <AuthPage onAuthSuccess={() => { }} />
    }

    return (
        <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/alerts" element={<AlertSettings />} />
            <Route path="/profited-losted" element={<ProfitedLostedPage />} />
            <Route path="/company/:id" element={<CompanyDetailPage />} />
            <Route path="/search/:searchQuery" element={<CompanyDetailPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    )
}

export default function App() {
    return (
        <BrowserRouter>
            <AuthProvider>
                <ProtectedRoutes />
            </AuthProvider>
        </BrowserRouter>
    )
}
