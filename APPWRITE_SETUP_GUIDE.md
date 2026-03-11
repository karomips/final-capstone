# Appwrite Migration Setup Guide

Your application has been successfully migrated from Firebase to Appwrite! Follow these steps to complete the setup.

## ✅ Completed Steps
- ✅ Appwrite SDK installed (frontend & backend)
- ✅ Configuration files created with your project credentials
- ✅ Authentication logic migrated to Appwrite
- ✅ Database operations migrated to Appwrite
- ✅ Backend server updated to use Appwrite

## 🔧 Required Setup in Appwrite Console

### Step 1: Create Database and Collections

1. **Go to your Appwrite Console**: https://cloud.appwrite.io/console/project-69ac803a001c47a4f8c3

2. **Create Database**:
   - Click on "Databases" in the left sidebar
   - Click "Create Database"
   - Database ID: `main-database`
   - Name: `Main Database`
   - Click "Create"

3. **Create "users" Collection**:
   - Inside your database, click "Create Collection"
   - Collection ID: `users`
   - Name: `Users`
   - Click "Create"
   - Add the following attributes:
     * `name` (String, size: 255, required)
     * `email` (String, size: 255, required)
     * `phoneNumber` (String, size: 20, required)
     * `role` (String, size: 50, default: "user")
     * `approved` (Boolean, required, default: false)
     * `createdAt` (String, size: 50)
   
   - **Set Permissions**:
     - Click "Settings" tab > "Permissions"
     - Add permission: Role "Any" with Read access
     - Add permission: Role "Users" with Create, Read, Update access

4. **Create "appointments" Collection**:
   - Click "Create Collection"
   - Collection ID: `appointments`
   - Name: `Appointments`
   - Click "Create"
   - Add the following attributes:
     * `userId` (String, size: 255, required)
     * `title` (String, size: 255, required)
     * `description` (String, size: 1000)
     * `date` (String, size: 50, required)
     * `status` (String, size: 50, required, default: "pending")
     * `createdAt` (String, size: 50, required)
     * `updatedAt` (String, size: 50, required)
     * `completedDate` (String, size: 50)
   
   - **Set Permissions**:
     - Click "Settings" tab > "Permissions"
     - Add permission: Role "Any" with Read access
     - Add permission: Role "Users" with Create, Read, Update access

### Step 2: Configure Authentication

1. **Enable Email/Password Authentication**:
   - Go to "Auth" in the left sidebar
   - Click "Settings" tab
   - Ensure "Email/Password" is enabled

2. **Configure Google OAuth (Optional)**:
   - Go to "Auth" > "Settings"
   - Scroll to "OAuth2 Providers"
   - Enable "Google"
   - Enter your Google OAuth credentials:
     * Client ID: (Get from Google Cloud Console)
     * Client Secret: (Get from Google Cloud Console)
   - Add redirect URL: `http://localhost:3000/oauth-callback` (for development)

3. **Configure Session Settings**:
   - In Auth Settings, you can adjust session duration if needed
   - Default is fine for most applications

### Step 3: Update Sign Up Logic

Since Appwrite handles user accounts separately from user documents, you need to update your Signup component to create a user document after registration.

**Update `frontend/src/components/Signup.js`**:

```javascript
const handleSubmit = async (e) => {
  e.preventDefault();
  
  if (password !== confirmPassword) {
    return setError('Passwords do not match');
  }

  try {
    setError('');
    setLoading(true);
    
    // Create Appwrite account
    const response = await signup(email, password, name);
    
    // Create user document in database
    const { databases, databaseId, usersCollectionId } = require('../appwrite/config');
    await databases.createDocument(
      databaseId,
      usersCollectionId,
      response.$id, // Use Appwrite user ID
      {
        name: name,
        email: email,
        role: 'user',
        createdAt: new Date().toISOString()
      }
    );
    
    navigate('/dashboard');
  } catch (error) {
    setError('Failed to create account: ' + error.message);
  }
  
  setLoading(false);
};
```

## 🚀 Running Your Application

### Start Backend Server:
```bash
cd backend
npm start
```

### Start Frontend:
```bash
cd frontend
npm start
```

## 🔄 Key Differences from Firebase

### Authentication:
- **Firebase**: `currentUser.uid`, `currentUser.email`
- **Appwrite**: `currentUser.$id`, `currentUser.email`

### Timestamps:
- **Firebase**: `Timestamp.now()`, `timestamp.toDate()`
- **Appwrite**: `new Date().toISOString()`, `new Date(timestamp)`

### Document IDs:
- **Firebase**: `doc.id`
- **Appwrite**: `doc.$id`

### Queries:
- **Firebase**: `where('field', '==', value)`
- **Appwrite**: `Query.equal('field', value)`

## 🧪 Testing Your Migration

1. **Test Registration**:
   - Go to signup page
   - Create a new account
   - Verify user appears in Appwrite Console > Auth

2. **Test Login**:
   - Login with the account you created
   - Verify you're redirected to dashboard

3. **Test Appointments**:
   - Create a new appointment
   - Verify it appears in Appwrite Console > Databases > appointments collection

4. **Test Admin Features**:
   - Create an admin user in Appwrite Console (set role: "admin" in users collection)
   - Login as admin
   - Test viewing all appointments

## 🐛 Troubleshooting

### "Document not found" errors:
- Make sure you've created the database and collections with the exact IDs specified
- Check permissions on collections

### Authentication errors:
- Verify your Project ID is correct in configuration files
- Check if Email/Password auth is enabled in Appwrite Console

### CORS errors:
- Add your frontend URL to allowed origins in Appwrite Console > Settings > Platforms
- Add platform: Name: "Web App", Type: "Web", Hostname: "localhost" (for development)

## 📝 Next Steps

1. ✅ Complete the database setup in Appwrite Console
2. ✅ Update your Signup.js to create user documents
3. ✅ Test all features thoroughly
4. ✅ Update your README.md to reflect the Appwrite setup
5. Consider migrating any Firebase Storage to Appwrite Storage if needed

## 🔗 Useful Links

- [Appwrite Console](https://cloud.appwrite.io/)
- [Appwrite Documentation](https://appwrite.io/docs)
- [Appwrite Web SDK](https://appwrite.io/docs/quick-starts/web)
- [Appwrite Server SDK](https://appwrite.io/docs/server-sdks)

---

**Questions or Issues?** Check the Appwrite Discord or documentation for help!
