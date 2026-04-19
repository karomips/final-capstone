# Instructor Role & Leave Management Integration Guide

## Overview
This guide explains the complete integration of:
1. **Role-based Instructor Login** - Instructors can now login with their own role
2. **Leave Management** - Instructors can set leaves which prevents student bookings
3. **Admin Leave Display** - Admin can view instructor leaves in real-time
4. **User Leave Blocking** - Students cannot book instructors on leave

## Changes Made

### 1. Login Page Enhancement (Login.js)

Added role selector to allow instructors to login as themselves.

**Changes:**
- Added `role` state with options: 'user', 'instructor', 'admin'
- Updated `handleSubmit` to route based on selected role:
  - Admin role → `/admin`
  - Instructor role → `/instructor`
  - User role → `/user-dashboard`
- Added role selector dropdown UI

```jsx
<select value={role} onChange={(e) => setRole(e.target.value)}>
  <option value="user">Student</option>
  <option value="instructor">Instructor</option>
  <option value="admin">Admin</option>
</select>
```

### 2. AuthContext Update (AuthContext.js)

Added instructor role detection helper function:

```javascript
function isInstructorUser(userDoc) {
  return userDoc?.role === 'instructor';
}
```

### 3. Config Update (config.js)

Added `instructorSchedulesCollectionId` to exports:

```javascript
instructorSchedulesCollectionId: 'instructor-schedules'
```

### 4. BookLesson Component (BookLesson.js)

Enhanced to filter instructors based on leaves:

**New Function:**
```javascript
const isInstructorOnLeave = async (instructorName, dateToCheck) => {
  // Checks if instructor is on leave for given date
  // Returns true if instructor is on leave, false otherwise
}
```

**Updated fetchInstructors Function:**
- Added leave validation when date is selected
- Filters out instructors on leave
- Updated dependency array to include `date`

### 5. Instructor Dashboard (InstructorDashboard.js)

**Key Features:**
- ⏰ **Working Hours Management** - Set hours per day
- ☕ **Break Management** - Add multiple breaks
- 🏖️ **Leave Management** - Request leaves with dates and reason
- 📋 **My Schedule** - View upcoming lessons
- 🔔 **Slot Alerts** - Notifications for cancelled lessons

**Save Functionality:**
- All settings (hours, breaks, leaves) are saved to database
- Uses same `instructorSchedulesCollectionId` collection
- Automatically updates on instructor settings changes

### 6. Admin Instructors Profile (InstructorsProfile.js)

**Added:**
- Import for `instructorSchedulesCollectionId`
- State: `instructorSchedules` to store instructor schedule data
- Function: `fetchInstructorSchedules()` to fetch all instructor leaves
- Display: Leave information shown on instructor cards with:
  - Leave dates (start to end)
  - Reason (if provided)
  - Visual indicator (yellow background)

**Example Display:**
```
🏖️ On Leave:
Apr 25 - Apr 27 (Personal)
```

### 7. App Routing (App.js)

Added instructor-specific routes:

```jsx
<Route 
  path="/instructor/*" 
  element={
    <PrivateRoute>
      <InstructorLayout />
    </PrivateRoute>
  }
>
  <Route path="" element={<InstructorDashboard />} />
</Route>
```

### 8. Instructor Layout Component (InstructorLayout.js)

- Created new layout component for instructor dashboard
- Similar structure to UserLayout and AdminLayout
- Sidebar with instructor-specific navigation
- Theme support

### 9. SMS Monitoring Enhancement (SMSMonitoring.js)

Updated cancellation flow to notify instructors:

**When a booking is cancelled:**
1. Updates booking status to 'cancelled'
2. Stores notification in localStorage (cancelledNotifications)
3. Notification includes:
   - Date and time of cancelled slot
   - Student name
   - Lesson type
   - Instructor name
4. Instructor sees available slot in "Slot Alerts" tab

## Database Setup

### Instructor Schedule Collection (`instructor-schedules`)

**Create Collection:**
- Collection ID: `instructor-schedules`
- Collection Name: `Instructor Schedules`

**Attributes:**

| Field | Type | Required | Purpose |
|-------|------|----------|---------|
| `instructorId` | String (250) | ✓ | Links to instructor user |
| `instructorName` | String (250) | ✓ | Instructor name for queries |
| `workingHours` | JSON | ✓ | Weekly working hours |
| `breaks` | JSON | ✓ | Scheduled breaks |
| `leaves` | JSON | ✓ | Approved/requested leaves |
| `updatedAt` | String | - | Last update timestamp |

**Example Data Structure:**

```json
{
  "instructorId": "user123",
  "instructorName": "Instructor 2",
  "workingHours": {
    "monday": { "start": "08:00", "end": "18:00", "off": false },
    "tuesday": { "start": "08:00", "end": "18:00", "off": false },
    "wednesday": { "start": "08:00", "end": "18:00", "off": false },
    "thursday": { "start": "08:00", "end": "18:00", "off": false },
    "friday": { "start": "08:00", "end": "18:00", "off": false },
    "saturday": { "start": "08:00", "end": "14:00", "off": false },
    "sunday": { "start": "", "end": "", "off": true }
  },
  "breaks": [
    { "id": 1, "day": "monday", "start": "12:00", "end": "13:00" },
    { "id": 2, "day": "wednesday", "start": "15:00", "end": "15:30" }
  ],
  "leaves": [
    {
      "id": 1,
      "startDate": "2026-04-25",
      "endDate": "2026-04-27",
      "reason": "Personal",
      "createdAt": "2026-04-19T10:00:00.000Z"
    }
  ],
  "updatedAt": "2026-04-19T14:30:00.000Z"
}
```

## User Flow

### Instructor Workflow

1. **Login as Instructor**
   - Go to login page
   - Select "Instructor" from role dropdown
   - Enter credentials
   - Redirected to `/instructor` dashboard

2. **Set Working Hours**
   - Tab: "⏰ Working Hours"
   - Set hours for each day or mark as "Day Off"
   - Click "💾 Save Working Hours"

3. **Add Breaks**
   - Tab: "☕ Breaks"
   - Click "➕ Add Break"
   - Select day and time
   - Click "💾 Save Breaks"

4. **Request Leaves**
   - Tab: "🏖️ Leaves"
   - Fill in start date, end date, and reason
   - Click "➕ Add Leave"
   - Click "💾 Save Leaves"

5. **View Schedule**
   - Tab: "📋 My Schedule"
   - See all upcoming lessons up to 3 months

6. **Handle Cancellations**
   - Tab: "🔔 Slot Alerts"
   - View cancelled slots available for rescheduling
   - Mark as reviewed when ready

### Student Workflow

1. **Book Lesson**
   - Go to "Book a Lesson"
   - Select lesson type
   - **Select Date** - System checks if instructors are on leave for that date
   - **Automatic Filtering** - Instructors on leave are grayed out
   - Cannot select instructor on leave

2. **See Leave Status**
   - If instructor is on leave, they appear unavailable
   - Tooltip shows leave period (if implemented)

### Admin Workflow

1. **View Instructors**
   - Go to Admin → Instructors
   - See instructor cards

2. **Check Leave Status**
   - Look for "🏖️ On Leave:" section on instructor card
   - See leave dates and reason
   - Updates in real-time as instructors update leaves

## Leave Logic

### Leave Validation

When booking a lesson, the system:

1. Gets the selected date
2. Queries `instructor-schedules` collection
3. Checks if date falls within any leave period
4. Excludes instructor from dropdown if on leave

### Leave Date Range

Leaves block bookings from **inclusive start date** to **inclusive end date**.

Example:
- Leave: Apr 25 - Apr 27
- Apr 24: Can book
- Apr 25: Cannot book ✗
- Apr 26: Cannot book ✗
- Apr 27: Cannot book ✗
- Apr 28: Can book

## Testing Checklist

- [ ] **Login**
  - [ ] Can login as admin
  - [ ] Can login as instructor
  - [ ] Can login as user
  - [ ] Routing works correctly

- [ ] **Instructor Dashboard**
  - [ ] Can set working hours
  - [ ] Can add/remove breaks
  - [ ] Can add/remove leaves
  - [ ] Settings save to database
  - [ ] Can view upcoming lessons

- [ ] **Leave Filtering**
  - [ ] Students cannot select instructor on leave
  - [ ] Instructor appears unavailable for leave dates
  - [ ] After leave ends, instructor is available again

- [ ] **Admin View**
  - [ ] Instructor leaves display on profile
  - [ ] Leave dates show correctly
  - [ ] Leave reason displays if provided

- [ ] **Notifications**
  - [ ] Slot alerts appear when booking cancelled
  - [ ] Instructor can mark as reviewed

## Notes & Future Enhancements

### Current Limitations

1. **Browser-based Notifications** - Slot alerts use localStorage (only persists on same browser)
2. **Manual Leave Approval** - No admin approval workflow yet
3. **Leave Blocking** - Leaves only block new bookings, don't auto-cancel existing ones

### Future Enhancements

1. **Real-Time Notifications** - Use Appwrite Realtime for live updates
2. **Leave Approval Workflow** - Admin reviews and approves/denies instructor leaves
3. **Auto-Cancellation** - Auto-cancel bookings if instructor takes leave retroactively
4. **SMS Notifications** - Send SMS to instructor when slot becomes available
5. **Calendar Integration** - Sync instructor leaves with Google Calendar/Outlook
6. **Automated Blocking** - Auto-block bookings during leaves at database level
7. **Leave Types** - Distinguish between sick leave, vacation, personal, etc.

## Troubleshooting

### Instructor login goes to wrong page
- Check selected role in login form
- Verify user document has `role: 'instructor'` in Appwrite

### Leaves not showing in admin view
- Verify `instructor-schedules` collection exists
- Check instructor name matches exactly
- Refresh admin page

### Cannot book instructor on leave
- Verify leave dates in `instructor-schedules` collection
- Check if date comparison is working (should use full date)
- Test with different date range

### Slot alerts not showing
- Check browser localStorage for `cancelledNotifications`
- Verify cancellation was processed in SMSMonitoring

## Support

For issues or questions, check:
1. Browser console for JavaScript errors
2. Appwrite console for database errors
3. Make sure all required collections and attributes exist
4. Verify roles are set correctly in user documents
