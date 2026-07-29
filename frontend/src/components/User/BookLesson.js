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

// ✅ Debounce utility to prevent excessive database calls
const createDebounce = () => {
  let timeoutId = null;
  return (fn, delay = 500) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(fn, delay);
  };
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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isApproved, setIsApproved] = useState(false);
  const [checkingApproval, setCheckingApproval] = useState(true);
  const [instructors, setInstructors] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [showPackages, setShowPackages] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState('starter');
  // Package-level selection states (used inside package panel)
  const [packageTheoryInstructor, setPackageTheoryInstructor] = useState('');
  const [packagePracticalTransmission, setPackagePracticalTransmission] = useState('');
  const [packagePracticalInstructor, setPackagePracticalInstructor] = useState('');
  const [packagePracticalVehicle, setPackagePracticalVehicle] = useState('');
  const [packageTheoryInstructors, setPackageTheoryInstructors] = useState([]);
  const [packagePracticalInstructors, setPackagePracticalInstructors] = useState([]);
  const [packageVehicles, setPackageVehicles] = useState([]);
  const [appliedPackage, setAppliedPackage] = useState(null);
  const [debounce] = useState(() => createDebounce());
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
    const startMinutes = 8 * 60;
    const endMinutes = 18 * 60;

    for (let totalMinutes = startMinutes; totalMinutes <= endMinutes; totalMinutes += 120) {
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

  const stepDefinitions = useMemo(() => {
    const lessonSelected = Boolean(selectedLesson);
    const instructorSelected = Boolean(instructor);
    const transmissionSelected = Boolean(transmission);
    const vehicleSelected = selectedLesson === 'practical' ? Boolean(vehicle) : true;
    const step2Completed = instructorSelected && (selectedLesson === 'theory' ? vehicleSelected : (transmissionSelected && vehicleSelected));
    const step3Completed = selectedDates.length > 0 && Boolean(time);

    return [
      { id: 1, label: 'Lesson type', status: lessonSelected ? 'completed' : 'active' },
      { id: 2, label: 'Instructor & vehicle', status: step2Completed ? 'completed' : lessonSelected ? 'active' : 'upcoming' },
      { id: 3, label: 'Date & time', status: step2Completed ? (step3Completed ? 'completed' : 'active') : 'upcoming' },
      { id: 4, label: 'Details', status: step3Completed ? 'active' : 'upcoming' },
      { id: 5, label: 'Confirm', status: 'upcoming' }
    ];
  }, [selectedLesson, instructor, vehicle, transmission, selectedDates, time]);

  const progressPercentage = useMemo(() => {
    const completedSteps = stepDefinitions.filter(step => step.status === 'completed').length;
    return (completedSteps / stepDefinitions.length) * 100;
  }, [stepDefinitions]);

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

  // Fetch instructors/vehicles for package selection panel
  const fetchPackageResources = useCallback(async (transmissionFilter = '') => {
    try {
      const response = await databases.listDocuments(
        databaseId,
        instructorsCollectionId,
        [Query.equal('availability', 'available')]
      );

      const docs = response.documents || [];

      const theoryList = docs.filter(inst => !inst.lessonType || inst.lessonType === 'theory' || inst.lessonType === 'both');
      let practicalList = docs.filter(inst => !inst.lessonType || inst.lessonType === 'practical' || inst.lessonType === 'both');

      if (transmissionFilter) {
        practicalList = practicalList.filter(inst => {
          const instTrans = inst.motorcycleTransmission || inst.transmission;
          return instTrans === transmissionFilter;
        });
      }

      setPackageTheoryInstructors(theoryList);
      setPackagePracticalInstructors(practicalList);

      // fetch vehicles
      const vehResp = await databases.listDocuments(
        databaseId,
        vehiclesCollectionId,
        [Query.equal('status', 'available')]
      );

      let vehDocs = vehResp.documents || [];
      if (transmissionFilter) {
        vehDocs = vehDocs.filter(v => (v.motorcycleTransmission || v.transmission) === transmissionFilter);
      }
      setPackageVehicles(vehDocs);
    } catch (err) {
      console.error('Error fetching package resources:', err);
      setPackageTheoryInstructors([]);
      setPackagePracticalInstructors([]);
      setPackageVehicles([]);
    }
  }, []);

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
          // Check both transmission (for regular vehicles) and motorcycleTransmission (for motorcycles)
          const instructorTransmission = inst.motorcycleTransmission || inst.transmission;
          if (!instructorTransmission) return false; // Only show instructors with transmission set
          return instructorTransmission === transmission;
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
      // For motorcycles, check motorcycleTransmission; for regular vehicles, check transmission
      let filteredVehicles = response.documents;
      if (transmission) {
        filteredVehicles = response.documents.filter(veh => {
          const vehicleTransmission = veh.motorcycleTransmission || veh.transmission;
          return vehicleTransmission === transmission;
        });
      }
      
      setVehicles(filteredVehicles);
    } catch (err) {
      console.error('Error fetching vehicles:', err);
      setVehicles([]);
    }
  }, [transmission]); // Updated: added transmission dependency

  // ✅ Consolidated useEffect: runs on mount and when critical props change
  useEffect(() => {
    if (!currentUser) return;
    
    // Check approval on mount
    checkUserApproval();
    
    // Debounce instructor and vehicle fetches
    debounce(() => {
      fetchInstructors();
      fetchVehicles();
      // also prepare package resources when packages panel may be opened
      fetchPackageResources(packagePracticalTransmission);
    }, 300);
  }, [currentUser]);

  // ✅ Separate effect for lesson type changes (requires debouncing)
  useEffect(() => {
    if (!currentUser) return;
    
    debounce(() => {
      fetchInstructors();
    }, 300);
  }, [selectedLesson, currentUser, transmission]);

  useEffect(() => {
    if (!showPackages) return;
    // whenever package panel opens or transmission filter changes, refresh package resources
    fetchPackageResources(packagePracticalTransmission);
  }, [showPackages, packagePracticalTransmission, fetchPackageResources]);

  // ✅ Window focus handler
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
    // ✅ Prevent double-submit and excessive writes
    if (isSubmitting || loading) return;
    
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

    setIsSubmitting(true);
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
            vehicle: selectedLesson === 'theory' ? 'N/A' : vehicle,
            date: bookingDate,
            time: time,
            status: 'pending',
            createdAt: new Date().toISOString()
          }
        );
      }
      console.log('Booking created successfully for dates:', bookingDates);

      // Send SMS confirmation to user
      try {
        const API_URL = process.env.REACT_APP_API_URL ||
          (window.location.hostname === 'localhost'
            ? 'http://localhost:5000'
            : 'https://final-capstone-3ugp.onrender.com');

        // Get user's phone number
        const userDoc = await databases.getDocument(
          databaseId,
          usersCollectionId,
          currentUser.$id
        );
        
        if (userDoc.phone) {
          await fetch(`${API_URL}/api/sms/appointment-confirmation`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              phoneNumber: userDoc.phone,
              appointmentData: {
                instructor: instructor,
                date: bookingDates[0],
                time: time,
                lessonType: selectedLesson
              }
            })
          });
          console.log('SMS confirmation sent successfully');
        }
      } catch (err) {
        console.warn('Failed to send SMS confirmation:', err);
        // Don't fail the booking if SMS fails
      }

      try {
        // Update instructor availability (optional - won't fail booking if this fails)
        const instructorQuery = await databases.listDocuments(
          databaseId,
          usersCollectionId,
          [
            Query.equal('name', instructor),
            Query.equal('role', 'instructor')
          ]
        );

        if (instructorQuery.documents.length > 0) {
          const instructorDoc = instructorQuery.documents[0];
          try {
            if (selectedLesson === 'practical') {
              await databases.updateDocument(
                databaseId,
                usersCollectionId,
                instructorDoc.$id,
                { availability: 'booked' }
              );
            } else {
              const shouldMarkUnavailable = activeTheoryBookings + 1 >= theoryCapacity;
              if (shouldMarkUnavailable) {
                await databases.updateDocument(
                  databaseId,
                  usersCollectionId,
                  instructorDoc.$id,
                  { availability: 'booked' }
                );
              }
            }
          } catch (updateErr) {
            // Log but don't fail booking if availability update fails
            console.warn('Could not update instructor availability:', updateErr);
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
      setIsSubmitting(false);
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

        <div className="progress-bar-container">
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${progressPercentage}%` }}></div>
          </div>
          <div className="booking-steps">
            {stepDefinitions.map((step) => (
              <div key={step.id} className={`step ${step.status}`}>
                <span className="step-number">
                  {step.status === 'completed' ? '✓' : step.id}
                </span>
                <div>
                  <strong>{step.label}</strong>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className={`booking-layout ${showPackages ? 'packages-open' : ''}`}>
          <div className="booking-panel booking-panel--lesson">
            <div className="promo-card">
              <div>
                <div className="promo-badge">Save 15%</div>
                <h3>Book 5 lessons as a bundle</h3>
                <p>Reserve five sessions and enjoy a special discount on your driving lessons.</p>
              </div>
              <button
                type="button"
                className="promo-btn"
                onClick={() => setShowPackages((prev) => !prev)}
                aria-expanded={showPackages}
                aria-controls="package-offers-panel"
              >
                {showPackages ? 'Hide packages' : 'View packages'}
              </button>
            </div>
            {showPackages && (
              <div className="package-offers-panel" id="package-offers-panel">
                <div className="package-offers-header">
                  <div>
                    <span className="package-offers-label">Package options</span>
                    <h3>Choose a bundle that fits your driving goals</h3>
                    <p>These packages are designed for learners who want a structured driving-school plan.</p>
                  </div>
                  <button
                    type="button"
                    className="package-offers-close"
                    onClick={() => setShowPackages(false)}
                  >
                    Close
                  </button>
                </div>

                <div className="package-cards">
                  <div
                    className={`package-card package-card--featured package-card--interactive ${selectedPackage === 'starter' ? 'package-card--selected' : 'package-card--muted'}`}
                    role="button"
                    tabIndex={0}
                    onClick={() => setSelectedPackage('starter')}
                    onKeyDown={(e) => e.key === 'Enter' && setSelectedPackage('starter')}
                  >
                    <div className="package-card-header">
                      <span className="package-badge">Popular</span>
                      <span className="package-price">₱18,000</span>
                    </div>
                    <h3>Starter Driver Package</h3>
                    <p>Balanced for new students who want practical and classroom support.</p>
                  </div>

                  <div
                    className={`package-card package-card--interactive ${selectedPackage === 'license' ? 'package-card--selected' : 'package-card--muted'}`}
                    role="button"
                    tabIndex={0}
                    onClick={() => setSelectedPackage('license')}
                    onKeyDown={(e) => e.key === 'Enter' && setSelectedPackage('license')}
                  >
                    <div className="package-card-header">
                      <span className="package-badge package-badge--muted">Best value</span>
                      <span className="package-price">₱28,000</span>
                    </div>
                    <h3>License Prep Package</h3>
                    <p>Complete driving-school prep for your assessment and road test.</p>
                  </div>
                </div>

                <div className="package-details-panel">
                  <div className="package-details-header">
                    <span className="package-details-label">Selected package</span>
                    <h4>
                      {selectedPackage === 'starter' ? 'Starter Driver Package' : 'License Prep Package'}
                    </h4>
                    <p>
                      {selectedPackage === 'starter'
                        ? 'Best for beginners who want a balanced start with both practical and classroom support.'
                        : 'Best for learners preparing for the licensing process with a stronger theory-to-road-test flow.'}
                    </p>
                  </div>

                  <div className="package-details-body">
                      <div className="package-detail-card">
                      <h4>{selectedPackage === 'starter' ? 'Starter Driver Package' : 'License Prep Package'}</h4>
                      <p>
                        {selectedPackage === 'starter'
                          ? 'Best for beginners who need a steady mix of practical driving and classroom learning.'
                          : 'Best for learners who want a complete package focused on passing the assessment and road test.'}
                      </p>
                      <ul>
                        {selectedPackage === 'starter' ? (
                          <>
                            <li>3 practical lessons</li>
                            <li>2 theory classes</li>
                            <li>Priority scheduling support</li>
                            <li>Free booking assistance</li>
                          </>
                        ) : (
                          <>
                            <li>5 practical lessons</li>
                            <li>3 theory classes</li>
                            <li>Mock driving evaluation</li>
                            <li>Testing day checklist</li>
                          </>
                        )}
                      </ul>
                    </div>
                    <div className="package-selection-grid">
                      <div className="package-detail-card">
                        <h4>Theory Class</h4>
                        <p>Choose instructor for theory sessions.</p>
                        <div className="form-group">
                          <label>Instructor</label>
                          <select
                            value={packageTheoryInstructor}
                            onChange={(e) => setPackageTheoryInstructor(e.target.value)}
                            className="booking-select"
                          >
                            <option value="">Select instructor</option>
                            {packageTheoryInstructors.length === 0 ? (
                              <option disabled>No available instructors</option>
                            ) : (
                              packageTheoryInstructors.map((inst) => (
                                <option key={inst.$id} value={inst.name}>{inst.name} {inst.certifications ? ` - ${inst.certifications}` : ''}</option>
                              ))
                            )}
                          </select>
                        </div>
                      </div>

                      <div className="package-detail-card">
                        <h4>Behind-the-Wheel Lesson</h4>
                        <p>Choose transmission, instructor and vehicle for practical sessions.</p>

                        <div className="form-group">
                          <label>Transmission type</label>
                          <select
                            value={packagePracticalTransmission}
                            onChange={(e) => {
                              setPackagePracticalTransmission(e.target.value);
                              setPackagePracticalInstructor('');
                              setPackagePracticalVehicle('');
                            }}
                            className="booking-select"
                          >
                            <option value="">Select transmission</option>
                            <option value="MT">Manual Transmission</option>
                            <option value="AT">Automatic Transmission</option>
                          </select>
                        </div>

                        <div className="form-group">
                          <label>Select Instructor</label>
                          <select
                            value={packagePracticalInstructor}
                            onChange={(e) => setPackagePracticalInstructor(e.target.value)}
                            className="booking-select"
                            disabled={!packagePracticalTransmission}
                          >
                            <option value="">{!packagePracticalTransmission ? 'Select transmission type first' : 'Select Instructor'}</option>
                            {packagePracticalInstructors.length === 0 ? (
                              <option disabled>No available instructors</option>
                            ) : (
                              packagePracticalInstructors.map((inst) => (
                                <option key={inst.$id} value={inst.name}>{inst.name} {inst.certifications ? ` - ${inst.certifications}` : ''}</option>
                              ))
                            )}
                          </select>
                        </div>

                        <div className="form-group">
                          <label>Vehicle model</label>
                          <select
                            value={packagePracticalVehicle}
                            onChange={(e) => setPackagePracticalVehicle(e.target.value)}
                            className="booking-select"
                            disabled={!packagePracticalTransmission}
                          >
                            <option value="">{!packagePracticalTransmission ? 'Select transmission type first' : 'Select Vehicle Model'}</option>
                            {packageVehicles.length === 0 ? (
                              <option disabled>No available vehicles</option>
                            ) : (
                              packageVehicles.map((veh) => (
                                <option key={veh.$id} value={`${veh.model} (${veh.transmission})`}>{veh.model} ({veh.transmission}) - {veh.plateNumber}</option>
                              ))
                            )}
                          </select>
                        </div>
                      </div>
                    </div>

                    <div style={{ marginTop: 16 }}>
                      <button
                        type="button"
                        className="lesson-action-btn"
                        onClick={() => {
                          // Apply package selections to booking context and close panel
                          // Practical lesson is the main booking target for package
                          setTransmission(packagePracticalTransmission || transmission);
                          setInstructor(packagePracticalInstructor || packageTheoryInstructor || instructor);
                          setVehicle(packagePracticalVehicle || vehicle);
                          setSelectedLesson('practical');
                          setAppliedPackage(selectedPackage);
                          setShowPackages(false);
                        }}
                      >
                        Select package
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {!showPackages && (
              <div className="lesson-type-cards">
                <div
                  className={`lesson-card ${selectedLesson === 'practical' ? 'active' : ''}`}
                  onClick={() => {
                    setSelectedLesson('practical');
                    setInstructor('');
                    setSelectedDates([]);
                    setTransmission('');
                    setVehicle('');
                  }}
                >
                  <div className="lesson-icon">🚗</div>
                  <div>
                    <h3>Behind-the-Wheel Lesson</h3>
                    <p>2-hour on-road instruction. Vehicle options available.</p>
                  </div>
                  <div className="lesson-price">₱4,000 / session</div>
                </div>
                <div
                  className={`lesson-card ${selectedLesson === 'theory' ? 'active' : ''}`}
                  onClick={() => {
                    setSelectedLesson('theory');
                    setInstructor('');
                    setVehicle('');
                    setSelectedDates([]);
                    setTransmission('');
                  }}
                >
                  <div className="lesson-icon">📖</div>
                  <div>
                    <h3>Theory Class</h3>
                    <p>4-hour classroom instruction. All materials provided.</p>
                  </div>
                  <div className="lesson-price lesson-price--secondary">₱1,000 / session</div>
                </div>
              </div>
            )}

            <div className="lesson-detail-card">
              <h3>What’s included</h3>
              <ul>
                <li>Experienced instructors with proven training methods</li>
                <li>Flexible lesson scheduling in hourly slots</li>
                <li>Full support for license preparation and testing</li>
                <li>Vehicle choice available for practical sessions</li>
              </ul>
            </div>
          </div>

          {!showPackages && (
            <div className="booking-panel booking-panel--instructor">
            <div className="panel-header">
              <div>
                <h2>Instructor & vehicle</h2>
                <p>Choose a certified instructor and the right vehicle for your lesson.</p>
              </div>
            </div>

            {selectedLesson === 'practical' && (
              <div className="form-group">
                <label>Transmission type</label>
                <select
                  value={transmission}
                  onChange={(e) => {
                    setTransmission(e.target.value);
                    setInstructor('');
                    setVehicle('');
                  }}
                  className="booking-select"
                >
                  <option value="">Select transmission</option>
                  <option value="MT">Manual Transmission</option>
                  <option value="AT">Automatic Transmission</option>
                </select>
              </div>
            )}

            <div className="form-group">
              <label>{selectedLesson === 'practical' ? 'Select Instructor' : 'Instructor Name'}</label>
              <select
                value={instructor}
                onChange={(e) => setInstructor(e.target.value)}
                className="booking-select"
                disabled={selectedLesson === 'practical' && !transmission}
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
                        ? `${inst.name} - ${inst.certifications} (${inst.theoryRemainingSlots}/${inst.theoryCapacity} slots)`
                        : `${inst.name} - ${inst.certifications}`}
                    </option>
                  ))
                )}
              </select>
            </div>

            {selectedLesson === 'practical' && (
              <div className="form-group">
                <label>Vehicle model</label>
                <select
                  value={vehicle}
                  onChange={(e) => setVehicle(e.target.value)}
                  className="booking-select"
                  disabled={!transmission}
                >
                  <option value="">
                    {!transmission
                      ? 'Select transmission type first'
                      : 'Select Vehicle Model'}
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

            <div className="instructor-cards">
              {instructors.length > 0 ? (
                instructors.slice(0, 3).map((inst) => (
                  <div key={inst.$id} className="instructor-card">
                    <div>
                      <strong>{inst.name}</strong>
                      <p>{inst.certifications || 'Certified driving instructor'}</p>
                    </div>
                    <span>{selectedLesson === 'theory' ? `${inst.theoryRemainingSlots} slots left` : 'Top rated'}</span>
                  </div>
                ))
              ) : (
                <div className="instructor-card instructor-card--placeholder">
                  <p>No instructors are available right now. Please try another date or transmission type.</p>
                </div>
              )}
            </div>
          </div>
          )}

          <div className="booking-panel booking-panel--schedule">
            <div className="panel-header">
              <div>
                <h2>Date & time</h2>
                <p>Pick the best available dates and time slot for your lesson.</p>
              </div>
            </div>

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

            <div className="slot-panel">
              <div className="time-picker-header">
                <Clock3 size={16} />
                <span>Available time slots</span>
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
              <small className="time-hint">2-hour interval scheduling from 8:00 AM to 6:00 PM</small>
            </div>
          </div>

          <div className="booking-summary booking-summary--wide">
            <div className="summary-header">
              <div>
                <h2>Booking Summary</h2>
                <p>Review your lesson selection before confirming.</p>
              </div>
            </div>
            <div className={`summary-grid ${selectedLesson === 'theory' ? 'summary-grid--centered' : ''}`}>
              <div className="summary-card">
                <span>Lesson type</span>
                <strong>
                  {appliedPackage
                    ? `Package: ${appliedPackage === 'starter' ? 'Starter Driver Package' : 'License Prep Package'}`
                    : (selectedLesson === 'practical' ? 'Behind-the-Wheel Lesson' : 'Theory Class')}
                </strong>
              </div>

              <div className="summary-card">
                <span>Instructor{appliedPackage ? 's' : ''}</span>
                {appliedPackage ? (
                  <div>
                    <strong style={{ display: 'block' }}>{packagePracticalInstructor || 'Practical: Not selected'}</strong>
                    <small style={{ display: 'block', color: '#64748b' }}>{packageTheoryInstructor ? `Theory: ${packageTheoryInstructor}` : 'Theory: Not selected'}</small>
                  </div>
                ) : (
                  <strong>{instructor || 'Not selected'}</strong>
                )}
              </div>

              <div className="summary-card">
                <span>Vehicle</span>
                <strong>{appliedPackage ? (packagePracticalVehicle || 'Not selected') : (vehicle || 'Not selected')}</strong>
              </div>

              <div className="summary-card">
                <span>Date</span>
                <strong>{formattedDateSummary}</strong>
              </div>

              <div className="summary-card">
                <span>Time</span>
                <strong>{formattedTimeSummary}</strong>
              </div>
            </div>
            <button
              className="confirm-booking-btn"
              onClick={handleConfirmBooking}
              disabled={loading || isSubmitting}
            >
              {loading || isSubmitting ? 'BOOKING...' : 'CONFIRM BOOKING'}
            </button>
          </div>
        </div>
      </div>
  );
}

export default BookLesson;