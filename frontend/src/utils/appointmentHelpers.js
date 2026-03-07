import { databases, databaseId, appointmentsCollectionId } from '../appwrite/config';
import { ID } from 'appwrite';

// Create a new appointment
export const createAppointment = async (userId, appointmentData) => {
  try {
    const appointment = {
      userId,
      title: appointmentData.title || 'Appointment',
      description: appointmentData.description || '',
      date: appointmentData.date || new Date().toISOString(),
      status: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    const response = await databases.createDocument(
      databaseId,
      appointmentsCollectionId,
      ID.unique(),
      appointment
    );
    
    return response;
  } catch (error) {
    console.error('Error creating appointment:', error);
    throw error;
  }
};

// Update appointment status
export const updateAppointmentStatus = async (appointmentId, status) => {
  try {
    const updateData = {
      status,
      updatedAt: new Date().toISOString()
    };
    
    // If marking as completed, add completedDate
    if (status === 'completed') {
      updateData.completedDate = new Date().toISOString();
    }
    
    await databases.updateDocument(
      databaseId,
      appointmentsCollectionId,
      appointmentId,
      updateData
    );
    
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
