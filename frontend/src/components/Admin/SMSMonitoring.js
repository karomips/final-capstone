import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { databases, databaseId, bookingsCollectionId, usersCollectionId } from '../../appwrite/config';
import { Query } from 'appwrite';
import smsHelper from '../../utils/smsHelper';
import './AdminPages.css';
import './SMSMonitoring.css';

// Utility function to format timestamps in Philippine Time (UTC+8)
const formatPhilippineTime = (timestamp) => {
  if (!timestamp) return 'N/A';
  
  const date = new Date(timestamp);
  
  // Format in Philippine Time (Asia/Manila)
  return date.toLocaleString('en-PH', {
    timeZone: 'Asia/Manila',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  });
};

function SMSMonitoring() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sendingStatus, setSendingStatus] = useState({});
  const [smsHistory, setSmsHistory] = useState([]);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterDate, setFilterDate] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchBookings();
    
    // Load SMS history from localStorage
    const history = localStorage.getItem('smsHistory');
    if (history) {
      setSmsHistory(JSON.parse(history));
    }
  }, []);

  const fetchBookings = async () => {
    try {
      const response = await databases.listDocuments(
        databaseId,
        bookingsCollectionId,
        [Query.orderDesc('$createdAt')]
      );

      // Fetch user details for each booking
      const bookingsWithUsers = await Promise.all(
        response.documents.map(async (booking) => {
          try {
            const user = await databases.getDocument(
              databaseId,
              usersCollectionId,
              booking.userId
            );
            return {
              ...booking,
              userName: user.name || 'Unknown',
              userPhone: user.phoneNumber || user.phone || 'N/A',
              userEmail: user.email || 'N/A'
            };
          } catch (error) {
            console.error('Error fetching user:', error);
            return {
              ...booking,
              userName: 'Unknown',
              userPhone: 'N/A',
              userEmail: 'N/A'
            };
          }
        })
      );

      setBookings(bookingsWithUsers);
    } catch (error) {
      console.error('Error fetching bookings:', error);
    } finally {
      setLoading(false);
    }
  };

  // Balance checking removed - not needed for this application
  // const checkSMSBalance = async () => {
  //   try {
  //     const result = await smsHelper.checkBalance();
  //     if (result && result.success) {
  //       setSmsBalance(result.data);
  //     }
  //   } catch (error) {
  //     console.error('Error checking SMS balance:', error);
  //   }
  // };

  const addToHistory = (booking, type, success, message) => {
    const newEntry = {
      id: Date.now(),
      bookingId: booking.$id,
      studentName: booking.userName,
      phoneNumber: booking.userPhone,
      type,
      success,
      message,
      timestamp: new Date().toISOString() // Stored in ISO format, will be displayed in Philippine Time
    };

    const updatedHistory = [newEntry, ...smsHistory].slice(0, 50); // Keep last 50 entries
    setSmsHistory(updatedHistory);
    localStorage.setItem('smsHistory', JSON.stringify(updatedHistory));
  };

  const sendSMS = async (booking, type) => {
    if (booking.userPhone === 'N/A' || !booking.userPhone) {
      alert('No phone number available for this student');
      return;
    }

    setSendingStatus({ ...sendingStatus, [booking.$id + type]: 'sending' });

    try {
      let result;
      const appointmentData = {
        studentName: booking.userName,
        date: new Date(booking.date).toLocaleDateString('en-US', { 
          timeZone: 'Asia/Manila',
          month: 'short', 
          day: 'numeric' 
        }),
        time: booking.time,
        instructor: booking.instructor || 'TBA',
        vehicleType: booking.vehicleType || 'TBA',
        lessonType: booking.lessonType || 'practical'
      };

      switch (type) {
        case 'confirmation':
          result = await smsHelper.sendAppointmentConfirmation(booking.userPhone, appointmentData);
          break;
        case 'reminder':
          result = await smsHelper.sendAppointmentReminder(booking.userPhone, appointmentData);
          break;
        case 'cancellation':
          result = await smsHelper.sendAppointmentCancellation(booking.userPhone, appointmentData);
          break;
        default:
          throw new Error('Invalid SMS type');
      }

      if (result.success) {
        setSendingStatus({ ...sendingStatus, [booking.$id + type]: 'success' });
        addToHistory(booking, type, true, 'SMS sent successfully');
        
        // Note: SMS tracking fields (confirmationSmsSent, reminderSmsSent, etc.) 
        // can be added to Appwrite bookings collection if needed for tracking
        // For now, we only track in localStorage history
        
        setTimeout(() => {
          setSendingStatus({ ...sendingStatus, [booking.$id + type]: null });
        }, 3000);
      } else {
        setSendingStatus({ ...sendingStatus, [booking.$id + type]: 'error' });
        addToHistory(booking, type, false, result.error || 'Failed to send SMS');
        setTimeout(() => {
          setSendingStatus({ ...sendingStatus, [booking.$id + type]: null });
        }, 3000);
      }
    } catch (error) {
      console.error('Error sending SMS:', error);
      setSendingStatus({ ...sendingStatus, [booking.$id + type]: 'error' });
      addToHistory(booking, type, false, error.message);
      setTimeout(() => {
        setSendingStatus({ ...sendingStatus, [booking.$id + type]: null });
      }, 3000);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Failed to logout:', error);
    }
  };

  const getFilteredBookings = () => {
    let filtered = bookings;

    // Filter by status
    if (filterStatus !== 'all') {
      filtered = filtered.filter(b => b.status === filterStatus);
    }

    // Filter by date
    if (filterDate !== 'all') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      filtered = filtered.filter(b => {
        const bookingDate = new Date(b.date);
        bookingDate.setHours(0, 0, 0, 0);
        
        switch (filterDate) {
          case 'today':
            return bookingDate.getTime() === today.getTime();
          case 'upcoming':
            return bookingDate >= today;
          case 'past':
            return bookingDate < today;
          default:
            return true;
        }
      });
    }

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(b => 
        b.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        b.userPhone.includes(searchTerm) ||
        b.instructor?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    return filtered;
  };

  const filteredBookings = getFilteredBookings();

  const getSMSStatusBadge = (booking, type) => {
    const sentFlag = booking[`${type}SmsSent`];
    const sendingState = sendingStatus[booking.$id + type];

    if (sendingState === 'sending') {
      return <span className="sms-badge sending">Sending...</span>;
    }
    if (sendingState === 'success') {
      return <span className="sms-badge success">✓ Sent</span>;
    }
    if (sendingState === 'error') {
      return <span className="sms-badge error">✗ Failed</span>;
    }
    if (sentFlag) {
      return <span className="sms-badge sent">Sent</span>;
    }
    return null;
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
          <button 
            className="admin-nav-btn active"
            onClick={() => navigate('/admin/sms-monitoring')}
          >
            SMS Monitoring
          </button>
        </div>

        <button className="admin-signout-btn" onClick={handleLogout}>
          Sign out
        </button>
      </div>

      {/* Main Content */}
      <div className="admin-main-content">
        <div className="page-header">
          <div>
            <h1 className="admin-page-title">SMS Monitoring & Notifications</h1>
            <p style={{marginTop: '8px', color: '#666'}}>Send and track SMS notifications for scheduled appointments</p>
          </div>
        </div>

        {/* Filters */}
        <div className="sms-filters">
          <div className="filter-group">
            <label>Search:</label>
            <input
              type="text"
              placeholder="Search by name, phone, or instructor..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>
          <div className="filter-group">
            <label>Status:</label>
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
          <div className="filter-group">
            <label>Date:</label>
            <select value={filterDate} onChange={(e) => setFilterDate(e.target.value)}>
              <option value="all">All Dates</option>
              <option value="today">Today</option>
              <option value="upcoming">Upcoming</option>
              <option value="past">Past</option>
            </select>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="sms-stats">
          <div className="stat-card">
            <div className="stat-icon">📅</div>
            <div className="stat-content">
              <h3>{filteredBookings.length}</h3>
              <p>Total Bookings</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">✉️</div>
            <div className="stat-content">
              <h3>{smsHistory.filter(h => h.success).length}</h3>
              <p>SMS Sent Today</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">⏰</div>
            <div className="stat-content">
              <h3>{filteredBookings.filter(b => b.status === 'pending').length}</h3>
              <p>Pending</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">✅</div>
            <div className="stat-content">
              <h3>{filteredBookings.filter(b => b.status === 'confirmed').length}</h3>
              <p>Confirmed</p>
            </div>
          </div>
        </div>

        {/* Bookings Table */}
        <div className="sms-bookings-section">
          <h2>Scheduled Appointments</h2>
          {loading ? (
            <div className="loading-state">
              <div className="spinner"></div>
              <p>Loading bookings...</p>
            </div>
          ) : filteredBookings.length === 0 ? (
            <div className="empty-state">
              <span className="empty-icon">📭</span>
              <p>No bookings found</p>
            </div>
          ) : (
            <div className="bookings-table-container">
              <table className="bookings-table">
                <thead>
                  <tr>
                    <th>Student</th>
                    <th>Phone</th>
                    <th>Date & Time</th>
                    <th>Instructor</th>
                    <th>Vehicle</th>
                    <th>Status</th>
                    <th>SMS Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredBookings.map((booking) => (
                    <tr key={booking.$id}>
                      <td>
                        <div className="student-info">
                          <strong>{booking.userName}</strong>
                          <small>{booking.userEmail}</small>
                        </div>
                      </td>
                      <td>
                        <span className="phone-number">{booking.userPhone}</span>
                      </td>
                      <td>
                        <div className="datetime-info">
                          <strong>{new Date(booking.date).toLocaleDateString('en-PH', { timeZone: 'Asia/Manila' })}</strong>
                          <small>{booking.time}</small>
                        </div>
                      </td>
                      <td>{booking.instructor || 'TBA'}</td>
                      <td>{booking.vehicleType || 'TBA'}</td>
                      <td>
                        <span className={`status-badge ${booking.status}`}>
                          {booking.status}
                        </span>
                      </td>
                      <td>
                        <div className="sms-actions">
                          <button
                            onClick={() => sendSMS(booking, 'confirmation')}
                            className="sms-btn confirmation"
                            disabled={sendingStatus[booking.$id + 'confirmation'] === 'sending' || booking.userPhone === 'N/A'}
                            title="Send Confirmation SMS"
                          >
                            ✓ Confirm
                            {getSMSStatusBadge(booking, 'confirmation')}
                          </button>
                          <button
                            onClick={() => sendSMS(booking, 'reminder')}
                            className="sms-btn reminder"
                            disabled={sendingStatus[booking.$id + 'reminder'] === 'sending' || booking.userPhone === 'N/A'}
                            title="Send Reminder SMS"
                          >
                            ⏰ Remind
                            {getSMSStatusBadge(booking, 'reminder')}
                          </button>
                          <button
                            onClick={() => sendSMS(booking, 'cancellation')}
                            className="sms-btn cancellation"
                            disabled={sendingStatus[booking.$id + 'cancellation'] === 'sending' || booking.userPhone === 'N/A'}
                            title="Send Cancellation SMS"
                          >
                            ✗ Cancel
                            {getSMSStatusBadge(booking, 'cancellation')}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* SMS History */}
        <div className="sms-history-section">
          <h2>Recent SMS Activity</h2>
          {smsHistory.length === 0 ? (
            <div className="empty-state">
              <span className="empty-icon">📜</span>
              <p>No SMS activity yet</p>
            </div>
          ) : (
            <div className="history-list">
              {smsHistory.slice(0, 10).map((entry) => (
                <div key={entry.id} className={`history-item ${entry.success ? 'success' : 'error'}`}>
                  <div className="history-icon">
                    {entry.success ? '✓' : '✗'}
                  </div>
                  <div className="history-content">
                    <div className="history-header">
                      <strong>{String(entry.studentName || 'Unknown')}</strong>
                      <span className="history-type">{String(entry.type || 'N/A')}</span>
                    </div>
                    <div className="history-details">
                      <span>{String(entry.phoneNumber || 'N/A')}</span>
                      <span className="history-time">
                        {formatPhilippineTime(entry.timestamp)}
                      </span>
                    </div>
                    {!entry.success && entry.message && (
                      <div className="history-error">
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
        </div>
      </div>
    </div>
  );
}

export default SMSMonitoring;
