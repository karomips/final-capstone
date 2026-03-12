import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { databases, databaseId, bookingsCollectionId, instructorsCollectionId, vehiclesCollectionId, usersCollectionId } from '../../appwrite/config';
import { Query } from 'appwrite';
import './AdminPages.css';
import EasyDriveLogo from '../../assets/EasyDriveLogo.png';


function AdminDashboard() {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [smsHistory, setSmsHistory] = useState([]);
  const [availableInstructors, setAvailableInstructors] = useState(0);
  const [newEnrollees, setNewEnrollees] = useState(0);
  const [adminName, setAdminName] = useState('Admin');

  // Debug: Log whenever bookings state changes
  useEffect(() => {
    console.log('=== Bookings state updated ===');
    console.log('Bookings count:', bookings.length);
    console.log('Bookings:', bookings);
  }, [bookings]);

  useEffect(() => {
    fetchAdminName();
    fetchBookings();
    loadSMSHistory();
    fetchInstructorCount();
    fetchEnrolleeCount();
    
    // Refresh bookings and SMS history every 30 seconds
    const interval = setInterval(() => {
      fetchBookings();
      loadSMSHistory();
      fetchInstructorCount();
    }, 30000);
    
    return () => clearInterval(interval);
  }, []);

  const fetchAdminName = async () => {
    if (!currentUser) return;
    try {
      const response = await databases.listDocuments(
        databaseId,
        usersCollectionId
      );
      // Find the admin user specifically (role = 'admin' or email = 'admin@gmail.com')
      const admin = response.documents.find(doc => 
        doc.role === 'admin' || doc.email === 'admin@gmail.com'
      );
      if (admin?.name) {
        setAdminName(admin.name);
      }
    } catch (error) {
      console.error('Error fetching admin name:', error);
    }
  };

  const loadSMSHistory = () => {
    try {
      const history = localStorage.getItem('smsHistory');
      if (history) {
        const parsed = JSON.parse(history);
        // Ensure it's an array
        if (Array.isArray(parsed)) {
          setSmsHistory(parsed);
        } else {
          setSmsHistory([]);
        }
      }
    } catch (error) {
      console.error('Error loading SMS history:', error);
      setSmsHistory([]);
    }
  };

  const fetchInstructorCount = async () => {
    try {
      const response = await databases.listDocuments(
        databaseId,
        instructorsCollectionId,
        [Query.equal('availability', 'available')]
      );
      setAvailableInstructors(response.total || response.documents.length);
    } catch (error) {
      console.error('Error fetching instructor count:', error);
      setAvailableInstructors(0);
    }
  };

  const fetchEnrolleeCount = async () => {
    try {
      // Get all users except admins
      const response = await databases.listDocuments(
        databaseId,
        usersCollectionId
      );
      
      // Filter out admin users and count students registered in the last 7 days
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      
      const recentStudents = response.documents.filter(user => {
        // Exclude admins
        if (user.role === 'admin') return false;
        
        // Check if user was created in the last 7 days
        if (user.$createdAt) {
          const createdDate = new Date(user.$createdAt);
          return createdDate >= oneWeekAgo;
        }
        
        return false;
      });
      
      setNewEnrollees(recentStudents.length);
    } catch (error) {
      console.error('Error fetching enrollee count:', error);
      setNewEnrollees(0);
    }
  };

  const fetchBookings = async () => {
    try {
      console.log('Fetching bookings...');
      const response = await databases.listDocuments(
        databaseId,
        bookingsCollectionId
      );
      
      console.log('Fetched bookings count:', response.documents.length);
      
      // Ensure all booking fields are properly formatted
      const formattedBookings = response.documents.map(booking => ({
        ...booking,
        userName: booking.userName || 'Unknown',
        instructor: booking.instructor || 'TBA',
        vehicle: booking.vehicle || 'TBA',
        time: booking.time || 'N/A',
        status: booking.status || 'pending',
        date: booking.date || ''
      }));
      
      console.log('Setting bookings state with', formattedBookings.length, 'bookings');
      setBookings(formattedBookings);
    } catch (error) {
      console.error('Error fetching bookings:', error);
      setBookings([]); // Set empty array on error
    } finally {
      setLoading(false);
    }
  };

  // Recalculate today's bookings whenever the bookings state changes
  const todayBookings = useMemo(() => {
    // Get local date in YYYY-MM-DD format
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const localToday = `${year}-${month}-${day}`;
    
    console.log('Recalculating today\'s bookings...');
    console.log('Today\'s date:', localToday);
    console.log('Total bookings:', bookings.length);
    console.log('All bookings:', bookings.map(b => ({ date: b.date, name: b.userName })));
    
    const filtered = bookings.filter(booking => {
      const bookingDate = String(booking.date || '').trim();
      const match = bookingDate === localToday;
      console.log(`Comparing: "${bookingDate}" with "${localToday}" = ${match}`);
      return match;
    });
    
    console.log('Today\'s bookings found:', filtered.length);
    return filtered;
  }, [bookings]);

  const handleMarkBooking = async (booking, newStatus) => {
    try {
      // Update booking status
      await databases.updateDocument(
        databaseId,
        bookingsCollectionId,
        booking.$id,
        { status: newStatus }
      );

      // Free up the instructor (set availability back to 'available')
      try {
        const instructorQuery = await databases.listDocuments(
          databaseId,
          instructorsCollectionId,
          [Query.equal('name', booking.instructor)]
        );
        
        if (instructorQuery.documents.length > 0) {
          const instructorDoc = instructorQuery.documents[0];
          await databases.updateDocument(
            databaseId,
            instructorsCollectionId,
            instructorDoc.$id,
            { availability: 'available' }
          );
        }
      } catch (error) {
        console.error('Error updating instructor:', error);
      }

      // Free up the vehicle (set status back to 'available') - only for practical lessons
      if (booking.vehicle && booking.vehicle !== 'N/A') {
        try {
          const vehicleModel = booking.vehicle.split(' (')[0];
          const vehicleQuery = await databases.listDocuments(
            databaseId,
            vehiclesCollectionId,
            [Query.equal('model', vehicleModel)]
          );
          
          if (vehicleQuery.documents.length > 0) {
            const vehicleDoc = vehicleQuery.documents[0];
            await databases.updateDocument(
              databaseId,
              vehiclesCollectionId,
              vehicleDoc.$id,
              { status: 'available' }
            );
          }
        } catch (error) {
          console.error('Error updating vehicle:', error);
        }
      }

      // Refresh bookings list
      fetchBookings();
    } catch (error) {
      console.error('Error marking booking:', error);
    }
  };

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
      <button className="hamburger-btn" onClick={() => setSidebarOpen(!sidebarOpen)}>
        ☰
      </button>
      {/* Sidebar */}
      <div className={`admin-sidebar ${sidebarOpen ? '' : 'closed'}`}>
        <div className="admin-logo-section">
          <div className="admin-logo">
            <img src={EasyDriveLogo} alt="Easy Drive Logo" />
          </div>
        </div>

        <div className="admin-nav-buttons">
          <button 
            className="admin-nav-btn active"
            onClick={() => navigate('/admin')}
          >
            <span className="nav-icon">🏠</span>
            Dashboard
          </button>
          <button 
            className="admin-nav-btn"
            onClick={() => navigate('/admin/students')}
          >
            <span className="nav-icon">👥</span>
            Student Management
          </button>
          <button 
            className="admin-nav-btn"
            onClick={() => navigate('/admin/instructors')}
          >
            <span className="nav-icon">👨‍🏫</span>
            Instructors' Profile
          </button>
          <button 
            className="admin-nav-btn"
            onClick={() => navigate('/admin/vehicles')}
          >
            <span className="nav-icon">🚗</span>
            Vehicle Inventory
          </button>
          <button 
            className="admin-nav-btn"
            onClick={() => navigate('/admin/sms-monitoring')}
          >
            <span className="nav-icon">💬</span>
            SMS Monitoring
          </button>
        </div>

        <button className="admin-signout-btn" onClick={handleLogout}>
          Sign out
        </button>
      </div>

      {/* Main Content */}
      <div className="admin-main-content">
        <h1 className="admin-page-title">Welcome, {adminName}</h1>

        {/* Stats Cards */}
        <div className="dashboard-stats">
          <div className="stat-card">
            <div className="stat-icon"></div>
            <div className="stat-content">
              <h3>Today's Lessons</h3>
              <div className="stat-number">{todayBookings.length} Scheduled</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon"></div>
            <div className="stat-content">
              <h3>Available Instructors</h3>
              <div className="stat-number">{availableInstructors} Active</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon"></div>
            <div className="stat-content">
              <h3>New Enrollees (Week)</h3>
              <div className="stat-number">{newEnrollees}</div>
            </div>
          </div>
        </div>
        <div className="dashboard-bottom">
          <div className="schedule-section">
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px'}}>
              <h2 className="section-title" style={{margin: 0}}>TODAY'S SCHEDULE ({new Date().toLocaleDateString('en-US', { timeZone: 'Asia/Manila', month: '2-digit', day: '2-digit', year: 'numeric' }).replace(/\//g, '/')})</h2>
              <button 
                onClick={() => {
                  fetchBookings();
                  fetchInstructorCount();
                }} 
                style={{
                  padding: '8px 16px',
                  background: '#5a9cf8',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontFamily: 'Poppins',
                  fontSize: '15px',
                  fontWeight: '500',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
                title="Refresh bookings"
              >
                 Refresh
              </button>
            </div>
            <div className="table-wrapper">
              <table className="schedule-table">
                <thead>
                  <tr>
                    <th>Time</th>
                    <th>Student Name</th>
                    <th>Instructor</th>
                    <th>Vehicle</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="6" className="table-empty">
                      Loading bookings...
                    </td>
                  </tr>
                ) : todayBookings.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="table-empty">
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
                      <td>
                        {booking.status === 'pending' ? (
                          <div className="action-buttons">
                            <button 
                              className="action-btn done-btn"
                              onClick={() => handleMarkBooking(booking, 'completed')}
                              title="Mark as Done"
                            >
                              ✓ Done
                            </button>
                            <button 
                              className="action-btn no-show-btn"
                              onClick={() => handleMarkBooking(booking, 'no-show')}
                              title="Mark as No Show"
                            >
                              ✗ No Show
                            </button>
                            <button 
                              className="action-btn failed-btn"
                              onClick={() => handleMarkBooking(booking, 'failed')}
                              title="Mark as Failed"
                            >
                              ⚠ Failed
                            </button>
                          </div>
                        ) : (
                          <span style={{fontSize: '12px', color: '#6b7280'}}>Completed</span>
                        )}
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
              {smsHistory.length === 0 ? (
                <div className="sms-empty">
                  <span className="empty-icon">📭</span>
                  <p>No SMS activity yet</p>
                  <small>SMS notifications will appear here</small>
                </div>
              ) : (
                <div className="sms-list">
                  {smsHistory.slice(0, 5).map((entry) => (
                    <div key={entry.id} className={`sms-item ${entry.success ? 'success' : 'error'}`}>
                      <div className="sms-icon">
                        {entry.success ? '✓' : '✗'}
                      </div>
                      <div className="sms-details">
                        <div className="sms-header">
                          <strong>{String(entry.studentName || 'Unknown')}</strong>
                          <span className={`sms-type ${entry.type}`}>{String(entry.type || 'N/A')}</span>
                        </div>
                        <div className="sms-meta">
                          <span className="sms-phone">{String(entry.phoneNumber || 'N/A')}</span>
                          <span className="sms-time">
                            {entry.timestamp ? new Date(entry.timestamp).toLocaleString('en-US', {
                              timeZone: 'Asia/Manila',
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            }) : 'N/A'}
                          </span>
                        </div>
                        {!entry.success && entry.message && (
                          <div className="sms-error-msg">
                            {typeof entry.message === 'object' 
                              ? JSON.stringify(entry.message) 
                              : String(entry.message)}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <button 
                className="view-all-sms-btn"
                onClick={() => navigate('/admin/sms-monitoring')}
              >
                View All SMS Activity →
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AdminDashboard;
