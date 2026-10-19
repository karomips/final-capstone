import React, { createContext, useState, useEffect, useContext } from 'react';
import { account, databases, databaseId, usersCollectionId, storage, storageBucketId, buildStorageFileUrl } from '../appwrite/config';
import { ID, Query } from 'appwrite';
import emailVerificationHelper from '../utils/emailVerificationHelper';
import './AuthContext.css';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

function normalizeBoolean(value) {
  return value === true || value === 'true' || value === 1 || value === '1';
}

function isAdminUser(user, userDoc) {
  const email = String(user?.email || '').toLowerCase();
  return email === 'admin@gmail.com' || userDoc?.role === 'admin';
}

function isInstructorUser(userDoc) {
  return userDoc?.role === 'instructor';
}

// Keep session restoration and sign-in consistent with the existing access policy.
function canAccessAccount(user, userDoc) {
  return isAdminUser(user, userDoc)
    || isInstructorUser(userDoc)
    || normalizeBoolean(userDoc?.approved)
    || String(user?.email || '').toLowerCase() === 'instructor@gmail.com';
}

async function getUserDocumentSafe(userId) {
  try {
    return await databases.getDocument(databaseId, usersCollectionId, userId);
  } catch (err) {
    if (err.code === 404) return null;
    // A failed request does not mean that approval was revoked.
    throw err;
  }
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sessionError, setSessionError] = useState('');
  const [sessionAttempt, setSessionAttempt] = useState(0);

  // Sign up function
  async function signup(email, password, name = 'User', phoneNumber = '', profileImageFile = null) {
    try {
      const normalizedEmail = String(email || '').trim().toLowerCase();
      const verificationStatus = await emailVerificationHelper.getVerificationStatus(normalizedEmail);
      if (!verificationStatus.verified) {
        throw new Error('Please verify your email before creating an account.');
      }

      // Try to clear any existing session first
      try {
        await account.deleteSession('current');
      } catch (e) {
        // No existing session, continue
      }
      
      // Create account with Appwrite
      const response = await account.create(
        ID.unique(), // Auto-generate unique ID
        email,
        password,
        name
      );
      
      // Auto-login after signup
      await account.createEmailPasswordSession(email, password);
      
      // Check if user document already exists (created by admin)
      let existingDoc = null;
      try {
        const response = await databases.listDocuments(
          databaseId,
          usersCollectionId,
          [Query.equal('email', email)]
        );
        if (response.documents.length > 0) {
          existingDoc = response.documents[0];
        }
      } catch (e) {
        console.log('Could not check for existing user document');
      }

      // Create or update user document
      try {
        console.log('Creating/Updating user document in database...');
        
        const userData = {
          name: name || existingDoc?.name || 'User',
          email: email,
          role: email === 'admin@gmail.com' ? 'admin' : email === 'instructor@gmail.com' ? 'instructor' : existingDoc?.role || 'user',
          approved: email === 'admin@gmail.com' || email === 'instructor@gmail.com' || existingDoc?.approved || false,
          createdAt: existingDoc?.createdAt || new Date().toISOString()
        };

        if (profileImageFile && storageBucketId) {
          try {
            const uploaded = await storage.createFile(
              storageBucketId,
              ID.unique(),
              profileImageFile
            );
            userData.profileImageFileId = uploaded.$id;
            userData.profileImageUrl = buildStorageFileUrl(storageBucketId, uploaded.$id);
          } catch (uploadError) {
            console.error('Error uploading profile image:', uploadError);
          }
        }
        
        // Only add phoneNumber if provided and attribute exists
        if (phoneNumber) {
          userData.phoneNumber = phoneNumber;
        }

        let userDoc;
        if (existingDoc) {
          // Update existing document
          userDoc = await databases.updateDocument(
            databaseId,
            usersCollectionId,
            existingDoc.$id,
            userData
          );
          console.log('User document updated successfully:', userDoc);
        } else {
          // Create new document
          userDoc = await databases.createDocument(
            databaseId,
            usersCollectionId,
            response.$id, // Use auth user ID as document ID for consistency
            userData
          );
          console.log('User document created successfully:', userDoc);
        }
      } catch (dbError) {
        console.error('Error creating/updating user document:', dbError);
        console.error('Error details:', dbError.message, dbError.code, dbError.type);
        // This is critical - throw error so user knows
        throw new Error('Account created but failed to save user details: ' + dbError.message);
      }
      
      // Fetch and set current user
      await account.get();

      await emailVerificationHelper.consumeVerification(normalizedEmail);

      // Keep new accounts signed out until they are approved by admin (unless instructor/admin email)
      if (normalizedEmail !== 'admin@gmail.com' && normalizedEmail !== 'instructor@gmail.com') {
        await account.deleteSession('current');
        setCurrentUser(null);
      }
      
      return response;
    } catch (error) {
      console.error('Signup error:', error);
      throw error;
    }
  }

  // Login function
  async function login(email, password) {
    try {
      // Try to clear any existing session first
      try {
        await account.deleteSession('current');
      } catch (e) {
        // No existing session, continue
      }
      
      const session = await account.createEmailPasswordSession(email, password);
      // Fetch user after login
      const user = await account.get();
      let userDoc = await getUserDocumentSafe(user.$id);
      const normalizedEmail = String(email || '').toLowerCase();
      
      // Auto-create user document for special emails if it doesn't exist
      const isSpecialEmail = normalizedEmail === 'admin@gmail.com' || normalizedEmail === 'instructor@gmail.com';
      if (isSpecialEmail && !userDoc) {
        try {
          const newUserDoc = await databases.createDocument(
            databaseId,
            usersCollectionId,
            user.$id,
            {
              email: normalizedEmail,
              role: normalizedEmail === 'admin@gmail.com' ? 'admin' : 'instructor',
              approved: true,
              createdAt: new Date().toISOString()
            }
          );
          userDoc = newUserDoc;
          console.log('Auto-created user document for special email:', normalizedEmail);
        } catch (createError) {
          console.error('Error auto-creating user document:', createError);
          // Continue anyway, user might still be able to login
        }
      }
      
      if (!userDoc && !canAccessAccount(user, userDoc)) {
        throw new Error('We could not load your account profile. Please try again.');
      }

      if (!canAccessAccount(user, userDoc)) {
        await account.deleteSession('current');
        setCurrentUser(null);
        throw new Error('Your account is pending admin approval. Please wait for approval before logging in.');
      }

      setCurrentUser(user);
      return { session, user, userDoc };
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  }

  // Logout function
  async function logout() {
    try {
      await account.deleteSession('current');
      setCurrentUser(null);
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
  }

  // Check for existing session on mount
  useEffect(() => {
    let isActive = true;

    const checkSession = async () => {
      setLoading(true);
      setSessionError('');
      try {
        let user;
        try {
          user = await account.get();
        } catch (error) {
          // Only an authentication failure confirms that the session is gone.
          if (error.code === 401) {
            if (isActive) setCurrentUser(null);
            return;
          }
          throw error;
        }
        if (!isActive) return;

        const userDoc = await getUserDocumentSafe(user.$id);
        if (!isActive) return;

        if (!userDoc && !canAccessAccount(user, userDoc)) {
          throw new Error('Account profile is unavailable');
        }

        if (!canAccessAccount(user, userDoc)) {
          await account.deleteSession('current');
          if (isActive) setCurrentUser(null);
        } else {
          setCurrentUser(user);
        }
      } catch (error) {
        if (isActive) {
          setSessionError('We could not verify your session. Please try again.');
        }
      } finally {
        if (isActive) setLoading(false);
      }
    };

    checkSession();
    // Strict Mode and hot reload can leave an older request in flight.
    return () => { isActive = false; };
  }, [sessionAttempt]);

  const value = {
    currentUser,
    signup,
    login,
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {loading ? (
        <main className="auth-session-state" role="status">Restoring your session...</main>
      ) : sessionError ? (
        <main className="auth-session-state">
          <div className="auth-session-card" role="alert">
            <h1>Unable to restore your session</h1>
            <p>{sessionError}</p>
            <button type="button" onClick={() => setSessionAttempt((attempt) => attempt + 1)}>Try again</button>
          </div>
        </main>
      ) : children}
    </AuthContext.Provider>
  );
}
