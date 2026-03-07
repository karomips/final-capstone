# Appwrite Collections Setup Guide

## Creating Required Collections

You need to create two new collections in your Appwrite Console for the Vehicle Inventory and Instructors Profile features to work.

### Access Appwrite Console
1. Go to https://cloud.appwrite.io
2. Sign in to your account
3. Select your project: `69ac803a001c47a4f8c3`
4. Navigate to **Databases** → **main-database**

---

## Collection 1: Vehicles

### Basic Settings
- **Collection ID**: `vehicles`
- **Collection Name**: Vehicles

### Attributes
Create the following attributes in order:

1. **plateNumber**
   - Type: String
   - Size: 50
   - Required: Yes
   - Array: No

2. **model**
   - Type: String
   - Size: 100
   - Required: Yes
   - Array: No

3. **transmission**
   - Type: String
   - Size: 10
   - Required: Yes
   - Array: No
   - Default: "MT"

4. **status**
   - Type: String
   - Size: 20
   - Required: Yes
   - Array: No
   - Default: "available"

5. **imageUrl**
   - Type: String
   - Size: 500
   - Required: No
   - Array: No

6. **createdAt**
   - Type: String
   - Size: 50
   - Required: Yes
   - Array: No

### Permissions
- **Role: All users** → Read
- **Role: All users** → Create
- **Role: All users** → Update
- **Role: All users** → Delete

---

## Collection 2: Instructors

### Basic Settings
- **Collection ID**: `instructors`
- **Collection Name**: Instructors

### Attributes
Create the following attributes in order:

1. **name**
   - Type: String
   - Size: 100
   - Required: Yes
   - Array: No

2. **certifications**
   - Type: String
   - Size: 500
   - Required: Yes
   - Array: No

3. **lessonType**
   - Type: String
   - Size: 20
   - Required: Yes
   - Array: No
   - Default: "practical"

4. **availability**
   - Type: String
   - Size: 20
   - Required: Yes
   - Array: No
   - Default: "available"

5. **createdAt**
   - Type: String
   - Size: 50
   - Required: Yes
   - Array: No

### Permissions
- **Role: All users** → Read
- **Role: All users** → Create
- **Role: All users** → Update
- **Role: All users** → Delete

---

## After Creating Collections

Once you've created both collections:

1. Restart your React development server (if running)
2. Go to the **Vehicle Inventory** page in the admin dashboard
3. Click **"+ Add Vehicle"** to add your first vehicle
4. Go to the **Instructors' Profile** page
5. Click **"+ Add Instructor"** to add your first instructor

## Notes

- The collections will show an empty state until you add the first item
- Make sure all attribute types and sizes match exactly as specified above
- If you get permission errors, double-check the permissions settings
- The `createdAt` field is automatically populated when creating documents
