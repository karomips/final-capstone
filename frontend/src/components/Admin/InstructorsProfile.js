import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { databases, databaseId, instructorsCollectionId, usersCollectionId, bookingsCollectionId, instructorSchedulesCollectionId, storage, storageBucketId, buildStorageFileUrl, account } from '../../appwrite/config';
import { ID, Query } from 'appwrite';
import './AdminPages.css';

function InstructorsProfile() {
  const INSTRUCTORS_PER_PAGE = 8;
  const THEORY_MIN_CAPACITY = 15;
  const THEORY_MAX_CAPACITY = 20;
  const { logout } = useAuth();
  const navigate = useNavigate();

  const [instructors, setInstructors] = useState([]);
  const [instructorSchedules, setInstructorSchedules] = useState({});
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    certifications: '',
    availability: 'available',
    lessonType: 'practical'
  });
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [error, setError] = useState('');
  const [showPasswordDisplay, setShowPasswordDisplay] = useState(false);
  const [generatedPassword, setGeneratedPassword] = useState('');

  const resolveInstructorImageUrl = useCallback((instructor) => {
    if (instructor?.imageFileId && storageBucketId) {
      return buildStorageFileUrl(storageBucketId, instructor.imageFileId);
    }

    return instructor?.imageUrl || '';
  }, []);

  const getTheoryCapacity = (instructorDoc) => {
    const parsed = Number(instructorDoc?.theoryCapacity);
    if (Number.isFinite(parsed)) {
      return Math.min(Math.max(parsed, THEORY_MIN_CAPACITY), THEORY_MAX_CAPACITY);
    }
    return THEORY_MAX_CAPACITY;
  };

  const countActiveTheoryBookings = async (instructorName) => {
    const response = await databases.listDocuments(
      databaseId,
      bookingsCollectionId,
      [
        Query.equal('instructor', instructorName),
        Query.equal('lessonType', 'theory')
      ]
    );

    return response.documents.filter((bookingDoc) => {
      const status = String(bookingDoc.status || '').toLowerCase();
      return status !== 'completed' && status !== 'cancelled';
    }).length;
  };

  const fetchInstructorSchedules = useCallback(async () => {
    try {
      const response = await databases.listDocuments(
        databaseId,
        instructorSchedulesCollectionId
      );

      const schedulesMap = {};
      response.documents.forEach(schedule => {
        // Parse JSON strings back to objects
        const parsedSchedule = { ...schedule };
        if (schedule.leaves && typeof schedule.leaves === 'string') {
          try {
            parsedSchedule.leaves = JSON.parse(schedule.leaves);
          } catch (e) {
            parsedSchedule.leaves = [];
          }
        }
        if (schedule.workingHours && typeof schedule.workingHours === 'string') {
          try {
            parsedSchedule.workingHours = JSON.parse(schedule.workingHours);
          } catch (e) {
            parsedSchedule.workingHours = {};
          }
        }
        if (schedule.breaks && typeof schedule.breaks === 'string') {
          try {
            parsedSchedule.breaks = JSON.parse(schedule.breaks);
          } catch (e) {
            parsedSchedule.breaks = {};
          }
        }
        schedulesMap[schedule.instructorName] = parsedSchedule;
      });
      setInstructorSchedules(schedulesMap);
    } catch (error) {
      console.error('Error fetching instructor schedules:', error);
    }
  }, []);

  const fetchInstructors = useCallback(async () => {
    try {
      setLoading(true);
      
      // Fetch from instructors collection
      const instructorsResponse = await databases.listDocuments(
        databaseId,
        instructorsCollectionId,
        [Query.orderDesc('$createdAt')]
      );

      // Fetch instructor accounts from users collection
      const usersResponse = await databases.listDocuments(
        databaseId,
        usersCollectionId,
        [Query.equal('role', 'instructor')]
      );

      console.log('Fetched instructors from instructors collection:', instructorsResponse.documents); // DEBUG
      console.log('Fetched instructor accounts from users collection:', usersResponse.documents); // DEBUG

      // Convert user instructor accounts to instructor cards
      const instructorAccountsAsCards = usersResponse.documents.map(user => ({
        $id: user.$id,
        name: user.email.split('@')[0], // Use email prefix as name
        email: user.email,
        certifications: 'Instructor Account',
        availability: 'available',
        lessonType: user.lessonType || 'practical',
        isAccountOnly: true, // Mark as created from user account
        theoryCapacity: 0,
        theoryActiveBookings: 0,
        theoryRemainingSlots: 0
      }));

      // Combine both sources
      const allInstructorsBasic = [...instructorsResponse.documents, ...instructorAccountsAsCards];

      const mappedInstructors = await Promise.all(
        allInstructorsBasic.map(async (instructor) => {
          const theoryCapacity = getTheoryCapacity(instructor);
          const lessonType = instructor.lessonType || 'practical';

          if (lessonType === 'theory' || lessonType === 'both') {
            const theoryActiveBookings = await countActiveTheoryBookings(instructor.name);
            return {
              ...instructor,
              resolvedImageUrl: resolveInstructorImageUrl(instructor),
              theoryCapacity,
              theoryActiveBookings,
              theoryRemainingSlots: Math.max(0, theoryCapacity - theoryActiveBookings)
            };
          }

          return {
            ...instructor,
            resolvedImageUrl: resolveInstructorImageUrl(instructor),
            theoryCapacity,
            theoryActiveBookings: 0,
            theoryRemainingSlots: theoryCapacity
          };
        })
      );

      console.log('Mapped instructors with accounts:', mappedInstructors); // DEBUG
      setInstructors(mappedInstructors);
    } catch (error) {
      console.error('Error fetching instructors:', error);
      setInstructors([]);
    } finally {
      setLoading(false);
    }
  }, [resolveInstructorImageUrl]);

  useEffect(() => {
    fetchInstructors();
    fetchInstructorSchedules();
  }, [fetchInstructors, fetchInstructorSchedules]);

  useEffect(() => {
    setCurrentPage(1);
  }, [instructors.length]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) {
      setImageFile(null);
      setImagePreview('');
      return;
    }

    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image file.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('Instructor image must be 5MB or smaller.');
      return;
    }

    setError('');
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const resetInstructorForm = () => {
    setFormData({
      name: '',
      email: '',
      password: '',
      certifications: '',
      availability: 'available',
      lessonType: 'practical'
    });
    setImageFile(null);
    setImagePreview('');
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.name.trim() || !formData.certifications.trim() || !formData.email.trim() || !formData.password.trim()) {
      setError('Please fill in all required fields (Name, Email, Password, Certifications)');
      return;
    }

    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError('Please enter a valid email address');
      return;
    }

    // Validate password length
    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    try {
      let imageUrl = '';
      let imageFileId = '';

      if (imageFile && storageBucketId) {
        try {
          const uploaded = await storage.createFile(
            storageBucketId,
            ID.unique(),
            imageFile
          );
          imageFileId = uploaded.$id;
          imageUrl = buildStorageFileUrl(storageBucketId, uploaded.$id);
        } catch (uploadError) {
          console.error('Error uploading instructor image:', uploadError);
          setError('Image upload failed. The instructor will be saved without image.');
        }
      } else if (imageFile && !storageBucketId) {
        setError('Image upload is disabled: storage bucket is not configured.');
      }

      // Create Appwrite Auth account for instructor
      const authUserId = ID.unique();
      try {
        await account.create(
          authUserId,
          formData.email.trim(),
          formData.password.trim(),
          formData.name.trim()
        );
        console.log('Instructor auth account created:', formData.email);
      } catch (authError) {
        console.error('Error creating auth account:', authError);
        if (authError.code === 409) {
          setError('Email already exists. Please use a different email.');
          return;
        }
        throw new Error('Failed to create instructor auth account: ' + authError.message);
      }

      // Create user document
      try {
        await databases.createDocument(
          databaseId,
          usersCollectionId,
          authUserId,
          {
            email: formData.email.trim(),
            role: 'instructor',
            approved: true,
            lessonType: formData.lessonType,
            createdAt: new Date().toISOString()
          }
        );
        console.log('Instructor user document created');
      } catch (userError) {
        console.error('Error creating user document:', userError);
        throw new Error('Failed to create instructor user document: ' + userError.message);
      }

      // Create instructor record
      await databases.createDocument(
        databaseId,
        instructorsCollectionId,
        ID.unique(),
        {
          name: formData.name.trim(),
          email: formData.email.trim(),
          certifications: formData.certifications.trim(),
          availability: formData.availability,
          lessonType: formData.lessonType,
          imageFileId,
          imageUrl,
          createdAt: new Date().toISOString()
        }
      );

      // Display password and success message
      setGeneratedPassword(formData.password);
      setShowPasswordDisplay(true);
      
      // Reset form
      resetInstructorForm();
      setShowModal(false);
      
      // Refresh instructors list
      fetchInstructors();
    } catch (error) {
      console.error('Error adding instructor:', error);
      setError(error.message || 'Failed to add instructor. Please try again.');
    }
  };

  const handleAvailabilityChange = async (instructorId, newAvailability) => {
    try {
      await databases.updateDocument(
        databaseId,
        instructorsCollectionId,
        instructorId,
        { availability: newAvailability }
      );
      // Update local state
      setInstructors(prev => prev.map(i => 
        i.$id === instructorId ? { ...i, availability: newAvailability } : i
      ));
    } catch (error) {
      console.error('Error updating availability:', error);
    }
  };



  const totalPages = Math.max(1, Math.ceil(instructors.length / INSTRUCTORS_PER_PAGE));
  const paginatedInstructors = instructors.slice(
    (currentPage - 1) * INSTRUCTORS_PER_PAGE,
    currentPage * INSTRUCTORS_PER_PAGE
  );

  const goToPage = (page) => {
    setCurrentPage(Math.min(Math.max(page, 1), totalPages));
  };

  return (
    <div className="admin-main-content admin-main-content--fit">
        <div className="page-header">
          <h1 className="admin-page-title">Instructors' Profile</h1>
          <button className="add-btn" onClick={() => setShowModal(true)}>
            + Add Instructor
          </button>
        </div>

        {loading ? (
          <div className="loading">Loading instructors...</div>
        ) : instructors.length === 0 ? (
          <div className="empty-state">
            <p>No instructors added yet. Click "Add Instructor" to get started.</p>
          </div>
        ) : (
          <>
            <div className="instructors-grid">
              {paginatedInstructors.map((instructor) => (
                <div key={instructor.$id} className="instructor-card">
                  <div className="instructor-avatar">
                    {instructor.resolvedImageUrl ? (
                      <img src={instructor.resolvedImageUrl} alt={instructor.name} />
                    ) : (
                      '👤'
                    )}
                  </div>
                  <div className="instructor-info">
                    <h3>{instructor.name}</h3>
                    {instructor.isAccountOnly && (
                      <p style={{ fontSize: '12px', color: '#6b7280', marginBottom: '8px' }}>
                        📧 {instructor.email}
                      </p>
                    )}
                    <div className="instructor-cert">
                      <strong>Teaches:</strong> {instructor.lessonType === 'both' ? 'Theory & Practical' : instructor.lessonType === 'theory' ? 'Theory Class' : 'Practical Lesson'}<br />
                      {(instructor.lessonType === 'theory' || instructor.lessonType === 'both') && !instructor.isAccountOnly && (
                        <>
                          <strong>Booking Slots:</strong> {instructor.theoryRemainingSlots}/{instructor.theoryCapacity} available<br />
                        </>
                      )}
                      {!instructor.isAccountOnly && (
                        <>
                          <strong>Certifications:</strong><br />
                          {instructor.certifications}
                        </>
                      )}
                    </div>
                    {instructorSchedules[instructor.name]?.leaves && Array.isArray(instructorSchedules[instructor.name].leaves) && instructorSchedules[instructor.name].leaves.length > 0 && (
                      <div className="instructor-leaves" style={{
                        background: '#fef3c7',
                        padding: '8px',
                        borderRadius: '6px',
                        marginTop: '8px',
                        fontSize: '12px'
                      }}>
                        <strong style={{color: '#92400e'}}>🏖️ On Leave:</strong><br />
                        {instructorSchedules[instructor.name].leaves.map((leave, idx) => (
                          <span key={idx} style={{color: '#92400e'}}>
                            {new Date(leave.startDate).toLocaleDateString()} - {new Date(leave.endDate).toLocaleDateString()}
                            {leave.reason && ` (${leave.reason})`}
                            <br />
                          </span>
                        ))}
                      </div>
                    )}
                    {instructorSchedules[instructor.name]?.breaks && Array.isArray(instructorSchedules[instructor.name].breaks) && instructorSchedules[instructor.name].breaks.length > 0 && (
                      <div className="instructor-breaks" style={{
                        background: '#dbeafe',
                        padding: '8px',
                        borderRadius: '6px',
                        marginTop: '8px',
                        fontSize: '12px'
                      }}>
                        <strong style={{color: '#0369a1'}}>☕ Breaks:</strong><br />
                        {instructorSchedules[instructor.name].breaks.map((brk, idx) => (
                          <span key={idx} style={{color: '#0369a1'}}>
                            {brk.day}: {brk.start} - {brk.end}
                            <br />
                          </span>
                        ))}
                      </div>
                    )}
                    {!instructor.isAccountOnly && (
                      <div className="availability-dropdown-container">
                        <label>Availability:</label>
                        <select 
                          value={instructor.availability || 'available'}
                          onChange={(e) => handleAvailabilityChange(instructor.$id, e.target.value)}
                          className="inline-availability-select"
                          disabled={instructor.availability === 'booked'}
                        >
                          <option value="available">Available</option>
                          <option value="on-leave">On Leave</option>
                        </select>
                        {instructor.availability === 'booked' && (
                          <span style={{color: '#111f33', fontSize: '11px', marginLeft: '8px', fontWeight: '600'}}>Booked</span>
                        )}
                        {instructor.availability === 'booked' && (
                          <small style={{color: '#dc2626', fontSize: '11px', marginTop: '4px', display: 'block'}}>Locked until lesson completed</small>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="pagination">
              <button onClick={() => goToPage(currentPage - 1)} disabled={currentPage === 1}>◄</button>
              {Array.from({ length: totalPages }, (_, idx) => idx + 1).map((page) => (
                <button
                  key={page}
                  className={currentPage === page ? 'active' : ''}
                  onClick={() => goToPage(page)}
                >
                  {page}
                </button>
              ))}
              <button onClick={() => goToPage(currentPage + 1)} disabled={currentPage === totalPages}>►</button>
            </div>
          </>
        )}

        {/* Add Instructor Modal */}
        {showModal && (
          <div className="modal-overlay" onClick={() => { resetInstructorForm(); setShowModal(false); }}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>Add New Instructor</h2>
                <button className="modal-close" onClick={() => { resetInstructorForm(); setShowModal(false); }}>×</button>
              </div>
              
              <form onSubmit={handleSubmit} className="modal-form">
                {error && <div className="error-message">{error}</div>}
                
                <div className="form-group">
                  <label>Instructor Name *</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="e.g., John Doe"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Email Address * (for login)</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder="e.g., instructor@example.com"
                    required
                  />
                  <small style={{color: '#6b7280', marginTop: '4px', display: 'block'}}>The instructor will use this email to login</small>
                </div>

                <div className="form-group">
                  <label>Temporary Password * (minimum 8 characters)</label>
                  <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    placeholder="e.g., SecurePass123"
                    required
                  />
                  <small style={{color: '#6b7280', marginTop: '4px', display: 'block'}}>Share this password with the instructor so they can login</small>
                </div>

                <div className="form-group">
                  <label>Certifications *</label>
                  <textarea
                    name="certifications"
                    value={formData.certifications}
                    onChange={handleInputChange}
                    placeholder="e.g., Manual Transmission, Automatic Transmission, Defensive Driving"
                    rows="4"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Teaches *</label>
                  <select
                    name="lessonType"
                    value={formData.lessonType}
                    onChange={handleInputChange}
                    required
                  >
                    <option value="practical">Practical Lesson</option>
                    <option value="theory">Theory Class</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Availability *</label>
                  <select
                    name="availability"
                    value={formData.availability}
                    onChange={handleInputChange}
                    required
                  >
                    <option value="available">Available</option>
                    <option value="on-leave">On Leave</option>
                  </select>
                  <small>Note: Instructors are automatically set to "Booked" when a user books them</small>
                </div>

                <div className="form-group">
                  <label>Upload Image (Optional)</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                  />
                  {imagePreview && (
                    <div className="image-preview">
                      <img src={imagePreview} alt="Preview" />
                    </div>
                  )}
                </div>

                <div className="modal-actions">
                  <button type="button" className="btn-cancel" onClick={() => { resetInstructorForm(); setShowModal(false); }}>
                    Cancel
                  </button>
                  <button type="submit" className="btn-submit">
                    Add Instructor
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Password Display Modal */}
        {showPasswordDisplay && (
          <div className="modal-overlay" onClick={() => setShowPasswordDisplay(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{maxWidth: '500px'}}>
              <div className="modal-header">
                <h2>✅ Instructor Account Created</h2>
                <button className="modal-close" onClick={() => setShowPasswordDisplay(false)}>×</button>
              </div>
              
              <div style={{padding: '20px', textAlign: 'center'}}>
                <p style={{marginBottom: '20px', color: '#6b7280'}}>
                  Share these credentials with the instructor:
                </p>
                
                <div style={{
                  background: '#f0f9ff',
                  border: '2px solid #0284c7',
                  borderRadius: '8px',
                  padding: '20px',
                  marginBottom: '20px'
                }}>
                  <p style={{marginBottom: '15px', color: '#333'}}>
                    <strong>Email:</strong><br />
                    <code style={{
                      background: '#fff',
                      padding: '8px 12px',
                      borderRadius: '4px',
                      display: 'inline-block',
                      fontFamily: 'monospace',
                      marginTop: '8px'
                    }}>{formData.email}</code>
                  </p>
                  
                  <p style={{marginBottom: '0', color: '#333'}}>
                    <strong>Password:</strong><br />
                    <code style={{
                      background: '#fff',
                      padding: '8px 12px',
                      borderRadius: '4px',
                      display: 'inline-block',
                      fontFamily: 'monospace',
                      marginTop: '8px'
                    }}>{generatedPassword}</code>
                  </p>
                </div>

                <button
                  onClick={() => navigator.clipboard.writeText(`Email: ${formData.email}\nPassword: ${generatedPassword}`)}
                  style={{
                    background: '#0284c7',
                    color: '#fff',
                    border: 'none',
                    padding: '10px 20px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    marginBottom: '10px'
                  }}
                >
                  📋 Copy Credentials
                </button>

                <p style={{
                  marginTop: '15px',
                  fontSize: '12px',
                  color: '#dc2626',
                  fontWeight: 'bold'
                }}>
                  ⚠️ They can change this password after logging into the instructor page.
                </p>

                <button
                  onClick={() => setShowPasswordDisplay(false)}
                  style={{
                    background: '#10b981',
                    color: '#fff',
                    border: 'none',
                    padding: '10px 30px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    marginTop: '20px',
                    fontSize: '14px',
                    fontWeight: '600'
                  }}
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        )}
    </div>
  );
}

export default InstructorsProfile;
