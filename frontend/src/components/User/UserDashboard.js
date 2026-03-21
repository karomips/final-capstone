import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { databases, databaseId, bookingsCollectionId, usersCollectionId } from '../../appwrite/config';
import { Query } from 'appwrite';
import './UserPages.css';
import EasyDriveLogo from '../../assets/EasyDriveLogo.png';

function UserDashboard() {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [bookings, setBookings] = useState([]);
  const [smsNotifications, setSmsNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState('User');

  const practicalCoursePlan = [
    'Course 1: Vehicle Basics',
    'Course 2: Road Positioning',
    'Course 3: Traffic Maneuvers'
  ];

  const formatLessonDate = (dateValue) => {
    if (!dateValue) return 'TBA';
    return new Date(dateValue).toLocaleDateString('en-US', {
      timeZone: 'Asia/Manila',
      month: 'short',
      day: 'numeric'
    });
  };

  const buildReminderSmsMessage = (booking, studentName) => {
    const lessonDate = formatLessonDate(booking.date);
    const lessonTime = booking.time || 'TBA';
    const instructor = booking.instructor || 'instructor';
    const reminderType = booking.lessonType === 'theory' ? 'Theory class' : 'Driving lesson';

    return `${studentName}: Reminder - ${reminderType} tomorrow ${lessonDate} ${lessonTime} with ${instructor}. -EasyDrive`;
  };

  const getSmsNotifications = (userBookings, studentName) => {
    const bookingNotificationMap = new Map();

    userBookings.forEach((booking) => {
      if (!booking.reminderSmsSent && !booking.autoReminderSent && !booking.reminderSmsSentAt) {
        return;
      }

      const timestamp = booking.reminderSmsSentAt || booking.$updatedAt || booking.$createdAt;
      bookingNotificationMap.set(booking.$id, {
        id: `${booking.$id}-reminder`,
        type: 'Reminder SMS',
        message: buildReminderSmsMessage(booking, studentName),
        timestamp
      });
    });

    return Array.from(bookingNotificationMap.values())
      .sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0))
      .slice(0, 6);
  };

  const getPracticalCourseProgress = (userBookings) => {
    const practicalBookings = userBookings
      .filter((booking) => booking.lessonType === 'practical' && String(booking.status || '').toLowerCase() !== 'cancelled')
      .sort((a, b) => new Date(a.date) - new Date(b.date));

    if (practicalBookings.length === 0) {
      return [];
    }

    const trackBookings = practicalBookings.slice(-3);

    return practicalCoursePlan.map((courseName, index) => {
      const booking = trackBookings[index];
      if (!booking) {
        return {
          id: `course-${index + 1}`,
          courseName,
          status: 'pending',
          dateText: 'Not scheduled yet'
        };
      }

      const normalizedStatus = String(booking.status || 'pending').toLowerCase();
      const uiStatus = normalizedStatus === 'completed' ? 'completed' : 'scheduled';

      return {
        id: booking.$id,
        courseName,
        status: uiStatus,
        dateText: `${new Date(booking.date).toLocaleDateString('en-US', {
          timeZone: 'Asia/Manila',
          month: 'short',
          day: 'numeric'
        }).toUpperCase()} | ${booking.time || 'TBA'}`
      };
    });
  };

  const practicalCourseProgress = getPracticalCourseProgress(bookings);
  const completedCourseCount = practicalCourseProgress.filter((course) => course.status === 'completed').length;

  const manilaTodayIso = new Date().toLocaleDateString('en-CA', {
    timeZone: 'Asia/Manila'
  });

  const upcomingSchedules = bookings
    .filter((booking) => String(booking.date || '').trim() >= manilaTodayIso)
    .sort((a, b) => {
      const dateCompare = String(a.date || '').localeCompare(String(b.date || ''));
      if (dateCompare !== 0) return dateCompare;
      return String(a.time || '').localeCompare(String(b.time || ''));
    });

  useEffect(() => {
    const fetchUserData = async () => {
      if (currentUser) {
        try {
          // Fetch user name from database
          const usersResponse = await databases.listDocuments(
            databaseId,
            usersCollectionId
          );
          const user = usersResponse.documents.find(doc => doc.email === currentUser.email);
          if (user?.name) {
            setUserName(user.name);
          }

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
          const studentName = user?.name || 'Student';
          setSmsNotifications(getSmsNotifications(response.documents, studentName));
        } catch (error) {
          console.error('Error fetching user data:', error);
        } finally {
          setLoading(false);
        }
      }
    };
    
    fetchUserData();
  }, [currentUser, getSmsNotifications]);

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
      <button className="hamburger-btn" onClick={() => setSidebarOpen(!sidebarOpen)}>
        ☰
      </button>

      {/* Sidebar */}
      <div className={`user-sidebar ${sidebarOpen ? '' : 'closed'}`}>
        <div className="user-logo-section">
          <div className="user-logo">
            <img src={EasyDriveLogo} alt="Easy Drive Logo" />
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
          <button 
            className="user-nav-btn"
            onClick={() => navigate('/profile')}
          >
            My Profile
          </button>
        </div>

        <button className="user-signout-btn" onClick={handleLogout}>
          Sign Out
        </button>
      </div>

      {/* Main Content */}
      <div className="user-main-content">
        <h1 className="page-title">Welcome, {userName}</h1>

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
                    {new Date(bookings[0].date).toLocaleDateString('en-US', { timeZone: 'Asia/Manila', month: 'short', day: 'numeric' }).toUpperCase()} | {bookings[0].time}
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
            <div className="progress-placeholder practical-progress-list">
              {practicalCourseProgress.length > 0 ? (
                <>
                  <div className="practical-progress-header">
                    <span>Practical Track</span>
                    <span>{completedCourseCount}/3 completed</span>
                  </div>
                  {practicalCourseProgress.map((course) => (
                    <div key={course.id} className="practical-course-item">
                      <div className="practical-course-text">
                        <span className="practical-course-name">{course.courseName}</span>
                        <span className="practical-course-date">{course.dateText}</span>
                      </div>
                      <span className={`practical-course-status ${course.status}`}>
                        {course.status === 'completed' ? 'Completed' : course.status === 'scheduled' ? 'Scheduled' : 'Pending'}
                      </span>
                    </div>
                  ))}
                </>
              ) : (
                <div className="notification-empty-state">No practical lessons booked yet.</div>
              )}
            </div>
          </div>

          {/* Recent Notifications Card */}
          <div className="dashboard-card notifications-card">
            <h2>RECENT NOTIFICATIONS</h2>
            <div className="notifications-content">
              {loading ? (
                <div className="notification-empty-state">Loading notifications...</div>
              ) : smsNotifications.length > 0 ? (
                smsNotifications.map((notification) => (
                  <div key={notification.id} className="notification-item">
                    <span className="notification-type">{notification.type}</span>
                    <p className="notification-message">{notification.message}</p>
                    <span className="notification-time">
                      {notification.timestamp
                        ? new Date(notification.timestamp).toLocaleString('en-PH', {
                            timeZone: 'Asia/Manila',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                            hour12: true
                          })
                        : 'Time unavailable'}
                    </span>
                  </div>
                ))
              ) : (
                <div className="notification-empty-state">No SMS reminders sent yet.</div>
              )}
            </div>
          </div>

          {/* Upcoming Schedules Card */}
          <div className="dashboard-card schedules-card">
            <h2>Upcoming Schedules</h2>
            <div className="schedule-list">
              {loading ? (
                <div>Loading...</div>
              ) : upcomingSchedules.length > 0 ? (
                upcomingSchedules.map((booking) => (
                  <div key={booking.$id} className="schedule-item">
                    <div className="schedule-info">
                      <span className="schedule-date">
                        [{new Date(booking.date).toLocaleDateString('en-US', { timeZone: 'Asia/Manila', month: 'short', day: 'numeric' }).toUpperCase()} | {booking.time}]
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
