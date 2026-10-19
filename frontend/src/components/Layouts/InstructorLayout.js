import React, { useState } from 'react';
import useTheme from '../../hooks/useTheme';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import Sidebar from '../Shared/Sidebar';
import '../Instructor/InstructorPages.css';
import EasyDriveLogo from '../../assets/EasyDriveLogo.png';
import SignOutDialog from '../Shared/SignOutDialog';

const navigation = [
  { id: 'dashboard', label: 'My Dashboard' },
  { id: 'schedule', label: 'My Schedule' },
  { id: 'hours', label: 'Working Hours' },
  { id: 'breaks', label: 'Breaks' },
  { id: 'leaves', label: 'Leaves' },
  { id: 'notifications', label: 'Slot Alerts' },
  { id: 'settings', label: 'Settings' }
];

function InstructorLayout() {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { theme, setTheme, toggleTheme } = useTheme('instructorTheme');
  const [showSignOutModal, setShowSignOutModal] = useState(false);
  const requestedTab = new URLSearchParams(location.search).get('tab');
  const activeTab = navigation.some((item) => item.id === requestedTab) ? requestedTab : 'dashboard';

  const confirmSignOut = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <div className="instructor-page-container">
      <Sidebar
        isOpen
        logo={EasyDriveLogo}
        navItems={navigation.map((item) => ({
          ...item,
          active: activeTab === item.id,
          onClick: () => navigate(item.id === 'dashboard' ? '/instructor' : `/instructor?tab=${item.id}`)
        }))}
        currentUser={currentUser}
        onLogout={() => setShowSignOutModal(true)}
        theme={theme}
        onThemeToggle={toggleTheme}
        userType="instructor"
      />
      <div className="instructor-content-wrapper"><Outlet context={{ theme, setTheme }} /></div>
      {showSignOutModal && (
        <SignOutDialog onClose={() => setShowSignOutModal(false)} onConfirm={confirmSignOut} />
      )}
    </div>
  );
}

export default InstructorLayout;
