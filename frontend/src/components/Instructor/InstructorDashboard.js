import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AlertCircle, ArrowRight, ArrowUpRight, Bell, BookOpen, CalendarDays, CalendarOff, CalendarPlus, CarFront, Check, ChevronRight, Clock3, Coffee, Info, LoaderCircle, LockKeyhole, Mail, Plus, RefreshCw, Save, ShieldCheck, Trash2, Users } from 'lucide-react';
import { ConfirmationDialog, EmptyState, SectionHeading } from './InstructorUI';
import { useAuth } from '../../contexts/AuthContext';
import { databases, databaseId, bookingsCollectionId, instructorSchedulesCollectionId, account } from '../../appwrite/config';
import { Query, ID } from 'appwrite';
import { ensureMyInstructorProfile, fetchMyAssignedUsers } from '../../utils/instructorAssignmentApi';
import './InstructorPages.css';

function InstructorDashboard() {
  const { currentUser } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [instructorName, setInstructorName] = useState('Instructor');
  const [loading, setLoading] = useState(true);
  const [bookings, setBookings] = useState([]);
  const [assignedUsers, setAssignedUsers] = useState([]);
  const [assignedUsersLoading, setAssignedUsersLoading] = useState(true);
  const [assignedUsersRefreshing, setAssignedUsersRefreshing] = useState(false);
  const [assignedUsersError, setAssignedUsersError] = useState('');
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
  const [showSaveBreaksModal, setShowSaveBreaksModal] = useState(false);
  const [showSaveLeavesModal, setShowSaveLeavesModal] = useState(false);
  const [showSaveHoursModal, setShowSaveHoursModal] = useState(false);
  const [showSaveSettingsModal, setShowSaveSettingsModal] = useState(false);

  const activeTab = searchParams.get('tab') || 'dashboard';

  useEffect(() => {
    if (!currentUser) return undefined;

    let cancelled = false;
    const loadDashboard = async () => {
      setLoading(true);
      const instructor = await fetchInstructorData();
      if (cancelled) return;
      await Promise.all([fetchBookings(instructor.name), fetchScheduleSettings(), fetchAssignedUsers()]);
      if (!cancelled) setLoading(false);
    };

    loadDashboard();
    loadCancelledNotifications();

    const refreshAssignedUsers = () => fetchAssignedUsers();
    const refreshInterval = window.setInterval(refreshAssignedUsers, 30000);
    window.addEventListener('focus', refreshAssignedUsers);

    return () => {
      cancelled = true;
      window.clearInterval(refreshInterval);
      window.removeEventListener('focus', refreshAssignedUsers);
    };
    // Dashboard data is loaded once per authenticated account; callbacks intentionally capture that account.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser]);

  const fetchInstructorData = async () => {
    try {
      const instructor = await ensureMyInstructorProfile();
      const name = instructor?.name || currentUser.name || currentUser.email?.split('@')[0] || 'Instructor';
      setInstructorName(name);
      return { id: instructor?.id || '', name };
    } catch (error) {
      console.error('Error fetching instructor data:', error);
      const name = currentUser.name || currentUser.email?.split('@')[0] || 'Instructor';
      setInstructorName(name);
      return { id: '', name };
    }
  };

  const fetchBookings = async (name = instructorName) => {
    try {
      const response = await databases.listDocuments(
        databaseId,
        bookingsCollectionId,
        [Query.equal('instructor', name)]
      );
      setBookings(response.documents);
    } catch (error) {
      console.error('Error fetching bookings:', error);
      setBookings([]);
    }
  };

  const fetchAssignedUsers = async () => {
    setAssignedUsersRefreshing(true);
    try {
      const users = await fetchMyAssignedUsers();
      setAssignedUsers(users);
      setAssignedUsersError('');
    } catch (error) {
      console.error('Error fetching assigned users:', error);
      setAssignedUsersError(error.message || 'Could not load assigned users.');
    } finally {
      setAssignedUsersLoading(false);
      setAssignedUsersRefreshing(false);
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
        instructorId: currentUser.$id,
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

  const goToTab = (tab) => setSearchParams(tab === 'dashboard' ? {} : { tab });
  const pageDetails = {
    dashboard: ['My dashboard', 'A clear view of your lessons, students, and availability.'],
    schedule: ['My schedule', 'Stay on top of your upcoming lessons and student bookings.'],
    hours: ['Working hours', 'Set your weekly availability for driving lessons.'],
    breaks: ['Breaks', 'Make room in your schedule to pause and recharge.'],
    leaves: ['Leaves', 'Plan your time away and manage your leave dates.'],
    notifications: ['Slot alerts', 'Keep track of lesson slots opened by cancellations.'],
    settings: ['Account settings', 'Manage your instructor account and keep it secure.']
  };
  const currentTab = pageDetails[activeTab] ? activeTab : 'dashboard';
  const [pageTitle, pageDescription] = pageDetails[currentTab];
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' });
  const todayCount = bookings.filter((booking) => booking.date === today).length;
  const activeDays = Object.values(workingHours).filter((hours) => !hours.off).length;
  const formatDate = (date) => new Date(`${String(date).slice(0, 10)}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const formatTime = (time) => {
    if (!time) return '--';
    const [hours, minutes] = time.split(':');
    return `${Number(hours) % 12 || 12}:${minutes} ${Number(hours) >= 12 ? 'PM' : 'AM'}`;
  };

  const lessonTable = (preview = false) => (
    <section className="ins-card">
      <SectionHeading
        icon={CalendarDays}
        title="Upcoming lessons"
        description={preview ? 'Your next lessons, all in one place.' : 'Your scheduled lessons, ordered by date and time.'}
        action={preview ? <button type="button" className="ins-text-button" onClick={() => goToTab('schedule')}>View schedule <ArrowUpRight size={16} aria-hidden="true" /></button> : <span className="ins-count">{upcomingSchedule.length} lessons</span>}
      />
      {loading ? (
        <div className="ins-loading" role="status"><LoaderCircle className="ins-spin" size={22} aria-hidden="true" />Loading your schedule...</div>
      ) : upcomingSchedule.length === 0 ? (
        <EmptyState icon={CalendarDays} title="Your schedule is clear" description="Upcoming lessons will appear here when a student books a session with you." />
      ) : (
        <div className="ins-table-scroll" tabIndex={0} role="region" aria-label="Upcoming lessons">
          <table className="ins-table">
            <thead><tr><th scope="col">Date & time</th><th scope="col">Student</th><th scope="col">Lesson</th>{!preview && <th scope="col">Vehicle</th>}<th scope="col">Status</th></tr></thead>
            <tbody>
              {(preview ? upcomingSchedule.slice(0, 5) : upcomingSchedule).map((booking) => (
                <tr key={booking.$id}>
                  <td><strong>{formatDate(booking.date)}</strong><span className="ins-cell-sub"><Clock3 size={12} aria-hidden="true" />{booking.time}</span></td>
                  <td><span className="ins-student-cell"><span className="ins-small-avatar" aria-hidden="true">{(booking.userName || 'S').trim().charAt(0).toUpperCase()}</span><strong>{booking.userName || 'Student'}</strong></span></td>
                  <td><span className="ins-lesson-type">{booking.lessonType === 'practical' ? <CarFront size={15} aria-hidden="true" /> : <BookOpen size={15} aria-hidden="true" />}{booking.lessonType === 'practical' ? 'Behind-the-wheel' : 'Theory'}</span></td>
                  {!preview && <td>{booking.vehicle || 'Not assigned'}</td>}
                  <td><span className={`ins-status ins-status--${String(booking.status || 'pending').toLowerCase()}`}><span aria-hidden="true" />{booking.status || 'Pending'}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {preview && upcomingSchedule.length > 5 && <div className="ins-card-footnote">Showing 5 of {upcomingSchedule.length} upcoming lessons</div>}
    </section>
  );

  const assignedStudents = (
    <section className="ins-card">
      <SectionHeading icon={Users} title="Assigned students" description="The students learning with you."
        action={<button type="button" className="ins-button ins-button--secondary ins-button--small" onClick={fetchAssignedUsers} disabled={assignedUsersRefreshing}><RefreshCw size={14} className={assignedUsersRefreshing ? 'ins-spin' : ''} aria-hidden="true" />{assignedUsersRefreshing ? 'Refreshing...' : 'Refresh'}</button>}
      />
      {assignedUsersLoading ? (
        <div className="ins-loading" role="status"><LoaderCircle className="ins-spin" size={22} aria-hidden="true" />Loading your students...</div>
      ) : assignedUsersError ? (
        <div className="ins-feedback ins-feedback--error" role="alert"><AlertCircle size={18} aria-hidden="true" /><span>{assignedUsersError}</span></div>
      ) : assignedUsers.length === 0 ? (
        <EmptyState icon={Users} compact title="Ready for your next student" description="Students will appear here once they're assigned to you." />
      ) : (
        <div className="ins-students-grid">
          {assignedUsers.map((student) => (
            <article key={student.id} className="ins-student-card">
              {student.profileImageUrl ? <img className="ins-avatar" src={student.profileImageUrl} alt="" /> : <span className="ins-avatar" aria-hidden="true">{(student.name || 'S').trim().charAt(0).toUpperCase()}</span>}
              <div><h3>{student.name}</h3><p>{student.email}</p>{student.phoneNumber && <p>{student.phoneNumber}</p>}</div>
            </article>
          ))}
        </div>
      )}
    </section>
  );

  return (
    <main className={`instructor-main-content ins-workspace${currentTab === 'dashboard' ? ' ins-workspace--dashboard' : ''}`} id="instructor-main">
      <header className="ins-page-header">
        <div><div className="ins-breadcrumb">Instructor portal <ChevronRight size={13} aria-hidden="true" /><span>{pageTitle}</span></div><h1>{pageTitle}</h1><p>{pageDescription}</p></div>
        <div className="ins-date"><CalendarDays size={17} strokeWidth={1.7} aria-hidden="true" /><span>{new Date().toLocaleDateString('en-US', { timeZone: 'Asia/Manila', weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</span></div>
      </header>

      {currentTab === 'dashboard' && (
        <>
          <section className="ins-welcome">
            <div className="ins-welcome-copy"><span className="ins-eyebrow">YOUR INSTRUCTOR WORKSPACE</span><h2>Welcome back, {instructorName.split(' ')[0]}.</h2><p>{todayCount > 0 ? `You have ${todayCount} ${todayCount === 1 ? 'lesson' : 'lessons'} booked for today. Let's make every session count.` : 'A little planning goes a long way. Get ready for the road ahead.'}</p><button type="button" className="ins-button ins-button--white" onClick={() => goToTab('schedule')}>View my schedule <ArrowRight size={16} aria-hidden="true" /></button></div>
            <div className="ins-welcome-art" aria-hidden="true"><div className="ins-art-orbit ins-art-orbit--outer" /><div className="ins-art-orbit ins-art-orbit--inner" /><div className="ins-art-icon"><CarFront size={56} strokeWidth={1.2} /></div><span className="ins-art-dot" /><span className="ins-art-label"><Check size={14} />Ready for the road</span></div>
          </section>
          <div className="ins-stats">
            {[
              { label: "Today's lessons", value: todayCount, detail: 'Booked for today', icon: CalendarDays, color: 'blue' },
              { label: 'Upcoming lessons', value: upcomingSchedule.length, detail: 'On your schedule', icon: BookOpen, color: 'teal' },
              { label: 'Assigned students', value: assignedUsers.length, detail: 'Learning with you', icon: Users, color: 'violet', pending: assignedUsersLoading },
              { label: 'Slot alerts', value: cancelledNotifications.length, detail: 'From cancellations', icon: Bell, color: 'amber' }
            ].map(({ label, value, detail, icon: Icon, color, pending }) => (
              <article className="ins-stat" key={label}><div className="ins-stat-top"><h3>{label}</h3><span className={`ins-stat-icon ins-stat-icon--${color}`}><Icon size={19} strokeWidth={1.8} aria-hidden="true" /></span></div><strong className="ins-stat-value">{loading || pending ? <span className="ins-skeleton" aria-label="Loading" /> : String(value).padStart(2, '0')}</strong><p>{detail}</p></article>
            ))}
          </div>
          <div className="ins-dashboard-grid">
            <div className="ins-stack">{lessonTable(true)}{assignedStudents}</div>
            <aside className="ins-stack" aria-label="Availability and quick links">
              <section className="ins-card ins-week-card">
                <SectionHeading icon={Clock3} title="Your availability" description="Your regular teaching week" />
                <div className="ins-week-strip">{Object.entries(workingHours).map(([day, hours]) => <span key={day} className={hours.off ? 'ins-week-day ins-week-day--off' : 'ins-week-day'} title={`${day}: ${hours.off ? 'Day off' : `${formatTime(hours.start)} to ${formatTime(hours.end)}`}`}><span>{day.slice(0, 1).toUpperCase()}</span>{hours.off ? <span className="ins-day-dash">–</span> : <Check size={13} aria-hidden="true" />}</span>)}</div>
                <p className="ins-availability-copy"><strong>{activeDays} teaching days</strong> per week<span>Times follow your saved working hours.</span></p>
                <button type="button" className="ins-button ins-button--secondary ins-button--full" onClick={() => goToTab('hours')}>Manage working hours <ArrowRight size={15} aria-hidden="true" /></button>
              </section>
              <section className="ins-card ins-quick-card"><h2>Quick access</h2><p>Keep your week running smoothly.</p>{[{ tab: 'breaks', icon: Coffee, title: 'Manage breaks', text: 'Plan time between lessons' }, { tab: 'leaves', icon: CalendarOff, title: 'Plan time off', text: 'Manage your leave dates' }, { tab: 'notifications', icon: Bell, title: 'View slot alerts', text: 'Check available lesson slots' }].map(({ tab, icon: Icon, title, text }) => <button type="button" className="ins-quick-link" key={tab} onClick={() => goToTab(tab)}><span className="ins-quick-icon"><Icon size={18} strokeWidth={1.7} aria-hidden="true" /></span><span><strong>{title}</strong><small>{text}</small></span><ChevronRight size={16} aria-hidden="true" /></button>)}</section>
              <div className="ins-note"><ShieldCheck size={20} strokeWidth={1.6} aria-hidden="true" /><p>Great lessons start with a clear plan. Keep your availability up to date.</p></div>
            </aside>
          </div>
        </>
      )}

      {currentTab === 'schedule' && <div className="ins-stack">{lessonTable()}{assignedStudents}</div>}

      {currentTab === 'hours' && (
        <section className="ins-card">
          <SectionHeading icon={Clock3} title="Weekly availability" description="Choose the days and times you're available to teach." action={<span className="ins-count">{activeDays} active days</span>} />
          <div className="ins-info"><Info size={17} aria-hidden="true" /><p>All times are in Philippine Time (GMT+8). Turn off a day when you're unavailable.</p></div>
          <div className="ins-hours-list">
            {Object.entries(workingHours).map(([day, hours], index) => (
              <div key={day} className={`ins-hours-row ${hours.off ? 'ins-hours-row--off' : ''}`}>
                <div className="ins-day-name"><span className="ins-day-abbr">{day.slice(0, 3)}</span><strong>{day.charAt(0).toUpperCase() + day.slice(1)}</strong></div>
                <label className="ins-toggle"><input type="checkbox" checked={!hours.off} onChange={() => handleDayOffToggle(day)} aria-label={`${day} availability`} /><span className="ins-toggle-track" aria-hidden="true" /><span>{hours.off ? 'Day off' : 'Available'}</span></label>
                {hours.off ? <p className="ins-day-off"><CalendarOff size={16} aria-hidden="true" />No lessons on this day</p> : <div className="ins-hours-times"><label htmlFor={`start-${index}`}><span>Start time</span><input id={`start-${index}`} aria-label={`${day} start time`} type="time" value={hours.start} onChange={(event) => handleWorkingHourChange(day, 'start', event.target.value)} /></label><ArrowRight size={16} aria-hidden="true" /><label htmlFor={`end-${index}`}><span>End time</span><input id={`end-${index}`} aria-label={`${day} end time`} type="time" value={hours.end} onChange={(event) => handleWorkingHourChange(day, 'end', event.target.value)} /></label></div>}
              </div>
            ))}
          </div>
          <div className="ins-card-actions"><p>Changes apply after you save.</p><button type="button" className="ins-button ins-button--primary" onClick={handleSaveHours}><Save size={16} aria-hidden="true" />Save working hours</button></div>
        </section>
      )}

      {currentTab === 'breaks' && (
        <section className="ins-card">
          <SectionHeading icon={Coffee} title="Scheduled breaks" description="Set aside recurring time during your teaching week." action={<span className="ins-count">{breaks.length} {breaks.length === 1 ? 'break' : 'breaks'}</span>} />
          <div className="ins-info"><Info size={17} aria-hidden="true" /><p>Add a day, start time, and end time for each break. All times are in Philippine Time.</p></div>
          {breaks.length === 0 ? <EmptyState icon={Coffee} title="Room for a breather" description="Add your lunch break or a regular pause between lessons." /> : <div className="ins-breaks-list">{breaks.map((breakItem, index) => (
            <div key={breakItem.id} className="ins-break-row"><span className="ins-row-number">{String(index + 1).padStart(2, '0')}</span><div className="ins-break-fields"><label htmlFor={`break-day-${breakItem.id}`}><span>Day of the week</span><select id={`break-day-${breakItem.id}`} value={breakItem.day} onChange={(event) => handleBreakChange(breakItem.id, 'day', event.target.value)}>{['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map((day) => <option key={day} value={day}>{day.charAt(0).toUpperCase() + day.slice(1)}</option>)}</select></label><label htmlFor={`break-start-${breakItem.id}`}><span>Start time</span><input id={`break-start-${breakItem.id}`} type="time" value={breakItem.start} onChange={(event) => handleBreakChange(breakItem.id, 'start', event.target.value)} /></label><span className="ins-break-arrow" aria-hidden="true"><ArrowRight size={16} /></span><label htmlFor={`break-end-${breakItem.id}`}><span>End time</span><input id={`break-end-${breakItem.id}`} type="time" value={breakItem.end} onChange={(event) => handleBreakChange(breakItem.id, 'end', event.target.value)} /></label></div><button type="button" className="ins-icon-button ins-icon-button--danger" onClick={() => removeBreak(breakItem.id)} aria-label={`Remove break ${index + 1}`}><Trash2 size={17} aria-hidden="true" /></button></div>
          ))}</div>}
          <div className="ins-card-actions"><button type="button" className="ins-button ins-button--secondary" onClick={addBreak}><Plus size={17} aria-hidden="true" />Add break</button><button type="button" className="ins-button ins-button--primary" onClick={handleSaveBreaks}><Save size={16} aria-hidden="true" />Save breaks</button></div>
        </section>
      )}

      {currentTab === 'leaves' && (
        <div className="ins-leave-layout">
          <section className="ins-card"><SectionHeading icon={CalendarPlus} title="Add leave dates" description="Let your schedule reflect your time away." /><div className="ins-leave-form"><div className="ins-form-two"><label htmlFor="leave-start"><span>Start date</span><input id="leave-start" type="date" value={leaveForm.startDate} onChange={(event) => setLeaveForm({ ...leaveForm, startDate: event.target.value })} /></label><label htmlFor="leave-end"><span>End date</span><input id="leave-end" type="date" value={leaveForm.endDate} onChange={(event) => setLeaveForm({ ...leaveForm, endDate: event.target.value })} /></label></div><label htmlFor="leave-reason"><span>Reason <small>(optional)</small></span><input id="leave-reason" type="text" placeholder="e.g. Personal appointment or vacation" value={leaveForm.reason} onChange={(event) => setLeaveForm({ ...leaveForm, reason: event.target.value })} /></label><button type="button" className="ins-button ins-button--secondary" onClick={addLeave}><Plus size={16} aria-hidden="true" />Add leave</button><div className="ins-info"><Info size={17} aria-hidden="true" /><p>Add your dates to the list, then save your leaves to apply the changes.</p></div></div></section>
          <section className="ins-card"><SectionHeading icon={CalendarOff} title="Your leaves" description="A record of your planned time away." action={<span className="ins-count">{leaves.length} {leaves.length === 1 ? 'entry' : 'entries'}</span>} />{leaves.length === 0 ? <EmptyState icon={CalendarOff} title="No leave dates added" description="Your leave dates will appear here once you add them." /> : <div className="ins-leaves-list">{leaves.map((leave) => <article key={leave.id} className="ins-leave-row"><span className="ins-leave-icon"><CalendarOff size={19} aria-hidden="true" /></span><div><h3>{formatDate(leave.startDate)} <span>to</span> {formatDate(leave.endDate)}</h3><p>{leave.reason || 'No reason provided'}</p></div><button type="button" className="ins-icon-button ins-icon-button--danger" onClick={() => removeLeave(leave.id)} aria-label={`Remove leave starting ${formatDate(leave.startDate)}`}><Trash2 size={17} aria-hidden="true" /></button></article>)}</div>}<div className="ins-card-actions"><p>Save to apply your leave dates.</p><button type="button" className="ins-button ins-button--primary" onClick={handleSaveLeaves}><Save size={16} aria-hidden="true" />Save leaves</button></div></section>
        </div>
      )}

      {currentTab === 'notifications' && (
        <section className="ins-card"><SectionHeading icon={Bell} title="Available lesson slots" description="Slots made available when a student cancels a booking." action={<span className="ins-count">{cancelledNotifications.length} unreviewed</span>} />{cancelledNotifications.length === 0 ? <EmptyState icon={Bell} title="You're all caught up" description="When a cancelled lesson opens up a slot, you'll find the details here." /> : <div className="ins-alerts-list">{cancelledNotifications.map((notification, index) => <article key={index} className="ins-alert-row"><span className="ins-alert-icon"><CalendarDays size={21} aria-hidden="true" /></span><div className="ins-alert-copy"><span className="ins-status ins-status--available"><span aria-hidden="true" />Available slot</span><h3>{formatDate(notification.date)} <span>at {notification.time}</span></h3><p>{notification.studentName} <span aria-hidden="true">·</span> {notification.lessonType === 'practical' ? 'Behind-the-wheel' : 'Theory'} lesson</p></div><button type="button" className="ins-button ins-button--secondary" onClick={() => { alert('You can now accept this slot from ' + notification.studentName); setCancelledNotifications((prev) => prev.filter((_, i) => i !== index)); }}><Check size={16} aria-hidden="true" />Mark as reviewed</button></article>)}</div>}</section>
      )}

      {currentTab === 'settings' && (
        <div className="ins-settings-layout"><aside className="ins-card ins-account-card"><span className="ins-account-avatar" aria-hidden="true">{instructorName.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase()}</span><h2>{instructorName}</h2><span className="ins-account-role">Driving instructor</span><div className="ins-account-detail"><Mail size={17} aria-hidden="true" /><span>{currentUser?.email}</span></div><div className="ins-note"><ShieldCheck size={20} aria-hidden="true" /><p>Keep your account secure with a strong, unique password.</p></div></aside><section className="ins-card"><SectionHeading icon={LockKeyhole} title="Change password" description="Update the password you use to sign in to EasyDrive." /><form className="ins-password-form" onSubmit={(event) => { event.preventDefault(); setShowSaveSettingsModal(true); }}>{passwordMessage.text && <div className={`ins-feedback ins-feedback--${passwordMessage.type}`} role="status">{passwordMessage.type === 'success' ? <Check size={18} aria-hidden="true" /> : <AlertCircle size={18} aria-hidden="true" />}<span>{passwordMessage.text}</span></div>}<label htmlFor="current-password"><span>Current password</span><input id="current-password" type="password" autoComplete="current-password" value={passwordForm.currentPassword} onChange={(event) => setPasswordForm({ ...passwordForm, currentPassword: event.target.value })} placeholder="Enter your current password" required /></label><label htmlFor="new-password"><span>New password</span><input id="new-password" type="password" autoComplete="new-password" value={passwordForm.newPassword} onChange={(event) => setPasswordForm({ ...passwordForm, newPassword: event.target.value })} placeholder="Enter a new password" aria-describedby="password-hint" required /><small id="password-hint" className="ins-field-hint">Use at least 8 characters.</small></label><label htmlFor="confirm-password"><span>Confirm new password</span><input id="confirm-password" type="password" autoComplete="new-password" value={passwordForm.confirmPassword} onChange={(event) => setPasswordForm({ ...passwordForm, confirmPassword: event.target.value })} placeholder="Re-enter your new password" required /></label><div className="ins-card-actions"><span /><button type="submit" className="ins-button ins-button--primary"><LockKeyhole size={16} aria-hidden="true" />Change password</button></div></form></section></div>
      )}

      <footer className="ins-page-footer"><span>EasyDrive <span aria-hidden="true">/</span> Instructor portal</span><span><ShieldCheck size={13} aria-hidden="true" />Teach with confidence.</span></footer>
      {showSaveBreaksModal && <ConfirmationDialog title="Save your breaks?" description="Your break times will be updated with the changes you've made." onClose={() => setShowSaveBreaksModal(false)} onConfirm={confirmSaveBreaks} />}
      {showSaveLeavesModal && <ConfirmationDialog title="Save your leave dates?" description="Your leave dates will be updated with the changes you've made." onClose={() => setShowSaveLeavesModal(false)} onConfirm={confirmSaveLeaves} />}
      {showSaveHoursModal && <ConfirmationDialog title="Save your working hours?" description="Your weekly availability will be updated with the changes you've made." onClose={() => setShowSaveHoursModal(false)} onConfirm={confirmSaveHours} />}
      {showSaveSettingsModal && <ConfirmationDialog title="Change your password?" description="Use your new password the next time you sign in to EasyDrive." confirmLabel="Change password" onClose={() => setShowSaveSettingsModal(false)} onConfirm={confirmSaveSettings} />}
    </main>
  );
}

export default InstructorDashboard;
