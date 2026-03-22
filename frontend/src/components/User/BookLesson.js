import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { databases, databaseId, bookingsCollectionId, usersCollectionId, vehiclesCollectionId, instructorsCollectionId } from '../../appwrite/config';
import { ID, Query } from 'appwrite';
import { CalendarDays, Clock3, ChevronLeft, ChevronRight } from 'lucide-react';
import './UserPages.css';
import EasyDriveLogo from '../../assets/EasyDriveLogo.png';

function BookLesson() {
  const THEORY_MIN_CAPACITY = 15;
  const THEORY_MAX_CAPACITY = 20;

  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [theme, setTheme] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('dashboardTheme');
      if (saved === 'dark' || saved === 'light') return saved;
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'light';
  });
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
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  const toIsoDate = (dateObject) => {
    const year = dateObject.getFullYear();
    const month = String(dateObject.getMonth() + 1).padStart(2, '0');
    const day = String(dateObject.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const parseIsoDate = (value) => {
    if (!value) return null;
    const parsed = new Date(`${value}T00:00:00`);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  };

  const addDays = (isoValue, numberOfDays) => {
    const parsed = parseIsoDate(isoValue);
    if (!parsed) return '';
    parsed.setDate(parsed.getDate() + numberOfDays);
    return toIsoDate(parsed);
  };

  const today = useMemo(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }, []);

  const weekLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  const calendarDays = useMemo(() => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    const firstDayOfMonth = new Date(year, month, 1);
    const startingOffset = (firstDayOfMonth.getDay() + 6) % 7;
    const numberOfDays = new Date(year, month + 1, 0).getDate();

    const grid = [];
    for (let i = 0; i < startingOffset; i += 1) {
      grid.push(null);
    }
    for (let day = 1; day <= numberOfDays; day += 1) {
      grid.push(new Date(year, month, day));
    }
    while (grid.length % 7 !== 0) {
      grid.push(null);
    }

    return grid;
  }, [calendarMonth]);

  const timeOptions = useMemo(() => {
    const options = [];
    const startMinutes = 7 * 60;
    const endMinutes = 19 * 60;

    for (let totalMinutes = startMinutes; totalMinutes <= endMinutes; totalMinutes += 10) {
      const hour = Math.floor(totalMinutes / 60);
      const minute = totalMinutes % 60;
      const value = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
      const label = new Date(2000, 0, 1, hour, minute).toLocaleTimeString([], {
        hour: 'numeric',
        minute: '2-digit'
      });
      options.push({ value, label });
    }

    return options;
  }, []);

  const isPastDate = (dateObject) => dateObject < today;

  const isSameDay = (dateA, dateB) => (
    dateA.getFullYear() === dateB.getFullYear() &&
    dateA.getMonth() === dateB.getMonth() &&
    dateA.getDate() === dateB.getDate()
  );

  const selectedDateObject = parseIsoDate(date);

  const practicalCourseDates = useMemo(() => {
    if (selectedLesson !== 'practical' || !date) return [];
    return [date, addDays(date, 1), addDays(date, 2)];
  }, [selectedLesson, date, addDays]);

  const formattedDateSummary = selectedDateObject
    ? selectedDateObject.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })
    : 'Select date';

  const formattedTimeSummary = time
    ? new Date(`1970-01-01T${time}:00`).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
    : 'Select time';

  const goToPreviousMonth = () => {
    setCalendarMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setCalendarMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const handleDatePick = (dayDate) => {
    if (!dayDate || isPastDate(dayDate)) return;
    setDate(toIsoDate(dayDate));
  };

  useEffect(() => {
    const body = document.body;
    if (theme === 'dark') {
      body.classList.add('dark-mode');
    } else {
      body.classList.remove('dark-mode');
    }
    localStorage.setItem('dashboardTheme', theme);
  }, [theme]);

  useEffect(() => {
    if (!selectedDateObject) return;
    setCalendarMonth(new Date(selectedDateObject.getFullYear(), selectedDateObject.getMonth(), 1));
  }, [date, selectedDateObject]);

  const getTheoryCapacity = (instructorDoc) => {
    const parsed = Number(instructorDoc?.theoryCapacity);
    if (Number.isFinite(parsed)) {
      return Math.min(Math.max(parsed, THEORY_MIN_CAPACITY), THEORY_MAX_CAPACITY);
    }
    return THEORY_MAX_CAPACITY;
  };

  const countActiveTheoryBookings = async (instructorName) => {
    const response = await databases.listDocuments(
      databaseId,
      bookingsCollectionId,
      [
        Query.equal('instructor', instructorName),
        Query.equal('lessonType', 'theory')
      ]
    );

    return response.documents.filter((bookingDoc) => {
      const status = String(bookingDoc.status || '').toLowerCase();
      return status !== 'completed' && status !== 'cancelled';
    }).length;
  };

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

      if (selectedLesson === 'theory') {
        const instructorsWithSlots = await Promise.all(
          filteredInstructors.map(async (inst) => {
            const capacity = getTheoryCapacity(inst);
            const activeTheoryBookings = await countActiveTheoryBookings(inst.name);
            const remainingSlots = Math.max(0, capacity - activeTheoryBookings);

            return {
              ...inst,
              theoryCapacity: capacity,
              theoryActiveBookings: activeTheoryBookings,
              theoryRemainingSlots: remainingSlots
            };
          })
        );

        setInstructors(instructorsWithSlots.filter((inst) => inst.theoryRemainingSlots > 0));
      } else {
        setInstructors(filteredInstructors);
      }
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

  const toggleTheme = () => {
    setTheme((prevTheme) => (prevTheme === 'dark' ? 'light' : 'dark'));
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
      let selectedInstructorDoc = null;
      let theoryCapacity = THEORY_MAX_CAPACITY;
      let activeTheoryBookings = 0;

      if (selectedLesson === 'theory') {
        selectedInstructorDoc = instructors.find((inst) => inst.name === instructor) || null;
        theoryCapacity = getTheoryCapacity(selectedInstructorDoc);
        activeTheoryBookings = await countActiveTheoryBookings(instructor);

        if (activeTheoryBookings >= theoryCapacity) {
          setError('This instructor has reached the theory class capacity. Please select another instructor.');
          await fetchInstructors();
          setLoading(false);
          return;
        }
      }

      const bookingDates = selectedLesson === 'practical' ? practicalCourseDates : [date];

      // Create booking document(s) in database
      for (const bookingDate of bookingDates) {
        console.log('Creating booking with date:', bookingDate);
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
            date: bookingDate,
            time: time,
            status: 'pending',
            createdAt: new Date().toISOString()
          }
        );
      }
      console.log('Booking created successfully for dates:', bookingDates);

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
          // Practical lessons lock instructor immediately.
          // Theory lessons allow multiple active bookings until reaching capacity.
          if (selectedLesson === 'practical') {
            await databases.updateDocument(
              databaseId,
              instructorsCollectionId,
              instructorDoc.$id,
              { availability: 'booked' }
            );
          } else {
            const shouldMarkUnavailable = activeTheoryBookings + 1 >= theoryCapacity;
            if (shouldMarkUnavailable) {
              await databases.updateDocument(
                databaseId,
                instructorsCollectionId,
                instructorDoc.$id,
                { availability: 'booked' }
              );
            }
          }
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
      
      setSuccess(
        selectedLesson === 'practical'
          ? 'Practical booking confirmed for 3 consecutive course days!'
          : 'Booking confirmed successfully!'
      );
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

        <button className="user-theme-toggle-btn" onClick={toggleTheme}>
          {theme === 'dark' ? ' Light Mode' : ' Dark Mode'}
        </button>

        <button className="user-signout-btn" onClick={handleLogout}>
          Sign Out
        </button>
      </div>

      {/* Main Content */}
      <div className="user-main-content">
        <h1 className="page-title">Book a Lesson</h1>

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
                      {selectedLesson === 'theory'
                        ? `${inst.name} - ${inst.certifications} (${inst.theoryRemainingSlots}/${inst.theoryCapacity} booking slots left)`
                        : `${inst.name} - ${inst.certifications}`}
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
              <div className="calendar-shell">
                <div className="calendar-shell-header">
                  <div className="calendar-shell-title">
                    <CalendarDays size={16} />
                    <span>{calendarMonth.toLocaleDateString([], { month: 'long', year: 'numeric' })}</span>
                  </div>
                  <div className="calendar-nav">
                    <button
                      type="button"
                      className="calendar-nav-btn"
                      onClick={goToPreviousMonth}
                      aria-label="Previous month"
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <button
                      type="button"
                      className="calendar-nav-btn"
                      onClick={goToNextMonth}
                      aria-label="Next month"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>

                <div className="calendar-weekdays">
                  {weekLabels.map((weekday) => (
                    <span key={weekday} className="calendar-weekday-label">{weekday}</span>
                  ))}
                </div>

                <div className="calendar-grid">
                  {calendarDays.map((dayDate, index) => {
                    if (!dayDate) {
                      return <div key={`empty-${index}`} className="calendar-day-empty" aria-hidden="true" />;
                    }

                    const dayIsoValue = toIsoDate(dayDate);
                    const isLockedPracticalDate = (
                      selectedLesson === 'practical' &&
                      practicalCourseDates.includes(dayIsoValue) &&
                      dayIsoValue !== date
                    );
                    const isDisabled = isPastDate(dayDate) || isLockedPracticalDate;
                    const isSelected = selectedDateObject ? isSameDay(dayDate, selectedDateObject) : false;
                    const isToday = isSameDay(dayDate, today);

                    return (
                      <button
                        key={dayIsoValue}
                        type="button"
                        className={`calendar-day-btn ${isSelected ? 'selected' : ''} ${isToday ? 'today' : ''} ${isLockedPracticalDate ? 'locked' : ''}`}
                        disabled={isDisabled}
                        onClick={() => handleDatePick(dayDate)}
                        aria-label={dayDate.toLocaleDateString([], {
                          weekday: 'long',
                          month: 'long',
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      >
                        {dayDate.getDate()}
                      </button>
                    );
                  })}
                </div>
                {selectedLesson === 'practical' && practicalCourseDates.length === 3 && (
                  <small className="time-hint">
                    Practical course dates are locked to: {practicalCourseDates.map((isoDate) => {
                      const parsed = parseIsoDate(isoDate);
                      return parsed
                        ? parsed.toLocaleDateString([], { month: 'short', day: 'numeric' })
                        : isoDate;
                    }).join(', ')}
                  </small>
                )}
              </div>

              <div className="time-picker-shell">
                <div className="time-picker-header">
                  <Clock3 size={16} />
                  <span>Pick a Time Slot</span>
                </div>
                <select
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="booking-select time-select"
                >
                  <option value="">Select time</option>
                  {timeOptions.map((slot) => (
                    <option key={slot.value} value={slot.value}>
                      {slot.label}
                    </option>
                  ))}
                </select>
                <small className="time-hint">10-minute interval scheduling</small>
              </div>
            </div>
          </div>

          {/* Booking Summary */}
          <div className="booking-summary">
            <h2 className="section-title">Booking Summary</h2>
            <p className="summary-text">
              {selectedLesson === 'practical' ? (
                <>
                  You selected a <strong>Practical Lesson Track</strong><br />
                  Course Days: {practicalCourseDates.length > 0
                    ? practicalCourseDates.map((isoDate) => {
                        const parsed = parseIsoDate(isoDate);
                        return parsed
                          ? parsed.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })
                          : isoDate;
                      }).join(' • ')
                    : 'Select date'}<br />
                  @ {formattedTimeSummary}
                </>
              ) : (
                <>
                  You have selected a<br />
                  <strong>Theory Class</strong> on {formattedDateSummary}<br />
                  @ {formattedTimeSummary}
                </>
              )}
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
