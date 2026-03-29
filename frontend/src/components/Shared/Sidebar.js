import React, { useState, useEffect } from 'react';
import './Sidebar.css';
import SignoutIcon from '../../assets/icons/signout-white.png';
import SunIcon from '../../assets/icons/sun-white.png';
import MoonIcon from '../../assets/icons/moon-white.png';

function Sidebar({ 
  isOpen, 
  onToggle, 
  logo, 
  navItems, 
  currentUser, 
  onLogout, 
  theme, 
  onThemeToggle,
  userType = 'user' 
}) {
  const [isCollapsed, setIsCollapsed] = useState(() => {
    // Initialize from localStorage
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(`sidebarCollapsed-${userType}`);
      return saved === 'true';
    }
    return false;
  });

  // Persist to localStorage whenever isCollapsed changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(`sidebarCollapsed-${userType}`, JSON.stringify(isCollapsed));
    }
  }, [isCollapsed, userType]);

  const handleToggle = () => {
    setIsCollapsed(!isCollapsed);
  };

  return (
    <div className="app-sidebar-wrapper">
      {/* Hamburger Button */}
      <button 
        className={`app-hamburger-btn ${isCollapsed ? 'collapsed' : ''}`}
        onClick={handleToggle}
        aria-label="Toggle sidebar"
        title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        ☰
      </button>

      {/* Sidebar */}
      <div className={`app-sidebar app-sidebar-${userType} ${isOpen ? '' : 'closed'} ${isCollapsed ? 'collapsed' : ''}`}>
        {/* Logo Section */}
        {!isCollapsed && (
          <div className="app-logo-section">
            <div className="app-logo">
              <img src={logo} alt="Logo" />
            </div>
          </div>
        )}

        {/* Navigation Items */}
        {navItems.map((item) => (
          <button
            key={item.id}
            className={`app-nav-btn ${item.active ? 'active' : ''}`}
            onClick={item.onClick}
            title={item.label}
          >
            {item.icon && (
              <span className="app-nav-icon">
                {typeof item.icon === 'string' && item.icon.includes('.') ||
                typeof item.icon === 'string' && item.icon.includes('/') ? (
                  <img src={item.icon} alt={item.label} className="app-nav-icon-img" />
                ) : (
                  item.icon
                )}
              </span>
            )}
            {!isCollapsed && <span className="app-nav-text">{item.label}</span>}
          </button>
        ))}

        {/* Footer Actions - Theme Toggle & Signout */}
        {(userType === 'user' || userType === 'admin') && (
          <div className="app-sidebar-footer">
            {/* Theme Toggle Button - Only for users */}
            {userType === 'user' && (
              <button 
                className={`app-theme-toggle-btn ${isCollapsed ? 'collapsed' : ''}`}
                onClick={onThemeToggle}
                title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              >
                <span className="app-nav-icon">
                  <img 
                    src={theme === 'dark' ? SunIcon : MoonIcon} 
                    alt={theme === 'dark' ? 'Light mode' : 'Dark mode'} 
                    className="app-nav-icon-img" 
                  />
                </span>
                {!isCollapsed && <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>}
              </button>
            )}

            {/* Signout Button */}
            <button 
              className={`app-signout-btn ${isCollapsed ? 'collapsed' : ''}`}
              onClick={onLogout}
              title="Sign out"
            >
              <span className="app-nav-icon">
                <img src={SignoutIcon} alt="Sign out" className="app-nav-icon-img" />
              </span>
              {!isCollapsed && <span>Sign Out</span>}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default Sidebar;
