import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { databases, databaseId, usersCollectionId, storage, storageBucketId, buildStorageFileUrl } from '../../appwrite/config';
import { ID } from 'appwrite';
import './UserPages.css';
import './Profile.css';
import EasyDriveLogo from '../../assets/EasyDriveLogo.png';

function Profile() {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [theme, setTheme] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('dashboardTheme');
      if (saved === 'dark' || saved === 'light') return saved;
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'light';
  });
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phoneNumber: ''
  });
  const [pendingChanges, setPendingChanges] = useState(null);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [profileImageFile, setProfileImageFile] = useState(null);
  const [profileImagePreview, setProfileImagePreview] = useState('');

  const getResolvedProfileImageUrl = useCallback((profile) => {
    if (profile?.profileImageFileId && storageBucketId) {
      return buildStorageFileUrl(storageBucketId, profile.profileImageFileId);
    }

    return profile?.profileImageUrl || '';
  }, []);

  const getProfileInitial = (name) => {
    return (name || currentUser?.name || 'U').trim().charAt(0).toUpperCase();
  };

  const fetchUserData = useCallback(async () => {
    if (!currentUser) return;

    try {
      // Try to get user document by auth account ID first
      let userDoc;
      try {
        userDoc = await databases.getDocument(
          databaseId,
          usersCollectionId,
          currentUser.$id
        );
      } catch (docError) {
        // If document not found by ID, try searching by email
        console.log('User document not found by ID, searching by email...');
        const response = await databases.listDocuments(
          databaseId,
          usersCollectionId
        );
        
        // Find user by email
        userDoc = response.documents.find(doc => doc.email === currentUser.email);
        
        if (!userDoc) {
          throw new Error(
            'Your profile was not found in the database. This might happen if you signed up before the system was fully configured. ' +
            'Please contact an administrator or sign up again with a new account.'
          );
        }
        
        console.log('Found user by email:', userDoc);
      }
      
      const resolvedUserDoc = {
        ...userDoc,
        resolvedProfileImageUrl: getResolvedProfileImageUrl(userDoc)
      };

      setUserData(resolvedUserDoc);
      setFormData({
        name: userDoc.name || '',
        email: userDoc.email || '',
        phoneNumber: userDoc.phoneNumber || ''
      });
      setProfileImageFile(null);
      setProfileImagePreview('');
      
      // Check for pending changes
      if (userDoc.pendingChanges) {
        setPendingChanges(JSON.parse(userDoc.pendingChanges));
      } else {
        setPendingChanges(null);
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
      setError(error.message || 'Failed to load profile data');
    } finally {
      setLoading(false);
    }
  }, [currentUser, getResolvedProfileImageUrl]);

  useEffect(() => {
    const body = document.body;
    if (theme === 'dark') {
      body.classList.add('dark-mode');
    } else {
      body.classList.remove('dark-mode');
    }
    localStorage.setItem('dashboardTheme', theme);
  }, [theme]);

  useEffect(() => {
    fetchUserData();
  }, [fetchUserData]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleProfileImageChange = (e) => {
    const file = e.target.files?.[0];

    if (!file) {
      setProfileImageFile(null);
      setProfileImagePreview('');
      return;
    }

    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image file.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('Profile image must be 5MB or smaller.');
      return;
    }

    setError('');
    setProfileImageFile(file);
    setProfileImagePreview(URL.createObjectURL(file));
  };

  const handleSubmitChanges = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Validate phone number
    const phoneRegex = /^(09|\+639|639)\d{9}$/;
    if (!phoneRegex.test(formData.phoneNumber.replace(/\s/g, ''))) {
      setError('Please enter a valid Philippine phone number (e.g., 09123456789)');
      return;
    }

    try {
      const hasTextChanges =
        formData.name !== (userData?.name || '') ||
        formData.email !== (userData?.email || '') ||
        formData.phoneNumber !== (userData?.phoneNumber || '');

      if (!hasTextChanges && !profileImageFile) {
        setError('No changes to save.');
        return;
      }

      if (profileImageFile) {
        if (!storageBucketId) {
          setError('Profile image upload is unavailable because the storage bucket is not configured.');
          return;
        }

        const uploaded = await storage.createFile(
          storageBucketId,
          ID.unique(),
          profileImageFile
        );

        await databases.updateDocument(
          databaseId,
          usersCollectionId,
          userData.$id,
          {
            profileImageFileId: uploaded.$id,
            profileImageUrl: buildStorageFileUrl(storageBucketId, uploaded.$id)
          }
        );
      }

      if (hasTextChanges) {
        const changes = {
          name: formData.name,
          email: formData.email,
          phoneNumber: formData.phoneNumber,
          requestedAt: new Date().toISOString(),
          status: 'pending'
        };

        await databases.updateDocument(
          databaseId,
          usersCollectionId,
          userData.$id,
          {
            pendingChanges: JSON.stringify(changes),
            hasChangeRequest: true
          }
        );

        setPendingChanges(changes);
        setSuccess(profileImageFile
          ? 'Profile picture updated and profile change request submitted.'
          : 'Profile change request submitted! Waiting for admin approval.');
      } else {
        setSuccess('Profile picture updated successfully.');
      }

      setEditMode(false);
      fetchUserData();
    } catch (error) {
      console.error('Error submitting changes:', error);
      setError('Failed to submit profile changes: ' + error.message);
    }
  };

  const handleCancelEdit = () => {
    setFormData({
      name: userData.name || '',
      email: userData.email || '',
      phoneNumber: userData.phoneNumber || ''
    });
    setProfileImageFile(null);
    setProfileImagePreview('');
    setEditMode(false);
    setError('');
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const toggleTheme = () => {
    setTheme((prevTheme) => (prevTheme === 'dark' ? 'light' : 'dark'));
  };

  if (loading) {
    return (
      <div className="user-page-container">
        <div style={{ padding: '40px', textAlign: 'center' }}>
          <p>Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="user-page-container">
      <button className="hamburger-btn" onClick={() => setSidebarOpen(!sidebarOpen)}>
        ☰
      </button>

      {/* Sidebar */}
      <div className={`user-sidebar ${sidebarOpen ? '' : 'closed'}`}>
        <div className="user-logo-section">
          <div className="user-logo">
            <img src={EasyDriveLogo} alt="Easy Drive Logo" />
          </div>
        </div>

        <div className="user-nav-buttons">
          <button 
            className="user-nav-btn"
            onClick={() => navigate('/user-dashboard')}
          >
            Dashboard
          </button>
          <button 
            className="user-nav-btn"
            onClick={() => navigate('/book-lesson')}
          >
            Book a Lesson
          </button>
          <button 
            className="user-nav-btn active"
            onClick={() => navigate('/profile')}
          >
            My Profile
          </button>
        </div>

        <button className="user-theme-toggle-btn" onClick={toggleTheme}>
          {theme === 'dark' ? ' Light Mode' : ' Dark Mode'}
        </button>

        <button className="user-signout-btn" onClick={handleLogout}>
          Sign out
        </button>
      </div>

      {/* Main Content */}
      <div className="user-main-content">
        <h1 className="user-page-title">My Profile</h1>

        {error && (
          <div className="alert alert-error">
            {error}
          </div>
        )}

        {success && (
          <div className="alert alert-success">
            {success}
          </div>
        )}

        {/* Pending Changes Alert */}
        {pendingChanges && pendingChanges.status === 'pending' && (
          <div className="pending-changes-alert">
            <div className="alert-icon">⏳</div>
            <div className="alert-content">
              <h3>Profile Change Request Pending</h3>
              <p>Your profile change request is awaiting admin approval.</p>
              <div className="pending-details">
                <strong>Requested Changes:</strong>
                <ul>
                  {pendingChanges.name !== userData.name && (
                    <li>Name: {userData.name} → <strong>{pendingChanges.name}</strong></li>
                  )}
                  {pendingChanges.email !== userData.email && (
                    <li>Email: {userData.email} → <strong>{pendingChanges.email}</strong></li>
                  )}
                  {pendingChanges.phoneNumber !== userData.phoneNumber && (
                    <li>Phone: {userData.phoneNumber} → <strong>{pendingChanges.phoneNumber}</strong></li>
                  )}
                </ul>
              </div>
            </div>
          </div>
        )}

        <div className="profile-container">
          {!editMode ? (
            // View Mode
            <div className="profile-view">
              <div className="profile-header">
                <div className="profile-avatar-large">
                  {userData?.resolvedProfileImageUrl ? (
                    <img src={userData.resolvedProfileImageUrl} alt="Profile" />
                  ) : (
                    <div className="profile-avatar-placeholder">{getProfileInitial(userData?.name)}</div>
                  )}
                </div>
                <div className="profile-info">
                  <h2>{userData?.name}</h2>
                  <p className="profile-email">{userData?.email}</p>
                  <span className={`profile-status ${userData?.approved ? 'approved' : 'pending'}`}>
                    {userData?.approved ? '✓ Approved' : '⏳ Pending Approval'}
                  </span>
                  {!userData?.resolvedProfileImageUrl && (
                    <p className="profile-photo-hint">No profile photo yet. Add one from Edit Profile.</p>
                  )}
                </div>
              </div>

              <div className="profile-details">
                <div className="detail-group">
                  <label>Full Name</label>
                  <p>{userData?.name}</p>
                </div>
                <div className="detail-group">
                  <label>Email Address</label>
                  <p>{userData?.email}</p>
                </div>
                <div className="detail-group">
                  <label>Phone Number</label>
                  <p>{userData?.phoneNumber}</p>
                </div>
                <div className="detail-group">
                  <label>Account Status</label>
                  <p>{userData?.approved ? 'Approved for Booking' : 'Pending Admin Approval'}</p>
                </div>
                <div className="detail-group">
                  <label>Member Since</label>
                  <p>{userData?.$createdAt ? new Date(userData.$createdAt).toLocaleDateString() : 'N/A'}</p>
                </div>
              </div>

              <button 
                className="edit-profile-btn"
                onClick={() => setEditMode(true)}
                disabled={pendingChanges?.status === 'pending'}
              >
                {pendingChanges?.status === 'pending' ? 'Changes Pending Approval' : 'Edit Profile'}
              </button>
            </div>
          ) : (
            // Edit Mode
            <div className="profile-edit">
              <h2>Edit Profile</h2>
              <p className="edit-note">
                Note: Profile changes require admin approval. Your current information will remain until approved.
              </p>
              
              <form onSubmit={handleSubmitChanges}>
                <div className="form-group">
                  <label>Profile Picture</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleProfileImageChange}
                    className="profile-file-input"
                  />
                  {(profileImagePreview || userData?.resolvedProfileImageUrl) && (
                    <div className="profile-image-preview">
                      <img
                        src={profileImagePreview || userData?.resolvedProfileImageUrl}
                        alt="Profile preview"
                      />
                    </div>
                  )}
                  <small className="profile-help-text">
                    You can add or replace your profile picture even after creating your account.
                  </small>
                </div>

                <div className="profile-form-container">
  < div className="form-group">
    <label className="input-label">Full Name</label>
    <input
      type="text"
      name="name"
      value={formData.name}
      onChange={handleInputChange}
      className="profile-input user-typing-color"
      required
    />
  </div>

  <div className="form-group">
    <label className="input-label">Email Address</label>
    <input
      type="email"
      name="email"
      value={formData.email}
      onChange={handleInputChange}
      className="profile-input user-typing-color"
      required
    />
  </div>

  <div className="form-group">
    <label className="input-label">Phone Number</label>
    <input
      type="tel"
      name="phoneNumber"
      value={formData.phoneNumber}
      onChange={handleInputChange}
      className="profile-input user-typing-color"
      placeholder="09123456789"
      required
    />
  </div>
</div>

                <div className="form-actions">
                  <button type="submit" className="submit-btn">
                    Submit for Approval
                  </button>
                  <button type="button" className="cancel-btn" onClick={handleCancelEdit}>
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Profile;
