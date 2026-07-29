import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { databases, databaseId, usersCollectionId } from '../../appwrite/config';
import Sidebar from '../Shared/Sidebar';
import '../Admin/AdminPages.css';
import EasyDriveLogo from '../../assets/EasyDriveLogo.png';
import DashboardIcon from '../../assets/icons/dashboard-white.png';
import StudentsIcon from '../../assets/icons/students-white.png';
import InstructorIcon from '../../assets/icons/instructor-white.png';
import VehicleIcon from '../../assets/icons/vehicle-white.png';
import SMSIcon from '../../assets/icons/sms-icon.png';

function AdminLayout() {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showSignOutModal, setShowSignOutModal] = useState(false);
  const [theme, setTheme] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('adminTheme');
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
      localStorage.setItem('adminTheme', newTheme);
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
    localStorage.setItem('adminTheme', theme);
  }, [theme]);

  return (
    <div className="admin-page-container">
      <Sidebar
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
        logo={EasyDriveLogo}
        navItems={[
          {
            id: 'dashboard',
            label: 'Dashboard',
            icon: DashboardIcon,
            active: window.location.pathname === '/admin',
            onClick: () => navigate('/admin')
          },
          {
            id: 'students',
            label: 'Students',
            icon: StudentsIcon,
            active: window.location.pathname === '/admin/students',
            onClick: () => navigate('/admin/students')
          },
          {
            id: 'instructors',
            label: 'Instructors',
            icon: InstructorIcon,
            active: window.location.pathname === '/admin/instructors',
            onClick: () => navigate('/admin/instructors')
          },
          {
            id: 'vehicles',
            label: 'Vehicles',
            icon: VehicleIcon,
            active: window.location.pathname === '/admin/vehicles',
            onClick: () => navigate('/admin/vehicles')
          },
          {
            id: 'sms',
            label: 'SMS Monitoring',
            icon: SMSIcon,
            active: window.location.pathname === '/admin/sms-monitoring',
            onClick: () => navigate('/admin/sms-monitoring')
          }
        ]}
        currentUser={currentUser}
        onLogout={handleLogout}
        theme={theme}
        onThemeToggle={toggleTheme}
        userType="admin"
      />

      {/* Content wrapper that responds to sidebar state */}
      <div className="admin-content-wrapper" data-sidebar-state={sidebarOpen ? 'open' : 'closed'}>
        <Outlet context={{ theme, setTheme }} />
      </div>

      {/* Sign Out Confirmation Modal */}
      {showSignOutModal && (
        <div className="modal-overlay" onClick={() => setShowSignOutModal(false)}>
          <div className="modal-content admin-signout-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Sign Out</h2>
              <button
                className="modal-close"
                onClick={() => setShowSignOutModal(false)}
                aria-label="Close sign out dialog"
              >
                ×
              </button>
            </div>
            <div className="admin-signout-body">
              <p className="admin-signout-copy">Are you sure you want to sign out of your account?</p>
              <div className="admin-signout-actions">
                <button onClick={() => setShowSignOutModal(false)} className="btn-cancel">
                  Cancel
                </button>
                <button onClick={confirmSignOut} className="btn-submit">
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

export default AdminLayout;
