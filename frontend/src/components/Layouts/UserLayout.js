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
  const [theme, setTheme] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('userTheme');
      if (saved === 'dark' || saved === 'light') return saved;
      return 'light';
    }
    return 'light';
  });

  const handleLogout = async () => {
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
    localStorage.setItem('userTheme', theme);
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
    </div>
  );
}

export default UserLayout;
