import React, { useState } from 'react';
import useTheme from '../../hooks/useTheme';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { ChevronRight, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import Sidebar from '../Shared/Sidebar';
import '../Admin/AdminPages.css';
import EasyDriveLogo from '../../assets/EasyDriveLogo.png';
import DashboardIcon from '../../assets/icons/dashboard-white.png';
import StudentsIcon from '../../assets/icons/students-white.png';
import InstructorIcon from '../../assets/icons/instructor-white.png';
import VehicleIcon from '../../assets/icons/vehicle-white.png';
import SMSIcon from '../../assets/icons/sms-icon.png';
import '../Admin/AdminWorkspace.css';
import SignOutDialog from '../Shared/SignOutDialog';

function AdminLayout() {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const pageLabel = {
    '/admin': 'Overview',
    '/admin/students': 'Students',
    '/admin/instructors': 'Instructors',
    '/admin/vehicles': 'Vehicles',
    '/admin/sms-monitoring': 'SMS monitoring'
  }[location.pathname] || 'Overview';
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showSignOutModal, setShowSignOutModal] = useState(false);
  const { theme, setTheme, toggleTheme } = useTheme('adminTheme');

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
        <div className="admin-workspace-bar">
          <div className="admin-breadcrumb" aria-label="Current page">
            <span>Administration</span>
            <ChevronRight size={14} aria-hidden="true" />
            <strong>{pageLabel}</strong>
          </div>
          <span className="admin-workspace-label"><ShieldCheck size={16} aria-hidden="true" /> Admin workspace</span>
        </div>
        <Outlet context={{ theme, setTheme }} />
      </div>

      {showSignOutModal && <SignOutDialog onClose={() => setShowSignOutModal(false)} onConfirm={confirmSignOut} />}
    </div>
  );
}

export default AdminLayout;
