import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import AppointmentModal from './AppointmentModal';
import './Dashboard.css';

function UserDashboard() {
  const { currentUser, logout } = useAuth();
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [userName, setUserName] = useState('');
  const [showProfile, setShowProfile] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [activeNav, setActiveNav] = useState('dashboard');
  const navigate = useNavigate();

  // Sample clinic photos - replace with actual photos from database
  const clinicPhotos = [
    'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=800&h=500&fit=crop',
    'https://images.unsplash.com/photo-1629909613654-28e377c37b09?w=800&h=500&fit=crop',
    'https://images.unsplash.com/photo-1631217868264-e5b90bb7e133?w=800&h=500&fit=crop',
    'https://images.unsplash.com/photo-1538108149393-fbbd81895907?w=800&h=500&fit=crop'
  ];

  // Sample clinic updates - replace with actual data from database
  const clinicUpdates = [
    {
      id: 1,
      date: '2026-02-05',
      title: 'New Operating Hours',
      message: 'Starting next week, we will be open on Saturdays from 9 AM to 2 PM for your convenience.'
    },
    {
      id: 2,
      date: '2026-02-03',
      title: 'Flu Vaccination Available',
      message: 'Flu vaccination is now available. Please schedule an appointment to get vaccinated.'
    },
    {
      id: 3,
      date: '2026-02-01',
      title: 'New Equipment Installed',
      message: 'We have installed state-of-the-art diagnostic equipment to provide better healthcare services.'
    },
    {
      id: 4,
      date: '2026-01-28',
      title: 'Health Tips',
      message: 'Remember to stay hydrated and maintain a balanced diet for optimal health.'
    }
  ];

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
      setIsDarkMode(true);
      document.body.classList.add('dark-mode');
    }
    
    // Fetch user name
    const fetchUserName = async () => {
      if (currentUser) {
        try {
          const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
          if (userDoc.exists()) {
            setUserName(userDoc.data().name);
          }
        } catch (error) {
          console.error('Error fetching user name:', error);
        }
      }
    };
    
    fetchUserName();
  }, [currentUser]);

  // Close profile dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showProfile && !event.target.closest('.profile-dropdown') && !event.target.closest('.nav-profile-btn')) {
        setShowProfile(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showProfile]);

  // Slideshow auto-play
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % clinicPhotos.length);
    }, 5000); // Change slide every 5 seconds

    return () => clearInterval(interval);
  }, [clinicPhotos.length]);

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % clinicPhotos.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + clinicPhotos.length) % clinicPhotos.length);
  };

  const goToSlide = (index) => {
    setCurrentSlide(index);
  };

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
    if (!isDarkMode) {
      document.body.classList.add('dark-mode');
      localStorage.setItem('theme', 'dark');
    } else {
      document.body.classList.remove('dark-mode');
      localStorage.setItem('theme', 'light');
    }
  };

  const handleLogout = async () => {
    setError('');
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
      setError('Failed to log out');
    }
  };

  const handleAppointmentSuccess = () => {
    setSuccess('Appointment created successfully!');
    setTimeout(() => setSuccess(''), 5000);
  };

  return (
    <div className="dashboard-container">
      {/* Top Navigation Bar */}
      <nav className="top-navbar">
        <div className="navbar-container">
          <div className="navbar-brand">
            <h2>CLINICWAY</h2>
          </div>
          
          <div className="navbar-center">
            <button 
              className="btn-add-appointment"
              onClick={() => setIsModalOpen(true)}
            >
              + NEW
            </button>

            <div className="navbar-menu">
              <button 
                className={`nav-link ${activeNav === 'dashboard' ? 'active' : ''}`}
                onClick={() => setActiveNav('dashboard')}
              >
                DASHBOARD
              </button>
              <button 
                className={`nav-link ${activeNav === 'appointments' ? 'active' : ''}`}
                onClick={() => setActiveNav('appointments')}
              >
                APPOINTMENTS
              </button>
              <button 
                className={`nav-link ${activeNav === 'analytics' ? 'active' : ''}`}
                onClick={() => setActiveNav('analytics')}
              >
                ANALYTICS
              </button>
              <button 
                className={`nav-link ${activeNav === 'profile' ? 'active' : ''}`}
                onClick={() => setActiveNav('profile')}
              >
                PROFILE
              </button>
              <button 
                className={`nav-link ${activeNav === 'settings' ? 'active' : ''}`}
                onClick={() => setActiveNav('settings')}
              >
                SETTINGS
              </button>
            </div>
          </div>

          <div className="navbar-actions">
            <button 
              onClick={toggleTheme}
              className="btn-theme-toggle"
              title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {isDarkMode ? '☀️' : '🌙'}
            </button>
            
            <button 
              className="nav-profile-btn"
              onClick={() => setShowProfile(!showProfile)}
            >
              {userName || 'USER'}
            </button>
          </div>
        </div>
      </nav>

      {/* Profile Dropdown */}
      {showProfile && (
        <div className="profile-dropdown">
          <div className="profile-dropdown-header">
            <h3>User Profile</h3>
            <button 
              onClick={() => setShowProfile(false)} 
              className="btn-close-profile"
            >
              &times;
            </button>
          </div>
          <div className="profile-dropdown-content">
            <div className="detail-row">
              <span className="detail-label">Name:</span>
              <span className="detail-value">{userName || 'User'}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Email:</span>
              <span className="detail-value">{currentUser?.email}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">User ID:</span>
              <span className="detail-value" style={{fontSize: '12px'}}>{currentUser?.uid}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Status:</span>
              <span className="status-badge">Active</span>
            </div>
          </div>
          <div className="profile-dropdown-footer">
            <button onClick={handleLogout} className="btn-logout-profile">
              LOGOUT
            </button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="main-content">
        {error && <div className="error-banner">{error}</div>}
        {success && <div className="success-banner">{success}</div>}
        
        <div className="welcome-section">
          <h1>Welcome, {userName || 'User'}!</h1>
          <p>You're successfully logged in!</p>
        </div>

        <div className="dashboard-main-content">
          {/* Photo Slideshow */}
          <div className="slideshow-container">
            <div className="slideshow-header">
              <h2>Clinic Gallery</h2>
              <p>Explore our facilities</p>
            </div>
            <div className="slideshow-wrapper">
              <button className="slide-btn prev" onClick={prevSlide}>&lt;</button>
              <div className="slides">
                {clinicPhotos.map((photo, index) => (
                  <div
                    key={index}
                    className={`slide ${index === currentSlide ? 'active' : ''}`}
                    style={{ backgroundImage: `url(${photo})` }}
                  />
                ))}
              </div>
              <button className="slide-btn next" onClick={nextSlide}>&gt;</button>
            </div>
            <div className="slide-dots">
              {clinicPhotos.map((_, index) => (
                <span
                  key={index}
                  className={`dot ${index === currentSlide ? 'active' : ''}`}
                  onClick={() => goToSlide(index)}
                />
              ))}
            </div>
          </div>

          {/* Clinic Updates */}
          <div className="updates-container">
            <div className="updates-header">
              <h2>Clinic Updates</h2>
              <p>Stay informed with our latest news</p>
            </div>
            <div className="updates-list">
              {clinicUpdates.map((update) => (
                <div key={update.id} className="update-item">
                  <div className="update-date">
                    {new Date(update.date).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </div>
                  <div className="update-content">
                    <h3>{update.title}</h3>
                    <p>{update.message}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <AppointmentModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        userId={currentUser?.uid}
        onSuccess={handleAppointmentSuccess}
      />
    </div>
  );
}

export default UserDashboard;
