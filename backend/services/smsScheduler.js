const { databases, databaseId } = require('../config/appwrite');
const smsService = require('./smsService');

/**
 * Automatic SMS Scheduler
 * Checks for upcoming appointments and sends reminder SMS 1 hour before scheduled time
 */

// Store sent reminders to avoid duplicates
const sentReminders = new Set();

/**
 * Check appointments and send reminders
 */
async function checkAndSendReminders(bookingsCollectionId, usersCollectionId) {
  try {
    console.log('Checking for appointments needing reminders...');
    
    // Get current date and time
    const now = new Date();
    const currentDate = now.toISOString().split('T')[0]; // YYYY-MM-DD
    
    // Get all bookings for today
    const response = await databases.listDocuments(
      databaseId,
      bookingsCollectionId
    );

    const bookings = response.documents;
    
    // Filter bookings for today
    const todayBookings = bookings.filter(booking => {
      return booking.date === currentDate && booking.status !== 'cancelled' && booking.status !== 'completed';
    });

    console.log(`Found ${todayBookings.length} bookings for today`);

    for (const booking of todayBookings) {
      try {
        // Parse booking time (format: "HH:MM AM/PM")
        const bookingTime = parseTime(booking.time);
        if (!bookingTime) continue;

        // Calculate scheduled time for today
        const scheduledTime = new Date(now);
        scheduledTime.setHours(bookingTime.hours, bookingTime.minutes, 0, 0);

        // Calculate time difference in minutes
        const timeDiff = (scheduledTime - now) / (1000 * 60); // Convert to minutes

        // Send reminder if appointment is between 55-65 minutes away (1 hour window)
        if (timeDiff >= 55 && timeDiff <= 65) {
          const reminderKey = `${booking.$id}-${currentDate}`;
          
          // Check if reminder already sent
          if (sentReminders.has(reminderKey)) {
            console.log(`Reminder already sent for booking ${booking.$id}`);
            continue;
          }

          // Get user phone number
          let phoneNumber = null;
          if (booking.userId) {
            try {
              const user = await databases.getDocument(
                databaseId,
                usersCollectionId,
                booking.userId
              );
              phoneNumber = user.phoneNumber || user.phone;
            } catch (error) {
              console.error(`Error fetching user ${booking.userId}:`, error);
            }
          }

          if (!phoneNumber) {
            console.log(`No phone number for booking ${booking.$id}`);
            continue;
          }

          // Prepare appointment data
          const appointmentData = {
            studentName: booking.userName || 'Student',
            date: new Date(booking.date).toLocaleDateString('en-US', { 
              month: 'short', 
              day: 'numeric' 
            }),
            time: booking.time,
            instructor: booking.instructor || 'TBA',
            vehicleType: booking.vehicleType || 'TBA',
            lessonType: booking.lessonType || 'practical'
          };

          // Send reminder SMS
          console.log(`Sending reminder to ${phoneNumber} for appointment at ${booking.time}`);
          const result = await smsService.sendAppointmentReminder(phoneNumber, appointmentData);

          if (result.success) {
            console.log(`✓ Reminder sent successfully for booking ${booking.$id}`);
            
            // Mark reminder as sent in database
            await databases.updateDocument(
              databaseId,
              bookingsCollectionId,
              booking.$id,
              { 
                reminderSmsSent: true, 
                reminderSmsSentAt: new Date().toISOString(),
                autoReminderSent: true 
              }
            );

            // Add to sent reminders set
            sentReminders.add(reminderKey);
          } else {
            console.error(`✗ Failed to send reminder for booking ${booking.$id}:`, result.error);
          }
        }
      } catch (error) {
        console.error(`Error processing booking ${booking.$id}:`, error);
      }
    }
  } catch (error) {
    console.error('Error checking appointments:', error);
  }
}

/**
 * Parse time string to hours and minutes
 * @param {string} timeStr - Time in format "HH:MM AM/PM"
 * @returns {Object|null} - { hours: number, minutes: number }
 */
function parseTime(timeStr) {
  try {
    const match = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
    if (!match) return null;

    let hours = parseInt(match[1]);
    const minutes = parseInt(match[2]);
    const meridiem = match[3].toUpperCase();

    // Convert to 24-hour format
    if (meridiem === 'PM' && hours !== 12) {
      hours += 12;
    } else if (meridiem === 'AM' && hours === 12) {
      hours = 0;
    }

    return { hours, minutes };
  } catch (error) {
    console.error('Error parsing time:', error);
    return null;
  }
}

/**
 * Clean up old sent reminders (from previous days)
 */
function cleanupOldReminders() {
  const currentDate = new Date().toISOString().split('T')[0];
  
  for (const key of sentReminders) {
    if (!key.includes(currentDate)) {
      sentReminders.delete(key);
    }
  }
  
  console.log(`Cleaned up old reminders. Current count: ${sentReminders.size}`);
}

/**
 * Start the automatic SMS scheduler
 */
function startAutomaticSMSScheduler(bookingsCollectionId, usersCollectionId) {
  console.log('Starting automatic SMS scheduler...');
  console.log('Checking for reminders every 5 minutes');

  // Check immediately on start
  checkAndSendReminders(bookingsCollectionId, usersCollectionId);

  // Check every 5 minutes
  const checkInterval = setInterval(() => {
    checkAndSendReminders(bookingsCollectionId, usersCollectionId);
  }, 5 * 60 * 1000); // 5 minutes

  // Clean up old reminders daily at midnight
  const cleanupInterval = setInterval(() => {
    cleanupOldReminders();
  }, 24 * 60 * 60 * 1000); // 24 hours

  // Return cleanup function
  return () => {
    clearInterval(checkInterval);
    clearInterval(cleanupInterval);
    console.log('Automatic SMS scheduler stopped');
  };
}

module.exports = {
  startAutomaticSMSScheduler,
  checkAndSendReminders
};
