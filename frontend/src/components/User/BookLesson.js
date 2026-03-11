import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { databases, databaseId, bookingsCollectionId, usersCollectionId, vehiclesCollectionId, instructorsCollectionId } from '../../appwrite/config';
import { ID, Query } from 'appwrite';
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
  const [instructors, setInstructors] = useState([]);
  const [vehicles, setVehicles] = useState([]);

  const checkUserApproval = useCallback(async () => {
    try {
      const userDoc = await databases.getDocument(
        databaseId,
        usersCollectionId,
        currentUser.$id
      );
      setIsApproved(userDoc.approved || false);
      // Clear any previous approval-related errors
      if (userDoc.approved) {
        setError('');
      }
    } catch (error) {
      console.error('Error checking approval:', error);
      setIsApproved(false);
    } finally {
      setCheckingApproval(false);
    }
  }, [currentUser]);

  const fetchInstructors = useCallback(async () => {
    try {
      // Fetch all available instructors
      const response = await databases.listDocuments(
        databaseId,
        instructorsCollectionId,
        [Query.equal('availability', 'available')]
      );
      
      // Filter by lesson type: either specific type or "both"
      const filteredInstructors = response.documents.filter(instructor => {
        if (!instructor.lessonType) return true; // Backwards compatibility for old records
        return instructor.lessonType === selectedLesson || instructor.lessonType === 'both';
      });
      
      setInstructors(filteredInstructors);
    } catch (error) {
      console.error('Error fetching instructors:', error);
      setInstructors([]);
    }
  }, [selectedLesson]);

  const fetchVehicles = useCallback(async () => {
    try {
      const response = await databases.listDocuments(
        databaseId,
        vehiclesCollectionId,
        [Query.equal('status', 'available')]
      );
      setVehicles(response.documents);
    } catch (error) {
      console.error('Error fetching vehicles:', error);
      setVehicles([]);
    }
  }, []);

  useEffect(() => {
    if (currentUser) {
      checkUserApproval();
      fetchInstructors();
      fetchVehicles();
    }
  }, [currentUser, checkUserApproval, fetchInstructors, fetchVehicles]);

  // Re-fetch instructors when lesson type changes
  useEffect(() => {
    if (currentUser) {
      fetchInstructors();
    }
  }, [selectedLesson, currentUser, fetchInstructors]);

  // Re-check approval when component gains focus
  useEffect(() => {
    const handleFocus = () => {
      if (currentUser) {
        checkUserApproval();
      }
    };
    
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [currentUser, checkUserApproval]);

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
    if (!instructor || !date || !time) {
      setError('Please fill in all fields');
      return;
    }
    
    // Only require vehicle for practical lessons
    if (selectedLesson === 'practical' && !vehicle) {
      setError('Please select a vehicle for practical lesson');
      return;
    }
    
    setLoading(true);
    
    try {
      // Create booking in database
      console.log('Creating booking with date:', date);
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
          vehicle: selectedLesson === 'theory' ? 'N/A' : vehicle,
          date: date,
          time: time,
          status: 'pending',
          createdAt: new Date().toISOString()
        }
      );
      console.log('Booking created successfully with date:', date);

      // Update instructor availability to "booked"
      try {
        // Find the instructor by name
        const instructorQuery = await databases.listDocuments(
          databaseId,
          instructorsCollectionId,
          [Query.equal('name', instructor)]
        );
        
        if (instructorQuery.documents.length > 0) {
          const instructorDoc = instructorQuery.documents[0];
          await databases.updateDocument(
            databaseId,
            instructorsCollectionId,
            instructorDoc.$id,
            { availability: 'booked' }
          );
        }
      } catch (error) {
        console.error('Error updating instructor availability:', error);
        // Don't fail the booking if instructor update fails
      }

      // Update vehicle status to "booked" only for practical lessons
      if (selectedLesson === 'practical' && vehicle) {
        try {
          // Extract vehicle model from the vehicle string (format: "Model (MT/AT) - PlateNumber")
          const vehicleModel = vehicle.split(' (')[0];
          const vehicleQuery = await databases.listDocuments(
            databaseId,
            vehiclesCollectionId,
            [Query.equal('model', vehicleModel)]
          );
          
          if (vehicleQuery.documents.length > 0) {
            const vehicleDoc = vehicleQuery.documents[0];
            await databases.updateDocument(
              databaseId,
              vehiclesCollectionId,
              vehicleDoc.$id,
              { status: 'booked' }
            );
          }
        } catch (error) {
          console.error('Error updating vehicle status:', error);
          // Don't fail the booking if vehicle update fails
        }
      }
      
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
        <h1 className="page-title">Book a Lesson - User Side</h1>

        {!isApproved && !checkingApproval && (
          <div style={{background: '#fee2e2', padding: '15px', borderRadius: '8px', marginBottom: '20px', color: '#991b1b', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
            <span>Your account is pending approval. Please wait for admin confirmation before booking lessons.</span>
            <button 
              onClick={() => checkUserApproval()} 
              style={{
                background: '#dc2626', 
                color: 'white', 
                border: 'none', 
                padding: '8px 16px', 
                borderRadius: '6px', 
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500'
              }}
            >
              ↻ Refresh Status
            </button>
          </div>
        )}

        {error && <div style={{background: '#fee', padding: '15px', borderRadius: '8px', marginBottom: '20px', color: '#c00'}}>{error}</div>}
        {success && <div style={{background: '#efe', padding: '15px', borderRadius: '8px', marginBottom: '20px', color: '#060'}}>{success}</div>}

        <div className="booking-layout">
          {/* Lesson Type Section */}
          <div className="booking-section">
            <h2 className="section-title">Lesson Type</h2>
            <div className="lesson-type-cards">
              <div 
                className={`lesson-card ${selectedLesson === 'practical' ? 'active' : ''}`}
                onClick={() => {
                  setSelectedLesson('practical');
                  setInstructor(''); // Clear instructor selection when changing lesson type
                }}
              >
                <div className="lesson-icon">🚗</div>
                <h3>Practical Lesson</h3>
                <p>2-hour on-road instruction.<br />Vehicle options available.</p>
              </div>
              <div 
                className={`lesson-card ${selectedLesson === 'theory' ? 'active' : ''}`}
                onClick={() => {
                  setSelectedLesson('theory');
                  setInstructor(''); // Clear instructor selection when changing lesson type
                  setVehicle(''); // Clear vehicle selection for theory class
                }}
              >
                <div className="lesson-icon">📖</div>
                <h3>Theory Class</h3>
                <p>4-hour classroom instruction.<br />All materials provided.</p>
              </div>
            </div>
          </div>

          {/* Instructor & Vehicle Section */}
          <div className="booking-section">
            <h2 className="section-title">{selectedLesson === 'theory' ? 'Instructor' : 'Instructor & Vehicle'}</h2>
            <div className="form-group">
              <label>Instructor Name*</label>
              <select 
                value={instructor} 
                onChange={(e) => setInstructor(e.target.value)}
                className="booking-select"
              >
                <option value="">Select Instructor</option>
                {instructors.length === 0 ? (
                  <option disabled>No available instructors</option>
                ) : (
                  instructors.map((inst) => (
                    <option key={inst.$id} value={inst.name}>
                      {inst.name} - {inst.certifications}
                    </option>
                  ))
                )}
              </select>
            </div>
            {selectedLesson === 'practical' && (
              <div className="form-group">
                <label>Vehicle Model*</label>
                <select 
                  value={vehicle} 
                  onChange={(e) => setVehicle(e.target.value)}
                  className="booking-select"
                >
                  <option value="">Select Vehicle</option>
                  {vehicles.length === 0 ? (
                    <option disabled>No available vehicles</option>
                  ) : (
                    vehicles.map((veh) => (
                      <option key={veh.$id} value={`${veh.model} (${veh.transmission})`}>
                        {veh.model} ({veh.transmission}) - {veh.plateNumber}
                      </option>
                    ))
                  )}
                </select>
              </div>
            )}
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
