import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import './Auth.css';
import EasyDriveLogo from '../../assets/EasyDriveLogo.png';
import { Eye, EyeOff } from 'lucide-react';
import emailVerificationHelper from '../../utils/emailVerificationHelper';
import { formatPhoneNumber, getFullPhoneNumber, isValidPhoneNumber, formatLtoClientId, isValidLtoClientId } from '../../utils/phoneNumberFormatter';


function Signup() {
  const [firstName, setFirstName] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [lastName, setLastName] = useState('');
  const [parentPhoneNumber, setParentPhoneNumber] = useState('');
  const [birthMonth, setBirthMonth] = useState('');
  const [birthDay, setBirthDay] = useState('');
  const [birthYear, setBirthYear] = useState('');
  const [addressLine1, setAddressLine1] = useState('');
  const [city, setCity] = useState('');
  const [stateValue, setStateValue] = useState('Olongapo City');
  const [zipCode, setZipCode] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [age, setAge] = useState('');
  const [sex, setSex] = useState('');
  const [citizenship, setCitizenship] = useState('');
  const [civilStatus, setCivilStatus] = useState('');
  const [ltoClientId, setLtoClientId] = useState('');
  // NEW: Contact Person Fields
  const [contactPersonName, setContactPersonName] = useState('');
  const [contactPersonPhone, setContactPersonPhone] = useState('');
  const [contactPersonRelationship, setContactPersonRelationship] = useState('');
  const [contactPersonEmail, setContactPersonEmail] = useState('');
  const [password, setPassword] = useState('');
  const [step, setStep] = useState(1);
  const [verificationCode, setVerificationCode] = useState('');
  const [verificationSent, setVerificationSent] = useState(false);
  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [verificationMessage, setVerificationMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [isVerifyingCode, setIsVerifyingCode] = useState(false);
  const [isSwitchingAuthPage, setIsSwitchingAuthPage] = useState(false);
  const { signup } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    document.body.classList.remove('auth-transition-out');
    document.body.classList.add('auth-transition-in');

    const timer = setTimeout(() => {
      document.body.classList.remove('auth-transition-in');
    }, 320);

    return () => {
      clearTimeout(timer);
      document.body.classList.remove('auth-transition-in');
    };
  }, []);

  const fullName = [firstName.trim(), middleName.trim(), lastName.trim()]
    .filter(Boolean)
    .join(' ');

  // Calculate age based on date of birth
  useEffect(() => {
    if (birthYear && birthMonth && birthDay) {
      const birthDate = new Date(parseInt(birthYear), parseInt(birthMonth) - 1, parseInt(birthDay));
      const today = new Date();
      let calculatedAge = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        calculatedAge--;
      }
      setAge(calculatedAge.toString());
    } else {
      setAge('');
    }
  }, [birthYear, birthMonth, birthDay]);

  const resetVerificationState = () => {
    setVerificationCode('');
    setVerificationSent(false);
    setIsEmailVerified(false);
    setVerificationMessage('');
  };

  const handleEmailChange = (value) => {
    setEmail(value);
    resetVerificationState();
  };

  const handleSendVerificationCode = async () => {
    setError('');
    setVerificationMessage('');

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setError('Enter your email address first.');
      return;
    }

    try {
      setIsSendingCode(true);
      const result = await emailVerificationHelper.sendVerificationCode(trimmedEmail);
      setVerificationSent(true);
      setIsEmailVerified(false);
      setVerificationMessage(
        result?.recipientEmailMasked
          ? `Code sent to ${result.recipientEmailMasked}.`
          : (result?.message || 'Code sent to your email.')
      );
    } catch (verificationError) {
      setError(verificationError.message || 'Failed to send verification code.');
    } finally {
      setIsSendingCode(false);
    }
  };

  const handleVerifyCode = async () => {
    setError('');
    setVerificationMessage('');

    if (!verificationCode.trim()) {
      setError('Enter the 6-digit verification code.');
      return;
    }

    try {
      setIsVerifyingCode(true);
      await emailVerificationHelper.verifyCode(email.trim(), verificationCode.trim());
      setIsEmailVerified(true);
      setVerificationMessage('Email verified. You can create your account now.');
    } catch (verificationError) {
      setError(verificationError.message || 'Invalid verification code.');
      setIsEmailVerified(false);
    } finally {
      setIsVerifyingCode(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Basic validation
    if (!firstName || !lastName || !email || !phoneNumber || !password) {
      setError('Please fill in all fields');
      setLoading(false);
      return;
    }

    // Validate phone number format
    if (!isValidPhoneNumber(phoneNumber)) {
      setError('Please enter a valid Philippine phone number (e.g., +63 921 234 5678)');
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      setLoading(false);
      return;
    }

    if (!isEmailVerified) {
      setError('Please verify your email with the 6-digit code before creating your account.');
      setLoading(false);
      return;
    }

    try {
      // Create Appwrite account (this will also auto-login and create user document)
      console.log('Starting signup process...');
      const result = await signup(email, password, fullName || 'User', phoneNumber, null);
      console.log('Signup successful, user ID:', result.$id);
      
      // Verify the document was created by fetching it
      const { databases, databaseId, usersCollectionId } = await import('../../appwrite/config');
      try {
        const userDoc = await databases.getDocument(databaseId, usersCollectionId, result.$id);
        console.log('✓ User document verified in database:', userDoc);
        
        // NEW: Update user document with contact person and additional personal details
        await databases.updateDocument(databaseId, usersCollectionId, result.$id, {
          firstName: firstName,
          middleName: middleName,
          lastName: lastName,
          contactPersonName: contactPersonName,
          contactPersonPhone: contactPersonPhone,
          contactPersonRelationship: contactPersonRelationship,
          contactPersonEmail: contactPersonEmail,
          parentPhoneNumber: parentPhoneNumber,
          age: age,
          sex: sex,
          citizenship: citizenship,
          civilStatus: civilStatus,
          ltoClientId: ltoClientId,
          birthMonth: birthMonth,
          birthDay: birthDay,
          birthYear: birthYear,
          addressLine1: addressLine1,
          city: city,
          stateValue: stateValue
        });
        console.log('✓ Contact person and additional info saved');
      } catch (verifyError) {
        console.error('✗ Could not verify user document:', verifyError);
        alert('Account created but may not appear in admin panel. Please contact administrator.');
      }
      
      navigate('/login', {
        state: {
          successMessage: 'Registration successful. Please wait for admin approval before logging in.'
        }
      });
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

  const handleNextStep = () => {
    setError('');

    if (!firstName.trim() || !lastName.trim()) {
      setError('Please enter your first and last name.');
      return;
    }

    if (!ltoClientId.trim()) {
      setError('Please enter your LTO Client ID No.');
      return;
    }

    if (!isValidLtoClientId(ltoClientId.trim())) {
      setError('Please enter a valid LTO Client ID No. in this format: 12-XXXXXX-XXXXXXX.');
      return;
    }

    if (!email.trim()) {
      setError('Please enter your email address.');
      return;
    }

    if (!isValidPhoneNumber(phoneNumber)) {
      setError('Please enter a valid Philippine phone number (e.g., +63 921 234 5678)');
      return;
    }

    if (!sex) {
      setError('Please select your sex.');
      return;
    }

    if (!citizenship.trim()) {
      setError('Please enter your citizenship.');
      return;
    }

    if (!civilStatus) {
      setError('Please select your civil status.');
      return;
    }

    setStep(2);
  };

  const handleNextStep2 = () => {
    setError('');

    if (!birthMonth || !birthDay || !birthYear) {
      setError('Please complete your date of birth.');
      return;
    }

    if (!age.trim()) {
      setError('Please complete your date of birth to calculate age.');
      return;
    }

    const numericAge = Number(age.trim());
    if (numericAge < 18 || numericAge > 85) {
      setError('You must be at least 18 years old to register.');
      return;
    }

    if (!addressLine1.trim()) {
      setError('Please enter your address.');
      return;
    }

    if (!city) {
      setError('Please select your barangay.');
      return;
    }

    setStep(3);
  };

  const handleNextStep3 = () => {
    setError('');

    if (!contactPersonName.trim()) {
      setError('Please enter the contact person\'s name.');
      return;
    }

    if (!contactPersonPhone.trim()) {
      setError('Please enter the contact person\'s phone number.');
      return;
    }

    if (!isValidPhoneNumber(contactPersonPhone)) {
      setError('Please enter a valid Philippine phone number for the contact person (e.g., +63 921 234 5678)');
      return;
    }

    if (!contactPersonRelationship.trim()) {
      setError('Please specify the contact person\'s relationship to you.');
      return;
    }

    setStep(4);
  };

  const handleAuthPageSwitch = (e, targetPath) => {
    e.preventDefault();

    if (isSwitchingAuthPage) {
      return;
    }

    setIsSwitchingAuthPage(true);
    document.body.classList.add('auth-transition-out');

    setTimeout(() => {
      navigate(targetPath);
    }, 190);
  };

  return (
    <div className="auth-container signup-enroll-layout">
      <div className="auth-split-right enroll-form-side">
        <div className="auth-card enroll-card">
          <div className="auth-header enroll-header">
            <h3>Online Registration</h3>
            <h1>Enroll Now to Get Started on Your Driving Journey!</h1>
            <div className="enroll-step-row">
              <div className="enroll-step-indicators">
                {[1, 2, 3, 4].map((stepNum) => (
                  <div
                    key={stepNum}
                    className={`step-indicator ${
                      step === stepNum ? 'active' :
                      step > stepNum ? 'completed' : ''
                    }`}
                  >
                    {step > stepNum ? '✓' : stepNum}
                  </div>
                ))}
              </div>
              <div className="enroll-progress-track">
                <div
                  className="enroll-progress-fill"
                  style={{ width: step === 1 ? '25%' : step === 2 ? '50%' : step === 3 ? '75%' : '100%' }}
                />
              </div>
              <span className="step-label">
                {step === 1 ? 'Personal Info' :
                 step === 2 ? 'Address & DOB' :
                 step === 3 ? 'Contact Person' : 'Verification'}
              </span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="auth-form enroll-form">
            {error && <div className="error-message">{error}</div>}

            {step === 1 && (
              <>
                <div className="form-section">
                  <h3 className="form-section-title">Personal Information</h3>

                  <div className="form-group required">
                    <label>Student Name</label>
                    <div className="name-grid-3">
                      <div>
                        <input
                          type="text"
                          placeholder=""
                          value={firstName}
                          onChange={(e) => setFirstName(e.target.value)}
                          required
                        />
                        <small>First</small>
                      </div>
                      <div>
                        <input
                          type="text"
                          placeholder=""
                          value={middleName}
                          onChange={(e) => setMiddleName(e.target.value)}
                        />
                        <small>Middle</small>
                      </div>
                      <div>
                        <input
                          type="text"
                          placeholder=""
                          value={lastName}
                          onChange={(e) => setLastName(e.target.value)}
                          required
                        />
                        <small>Last</small>
                      </div>
                    </div>
                  </div>

                  <div className="form-group required">
                    <label>LTO Client ID No.</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder="12-XXXXXX-XXXXXXX"
                      value={ltoClientId}
                      onChange={(e) => setLtoClientId(formatLtoClientId(e.target.value))}
                      maxLength={17}
                      required
                    />
                  </div>

                  <div className="form-group required">
                    <label htmlFor="email">Email Address</label>
                    <input
                      type="email"
                      id="email"
                      placeholder="your.email@example.com"
                      value={email}
                      onChange={(e) => handleEmailChange(e.target.value)}
                      required
                    />
                  </div>

                  <div className="form-group required">
                    <label htmlFor="phoneNumber">Student Phone Number</label>
                    <input
                      type="tel"
                      id="phoneNumber"
                      placeholder="+63 9XX XXX XXXX"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(formatPhoneNumber(e.target.value))}
                      required
                    />
                  </div>

                  <div className="form-group required">
                    <label>Sex</label>
                    <select value={sex} onChange={(e) => setSex(e.target.value)} required>
                      <option value="" disabled placeholder>
                        Select your sex
                      </option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div className="form-group required">
                    <label>Citizenship</label>
                    <select value={citizenship} onChange={(e) => setCitizenship(e.target.value)} required>
                      <option value="" disabled placeholder>
                        Select your citizenship
                      </option>
                      <option value="Filipino">Filipino</option>
                      <option value="Dual Citizen">Dual Citizen</option>
                      <option value="Foreign National">Foreign National</option>
                    </select>
                  </div>

                  <div className="form-group required">
                    <label>Civil Status</label>
                    <select value={civilStatus} onChange={(e) => setCivilStatus(e.target.value)} required>
                      <option value="" disabled placeholder>
                        Select your civil status
                      </option>
                      <option value="Single">Single</option>
                      <option value="Married">Married</option>
                      <option value="Widowed">Widowed</option>
                      <option value="Separated">Separated</option>
                      <option value="Divorced">Divorced</option>
                      <option value="Annulled">Annulled</option>
                    </select>
                  </div>
                </div>

                <button type="button" className="enroll-next-btn" onClick={handleNextStep}>
                  Continue to Address
                </button>
              </>
            )}

            {/* Step 2 - Date of Birth & Address */}
            {step === 2 && (
              <>
                <div className="form-section">
                  <h3 className="form-section-title">Date of Birth & Address</h3>

                  <div className="form-group required">
                    <label>Date of Birth</label>
                    <div className="dob-grid-3">
                      <select value={birthMonth} onChange={(e) => setBirthMonth(e.target.value)} required>
                        <option value="">Month</option>
                        {Array.from({ length: 12 }, (_, i) => i + 1).map((monthValue) => (
                          <option key={monthValue} value={String(monthValue).padStart(2, '0')}>
                            {String(monthValue).padStart(2, '0')}
                          </option>
                        ))}
                      </select>
                      <select value={birthDay} onChange={(e) => setBirthDay(e.target.value)} required>
                        <option value="">Day</option>
                        {Array.from({ length: 31 }, (_, i) => i + 1).map((dayValue) => (
                          <option key={dayValue} value={String(dayValue).padStart(2, '0')}>
                            {String(dayValue).padStart(2, '0')}
                          </option>
                        ))}
                      </select>
                      <select value={birthYear} onChange={(e) => setBirthYear(e.target.value)} required>
                        <option value="">Year</option>
                        {Array.from({ length: 70 }, (_, i) => new Date().getFullYear() - 15 - i).map((yearValue) => (
                          <option key={yearValue} value={String(yearValue)}>
                            {yearValue}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="form-group required">
                    <label>Age</label>
                    <input
                      type="text"
                      placeholder="Age will be calculated from date of birth"
                      value={age}
                      readOnly
                      required
                    />
                  </div>

                  <div className="form-group required">
                    <label htmlFor="addressLine1">Complete Address</label>
                    <input
                      type="text"
                      id="addressLine1"
                      placeholder="Enter your complete address"
                      value={addressLine1}
                      onChange={(e) => setAddressLine1(e.target.value)}
                      required
                    />
                    <small>Street address, barangay, municipality</small>
                  </div>

                  <div className="form-group address-grid-2">
                    <div>
                      <select value={city} onChange={(e) => setCity(e.target.value)} required>
                        <option value="" disabled placeholder>
                        Select barangay
                      </option>
                        <option value="Barretto">Barretto</option>
                        <option value="East Bajac-bajac">East Bajac-bajac</option>
                        <option value="East Tapinac">East Tapinac</option>
                        <option value="Gordon Heights">Gordon Heights</option>
                        <option value="Kalaklan">Kalaklan</option>
                        <option value="Mabayuan">Mabayuan</option>
                        <option value="New Asinan">New Asinan</option>
                        <option value="New Banicain">New Banicain</option>
                        <option value="New Cabalan">New Cabalan</option>
                        <option value="New Ilalim">New Ilalim</option>
                        <option value="New Kababae">New Kababae</option>
                        <option value="New Kalalake">New Kalalake</option>
                        <option value="Old Cabalan">Old Cabalan</option>
                        <option value="Pag-asa">Pag-asa</option>
                        <option value="Santa Rita">Santa Rita</option>
                        <option value="West Bajac-bajac">West Bajac-bajac</option>
                        <option value="West Tapinac">West Tapinac</option>
                      </select>
                      <small>Barangay</small>
                    </div>
                    <div>
                      <div style={{padding: '10px', border: '1px solid #ccc', borderRadius: '4px', backgroundColor: '#f9f9f9'}}>
                        Olongapo City
                      </div>
                      <small>Province</small>
                    </div>
                  </div>

                </div>

                <div className="enroll-step-actions">
                  <button type="button" className="btn-google" onClick={() => setStep(1)}>
                    Back
                  </button>
                  <button type="button" className="enroll-next-btn" onClick={handleNextStep2}>
                    Continue to Contact
                  </button>
                </div>
              </>
            )}

            {/* Step 3 - Contact Person Information */}
            {step === 3 && (
              <>
                <div className="form-group">
                  <label>Contact Person Name *</label>
                  <input
                    type="text"
                    placeholder="Full name"
                    value={contactPersonName}
                    onChange={(e) => setContactPersonName(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Contact Person Phone Number *</label>
                  <input
                    type="tel"
                    placeholder="+63 9XX XXX XXXX"
                    value={contactPersonPhone}
                    onChange={(e) => setContactPersonPhone(formatPhoneNumber(e.target.value))}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Contact Person Email</label>
                  <input
                    type="email"
                    placeholder="contact@example.com"
                    value={contactPersonEmail}
                    onChange={(e) => setContactPersonEmail(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label>Relationship *</label>
                  <select
                    value={contactPersonRelationship}
                    onChange={(e) => setContactPersonRelationship(e.target.value)}
                    required
                  >
                    <option value="" disabled placeholder>
                        Select relationship
                      </option>
                    <option value="Parent">Parent</option>
                    <option value="Guardian">Guardian</option>
                    <option value="Sibling">Sibling</option>
                    <option value="Relative">Relative</option>
                    <option value="Friend">Friend</option>
                    <option value="Spouse">Spouse</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div className="enroll-step-actions">
                  <button type="button" className="btn-google" onClick={() => setStep(2)}>
                    Back
                  </button>
                  <button type="button" className="btn-primary enroll-next-btn" onClick={handleNextStep3}>
                    Next
                  </button>
                </div>
              </>
            )}

            {/* Step 4 - Password & Email Verification */}
            {step === 4 && (
              <>
                <div className="form-group">
                  <label htmlFor="password">Password *</label>
                  <div className="input-with-icon">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      id="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                    <button
                      type="button"
                      className="password-toggle"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <Eye size={18} /> : <EyeOff size={18} />}
                    </button>
                  </div>
                </div>

                <div className="form-group">
                  <label>Email Verification *</label>
                  <div className="verification-row">
                    <button
                      type="button"
                      className="btn-google"
                      onClick={handleSendVerificationCode}
                      disabled={isSendingCode || !email.trim()}
                    >
                      {isSendingCode ? 'Sending...' : verificationSent ? 'Resend Code' : 'Send Code'}
                    </button>
                    {isEmailVerified && <span className="verified-chip">Verified</span>}
                  </div>

                  {verificationSent && (
                    <div className="verification-row">
                      <input
                        type="text"
                        inputMode="numeric"
                        maxLength={6}
                        placeholder="Enter 6-digit code"
                        value={verificationCode}
                        onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                      />
                      <button
                        type="button"
                        className="btn-google"
                        onClick={handleVerifyCode}
                        disabled={isVerifyingCode || verificationCode.length !== 6}
                      >
                        {isVerifyingCode ? 'Verifying...' : 'Verify'}
                      </button>
                    </div>
                  )}

                  {verificationMessage && (
                    <small style={{ color: isEmailVerified ? '#166534' : '#374151', marginTop: '4px' }}>
                      {verificationMessage}
                    </small>
                  )}
                </div>

                <div className="enroll-step-actions">
                  <button type="button" className="btn-google" onClick={() => setStep(3)}>
                    Back
                  </button>
                  <button type="submit" className="btn-primary" disabled={loading}>
                    {loading ? 'Creating Account...' : 'Create Account'}
                  </button>
                </div>

              </>
            )}

            <div className="auth-footer">
              <Link to="/login" onClick={(e) => handleAuthPageSwitch(e, '/login')}>
                Log In →
              </Link>
            </div>
          </form>
        </div>
      </div>

      <div className="auth-split-left enroll-info-side">
        <div className="enroll-right-panel">
          <h2>Why Easy Drive Driving School</h2>
          <ul>
            <li>Serving Olongapo City!</li>
            <li>Friendly, punctual, and responsible local instructors.</li>
            <li>Affordable driving packages with quality practical sessions.</li>
            <li>Safe, insured, and professionally handled training units.</li>
            <li>Curriculum aligned with LTO road safety standards.</li>
            <li>Dual-control vehicles for safer beginner training.</li>
          </ul>
          <p>Learn from Certified Local Instructors</p>
          <p>Covering Safe Driving Across Olongapo!</p>
          <div className="enroll-image-wrap">
            <img src={EasyDriveLogo} alt="EZ Driving School" />
          </div>
        </div>
      </div>
    </div>
  );
}

export default Signup;
