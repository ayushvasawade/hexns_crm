'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  Receipt, 
  FileText, 
  CreditCard, 
  Repeat, 
  Users, 
  Layers, 
  PackageCheck, 
  Wallet, 
  BarChart3, 
  Settings, 
  ChevronDown, 
  ChevronRight, 
  Search, 
  Bell, 
  Plus, 
  Menu, 
  X,
  Check
} from 'lucide-react';
import styles from './AppShell.module.css';
import { useCrm } from '../../context/CrmContext';
import { useAuth } from '../../context/AuthContext';
import { LogOut } from 'lucide-react';

interface AppShellProps {
  children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({ children }) => {
  const pathname = usePathname();
  const { searchQuery, setSearchQuery, notifications, markNotificationAsRead } = useCrm();
  const { user, logout } = useAuth();
  const [salesOpen, setSalesOpen] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  if (pathname === '/login') {
    return <>{children}</>;
  }

  const isSalesActive = pathname.startsWith('/quotations') || 
                        pathname.startsWith('/invoices') || 
                        pathname.startsWith('/payments') || 
                        pathname.startsWith('/retainers');

  // Breadcrumb generator
  const getBreadcrumbs = () => {
    if (pathname === '/') return ['Dashboard'];
    const parts = pathname.split('/').filter(Boolean);
    return parts.map(p => p.charAt(0).toUpperCase() + p.slice(1));
  };

  const breadcrumbs = getBreadcrumbs();
  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className={styles.shell}>
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div className={styles.backdrop} onClick={() => setMobileOpen(false)} />
      )}

      {/* Persistent Left Sidebar */}
      <aside className={`${styles.sidebar} ${mobileOpen ? styles.sidebarOpen : ''}`}>
        <div className={styles.brand}>
          <div className={styles.brandLogo}>H</div>
          <div className={styles.brandText}>
            <span className={styles.brandName}>HEXNS MEDIAWORKS</span>
            <span className={styles.brandSub}>Billing & Quotation</span>
          </div>
        </div>

        <nav className={styles.nav}>
          <Link 
            href="/" 
            className={`${styles.navItem} ${pathname === '/' ? styles.navItemActive : ''}`}
            onClick={() => setMobileOpen(false)}
          >
            <div className={styles.navItemLeft}>
              <LayoutDashboard size={18} />
              <span>Dashboard</span>
            </div>
          </Link>

          {/* Sales Group (Collapsible) */}
          <div className={styles.navGroupTitle}>Sales & Revenue</div>
          <div 
            className={`${styles.navItem} ${isSalesActive ? styles.navItemActive : ''}`}
            onClick={() => setSalesOpen(!salesOpen)}
            style={{ cursor: 'pointer' }}
          >
            <div className={styles.navItemLeft}>
              <Receipt size={18} />
              <span>Sales</span>
            </div>
            {salesOpen ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
          </div>

          {salesOpen && (
            <div className={styles.navSubList}>
              <Link 
                href="/quotations" 
                className={`${styles.navSubItem} ${pathname.startsWith('/quotations') ? styles.navSubItemActive : ''}`}
                onClick={() => setMobileOpen(false)}
              >
                Quotations
              </Link>
              <Link 
                href="/invoices" 
                className={`${styles.navSubItem} ${pathname.startsWith('/invoices') ? styles.navSubItemActive : ''}`}
                onClick={() => setMobileOpen(false)}
              >
                Invoices
              </Link>
              <Link 
                href="/payments" 
                className={`${styles.navSubItem} ${pathname.startsWith('/payments') ? styles.navSubItemActive : ''}`}
                onClick={() => setMobileOpen(false)}
              >
                Payments
              </Link>
              <Link 
                href="/retainers" 
                className={`${styles.navSubItem} ${pathname.startsWith('/retainers') ? styles.navSubItemActive : ''}`}
                onClick={() => setMobileOpen(false)}
              >
                Recurring Retainers
              </Link>
            </div>
          )}

          {/* Core Modules */}
          <div className={styles.navGroupTitle}>Management</div>
          
          <Link 
            href="/clients" 
            className={`${styles.navItem} ${pathname.startsWith('/clients') ? styles.navItemActive : ''}`}
            onClick={() => setMobileOpen(false)}
          >
            <div className={styles.navItemLeft}>
              <Users size={18} />
              <span>Clients</span>
            </div>
          </Link>

          <Link 
            href="/services" 
            className={`${styles.navItem} ${pathname.startsWith('/services') ? styles.navItemActive : ''}`}
            onClick={() => setMobileOpen(false)}
          >
            <div className={styles.navItemLeft}>
              <Layers size={18} />
              <span>Service Catalogue</span>
            </div>
          </Link>

          <Link 
            href="/packages" 
            className={`${styles.navItem} ${pathname.startsWith('/packages') ? styles.navItemActive : ''}`}
            onClick={() => setMobileOpen(false)}
          >
            <div className={styles.navItemLeft}>
              <PackageCheck size={18} />
              <span>Packages</span>
            </div>
          </Link>

          <Link 
            href="/expenses" 
            className={`${styles.navItem} ${pathname.startsWith('/expenses') ? styles.navItemActive : ''}`}
            onClick={() => setMobileOpen(false)}
          >
            <div className={styles.navItemLeft}>
              <Wallet size={18} />
              <span>Expenses</span>
            </div>
          </Link>

          <Link 
            href="/reports" 
            className={`${styles.navItem} ${pathname.startsWith('/reports') ? styles.navItemActive : ''}`}
            onClick={() => setMobileOpen(false)}
          >
            <div className={styles.navItemLeft}>
              <BarChart3 size={18} />
              <span>Reports & P&L</span>
            </div>
          </Link>

          <Link 
            href="/settings" 
            className={`${styles.navItem} ${pathname.startsWith('/settings') ? styles.navItemActive : ''}`}
            onClick={() => setMobileOpen(false)}
          >
            <div className={styles.navItemLeft}>
              <Settings size={18} />
              <span>Settings</span>
            </div>
          </Link>
        </nav>

        <div className={styles.sidebarFooter}>
          <span>HEXNS v1.0 (GST Ready)</span>
          <span>MH-27</span>
        </div>
      </aside>

      {/* Main Wrapper */}
      <div className={styles.mainWrapper}>
        {/* Top Header */}
        <header className={styles.header}>
          <div className={styles.headerLeft}>
            <button 
              className={styles.mobileMenuBtn} 
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label="Toggle navigation"
            >
              {mobileOpen ? <X size={20} /> : <Menu size={20} />}
            </button>

            <div className={styles.breadcrumbs}>
              <span>HEXNS</span>
              <ChevronRight size={14} />
              {breadcrumbs.map((crumb, idx) => (
                <React.Fragment key={idx}>
                  <span className={idx === breadcrumbs.length - 1 ? styles.crumbCurrent : ''}>
                    {crumb}
                  </span>
                  {idx < breadcrumbs.length - 1 && <ChevronRight size={14} />}
                </React.Fragment>
              ))}
            </div>
          </div>

          <div className={styles.headerRight}>
            {/* Global Search */}
            <div className={styles.searchBox}>
              <Search size={15} color="var(--text-muted)" />
              <input 
                type="text" 
                placeholder="Search clients, quotes..."
                className={styles.searchInput}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Notifications Popover */}
            <div style={{ position: 'relative' }}>
              <button 
                className={styles.iconBtn}
                onClick={() => setShowNotifications(!showNotifications)}
                aria-label="Notifications"
              >
                <Bell size={16} />
                {unreadCount > 0 && <span className={styles.badgeDot} />}
              </button>

              {showNotifications && (
                <div className={styles.popover}>
                  <div className={styles.popoverHeader}>
                    <span>Notifications ({unreadCount})</span>
                    <button 
                      onClick={() => setShowNotifications(false)}
                      style={{ fontSize: '11px', color: 'var(--text-muted)' }}
                    >
                      Close
                    </button>
                  </div>
                  {notifications.map(n => (
                    <div 
                      key={n.id} 
                      className={styles.notificationItem}
                      onClick={() => markNotificationAsRead(n.id)}
                      style={{ cursor: 'pointer', opacity: n.read ? 0.6 : 1 }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontWeight: n.read ? 400 : 600 }}>{n.title}</span>
                        {n.read && <Check size={12} color="var(--success)" />}
                      </div>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{n.time}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* User Profile */}
            <div className={styles.userMenu}>
              <div className={styles.userAvatar}>
                {user?.fullName ? user.fullName[0].toUpperCase() : (user?.email ? user.email[0].toUpperCase() : 'V')}
              </div>
              <span className={styles.userName} title={user?.email || ''}>
                {user?.fullName || user?.email || 'Vikram M.'}
              </span>
              <button
                type="button"
                onClick={logout}
                title="Sign out of account"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '4px 8px',
                  marginLeft: '4px',
                  borderRadius: '4px',
                  border: '1px solid #E5E7EB',
                  backgroundColor: '#FFFFFF',
                  color: '#4B5563',
                  fontSize: '11px',
                  fontWeight: 500,
                  cursor: 'pointer'
                }}
              >
                <LogOut size={12} />
                <span>Logout</span>
              </button>
            </div>

            {/* Contextual Action Button */}
            <Link href="/quotations/new" className={styles.primaryActionBtn}>
              <Plus size={15} />
              <span>+ New Quotation</span>
            </Link>
          </div>
        </header>

        {/* Content View */}
        <main className={styles.content}>
          {children}
        </main>
      </div>
    </div>
  );
};
