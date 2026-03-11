# Automatic SMS Reminder System

## Overview
The system automatically sends SMS reminders to students **1 hour before their scheduled driving lesson**. This runs in the background on the backend server and requires no manual intervention.

## How It Works

### 1. **Automatic Scheduler**
When the backend server starts, it initializes an automatic SMS scheduler that:
- Checks for upcoming appointments every **5 minutes**
- Identifies appointments scheduled **55-65 minutes** from now (1-hour window)
- Sends SMS reminders automatically to students

### 2. **Reminder Window**
The system sends reminders when an appointment is:
- **Minimum**: 55 minutes away
- **Maximum**: 65 minutes away
- **Target**: 60 minutes (1 hour) before the appointment

This 10-minute window ensures reminders are sent even if the server restarts or there are temporary delays.

### 3. **Duplicate Prevention**
The system prevents duplicate reminders by:
- Tracking sent reminders in memory
- Updating the database with `reminderSmsSent` flag
- Clearing old reminder records daily at midnight

### 4. **Process Flow**

```
1. Server checks appointments every 5 minutes
   ↓
2. Finds bookings scheduled for today
   ↓
3. Calculates time until each appointment
   ↓
4. If appointment is 55-65 minutes away:
   ├─ Check if reminder already sent
   ├─ Get student's phone number
   ├─ Send SMS reminder
   └─ Mark as sent in database
   ↓
5. Wait 5 minutes and repeat
```

## Example Scenario

**Booking Time**: 9:00 AM  
**Reminder Sent**: 8:00 AM (approximately)

```
7:50 AM - System checks: 70 minutes away → Too early, skip
7:55 AM - System checks: 65 minutes away → Send reminder ✓
8:00 AM - System checks: 60 minutes away → Already sent, skip
8:05 AM - System checks: 55 minutes away → Already sent, skip
8:10 AM - System checks: 50 minutes away → Too late, skip
```

## Server Logs

When the system is running, you'll see logs like:

```
Server is running on http://localhost:5000

🚀 SMS Features Enabled:
   ✓ Manual SMS sending via API endpoints
   ✓ Automatic reminders 1 hour before appointments
   ✓ Checking for reminders every 5 minutes

Starting automatic SMS scheduler...
Checking for reminders every 5 minutes
Checking for appointments needing reminders...
Found 3 bookings for today
Sending reminder to 09123456789 for appointment at 9:00 AM
✓ Reminder sent successfully for booking abc123
```

## Database Updates

When a reminder is sent, the booking document is updated with:

```json
{
  "reminderSmsSent": true,
  "reminderSmsSentAt": "2026-03-11T08:00:00.000Z",
  "autoReminderSent": true
}
```

## SMS Message Template

**Automatic Reminder SMS:**
```
Reminder: Hi [Student Name], you have a driving lesson tomorrow on [Date] at [Time] with [Instructor]. Don't forget! - EasyDrive
```

## Configuration

### Backend (.env)
```env
SMS_API_KEY=your_semaphore_api_key_here
SMS_SENDER_NAME=EasyDrive
```

### Scheduler Settings (backend/services/smsScheduler.js)
```javascript
// Check interval: 5 minutes
const checkInterval = 5 * 60 * 1000;

// Reminder window: 55-65 minutes before appointment
if (timeDiff >= 55 && timeDiff <= 65) {
  // Send reminder
}
```

## Requirements

### 1. **User Data**
Students must have a phone number in their profile:
- Field: `phoneNumber` or `phone`
- Format: `09XXXXXXXXX`, `+639XXXXXXXXX`, or `639XXXXXXXXX`

### 2. **Booking Data**
Bookings must include:
- `date`: YYYY-MM-DD format
- `time`: "HH:MM AM/PM" format
- `userId`: Reference to user document
- `status`: Not 'cancelled' or 'completed'

### 3. **Server Running**
The backend server must be continuously running for automatic reminders to work.

## Time Parsing

The system parses time strings like:
- "9:00 AM" → 09:00
- "12:30 PM" → 12:30
- "3:45 PM" → 15:45
- "11:00 PM" → 23:00

## Error Handling

### No Phone Number
```
No phone number for booking abc123
```
**Solution**: Add phone number to user profile

### Failed to Send SMS
```
✗ Failed to send reminder for booking abc123: Insufficient credits
```
**Solution**: Check SMS balance and reload credits

### Parse Error
```
Error parsing time: invalid format
```
**Solution**: Ensure time is in "HH:MM AM/PM" format

## Monitoring

### Check if Scheduler is Running
Look for this message in server logs:
```
Starting automatic SMS scheduler...
```

### Check SMS Activity
1. View server console logs
2. Check SMS activity in Admin Dashboard
3. Check SMS history in SMS Monitoring page

### Check Database
Query bookings to see which reminders were sent:
```javascript
// Bookings with reminders sent
{
  "reminderSmsSent": true,
  "reminderSmsSentAt": "2026-03-11T08:00:00.000Z"
}
```

## Manual Override

If you need to manually send a reminder:

### Option 1: SMS Monitoring Page
1. Go to Admin Dashboard → SMS Monitoring
2. Find the appointment
3. Click "⏰ Remind" button

### Option 2: API Endpoint
```bash
POST http://localhost:5000/api/sms/appointment-reminder
Content-Type: application/json

{
  "phoneNumber": "09123456789",
  "appointmentData": {
    "studentName": "Juan Dela Cruz",
    "date": "March 11, 2026",
    "time": "9:00 AM",
    "instructor": "Maria Santos"
  }
}
```

## Testing

### Test with a Near-Future Appointment

1. **Create a test booking** for 1 hour from now:
   ```javascript
   // If current time is 2:30 PM, create booking for 3:30 PM
   {
     "date": "2026-03-11",
     "time": "3:30 PM",
     "userId": "user123",
     "status": "pending"
   }
   ```

2. **Wait for the scheduler** (checks every 5 minutes)

3. **Check logs** around 2:30-2:35 PM:
   ```
   Sending reminder to 09123456789 for appointment at 3:30 PM
   ✓ Reminder sent successfully
   ```

4. **Verify SMS** on the phone number

### Test with Modified Check Interval

For faster testing, temporarily change the check interval in `smsScheduler.js`:
```javascript
// Change from 5 minutes to 1 minute
const checkInterval = setInterval(() => {
  checkAndSendReminders(bookingsCollectionId, usersCollectionId);
}, 1 * 60 * 1000); // 1 minute (for testing only)
```

**⚠️ Remember to change it back to 5 minutes for production!**

## Troubleshooting

### Reminders Not Sending

**Check 1: Is the server running?**
```bash
# Should show:
Server is running on http://localhost:5000
Starting automatic SMS scheduler...
```

**Check 2: Are there bookings 1 hour from now?**
- Verify booking date is today
- Verify booking time is approximately 1 hour away
- Verify status is 'pending' or 'confirmed'

**Check 3: Do users have phone numbers?**
- Check user collection for `phoneNumber` field
- Ensure format is valid

**Check 4: SMS API working?**
- Check .env file has SMS_API_KEY
- Verify SMS balance using `/api/sms/balance` endpoint
- Test manual SMS sending first

**Check 5: Check server logs**
- Look for error messages
- Verify scheduler is checking appointments

### Reminder Sent Multiple Times

This shouldn't happen because:
1. System tracks sent reminders in memory
2. Database is marked with `reminderSmsSent: true`
3. Reminder key includes booking ID and date

If it does happen:
- Server may have restarted
- Check database for `reminderSmsSent` flag
- Verify sent reminders are being tracked

### Wrong Time Zone

The system uses server time zone. Ensure:
1. Server is in the correct time zone
2. Booking times match server time zone
3. Use absolute times, not relative

## Benefits

✅ **Automatic**: No manual intervention needed  
✅ **Reliable**: Checks every 5 minutes  
✅ **Prevents No-Shows**: Students are reminded in advance  
✅ **Scalable**: Handles multiple appointments  
✅ **Duplicate-Proof**: Won't send twice  
✅ **Logged**: All activities are tracked  

## Cost Considerations

- **SMS Cost**: ~₱0.50-₱1.00 per SMS
- **Frequency**: 1 SMS per appointment (1 hour before)
- **Daily Usage**: Number of appointments × 1 SMS
- **Example**: 20 appointments/day = ₱10-₱20/day

## Future Enhancements

Possible improvements:
- [ ] Configurable reminder time (30 min, 2 hours, etc.)
- [ ] Multiple reminders (24 hours + 1 hour before)
- [ ] SMS confirmation responses
- [ ] Retry failed SMS
- [ ] Email fallback if SMS fails
- [ ] Admin notifications for failed SMSs
- [ ] Dashboard statistics for sent reminders

## Related Files

- **Scheduler**: `backend/services/smsScheduler.js`
- **SMS Service**: `backend/services/smsService.js`
- **Server**: `backend/server.js`
- **Config**: `backend/.env`
- **Frontend**: `frontend/src/components/SMSMonitoring.js`

## Support

For issues or questions:
1. Check server logs first
2. Verify SMS balance
3. Test manual SMS sending
4. Review this documentation
5. Check [SMS Integration Guide](SMS_INTEGRATION_GUIDE.md)
