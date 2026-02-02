# Firebase Setup Instructions

## Important: Get Your Web App Config

The service account key you provided is for **server-side** use. For this React app, you need the **web app configuration**.

### Steps to Get Your Firebase Web Config:

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Open your project: **capstone-final-bc063**
3. Click the gear icon (⚙️) next to "Project Overview"
4. Select **Project Settings**
5. Scroll down to **Your apps** section
6. If you don't have a web app yet:
   - Click **Add app** > Select **Web** (</>) icon
   - Register your app with a nickname (e.g., "React App")
   - Click **Register app**
7. Copy the `firebaseConfig` object

### Enable Email/Password Authentication:

1. In Firebase Console, go to **Authentication** (in left sidebar)
2. Click **Get Started** (if not already set up)
3. Go to **Sign-in method** tab
4. Click on **Email/Password**
5. Enable it and click **Save**

### Update Your App:

Open `src/firebase/config.js` and replace the placeholder config with your actual config:

```javascript
const firebaseConfig = {
  apiKey: "YOUR_ACTUAL_API_KEY",
  authDomain: "capstone-final-bc063.firebaseapp.com",
  projectId: "capstone-final-bc063",
  storageBucket: "capstone-final-bc063.firebasestorage.app",
  messagingSenderId: "YOUR_ACTUAL_MESSAGING_SENDER_ID",
  appId: "YOUR_ACTUAL_APP_ID"
};
```

### Test Your App:

1. Restart your development server if running
2. Go to `http://localhost:3000`
3. Try creating a new account
4. Login with the created account
5. Check Firebase Console > Authentication > Users to see registered users

## Security Note:

⚠️ **Never commit your service account key to Git!** 
The key you shared should be kept secret and used only for backend/admin operations.

For the React app, the web config (with apiKey) is safe to use client-side as Firebase security is handled by Security Rules.
