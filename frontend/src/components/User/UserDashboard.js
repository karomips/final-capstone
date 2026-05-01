import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { databases, databaseId, bookingsCollectionId, usersCollectionId } from '../../appwrite/config';
import { Query } from 'appwrite';
import './UserPages.css';

function UserDashboard() {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const { theme } = useOutletContext();
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

  // ✅ Moved outside useCallback chain — pure function, defined before use
  const buildReminderSmsMessage = useCallback((booking, studentName) => {
    const lessonDate = formatLessonDate(booking.date);
    const lessonTime = booking.time || 'TBA';
    const instructor = booking.instructor || 'instructor';
    const reminderType = booking.lessonType === 'theory' ? 'Theory class' : 'Driving lesson';

    return `${studentName}: Reminder - ${reminderType} tomorrow ${lessonDate} ${lessonTime} with ${instructor}. -EasyDrive`;
  }, []);

  const getSmsNotifications = useCallback((userBookings, studentName) => {
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
  }, [buildReminderSmsMessage]);

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
  const totalCourses = practicalCoursePlan.length;
  const lessonGoalHours = 9;
  const hoursLogged = bookings.reduce((sum, booking) => sum + (parseFloat(booking.duration) || 0), 0);
  const overallProgressPercent = totalCourses > 0 ? Math.round((completedCourseCount / totalCourses) * 100) : 0;

  const manilaTodayIso = new Date().toLocaleDateString('en-CA', {
    timeZone: 'Asia/Manila'
  });

  const upcomingSchedules = bookings
    .filter((booking) => String(booking.date || '').trim() >= manilaTodayIso && String(booking.status || '').toLowerCase() !== 'completed')
    .sort((a, b) => {
      const dateCompare = String(a.date || '').localeCompare(String(b.date || ''));
      if (dateCompare !== 0) return dateCompare;
      return String(a.time || '').localeCompare(String(b.time || ''));
    });

  // Get next lesson (first non-cancelled upcoming booking)
  const nextLesson = upcomingSchedules.find(
    (booking) => String(booking.status || '').toLowerCase() !== 'cancelled'
  );

  const daysUntilNextLesson = nextLesson
    ? Math.max(0, Math.ceil((new Date(nextLesson.date) - new Date()) / (1000 * 60 * 60 * 24)))
    : null;
  const daysUntilNextText = nextLesson
    ? daysUntilNextLesson === 0
      ? 'Today'
      : `${daysUntilNextLesson} days`
    : '—';

  useEffect(() => {
    const body = document.body;
    if (theme === 'dark') {
      body.classList.add('dark-mode');
    } else {
      body.classList.remove('dark-mode');
    }
  }, [theme]);

  useEffect(() => {
    const fetchUserData = async () => {
      if (currentUser) {
        try {
          const usersResponse = await databases.listDocuments(
            databaseId,
            usersCollectionId
          );
          const user = usersResponse.documents.find(doc => doc.email === currentUser.email);
          if (user?.name) {
            setUserName(user.name);
          }

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
        } catch (err) {
          console.error('Error fetching user data:', err);
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
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  return (
    <div className="user-main-content user-main-content--fit">
      <div className="dashboard-header">
        <div className="dashboard-header-top">
          <div>
            <h1 className="page-title">Welcome back, {userName}!</h1>
            <p className="dashboard-subtitle">You’re enrolled in the Practical Track. Keep it up.</p>
          </div>
        </div>

        <div className="dashboard-overview">
          <div className="overview-card">
            <h3>Courses done</h3>
            <div className="overview-value">{completedCourseCount} of {totalCourses}</div>
            <div className="overview-meta">of {totalCourses} total</div>
          </div>

          <div className="overview-card">
            <h3>Hours logged</h3>
            <div className="overview-value">{hoursLogged.toFixed(1)}h</div>
            <div className="overview-meta">goal: {lessonGoalHours} hrs</div>
          </div>

          <div className="overview-card">
            <h3>Overall progress</h3>
            <div className="overview-value">{overallProgressPercent}%</div>
            <div className="overview-meta">practical track completion</div>
          </div>

          <div className="overview-card">
            <h3>Days until next</h3>
            <div className="overview-value">{daysUntilNextText}</div>
            <div className="overview-meta">{nextLesson ? 'next lesson set' : 'no lesson set'}</div>
          </div>
        </div>
      </div>

      <div className="dashboard-grid">
        <div className="dashboard-card next-lesson-card">
          <div className="card-header">
            <h2>Next Lesson</h2>
            <div className="clock-icon">🕐</div>
          </div>
          <div className="next-lesson-info">
            {loading ? (
              <div className="lesson-loading">Loading...</div>
            ) : nextLesson ? (
              <>
                <div className="lesson-course">{nextLesson.lessonType === 'practical' ? 'Practical Lesson' : 'Theory Class'}</div>
                <div className="lesson-title">{nextLesson.instructor ? `Instructor: ${nextLesson.instructor}` : 'Lesson details available soon'}</div>
                <div className="lesson-date">
                  {new Date(nextLesson.date).toLocaleDateString('en-US', { timeZone: 'Asia/Manila', month: 'short', day: 'numeric' }).toUpperCase()} | {nextLesson.time || 'TBA'}
                </div>
                <div className="lesson-topics">Topics: controls, mirrors, seat adjustment, safety checks</div>
                <button className="lesson-action-btn" type="button">View lesson details ↗</button>
              </>
            ) : (
              <>
                <div className="lesson-date">No upcoming lessons</div>
                <div className="lesson-topics">Book a lesson to start your practical track.</div>
              </>
            )}
          </div>
        </div>

        <div className="dashboard-card course-progress-card">
          <div className="card-header">
            <h2>Course Progress</h2>
          </div>
          <div className="progress-placeholder practical-progress-list">
            {practicalCourseProgress.length > 0 && completedCourseCount < totalCourses ? (
              <>
                <div className="practical-progress-header">
                  <span>Progress</span>
                  <span>{completedCourseCount}/{totalCourses} completed</span>
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
            ) : completedCourseCount === totalCourses ? (
              <div className="notification-empty-state">🎉 All courses completed!</div>
            ) : (
              <div className="notification-empty-state">No practical lessons booked yet.</div>
            )}
          </div>
        </div>
      </div>

      <div className="dashboard-bottom-grid">
        <div className="dashboard-card study-tip-card">
          <div className="card-header">
            <h2>Study Tip</h2>
          </div>
          <div className="study-tip-content">
            <p className="study-tip-title">Before your first lesson</p>
            <p>Review the LTO student driver's guide. Familiarize yourself with dashboard symbols and basic car parts — it'll give you a head start in Vehicle Basics.</p>
          </div>
        </div>

        <div className="dashboard-card notifications-card">
          <div className="card-header">
            <h2>Recent Notifications</h2>
          </div>
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
      </div>
    </div>
  );
}

export default UserDashboard;