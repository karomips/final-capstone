import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './AdminPages.css';

function InstructorsProfile() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  // Sample instructor data
  const instructors = [
    { id: 1, name: 'Instructor Name', cert: 'Manual Transmission', availability: 'on-leave' },
    { id: 2, name: 'Instructor Name', cert: 'Manual Transmission', availability: 'available' },
    { id: 3, name: 'Instructor Name', cert: 'Manual Transmission', availability: 'booked' },
    { id: 4, name: 'Instructor Name', cert: 'Manual Transmission', availability: 'available' },
    { id: 5, name: 'Instructor Name', cert: 'Manual Transmission', availability: 'available' },
    { id: 6, name: 'Instructor Name', cert: 'Manual Transmission', availability: 'booked' },
  ];

  return (
    <div className="admin-page-container">
      {/* Sidebar */}
      <div className="admin-sidebar">
        <div className="admin-logo-section">
          <div className="admin-logo">
            <img src="/api/placeholder/80/80" alt="Logo" />
          </div>
        </div>

        <div className="admin-nav-buttons">
          <button 
            className="admin-nav-btn"
            onClick={() => navigate('/admin')}
          >
            Dashboard
          </button>
          <button 
            className="admin-nav-btn"
            onClick={() => navigate('/admin/students')}
          >
            Student Management
          </button>
          <button 
            className="admin-nav-btn active"
            onClick={() => navigate('/admin/instructors')}
          >
            Instructors' Profile
          </button>
          <button 
            className="admin-nav-btn"
            onClick={() => navigate('/admin/vehicles')}
          >
            Vehicle Inventory
          </button>
        </div>

        <button className="admin-signout-btn" onClick={handleLogout}>
          Sign out
        </button>
      </div>

      {/* Main Content */}
      <div className="admin-main-content">
        <h1 className="admin-page-title">Instructors' Profile - Admin Side</h1>

        <div className="instructors-grid">
          {instructors.map((instructor) => (
            <div key={instructor.id} className="instructor-card">
              <div className="instructor-avatar">👤</div>
              <div className="instructor-info">
                <h3>{instructor.name}</h3>
                <div className="instructor-cert">
                  Certifications:<br />
                  {instructor.cert}
                </div>
                <div>
                  Availability: <span className={`availability-badge ${instructor.availability}`}>
                    {instructor.availability === 'on-leave' ? 'On Leave' : 
                     instructor.availability === 'available' ? 'Available' : 'Booked'}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="pagination">
          <button>◄</button>
          <button className="active">1</button>
          <button>►</button>
        </div>
      </div>
    </div>
  );
}

export default InstructorsProfile;
