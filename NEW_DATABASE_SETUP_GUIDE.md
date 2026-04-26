# Complete Appwrite Database Setup Guide for New Database

This guide contains everything you need to replicate your current database structure in a new Appwrite project. Follow each step carefully.

---

## 📋 Database Overview

Your application uses the following structure:
- **Database ID**: `main-database`
- **7 Collections** with specific attributes
- **Relationships** between collections

### Collections Summary
1. **users** - User accounts and profiles
2. **bookings** - Lesson bookings (practical & theory)
3. **instructors** - Instructor profiles
4. **instructor-schedules** - Instructor availability and leave
5. **vehicles** - Driving school vehicles
6. **appointments** - General appointments (backup/legacy)
7. **smsHistory** (optional) - SMS delivery history

---

## Step 1: Create the Database

1. Go to [Appwrite Console](https://cloud.appwrite.io)
2. Select your project
3. Click **Databases** in the left sidebar
4. Click **Create Database**
5. Set:
   - **Database ID**: `main-database`
   - **Name**: `Main Database`
6. Click **Create**

---

## Step 2: Create Collections with Attributes

### Collection 1: Users

**Collection ID**: `users`  
**Name**: Users

**Attributes:**

| Attribute Name | Type | Size | Required | Array | Default | Notes |
|---|---|---|---|---|---|---|
| name | String | 255 | Yes | No | - | User's full name |
| email | String | 255 | Yes | No | - | User's email address |
| phoneNumber | String | 20 | No | No | - | Phone number with formatting |
| role | String | 50 | Yes | No | "user" | Values: "user", "instructor", "admin" |
| approved | Boolean | - | Yes | No | false | Admin approval status |
| profileImageFileId | String | 255 | No | No | - | Appwrite Storage file ID |
| profileImageUrl | String | 500 | No | No | - | URL to profile image |
| transmission | String | 20 | No | No | - | Preferred transmission type |
| theoryCapacity | String | 20 | No | No | "20" | Max theory class size (for instructors) |
| createdAt | String | 50 | Yes | No | - | ISO date string |

**Permissions:**
- Read: Role "Any"
- Create: Role "Users"
- Update: Role "Users"
- Delete: Role "Users"

---

### Collection 2: Bookings

**Collection ID**: `bookings`  
**Name**: Bookings

**Attributes:**

| Attribute Name | Type | Size | Required | Array | Default | Notes |
|---|---|---|---|---|---|---|
| userId | String | 255 | Yes | No | - | Reference to user |
| userName | String | 255 | Yes | No | - | Snapshot of user name |
| userEmail | String | 255 | Yes | No | - | Snapshot of user email |
| lessonType | String | 50 | Yes | No | "practical" | Values: "practical", "theory" |
| instructor | String | 255 | Yes | No | - | Instructor name |
| vehicle | String | 255 | No | No | - | Vehicle model (or "N/A" for theory) |
| transmission | String | 20 | No | No | - | Transmission type for practical |
| date | String | 50 | Yes | No | - | ISO date (YYYY-MM-DD) |
| time | String | 20 | Yes | No | - | Time (HH:MM format) |
| status | String | 50 | Yes | No | "pending" | Values: "pending", "confirmed", "completed", "cancelled" |
| createdAt | String | 50 | Yes | No | - | ISO date string |

**Permissions:**
- Read: Role "Any"
- Create: Role "Users"
- Update: Role "Users"
- Delete: Role "Users"

**Indexes (for performance):**
- Create index on: `userId`, `instructor`, `date`, `status`

---

### Collection 3: Instructors

**Collection ID**: `instructors`  
**Name**: Instructors

**Attributes:**

| Attribute Name | Type | Size | Required | Array | Default | Notes |
|---|---|---|---|---|---|---|
| name | String | 255 | Yes | No | - | Instructor full name |
| certifications | String | 500 | Yes | No | - | Certifications/qualifications |
| lessonType | String | 50 | Yes | No | "practical" | Values: "practical", "theory", "both" |
| transmission | String | 20 | Yes | No | "MT" | Values: "MT" (Manual), "AT" (Automatic) |
| availability | String | 50 | Yes | No | "available" | Values: "available", "booked", "unavailable" |
| theoryCapacity | String | 20 | No | No | "20" | Max theory class size (15-20) |
| experience | String | 500 | No | No | - | Years of experience |
| contactNumber | String | 20 | No | No | - | Instructor phone |
| createdAt | String | 50 | Yes | No | - | ISO date string |

**Permissions:**
- Read: Role "Any"
- Create: Role "Users"
- Update: Role "Users"
- Delete: Role "Users"

---

### Collection 4: Instructor Schedules

**Collection ID**: `instructor-schedules`  
**Name**: Instructor Schedules

**Attributes:**

| Attribute Name | Type | Size | Required | Array | Default | Notes |
|---|---|---|---|---|---|---|
| instructorName | String | 255 | Yes | No | - | Reference to instructor name |
| workingDays | String | 500 | No | Yes | - | Array of working day names |
| startTime | String | 20 | No | No | "09:00" | Daily start time (HH:MM) |
| endTime | String | 20 | No | No | "17:00" | Daily end time (HH:MM) |
| leaves | String | 2000 | No | Yes | - | **Complex array** (see below) |
| createdAt | String | 50 | Yes | No | - | ISO date string |
| updatedAt | String | 50 | No | No | - | ISO date string |

**⚠️ Important: `leaves` Field Structure**

Since Appwrite stores JSON as strings, the `leaves` array should be stored as a JSON string:

```json
{
  "instructorName": "John Doe",
  "leaves": [
    {
      "startDate": "2026-05-01",
      "endDate": "2026-05-05",
      "reason": "Summer vacation"
    },
    {
      "startDate": "2026-06-10",
      "endDate": "2026-06-12",
      "reason": "Sick leave"
    }
  ]
}
```

**Permissions:**
- Read: Role "Any"
- Create: Role "Users"
- Update: Role "Users"
- Delete: Role "Users"

---

### Collection 5: Vehicles

**Collection ID**: `vehicles`  
**Name**: Vehicles

**Attributes:**

| Attribute Name | Type | Size | Required | Array | Default | Notes |
|---|---|---|---|---|---|---|
| plateNumber | String | 50 | Yes | No | - | License plate number |
| model | String | 100 | Yes | No | - | Vehicle model (e.g., "Honda Civic") |
| transmission | String | 20 | Yes | No | "MT" | Values: "MT", "AT" |
| status | String | 50 | Yes | No | "available" | Values: "available", "booked", "maintenance" |
| imageUrl | String | 500 | No | No | - | Vehicle photo URL |
| mileage | String | 50 | No | No | "0" | Current mileage |
| lastService | String | 50 | No | No | - | ISO date of last service |
| nextServiceDue | String | 50 | No | No | - | ISO date for next service |
| color | String | 50 | No | No | - | Vehicle color |
| year | String | 10 | No | No | - | Year of manufacture |
| createdAt | String | 50 | Yes | No | - | ISO date string |

**Permissions:**
- Read: Role "Any"
- Create: Role "Users"
- Update: Role "Users"
- Delete: Role "Users"

---

### Collection 6: Appointments (Legacy/Backup)

**Collection ID**: `appointments`  
**Name**: Appointments

**Attributes:**

| Attribute Name | Type | Size | Required | Array | Default | Notes |
|---|---|---|---|---|---|---|
| userId | String | 255 | Yes | No | - | Reference to user |
| title | String | 255 | Yes | No | - | Appointment title |
| description | String | 1000 | No | No | - | Appointment details |
| date | String | 50 | Yes | No | - | ISO date (YYYY-MM-DD) |
| time | String | 20 | No | No | - | Time (HH:MM) |
| location | String | 500 | No | No | - | Appointment location |
| status | String | 50 | Yes | No | "pending" | Values: "pending", "confirmed", "completed", "cancelled" |
| createdAt | String | 50 | Yes | No | - | ISO date string |
| updatedAt | String | 50 | Yes | No | - | ISO date string |
| completedDate | String | 50 | No | No | - | ISO date when completed |

**Permissions:**
- Read: Role "Any"
- Create: Role "Users"
- Update: Role "Users"
- Delete: Role "Users"

---

### Collection 7: SMS History (Optional)

**Collection ID**: `smsHistory`  
**Name**: SMS History

**Attributes:**

| Attribute Name | Type | Size | Required | Array | Default | Notes |
|---|---|---|---|---|---|---|
| phoneNumber | String | 20 | Yes | No | - | Recipient phone number |
| message | String | 1000 | Yes | No | - | SMS message content |
| type | String | 50 | Yes | No | - | Values: "appointment-reminder", "confirmation", "cancellation" |
| status | String | 50 | Yes | No | "pending" | Values: "pending", "sent", "failed" |
| sentAt | String | 50 | No | No | - | ISO date when sent |
| createdAt | String | 50 | Yes | No | - | ISO date string |

**Permissions:**
- Read: Role "Any"
- Create: Role "Users"
- Update: Role "Users"
- Delete: Role "Users"

---

## Step 3: Create Indexes for Performance

For better query performance, create these indexes:

### In Bookings Collection:
- **Index 1**: `userId`, `status`
- **Index 2**: `instructor`, `date`
- **Index 3**: `lessonType`, `status`

### In Users Collection:
- **Index 1**: `email` (unique if possible)
- **Index 2**: `role`
- **Index 3**: `approved`

### In Instructors Collection:
- **Index 1**: `availability`
- **Index 2**: `transmission`
- **Index 3**: `name`

---

## Step 4: Create Storage Bucket (Optional)

For profile images and vehicle photos:

1. Click **Storage** in left sidebar
2. Click **Create Bucket**
3. Set:
   - **Bucket ID**: `profile-images`
   - **Name**: Profile Images
4. Click **Create**
5. In Settings → Permissions:
   - Read: Role "Any"
   - Create/Update/Delete: Role "Users"

---

## Step 5: Update Your Configuration Files

Once you have your new database and collections created:

### Update Frontend Config
`frontend/src/appwrite/config.js`:

```javascript
const appwriteConfig = {
  endpoint: 'https://sgp.cloud.appwrite.io/v1', // Your Appwrite Endpoint
  projectId: 'YOUR_NEW_PROJECT_ID', // New Project ID
  databaseId: 'main-database',
  usersCollectionId: 'users',
  appointmentsCollectionId: 'appointments',
  bookingsCollectionId: 'bookings',
  vehiclesCollectionId: 'vehicles',
  instructorsCollectionId: 'instructors',
  instructorSchedulesCollectionId: 'instructor-schedules',
  storageBucketId: 'profile-images' // If using storage
};
```

### Update Backend Config
`backend/config/appwrite.js`:

```javascript
const appwriteConfig = {
  endpoint: 'https://sgp.cloud.appwrite.io/v1',
  projectId: 'YOUR_NEW_PROJECT_ID',
  apiKey: 'YOUR_NEW_API_KEY', // Generate from Appwrite Console
  databaseId: 'main-database',
  usersCollectionId: 'users',
  appointmentsCollectionId: 'appointments',
  bookingsCollectionId: 'bookings'
};
```

---

## Step 6: Data Import (If Migrating Data)

### Export from Old Database:
1. Go to Appwrite Console → Your old database
2. For each collection, you can manually download data or use API
3. Save as JSON files

### Import to New Database:
Use a script like this:

```javascript
// backend/scripts/import-data.js
const { databases } = require('../config/appwrite');
const { ID } = require('node-appwrite');

const importData = async () => {
  const usersData = require('./users-backup.json');
  
  for (const user of usersData) {
    try {
      await databases.createDocument(
        'main-database',
        'users',
        user.$id || ID.unique(),
        user
      );
      console.log(`Imported user: ${user.email}`);
    } catch (err) {
      console.error(`Failed to import user: ${err.message}`);
    }
  }
};

importData();
```

Run with: `node backend/scripts/import-data.js`

---

## Step 7: Test Your New Database

### Create Test Documents:

1. **Create a Test User**:
   - Go to Appwrite Console → Databases → main-database → users
   - Click "Create Document"
   - Fill in:
     - `name`: "Test User"
     - `email`: "test@example.com"
     - `role`: "user"
     - `approved`: true
     - `createdAt`: (current ISO date)

2. **Create a Test Instructor**:
   - Go to instructors collection
   - Click "Create Document"
   - Fill in:
     - `name`: "John Instructor"
     - `certifications`: "Class 3 License, 10 years experience"
     - `lessonType`: "both"
     - `transmission`: "MT"
     - `availability`: "available"
     - `theoryCapacity`: "20"
     - `createdAt`: (current ISO date)

3. **Create a Test Vehicle**:
   - Go to vehicles collection
   - Fill in:
     - `plateNumber`: "ABC-1234"
     - `model`: "Honda Civic"
     - `transmission`: "MT"
     - `status`: "available"
     - `createdAt`: (current ISO date)

4. **Create a Test Booking**:
   - Go to bookings collection
   - Fill in:
     - `userId`: "test-user-id"
     - `userName`: "Test User"
     - `userEmail`: "test@example.com"
     - `lessonType`: "practical"
     - `instructor`: "John Instructor"
     - `vehicle`: "Honda Civic"
     - `date`: "2026-05-15"
     - `time`: "10:00"
     - `status`: "pending"
     - `createdAt`: (current ISO date)

---

## ✅ Verification Checklist

After completing all steps:

- [ ] Database `main-database` created
- [ ] All 7 collections created with correct IDs
- [ ] All attributes added with correct types
- [ ] All permissions set correctly
- [ ] Indexes created for better performance
- [ ] Storage bucket created (optional but recommended)
- [ ] Configuration files updated with new credentials
- [ ] Test documents created in each collection
- [ ] Can query data from frontend
- [ ] Can create new documents from application
- [ ] Can update documents
- [ ] Can delete documents

---

## 🔑 Key Points to Remember

1. **Document IDs in Appwrite**:
   - Use `response.$id` for document ID (not `id`)
   - Use `doc.$id` when accessing (not `doc.id`)

2. **Complex Data (Arrays/Objects)**:
   - For `leaves` array: Store as JSON string
   - When reading: Parse the JSON string back to object
   - Example: `JSON.parse(schedule.leaves)`

3. **Date Formats**:
   - Always use ISO format: `2026-05-15T10:30:00.000Z`
   - For date fields: `2026-05-15` (YYYY-MM-DD)
   - For time fields: `10:30` (HH:MM)

4. **Permissions**:
   - "Any" role = Public/Not authenticated
   - "Users" role = Must be logged in
   - Always test permissions in new database

5. **Relationships**:
   - Appwrite doesn't have foreign keys
   - Use string references (instructor name, user ID)
   - Query and join in application code

---

## 📞 Troubleshooting

### Collections not appearing:
- Verify database was created successfully
- Check collection IDs match exactly
- Refresh Appwrite Console

### Attributes missing:
- Check attribute type matches specification
- Verify size is large enough
- Check Required/Array settings

### Permissions errors:
- Go to collection Settings → Permissions
- Verify roles are set correctly
- Test as different user roles

### Query returns empty:
- Verify documents exist in collection
- Check query field names exactly
- Confirm indexes are created

---

## 📚 Related Files

- `DATABASE_OPTIMIZATION_GUIDE.md` - Performance optimization tips
- `APPWRITE_QUICK_REFERENCE.md` - Quick API reference
- `APPWRITE_SETUP_GUIDE.md` - Original setup guide
