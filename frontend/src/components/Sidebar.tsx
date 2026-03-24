import React from 'react'
import { NavLink } from 'react-router-dom'
import {
    LayoutDashboard,
    RefreshCw,
    Bell,
    TrendingUp,
    Menu,
    X,
    Plus,
    Tag
} from 'lucide-react'
import { useGlobal } from '../contexts/GlobalContext'

interface SidebarProps {
    collapsed: boolean
    setCollapsed: (collapsed: boolean) => void
}

const Sidebar: React.FC<SidebarProps> = ({ collapsed, setCollapsed }) => {
    const { setShowIpoModal, setShowAddSectorModal } = useGlobal()

    const navItems = [
        { name: 'Dashboard', path: '/', icon: <LayoutDashboard size={20} /> },
        { name: 'Automated IPOs', path: '/scrap-ipo-auto', icon: <RefreshCw size={20} /> },
        { name: 'Profit & Loss', path: '/profited-losted', icon: <TrendingUp size={20} /> },
        { name: 'Alert Rules', path: '/alerts', icon: <Bell size={20} /> },
    ]

    return (
        <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
            <div className="sidebar-header">
                {!collapsed && <span className="navbar-brand">IPO Tracker</span>}
                <button
                    className="sidebar-toggle"
                    onClick={() => setCollapsed(!collapsed)}
                    title={collapsed ? "Expand" : "Collapse"}
                >
                    {collapsed ? <Menu size={20} /> : <X size={20} />}
                </button>
            </div>

            <nav className="sidebar-nav">
                <div className="nav-group">
                    {navItems.map((item) => (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                        >
                            {item.icon}
                            <span className="nav-label">{item.name}</span>
                        </NavLink>
                    ))}
                </div>

                <div className="sidebar-divider" />

                <div className="nav-group">
                    <button className="nav-item action-item" onClick={() => setShowAddSectorModal(true)} title="Add Sector">
                        <Tag size={20} />
                        <span className="nav-label">Add Sector</span>
                    </button>
                    <button className="nav-item action-item" onClick={() => setShowIpoModal(true)} title="Add IPO">
                        <Plus size={20} />
                        <span className="nav-label">Add IPO</span>
                    </button>
                </div>
            </nav>
        </aside>
    )
}

export default Sidebar
