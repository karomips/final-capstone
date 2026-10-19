import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Query } from 'appwrite';
import { ArrowLeft, CalendarDays, Plus } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { databases, databaseId, bookingsCollectionId } from '../../appwrite/config';
import './UserPages.css';
import './MySessions.css';

const PAGE_SIZE = 100;
const filters = [
  { value: 'all', label: 'All sessions' },
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' }
];
const statusLabels = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  scheduled: 'Scheduled',
  completed: 'Completed',
  cancelled: 'Cancelled'
};
const getStatus = (session) => String(session.status || 'pending').trim().toLowerCase();

const formatDate = (value) => {
  const date = value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime())
    ? date.toLocaleDateString('en-PH', {
        timeZone: 'Asia/Manila', month: 'short', day: 'numeric', year: 'numeric'
      })
    : 'Date to be assigned';
};

function MySessions() {
  const { currentUser } = useAuth();
  const userId = currentUser?.$id;
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    let isMounted = true;

    const fetchSessions = async () => {
      setLoading(true);
      setError('');
      setSessions([]);
      if (!userId) {
        setLoading(false);
        return;
      }

      try {
        const allSessions = [];
        let cursor;
        // Appwrite returns a limited page by default. Load the full session history.
        while (isMounted) {
          const queries = [
            Query.equal('userId', userId),
            Query.orderDesc('date'),
            Query.limit(PAGE_SIZE)
          ];
          if (cursor) queries.push(Query.cursorAfter(cursor));
          const response = await databases.listDocuments(databaseId, bookingsCollectionId, queries);
          if (!isMounted) return;
          allSessions.push(...response.documents);
          if (response.documents.length < PAGE_SIZE) break;
          cursor = response.documents[response.documents.length - 1].$id;
        }
        if (isMounted) setSessions(allSessions);
      } catch (err) {
        if (isMounted) setError('We could not load your sessions. Please try again.');
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchSessions();
    return () => { isMounted = false; };
  }, [userId, retryCount]);

  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' });
  const matchesFilter = (session, value) => {
    const status = getStatus(session);
    if (value === 'all') return true;
    if (value === 'upcoming') {
      return String(session.date || '').slice(0, 10) >= today
        && status !== 'completed' && status !== 'cancelled';
    }
    return status === value;
  };
  const visibleSessions = sessions
    .filter((session) => matchesFilter(session, filter))
    .sort((a, b) => {
      const first = `${a.date || ''} ${a.time || ''}`;
      const second = `${b.date || ''} ${b.time || ''}`;
      return filter === 'upcoming' ? first.localeCompare(second) : second.localeCompare(first);
    });

  return (
    <main className="user-main-content sessions-page">
      <Link className="sessions-back-link" to="/user-dashboard">
        <ArrowLeft size={16} aria-hidden="true" /> Back to dashboard
      </Link>
      <header className="sessions-page-header">
        <div>
          <h1 className="page-title">My Sessions</h1>
          <p className="page-subtitle-muted">View your lesson schedule and session history. All times are in Philippine time.</p>
        </div>
        <Link className="sessions-book-link" to="/book-lesson">
          <Plus size={17} aria-hidden="true" /> Book a lesson
        </Link>
      </header>

      <section className="sessions-panel" aria-label="Your lesson sessions" aria-busy={loading}>
        <div className="sessions-filters" role="group" aria-label="Filter sessions">
          {filters.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              className={`sessions-filter ${filter === value ? 'is-active' : ''}`}
              aria-pressed={filter === value}
              onClick={() => setFilter(value)}
            >
              {label}
              {!loading && !error && <span>{sessions.filter((session) => matchesFilter(session, value)).length}</span>}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="sessions-message" role="status">Loading your sessions...</div>
        ) : error ? (
          <div className="sessions-message" role="alert">
            <p>{error}</p>
            <button className="sessions-retry" type="button" onClick={() => setRetryCount((count) => count + 1)}>Try again</button>
          </div>
        ) : visibleSessions.length === 0 ? (
          <div className="sessions-message" role="status">
            <CalendarDays size={32} aria-hidden="true" />
            <h2>{sessions.length === 0 ? 'No sessions booked yet' : `No ${filter} sessions`}</h2>
            <p>{sessions.length === 0 ? 'Book your first lesson to see your sessions here.' : 'Choose another filter to view your other sessions.'}</p>
            {sessions.length === 0 && <Link className="sessions-book-link" to="/book-lesson">Book a lesson</Link>}
          </div>
        ) : (
          <div className="sessions-table-wrap" tabIndex={0} role="region" aria-label="Session details">
            <table className="sessions-table" role="table">
              <caption className="sessions-caption">{visibleSessions.length} {visibleSessions.length === 1 ? 'session' : 'sessions'} shown</caption>
              <thead>
                <tr role="row">
                  <th scope="col">Date &amp; time</th>
                  <th scope="col">Lesson</th>
                  <th scope="col">Instructor</th>
                  <th scope="col">Vehicle</th>
                  <th scope="col">Status</th>
                </tr>
              </thead>
              <tbody>
                {visibleSessions.map((session) => {
                  const status = getStatus(session);
                  const statusLabel = statusLabels[status];
                  return (
                    <tr key={session.$id} role="row">
                      <td className="sessions-cell-date" role="cell"><strong>{formatDate(session.date)}</strong><span className="sessions-time">{session.time || 'Time to be assigned'}</span></td>
                      <td className="sessions-cell-lesson" role="cell">{session.lessonType === 'practical' ? 'Practical driving' : session.lessonType === 'theory' ? 'Theoretical classroom' : 'Driving lesson'}</td>
                      <td className="sessions-cell-instructor" role="cell" data-label="Instructor">{session.instructor || 'To be assigned'}</td>
                      <td className="sessions-cell-vehicle" role="cell" data-label="Vehicle">{session.lessonType === 'theory' ? 'Not required' : session.vehicle || 'To be assigned'}</td>
                      <td className="sessions-cell-status" role="cell"><span className={`sessions-status sessions-status--${statusLabel ? status : 'other'}`}>{statusLabel || session.status}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}

export default MySessions;
