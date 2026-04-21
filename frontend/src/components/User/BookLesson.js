import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { databases, databaseId, bookingsCollectionId, usersCollectionId, vehiclesCollectionId, instructorsCollectionId, instructorSchedulesCollectionId } from '../../appwrite/config';
import { ID, Query } from 'appwrite';
import { CalendarDays, Clock3, ChevronLeft, ChevronRight } from 'lucide-react';
import './UserPages.css';

// ✅ Moved outside component — pure utility functions, never change
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

// ✅ Moved outside component — no need for useCallback
const addDays = (isoValue, numberOfDays) => {
  const parsed = parseIsoDate(isoValue);
  if (!parsed) return '';
  parsed.setDate(parsed.getDate() + numberOfDays);
  return toIsoDate(parsed);
};

function BookLesson() {
  const THEORY_MIN_CAPACITY = 15;
  const THEORY_MAX_CAPACITY = 20;

  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const [selectedLesson, setSelectedLesson] = useState('practical');
  const [transmission, setTransmission] = useState(''); // New: transmission type selection
  const [instructor, setInstructor] = useState('');
  const [vehicle, setVehicle] = useState('');
  const [selectedDates, setSelectedDates] = useState([]); // Array of ISO date strings
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

  const selectedDateObject = selectedDates.length > 0 ? parseIsoDate(selectedDates[0]) : null;

  // For practical: show all selected dates, for theory: show the single date
  const formattedDateSummary = selectedDates.length > 0
    ? selectedDates.map(isoDate => parseIsoDate(isoDate)).filter(Boolean).map(d => 
        d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })
      ).join(', ')
    : 'Select date(s)';

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
    
    const dayIsoValue = toIsoDate(dayDate);
    
    if (selectedLesson === 'practical') {
      // For practical: allow selecting up to 3 dates (toggle)
      setSelectedDates(prev => {
        if (prev.includes(dayIsoValue)) {
          // Already selected, remove it
          return prev.filter(d => d !== dayIsoValue);
        } else if (prev.length < 3) {
          // Not selected yet, add it (if under limit)
          return [...prev, dayIsoValue];
        }
        // Already have 3, don't add more
        return prev;
      });
    } else {
      // For theory: only 1 date
      setSelectedDates([dayIsoValue]);
    }
  };

  useEffect(() => {
    if (selectedDates.length === 0) return;
    const firstDate = parseIsoDate(selectedDates[0]);
    if (firstDate) {
      setCalendarMonth(new Date(firstDate.getFullYear(), firstDate.getMonth(), 1));
    }
  }, [selectedDates]);

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

  const isInstructorOnLeave = async (instructorName, dateToCheck) => {
    try {
      const scheduleResponse = await databases.listDocuments(
        databaseId,
        instructorSchedulesCollectionId,
        [Query.equal('instructorName', instructorName)]
      );

      if (scheduleResponse.documents.length === 0) return false;

      const schedule = scheduleResponse.documents[0];
      if (!schedule.leaves || !Array.isArray(schedule.leaves)) return false;

      const checkDate = new Date(dateToCheck);
      return schedule.leaves.some(leave => {
        const leaveStart = new Date(leave.startDate);
        const leaveEnd = new Date(leave.endDate);
        return checkDate >= leaveStart && checkDate <= leaveEnd;
      });
    } catch (err) {
      console.error('Error checking instructor leave:', err);
      return false;
    }
  };

  const checkUserApproval = useCallback(async () => {
    try {
      const userDoc = await databases.getDocument(
        databaseId,
        usersCollectionId,
        currentUser.$id
      );
      setIsApproved(userDoc.approved || false);
      if (userDoc.approved) {
        setError('');
      }
    } catch (err) {
      console.error('Error checking approval:', err);
      setIsApproved(false);
    } finally {
      setCheckingApproval(false);
    }
  }, [currentUser]);

  const fetchInstructors = useCallback(async () => {
    try {
      const response = await databases.listDocuments(
        databaseId,
        instructorsCollectionId,
        [Query.equal('availability', 'available')]
      );

      let filteredInstructors = response.documents.filter(inst => {
        if (!inst.lessonType) return true;
        return inst.lessonType === selectedLesson || inst.lessonType === 'both';
      });

      // NEW: For practical lessons, filter by transmission if selected
      if (selectedLesson === 'practical' && transmission) {
        filteredInstructors = filteredInstructors.filter(inst => {
          if (!inst.transmission) return false; // Only show instructors with transmission set
          return inst.transmission === transmission;
        });
      }

      // Check for leaves if a date is selected
      let instructorsAfterLeaveCheck = filteredInstructors;
      if (selectedDates.length > 0) {
        const leaveCheckPromises = filteredInstructors.map(async (inst) => {
          const onLeave = await isInstructorOnLeave(inst.name, selectedDates[0]);
          return { inst, onLeave };
        });
        
        const leaveCheckResults = await Promise.all(leaveCheckPromises);
        instructorsAfterLeaveCheck = leaveCheckResults
          .filter(result => !result.onLeave)
          .map(result => result.inst);
      }

      if (selectedLesson === 'theory') {
        const instructorsWithSlots = await Promise.all(
          instructorsAfterLeaveCheck.map(async (inst) => {
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
        setInstructors(instructorsAfterLeaveCheck);
      }
    } catch (err) {
      console.error('Error fetching instructors:', err);
      setInstructors([]);
    }
  }, [selectedLesson, selectedDates, transmission]); // Updated: added transmission dependency

  const fetchVehicles = useCallback(async () => {
    try {
      const response = await databases.listDocuments(
        databaseId,
        vehiclesCollectionId,
        [Query.equal('status', 'available')]
      );
      
      // NEW: Filter vehicles by transmission if selected
      let filteredVehicles = response.documents;
      if (transmission) {
        filteredVehicles = response.documents.filter(veh => veh.transmission === transmission);
      }
      
      setVehicles(filteredVehicles);
    } catch (err) {
      console.error('Error fetching vehicles:', err);
      setVehicles([]);
    }
  }, [transmission]); // Updated: added transmission dependency

  useEffect(() => {
    if (currentUser) {
      checkUserApproval();
      fetchInstructors();
      fetchVehicles();
    }
  }, [currentUser, checkUserApproval, fetchInstructors, fetchVehicles]);

  useEffect(() => {
    if (currentUser) {
      fetchInstructors();
    }
  }, [selectedLesson, currentUser, fetchInstructors]);

  useEffect(() => {
    const handleFocus = () => {
      if (currentUser) {
        checkUserApproval();
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [currentUser, checkUserApproval]);

  const handleConfirmBooking = async () => {
    setError('');
    setSuccess('');

    if (!isApproved) {
      setError('Your account is pending approval. Please wait for admin confirmation before booking lessons.');
      return;
    }

    if (!instructor || selectedDates.length === 0 || !time) {
      setError('Please fill in all fields');
      return;
    }

    // NEW: Validate transmission for practical lessons
    if (selectedLesson === 'practical') {
      if (!transmission) {
        setError('Please select a transmission type');
        return;
      }
      if (!vehicle) {
        setError('Please select a vehicle for practical lesson');
        return;
      }
      if (selectedDates.length !== 3) {
        setError('Please select exactly 3 dates for the practical lesson');
        return;
      }
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

      // Use selected dates (1 for theory, 3 for practical)
      const bookingDates = selectedDates;

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
            transmission: selectedLesson === 'practical' ? transmission : 'N/A', // NEW: Include transmission
            vehicle: selectedLesson === 'theory' ? 'N/A' : vehicle,
            date: bookingDate,
            time: time,
            status: 'pending',
            createdAt: new Date().toISOString()
          }
        );
      }
      console.log('Booking created successfully for dates:', bookingDates);

      try {
        const instructorQuery = await databases.listDocuments(
          databaseId,
          instructorsCollectionId,
          [Query.equal('name', instructor)]
        );

        if (instructorQuery.documents.length > 0) {
          const instructorDoc = instructorQuery.documents[0];
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
      } catch (err) {
        console.error('Error updating instructor availability:', err);
      }

      if (selectedLesson === 'practical' && vehicle) {
        try {
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
        } catch (err) {
          console.error('Error updating vehicle status:', err);
        }
      }

      setSuccess('Booking confirmed successfully!');
      setInstructor('');
      setVehicle('');
      setTransmission(''); // NEW: Reset transmission after booking
      setSelectedDates([]);
      setTime('');

      setTimeout(() => {
        navigate('/user-dashboard');
      }, 2000);
    } catch (err) {
      console.error('Booking error:', err);
      setError('Failed to create booking: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="user-main-content user-main-content--fit">
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
                  setInstructor('');
                  setSelectedDates([]);
                  setTransmission(''); // Reset transmission when switching lessons
                  setVehicle('');
                }}
              >
                <div className="lesson-icon">🚗</div>
                <h3>Behind-the-Wheel Lesson</h3>
                <p>2-hour on-road instruction.<br />Vehicle options available.</p>
              </div>
              <div
                className={`lesson-card ${selectedLesson === 'theory' ? 'active' : ''}`}
                onClick={() => {
                  setSelectedLesson('theory');
                  setInstructor('');
                  setVehicle('');
                  setSelectedDates([]);
                  setTransmission(''); // Reset transmission when switching to theory
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
            
            {/* NEW: Transmission Type Selection (for practical lessons only) */}
            {selectedLesson === 'practical' && (
              <div className="form-group">
                <label>Transmission Type</label>
                <select
                  value={transmission}
                  onChange={(e) => {
                    setTransmission(e.target.value);
                    setInstructor(''); // Reset instructor when transmission changes
                    setVehicle(''); // Reset vehicle when transmission changes
                  }}
                  className="booking-select"
                >
                  <option value="">Select Transmission Type</option>
                  <option value="MT">Manual Transmission (MT)</option>
                  <option value="AT">Automatic Transmission (AT)</option>
                </select>
              </div>
            )}
            
            <div className="form-group">
              <label>Instructor Name</label>
              <select
                value={instructor}
                onChange={(e) => setInstructor(e.target.value)}
                className="booking-select"
                disabled={selectedLesson === 'practical' && !transmission} // NEW: Disable until transmission is selected
              >
                <option value="">
                  {selectedLesson === 'practical' && !transmission 
                    ? 'Select transmission type first' 
                    : 'Select Instructor'}
                </option>
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
                <label>Vehicle Model</label>
                <select
                  value={vehicle}
                  onChange={(e) => setVehicle(e.target.value)}
                  className="booking-select"
                  disabled={!transmission} // NEW: Disable until transmission is selected
                >
                  <option value="">
                    {!transmission 
                      ? 'Select transmission type first' 
                      : 'Select Vehicle'}
                  </option>
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
                    const isDisabled = isPastDate(dayDate);
                    const isSelected = selectedDates.includes(dayIsoValue);
                    const isToday = isSameDay(dayDate, today);

                    return (
                      <button
                        key={dayIsoValue}
                        type="button"
                        className={`calendar-day-btn ${isSelected ? 'selected' : ''} ${isToday ? 'today' : ''}`}
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
              </div>

              <div className="booking-section time-picker-section">
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
                  You selected a <strong>Behind-the-Wheel Track</strong><br />
                  Dates: {formattedDateSummary} ({selectedDates.length}/3 selected)<br />
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
  );
}

export default BookLesson;