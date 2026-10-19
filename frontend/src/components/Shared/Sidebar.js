import React, { useEffect, useRef, useState } from 'react';
import {
  Bell, BookOpen, CalendarDays, CalendarOff, CarFront, ChevronRight, Clock3,
  Coffee, Ellipsis, GraduationCap, LayoutDashboard, LogOut, MessageSquare,
  Moon, PanelLeftClose, PanelLeftOpen, Settings, Sun, UserRound, Users, X
} from 'lucide-react';
import './Sidebar.css';

const navigationIcons = {
  dashboard: LayoutDashboard,
  students: Users,
  instructors: GraduationCap,
  vehicles: CarFront,
  sms: MessageSquare,
  'book-lesson': BookOpen,
  sessions: CalendarDays,
  profile: UserRound,
  schedule: CalendarDays,
  hours: Clock3,
  breaks: Coffee,
  leaves: CalendarOff,
  notifications: Bell,
  settings: Settings
};

const mobileLabels = {
  dashboard: 'Home',
  'book-lesson': 'Book lesson',
  sessions: 'Sessions',
  profile: 'Profile',
  schedule: 'Schedule',
  hours: 'Hours'
};

const workspaceLabels = {
  admin: 'Administration',
  instructor: 'Instructor portal',
  user: 'Student portal'
};

function NavigationIcon({ item }) {
  const Icon = navigationIcons[item.id];
  if (Icon) return <Icon size={20} strokeWidth={1.8} aria-hidden="true" />;
  if (typeof item.icon === 'string' && /[./]/.test(item.icon)) {
    return <img src={item.icon} alt="" className="app-nav-icon-img" />;
  }
  return <span aria-hidden="true">{item.icon}</span>;
}

function AccountSummary({ currentUser, userType }) {
  const name = currentUser?.name || currentUser?.displayName || currentUser?.email?.split('@')[0] || 'My account';
  const initials = name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase();

  return (
    <div className="app-account-summary">
      <span className="app-account-avatar" aria-hidden="true">{initials}</span>
      <span className="app-account-copy">
        <strong>{name}</strong>
        <span>{workspaceLabels[userType] || 'My workspace'}</span>
      </span>
    </div>
  );
}

function ThemeButton({ theme, onThemeToggle }) {
  const Icon = theme === 'dark' ? Moon : Sun;

  return (
    <button
      type="button"
      className={`app-theme-toggle-btn ${theme === 'dark' ? 'toggled' : ''}`}
      onClick={onThemeToggle}
      title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      aria-pressed={theme === 'dark'}
    >
      <Icon className="app-control-icon" size={19} strokeWidth={1.8} aria-hidden="true" />
      <span className="app-control-text">{theme === 'dark' ? 'Dark mode' : 'Light mode'}</span>
      <span className="theme-toggle-track" aria-hidden="true">
        <span className="theme-toggle-knob" />
      </span>
    </button>
  );
}

function SignOutButton({ onLogout }) {
  return (
    <button type="button" className="app-signout-btn" onClick={onLogout} title="Sign out">
      <LogOut className="app-control-icon" size={19} strokeWidth={1.8} aria-hidden="true" />
      <span className="app-control-text">Sign out</span>
    </button>
  );
}

function MobileNavigation({ navItems, currentUser, userType, theme, onThemeToggle, onLogout }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const moreButtonRef = useRef(null);
  const primaryItems = navItems.slice(0, 4);
  const moreItems = navItems.slice(4);
  const moreActive = moreItems.some((item) => item.active);

  useEffect(() => {
    if (!menuOpen) return undefined;
    const previousOverflow = document.body.style.overflow;
    const moreButton = moreButtonRef.current;
    document.body.style.overflow = 'hidden';
    menuRef.current?.querySelector('button')?.focus();

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setMenuOpen(false);
      }
      if (event.key === 'Tab') {
        const buttons = menuRef.current?.querySelectorAll('button:not([disabled])');
        if (!buttons?.length) return;
        const first = buttons[0];
        const last = buttons[buttons.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    const handleResize = () => {
      if (window.innerWidth > 768) setMenuOpen(false);
    };
    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('resize', handleResize);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('resize', handleResize);
      if (moreButton?.isConnected) moreButton.focus();
    };
  }, [menuOpen]);

  const navigateToItem = (item) => {
    setMenuOpen(false);
    item.onClick();
  };

  return (
    <div className="app-mobile-navigation">
      <nav className="app-bottom-nav" aria-label="Mobile navigation">
        {primaryItems.map((item) => (
          <button
            type="button"
            key={item.id}
            className={`app-bottom-nav-btn ${item.active ? 'active' : ''}`}
            onClick={() => navigateToItem(item)}
            aria-label={item.label}
            aria-current={item.active ? 'page' : undefined}
            title={item.label}
          >
            <span className="app-bottom-nav-icon"><NavigationIcon item={item} /></span>
            <span>{mobileLabels[item.id] || item.label}</span>
          </button>
        ))}
        <button
          type="button"
          ref={moreButtonRef}
          className={`app-bottom-nav-btn app-bottom-more-btn ${moreActive || menuOpen ? 'active' : ''}`}
          onClick={() => setMenuOpen((open) => !open)}
          aria-label="More navigation and account options"
          aria-expanded={menuOpen}
          aria-controls="app-mobile-more-menu"
          aria-haspopup="dialog"
        >
          <span className="app-bottom-nav-icon"><Ellipsis size={21} strokeWidth={1.8} aria-hidden="true" /></span>
          <span>More</span>
        </button>
      </nav>

      {menuOpen && (
        <div className="app-mobile-menu-overlay">
          <button type="button" className="app-mobile-menu-backdrop" tabIndex={-1} onClick={() => setMenuOpen(false)} aria-label="Close navigation menu" />
          <section
            className="app-mobile-more-menu"
            id="app-mobile-more-menu"
            ref={menuRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="app-mobile-more-title"
          >
            <div className="app-mobile-more-header">
              <div>
                <span className="app-nav-eyebrow">EasyDrive</span>
                <h2 id="app-mobile-more-title">Your workspace</h2>
              </div>
              <button type="button" className="app-mobile-more-close" aria-label="Close more menu" onClick={() => setMenuOpen(false)}>
                <X size={20} aria-hidden="true" />
              </button>
            </div>
            <AccountSummary currentUser={currentUser} userType={userType} />
            {moreItems.length > 0 && (
              <nav className="app-mobile-more-links" aria-label="More pages">
                {moreItems.map((item) => (
                  <button type="button" key={item.id} className={`app-nav-btn ${item.active ? 'active' : ''}`} onClick={() => navigateToItem(item)} aria-current={item.active ? 'page' : undefined} title={item.label}>
                    <span className="app-nav-icon"><NavigationIcon item={item} /></span>
                    <span className="app-nav-text">{item.label}</span>
                    <ChevronRight className="app-nav-chevron" size={16} aria-hidden="true" />
                  </button>
                ))}
              </nav>
            )}
            <div className="app-mobile-more-actions">
              {onThemeToggle && <ThemeButton theme={theme} onThemeToggle={onThemeToggle} />}
              <SignOutButton onLogout={() => { setMenuOpen(false); onLogout(); }} />
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

function Sidebar({ isOpen, logo, navItems, currentUser, onLogout, theme, onThemeToggle, userType = 'user' }) {
  const [isCollapsed, setIsCollapsed] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(`sidebarCollapsed-${userType}`) === 'true';
    }
    return false;
  });

  useEffect(() => {
    localStorage.setItem(`sidebarCollapsed-${userType}`, JSON.stringify(isCollapsed));
  }, [isCollapsed, userType]);

  return (
    <>
      <aside className="app-sidebar-wrapper" aria-label="Workspace sidebar">
        <div className={`app-sidebar app-sidebar-${userType} ${isOpen ? '' : 'closed'} ${isCollapsed ? 'collapsed' : ''}`}>
          <header className="app-sidebar-header">
            <div className="app-brand">
              <span className="app-brand-mark"><img src={logo} alt="" /></span>
              <span className="app-brand-copy">
                <strong>EasyDrive</strong>
                <span>{workspaceLabels[userType] || 'My workspace'}</span>
              </span>
            </div>
            <button type="button" className={`app-hamburger-btn ${isCollapsed ? 'collapsed' : ''}`} onClick={() => setIsCollapsed((collapsed) => !collapsed)} aria-label="Toggle sidebar" aria-expanded={!isCollapsed} title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
              {isCollapsed ? <PanelLeftOpen size={19} aria-hidden="true" /> : <PanelLeftClose size={19} aria-hidden="true" />}
            </button>
          </header>

          <span className="app-sidebar-section-label">Workspace</span>
          <nav className="app-sidebar-nav" aria-label="Main navigation">
            {navItems.map((item) => (
              <button type="button" key={item.id} className={`app-nav-btn ${item.active ? 'active' : ''}`} onClick={item.onClick} title={item.label} aria-current={item.active ? 'page' : undefined}>
                <span className="app-nav-icon"><NavigationIcon item={item} /></span>
                <span className="app-nav-text">{item.label}</span>
                {item.active && <ChevronRight className="app-nav-chevron" size={15} aria-hidden="true" />}
              </button>
            ))}
          </nav>

          <div className="app-sidebar-footer">
            <AccountSummary currentUser={currentUser} userType={userType} />
            {onThemeToggle && <ThemeButton theme={theme} onThemeToggle={onThemeToggle} />}
            <SignOutButton onLogout={onLogout} />
          </div>
        </div>
      </aside>
      <MobileNavigation navItems={navItems} currentUser={currentUser} userType={userType} theme={theme} onThemeToggle={onThemeToggle} onLogout={onLogout} />
    </>
  );
}

export default Sidebar;
