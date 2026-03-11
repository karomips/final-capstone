# SMS Monitoring Page - Admin Guide

## Overview
The SMS Monitoring page is a comprehensive admin dashboard for managing and tracking SMS notifications sent to students for their scheduled appointments.

## Access
Navigate to: **Admin Dashboard** → **📱 SMS Monitoring**
Route: `/admin/sms-monitoring`

## Features

### 1. **SMS Balance Display**
- Shows current SMS credits available
- Real-time balance check with refresh button
- Located in the top-right header

### 2. **Search & Filters**
- **Search Bar**: Search by student name, phone number, or instructor name
- **Status Filter**: Filter bookings by:
  - All Statuses
  - Pending
  - Confirmed
  - Completed
  - Cancelled
- **Date Filter**: Filter bookings by:
  - All Dates
  - Today
  - Upcoming
  - Past

### 3. **Statistics Dashboard**
Quick overview cards showing:
- Total bookings (based on filters)
- SMS sent today
- Pending appointments
- Confirmed appointments

### 4. **Appointment Table**
Complete list of bookings with:
- Student information (name, email)
- Phone number
- Date and time
- Instructor name
- Vehicle type
- Current status
- SMS action buttons

### 5. **SMS Actions**
Three types of SMS notifications can be sent for each appointment:

#### ✓ Confirmation SMS
- Confirms the appointment booking
- Includes: date, time, instructor, vehicle type
- Button color: Green

**Message Template:**
```
Hello [Name]! Your driving lesson has been confirmed.

Date: [Date]
Time: [Time]
Instructor: [Instructor]
Vehicle: [Vehicle Type]

See you soon! - EasyDrive
```

#### ⏰ Reminder SMS
- Sends a reminder about upcoming appointment
- Includes: date, time, instructor
- Button color: Orange

**Message Template:**
```
Reminder: Hi [Name], you have a driving lesson tomorrow on [Date] at [Time] with [Instructor]. Don't forget! - EasyDrive
```

#### ✗ Cancellation SMS
- Notifies student about cancelled appointment
- Includes: date, time
- Button color: Red

**Message Template:**
```
Hello [Name], your driving lesson scheduled for [Date] at [Time] has been cancelled. Please contact us for rescheduling. - EasyDrive
```

### 6. **SMS Status Tracking**
Each SMS button shows status badges:
- **Sending...** - SMS is being sent (animated)
- **✓ Sent** - SMS successfully sent
- **✗ Failed** - SMS failed to send
- **Sent** (gray) - Previously sent

The system tracks which SMS types have been sent for each booking to prevent duplicates.

### 7. **SMS Activity History**
- Shows the last 10 SMS activities
- Displays:
  - Student name
  - SMS type (confirmation, reminder, cancellation)
  - Phone number
  - Timestamp
  - Success/failure status
  - Error messages (if any)
- History is stored in browser localStorage (last 50 entries)
- Color-coded for easy identification (green = success, red = failure)

## How to Use

### Sending an SMS
1. Find the appointment in the table
2. Click the appropriate SMS button:
   - **✓ Confirm** for confirmations
   - **⏰ Remind** for reminders
   - **✗ Cancel** for cancellations
3. Watch the status change to "Sending..."
4. Once sent, the button will show "✓ Sent"
5. Check the SMS Activity History for confirmation

### Checking SMS Balance
1. Look at the top-right corner
2. Click the 🔄 refresh button to update balance
3. Monitor credits to ensure you have enough for notifications

### Filtering Appointments
1. Use the search bar to find specific students
2. Select status filter to see specific appointment types
3. Use date filter to view today's, upcoming, or past appointments
4. Filters work together for precise results

### Best Practices
- ✅ Send confirmation SMS immediately after booking
- ✅ Send reminder SMS 1 day before the appointment
- ✅ Send cancellation SMS as soon as an appointment is cancelled
- ✅ Check SMS balance regularly
- ✅ Review SMS activity history to track deliveries
- ❌ Don't send multiple SMS of the same type (system tracks this)
- ❌ Don't send SMS to numbers marked as 'N/A'

## Automatic Features

### Phone Number Formatting
The system automatically formats phone numbers:
- Input: `09123456789` → Output: `639123456789`
- Input: `+639123456789` → Output: `639123456789`
- Input: `9123456789` → Output: `639123456789`

### SMS Tracking
- Each sent SMS is logged with timestamp
- Database is updated with SMS sent flags
- Prevents duplicate SMS sending
- History persists in browser localStorage

### Error Handling
- Validates phone numbers before sending
- Shows error messages if SMS fails
- Logs errors in activity history
- Disables buttons for invalid numbers

## Responsive Design
The page is fully responsive and works on:
- Desktop (full layout)
- Tablet (adjusted layout)
- Mobile (compact sidebar, stacked elements)

## Integration with Backend
The page connects to these API endpoints:
- `POST /api/sms/appointment-confirmation`
- `POST /api/sms/appointment-reminder`
- `POST /api/sms/appointment-cancellation`
- `GET /api/sms/balance`

## Data Sources
- **Bookings**: Fetched from Appwrite `bookings` collection
- **User Info**: Fetched from Appwrite `users` collection
- **SMS History**: Stored in browser localStorage
- **Balance**: Retrieved from Semaphore API

## Troubleshooting

### SMS Not Sending
1. Check if phone number is valid (not 'N/A')
2. Verify SMS balance has sufficient credits
3. Check console for error messages
4. Ensure backend server is running
5. Verify API key in backend `.env` file

### Balance Not Showing
1. Click the refresh button
2. Check backend server connection
3. Verify API key is correct
4. Check browser console for errors

### History Not Saving
1. Check browser localStorage is enabled
2. Clear browser cache if needed
3. Check console for localStorage errors

## Security Notes
- SMS API key is stored in backend environment variables
- Never exposed to frontend
- All SMS requests go through backend API
- Phone numbers are validated before sending

## Future Enhancements
Possible additions:
- Bulk SMS sending
- Scheduled SMS (automatic reminders)
- SMS templates customization
- Export SMS history
- SMS delivery reports
- Cost tracking per SMS

## Support
For issues or questions about the SMS Monitoring page, refer to:
- [SMS Integration Guide](../SMS_INTEGRATION_GUIDE.md)
- Backend server logs for API errors
- Browser console for frontend errors
