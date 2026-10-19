import React, { useState } from 'react';
import useTheme from '../../hooks/useTheme';
import { Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import Sidebar from '../Shared/Sidebar';
import '../User/UserPages.css';
import EasyDriveLogo from '../../assets/EasyDriveLogo.png';
import DashboardIcon from '../../assets/icons/dashboard-white.png';
import BookIcon from '../../assets/icons/book-white.png';
import ProfileIcon from '../../assets/icons/profile-white.png';
import SignOutDialog from '../Shared/SignOutDialog';

function UserLayout() {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showSignOutModal, setShowSignOutModal] = useState(false);
  const { theme, setTheme, toggleTheme } = useTheme('userTheme');

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
            id: 'sessions',
            label: 'My Sessions',
            active: window.location.pathname === '/my-sessions',
            onClick: () => navigate('/my-sessions')
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

      {showSignOutModal && <SignOutDialog onClose={() => setShowSignOutModal(false)} onConfirm={confirmSignOut} />}
    </div>
  );
}

export default UserLayout;
