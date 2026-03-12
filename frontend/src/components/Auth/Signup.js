import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import './Auth.css';
import EasyDriveLogo from '../../assets/EasyDriveLogo.png';


function Signup() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signup, signInWithGoogle } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Basic validation
    if (!name || !email || !phoneNumber || !password) {
      setError('Please fill in all fields');
      setLoading(false);
      return;
    }

    // Validate phone number format
    const phoneRegex = /^(09|\+639|639)\d{9}$/;
    if (!phoneRegex.test(phoneNumber.replace(/\s/g, ''))) {
      setError('Please enter a valid Philippine phone number (e.g., 09123456789)');
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      setLoading(false);
      return;
    }

    try {
      // Create Appwrite account (this will also auto-login and create user document)
      console.log('Starting signup process...');
      const result = await signup(email, password, name, phoneNumber);
      console.log('Signup successful, user ID:', result.$id);
      
      // Verify the document was created by fetching it
      const { databases, databaseId, usersCollectionId } = await import('../../appwrite/config');
      try {
        const userDoc = await databases.getDocument(databaseId, usersCollectionId, result.$id);
        console.log('✓ User document verified in database:', userDoc);
      } catch (verifyError) {
        console.error('✗ Could not verify user document:', verifyError);
        alert('Account created but may not appear in admin panel. Please contact administrator.');
      }
      
      // Check if user is admin
      if (email === 'admin@gmail.com') {
        navigate('/admin');
      } else {
        navigate('/user-dashboard');
      }
    } catch (error) {
      console.error('Signup error:', error);
      if (error.message.includes('already exists')) {
        setError('An account with this email already exists');
      } else if (error.message.includes('Invalid email')) {
        setError('Invalid email address');
      } else if (error.message.includes('Password')) {
        setError('Password must be at least 8 characters');
      } else {
        setError('Failed to create account: ' + error.message);
      }
    }

    setLoading(false);
  };

  const handleGoogleSignIn = async () => {
    setError('');
    setLoading(true);

    try {
      await signInWithGoogle();
      // Google OAuth will redirect, so navigation is handled by the redirect
    } catch (error) {
      console.error('Google sign-in error:', error);
      if (error.message.includes('popup')) {
        setError('Sign-in cancelled');
      } else {
        setError('Failed to sign in with Google');
      }
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
          <div className="auth-split-left">
      <div className="auth-logo-section">
        <div className="auth-logo">
          <img 
            src={EasyDriveLogo} alt="Easy Drive Driving School Logo" 
            style={{ width: '500%', height: 'auto', maxWidth: '250px' }} 
          />
        </div>
    
        <div className="auth-tagline">
          Drive Smart. Drive Safe.<br />
          <span style={{ fontWeight: '600' }}>Professional Driving Education</span>
        </div>
      </div>
    </div>

      <div className="auth-split-right">
        <div className="auth-card">
          <div className="auth-header">
            <h1>Sign Up</h1>
          </div>

          <form onSubmit={handleSubmit} className="auth-form">
            {error && <div className="error-message">{error}</div>}
            
            <div className="form-group">
              <label htmlFor="name">Full Name</label>
              <div className="input-with-icon">
                <span className="input-icon"></span>
                <input
                  type="text"
                  id="name"
                  placeholder=""
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="email">Email Address</label>
              <div className="input-with-icon">
                <span className="input-icon"></span>
                <input
                  type="email"
                  id="email"
                  placeholder=""
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="phoneNumber">Phone Number</label>
              <div className="input-with-icon">
                <span className="input-icon"></span>
                <input
                  type="tel"
                  id="phoneNumber"
                  placeholder="09123456789"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  required
                />
              </div>
              <small style={{ fontSize: '0.75rem', color: '#666', marginTop: '4px', display: 'block' }}>Required for SMS appointment reminders</small>
            </div>

            <div className="form-group">
              <label htmlFor="password">Password</label>
              <div className="input-with-icon">
                <span className="input-icon"></span>
                <input
                  type={showPassword ? "text" : "password"}
                  id="password"
                  placeholder=""
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? '👁' : '👁‍🗨'}
                </button>
              </div>
            </div>

            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Creating Account...' : 'Sign Up'}
            </button>

            <div className="divider">
              <span>Sign up with:</span>
              <button 
                type="button" 
                className="btn-google" 
                onClick={handleGoogleSignIn}
                disabled={loading}
              >
                <svg className="google-icon" viewBox="0 0 24 24" width="20" height="20">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
              </button>
            </div>

            <div className="auth-footer">
              <Link to="/login">Log In →</Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default Signup;
