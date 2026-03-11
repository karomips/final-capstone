# 🔧 User Approval System - Fix Guide

## Problem
The user approval feature is not working because the `approved` and/or `phoneNumber` attributes are missing from your Appwrite users collection.

## Solution: Add Missing Attributes to Appwrite

Follow these steps to fix the approval system:

### Step 1: Access Appwrite Console
1. Go to https://cloud.appwrite.io
2. Sign in to your account
3. Select your project with ID: `69ac803a001c47a4f8c3`
4. Navigate to **Databases** → **main-database** → **users** collection

### Step 2: Add the "approved" Attribute

1. Click on the **"Attributes"** tab
2. Click **"Add Attribute"** button
3. Select **"Boolean"** type
4. Configure the attribute:
   - **Attribute ID**: `approved`
   - **Required**: ✅ Yes
   - **Default value**: ✅ Enable and set to `false`
   - **Array**: ❌ No
5. Click **"Create"**
6. Wait for the attribute to be created (may take a few seconds)

### Step 3: Add the "phoneNumber" Attribute (REQUIRED FOR SMS)

**⚠️ This is required for the SMS notification system to work!**

1. Still in the **"Attributes"** tab
2. Click **"Add Attribute"** button
3. Select **"String"** type
4. Configure the attribute:
   - **Attribute ID**: `phoneNumber`
   - **Size**: `20`
   - **Required**: ❌ No (uncheck - so existing users aren't broken)
   - **Default**: Leave empty
   - **Array**: ❌ No
5. Click **"Create"**
6. Wait for the attribute to be created

**Why this is needed:**
- SMS confirmation, reminders, and cancellations require phone numbers
- Without this attribute, all SMS buttons will be disabled
- Users enter their phone number during signup

### Step 4: Update Permissions (if needed)

1. Click on the **"Settings"** tab in the users collection
2. Scroll to **"Permissions"** section
3. Make sure you have:
   - **Role: Any** → Read access ✅
   - **Role: Users** → Create, Read, Update access ✅
   
   OR alternatively:
   - **Role: Any** → Read, Update access ✅
   - **Role: Users** → Create, Read, Update access ✅

4. If these permissions are missing, click **"Add a permission"** and configure them

### Step 5: Update Existing Users (if any)

If you already have users in your database, you need to add the `approved` field to them:

1. Go to **Databases** → **main-database** → **users** collection
2. Click on the **"Documents"** tab
3. For each user document:
   - Click on the document to edit it
   - Find the `approved` field (it should be there now)
   - Set it to:
     - `true` for the admin user
     - `false` for regular users who need approval
     - `true` for users you want to approve
   - Click **"Update"**

### Step 6: Test the Approval System

1. **As Admin:**
   - Log into your app as admin (admin@gmail.com)
   - Navigate to **Student Management**
   - You should see all registered users
   - Click **"Approve"** button for pending users
   - You should see: "✅ Student approved successfully!"

2. **As User:**
   - Log into your app as a regular user
   - Go to **Book a Lesson** page
   - If approved: You should be able to book lessons
   - If not approved: You should see "Your account is pending approval"
   - Click **🔄 Refresh Status** button to check updated approval status

## How the Approval System Works

1. **User Signs Up**: 
   - User creates account through signup page
   - Account is created in Appwrite with `approved: false`
   - User is automatically logged in

2. **Admin Approves**:
   - Admin logs into admin panel
   - Goes to "Student Management"
   - Sees list of all users with their approval status
   - Clicks "Approve" button to approve pending users
   - System updates user's `approved` field to `true`

3. **User Can Book**:
   - User can now access the booking features
   - Status is checked when user tries to book a lesson
   - Approved users can proceed with bookings

## Verification Checklist

✅ Check these items to ensure everything is working:

- [ ] `approved` attribute exists in users collection (Boolean, required, default: false)
- [ ] `phoneNumber` attribute exists in users collection (String, size: 20, required)
- [ ] Collection permissions allow Update operations
- [ ] Existing users have the `approved` field set
- [ ] Admin can see all users in Student Management page
- [ ] Clicking "Approve" button shows success message
- [ ] Approved user can access booking features
- [ ] Unapproved user sees "pending approval" message

## Still Having Issues?

If you're still experiencing problems:

1. **Check Browser Console** (F12):
   - Look for error messages in the Console tab
   - Share the error details for more specific help

2. **Check Appwrite Console**:
   - Go to your project's Logs section
   - Look for any errors related to the users collection

3. **Verify All Attributes**:
   Your users collection should have these attributes:
   - `name` (String, 255, required)
   - `email` (String, 255, required)
   - `phoneNumber` (String, 20, not required) **← CRITICAL FOR SMS**
   - `role` (String, 50, required, default: "user")
   - `approved` (Boolean, required, default: false)
   - `createdAt` (String, 50, required)

4. **Add Phone Numbers to Existing Users**:
   - Go to **users** collection → **Documents** tab
   - For each user, click to edit
   - Add their phone number in format: `09123456789` or `+639123456789`
   - Click **"Update"**
   - Without phone numbers, SMS buttons will remain disabled

## Additional: How to Test SMS Functionality

After adding phoneNumber attribute and updating existing users:

1. **Create a Test User**:
   - Sign up with a new account
   - Enter a valid Philippine phone number (09XXXXXXXXX)
   - Complete signup

2. **Book a Test Appointment**:
   - Login as the test user
   - Book a lesson with date/time/instructor

3. **Test SMS Buttons** (as Admin):
   - Go to **SMS Monitoring** page
   - Find the booking in "Scheduled Appointments"
   - The phone number should show (not "N/A")
   - Click **"✓ Confirm"** button - should work!
   - Check SMS History section for the sent message

## Error Messages and Solutions

### "Attribute not found" Error
**Cause**: The `approved` attribute doesn't exist in your collection  
**Solution**: Follow Steps 1-2 above to add the attribute

### "Permission denied" Error
**Cause**: Collection permissions don't allow updates  
**Solution**: Follow Step 4 above to fix permissions

### "Document not found" Error
**Cause**: User document doesn't exist in database  
**Solution**: Make sure users are being created properly during signup (check AuthContext.js)

---

💡 **Tip**: After making changes in Appwrite Console, you may need to refresh your app and clear the browser cache (Ctrl+Shift+R) for changes to take effect.
