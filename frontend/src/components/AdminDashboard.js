import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import Analytics from './Analytics';
import AppointmentList from './AppointmentList';
import './Dashboard.css';

function AdminDashboard() {
  const { currentUser, logout } = useAuth();
  const [error, setError] = useState('');
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [userName, setUserName] = useState('');
  const [showProfile, setShowProfile] = useState(false);
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

  return (
    <div className="dashboard-container">
      <nav className="dashboard-nav">
        <div className="nav-brand">
          <h2>CareConnect Admin Panel</h2>
          <button onClick={toggleTheme} className="btn-theme-toggle" title="Toggle Theme">
            {isDarkMode ? '☀️' : '🌙'}
          </button>
        </div>
        <div className="nav-user">
          <button 
            onClick={() => setShowProfile(!showProfile)} 
            className="btn-profile"
            title="Profile"
          >
            👑 {userName || 'Admin'}
          </button>
          {showProfile && (
            <div className="profile-dropdown">
              <div className="profile-dropdown-header">
                <h3>Administrator Profile</h3>
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
                  <span className="detail-value">{userName || 'Administrator'}</span>
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
                  <span className="detail-label">Role:</span>
                  <span className="status-badge" style={{backgroundColor: '#dc3545'}}>Administrator</span>
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
      </nav>

      <div className="dashboard-content">
        {error && <div className="error-banner">{error}</div>}
        <div className="welcome-section">
          <h1>Welcome, {userName || 'Administrator'}!</h1>
          <p>You have full access to manage the system.</p>
        </div>

        <Analytics userId={currentUser?.uid} isAdmin={true} />

        <AppointmentList />

        <div className="cards-grid">
          <div className="info-card">
            <div className="card-icon">👥</div>
            <h3>User Management</h3>
            <p>Manage user accounts and permissions</p>
          </div>

          <div className="info-card">
            <div className="card-icon">📊</div>
            <h3>Analytics</h3>
            <p>View system analytics and reports</p>
          </div>

          <div className="info-card">
            <div className="card-icon">⚙️</div>
            <h3>System Settings</h3>
            <p>Configure system preferences</p>
          </div>

          <div className="info-card">
            <div className="card-icon">🔒</div>
            <h3>Security</h3>
            <p>Manage security settings and logs</p>
          </div>

          <div className="info-card">
            <div className="card-icon">📝</div>
            <h3>Content Management</h3>
            <p>Manage content and resources</p>
          </div>

          <div className="info-card">
            <div className="card-icon">💬</div>
            <h3>Messages</h3>
            <p>View and respond to user messages</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AdminDashboard;
