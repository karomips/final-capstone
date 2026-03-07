import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { databases, databaseId, bookingsCollectionId } from '../appwrite/config';
import { Query } from 'appwrite';
import './UserPages.css';

function UserDashboard() {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const [userName, setUserName] = useState('');
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserData = async () => {
      if (currentUser) {
        try {
          // Set user name from currentUser
          setUserName(currentUser.name || currentUser.email);

          // Fetch user's bookings
          console.log('Fetching bookings for user:', currentUser.$id);
          const response = await databases.listDocuments(
            databaseId,
            bookingsCollectionId,
            [
              Query.equal('userId', currentUser.$id),
              Query.orderAsc('date')
            ]
          );
          console.log('Bookings response:', response.documents);
          setBookings(response.documents);
        } catch (error) {
          console.error('Error fetching user data:', error);
        } finally {
          setLoading(false);
        }
      }
    };
    
    fetchUserData();
  }, [currentUser]);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <div className="user-page-container">
      {/* Sidebar */}
      <div className="user-sidebar">
        <div className="user-profile-section">
          <div className="user-profile-avatar">
            <img src="/api/placeholder/80/80" alt="Profile" />
          </div>
        </div>

        <div className="user-nav-buttons">
          <button 
            className="user-nav-btn active"
            onClick={() => navigate('/user-dashboard')}
          >
            Dashboard
          </button>
          <button 
            className="user-nav-btn"
            onClick={() => navigate('/book-lesson')}
          >
            Book a Lesson
          </button>
        </div>

        <button className="user-signout-btn" onClick={handleLogout}>
          Sign Out
        </button>
      </div>

      {/* Main Content */}
      <div className="user-main-content">
        <h1 className="page-title">Dashboard - User Side</h1>

        <div className="dashboard-grid">
          {/* Next Lesson Card */}
          <div className="dashboard-card next-lesson-card">
            <div className="card-header">
              <h2>Next Lesson</h2>
              <div className="clock-icon">🕐</div>
            </div>
            <div className="next-lesson-info">
              {loading ? (
                <div>Loading...</div>
              ) : bookings.length > 0 ? (
                <>
                  <div className="lesson-date">
                    {new Date(bookings[0].date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toUpperCase()} | {bookings[0].time}
                  </div>
                  <div className="lesson-instructor">Instructor: {bookings[0].instructor}</div>
                  <div className="lesson-vehicle">Vehicle: {bookings[0].vehicle}</div>
                </>
              ) : (
                <div className="lesson-date">No upcoming lessons</div>
              )}
            </div>
          </div>

          {/* Course Progress Card */}
          <div className="dashboard-card course-progress-card">
            <h2>Course Progress</h2>
            <div className="progress-placeholder">
              {/* Progress visualization can be added here */}
            </div>
          </div>

          {/* Recent Notifications Card */}
          <div className="dashboard-card notifications-card">
            <h2>RECENT NOTIFICATIONS</h2>
            <div className="notifications-content">
              {/* Notification items will go here */}
            </div>
          </div>

          {/* Upcoming Schedules Card */}
          <div className="dashboard-card schedules-card">
            <h2>Upcoming Schedules</h2>
            <div className="schedule-list">
              {loading ? (
                <div>Loading...</div>
              ) : bookings.length > 0 ? (
                bookings.map((booking) => (
                  <div key={booking.$id} className="schedule-item">
                    <div className="schedule-info">
                      <span className="schedule-date">
                        [{new Date(booking.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toUpperCase()} | {booking.time}]
                      </span>
                      <span className="schedule-type">{booking.lessonType === 'practical' ? 'Practical Lesson' : 'Theory Class'}</span>
                    </div>
                    <span className={`schedule-status ${booking.status.toLowerCase()}`}>
                      {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                    </span>
                  </div>
                ))
              ) : (
                <div>No upcoming schedules</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default UserDashboard;
