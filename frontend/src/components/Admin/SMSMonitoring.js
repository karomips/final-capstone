import React, { useState, useEffect } from 'react';
import { Bell, CalendarDays, Check, CheckCircle2, Clock3, Inbox, MessageSquare, Search, X } from 'lucide-react';
import { AdminEmptyState, AdminMetricCard, AdminPageHeader } from './AdminUI';
import { databases, databaseId, bookingsCollectionId, usersCollectionId, instructorsCollectionId, vehiclesCollectionId } from '../../appwrite/config';
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

  const releaseBookingResources = async (booking) => {
    const normalize = (value) => String(value || '').trim().toLowerCase();

    // For practical lessons, check if all 3 days have been completed before releasing vehicle
    if (booking.lessonType === 'practical' && booking.vehicle && booking.vehicle !== 'N/A') {
      try {
        // Get all bookings for this user with the same instructor and vehicle
        const allUserBookings = await databases.listDocuments(
          databaseId,
          bookingsCollectionId,
          [Query.equal('userId', booking.userId)]
        );

        const relatedPracticalBookings = allUserBookings.documents.filter(b => 
          b.instructor === booking.instructor &&
          b.vehicle === booking.vehicle &&
          b.lessonType === 'practical' &&
          b.$id !== booking.$id
        );

        // Check if there are any incomplete related bookings
        const hasIncompleteBookings = relatedPracticalBookings.some(b => 
          b.status !== 'completed' && b.status !== 'cancelled'
        );

        // Only release vehicle if no other incomplete bookings exist
        if (!hasIncompleteBookings) {
          const vehicleModel = booking.vehicle.split(' (')[0];
          let vehicleDoc = null;

          const vehicleQuery = await databases.listDocuments(
            databaseId,
            vehiclesCollectionId,
            [Query.equal('model', vehicleModel)]
          );

          if (vehicleQuery.documents.length > 0) {
            vehicleDoc = vehicleQuery.documents[0];
          } else {
            const allVehicles = await databases.listDocuments(
              databaseId,
              vehiclesCollectionId
            );
            vehicleDoc = allVehicles.documents.find(
              (doc) => normalize(doc.model) === normalize(vehicleModel)
            );
          }

          if (vehicleDoc) {
            await databases.updateDocument(
              databaseId,
              vehiclesCollectionId,
              vehicleDoc.$id,
              { status: 'available' }
            );
          }
        }
      } catch (error) {
        console.error('Error checking related bookings for vehicle release:', error);
      }
    } else if (booking.vehicle && booking.vehicle !== 'N/A') {
      // For non-practical lessons, release vehicle immediately
      try {
        const vehicleModel = booking.vehicle.split(' (')[0];
        let vehicleDoc = null;

        const vehicleQuery = await databases.listDocuments(
          databaseId,
          vehiclesCollectionId,
          [Query.equal('model', vehicleModel)]
        );

        if (vehicleQuery.documents.length > 0) {
          vehicleDoc = vehicleQuery.documents[0];
        } else {
          const allVehicles = await databases.listDocuments(
            databaseId,
            vehiclesCollectionId
          );
          vehicleDoc = allVehicles.documents.find(
            (doc) => normalize(doc.model) === normalize(vehicleModel)
          );
        }

        if (vehicleDoc) {
          await databases.updateDocument(
            databaseId,
            vehiclesCollectionId,
            vehicleDoc.$id,
            { status: 'available' }
          );
        }
      } catch (error) {
        console.error('Error releasing vehicle status:', error);
      }
    }

    if (booking.instructor) {
      try {
        let instructorDoc = null;

        // Instructor availability is stored on the dedicated instructors record.
        const instructorQuery = await databases.listDocuments(
          databaseId,
          instructorsCollectionId,
          [Query.equal('name', booking.instructor)]
        );

        if (instructorQuery.documents.length > 0) {
          instructorDoc = instructorQuery.documents[0];
        } else {
          // Fallback: normalize values to tolerate case/spacing differences
          const allInstructors = await databases.listDocuments(
            databaseId,
            instructorsCollectionId
          );
          instructorDoc = allInstructors.documents.find(
            (doc) => normalize(doc.name) === normalize(booking.instructor)
          );
        }

        if (instructorDoc) {
          try {
            await databases.updateDocument(
              databaseId,
              instructorsCollectionId,
              instructorDoc.$id,
              { availability: 'available' }
            );
          } catch (updateErr) {
            console.warn('Could not update instructor availability:', updateErr);
          }
        }
      } catch (error) {
        console.error('Error releasing instructor availability:', error);
      }
    }
  };

  const updateBookingStatus = async (booking, nextStatus) => {
    const updateData = { status: nextStatus };

    try {
      await databases.updateDocument(
        databaseId,
        bookingsCollectionId,
        booking.$id,
        updateData
      );
    } catch (error) {
      console.error('Error updating booking status:', error);
      throw error;
    }

    if (nextStatus === 'completed' || nextStatus === 'cancelled') {
      await releaseBookingResources(booking);
    }

    setBookings((prev) => prev.map((item) => (
      item.$id === booking.$id
        ? { ...item, ...updateData }
        : item
    )));
  };

  const handleBookingAction = async (booking, actionType) => {
    const actionKey = booking.$id + actionType;
    setSendingStatus((prev) => ({ ...prev, [actionKey]: 'sending' }));

    try {
      let result = { success: true };
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

      switch (actionType) {
        case 'completed':
          await updateBookingStatus(booking, 'completed');
          addToHistory(booking, 'completed', true, 'Booking marked as completed');
          break;
        case 'reminder':
          if (booking.userPhone === 'N/A' || !booking.userPhone) {
            throw new Error('No phone number available for this student');
          }
          result = await smsHelper.sendAppointmentReminder(booking.userPhone, appointmentData);
          if (!result.success) {
            throw new Error(result.error || 'Failed to send reminder SMS');
          }
          addToHistory(booking, 'reminder', true, 'Reminder SMS sent successfully');
          break;
        case 'cancellation':
          if (booking.userPhone !== 'N/A' && booking.userPhone) {
            result = await smsHelper.sendAppointmentCancellation(booking.userPhone, appointmentData);
          }
          await updateBookingStatus(booking, 'cancelled');
          
          // Notify instructor about the cancelled slot (available for rescheduling)
          const instructorNotification = {
            instructorName: booking.instructor,
            date: booking.date,
            time: booking.time,
            studentName: booking.userName,
            lessonType: booking.lessonType,
            vehicle: booking.vehicle,
            timestamp: new Date().toISOString()
          };
          
          const existingNotifications = JSON.parse(localStorage.getItem('cancelledNotifications') || '[]');
          existingNotifications.push(instructorNotification);
          localStorage.setItem('cancelledNotifications', JSON.stringify(existingNotifications));
          
          addToHistory(
            booking,
            'cancellation',
            true,
            result.success === false
              ? 'Booking cancelled. Cancellation SMS could not be sent.'
              : 'Booking cancelled successfully'
          );
          break;
        default:
          throw new Error('Invalid action type');
      }

      setSendingStatus((prev) => ({ ...prev, [actionKey]: 'success' }));
      setTimeout(() => {
        setSendingStatus((prev) => ({ ...prev, [actionKey]: null }));
      }, 3000);
    } catch (error) {
      console.error('Error handling booking action:', error);
      setSendingStatus((prev) => ({ ...prev, [actionKey]: 'error' }));
      addToHistory(booking, actionType, false, error.message);
      setTimeout(() => {
        setSendingStatus((prev) => ({ ...prev, [actionKey]: null }));
      }, 3000);
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
    <div className="admin-main-content admin-main-content--fit admin-sms-page">
        <AdminPageHeader eyebrow="Communications" title="SMS monitoring" description="Send and track notifications for your scheduled appointments." />

        {/* Filters */}
        <div className="sms-filters">
          <div className="filter-group">
            <label htmlFor="admin-sms-search">Search appointments</label>
            <div className="admin-search-field"><Search size={17} aria-hidden="true" /><input
              id="admin-sms-search"
              type="text"
              placeholder="Search by name, phone, or instructor..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            /></div>
          </div>
          <div className="filter-group">
            <label htmlFor="admin-sms-status">Booking status</label>
            <select id="admin-sms-status" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
          <div className="filter-group">
            <label htmlFor="admin-sms-date">Date range</label>
            <select id="admin-sms-date" value={filterDate} onChange={(e) => setFilterDate(e.target.value)}>
              <option value="all">All Dates</option>
              <option value="today">Today</option>
              <option value="upcoming">Upcoming</option>
              <option value="past">Past</option>
            </select>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="sms-stats">
          <AdminMetricCard icon={CalendarDays} label="Total bookings" value={filteredBookings.length} />
          <AdminMetricCard icon={MessageSquare} label="SMS sent today" value={smsHistory.filter(h => h.success).length} tone="violet" />
          <AdminMetricCard icon={Clock3} label="Pending bookings" value={filteredBookings.filter(b => b.status === 'pending').length} tone="amber" />
          <AdminMetricCard icon={CheckCircle2} label="Completed" value={filteredBookings.filter(b => b.status === 'completed').length} tone="green" />
        </div>

        {/* Bookings Table */}
        <div className="sms-bookings-section">
          <div className="section-toolbar"><div><h2 className="section-title">Scheduled appointments</h2><p className="admin-section-description">Manage lessons and keep students informed</p></div><span className="admin-count-badge">{filteredBookings.length} bookings</span></div>
          {loading ? (
            <div className="loading-state">
              <div className="spinner"></div>
              <p>Loading bookings...</p>
            </div>
          ) : filteredBookings.length === 0 ? (
            <AdminEmptyState icon={CalendarDays} title="No bookings found" description="Appointments matching your search and filters will appear here." />
          ) : (
            <div className="bookings-table-container" role="region" aria-label="Scheduled appointments" tabIndex={0}>
              <table className="bookings-table">
                <thead>
                  <tr>
                    <th>Student</th>
                    <th>Phone</th>
                    <th>Date & Time</th>
                    <th>Instructor</th>
                    <th>Vehicle</th>
                    <th>Status</th>
                    <th>Actions</th>
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
                      <td>{booking.vehicle || 'TBA'}</td>
                      <td>
                        <span className={`status-badge ${booking.status}`}>
                          {booking.status}
                        </span>
                      </td>
                      <td>
                        <div className="sms-actions">
                          <button
                            onClick={() => handleBookingAction(booking, 'completed')}
                            className="sms-btn completed"
                            disabled={sendingStatus[booking.$id + 'completed'] === 'sending' || booking.status === 'completed'}
                            title="Mark booking as completed"
                          >
                            <Check size={13} aria-hidden="true" /> Complete
                            {getSMSStatusBadge(booking, 'completed')}
                          </button>
                          <button
                            onClick={() => handleBookingAction(booking, 'reminder')}
                            className="sms-btn reminder"
                            disabled={sendingStatus[booking.$id + 'reminder'] === 'sending' || booking.userPhone === 'N/A'}
                            title="Send Reminder SMS"
                          >
                            <Bell size={13} aria-hidden="true" /> Remind
                            {getSMSStatusBadge(booking, 'reminder')}
                          </button>
                          <button
                            onClick={() => handleBookingAction(booking, 'cancellation')}
                            className="sms-btn cancellation"
                            disabled={sendingStatus[booking.$id + 'cancellation'] === 'sending' || booking.status === 'cancelled'}
                            title="Cancel booking"
                          >
                            <X size={13} aria-hidden="true" /> Cancel
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
          <div className="section-toolbar"><div><h2 className="section-title">Recent SMS activity</h2><p className="admin-section-description">Delivery history and notification updates</p></div></div>
          {smsHistory.length === 0 ? (
            <AdminEmptyState icon={Inbox} title="No SMS activity yet" description="Your sent notifications and delivery updates will appear here." />
          ) : (
            <div className="history-list">
              {smsHistory.slice(0, 10).map((entry) => (
                <div key={entry.id} className={`history-item ${entry.success ? 'success' : 'error'}`}>
                  <div className="history-icon">
                    {entry.success ? <Check size={17} aria-label="Success" /> : <X size={17} aria-label="Failed" />}
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
  );
}

export default SMSMonitoring;
