import React, { useState, useEffect, useMemo } from 'react';
import { ArrowUpRight, CalendarDays, Check, GraduationCap, Inbox, RefreshCw, Trash2, UserPlus, X } from 'lucide-react';
import { AdminMetricCard, AdminPageHeader } from './AdminUI';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { databases, databaseId, bookingsCollectionId, instructorsCollectionId, usersCollectionId } from '../../appwrite/config';
import { Query } from 'appwrite';
import './AdminPages.css';
function AdminDashboard() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [smsHistory, setSmsHistory] = useState([]);
  const [availableInstructors, setAvailableInstructors] = useState(0);
  const [newEnrollees, setNewEnrollees] = useState(0);
  const [adminName, setAdminName] = useState('Admin');

  useEffect(() => {
    // Load initial data on component mount
    const loadInitialData = async () => {
      try {
        await Promise.all([
          fetchAdminName(),
          fetchBookings(),
          loadSMSHistory(),
          fetchInstructorCount(),
          fetchEnrolleeCount()
        ]);
      } catch (error) {
        console.error('Error loading initial data:', error);
      }
    };

    loadInitialData();
    
    // ✅ Reduced refresh interval from 30s to 5 minutes to save database quota
    // Only refresh if component is visible (avoid background refreshes)
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        fetchBookings();
        loadSMSHistory();
        fetchInstructorCount();
      }
    };

    const interval = setInterval(() => {
      if (!document.hidden) {
        fetchBookings();
        loadSMSHistory();
        fetchInstructorCount();
      }
    }, 300000); // 5 minutes instead of 30 seconds
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
      const response = await databases.listDocuments(
        databaseId,
        bookingsCollectionId
      );
      
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
    
    const filtered = bookings.filter(booking => {
      const bookingDate = String(booking.date || '').trim();
      return bookingDate === localToday;
    });
    return filtered;
  }, [bookings]);

  const upcomingBookings = useMemo(() => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const localToday = `${year}-${month}-${day}`;

    return bookings
      .filter((booking) => String(booking.date || '').trim() >= localToday && String(booking.status || '').toLowerCase() !== 'completed')
      .sort((a, b) => {
        const dateCompare = String(a.date || '').localeCompare(String(b.date || ''));
        if (dateCompare !== 0) return dateCompare;
        return String(a.time || '').localeCompare(String(b.time || ''));
      })
      .slice(0, 12);
  }, [bookings]);

    const refreshOverview = () => {
      fetchBookings();
      loadSMSHistory();
      fetchInstructorCount();
      fetchEnrolleeCount();
    };

  return (
    <div className="admin-main-content">
        <AdminPageHeader
          eyebrow="Operations overview"
          title={`Welcome back, ${adminName}`}
          description="A clear view of your driving school, all in one place."
        >
            <button className="admin-secondary-btn" onClick={refreshOverview} title="Refresh dashboard data">
              <RefreshCw size={16} aria-hidden="true" /> Refresh data
            </button>
            <button className="admin-primary-btn" onClick={() => navigate('/admin/students')}>
              Review students <ArrowUpRight size={16} aria-hidden="true" />
            </button>
        </AdminPageHeader>

        {/* Stats Cards */}
        <div className="dashboard-stats">
          <AdminMetricCard icon={CalendarDays} label="Today's lessons" value={todayBookings.length} detail="Scheduled for today" />
          <AdminMetricCard icon={GraduationCap} label="Available instructors" value={availableInstructors} detail="Ready for lessons" tone="green" />
          <AdminMetricCard icon={UserPlus} label="New enrollees" value={newEnrollees} detail="Registered in the last 7 days" tone="violet" />
        </div>
        <div className="dashboard-bottom">
          <div className="admin-schedule-column">
          <section className="schedule-section">
            <div className="section-toolbar">
              <div><h2 className="section-title">Today's schedule</h2><p className="admin-section-description">{new Date().toLocaleDateString('en-US', { timeZone: 'Asia/Manila', weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</p></div>
              <button 
                className="admin-secondary-btn admin-secondary-btn--compact"
                onClick={refreshOverview}
                title="Refresh bookings"
              >
                 <RefreshCw size={14} aria-hidden="true" /> Refresh
              </button>
            </div>
            <div className="table-wrapper today-table-wrapper" role="region" aria-label="Today's schedule" tabIndex={0}>
              <table className="schedule-table">
                <thead>
                  <tr>
                    <th>Date</th>
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
                      <td>
                        {booking.date
                          ? new Date(`${booking.date}T00:00:00`).toLocaleDateString('en-US', {
                              timeZone: 'Asia/Manila',
                              month: 'short',
                              day: 'numeric'
                            }).toUpperCase()
                          : 'N/A'}
                      </td>
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

          </section>
            <section className="schedule-section upcoming-booked-section">
              <div className="section-toolbar"><div><h2 className="section-title">Upcoming bookings</h2><p className="admin-section-description">Your next scheduled lessons</p></div><span className="admin-count-badge">{upcomingBookings.length} bookings</span></div>
              <div className="table-wrapper upcoming-table-wrapper" role="region" aria-label="Upcoming bookings" tabIndex={0}>
                <table className="schedule-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Time</th>
                      <th>Student Name</th>
                      <th>Lesson Type</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan="5" className="table-empty">Loading booked dates...</td>
                      </tr>
                    ) : upcomingBookings.length === 0 ? (
                      <tr>
                        <td colSpan="5" className="table-empty">No upcoming booked dates</td>
                      </tr>
                    ) : (
                      upcomingBookings.map((booking) => (
                        <tr key={`upcoming-${booking.$id}`}>
                          <td>
                            {booking.date
                              ? new Date(`${booking.date}T00:00:00`).toLocaleDateString('en-US', {
                                  timeZone: 'Asia/Manila',
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric'
                                }).toUpperCase()
                              : 'N/A'}
                          </td>
                          <td className="time-cell">{booking.time}</td>
                          <td className="name-cell">{booking.userName}</td>
                          <td>{booking.lessonType === 'practical' ? 'Practical' : 'Theory'}</td>
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
            </section>
          </div>

          <div className="sms-section">
            <div className="section-toolbar">
              <div><h2 className="section-title">SMS activity</h2><p className="admin-section-description">Recent notifications</p></div>
              <button
                className="clear-sms-btn"
                onClick={() => {
                  localStorage.setItem('smsHistory', JSON.stringify([]));
                  setSmsHistory([]);
                }}
              >
                <Trash2 size={14} aria-hidden="true" /> Clear history
              </button>
            </div>
            <div className="sms-content">
              {smsHistory.length === 0 ? (
                <div className="sms-empty">
                  <span className="admin-empty-icon"><Inbox size={28} strokeWidth={1.5} aria-hidden="true" /></span>
                  <p>No SMS activity yet</p>
                  <small>SMS notifications will appear here</small>
                </div>
              ) : (
                <div className="sms-list">
                  {smsHistory.slice(0, 5).map((entry) => (
                    <div key={entry.id} className={`sms-item ${entry.success ? 'success' : 'error'}`}>
                      <div className="sms-icon">
                        {entry.success ? <Check size={16} aria-label="Success" /> : <X size={16} aria-label="Failed" />}
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
                View all SMS activity <ArrowUpRight size={16} aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  export default AdminDashboard;
