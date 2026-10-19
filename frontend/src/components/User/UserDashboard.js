import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { databases, databaseId, bookingsCollectionId, usersCollectionId } from '../../appwrite/config';
import { Query } from 'appwrite';
import './UserPages.css';
import './UserDashboard.css';

// Safe property keys to isolate Appwrite dollar attributes
const ID_KEY = '$' + 'id';
const CREATED_KEY = '$' + 'createdAt';
const UPDATED_KEY = '$' + 'updatedAt';

function UserDashboard() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const [bookings, setBookings] = useState([]);
  const [smsNotifications, setSmsNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState('User');

  const practicalCoursePlan = [
    'Course 1: Vehicle Basics & Orientation',
    'Course 2: Road Positioning & Maneuvers',
    'Course 3: Defensive Traffic Navigation'
  ];

  const formatLessonDate = (dateValue) => {
    if (!dateValue) return 'TBA';
    try {
      return new Date(dateValue).toLocaleDateString('en-US', {
        timeZone: 'Asia/Manila',
        month: 'short',
        day: 'numeric'
      });
    } catch (e) {
      return 'TBA';
    }
  };

  const buildReminderSmsMessage = useCallback((booking, studentName) => {
    const lessonDate = formatLessonDate(booking && booking.date ? booking.date : '');
    const lessonTime = booking && booking.time ? booking.time : 'TBA';
    const instructor = booking && booking.instructor ? booking.instructor : 'Instructor';
    const reminderType = booking && booking.lessonType === 'theory' ? 'Theory class' : 'Driving lesson';

    return `${studentName}: Reminder - ${reminderType} scheduled for ${lessonDate} at ${lessonTime} with ${instructor}. -EasyDrive`;
  }, []);

  const getSmsNotifications = useCallback((userBookings, studentName) => {
    if (!Array.isArray(userBookings)) return [];
    const bookingNotificationMap = new Map();

    userBookings.forEach((booking) => {
      const hasReminder = Boolean(
        booking && (booking.reminderSmsSent || booking.autoReminderSent || booking.reminderSmsSentAt)
      );
      if (!hasReminder) return;

      let timestamp = booking.reminderSmsSentAt;
      if (!timestamp) {
        timestamp = booking[UPDATED_KEY];
      }
      if (!timestamp) {
        timestamp = booking[CREATED_KEY];
      }

      const bookingId = booking[ID_KEY] || String(Math.random());

      bookingNotificationMap.set(bookingId, {
        id: `${bookingId}-reminder`,
        type: 'Session Alert',
        message: buildReminderSmsMessage(booking, studentName),
        timestamp: timestamp || new Date().toISOString()
      });
    });

    return Array.from(bookingNotificationMap.values())
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 6);
  }, [buildReminderSmsMessage]);

  const getPracticalCourseProgress = (userBookings) => {
    if (!Array.isArray(userBookings)) return [];
    const practicalBookings = userBookings
      .filter((booking) => {
        const isPractical = booking && booking.lessonType === 'practical';
        const isNotCancelled = String(booking && booking.status ? booking.status : '').toLowerCase() !== 'cancelled';
        return isPractical && isNotCancelled;
      })
      .sort((a, b) => {
        const timeA = new Date(a && a.date ? a.date : 0).getTime();
        const timeB = new Date(b && b.date ? b.date : 0).getTime();
        return timeA - timeB;
      });

    if (practicalBookings.length === 0) {
      return practicalCoursePlan.map((courseName, index) => ({
        id: `course-${index + 1}`,
        courseName,
        status: 'pending',
        dateText: 'Awaiting booking'
      }));
    }

    const trackBookings = practicalBookings.slice(-3);

    return practicalCoursePlan.map((courseName, index) => {
      const booking = trackBookings[index];
      if (!booking) {
        return {
          id: `course-${index + 1}`,
          courseName,
          status: 'pending',
          dateText: 'Awaiting booking'
        };
      }

      const normalizedStatus = String(booking.status || 'pending').toLowerCase();
      const uiStatus = normalizedStatus === 'completed' ? 'completed' : 'scheduled';
      const bookingId = booking[ID_KEY] || `course-entry-${index}`;

      return {
        id: bookingId,
        courseName,
        status: uiStatus,
        dateText: `${formatLessonDate(booking.date).toUpperCase()} • ${booking.time || 'TBA'}`
      };
    });
  };

  const practicalCourseProgress = getPracticalCourseProgress(bookings);
  const completedCourseCount = practicalCourseProgress.filter((course) => course.status === 'completed').length;
  const totalCourses = practicalCoursePlan.length;
  const overallProgressPercent = totalCourses > 0 ? Math.round((completedCourseCount / totalCourses) * 100) : 0;

  const manilaTodayIso = new Date().toLocaleDateString('en-CA', {
    timeZone: 'Asia/Manila'
  });

  const upcomingSchedules = bookings
    .filter((booking) => {
      const bookingDate = String(booking && booking.date ? booking.date : '').trim();
      const notCompleted = String(booking && booking.status ? booking.status : '').toLowerCase() !== 'completed';
      return bookingDate >= manilaTodayIso && notCompleted;
    })
    .sort((a, b) => {
      const dateA = String(a && a.date ? a.date : '');
      const dateB = String(b && b.date ? b.date : '');
      const dateCompare = dateA.localeCompare(dateB);
      if (dateCompare !== 0) return dateCompare;
      const timeA = String(a && a.time ? a.time : '');
      const timeB = String(b && b.time ? b.time : '');
      return timeA.localeCompare(timeB);
    });

  const nextLesson = upcomingSchedules.find((booking) => {
    return String(booking && booking.status ? booking.status : '').toLowerCase() !== 'cancelled';
  });

  let daysUntilNextText = 'None';
  if (nextLesson && nextLesson.date) {
    const diffTime = new Date(nextLesson.date).getTime() - new Date().getTime();
    const days = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
    daysUntilNextText = days === 0 ? 'Today' : `${days} Days`;
  }

  useEffect(() => {
    let isMounted = true;

    const fetchUserData = async () => {
      const userId = currentUser ? currentUser[ID_KEY] : null;
      if (!userId) return;

      try {
        const usersResponse = await databases.listDocuments(
          databaseId,
          usersCollectionId
        );
        const user = usersResponse.documents.find((doc) => doc.email === currentUser.email);
        if (user && user.name && isMounted) {
          setUserName(user.name);
        }

        const response = await databases.listDocuments(
          databaseId,
          bookingsCollectionId,
          [
            Query.equal('userId', userId),
            Query.orderAsc('date')
          ]
        );

        if (isMounted) {
          const docs = response.documents || [];
          setBookings(docs);
          const studentName = user && user.name ? user.name : 'Student';
          setSmsNotifications(getSmsNotifications(docs, studentName));
        }
      } catch (err) {
        console.error('Error fetching user dashboard data:', err);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchUserData();

    return () => {
      isMounted = false;
    };
  }, [currentUser, getSmsNotifications]);

  return (
    <div className="user-main-content user-main-content--fit user-dashboard-page">
      {/* Hero Welcome Deck */}
      <section className="user-dashboard-hero">
        <div className="user-dashboard-hero-copy">
          <div className="user-dashboard-hero-eyebrow">
            <span className="live-status-pulse"></span> Practical Track Portal
          </div>
          <h1 className="user-dashboard-hero-title">Welcome back, {userName}!</h1>
          <p>
            Review your driving curriculum, check upcoming session schedules, and confirm appointments.
          </p>
        </div>
        <div className="user-dashboard-hero-actions">
          <button 
            className="user-dashboard-secondary-btn" 
            type="button" 
            onClick={() => navigate('/profile')}
          >
            Profile Details
          </button>
          <button 
            className="user-dashboard-primary-btn" 
            type="button" 
            onClick={() => navigate('/book-lesson')}
          >
            Book Next Lesson
          </button>
        </div>
      </section>

      {/* Telemetry Matrix */}
      <section className="dashboard-header">
        <div className="dashboard-overview">
          <div className="overview-card overview-card--active">
            <div className="overview-card-header">
              <h3>Curriculum Units</h3>
              <span className="overview-icon-circle">01</span>
            </div>
            <div className="overview-value">{completedCourseCount} of {totalCourses}</div>
            <div className="overview-meta">Units Completed</div>
          </div>

          <div className="overview-card">
            <div className="overview-card-header">
              <h3>Program Completion</h3>
              <span className="overview-icon-circle">02</span>
            </div>
            <div className="overview-value">{overallProgressPercent}%</div>
            <div className="custom-progress-track">
              <div 
                className="custom-progress-indicator" 
                style={{ width: `${Math.max(5, overallProgressPercent)}%` }}
              ></div>
            </div>
          </div>

          <div className="overview-card">
            <div className="overview-card-header">
              <h3>Next Session</h3>
              <span className="overview-icon-circle">03</span>
            </div>
            <div className="overview-value">{daysUntilNextText}</div>
            <div className="overview-meta">
              {nextLesson && nextLesson.time ? `${nextLesson.time} • Manila` : 'No pending bookings'}
            </div>
          </div>
        </div>
      </section>

      {/* Center Operational Grid */}
      <section className="dashboard-grid">
        {/* Next Lesson Focus Card */}
        <div className="dashboard-card next-lesson-card">
          <div className="card-header">
            <h2>Upcoming Instruction</h2>
            <span className="card-status-pill">Active</span>
          </div>

          <div className="next-lesson-info">
            {loading ? (
              <div className="lesson-loading-skeleton">Connecting to schedule records...</div>
            ) : nextLesson ? (
              <div className="lesson-content-block">
                <span className="lesson-course">
                  {nextLesson.lessonType === 'practical' ? 'Behind-the-Wheel Session' : 'Theoretical Classroom'}
                </span>
                <h3 className="lesson-title">
                  {nextLesson.instructor ? `Instructor: ${nextLesson.instructor}` : 'Instructor Assigned at Station'}
                </h3>
                <div className="lesson-date-badge">
                  {new Date(nextLesson.date).toLocaleDateString('en-US', { 
                    timeZone: 'Asia/Manila', 
                    month: 'short', 
                    day: 'numeric', 
                    year: 'numeric' 
                  }).toUpperCase()} • {nextLesson.time || 'TBA'}
                </div>
                <div className="lesson-topics">
                  Vehicle Assigned: <strong>{nextLesson.vehicle || 'Station Fleet Vehicle'}</strong>
                </div>
                <div className="lesson-card-actions">
                  <button 
                    className="lesson-action-btn" 
                    type="button"
                    onClick={() => navigate('/my-sessions')}
                  >
                    View All Sessions
                  </button>
                </div>
              </div>
            ) : (
              <div className="lesson-empty-panel">
                <p className="empty-title">Ready for your next milestone?</p>
                <p className="empty-desc">
                  Select an available instructor and reserve your vehicle to keep your course hours on track.
                </p>
                <button 
                  className="lesson-action-btn" 
                  type="button"
                  onClick={() => navigate('/book-lesson')}
                >
                  Reserve Date &amp; Time
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Milestone Tracker Card */}
        <div className="dashboard-card course-progress-card">
          <div className="card-header">
            <h2>Practical Milestones</h2>
            <span className="card-badge-counter">{completedCourseCount}/{totalCourses} Done</span>
          </div>

          <div className="practical-progress-list">
            {practicalCourseProgress.map((course, idx) => (
              <div key={course.id} className={`practical-course-item is-${course.status}`}>
                <div className="course-step-index">{idx + 1}</div>
                <div className="practical-course-text">
                  <span className="practical-course-name">{course.courseName}</span>
                  <span className="practical-course-date">{course.dateText}</span>
                </div>
                <span className={`practical-course-status ${course.status}`}>
                  {course.status === 'completed' ? 'Completed' : course.status === 'scheduled' ? 'Scheduled' : 'Queued'}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Bottom Telemetry & Tip Grid */}
      <section className="dashboard-bottom-grid">
        <div className="dashboard-card study-tip-card">
          <div className="card-header">
            <h2>Instructor Knowledge Check</h2>
            <span className="knowledge-tag">LTO Guide</span>
          </div>
          <div className="study-tip-content">
            <h4 className="study-tip-title">Mirror Calibration &amp; Blind Zones</h4>
            <p>
              Before engaging the ignition, set your rear-view mirror so the rear window is framed completely without tilting your head. Align side mirrors so just the edge of your car's rear handle is visible in the bottom-inside corner.
            </p>
          </div>
        </div>

        <div className="dashboard-card notifications-card">
          <div className="card-header">
            <h2>Dispatch Logs</h2>
            <span className="live-feed-dot"></span>
          </div>
          <div className="notifications-content">
            {loading ? (
              <div className="notification-empty-state">Loading dispatch history...</div>
            ) : smsNotifications.length > 0 ? (
              smsNotifications.map((notification) => (
                <div key={notification.id} className="notification-item">
                  <div className="notification-meta-row">
                    <span className="notification-type">{notification.type}</span>
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
                        : 'Recent'}
                    </span>
                  </div>
                  <p className="notification-message">{notification.message}</p>
                </div>
              ))
            ) : (
              <div className="notification-empty-state">
                No recent SMS reminders logged. Automated alerts dispatch 24 hours prior to your scheduled appointments.
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

export default UserDashboard;
