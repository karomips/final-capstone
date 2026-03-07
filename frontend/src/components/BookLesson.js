import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { databases, databaseId, bookingsCollectionId, usersCollectionId } from '../appwrite/config';
import { ID } from 'appwrite';
import './UserPages.css';

function BookLesson() {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const [selectedLesson, setSelectedLesson] = useState('practical');
  const [instructor, setInstructor] = useState('');
  const [vehicle, setVehicle] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [isApproved, setIsApproved] = useState(false);
  const [checkingApproval, setCheckingApproval] = useState(true);

  useEffect(() => {
    checkUserApproval();
  }, [currentUser]);

  const checkUserApproval = async () => {
    try {
      const userDoc = await databases.getDocument(
        databaseId,
        usersCollectionId,
        currentUser.$id
      );
      setIsApproved(userDoc.approved || false);
    } catch (error) {
      console.error('Error checking approval:', error);
      setIsApproved(false);
    } finally {
      setCheckingApproval(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const handleConfirmBooking = async () => {
    setError('');
    setSuccess('');

    // Check if user is approved
    if (!isApproved) {
      setError('Your account is pending approval. Please wait for admin confirmation before booking lessons.');
      return;
    }
    
    // Validation
    if (!instructor || !vehicle || !date || !time) {
      setError('Please fill in all fields');
      return;
    }
    
    setLoading(true);
    
    try {
      // Create booking in database
      await databases.createDocument(
        databaseId,
        bookingsCollectionId,
        ID.unique(),
        {
          userId: currentUser.$id,
          userName: currentUser.name || 'User',
          userEmail: currentUser.email,
          lessonType: selectedLesson,
          instructor: instructor,
          vehicle: vehicle,
          date: date,
          time: time,
          status: 'pending',
          createdAt: new Date().toISOString()
        }
      );
      
      setSuccess('Booking confirmed successfully!');
      // Reset form
      setInstructor('');
      setVehicle('');
      setDate('');
      setTime('');
      
      setTimeout(() => {
        navigate('/user-dashboard');
      }, 2000);
    } catch (error) {
      console.error('Booking error:', error);
      setError('Failed to create booking: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="user-page-container">
      {/* Sidebar */}
      <div className="user-sidebar">
        <div className="user-profile-section">
          <div className="user-profile-avatar">
            <img src="/api/placeholder/80/80" alt="Profile" />
          </div>
        </div>

        <div className="user-nav-buttons">
          <button 
            className="user-nav-btn"
            onClick={() => navigate('/user-dashboard')}
          >
            Dashboard
          </button>
          <button 
            className="user-nav-btn active"
            onClick={() => navigate('/book-lesson')}
          >
            Book a Lesson
          </button>
        </div>

        <button className="user-signout-btn" onClick={handleLogout}>
          Sign Out
        </button>
      </div>

      {/* Main Content */}
      <div className="user-main-content">
        <h1 className="page-title">Book a Lesson - User Side</h1>

        {error && <div style={{background: '#fee', padding: '15px', borderRadius: '8px', marginBottom: '20px', color: '#c00'}}>{error}</div>}
        {success && <div style={{background: '#efe', padding: '15px', borderRadius: '8px', marginBottom: '20px', color: '#060'}}>{success}</div>}

        <div className="booking-layout">
          {/* Lesson Type Section */}
          <div className="booking-section">
            <h2 className="section-title">Lesson Type</h2>
            <div className="lesson-type-cards">
              <div 
                className={`lesson-card ${selectedLesson === 'practical' ? 'active' : ''}`}
                onClick={() => setSelectedLesson('practical')}
              >
                <div className="lesson-icon">🚗</div>
                <h3>Practical Lesson</h3>
                <p>2-hour on-road instruction.<br />Vehicle options available.</p>
              </div>
              <div 
                className={`lesson-card ${selectedLesson === 'theory' ? 'active' : ''}`}
                onClick={() => setSelectedLesson('theory')}
              >
                <div className="lesson-icon">📖</div>
                <h3>Theory Class</h3>
                <p>4-hour classroom instruction.<br />All materials provided.</p>
              </div>
            </div>
          </div>

          {/* Instructor & Vehicle Section */}
          <div className="booking-section">
            <h2 className="section-title">Instructor & Vehicle</h2>
            <div className="form-group">
              <label>Instructor Name*</label>
              <select 
                value={instructor} 
                onChange={(e) => setInstructor(e.target.value)}
                className="booking-select"
              >
                <option value="">Select Instructor</option>
                <option value="John Martinez">John Martinez</option>
                <option value="Sarah Chen">Sarah Chen</option>
                <option value="Mike Johnson">Mike Johnson</option>
              </select>
            </div>
            <div className="form-group">
              <label>Vehicle Model*</label>
              <select 
                value={vehicle} 
                onChange={(e) => setVehicle(e.target.value)}
                className="booking-select"
              >
                <option value="">Select Vehicle</option>
                <option value="Toyota Corolla (MT)">Toyota Corolla (MT)</option>
                <option value="Honda Civic (AT)">Honda Civic (AT)</option>
                <option value="Mazda 3 (AT)">Mazda 3 (AT)</option>
              </select>
            </div>
          </div>

          {/* Date & Time Section */}
          <div className="booking-section">
            <h2 className="section-title">Date & Time</h2>
            <div className="datetime-inputs">
              <input 
                type="date" 
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="booking-input"
              />
              <input 
                type="time" 
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="booking-input"
              />
            </div>
          </div>

          {/* Booking Summary */}
          <div className="booking-summary">
            <h2 className="section-title">Booking Summary</h2>
            <p className="summary-text">
              You have selected a<br />
              <strong>{selectedLesson === 'practical' ? 'Practical Lesson' : 'Theory Class'}</strong> on {date || 'MM/DD/YYYY'}<br />
              @ {time || '00:00'} {time && (parseInt(time.split(':')[0]) >= 12 ? 'PM' : 'AM')}
            </p>
            <button 
              className="confirm-booking-btn"
              onClick={handleConfirmBooking}
              disabled={loading}
            >
              {loading ? 'BOOKING...' : 'CONFIRM BOOKING'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default BookLesson;
