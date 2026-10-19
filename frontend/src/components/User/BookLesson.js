import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { 
  databases, 
  databaseId, 
  bookingsCollectionId, 
  usersCollectionId, 
  vehiclesCollectionId, 
  instructorsCollectionId, 
  instructorSchedulesCollectionId 
} from '../../appwrite/config';
import { ID, Query } from 'appwrite';
import './UserPages.css';

// Safe property keys to isolate Appwrite system attributes
const ID_KEY = '$' + 'id';
const CREATED_KEY = '$' + 'createdAt';

// Lightweight, zero-dependency inline SVG icon kit
const Icons = {
  Calendar: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  ),
  Clock: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  ),
  ChevronLeft: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  ),
  ChevronRight: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  ),
  Check: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  ),
  ShieldAlert: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  ),
  Car: () => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="9" rx="2" />
      <path d="m5 11 2-5h10l2 5" />
      <circle cx="7.5" cy="16.5" r="1.5" />
      <circle cx="16.5" cy="16.5" r="1.5" />
    </svg>
  ),
  Book: () => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z" />
      <path d="M6 6h10" />
      <path d="M6 10h10" />
    </svg>
  ),
  Sparkles: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z" />
    </svg>
  )
};

// Pure utility date functions
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

const parseScheduleValue = (value, fallback) => {
  if (!value) return fallback;
  if (typeof value !== 'string') return value;
  try {
    return JSON.parse(value);
  } catch (error) {
    return fallback;
  }
};

const scheduleDayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

const normalizeTransmission = (value) => {
  const normalized = String(value || '').trim().toLowerCase();
  if (normalized === 'mt' || normalized.includes('manual')) return 'MT';
  if (normalized === 'at' || normalized.includes('automatic')) return 'AT';
  return normalized.toUpperCase();
};

const scheduleBlocksDate = (schedule, dateValue) => {
  if (!schedule) return false;
  const date = parseIsoDate(dateValue);
  if (!date) return false;

  const leaves = parseScheduleValue(schedule.leaves, []);
  if (Array.isArray(leaves) && leaves.some((leave) => {
    const start = parseIsoDate(leave.startDate);
    const end = parseIsoDate(leave.endDate);
    return start && end && date >= start && date <= end;
  })) {
    return true;
  }

  const workingHours = parseScheduleValue(schedule.workingHours, {});
  return Boolean(workingHours[scheduleDayNames[date.getDay()]]?.off);
};

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

  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [selectedLesson, setSelectedLesson] = useState('practical');
  const [transmission, setTransmission] = useState('');
  const [instructor, setInstructor] = useState('');
  const [vehicle, setVehicle] = useState('');
  const [selectedDates, setSelectedDates] = useState([]);
  const [time, setTime] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isApproved, setIsApproved] = useState(false);
  const [checkingApproval, setCheckingApproval] = useState(true);
  const [instructors, setInstructors] = useState([]);
  const [instructorSchedules, setInstructorSchedules] = useState({});
  const [vehicles, setVehicles] = useState([]);
  const [showPackages, setShowPackages] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState('starter');

  // Package bundle state
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
    for (let i = 0; i < startingOffset; i = i + 1) {
      grid.push(null);
    }
    for (let day = 1; day <= numberOfDays; day = day + 1) {
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

    for (let totalMinutes = startMinutes; totalMinutes <= endMinutes; totalMinutes = totalMinutes + 120) {
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

  const isUnavailableDate = (dateObject) => {
    if (!instructor) return false;
    return scheduleBlocksDate(instructorSchedules[instructor], toIsoDate(dateObject));
  };

  const isSameDay = (dateA, dateB) => (
    dateA.getFullYear() === dateB.getFullYear() &&
    dateA.getMonth() === dateB.getMonth() &&
    dateA.getDate() === dateB.getDate()
  );

  const formattedDateSummary = selectedDates.length > 0
    ? selectedDates.map((isoDate) => parseIsoDate(isoDate)).filter(Boolean).map((d) => 
        d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })
      ).join(', ')
    : 'No date selected';

  const formattedTimeSummary = time
    ? new Date(`1970-01-01T${time}:00`).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
    : 'No time selected';

  const stepDefinitions = useMemo(() => {
    const lessonSelected = Boolean(selectedLesson);
    const instructorSelected = Boolean(instructor);
    const transmissionSelected = Boolean(transmission);
    const vehicleSelected = selectedLesson === 'practical' ? Boolean(vehicle) : true;
    const step2Completed = instructorSelected && (selectedLesson === 'theory' ? vehicleSelected : (transmissionSelected && vehicleSelected));
    const step3Completed = (selectedLesson === 'practical' ? selectedDates.length === 3 : selectedDates.length === 1) && Boolean(time);

    return [
      { id: 1, label: 'Lesson Track', status: lessonSelected ? 'completed' : 'active' },
      { id: 2, label: 'Instructor & Unit', status: step2Completed ? 'completed' : lessonSelected ? 'active' : 'upcoming' },
      { id: 3, label: 'Date & Time', status: step2Completed ? (step3Completed ? 'completed' : 'active') : 'upcoming' },
      { id: 4, label: 'Review Summary', status: step3Completed ? 'active' : 'upcoming' },
      { id: 5, label: 'Confirmation', status: 'upcoming' }
    ];
  }, [selectedLesson, instructor, vehicle, transmission, selectedDates, time]);

  const progressPercentage = useMemo(() => {
    const completedSteps = stepDefinitions.filter((step) => step.status === 'completed').length;
    return (completedSteps / stepDefinitions.length) * 100;
  }, [stepDefinitions]);

  const goToPreviousMonth = () => {
    setCalendarMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setCalendarMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const handleDatePick = (dayDate) => {
    if (!dayDate || isPastDate(dayDate) || isUnavailableDate(dayDate)) return;
    
    const dayIsoValue = toIsoDate(dayDate);
    
    if (selectedLesson === 'practical') {
      setSelectedDates((prev) => {
        if (prev.includes(dayIsoValue)) {
          return prev.filter((d) => d !== dayIsoValue);
        } else if (prev.length < 3) {
          return [...prev, dayIsoValue];
        }
        return prev;
      });
    } else {
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
    const parsed = Number(instructorDoc && instructorDoc.theoryCapacity ? instructorDoc.theoryCapacity : null);
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
      const status = String(bookingDoc && bookingDoc.status ? bookingDoc.status : '').toLowerCase();
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
      const leaves = parseScheduleValue(schedule.leaves, []);
      if (!Array.isArray(leaves)) return false;

      const checkDate = new Date(dateToCheck);
      checkDate.setHours(0, 0, 0, 0);
      return leaves.some((leave) => {
        const leaveStart = new Date(leave.startDate);
        const leaveEnd = new Date(leave.endDate);
        leaveStart.setHours(0, 0, 0, 0);
        leaveEnd.setHours(23, 59, 59, 999);
        return checkDate >= leaveStart && checkDate <= leaveEnd;
      });
    } catch (err) {
      console.error('Error checking instructor leave:', err);
      return false;
    }
  };

  const fetchInstructorSchedules = useCallback(async () => {
    try {
      const response = await databases.listDocuments(
        databaseId,
        instructorSchedulesCollectionId
      );
      const schedules = {};
      response.documents.forEach((schedule) => {
        if (schedule && schedule.instructorName) {
          schedules[schedule.instructorName] = schedule;
        }
      });
      setInstructorSchedules(schedules);
    } catch (error) {
      console.error('Error fetching instructor schedules:', error);
    }
  }, []);

  const isInstructorUnavailableAtTime = async (instructorName, dateToCheck, timeToCheck) => {
    try {
      const response = await databases.listDocuments(
        databaseId,
        instructorSchedulesCollectionId,
        [Query.equal('instructorName', instructorName)]
      );
      if (response.documents.length === 0) return false;

      const schedule = response.documents[0];
      const workingHours = parseScheduleValue(schedule.workingHours, {});
      const breaks = parseScheduleValue(schedule.breaks, []);
      const date = parseIsoDate(dateToCheck);
      if (!date) return false;

      const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      const daySchedule = workingHours[dayNames[date.getDay()]];
      if (daySchedule && daySchedule.off) return true;
      if (daySchedule && daySchedule.start && timeToCheck < daySchedule.start) return true;
      if (daySchedule && daySchedule.end && timeToCheck > daySchedule.end) return true;

      return Array.isArray(breaks) && breaks.some((breakItem) => {
        const matchesDay = breakItem.day === dayNames[date.getDay()];
        const withinBreak = timeToCheck >= breakItem.start && timeToCheck < breakItem.end;
        return matchesDay && withinBreak;
      });
    } catch (error) {
      console.error('Error checking instructor working hours:', error);
      return false;
    }
  };

  const checkUserApproval = useCallback(async () => {
    if (!currentUser) return;
    const currentUserId = currentUser[ID_KEY];
    if (!currentUserId) return;

    try {
      const userDoc = await databases.getDocument(
        databaseId,
        usersCollectionId,
        currentUserId
      );
      setIsApproved(Boolean(userDoc && userDoc.approved));
      if (userDoc && userDoc.approved) {
        setError('');
      }
    } catch (err) {
      console.error('Error checking approval:', err);
      setIsApproved(false);
    } finally {
      setCheckingApproval(false);
    }
  }, [currentUser]);

  const fetchPackageResources = useCallback(async (transmissionFilter = '') => {
    try {
      const response = await databases.listDocuments(
        databaseId,
        instructorsCollectionId,
        [Query.equal('availability', 'available')]
      );

      const docs = response.documents || [];

      const theoryList = docs.filter((inst) => !inst.lessonType || inst.lessonType === 'theory' || inst.lessonType === 'both');
      let practicalList = docs.filter((inst) => !inst.lessonType || inst.lessonType === 'practical' || inst.lessonType === 'both');

      if (transmissionFilter) {
        practicalList = practicalList.filter((inst) => {
          const instTrans = inst.motorcycleTransmission || inst.transmission;
          return normalizeTransmission(instTrans) === transmissionFilter;
        });
      }

      setPackageTheoryInstructors(theoryList);
      setPackagePracticalInstructors(practicalList);

      const vehResp = await databases.listDocuments(
        databaseId,
        vehiclesCollectionId,
        [Query.equal('status', 'available')]
      );

      let vehDocs = vehResp.documents || [];
      if (transmissionFilter) {
        vehDocs = vehDocs.filter((v) => {
          const trans = v.motorcycleTransmission || v.transmission;
          return normalizeTransmission(trans) === transmissionFilter;
        });
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

      let filteredInstructors = response.documents.filter((inst) => {
        if (!inst.lessonType) return true;
        return inst.lessonType === selectedLesson || inst.lessonType === 'both';
      });

      if (selectedLesson === 'practical' && transmission) {
        filteredInstructors = filteredInstructors.filter((inst) => {
          const instructorTransmission = inst.motorcycleTransmission || inst.transmission;
          if (!instructorTransmission) return false;
          return normalizeTransmission(instructorTransmission) === transmission;
        });
      }

      let instructorsAfterLeaveCheck = filteredInstructors;
      if (selectedDates.length > 0) {
        const leaveCheckPromises = filteredInstructors.map(async (inst) => {
          const unavailableResults = await Promise.all(
            selectedDates.map(async (date) => {
              const onLeave = await isInstructorOnLeave(inst.name, date);
              const offDuty = time ? await isInstructorUnavailableAtTime(inst.name, date, time) : false;
              return onLeave || offDuty;
            })
          );
          return { inst, unavailable: unavailableResults.some(Boolean) };
        });
        
        const leaveCheckResults = await Promise.all(leaveCheckPromises);
        instructorsAfterLeaveCheck = leaveCheckResults
          .filter((result) => !result.unavailable)
          .map((result) => result.inst);
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
  }, [selectedLesson, selectedDates, transmission, time]);

  const fetchVehicles = useCallback(async () => {
    try {
      const response = await databases.listDocuments(
        databaseId,
        vehiclesCollectionId,
        [Query.equal('status', 'available')]
      );
      
      let filteredVehicles = response.documents;
      if (transmission) {
        filteredVehicles = response.documents.filter((veh) => {
          const vehicleTransmission = veh.motorcycleTransmission || veh.transmission;
          return normalizeTransmission(vehicleTransmission) === transmission;
        });
      }
      
      setVehicles(filteredVehicles);
    } catch (err) {
      console.error('Error fetching vehicles:', err);
      setVehicles([]);
    }
  }, [transmission]);

  useEffect(() => {
    if (!currentUser) return;
    
    checkUserApproval();
    fetchInstructorSchedules();

    const refreshInstructorAvailability = () => {
      if (!document.hidden) {
        fetchInstructorSchedules();
        fetchInstructors();
      }
    };
    const interval = setInterval(refreshInstructorAvailability, 30000);
    document.addEventListener('visibilitychange', refreshInstructorAvailability);
    
    debounce(() => {
      fetchInstructors();
      fetchVehicles();
      fetchPackageResources(packagePracticalTransmission);
    }, 300);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', refreshInstructorAvailability);
    };
  }, [currentUser, fetchInstructorSchedules, fetchInstructors, fetchVehicles, fetchPackageResources, checkUserApproval, debounce, packagePracticalTransmission]);

  useEffect(() => {
    if (!currentUser) return;
    debounce(() => {
      fetchInstructors();
    }, 300);
  }, [selectedLesson, selectedDates, currentUser, transmission, debounce, fetchInstructors]);

  useEffect(() => {
    if (!showPackages) return;
    fetchPackageResources(packagePracticalTransmission);
  }, [showPackages, packagePracticalTransmission, fetchPackageResources]);

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
    if (isSubmitting || loading) return;
    
    setError('');
    setSuccess('');

    if (!isApproved) {
      setError('Your account is awaiting approval from admin. Please wait before reserving sessions.');
      return;
    }

    if (!instructor || selectedDates.length === 0 || !time) {
      setError('Please select an instructor, required date(s), and a session time slot.');
      return;
    }

    if (selectedLesson === 'practical') {
      if (!transmission) {
        setError('Please select a transmission type (Automatic or Manual).');
        return;
      }
      if (!vehicle) {
        setError('Please choose an available vehicle unit.');
        return;
      }
      if (selectedDates.length !== 3) {
        setError('Practical driving lessons require exactly 3 session dates to be selected on the calendar.');
        return;
      }
    }

    const unavailableDates = [];
    for (const bookingDate of selectedDates) {
      const onLeave = await isInstructorOnLeave(instructor, bookingDate);
      const offDuty = await isInstructorUnavailableAtTime(instructor, bookingDate, time);
      if (onLeave || offDuty) {
        unavailableDates.push(bookingDate);
      }
    }

    if (unavailableDates.length > 0) {
      setError('The selected instructor is on leave or off-duty during the selected slot. Please pick another date or time.');
      return;
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
          setError('This instructor has reached maximum theoretical classroom capacity. Please select another instructor.');
          await fetchInstructors();
          setLoading(false);
          setIsSubmitting(false);
          return;
        }
      }

      const bookingDates = selectedDates;
      const currentUserId = currentUser[ID_KEY];

      for (const bookingDate of bookingDates) {
        await databases.createDocument(
          databaseId,
          bookingsCollectionId,
          ID.unique(),
          {
            userId: currentUserId,
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

      // Optional SMS trigger
      try {
        const API_URL = process.env.REACT_APP_API_URL ||
          (window.location.hostname === 'localhost'
            ? 'http://localhost:5000'
            : 'https://final-capstone-3ugp.onrender.com');

        const userDoc = await databases.getDocument(
          databaseId,
          usersCollectionId,
          currentUserId
        );
        
        if (userDoc && userDoc.phone) {
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
        }
      } catch (smsErr) {
        console.warn('SMS notification non-critical alert:', smsErr);
      }

      // Update instructor availability
      try {
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
          const instructorDocId = instructorDoc[ID_KEY];
          try {
            if (selectedLesson === 'practical') {
              await databases.updateDocument(
                databaseId,
                usersCollectionId,
                instructorDocId,
                { availability: 'booked' }
              );
            } else {
              const shouldMarkUnavailable = activeTheoryBookings + 1 >= theoryCapacity;
              if (shouldMarkUnavailable) {
                await databases.updateDocument(
                  databaseId,
                  usersCollectionId,
                  instructorDocId,
                  { availability: 'booked' }
                );
              }
            }
          } catch (updateErr) {
            console.warn('Could not update instructor availability:', updateErr);
          }
        }
      } catch (err) {
        console.error('Error updating instructor availability:', err);
      }

      // Update vehicle status
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
            const vehicleDocId = vehicleDoc[ID_KEY];
            await databases.updateDocument(
              databaseId,
              vehiclesCollectionId,
              vehicleDocId,
              { status: 'booked' }
            );
          }
        } catch (err) {
          console.error('Error updating vehicle status:', err);
        }
      }

      setSuccess('Driving session successfully booked! Redirecting to your dashboard...');
      setInstructor('');
      setVehicle('');
      setTransmission('');
      setSelectedDates([]);
      setTime('');

      setTimeout(() => {
        navigate('/user-dashboard');
      }, 2000);
    } catch (err) {
      console.error('Booking error:', err);
      setError('Failed to book session: ' + err.message);
    } finally {
      setLoading(false);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="user-main-content user-main-content--fit">
      {/* Title & Authorization Banner */}
      <div className="page-header-row">
        <div>
          <h1 className="page-title">Reserve Driving Lessons</h1>
          <p className="page-subtitle-muted">
            Configure your lesson track, select your preferred transmission, and pick your session dates.
          </p>
        </div>
      </div>

      {!isApproved && !checkingApproval && (
        <div className="approval-notice-bar">
          <div className="approval-notice-icon"><Icons.ShieldAlert /></div>
          <div className="approval-notice-copy">
            <strong>Account Verification Pending</strong>
            <span>Your student profile is awaiting administrator approval before reservations can be finalized.</span>
          </div>
          <button
            onClick={() => checkUserApproval()}
            className="approval-notice-btn"
          >
            Check Status
          </button>
        </div>
      )}

      {error && <div className="booking-feedback-alert error-alert">{error}</div>}
      {success && <div className="booking-feedback-alert success-alert">{success}</div>}

      {/* Stepper Indicator */}
      <div className="progress-bar-container">
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${progressPercentage}%` }}></div>
        </div>
        <div className="booking-steps">
          {stepDefinitions.map((step) => (
            <div key={step.id} className={`step ${step.status}`}>
              <span className="step-number">
                {step.status === 'completed' ? <Icons.Check /> : step.id}
              </span>
              <div>
                <strong>{step.label}</strong>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Multi-Column Booking Deck */}
      <div className={`booking-layout ${showPackages ? 'packages-open' : ''}`}>
        {/* Column 1: Lesson Track Selection */}
        <div className="booking-panel booking-panel--lesson">
          <div className="promo-card">
            <div className="promo-card-copy">
              <div className="promo-badge"><Icons.Sparkles /> Special Bundle Offer</div>
              <h3>Enroll in Full Course Packages</h3>
              <p>Reserve complete curriculum packages with both classroom theory and practical road evaluations.</p>
            </div>
            <button
              type="button"
              className="promo-btn"
              onClick={() => setShowPackages((prev) => !prev)}
            >
              {showPackages ? 'Hide Packages' : 'View Bundles'}
            </button>
          </div>

          {showPackages && (
            <div className="package-offers-panel">
              <div className="package-offers-header">
                <div>
                  <span className="package-offers-label">Pre-Structured Curriculums</span>
                  <h3>Select an Enrollment Package</h3>
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
                  className={`package-card ${selectedPackage === 'starter' ? 'package-card--selected' : ''}`}
                  onClick={() => setSelectedPackage('starter')}
                >
                  <div className="package-card-header">
                    <span className="package-badge">Standard Course</span>
                    <span className="package-price">₱18,000</span>
                  </div>
                  <h3>Starter Driver Package</h3>
                  <p>3 Practical Driving Lessons + 2 Theoretical Classroom Sessions.</p>
                </div>

                <div
                  className={`package-card ${selectedPackage === 'license' ? 'package-card--selected' : ''}`}
                  onClick={() => setSelectedPackage('license')}
                >
                  <div className="package-card-header">
                    <span className="package-badge package-badge--highlight">Full Certification</span>
                    <span className="package-price">₱28,000</span>
                  </div>
                  <h3>License Prep Package</h3>
                  <p>5 Practical Driving Lessons + 3 Theoretical Sessions + Assessment Prep.</p>
                </div>
              </div>

              <div className="package-details-body">
                <button
                  type="button"
                  className="package-apply-btn"
                  onClick={() => {
                    setSelectedLesson('practical');
                    setAppliedPackage(selectedPackage);
                    setShowPackages(false);
                  }}
                >
                  Select &amp; Apply {selectedPackage === 'starter' ? 'Starter Driver' : 'License Prep'}
                </button>
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
                <div className="lesson-icon-circle"><Icons.Car /></div>
                <div className="lesson-card-details">
                  <h3>Behind-the-Wheel Practical</h3>
                  <p>2-hour on-road instruction. Vehicle units provided. (3 days required)</p>
                </div>
                <div className="lesson-price">₱4,000 / Day</div>
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
                <div className="lesson-icon-circle"><Icons.Book /></div>
                <div className="lesson-card-details">
                  <h3>Theoretical Classroom</h3>
                  <p>4-hour comprehensive road rules &amp; traffic laws session. (1 day required)</p>
                </div>
                <div className="lesson-price">₱1,000 / Session</div>
              </div>
            </div>
          )}

          <div className="lesson-detail-card">
            <h3>Training Inclusions</h3>
            <ul>
              <li>LTO Accredited Certified Professional Instructors</li>
              <li>Dual-Brake Safety Controlled Training Vehicles</li>
              <li>Defensive Driving Evaluation &amp; Certificate Support</li>
            </ul>
          </div>
        </div>

        {/* Column 2: Instructor & Vehicle Unit */}
        {!showPackages && (
          <div className="booking-panel booking-panel--instructor">
            <div className="panel-header">
              <h2>Instructor &amp; Unit</h2>
              <p>Choose an instructor and training vehicle for this session.</p>
            </div>

            {selectedLesson === 'practical' && (
              <div className="form-group">
                <label>Transmission Mode *</label>
                <select
                  value={transmission}
                  onChange={(e) => {
                    setTransmission(e.target.value);
                    setInstructor('');
                    setVehicle('');
                  }}
                  className="booking-select"
                >
                  <option value="">Select Transmission Mode</option>
                  <option value="MT">Manual Transmission (MT)</option>
                  <option value="AT">Automatic Transmission (AT)</option>
                </select>
              </div>
            )}

            <div className="form-group">
              <label>Assigned Instructor *</label>
              <select
                value={instructor}
                onChange={(e) => setInstructor(e.target.value)}
                className="booking-select"
                disabled={selectedLesson === 'practical' && !transmission}
              >
                <option value="">
                  {selectedLesson === 'practical' && !transmission
                    ? 'Select transmission first'
                    : 'Select Instructor'}
                </option>
                {instructors.map((inst) => {
                  const instId = inst[ID_KEY] || inst.name;
                  return (
                    <option key={instId} value={inst.name}>
                      {selectedLesson === 'theory'
                        ? `${inst.name} (${inst.theoryRemainingSlots}/${inst.theoryCapacity} classroom slots open)`
                        : `${inst.name} - ${inst.certifications || 'Driving Instructor'}`}
                    </option>
                  );
                })}
              </select>
            </div>

            {selectedLesson === 'practical' && (
              <div className="form-group">
                <label>Vehicle Fleet Unit *</label>
                <select
                  value={vehicle}
                  onChange={(e) => setVehicle(e.target.value)}
                  className="booking-select"
                  disabled={!transmission}
                >
                  <option value="">
                    {!transmission ? 'Select transmission first' : 'Select Vehicle Fleet Unit'}
                  </option>
                  {vehicles.map((veh) => {
                    const vehId = veh[ID_KEY] || veh.plateNumber;
                    return (
                      <option key={vehId} value={`${veh.model} (${veh.transmission})`}>
                        {veh.model} ({veh.transmission}) &mdash; {veh.plateNumber}
                      </option>
                    );
                  })}
                </select>
              </div>
            )}

            <div className="selection-notice-box">
              {instructor ? (
                <span>Instructor <strong>{instructor}</strong> selected. Checking leave and schedule blocks on the calendar.</span>
              ) : (
                <span>Pick an instructor to unlock live calendar dates.</span>
              )}
            </div>
          </div>
        )}

        {/* Column 3: Calendar & Time Picker */}
        <div className="booking-panel booking-panel--schedule">
          <div className="panel-header">
            <h2>Date &amp; Schedule</h2>
            <p>
              {selectedLesson === 'practical'
                ? `Pick 3 dates for behind-the-wheel (${selectedDates.length}/3 selected)`
                : `Pick 1 date for theory (${selectedDates.length}/1 selected)`}
            </p>
          </div>

          <div className="calendar-shell">
            <div className="calendar-shell-header">
              <div className="calendar-shell-title">
                <Icons.Calendar />
                <span>{calendarMonth.toLocaleDateString([], { month: 'long', year: 'numeric' })}</span>
              </div>
              <div className="calendar-nav">
                <button
                  type="button"
                  className="calendar-nav-btn"
                  onClick={goToPreviousMonth}
                  aria-label="Previous Month"
                >
                  <Icons.ChevronLeft />
                </button>
                <button
                  type="button"
                  className="calendar-nav-btn"
                  onClick={goToNextMonth}
                  aria-label="Next Month"
                >
                  <Icons.ChevronRight />
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
                const isBlocked = isPastDate(dayDate) || isUnavailableDate(dayDate);
                const isSelected = selectedDates.includes(dayIsoValue);
                const isToday = isSameDay(dayDate, today);

                return (
                  <button
                    key={dayIsoValue}
                    type="button"
                    className={`calendar-day-btn ${isSelected ? 'selected' : ''} ${isToday ? 'today' : ''}`}
                    disabled={isBlocked}
                    onClick={() => handleDatePick(dayDate)}
                    title={isUnavailableDate(dayDate) ? 'Instructor is on leave / off duty' : ''}
                  >
                    {dayDate.getDate()}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="slot-panel">
            <div className="time-picker-header">
              <Icons.Clock />
              <span>Available Session Slot *</span>
            </div>
            <select
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="booking-select"
            >
              <option value="">Select Time Slot</option>
              {timeOptions.map((slot) => (
                <option key={slot.value} value={slot.value}>
                  {slot.label}
                </option>
              ))}
            </select>
            <small className="time-hint">2-Hour Standard Instruction Windows (08:00 AM - 06:00 PM)</small>
          </div>
        </div>

        {/* Summary Card */}
        <div className="booking-summary booking-summary--wide">
          <div className="summary-header">
            <div>
              <h2>Reservation Receipt</h2>
              <p>Review and verify your course credentials prior to confirmation.</p>
            </div>
          </div>

          <div className="summary-grid">
            <div className="summary-card">
              <span>Track Type</span>
              <strong>
                {appliedPackage
                  ? `Package: ${appliedPackage === 'starter' ? 'Starter Driver' : 'License Prep'}`
                  : (selectedLesson === 'practical' ? 'Behind-the-Wheel' : 'Theoretical Classroom')}
              </strong>
            </div>

            <div className="summary-card">
              <span>Assigned Instructor</span>
              <strong>{instructor || 'None Selected'}</strong>
            </div>

            <div className="summary-card">
              <span>Vehicle Fleet Unit</span>
              <strong>{selectedLesson === 'theory' ? 'Classroom Facility' : (vehicle || 'None Selected')}</strong>
            </div>

            <div className="summary-card">
              <span>Selected Dates</span>
              <strong>{formattedDateSummary}</strong>
            </div>

            <div className="summary-card">
              <span>Selected Slot</span>
              <strong>{formattedTimeSummary}</strong>
            </div>
          </div>

          <button
            className="confirm-booking-btn"
            onClick={handleConfirmBooking}
            disabled={loading || isSubmitting}
          >
            {loading || isSubmitting ? 'Processing Reservation...' : 'Confirm & Finalize Reservation →'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default BookLesson;