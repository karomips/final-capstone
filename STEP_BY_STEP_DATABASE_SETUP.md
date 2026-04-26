# Step-by-Step Appwrite Database Setup (NEW DATABASE)

Follow these steps exactly in order. The images in NEW_DATABASE_SETUP_GUIDE.md will help if you get stuck.

---

## STEP 1: Create the Database

1. Click the **"+ Create Database"** button (red button in top right)
2. A dialog will appear asking for database details
3. Enter:
   - **Database ID**: `main-database`
   - **Database Name**: `Main Database`
4. Click **Create**
5. **WAIT** for the database to be created (you'll see a loading indicator)
6. Once created, you'll see `main-database` in the list

✅ **Done with Step 1**

---

## STEP 2: Create Collection 1 - USERS

Inside the `main-database`, click **"+ Create Collection"**

### 2.1 Create Collection
- **Collection ID**: `users`
- **Collection Name**: `Users`
- Click **Create**

### 2.2 Add Attributes to Users Collection

You'll see an empty collection. Click **"+ Create Attribute"** for each:

**Attribute 1: name**
- Name: `name`
- Type: String
- Size: 255
- Required: ✅ Yes
- Array: ❌ No
- Click **Create Attribute**

**Attribute 2: email**
- Name: `email`
- Type: String
- Size: 255
- Required: ✅ Yes
- Array: ❌ No
- Click **Create Attribute**

**Attribute 3: phoneNumber**
- Name: `phoneNumber`
- Type: String
- Size: 20
- Required: ❌ No
- Array: ❌ No
- Click **Create Attribute**

**Attribute 4: role**
- Name: `role`
- Type: String
- Size: 50
- Required: ✅ Yes
- Array: ❌ No
- Default Value: `user`
- Click **Create Attribute**

**Attribute 5: approved**
- Name: `approved`
- Type: Boolean
- Required: ✅ Yes
- Array: ❌ No
- Default Value: `false`
- Click **Create Attribute**

**Attribute 6: profileImageFileId**
- Name: `profileImageFileId`
- Type: String
- Size: 255
- Required: ❌ No
- Array: ❌ No
- Click **Create Attribute**

**Attribute 7: profileImageUrl**
- Name: `profileImageUrl`
- Type: String
- Size: 500
- Required: ❌ No
- Array: ❌ No
- Click **Create Attribute**

**Attribute 8: transmission**
- Name: `transmission`
- Type: String
- Size: 20
- Required: ❌ No
- Array: ❌ No
- Click **Create Attribute**

**Attribute 9: theoryCapacity**
- Name: `theoryCapacity`
- Type: String
- Size: 20
- Required: ❌ No
- Array: ❌ No
- Click **Create Attribute**

**Attribute 10: createdAt**
- Name: `createdAt`
- Type: String
- Size: 50
- Required: ✅ Yes
- Array: ❌ No
- Click **Create Attribute**

### 2.3 Set Permissions

1. Click the **Settings** tab (gear icon)
2. Click **Permissions**
3. Click **"+ Add Permission"**
4. Configure:
   - Select: `Role`
   - Role: `Any`
   - Permissions: ✅ Read
   - Click **Update**
5. Click **"+ Add Permission"** again
6. Configure:
   - Select: `Role`
   - Role: `Users`
   - Permissions: ✅ Create, ✅ Update, ✅ Read, ✅ Delete
   - Click **Update**

✅ **Done with Step 2 - Users Collection Created**

---

## STEP 3: Create Collection 2 - BOOKINGS

Go back to `main-database` (click the database name in breadcrumb)

Click **"+ Create Collection"**

### 3.1 Create Collection
- **Collection ID**: `bookings`
- **Collection Name**: `Bookings`
- Click **Create**

### 3.2 Add Attributes to Bookings Collection

Click **"+ Create Attribute"** for each:

**Attribute 1: userId**
- Name: `userId`
- Type: String
- Size: 255
- Required: ✅ Yes
- Array: ❌ No
- Click **Create Attribute**

**Attribute 2: userName**
- Name: `userName`
- Type: String
- Size: 255
- Required: ✅ Yes
- Array: ❌ No
- Click **Create Attribute**

**Attribute 3: userEmail**
- Name: `userEmail`
- Type: String
- Size: 255
- Required: ✅ Yes
- Array: ❌ No
- Click **Create Attribute**

**Attribute 4: lessonType**
- Name: `lessonType`
- Type: String
- Size: 50
- Required: ✅ Yes
- Array: ❌ No
- Default Value: `practical`
- Click **Create Attribute**

**Attribute 5: instructor**
- Name: `instructor`
- Type: String
- Size: 255
- Required: ✅ Yes
- Array: ❌ No
- Click **Create Attribute**

**Attribute 6: vehicle**
- Name: `vehicle`
- Type: String
- Size: 255
- Required: ❌ No
- Array: ❌ No
- Click **Create Attribute**

**Attribute 7: transmission**
- Name: `transmission`
- Type: String
- Size: 20
- Required: ❌ No
- Array: ❌ No
- Click **Create Attribute**

**Attribute 8: date**
- Name: `date`
- Type: String
- Size: 50
- Required: ✅ Yes
- Array: ❌ No
- Click **Create Attribute**

**Attribute 9: time**
- Name: `time`
- Type: String
- Size: 20
- Required: ✅ Yes
- Array: ❌ No
- Click **Create Attribute**

**Attribute 10: status**
- Name: `status`
- Type: String
- Size: 50
- Required: ✅ Yes
- Array: ❌ No
- Default Value: `pending`
- Click **Create Attribute**

**Attribute 11: createdAt**
- Name: `createdAt`
- Type: String
- Size: 50
- Required: ✅ Yes
- Array: ❌ No
- Click **Create Attribute**

### 3.3 Set Permissions (same as Users)

1. Click **Settings** tab
2. Click **Permissions**
3. Add 2 permissions:
   - Role `Any` with `Read`
   - Role `Users` with `Create`, `Update`, `Read`, `Delete`

✅ **Done with Step 3 - Bookings Collection Created**

---

## STEP 4: Create Collection 3 - INSTRUCTORS

Go back to `main-database`

Click **"+ Create Collection"**

### 4.1 Create Collection
- **Collection ID**: `instructors`
- **Collection Name**: `Instructors`
- Click **Create**

### 4.2 Add Attributes

**Attribute 1: name**
- Name: `name`
- Type: String
- Size: 255
- Required: ✅ Yes
- Array: ❌ No
- Click **Create Attribute**

**Attribute 2: certifications**
- Name: `certifications`
- Type: String
- Size: 500
- Required: ✅ Yes
- Array: ❌ No
- Click **Create Attribute**

**Attribute 3: lessonType**
- Name: `lessonType`
- Type: String
- Size: 50
- Required: ✅ Yes
- Array: ❌ No
- Default Value: `practical`
- Click **Create Attribute**

**Attribute 4: transmission**
- Name: `transmission`
- Type: String
- Size: 20
- Required: ✅ Yes
- Array: ❌ No
- Default Value: `MT`
- Click **Create Attribute**

**Attribute 5: availability**
- Name: `availability`
- Type: String
- Size: 50
- Required: ✅ Yes
- Array: ❌ No
- Default Value: `available`
- Click **Create Attribute**

**Attribute 6: theoryCapacity**
- Name: `theoryCapacity`
- Type: String
- Size: 20
- Required: ❌ No
- Array: ❌ No
- Click **Create Attribute**

**Attribute 7: experience**
- Name: `experience`
- Type: String
- Size: 500
- Required: ❌ No
- Array: ❌ No
- Click **Create Attribute**

**Attribute 8: contactNumber**
- Name: `contactNumber`
- Type: String
- Size: 20
- Required: ❌ No
- Array: ❌ No
- Click **Create Attribute**

**Attribute 9: createdAt**
- Name: `createdAt`
- Type: String
- Size: 50
- Required: ✅ Yes
- Array: ❌ No
- Click **Create Attribute**

### 4.3 Set Permissions

Same as before: 
- Role `Any` with `Read`
- Role `Users` with `Create`, `Update`, `Read`, `Delete`

✅ **Done with Step 4 - Instructors Collection Created**

---

## STEP 5: Create Collection 4 - INSTRUCTOR-SCHEDULES

Go back to `main-database`

Click **"+ Create Collection"**

### 5.1 Create Collection
- **Collection ID**: `instructor-schedules`
- **Collection Name**: `Instructor Schedules`
- Click **Create**

### 5.2 Add Attributes

**Attribute 1: instructorName**
- Name: `instructorName`
- Type: String
- Size: 255
- Required: ✅ Yes
- Array: ❌ No
- Click **Create Attribute**

**Attribute 2: workingDays**
- Name: `workingDays`
- Type: String
- Size: 500
- Required: ❌ No
- Array: ✅ YES
- Click **Create Attribute**

**Attribute 3: startTime**
- Name: `startTime`
- Type: String
- Size: 20
- Required: ❌ No
- Array: ❌ No
- Click **Create Attribute**

**Attribute 4: endTime**
- Name: `endTime`
- Type: String
- Size: 20
- Required: ❌ No
- Array: ❌ No
- Click **Create Attribute**

**Attribute 5: leaves**
- Name: `leaves`
- Type: String
- Size: 2000
- Required: ❌ No
- Array: ✅ YES
- Click **Create Attribute**

**Attribute 6: createdAt**
- Name: `createdAt`
- Type: String
- Size: 50
- Required: ✅ Yes
- Array: ❌ No
- Click **Create Attribute**

**Attribute 7: updatedAt**
- Name: `updatedAt`
- Type: String
- Size: 50
- Required: ❌ No
- Array: ❌ No
- Click **Create Attribute**

### 5.3 Set Permissions

Same as before

✅ **Done with Step 5 - Instructor Schedules Created**

---

## STEP 6: Create Collection 5 - VEHICLES

Go back to `main-database`

Click **"+ Create Collection"**

### 6.1 Create Collection
- **Collection ID**: `vehicles`
- **Collection Name**: `Vehicles`
- Click **Create**

### 6.2 Add Attributes

**Attribute 1: plateNumber**
- Name: `plateNumber`
- Type: String
- Size: 50
- Required: ✅ Yes
- Array: ❌ No
- Click **Create Attribute**

**Attribute 2: model**
- Name: `model`
- Type: String
- Size: 100
- Required: ✅ Yes
- Array: ❌ No
- Click **Create Attribute**

**Attribute 3: transmission**
- Name: `transmission`
- Type: String
- Size: 20
- Required: ✅ Yes
- Array: ❌ No
- Default Value: `MT`
- Click **Create Attribute**

**Attribute 4: status**
- Name: `status`
- Type: String
- Size: 50
- Required: ✅ Yes
- Array: ❌ No
- Default Value: `available`
- Click **Create Attribute**

**Attribute 5: imageUrl**
- Name: `imageUrl`
- Type: String
- Size: 500
- Required: ❌ No
- Array: ❌ No
- Click **Create Attribute**

**Attribute 6: mileage**
- Name: `mileage`
- Type: String
- Size: 50
- Required: ❌ No
- Array: ❌ No
- Click **Create Attribute**

**Attribute 7: lastService**
- Name: `lastService`
- Type: String
- Size: 50
- Required: ❌ No
- Array: ❌ No
- Click **Create Attribute**

**Attribute 8: nextServiceDue**
- Name: `nextServiceDue`
- Type: String
- Size: 50
- Required: ❌ No
- Array: ❌ No
- Click **Create Attribute**

**Attribute 9: color**
- Name: `color`
- Type: String
- Size: 50
- Required: ❌ No
- Array: ❌ No
- Click **Create Attribute**

**Attribute 10: year**
- Name: `year`
- Type: String
- Size: 10
- Required: ❌ No
- Array: ❌ No
- Click **Create Attribute**

**Attribute 11: createdAt**
- Name: `createdAt`
- Type: String
- Size: 50
- Required: ✅ Yes
- Array: ❌ No
- Click **Create Attribute**

### 6.3 Set Permissions

Same as before

✅ **Done with Step 6 - Vehicles Created**

---

## STEP 7: Create Collection 6 - APPOINTMENTS

Go back to `main-database`

Click **"+ Create Collection"**

### 7.1 Create Collection
- **Collection ID**: `appointments`
- **Collection Name**: `Appointments`
- Click **Create**

### 7.2 Add Attributes

**Attribute 1: userId**
- Name: `userId`
- Type: String
- Size: 255
- Required: ✅ Yes
- Array: ❌ No
- Click **Create Attribute**

**Attribute 2: title**
- Name: `title`
- Type: String
- Size: 255
- Required: ✅ Yes
- Array: ❌ No
- Click **Create Attribute**

**Attribute 3: description**
- Name: `description`
- Type: String
- Size: 1000
- Required: ❌ No
- Array: ❌ No
- Click **Create Attribute**

**Attribute 4: date**
- Name: `date`
- Type: String
- Size: 50
- Required: ✅ Yes
- Array: ❌ No
- Click **Create Attribute**

**Attribute 5: time**
- Name: `time`
- Type: String
- Size: 20
- Required: ❌ No
- Array: ❌ No
- Click **Create Attribute**

**Attribute 6: location**
- Name: `location`
- Type: String
- Size: 500
- Required: ❌ No
- Array: ❌ No
- Click **Create Attribute**

**Attribute 7: status**
- Name: `status`
- Type: String
- Size: 50
- Required: ✅ Yes
- Array: ❌ No
- Default Value: `pending`
- Click **Create Attribute**

**Attribute 8: createdAt**
- Name: `createdAt`
- Type: String
- Size: 50
- Required: ✅ Yes
- Array: ❌ No
- Click **Create Attribute**

**Attribute 9: updatedAt**
- Name: `updatedAt`
- Type: String
- Size: 50
- Required: ✅ Yes
- Array: ❌ No
- Click **Create Attribute**

**Attribute 10: completedDate**
- Name: `completedDate`
- Type: String
- Size: 50
- Required: ❌ No
- Array: ❌ No
- Click **Create Attribute**

### 7.3 Set Permissions

Same as before

✅ **Done with Step 7 - Appointments Created**

---

## STEP 8: Create Collection 7 - SMSHISTORY (Optional)

Go back to `main-database`

Click **"+ Create Collection"**

### 8.1 Create Collection
- **Collection ID**: `smsHistory`
- **Collection Name**: `SMS History`
- Click **Create**

### 8.2 Add Attributes

**Attribute 1: phoneNumber**
- Name: `phoneNumber`
- Type: String
- Size: 20
- Required: ✅ Yes
- Array: ❌ No
- Click **Create Attribute**

**Attribute 2: message**
- Name: `message`
- Type: String
- Size: 1000
- Required: ✅ Yes
- Array: ❌ No
- Click **Create Attribute**

**Attribute 3: type**
- Name: `type`
- Type: String
- Size: 50
- Required: ✅ Yes
- Array: ❌ No
- Click **Create Attribute**

**Attribute 4: status**
- Name: `status`
- Type: String
- Size: 50
- Required: ✅ Yes
- Array: ❌ No
- Default Value: `pending`
- Click **Create Attribute**

**Attribute 5: sentAt**
- Name: `sentAt`
- Type: String
- Size: 50
- Required: ❌ No
- Array: ❌ No
- Click **Create Attribute**

**Attribute 6: createdAt**
- Name: `createdAt`
- Type: String
- Size: 50
- Required: ✅ Yes
- Array: ❌ No
- Click **Create Attribute**

### 8.3 Set Permissions

Same as before

✅ **Done with Step 8 - SMS History Created**

---

## STEP 9: Create Indexes for Performance (OPTIONAL but RECOMMENDED)

These make queries faster. Go to each collection and add:

### In Bookings Collection:
1. Click **Indexes** tab
2. Click **"+ Create Index"**
   - Keys: `userId`, `status`
   - Click **Create**
3. Click **"+ Create Index"** again
   - Keys: `instructor`, `date`
   - Click **Create**

### In Users Collection:
1. Click **Indexes** tab
2. Click **"+ Create Index"**
   - Keys: `role`
   - Click **Create**

### In Instructors Collection:
1. Click **Indexes** tab
2. Click **"+ Create Index"**
   - Keys: `availability`
   - Click **Create**

---

## STEP 10: Test Your Database

Let's verify everything works:

1. Go to the **users** collection
2. Click **"+ Create Document"**
3. Fill in:
   - `name`: "Test User"
   - `email`: "test@example.com"
   - `role`: "user"
   - `approved`: true
   - `createdAt`: "2026-04-26T00:00:00Z"
4. Click **Create Document**
5. You should see the document appear in the collection

✅ **If this works, your database is set up correctly!**

---

## STEP 11: Get Your Project ID & API Key

You'll need these to update your code:

1. Click **Settings** in left sidebar
2. Look for **Project ID** - copy this (looks like: `69ac803a001c47a4f8c3`)
3. Click **API Keys** in left sidebar
4. Click **"+ Create API Key"**
5. Give it a name: "Application"
6. Select scopes: Check all boxes
7. Click **Create**
8. **Copy the API Key** - save it somewhere safe!

---

## STEP 12: Update Your Code

Update these files with your new credentials:

### File 1: `frontend/src/appwrite/config.js`
```javascript
const appwriteConfig = {
  endpoint: 'https://sgp.cloud.appwrite.io/v1',
  projectId: 'YOUR_PROJECT_ID', // Paste from Step 11
  databaseId: 'main-database',
  usersCollectionId: 'users',
  appointmentsCollectionId: 'appointments',
  bookingsCollectionId: 'bookings',
  vehiclesCollectionId: 'vehicles',
  instructorsCollectionId: 'instructors',
  instructorSchedulesCollectionId: 'instructor-schedules',
  storageBucketId: 'profile-images'
};
```

### File 2: `backend/config/appwrite.js`
```javascript
const appwriteConfig = {
  endpoint: 'https://sgp.cloud.appwrite.io/v1',
  projectId: 'YOUR_PROJECT_ID', // Paste from Step 11
  apiKey: 'YOUR_API_KEY', // Paste from Step 11
  databaseId: 'main-database',
  usersCollectionId: 'users',
  appointmentsCollectionId: 'appointments',
  bookingsCollectionId: 'bookings'
};
```

---

## ✅ ALL DONE!

Your database is now set up with:
- ✅ 7 Collections created
- ✅ All attributes added
- ✅ Permissions set
- ✅ Tested with sample data
- ✅ Code updated with credentials

**Next:** Start your application and test it!

```bash
# Terminal 1: Start backend
cd backend
npm start

# Terminal 2: Start frontend
cd frontend
npm start
```

You're ready to go! 🚀
