import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import Sidebar from '../Shared/Sidebar';
import '../User/UserPages.css';
import EasyDriveLogo from '../../assets/EasyDriveLogo.png';
import DashboardIcon from '../../assets/icons/dashboard-white.png';
import BookIcon from '../../assets/icons/book-white.png';
import ProfileIcon from '../../assets/icons/profile-white.png';

function UserLayout() {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showSignOutModal, setShowSignOutModal] = useState(false);
  const [theme, setTheme] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('userTheme');
      if (saved === 'dark' || saved === 'light') return saved;
      return 'light';
    }
    return 'light';
  });

  const handleLogout = async () => {
    setShowSignOutModal(true);
  };

  const confirmSignOut = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const toggleTheme = () => {
    setTheme((prevTheme) => {
      const newTheme = prevTheme === 'dark' ? 'light' : 'dark';
      localStorage.setItem('userTheme', newTheme);
      return newTheme;
    });
  };

  useEffect(() => {
    const body = document.body;
    if (theme === 'dark') {
      body.classList.add('dark-mode');
    } else {
      body.classList.remove('dark-mode');
    }
    body.classList.add('theme-transition');
    const timeoutId = window.setTimeout(() => {
      body.classList.remove('theme-transition');
    }, 350);
    localStorage.setItem('userTheme', theme);
    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [theme]);

  return (
    <div className="user-page-container">
      <Sidebar
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
        logo={EasyDriveLogo}
        navItems={[
          {
            id: 'dashboard',
            label: 'Dashboard',
            icon: DashboardIcon,
            active: window.location.pathname === '/user-dashboard',
            onClick: () => navigate('/user-dashboard')
          },
          {
            id: 'book-lesson',
            label: 'Book a Lesson',
            icon: BookIcon,
            active: window.location.pathname === '/book-lesson',
            onClick: () => navigate('/book-lesson')
          },
          {
            id: 'profile',
            label: 'My Profile',
            icon: ProfileIcon,
            active: window.location.pathname === '/profile',
            onClick: () => navigate('/profile')
          }
        ]}
        currentUser={currentUser}
        onLogout={handleLogout}
        theme={theme}
        onThemeToggle={toggleTheme}
        userType="user"
      />

      {/* Content wrapper that responds to sidebar state */}
      <div className="user-content-wrapper" data-sidebar-state={sidebarOpen ? 'open' : 'closed'}>
        <Outlet context={{ theme, setTheme }} />
      </div>

      {/* Sign Out Confirmation Modal */}
      {showSignOutModal && (
        <div className="modal-overlay" onClick={() => setShowSignOutModal(false)} style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999
        }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{
            background: 'white',
            borderRadius: '12px',
            padding: '0',
            maxWidth: '400px',
            width: '90%',
            boxShadow: '0 20px 25px rgba(0,0,0,0.15)'
          }}>
            <div className="modal-header" style={{
              borderBottom: '1px solid #e5e7eb',
              padding: '20px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <h2 style={{margin: 0, fontSize: '18px', fontWeight: 'bold'}}>Sign Out</h2>
              <button 
                className="modal-close" 
                onClick={() => setShowSignOutModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '28px',
                  cursor: 'pointer',
                  padding: '0',
                  width: '30px',
                  height: '30px'
                }}
              >
                ×
              </button>
            </div>
            <div style={{padding: '20px', textAlign: 'center'}}>
              <p style={{marginBottom: '20px', color: '#333'}}>Are you sure you want to sign out of your account?</p>
              <div style={{display: 'flex', gap: '10px', justifyContent: 'center'}}>
                <button
                  onClick={() => setShowSignOutModal(false)}
                  style={{
                    background: '#e5e7eb',
                    color: '#333',
                    border: 'none',
                    padding: '10px 20px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontWeight: '600'
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={confirmSignOut}
                  style={{
                    background: '#dc2626',
                    color: 'white',
                    border: 'none',
                    padding: '10px 20px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontWeight: '600'
                  }}
                >
                  Sign Out
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default UserLayout;
