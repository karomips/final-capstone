const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

// Load environment variables FIRST before requiring other modules
dotenv.config();

const { databases, users, databaseId, usersCollectionId, appointmentsCollectionId, bookingsCollectionId } = require('./config/appwrite');
const smsService = require('./services/smsService');
const { startAutomaticSMSScheduler } = require('./services/smsScheduler');

// Initialize Express
const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Test route
app.get('/api', (req, res) => {
  res.json({ message: 'Backend API is running with Appwrite!' });
});

// Example: Get user data
app.get('/api/users/:uid', async (req, res) => {
  try {
    const { uid } = req.params;
    const userDoc = await databases.getDocument(databaseId, usersCollectionId, uid);
    
    res.json(userDoc);
  } catch (error) {
    if (error.code === 404) {
      return res.status(404).json({ error: 'User not found' });
    }
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Example: Create/Update user profile
app.post('/api/users/:uid', async (req, res) => {
  try {
    const { uid } = req.params;
    const userData = req.body;
    
    // Try to update existing document, if not exists, create new one
    try {
      const updatedUser = await databases.updateDocument(
        databaseId,
        usersCollectionId,
        uid,
        userData
      );
      res.json({ message: 'User profile updated successfully', user: updatedUser });
    } catch (error) {
      if (error.code === 404) {
        // Document doesn't exist, create it
        const newUser = await databases.createDocument(
          databaseId,
          usersCollectionId,
          uid,
          userData
        );
        res.json({ message: 'User profile created successfully', user: newUser });
      } else {
        throw error;
      }
    }
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// SMS Routes

// Send appointment confirmation SMS
app.post('/api/sms/appointment-confirmation', async (req, res) => {
  try {
    const { phoneNumber, appointmentData } = req.body;
    
    if (!phoneNumber || !appointmentData) {
      return res.status(400).json({ error: 'Phone number and appointment data are required' });
    }

    const result = await smsService.sendAppointmentConfirmation(phoneNumber, appointmentData);
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(500).json(result);
    }
  } catch (error) {
    console.error('Error sending SMS:', error);
    res.status(500).json({ error: 'Failed to send SMS' });
  }
});

// Send appointment reminder SMS
app.post('/api/sms/appointment-reminder', async (req, res) => {
  try {
    const { phoneNumber, appointmentData } = req.body;
    
    if (!phoneNumber || !appointmentData) {
      return res.status(400).json({ error: 'Phone number and appointment data are required' });
    }

    const result = await smsService.sendAppointmentReminder(phoneNumber, appointmentData);
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(500).json(result);
    }
  } catch (error) {
    console.error('Error sending SMS:', error);
    res.status(500).json({ error: 'Failed to send SMS' });
  }
});

// Send appointment cancellation SMS
app.post('/api/sms/appointment-cancellation', async (req, res) => {
  try {
    const { phoneNumber, appointmentData } = req.body;
    
    if (!phoneNumber || !appointmentData) {
      return res.status(400).json({ error: 'Phone number and appointment data are required' });
    }

    const result = await smsService.sendAppointmentCancellation(phoneNumber, appointmentData);
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(500).json(result);
    }
  } catch (error) {
    console.error('Error sending SMS:', error);
    res.status(500).json({ error: 'Failed to send SMS' });
  }
});

// Send appointment reschedule SMS
app.post('/api/sms/appointment-reschedule', async (req, res) => {
  try {
    const { phoneNumber, appointmentData } = req.body;
    
    if (!phoneNumber || !appointmentData) {
      return res.status(400).json({ error: 'Phone number and appointment data are required' });
    }

    const result = await smsService.sendAppointmentReschedule(phoneNumber, appointmentData);
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(500).json(result);
    }
  } catch (error) {
    console.error('Error sending SMS:', error);
    res.status(500).json({ error: 'Failed to send SMS' });
  }
});

// Send custom SMS
app.post('/api/sms/send', async (req, res) => {
  try {
    const { phoneNumber, message } = req.body;
    
    if (!phoneNumber || !message) {
      return res.status(400).json({ error: 'Phone number and message are required' });
    }

    const result = await smsService.sendSMS(phoneNumber, message);
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(500).json(result);
    }
  } catch (error) {
    console.error('Error sending SMS:', error);
    res.status(500).json({ error: 'Failed to send SMS' });
  }
});

// Check SMS balance - DISABLED (not needed for this application)
// app.get('/api/sms/balance', async (req, res) => {
//   try {
//     const result = await smsService.checkBalance();
//     
//     if (result.success) {
//       res.json(result);
//     } else {
//       res.status(500).json(result);
//     }
//   } catch (error) {
//     console.error('Error checking SMS balance:', error);
//     res.status(500).json({ error: 'Failed to check balance' });
//   }
// });

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
  console.log(`\n🚀 SMS Features Enabled:`);
  console.log(`   ✓ Manual SMS sending via API endpoints`);
  console.log(`   ✓ Automatic reminders 1 hour before appointments`);
  console.log(`   ✓ Checking for reminders every 5 minutes\n`);
  
  // Start automatic SMS scheduler
  startAutomaticSMSScheduler(bookingsCollectionId, usersCollectionId);
});
