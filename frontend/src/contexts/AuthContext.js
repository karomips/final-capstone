import React, { createContext, useState, useEffect, useContext } from 'react';
import { account, databases, databaseId, usersCollectionId } from '../appwrite/config';
import { ID, OAuthProvider } from 'appwrite';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Sign up function
  async function signup(email, password, name = 'User', phoneNumber = '') {
    try {
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
          approved: email === 'admin@gmail.com' ? true : false,
          createdAt: new Date().toISOString()
        };
        
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
      const user = await account.get();
      setCurrentUser(user);
      
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
      setCurrentUser(user);
      return session;
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

  // Google Sign-In function
  async function signInWithGoogle() {
    try {
      // Note: This will redirect to Google OAuth and back
      // Make sure to configure OAuth provider in Appwrite Console
      const redirectUrl = `${window.location.origin}/oauth-callback`;
      account.createOAuth2Session(
        OAuthProvider.Google,
        redirectUrl, // Success URL
        redirectUrl  // Failure URL
      );
    } catch (error) {
      console.error('Google sign-in error:', error);
      throw error;
    }
  }

  // Check for existing session on mount
  useEffect(() => {
    const checkSession = async () => {
      try {
        const user = await account.get();
        setCurrentUser(user);
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
    logout,
    signInWithGoogle
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}
