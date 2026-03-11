# SMS Integration Guide

## Overview
This application uses **Semaphore SMS API** to send automatic SMS notifications for appointments, reminders, and cancellations.

## Configuration

### Backend Setup

1. **Environment Variables** (`.env` file in `/backend`)
   ```env
   SMS_API_KEY=sk-2b10szb70eizax4gsiklt9j5uvveldib
   SMS_SENDER_NAME=EasyDrive
   ```

2. **Security Note**
   - ⚠️ Never commit the `.env` file to version control
   - The `.env` file is already in `.gitignore`
   - Use `.env.example` as a template for other developers

### Frontend Setup

No additional configuration needed. The frontend uses the utility functions in `/frontend/src/utils/smsHelper.js`.

## Usage

### From Frontend Components

```javascript
import smsHelper from '../utils/smsHelper';

// Send appointment confirmation
const result = await smsHelper.sendAppointmentConfirmation(
  '09123456789',
  {
    studentName: 'Juan Dela Cruz',
    date: 'March 15, 2026',
    time: '10:00 AM',
    instructor: 'Maria Santos',
    vehicleType: 'Sedan'
  }
);

if (result.success) {
  console.log('SMS sent successfully!');
} else {
  console.error('Failed to send SMS:', result.error);
}
```

### Available Functions

#### 1. Send Appointment Confirmation
```javascript
await smsHelper.sendAppointmentConfirmation(phoneNumber, {
  studentName: 'Name',
  date: 'Date',
  time: 'Time',
  instructor: 'Instructor Name',
  vehicleType: 'Vehicle Type'
});
```

#### 2. Send Appointment Reminder
```javascript
await smsHelper.sendAppointmentReminder(phoneNumber, {
  studentName: 'Name',
  date: 'Date',
  time: 'Time',
  instructor: 'Instructor Name'
});
```

#### 3. Send Appointment Cancellation
```javascript
await smsHelper.sendAppointmentCancellation(phoneNumber, {
  studentName: 'Name',
  date: 'Date',
  time: 'Time'
});
```

#### 4. Send Appointment Reschedule
```javascript
await smsHelper.sendAppointmentReschedule(phoneNumber, {
  studentName: 'Name',
  oldDate: 'Old Date',
  oldTime: 'Old Time',
  newDate: 'New Date',
  newTime: 'New Time'
});
```

#### 5. Send Custom SMS
```javascript
await smsHelper.sendCustomSMS('09123456789', 'Your custom message here');
```

#### 6. Check SMS Balance
```javascript
const balance = await smsHelper.checkBalance();
console.log('Credits remaining:', balance.data);
```

## Phone Number Format

The SMS service automatically formats phone numbers to Philippine format:

- **Input:** `09123456789` or `+639123456789` or `9123456789`
- **Output:** `639123456789` (Semaphore format)

## API Endpoints

All SMS endpoints are available at: `http://localhost:5000/api/sms/`

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/sms/appointment-confirmation` | POST | Send appointment confirmation |
| `/api/sms/appointment-reminder` | POST | Send appointment reminder |
| `/api/sms/appointment-cancellation` | POST | Send appointment cancellation |
| `/api/sms/appointment-reschedule` | POST | Send appointment reschedule |
| `/api/sms/send` | POST | Send custom SMS |
| `/api/sms/balance` | GET | Check SMS balance |

## Integration Examples

### Example 1: Send Confirmation When Booking Appointment

```javascript
// In BookLesson.js or AppointmentModal.js
import smsHelper from '../utils/smsHelper';

const handleBookAppointment = async (appointmentData) => {
  try {
    // Save appointment to database
    await saveAppointment(appointmentData);
    
    // Send SMS confirmation
    const smsResult = await smsHelper.sendAppointmentConfirmation(
      appointmentData.phoneNumber,
      appointmentData
    );
    
    if (smsResult.success) {
      alert('Appointment booked and SMS confirmation sent!');
    }
  } catch (error) {
    console.error('Error:', error);
  }
};
```

### Example 2: Send Reminder in Admin Dashboard

```javascript
// In AdminDashboard.js
import smsHelper from '../utils/smsHelper';

const sendReminder = async (appointment) => {
  const result = await smsHelper.sendAppointmentReminder(
    appointment.phoneNumber,
    {
      studentName: appointment.studentName,
      date: appointment.date,
      time: appointment.time,
      instructor: appointment.instructor
    }
  );
  
  if (result.success) {
    alert('Reminder sent successfully!');
  } else {
    alert('Failed to send reminder: ' + result.error);
  }
};
```

### Example 3: Send Cancellation Notice

```javascript
const handleCancelAppointment = async (appointment) => {
  // Cancel in database
  await cancelAppointment(appointment.id);
  
  // Send SMS notification
  await smsHelper.sendAppointmentCancellation(
    appointment.phoneNumber,
    {
      studentName: appointment.studentName,
      date: appointment.date,
      time: appointment.time
    }
  );
};
```

## Testing

### Check if SMS Service is Working

1. Start the backend server: `npm start` (in `/backend`)
2. Test the balance endpoint:
   ```bash
   curl http://localhost:5000/api/sms/balance
   ```
3. Send a test SMS:
   ```bash
   curl -X POST http://localhost:5000/api/sms/send \
     -H "Content-Type: application/json" \
     -d '{"phoneNumber":"09123456789","message":"Test message"}'
   ```

## SMS Message Templates

Messages are automatically formatted with the following templates:

**Confirmation:**
```
Hello [Name]! Your driving lesson has been confirmed.

Date: [Date]
Time: [Time]
Instructor: [Instructor]
Vehicle: [Vehicle Type]

See you soon! - EasyDrive
```

**Reminder:**
```
Reminder: Hi [Name], you have a driving lesson tomorrow on [Date] at [Time] with [Instructor]. Don't forget! - EasyDrive
```

**Cancellation:**
```
Hello [Name], your driving lesson scheduled for [Date] at [Time] has been cancelled. Please contact us for rescheduling. - EasyDrive
```

**Reschedule:**
```
Hello [Name], your lesson has been rescheduled from [Old Date] [Old Time] to [New Date] [New Time]. - EasyDrive
```

## Troubleshooting

### SMS Not Sending?

1. **Check API Key:** Verify the API key in `.env` is correct
2. **Check Balance:** Use the balance endpoint to check credits
3. **Check Phone Format:** Ensure phone numbers are in correct format
4. **Check Backend Logs:** Look for error messages in the terminal

### Common Errors

- **"SMS API key is not configured"** - API key missing or invalid in `.env`
- **"Invalid phone number"** - Phone number format is incorrect
- **"Insufficient credits"** - Need to reload SMS credits in Semaphore account

## Cost Management

- Each SMS typically costs around ₱0.50 - ₱1.00 depending on your Semaphore plan
- Monitor your balance regularly using the balance endpoint
- Consider implementing SMS rate limiting for production

## Production Deployment

When deploying to production:

1. Set environment variables in your hosting platform (Heroku, Vercel, etc.)
2. Never expose the API key in frontend code
3. Consider adding SMS rate limiting to prevent abuse
4. Monitor SMS usage and costs regularly

## Support

For issues with Semaphore API:
- Visit: https://semaphore.co
- Documentation: https://semaphore.co/docs
- Support: support@semaphore.co
