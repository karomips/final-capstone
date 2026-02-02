import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './Dashboard.css';

function Dashboard() {
  const { currentUser, logout } = useAuth();
  const [error, setError] = useState('');
  const navigate = useNavigate();

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
          <h2>My App</h2>
        </div>
        <div className="nav-user">
          <span className="user-email">{currentUser?.email}</span>
          <button onClick={handleLogout} className="btn-logout">
            Logout
          </button>
        </div>
      </nav>

      <div className="dashboard-content">
        {error && <div className="error-banner">{error}</div>}
        <div className="welcome-section">
          <h1>Welcome to Your Dashboard</h1>
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

        <div className="user-info-section">
          <h2>User Information</h2>
          <div className="user-details">
            <div className="detail-row">
              <span className="detail-label">Email:</span>
              <span className="detail-value">{currentUser?.email}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">User ID:</span>
              <span className="detail-value">{currentUser?.uid}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Status:</span>
              <span className="status-badge">Active</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
