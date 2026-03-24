import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { GlobalProvider } from './contexts/GlobalContext'
import AuthPage from './pages/AuthPage'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import AlertSettings from './pages/AlertSettings'
import ProfitedLostedPage from './pages/ProfitedLostedPage'
import CompanyDetailPage from './pages/CompanyDetailPage'
import ScrapIpoAuto from './pages/ScrapIpoAuto'

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
        <Layout>
            <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/alerts" element={<AlertSettings />} />
                <Route path="/profited-losted" element={<ProfitedLostedPage />} />
                <Route path="/scrap-ipo-auto" element={<ScrapIpoAuto />} />
                <Route path="/company/:id" element={<CompanyDetailPage />} />
                <Route path="/search/:searchQuery" element={<CompanyDetailPage />} />
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </Layout>
    )
}

export default function App() {
    return (
        <BrowserRouter>
            <AuthProvider>
                <GlobalProvider>
                    <ProtectedRoutes />
                </GlobalProvider>
            </AuthProvider>
        </BrowserRouter>
    )
}
