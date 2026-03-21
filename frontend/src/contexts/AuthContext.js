import React, { createContext, useState, useEffect, useContext } from 'react';
import { account, databases, databaseId, usersCollectionId, storage, storageBucketId, buildStorageFileUrl } from '../appwrite/config';
import { ID } from 'appwrite';
import emailVerificationHelper from '../utils/emailVerificationHelper';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  function normalizeBoolean(value) {
    return value === true || value === 'true' || value === 1 || value === '1';
  }

  function isAdminUser(user, userDoc) {
    const email = String(user?.email || '').toLowerCase();
    return email === 'admin@gmail.com' || userDoc?.role === 'admin';
  }

  async function getUserDocumentSafe(userId) {
    try {
      return await databases.getDocument(databaseId, usersCollectionId, userId);
    } catch (err) {
      return null;
    }
  }

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
      
      // Create user document in database with the same ID as auth user
      try {
        console.log('Creating user document in database...');
        console.log('User data:', { name, email, phoneNumber, role: email === 'admin@gmail.com' ? 'admin' : 'user' });
        
        const userData = {
          name: name,
          email: email,
          role: email === 'admin@gmail.com' ? 'admin' : 'user',
          approved: email === 'admin@gmail.com',
          createdAt: new Date().toISOString()
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
        
        const userDoc = await databases.createDocument(
          databaseId,
          usersCollectionId,
          response.$id, // Use auth user ID as document ID for consistency
          userData
        );
        console.log('User document created successfully:', userDoc);
      } catch (dbError) {
        console.error('Error creating user document:', dbError);
        console.error('Error details:', dbError.message, dbError.code, dbError.type);
        // This is critical - throw error so user knows
        throw new Error('Account created but failed to save user details: ' + dbError.message);
      }
      
      // Fetch and set current user
      await account.get();

      await emailVerificationHelper.consumeVerification(normalizedEmail);

      // Keep new accounts signed out until they are approved by admin.
      await account.deleteSession('current');
      setCurrentUser(null);
      
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
      const userDoc = await getUserDocumentSafe(user.$id);
      const admin = isAdminUser(user, userDoc);
      const approved = normalizeBoolean(userDoc?.approved);

      if (!admin && !approved) {
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
    const checkSession = async () => {
      try {
        const user = await account.get();
        const userDoc = await getUserDocumentSafe(user.$id);
        const admin = isAdminUser(user, userDoc);
        const approved = normalizeBoolean(userDoc?.approved);

        if (!admin && !approved) {
          await account.deleteSession('current');
          setCurrentUser(null);
        } else {
          setCurrentUser(user);
        }
      } catch (error) {
        // No active session
        setCurrentUser(null);
      } finally {
        setLoading(false);
      }
    };

    checkSession();
  }, []);

  const value = {
    currentUser,
    signup,
    login,
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}
