import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Calendar, Users, LogOut, ScanLine, Settings, Menu, X } from 'lucide-react';
import './Layout.css';

export default function Layout({ children }) {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const loc = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const handleLogout = () => { logout(); navigate('/login'); };

  const nav = [
    { to: '/events', icon: <Calendar size={18} />, label: '活動管理' },
    ...(isAdmin ? [{ to: '/admin/users', icon: <Users size={18} />, label: '使用者管理' }] : []),
  ];

  const isActive = to => loc.pathname.startsWith(to);

  return (
    <div className="layout">
      {/* Desktop sidebar */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <ScanLine size={24} />
          <span>EventCheck</span>
        </div>
        <nav className="sidebar-nav">
          {nav.map(n => (
            <Link key={n.to} to={n.to} className={`nav-item${isActive(n.to) ? ' active' : ''}`}>
              {n.icon} {n.label}
            </Link>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <Link to="/settings" className="nav-item">
            <Settings size={18} /> 設定
          </Link>
          <button className="nav-item logout-btn" onClick={handleLogout}>
            <LogOut size={18} /> 登出
          </button>
          <div className="user-chip">
            <span className="user-name">{user?.name}</span>
            <span className={`role-badge ${user?.role}`}>{user?.role === 'admin' ? '管理者' : '工作人員'}</span>
          </div>
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="mobile-topbar">
        <div className="mobile-logo">
          <ScanLine size={20} />
          <span>EventCheck</span>
        </div>
        <button className="mobile-menu-btn" onClick={() => setDrawerOpen(true)}>
          <Menu size={22} />
        </button>
      </header>

      {/* Mobile drawer */}
      {drawerOpen && (
        <div className="drawer-overlay" onClick={() => setDrawerOpen(false)}>
          <aside className="drawer" onClick={e => e.stopPropagation()}>
            <div className="drawer-header">
              <div className="sidebar-logo" style={{ border: 'none', padding: '0' }}>
                <ScanLine size={22} /> <span>EventCheck</span>
              </div>
              <button className="mobile-menu-btn" onClick={() => setDrawerOpen(false)}>
                <X size={22} />
              </button>
            </div>
            <nav className="sidebar-nav" style={{ flex: 1 }}>
              {nav.map(n => (
                <Link
                  key={n.to} to={n.to}
                  className={`nav-item${isActive(n.to) ? ' active' : ''}`}
                  onClick={() => setDrawerOpen(false)}
                >
                  {n.icon} {n.label}
                </Link>
              ))}
            </nav>
            <div className="sidebar-bottom">
              <Link to="/settings" className="nav-item" onClick={() => setDrawerOpen(false)}>
                <Settings size={18} /> 設定
              </Link>
              <button className="nav-item logout-btn" onClick={handleLogout}>
                <LogOut size={18} /> 登出
              </button>
              <div className="user-chip">
                <span className="user-name">{user?.name}</span>
                <span className={`role-badge ${user?.role}`}>{user?.role === 'admin' ? '管理者' : '工作人員'}</span>
              </div>
            </div>
          </aside>
        </div>
      )}

      <main className="content">{children}</main>
    </div>
  );
}
