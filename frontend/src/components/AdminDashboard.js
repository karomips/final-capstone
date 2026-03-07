import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { databases, databaseId, bookingsCollectionId } from '../appwrite/config';
import './AdminPages.css';

function AdminDashboard() {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    try {
      const response = await databases.listDocuments(
        databaseId,
        bookingsCollectionId
      );
      setBookings(response.documents);
    } catch (error) {
      console.error('Error fetching bookings:', error);
    } finally {
      setLoading(false);
    }
  };

  // Get today's bookings count
  const getTodayBookings = () => {
    // Get local date in YYYY-MM-DD format
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const localToday = `${year}-${month}-${day}`;
    
    return bookings.filter(booking => booking.date === localToday);
  };

  const todayBookings = getTodayBookings();

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

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
            className="admin-nav-btn active"
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
            className="admin-nav-btn"
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
        <h1 className="admin-page-title">Dashboard - Admin Side</h1>

        {/* Stats Cards */}
        <div className="dashboard-stats">
          <div className="stat-card">
            <div className="stat-icon">📅</div>
            <div className="stat-content">
              <h3>Today's Lessons</h3>
              <div className="stat-number">{todayBookings.length} Scheduled</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">🔍</div>
            <div className="stat-content">
              <h3>Available Instructors</h3>
              <div className="stat-number">7 Active</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">👥</div>
            <div className="stat-content">
              <h3>New Enrollees (Week)</h3>
              <div className="stat-number">8</div>
            </div>
          </div>
        </div>

        {/* Schedule and SMS Activity */}
        <div className="dashboard-bottom">
          <div className="schedule-section">
            <h2 className="section-title">TODAY'S SCHEDULE ({new Date().toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }).replace(/\//g, '/')})</h2>
            <div className="table-wrapper">
              <table className="schedule-table">
                <thead>
                  <tr>
                    <th>Time</th>
                    <th>Student Name</th>
                    <th>Instructor</th>
                    <th>Vehicle</th>
                    <th>Status</th>
                  </tr>
                </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="5" className="table-empty">
                      Loading bookings...
                    </td>
                  </tr>
                ) : todayBookings.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="table-empty">
                      No bookings for today
                    </td>
                  </tr>
                ) : (
                  todayBookings.map((booking) => (
                    <tr key={booking.$id}>
                      <td className="time-cell">{booking.time}</td>
                      <td className="name-cell">{booking.userName}</td>
                      <td>{booking.instructor}</td>
                      <td>{booking.vehicle}</td>
                      <td>
                        <span className={`status-badge-table ${booking.status.toLowerCase()}`}>
                          {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            </div>
          </div>

          <div className="sms-section">
            <h2 className="section-title">RECENT SMS ACTIVITY</h2>
            <div className="sms-content">
              {/* SMS activity will be displayed here */}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AdminDashboard;
