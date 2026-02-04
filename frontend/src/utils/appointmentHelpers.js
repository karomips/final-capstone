import { collection, addDoc, updateDoc, doc, Timestamp } from 'firebase/firestore';
import { db } from '../firebase/config';

// Create a new appointment
export const createAppointment = async (userId, appointmentData) => {
  try {
    const appointmentsRef = collection(db, 'appointments');
    const appointment = {
      userId,
      title: appointmentData.title || 'Appointment',
      description: appointmentData.description || '',
      date: appointmentData.date || Timestamp.now(),
      status: 'pending',
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    };
    
    const docRef = await addDoc(appointmentsRef, appointment);
    return { id: docRef.id, ...appointment };
  } catch (error) {
    console.error('Error creating appointment:', error);
    throw error;
  }
};

// Update appointment status
export const updateAppointmentStatus = async (appointmentId, status) => {
  try {
    const appointmentRef = doc(db, 'appointments', appointmentId);
    const updateData = {
      status,
      updatedAt: Timestamp.now()
    };
    
    // If marking as completed, add completedDate
    if (status === 'completed') {
      updateData.completedDate = Timestamp.now();
    }
    
    await updateDoc(appointmentRef, updateData);
    return true;
  } catch (error) {
    console.error('Error updating appointment:', error);
    throw error;
  }
};

// Example usage in your components:
// import { createAppointment, updateAppointmentStatus } from '../utils/appointmentHelpers';
//
// To create an appointment:
// await createAppointment(currentUser.uid, {
//   title: 'Doctor Appointment',
//   description: 'Annual checkup',
//   date: Timestamp.fromDate(new Date('2026-02-10'))
// });
//
// To complete an appointment:
// await updateAppointmentStatus(appointmentId, 'completed');
