# Instructor Dashboard Setup Guide

## Overview
The new Instructor Dashboard allows instructors to:
- Set and manage their working hours
- Schedule breaks
- Request leaves
- View upcoming lessons
- Receive notifications when students cancel lessons (available slots)

## Required Setup in Appwrite

### 1. Create New Collection: `instructor-schedules`

You need to create a new collection in your Appwrite database to store instructor schedules. Here's how:

#### Steps:
1. Go to Appwrite Console (https://sgp.cloud.appwrite.io)
2. Navigate to **Databases** → **main-database**
3. Click **Create Collection**
4. Set Collection ID: `instructor-schedules`
5. Set Collection Name: `Instructor Schedules`

#### Add the following attributes:

| Field Name | Type | Required | Default |
|---|---|---|---|
| `instructorId` | String (250) | ✓ | - |
| `instructorName` | String (250) | ✓ | - |
| `workingHours` | JSON | ✓ | `{}` |
| `breaks` | JSON | ✓ | `[]` |
| `leaves` | JSON | ✓ | `[]` |
| `updatedAt` | String | - | - |

#### Example JSON Structure:

**workingHours:**
```json
{
  "monday": { "start": "08:00", "end": "18:00", "off": false },
  "tuesday": { "start": "08:00", "end": "18:00", "off": false },
  "wednesday": { "start": "08:00", "end": "18:00", "off": false },
  "thursday": { "start": "08:00", "end": "18:00", "off": false },
  "friday": { "start": "08:00", "end": "18:00", "off": false },
  "saturday": { "start": "08:00", "end": "14:00", "off": false },
  "sunday": { "start": "", "end": "", "off": true }
}
```

**breaks:**
```json
[
  { "id": 1, "day": "monday", "start": "12:00", "end": "13:00" },
  { "id": 2, "day": "wednesday", "start": "15:00", "end": "15:30" }
]
```

**leaves:**
```json
[
  {
    "id": 1,
    "startDate": "2026-04-25",
    "endDate": "2026-04-27",
    "reason": "Personal",
    "createdAt": "2026-04-19T10:00:00.000Z"
  }
]
```

### 2. Update Frontend Config

The config file (`src/appwrite/config.js`) has already been updated to include:
```javascript
instructorSchedulesCollectionId: 'instructor-schedules'
```

## Features Explained

### 📅 My Schedule Tab
- Displays all upcoming lessons for the instructor
- Shows date, time, student name, lesson type, and vehicle
- Status indicators (pending, completed, cancelled)
- Auto-filters to show only future lessons

### ⏰ Working Hours Tab
- Set working hours for each day of the week
- Toggle "Day Off" for any day
- Different start/end times per day
- Changes are saved to the database

### ☕ Breaks Tab
- Add multiple breaks per week
- Specify day and time for each break
- Remove breaks as needed
- Changes are saved to the database

### 🏖️ Leaves Tab
- Request leaves with start and end dates
- Optional reason field
- View all requested leaves
- Remove leaves if needed
- Changes are saved to the database

### 🔔 Slot Alerts Tab
- Notifications appear when students cancel lessons
- Shows date, time, student name, and lesson type
- Instructor can mark as reviewed
- Stored in browser's localStorage

## Integration with SMS Notifications

When a student cancels a lesson, you can trigger the following flow:

1. **Update booking status** to 'cancelled'
2. **Add notification** to instructor's slot alerts
3. **Send SMS** to instructor (optional, can be implemented)

### Example Implementation (in SMSMonitoring.js or similar):

```javascript
// When cancellation is processed:
const notification = {
  date: booking.date,
  time: booking.time,
  studentName: booking.userName,
  lessonType: booking.lessonType,
  instructorId: instructorId
};

// Save to localStorage for instructor
const notifications = JSON.parse(localStorage.getItem('cancelledNotifications') || '[]');
notifications.push(notification);
localStorage.setItem('cancelledNotifications', JSON.stringify(notifications));
```

## Access Control

Instructors can only view and edit:
- Their own schedules
- Their own lessons
- Their own slot notifications

The dashboard filters data based on `currentUser.$id` to ensure privacy and security.

## Database Indexes (Optional but Recommended)

To improve query performance, create these indexes:

```
Index 1: instructorId (ascending)
Index 2: instructorName (ascending)
Index 3: instructorId + updatedAt (ascending)
```

## Testing the Feature

1. Log in as an instructor
2. Go to the Instructor Dashboard
3. Set working hours for the week
4. Add a few breaks
5. Request a leave
6. View upcoming scheduled lessons
7. To test notifications, create a cancellation event (this would trigger in SMSMonitoring.js)

## Future Enhancements

- Real-time notifications using Appwrite Realtime
- SMS notifications to instructor when slot becomes available
- Calendar view for visual schedule management
- Integration with calendar apps (Google Calendar, Outlook)
- Automatic blocking of slots during leaves
- Analytics on instructor availability vs. bookings
