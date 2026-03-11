# ✅ Appwrite Setup Checklist

Use this checklist to ensure your migration is complete and working.

## 📋 Pre-Setup (Completed ✅)

- [x] Appwrite SDK installed (frontend & backend)
- [x] Configuration files created
- [x] Code migrated to Appwrite
- [x] Backend server updated

## 🔧 Appwrite Console Setup (YOU NEED TO DO THIS)

Go to: https://cloud.appwrite.io/console/project-69ac803a001c47a4f8c3

### Database Setup
- [ ] Created database with ID: `main-database`
- [ ] Created `users` collection with attributes:
  - [ ] name (String, 255)
  - [ ] email (String, 255, required)
  - [ ] phoneNumber (String, 20, required)
  - [ ] role (String, 50, default: "user")
  - [ ] approved (Boolean, required, default: false)
  - [ ] createdAt (String, 50)
- [ ] Set permissions on `users` collection:
  - [ ] Read: Role "Any"
  - [ ] Create, Update: Role "Users"
- [ ] Created `appointments` collection with attributes:
  - [ ] userId (String, 255, required)
  - [ ] title (String, 255, required)
  - [ ] description (String, 1000)
  - [ ] date (String, 50, required)
  - [ ] status (String, 50, required, default: "pending")
  - [ ] createdAt (String, 50, required)
  - [ ] updatedAt (String, 50, required)
  - [ ] completedDate (String, 50)
- [ ] Set permissions on `appointments` collection:
  - [ ] Read: Role "Any"
  - [ ] Create, Update: Role "Users"

### Authentication Setup
- [ ] Verified Email/Password auth is enabled
- [ ] (Optional) Configured Google OAuth provider
- [ ] (Optional) Added platform: Web App, localhost

## 🧪 Testing

### Test User Registration
- [ ] Open app: http://localhost:3000
- [ ] Go to signup page
- [ ] Create a new account
- [ ] Check Appwrite Console > Auth - user should appear
- [ ] Check Appwrite Console > Databases > users - document may or may not appear (there's a timing issue to fix)

### Test User Login
- [ ] Login with created account
- [ ] Verify redirect to user dashboard
- [ ] No console errors

### Test Appointments
- [ ] Click "NEW" button
- [ ] Fill appointment form
- [ ] Submit appointment
- [ ] Check Appwrite Console > Databases > appointments - should see new document
- [ ] Verify appointment appears in dashboard

### Test Admin Features
- [ ] Create admin user:
  - Go to Appwrite Console > Databases > users
  - Find your user document
  - Change `role` field to "admin"
- [ ] Logout and login again
- [ ] Should redirect to admin dashboard
- [ ] Should see all users' appointments

## 🐛 Known Issues to Fix

### Issue 1: User Document Not Created on Signup
The current signup creates an Appwrite auth account but may not create the user document in time.

**Fix:** Update `frontend/src/contexts/AuthContext.js`:

```javascript
// In signup function, after account.create:
async function signup(email, password, name = 'User') {
  try {
    const response = await account.create(ID.unique(), email, password, name);
    
    // Auto-login
    await account.createEmailPasswordSession(email, password);
    
    // Create user document with the auth ID
    try {
      await databases.createDocument(
        databaseId,
        usersCollectionId,
        response.$id, // Use auth user ID as document ID
        {
          name: name,
          email: email,
          role: email === 'admin@gmail.com' ? 'admin' : 'user',
          createdAt: new Date().toISOString()
        }
      );
    } catch (dbError) {
      console.error('Error creating user document:', dbError);
    }
    
    return response;
  } catch (error) {
    console.error('Signup error:', error);
    throw error;
  }
}
```

Then remove the setTimeout logic from Signup.js and just call:
```javascript
await signup(email, password, name);
```

## 🧹 Cleanup (Do this AFTER everything works)

Once you've verified everything works:

### On Windows:
```powershell
.\cleanup-firebase.ps1
```

### On Mac/Linux:
```bash
chmod +x cleanup-firebase.sh
./cleanup-firebase.sh
```

Or manually:
- [ ] Delete `frontend/src/firebase/` folder
- [ ] Delete `backend/config/serviceAccountKey.json`
- [ ] Run `cd frontend && npm uninstall firebase`
- [ ] Run `cd backend && npm uninstall firebase-admin`

## 📚 Documentation Created

- [x] `APPWRITE_SETUP_GUIDE.md` - Detailed setup instructions
- [x] `MIGRATION_SUMMARY.md` - What was changed
- [x] `APPWRITE_QUICK_REFERENCE.md` - Quick API reference
- [x] `APPWRITE_SETUP_CHECKLIST.md` - This file
- [x] `cleanup-firebase.ps1` - Windows cleanup script
- [x] `cleanup-firebase.sh` - Mac/Linux cleanup script

## 🎓 Learning Resources

- [ ] Read [Appwrite Setup Guide](./APPWRITE_SETUP_GUIDE.md)
- [ ] Bookmark [Appwrite Quick Reference](./APPWRITE_QUICK_REFERENCE.md)
- [ ] Review [Appwrite Documentation](https://appwrite.io/docs)
- [ ] Join [Appwrite Discord](https://discord.gg/appwrite) for help

## ✨ Next Steps

1. Complete the "Appwrite Console Setup" section above
2. Fix the user document creation issue (Issue 1)
3. Test all features
4. Run cleanup scripts
5. Update your README.md
6. Commit changes to git

---

**Need Help?**
- Check browser console for errors
- Verify database/collection IDs match exactly
- Check collection permissions
- Review APPWRITE_SETUP_GUIDE.md for troubleshooting
