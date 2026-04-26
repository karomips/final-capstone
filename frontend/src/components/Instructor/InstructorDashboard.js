import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { databases, databaseId, bookingsCollectionId, instructorSchedulesCollectionId, instructorsCollectionId, account } from '../../appwrite/config';
import { Query, ID } from 'appwrite';
import './InstructorPages.css';

function InstructorDashboard() {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const { theme } = useOutletContext() || {};
  const [instructorName, setInstructorName] = useState('Instructor');
  const [loading, setLoading] = useState(true);
  const [bookings, setBookings] = useState([]);
  const [scheduleSettings, setScheduleSettings] = useState(null);
  const [cancelledNotifications, setCancelledNotifications] = useState([]);

  // Working Hours State
  const [workingHours, setWorkingHours] = useState({
    monday: { start: '08:00', end: '18:00', off: false },
    tuesday: { start: '08:00', end: '18:00', off: false },
    wednesday: { start: '08:00', end: '18:00', off: false },
    thursday: { start: '08:00', end: '18:00', off: false },
    friday: { start: '08:00', end: '18:00', off: false },
    saturday: { start: '08:00', end: '14:00', off: false },
    sunday: { start: '', end: '', off: true }
  });

  // Breaks State
  const [breaks, setBreaks] = useState([
    { id: 1, day: 'monday', start: '12:00', end: '13:00' }
  ]);

  // Leaves State
  const [leaves, setLeaves] = useState([]);
  const [leaveForm, setLeaveForm] = useState({ startDate: '', endDate: '', reason: '' });

  // Password Change State
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [passwordMessage, setPasswordMessage] = useState({ type: '', text: '' });

  // Confirmation Modals
  const [showSignOutModal, setShowSignOutModal] = useState(false);
  const [showSaveBreaksModal, setShowSaveBreaksModal] = useState(false);
  const [showSaveLeavesModal, setShowSaveLeavesModal] = useState(false);
  const [showSaveHoursModal, setShowSaveHoursModal] = useState(false);
  const [showSaveSettingsModal, setShowSaveSettingsModal] = useState(false);

  // Tab State
  const [activeTab, setActiveTab] = useState('schedule');

  useEffect(() => {
    if (currentUser) {
      fetchInstructorData();
      fetchBookings();
      fetchScheduleSettings();
      loadCancelledNotifications();
    }
  }, [currentUser]);

  const fetchInstructorData = async () => {
    try {
      const response = await databases.listDocuments(
        databaseId,
        instructorsCollectionId,
        [Query.equal('userId', currentUser.$id)]
      );

      if (response.documents.length > 0) {
        setInstructorName(response.documents[0].name || 'Instructor');
      } else {
        // For instructor accounts created via signup, use email
        setInstructorName(currentUser.email.split('@')[0] || 'Instructor');
      }
    } catch (error) {
      console.error('Error fetching instructor data:', error);
      // Fallback to email prefix if error occurs
      setInstructorName(currentUser.email.split('@')[0] || 'Instructor');
    }
  };

  const fetchBookings = async () => {
    try {
      const response = await databases.listDocuments(
        databaseId,
        bookingsCollectionId,
        [Query.equal('instructor', instructorName)]
      );
      setBookings(response.documents);
    } catch (error) {
      console.error('Error fetching bookings:', error);
      setBookings([]);
    }
  };

  const fetchScheduleSettings = async () => {
    try {
      const response = await databases.listDocuments(
        databaseId,
        instructorSchedulesCollectionId,
        [Query.equal('instructorId', currentUser.$id)]
      );

      if (response.documents.length > 0) {
        const settings = response.documents[0];
        setScheduleSettings(settings);
        if (settings.workingHours) setWorkingHours(JSON.parse(settings.workingHours));
        if (settings.breaks) setBreaks(JSON.parse(settings.breaks));
        if (settings.leaves) setLeaves(JSON.parse(settings.leaves));
      }
    } catch (error) {
      console.error('Error fetching schedule settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadCancelledNotifications = () => {
    try {
      const notifications = localStorage.getItem('cancelledNotifications');
      if (notifications) {
        const parsed = JSON.parse(notifications);
        if (Array.isArray(parsed)) {
          setCancelledNotifications(parsed);
        }
      }
    } catch (error) {
      console.error('Error loading notifications:', error);
    }
  };

  const saveScheduleSettings = async () => {
    try {
      const settingsData = {
        instructorName: instructorName,
        workingHours: JSON.stringify(workingHours),
        breaks: JSON.stringify(breaks),
        leaves: JSON.stringify(leaves),
        updatedAt: new Date().toISOString()
      };

      if (scheduleSettings) {
        await databases.updateDocument(
          databaseId,
          instructorSchedulesCollectionId,
          scheduleSettings.$id,
          settingsData
        );
        console.log('Schedule settings updated:', settingsData);
        setScheduleSettings({ ...scheduleSettings, ...settingsData });
        alert('Schedule settings updated successfully!');
      } else {
        // Create new document if it doesn't exist
        const created = await databases.createDocument(
          databaseId,
          instructorSchedulesCollectionId,
          ID.unique(),
          {
            instructorId: currentUser.$id,
            instructorName: instructorName,
            ...settingsData
          }
        );
        console.log('Schedule settings created:', created);
        setScheduleSettings({ $id: created.$id, ...settingsData });
        alert('Schedule settings saved successfully!');
      }
      // Refresh the data after saving
      await fetchScheduleSettings();
    } catch (error) {
      console.error('Error saving schedule settings:', error);
      alert('Failed to save settings: ' + error.message);
    }
  };

  const handleWorkingHourChange = (day, field, value) => {
    setWorkingHours(prev => ({
      ...prev,
      [day]: { ...prev[day], [field]: value }
    }));
  };

  const handleDayOffToggle = (day) => {
    setWorkingHours(prev => ({
      ...prev,
      [day]: { ...prev[day], off: !prev[day].off }
    }));
  };

  const addBreak = () => {
    const newBreak = {
      id: Math.max(...breaks.map(b => b.id), 0) + 1,
      day: 'monday',
      start: '12:00',
      end: '13:00'
    };
    setBreaks([...breaks, newBreak]);
  };

  const removeBreak = (id) => {
    setBreaks(breaks.filter(b => b.id !== id));
  };

  const handleBreakChange = (id, field, value) => {
    setBreaks(breaks.map(b => b.id === id ? { ...b, [field]: value } : b));
  };

  const addLeave = () => {
    if (!leaveForm.startDate || !leaveForm.endDate) {
      alert('Please select both start and end dates');
      return;
    }

    const newLeave = {
      id: Math.max(...leaves.map(l => l.id || 0), 0) + 1,
      startDate: leaveForm.startDate,
      endDate: leaveForm.endDate,
      reason: leaveForm.reason,
      createdAt: new Date().toISOString()
    };

    setLeaves([...leaves, newLeave]);
    setLeaveForm({ startDate: '', endDate: '', reason: '' });
  };

  const removeLeave = (id) => {
    setLeaves(leaves.filter(l => l.id !== id));
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPasswordMessage({ type: '', text: '' });

    if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
      setPasswordMessage({ type: 'error', text: 'Please fill in all password fields' });
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordMessage({ type: 'error', text: 'New passwords do not match' });
      return;
    }

    if (passwordForm.newPassword.length < 8) {
      setPasswordMessage({ type: 'error', text: 'New password must be at least 8 characters' });
      return;
    }

    try {
      await account.updatePassword(passwordForm.newPassword, passwordForm.currentPassword);
      setPasswordMessage({ type: 'success', text: 'Password changed successfully!' });
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      
      // Clear message after 3 seconds
      setTimeout(() => {
        setPasswordMessage({ type: '', text: '' });
      }, 3000);
    } catch (error) {
      console.error('Error changing password:', error);
      setPasswordMessage({ 
        type: 'error', 
        text: error.message || 'Failed to change password. Please check your current password.' 
      });
    }
  };

  const handleSignOut = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const handleSaveBreaks = () => {
    setShowSaveBreaksModal(true);
  };

  const confirmSaveBreaks = async () => {
    setShowSaveBreaksModal(false);
    await saveScheduleSettings();
  };

  const handleSaveLeaves = () => {
    setShowSaveLeavesModal(true);
  };

  const confirmSaveLeaves = async () => {
    setShowSaveLeavesModal(false);
    await saveScheduleSettings();
  };

  const handleSaveHours = () => {
    setShowSaveHoursModal(true);
  };

  const confirmSaveHours = async () => {
    setShowSaveHoursModal(false);
    await saveScheduleSettings();
  };

  const confirmSaveSettings = async () => {
    setShowSaveSettingsModal(false);
    await handleChangePassword({ preventDefault: () => {} });
  };

  const upcomingSchedule = useMemo(() => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const localToday = `${year}-${month}-${day}`;

    return bookings
      .filter(booking => String(booking.date || '').trim() >= localToday)
      .sort((a, b) => {
        const dateCompare = String(a.date || '').localeCompare(String(b.date || ''));
        if (dateCompare !== 0) return dateCompare;
        return String(a.time || '').localeCompare(String(b.time || ''));
      });
  }, [bookings]);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <div className="instructor-main-content">
      <h1 className="instructor-page-title">Welcome, {instructorName}</h1>

      {/* Stats Cards */}
      <div className="dashboard-stats">
        <div className="stat-card">
          <div className="stat-icon">📅</div>
          <div className="stat-content">
            <h3>Today's Bookings</h3>
            <div className="stat-number">
              {bookings.filter(b => {
                const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' });
                return b.date === today;
              }).length}
            </div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">📍</div>
          <div className="stat-content">
            <h3>Upcoming Lessons</h3>
            <div className="stat-number">{upcomingSchedule.length}</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">🔔</div>
          <div className="stat-content">
            <h3>Slot Notifications</h3>
            <div className="stat-number">{cancelledNotifications.length}</div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="instructor-tabs">
        <button
          className={`tab-button ${activeTab === 'schedule' ? 'active' : ''}`}
          onClick={() => setActiveTab('schedule')}
        >
          My Schedule
        </button>
        <button
          className={`tab-button ${activeTab === 'hours' ? 'active' : ''}`}
          onClick={() => setActiveTab('hours')}
        >
          Working Hours
        </button>
        <button
          className={`tab-button ${activeTab === 'breaks' ? 'active' : ''}`}
          onClick={() => setActiveTab('breaks')}
        >
          Breaks
        </button>
        <button
          className={`tab-button ${activeTab === 'leaves' ? 'active' : ''}`}
          onClick={() => setActiveTab('leaves')}
        >
          Leaves
        </button>
        <button
          className={`tab-button ${activeTab === 'notifications' ? 'active' : ''}`}
          onClick={() => setActiveTab('notifications')}
        >
          Slot Alerts
        </button>
        <button
          className={`tab-button ${activeTab === 'settings' ? 'active' : ''}`}
          onClick={() => setActiveTab('settings')}
        >
          Settings
        </button>
      </div>

      {/* Tab Content */}
      <div className="instructor-tabs-content">
        {/* My Schedule Tab */}
        {activeTab === 'schedule' && (
          <div className="tab-panel">
            <div className="instructor-card">
              <h2 className="section-title">📅 Upcoming Lessons</h2>
              <div className="schedule-list">
                {loading ? (
                  <div className="loading-state">Loading schedule...</div>
                ) : upcomingSchedule.length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-icon">📭</div>
                    <p>No upcoming lessons scheduled</p>
                  </div>
                ) : (
                  <table className="schedule-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Time</th>
                        <th>Student</th>
                        <th>Lesson Type</th>
                        <th>Vehicle</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {upcomingSchedule.map(booking => (
                        <tr key={booking.$id}>
                          <td>
                            {new Date(`${booking.date}T00:00:00`).toLocaleDateString('en-US', {
                              timeZone: 'Asia/Manila',
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric'
                            })}
                          </td>
                          <td>{booking.time}</td>
                          <td>{booking.userName}</td>
                          <td>{booking.lessonType === 'practical' ? 'Behind-the-Wheel' : 'Theory'}</td>
                          <td>{booking.vehicle}</td>
                          <td>
                            <span className={`status-badge ${booking.status.toLowerCase()}`}>
                              {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Working Hours Tab */}
        {activeTab === 'hours' && (
          <div className="tab-panel">
            <div className="instructor-card">
              <h2 className="section-title">Set Your Working Hours</h2>
              <div className="working-hours-grid">
                {Object.entries(workingHours).map(([day, hours]) => (
                  <div key={day} className="working-hours-item">
                    <div className="day-header">
                      <label className="day-label">{day.charAt(0).toUpperCase() + day.slice(1)}</label>
                      <label className="day-off-checkbox">
                        <input
                          type="checkbox"
                          checked={hours.off}
                          onChange={() => handleDayOffToggle(day)}
                        />
                        <span>Day Off</span>
                      </label>
                    </div>
                    {!hours.off && (
                      <div className="time-inputs">
                        <div className="time-field">
                          <label>Start</label>
                          <input
                            type="time"
                            value={hours.start}
                            onChange={(e) => handleWorkingHourChange(day, 'start', e.target.value)}
                          />
                        </div>
                        <div className="time-field">
                          <label>End</label>
                          <input
                            type="time"
                            value={hours.end}
                            onChange={(e) => handleWorkingHourChange(day, 'end', e.target.value)}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <button className="save-button" onClick={handleSaveHours}>
                Save Working Hours
              </button>
            </div>
          </div>
        )}

        {/* Breaks Tab */}
        {activeTab === 'breaks' && (
          <div className="tab-panel">
            <div className="instructor-card">
              <h2 className="section-title">Manage Your Breaks</h2>
              <div className="breaks-container">
                {breaks.length === 0 ? (
                  <div className="empty-state">
                    <p>No breaks scheduled</p>
                  </div>
                ) : (
                  <div className="breaks-list">
                    {breaks.map(breakItem => (
                      <div key={breakItem.id} className="break-item">
                        <div className="break-content">
                          <select
                            value={breakItem.day}
                            onChange={(e) => handleBreakChange(breakItem.id, 'day', e.target.value)}
                            className="break-day-select"
                          >
                            <option value="monday">Monday</option>
                            <option value="tuesday">Tuesday</option>
                            <option value="wednesday">Wednesday</option>
                            <option value="thursday">Thursday</option>
                            <option value="friday">Friday</option>
                            <option value="saturday">Saturday</option>
                            <option value="sunday">Sunday</option>
                          </select>
                          <input
                            type="time"
                            value={breakItem.start}
                            onChange={(e) => handleBreakChange(breakItem.id, 'start', e.target.value)}
                          />
                          <span>→</span>
                          <input
                            type="time"
                            value={breakItem.end}
                            onChange={(e) => handleBreakChange(breakItem.id, 'end', e.target.value)}
                          />
                        </div>
                        <button
                          className="remove-btn"
                          onClick={() => removeBreak(breakItem.id)}
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="action-buttons">
                <button className="add-button" onClick={addBreak}>
                  ➕ Add Break
                </button>
                <button className="save-button" onClick={handleSaveBreaks}>
                  💾 Save Breaks
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Leaves Tab */}
        {activeTab === 'leaves' && (
          <div className="tab-panel">
            <div className="instructor-card">
              <h2 className="section-title">Request Leaves</h2>
              <div className="leave-form">
                <div className="form-group">
                  <label>Start Date</label>
                  <input
                    type="date"
                    value={leaveForm.startDate}
                    onChange={(e) => setLeaveForm({ ...leaveForm, startDate: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>End Date</label>
                  <input
                    type="date"
                    value={leaveForm.endDate}
                    onChange={(e) => setLeaveForm({ ...leaveForm, endDate: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Reason (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g., Personal, Medical, Vacation"
                    value={leaveForm.reason}
                    onChange={(e) => setLeaveForm({ ...leaveForm, reason: e.target.value })}
                  />
                </div>
                <button className="add-button" onClick={addLeave}>
                  Add Leave
                </button>
              </div>

              {leaves.length > 0 && (
                <div className="leaves-list">
                  <h3>Your Leaves</h3>
                  {leaves.map(leave => (
                    <div key={leave.id} className="leave-item">
                      <div className="leave-content">
                        <div className="leave-dates">
                          {new Date(leave.startDate).toLocaleDateString()} - {new Date(leave.endDate).toLocaleDateString()}
                        </div>
                        {leave.reason && <div className="leave-reason">Reason: {leave.reason}</div>}
                      </div>
                      <button
                        className="remove-btn"
                        onClick={() => removeLeave(leave.id)}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <button className="save-button" onClick={handleSaveLeaves}>
                Save Leaves
              </button>
            </div>
          </div>
        )}

        {/* Notifications Tab */}
        {activeTab === 'notifications' && (
          <div className="tab-panel">
            <div className="instructor-card">
              <h2 className="section-title">Available Slots from Cancellations</h2>
              {cancelledNotifications.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon">📭</div>
                  <p>No cancelled slots available right now</p>
                </div>
              ) : (
                <div className="notifications-list">
                  {cancelledNotifications.map((notification, index) => (
                    <div key={index} className="notification-item">
                      <div className="notification-content">
                        <div className="notification-date">
                          {new Date(notification.date).toLocaleDateString()} at {notification.time}
                        </div>
                        <div className="notification-student">
                          Student: {notification.studentName}
                        </div>
                        <div className="notification-type">
                          {notification.lessonType === 'practical' ? 'Behind-the-Wheel' : 'Theory'} Lesson
                        </div>
                      </div>
                      <button className="claim-btn" onClick={() => {
                        alert('You can now accept this slot from ' + notification.studentName);
                        setCancelledNotifications(prev => prev.filter((_, i) => i !== index));
                      }}>
                        ✓ Mark as Reviewed
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div className="tab-panel">
            <div className="instructor-card">
              <h2 className="section-title">Account Settings</h2>
              
              <form style={{maxWidth: '500px'}}>
                {passwordMessage.text && (
                  <div style={{
                    background: passwordMessage.type === 'success' ? '#dcfce7' : '#fee2e2',
                    color: passwordMessage.type === 'success' ? '#166534' : '#991b1b',
                    padding: '12px 16px',
                    borderRadius: '6px',
                    marginBottom: '16px',
                    fontSize: '14px'
                  }}>
                    {passwordMessage.text}
                  </div>
                )}
                
                <div className="form-group" style={{marginBottom: '16px'}}>
                  <label style={{display: 'block', marginBottom: '8px', fontWeight: '600'}}>Current Password</label>
                  <input
                    type="password"
                    value={passwordForm.currentPassword}
                    onChange={(e) => setPasswordForm({...passwordForm, currentPassword: e.target.value})}
                    placeholder="Enter your current password"
                    required
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      fontSize: '14px',
                      fontFamily: 'inherit'
                    }}
                  />
                </div>

                <div className="form-group" style={{marginBottom: '16px'}}>
                  <label style={{display: 'block', marginBottom: '8px', fontWeight: '600'}}>New Password (minimum 8 characters)</label>
                  <input
                    type="password"
                    value={passwordForm.newPassword}
                    onChange={(e) => setPasswordForm({...passwordForm, newPassword: e.target.value})}
                    placeholder="Enter new password"
                    required
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      fontSize: '14px',
                      fontFamily: 'inherit'
                    }}
                  />
                </div>

                <div className="form-group" style={{marginBottom: '20px'}}>
                  <label style={{display: 'block', marginBottom: '8px', fontWeight: '600'}}>Confirm New Password</label>
                  <input
                    type="password"
                    value={passwordForm.confirmPassword}
                    onChange={(e) => setPasswordForm({...passwordForm, confirmPassword: e.target.value})}
                    placeholder="Confirm new password"
                    required
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      fontSize: '14px',
                      fontFamily: 'inherit'
                    }}
                  />
                </div>

                <button
                  type="button"
                  onClick={() => setShowSaveSettingsModal(true)}
                  style={{
                    background: '#3b82f6',
                    color: 'white',
                    border: 'none',
                    padding: '12px 24px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '600'
                  }}
                >
                  Change Password
                </button>
              </form>
            </div>
          </div>
        )}
      </div>

      {/* Sign Out Confirmation Modal */}
      {showSignOutModal && (
        <div className="modal-overlay" onClick={() => setShowSignOutModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Sign Out</h2>
              <button className="modal-close" onClick={() => setShowSignOutModal(false)}>×</button>
            </div>
            <div style={{padding: '20px', textAlign: 'center'}}>
              <p style={{marginBottom: '20px', color: '#333'}}>Are you sure you want to sign out of your account?</p>
              <div style={{display: 'flex', gap: '10px', justifyContent: 'center'}}>
                <button
                  onClick={() => setShowSignOutModal(false)}
                  style={{
                    background: '#e5e7eb',
                    color: '#333',
                    border: 'none',
                    padding: '10px 20px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontWeight: '600'
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSignOut}
                  style={{
                    background: '#dc2626',
                    color: 'white',
                    border: 'none',
                    padding: '10px 20px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontWeight: '600'
                  }}
                >
                  Sign Out
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Save Breaks Confirmation Modal */}
      {showSaveBreaksModal && (
        <div className="modal-overlay" onClick={() => setShowSaveBreaksModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Save Breaks</h2>
              <button className="modal-close" onClick={() => setShowSaveBreaksModal(false)}>×</button>
            </div>
            <div style={{padding: '20px', textAlign: 'center'}}>
              <p style={{marginBottom: '20px', color: '#333'}}>Are you sure you want to save these break changes?</p>
              <div style={{display: 'flex', gap: '10px', justifyContent: 'center'}}>
                <button
                  onClick={() => setShowSaveBreaksModal(false)}
                  style={{
                    background: '#e5e7eb',
                    color: '#333',
                    border: 'none',
                    padding: '10px 20px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontWeight: '600'
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={confirmSaveBreaks}
                  style={{
                    background: '#10b981',
                    color: 'white',
                    border: 'none',
                    padding: '10px 20px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontWeight: '600'
                  }}
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Save Leaves Confirmation Modal */}
      {showSaveLeavesModal && (
        <div className="modal-overlay" onClick={() => setShowSaveLeavesModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Save Leaves</h2>
              <button className="modal-close" onClick={() => setShowSaveLeavesModal(false)}>×</button>
            </div>
            <div style={{padding: '20px', textAlign: 'center'}}>
              <p style={{marginBottom: '20px', color: '#333'}}>Are you sure you want to save these leave requests?</p>
              <div style={{display: 'flex', gap: '10px', justifyContent: 'center'}}>
                <button
                  onClick={() => setShowSaveLeavesModal(false)}
                  style={{
                    background: '#e5e7eb',
                    color: '#333',
                    border: 'none',
                    padding: '10px 20px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontWeight: '600'
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={confirmSaveLeaves}
                  style={{
                    background: '#10b981',
                    color: 'white',
                    border: 'none',
                    padding: '10px 20px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontWeight: '600'
                  }}
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Change Password Confirmation Modal */}
      {/* Save Working Hours Confirmation Modal */}
      {showSaveHoursModal && (
        <div className="modal-overlay" onClick={() => setShowSaveHoursModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Save Working Hours</h2>
              <button className="modal-close" onClick={() => setShowSaveHoursModal(false)}>×</button>
            </div>
            <div style={{padding: '20px', textAlign: 'center'}}>
              <p style={{marginBottom: '20px', color: '#333'}}>Are you sure you want to save these working hours changes?</p>
              <div style={{display: 'flex', gap: '10px', justifyContent: 'center'}}>
                <button
                  onClick={() => setShowSaveHoursModal(false)}
                  style={{
                    background: '#e5e7eb',
                    color: '#333',
                    border: 'none',
                    padding: '10px 20px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontWeight: '600'
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={confirmSaveHours}
                  style={{
                    background: '#10b981',
                    color: 'white',
                    border: 'none',
                    padding: '10px 20px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontWeight: '600'
                  }}
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Change Password Confirmation Modal */}
      {showSaveSettingsModal && (
        <div className="modal-overlay" onClick={() => setShowSaveSettingsModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Change Password</h2>
              <button className="modal-close" onClick={() => setShowSaveSettingsModal(false)}>×</button>
            </div>
            <div style={{padding: '20px', textAlign: 'center'}}>
              <p style={{marginBottom: '20px', color: '#333'}}>Are you sure you want to change your password?</p>
              <div style={{display: 'flex', gap: '10px', justifyContent: 'center'}}>
                <button
                  onClick={() => setShowSaveSettingsModal(false)}
                  style={{
                    background: '#e5e7eb',
                    color: '#333',
                    border: 'none',
                    padding: '10px 20px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontWeight: '600'
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={confirmSaveSettings}
                  style={{
                    background: '#10b981',
                    color: 'white',
                    border: 'none',
                    padding: '10px 20px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontWeight: '600'
                  }}
                >
                  Change Password
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default InstructorDashboard;
