import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, getDocs, updateDoc, doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import './AppointmentList.css';

function AppointmentList() {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchAppointments();
  }, []);

  const fetchAppointments = async () => {
    try {
      const appointmentsRef = collection(db, 'appointments');
      const q = query(appointmentsRef, orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      
      const appointmentsList = await Promise.all(
        snapshot.docs.map(async (docSnap) => {
          const appointmentData = docSnap.data();
          
          // Fetch user name
          let userName = 'Unknown User';
          if (appointmentData.userId) {
            try {
              const userDoc = await getDoc(doc(db, 'users', appointmentData.userId));
              if (userDoc.exists()) {
                userName = userDoc.data().name || 'Unknown User';
              }
            } catch (error) {
              console.error('Error fetching user name:', error);
            }
          }
          
          return {
            id: docSnap.id,
            ...appointmentData,
            userName: userName
          };
        })
      );

      setAppointments(appointmentsList);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching appointments:', err);
      setError('Failed to load appointments');
      setLoading(false);
    }
  };

  const handleStatusChange = async (appointmentId, newStatus) => {
    try {
      const appointmentRef = doc(db, 'appointments', appointmentId);
      const updateData = {
        status: newStatus,
        updatedAt: new Date()
      };

      if (newStatus === 'completed') {
        updateData.completedDate = new Date();
      }

      await updateDoc(appointmentRef, updateData);
      
      // Update local state
      setAppointments(appointments.map(apt => 
        apt.id === appointmentId 
          ? { ...apt, status: newStatus, completedDate: newStatus === 'completed' ? new Date() : apt.completedDate }
          : apt
      ));
    } catch (err) {
      console.error('Error updating appointment:', err);
      setError('Failed to update appointment status');
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getTimeAgo = (timestamp) => {
    if (!timestamp) return 'Unknown';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const seconds = Math.floor((now - date) / 1000);
    
    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)} days ago`;
    return formatDate(timestamp);
  };

  if (loading) {
    return (
      <div className="appointment-list-container">
        <h2>Recent Appointments</h2>
        <div className="loading-state">Loading appointments...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="appointment-list-container">
        <h2>Recent Appointments</h2>
        <div className="error-state">{error}</div>
      </div>
    );
  }

  return (
    <div className="appointment-list-container">
      <div className="list-header">
        <h2>Recent Appointments</h2>
        <span className="total-count">{appointments.length} Total</span>
      </div>

      {appointments.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📅</div>
          <p>No appointments yet</p>
        </div>
      ) : (
        <div className="appointments-list">
          {appointments.map((appointment) => (
            <div key={appointment.id} className={`appointment-item ${appointment.status}`}>
              <div className="appointment-header-row">
                <div className="appointment-title-section">
                  <h3 className="appointment-title">{appointment.title}</h3>
                  <span className="time-ago">{getTimeAgo(appointment.createdAt)}</span>
                </div>
                <div className="status-badge-container">
                  <span className={`status-badge ${appointment.status}`}>
                    {appointment.status === 'pending' ? '⏳ Pending' : '✅ Completed'}
                  </span>
                </div>
              </div>

              {appointment.description && (
                <p className="appointment-description">{appointment.description}</p>
              )}

              <div className="appointment-details">
                <div className="detail-item">
                  <span className="detail-icon">📅</span>
                  <span className="detail-text">
                    <strong>Scheduled:</strong> {formatDate(appointment.date)}
                  </span>
                </div>
                <div className="detail-item">
                  <span className="detail-icon">👤</span>
                  <span className="detail-text">
                    <strong>User:</strong> {appointment.userName}
                  </span>
                </div>
              </div>

              <div className="appointment-actions">
                {appointment.status === 'pending' ? (
                  <button 
                    className="btn-complete"
                    onClick={() => handleStatusChange(appointment.id, 'completed')}
                  >
                    Mark as Completed
                  </button>
                ) : (
                  <button 
                    className="btn-reopen"
                    onClick={() => handleStatusChange(appointment.id, 'pending')}
                  >
                    Reopen
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default AppointmentList;
