import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import AppointmentModal from './AppointmentModal';
import './Dashboard.css';

function UserDashboard() {
  const { currentUser, logout } = useAuth();
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [userName, setUserName] = useState('');
  const [showProfile, setShowProfile] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
      setIsDarkMode(true);
      document.body.classList.add('dark-mode');
    }
    
    // Fetch user name
    const fetchUserName = async () => {
      if (currentUser) {
        try {
          const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
          if (userDoc.exists()) {
            setUserName(userDoc.data().name);
          }
        } catch (error) {
          console.error('Error fetching user name:', error);
        }
      }
    };
    
    fetchUserName();
  }, [currentUser]);

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
    if (!isDarkMode) {
      document.body.classList.add('dark-mode');
      localStorage.setItem('theme', 'dark');
    } else {
      document.body.classList.remove('dark-mode');
      localStorage.setItem('theme', 'light');
    }
  };

  const handleLogout = async () => {
    setError('');
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
      setError('Failed to log out');
    }
  };

  const handleAppointmentSuccess = () => {
    setSuccess('Appointment created successfully!');
    setTimeout(() => setSuccess(''), 5000);
  };

  return (
    <div className="dashboard-container">
      <div className="dashboard-wrapper">
        <aside className={`dashboard-sidebar ${isSidebarOpen ? 'open' : 'closed'}`}>
          <button 
            className="sidebar-toggle"
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            title={isSidebarOpen ? 'Close sidebar' : 'Open sidebar'}
          >
            {isSidebarOpen ? '◀' : '▶'}
          </button>
          
          {isSidebarOpen && (
            <div className="sidebar-content">
              <div className="sidebar-header">
                <h3>Menu</h3>
              </div>
              
              <nav className="sidebar-nav">
                <button 
                  className="sidebar-btn primary"
                  onClick={() => setIsModalOpen(true)}
                >
                  <span className="btn-icon">➕</span>
                  <span>Add Appointment</span>
                </button>
                
                <button className="sidebar-btn">
                  <span className="btn-icon">📅</span>
                  <span>My Appointments</span>
                </button>
                
                <button className="sidebar-btn">
                  <span className="btn-icon">📊</span>
                  <span>Analytics</span>
                </button>
                
                <button className="sidebar-btn">
                  <span className="btn-icon">👤</span>
                  <span>Profile</span>
                </button>
                
                <button className="sidebar-btn">
                  <span className="btn-icon">⚙️</span>
                  <span>Settings</span>
                </button>
              </nav>
              
              <div className="sidebar-footer">
                <button 
                  onClick={toggleTheme} 
                  className="sidebar-btn theme-btn" 
                  title="Toggle Theme"
                >
                  <span className="btn-icon">{isDarkMode ? '☀️' : '🌙'}</span>
                  <span>{isDarkMode ? 'Light Mode' : 'Dark Mode'}</span>
                </button>
                
                <button 
                  onClick={() => setShowProfile(!showProfile)} 
                  className="sidebar-btn profile-btn"
                  title="Profile"
                >
                  <span className="btn-icon">👤</span>
                  <span>{userName || 'User'}</span>
                </button>
                
                {showProfile && (
                  <div className="sidebar-profile-dropdown">
                    <div className="profile-dropdown-header">
                      <h3>User Profile</h3>
                      <button 
                        onClick={() => setShowProfile(false)} 
                        className="btn-close-profile"
                      >
                        ✕
                      </button>
                    </div>
                    <div className="profile-dropdown-content">
                      <div className="detail-row">
                        <span className="detail-label">Name:</span>
                        <span className="detail-value">{userName || 'User'}</span>
                      </div>
                      <div className="detail-row">
                        <span className="detail-label">Email:</span>
                        <span className="detail-value">{currentUser?.email}</span>
                      </div>
                      <div className="detail-row">
                        <span className="detail-label">User ID:</span>
                        <span className="detail-value" style={{fontSize: '12px'}}>{currentUser?.uid}</span>
                      </div>
                      <div className="detail-row">
                        <span className="detail-label">Status:</span>
                        <span className="status-badge">Active</span>
                      </div>
                    </div>
                    <div className="profile-dropdown-footer">
                      <button onClick={handleLogout} className="btn-logout-profile">
                        Logout
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </aside>

        <div className={`dashboard-content ${isSidebarOpen ? 'with-sidebar' : 'full-width'}`}>
        {error && <div className="error-banner">{error}</div>}
        {success && <div className="success-banner">{success}</div>}
        
        <div className="welcome-section">
          <h1>Welcome, {userName || 'User'}!</h1>
          <p>You're successfully logged in!</p>
        </div>

        <div className="cards-grid">
          <div className="info-card">
            <div className="card-icon">📊</div>
            <h3>Analytics</h3>
            <p>View your data and insights</p>
          </div>

          <div className="info-card">
            <div className="card-icon">👤</div>
            <h3>Profile</h3>
            <p>Manage your account settings</p>
          </div>

          <div className="info-card">
            <div className="card-icon">⚙️</div>
            <h3>Settings</h3>
            <p>Configure your preferences</p>
          </div>

          <div className="info-card">
            <div className="card-icon">📝</div>
            <h3>Documents</h3>
            <p>Access your files and documents</p>
          </div>
        </div>

      <AppointmentModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        userId={currentUser?.uid}
        onSuccess={handleAppointmentSuccess}
      />
        </div>
      </div>
    </div>
  );
}

export default UserDashboard;
