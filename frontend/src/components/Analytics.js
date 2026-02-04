import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '../firebase/config';
import './Analytics.css';

function Analytics({ userId, isAdmin = false }) {
  const [analytics, setAnalytics] = useState({
    total: 0,
    pending: 0,
    completed: 0,
    todayCompleted: 0,
    loading: true
  });

  useEffect(() => {
    fetchAnalytics();
  }, [userId]);

  const fetchAnalytics = async () => {
    try {
      const appointmentsRef = collection(db, 'appointments');
      
      // Query based on user role
      let q;
      if (isAdmin) {
        q = query(appointmentsRef);
      } else {
        q = query(appointmentsRef, where('userId', '==', userId));
      }

      const snapshot = await getDocs(q);
      const appointments = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Calculate today's date range
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayTimestamp = Timestamp.fromDate(today);

      // Calculate analytics
      const total = appointments.length;
      const pending = appointments.filter(apt => apt.status === 'pending').length;
      const completed = appointments.filter(apt => apt.status === 'completed').length;
      const todayCompleted = appointments.filter(apt => 
        apt.status === 'completed' && 
        apt.completedDate && 
        apt.completedDate.toDate() >= today
      ).length;

      setAnalytics({
        total,
        pending,
        completed,
        todayCompleted,
        loading: false
      });
    } catch (error) {
      console.error('Error fetching analytics:', error);
      setAnalytics(prev => ({ ...prev, loading: false }));
    }
  };

  if (analytics.loading) {
    return (
      <div className="analytics-container">
        <div className="analytics-loading">Loading analytics...</div>
      </div>
    );
  }

  return (
    <div className="analytics-container">
      <h2 className="analytics-title">
        {isAdmin ? 'System Analytics' : 'Your Appointments Overview'}
      </h2>
      
      <div className="analytics-grid">
        <div className="analytics-card total">
          <div className="analytics-icon">📊</div>
          <div className="analytics-content">
            <div className="analytics-value">{analytics.total}</div>
            <div className="analytics-label">Total Appointments</div>
          </div>
        </div>

        <div className="analytics-card pending">
          <div className="analytics-icon">⏳</div>
          <div className="analytics-content">
            <div className="analytics-value">{analytics.pending}</div>
            <div className="analytics-label">Pending Appointments</div>
          </div>
        </div>

        <div className="analytics-card completed">
          <div className="analytics-icon">✅</div>
          <div className="analytics-content">
            <div className="analytics-value">{analytics.completed}</div>
            <div className="analytics-label">Completed Appointments</div>
          </div>
        </div>

        <div className="analytics-card today">
          <div className="analytics-icon">📅</div>
          <div className="analytics-content">
            <div className="analytics-value">{analytics.todayCompleted}</div>
            <div className="analytics-label">Completed Today</div>
          </div>
        </div>
      </div>

      {analytics.total === 0 && (
        <div className="no-data-message">
          <p>No appointments data yet. Create your first appointment to see analytics!</p>
        </div>
      )}
    </div>
  );
}

export default Analytics;
