import React, { useState, useEffect, useCallback } from 'react';
import { CheckCircle2, ChevronLeft, ChevronRight, Clipboard, GraduationCap, Mail, Pencil, Plus, Trash2, UserRound } from 'lucide-react';
import { AdminEmptyState, AdminPageHeader } from './AdminUI';
import { databases, databaseId, instructorsCollectionId, usersCollectionId, bookingsCollectionId, instructorSchedulesCollectionId, storage, storageBucketId, buildStorageFileUrl, account } from '../../appwrite/config';
import { ID, Query } from 'appwrite';
import './AdminPages.css';

function InstructorsProfile() {
  const INSTRUCTORS_PER_PAGE = 8;
  const THEORY_MIN_CAPACITY = 15;
  const THEORY_MAX_CAPACITY = 20;
  const [instructors, setInstructors] = useState([]);
  const [instructorSchedules, setInstructorSchedules] = useState({});
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [editingInstructorId, setEditingInstructorId] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    certifications: '',
    availability: 'available',
    lessonType: 'practical',
    transmission: 'MT'
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
        name: user.name || user.email.split('@')[0], // Use actual name field, fall back to email prefix
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

    const refreshSchedules = () => {
      if (!document.hidden) fetchInstructorSchedules();
    };
    const interval = setInterval(refreshSchedules, 30000);
    document.addEventListener('visibilitychange', refreshSchedules);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', refreshSchedules);
    };
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
      lessonType: 'practical',
      transmission: 'MT'
    });
    setImageFile(null);
    setImagePreview('');
    setError('');
    setEditingInstructorId(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.name.trim() || !formData.email.trim() || (!editingInstructorId && !formData.password.trim())) {
      setError('Please fill in all required fields (Name, Email, Password)');
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
      // If editing an existing instructor
      if (editingInstructorId) {
        // Update instructor record
        const updateData = {
          name: formData.name.trim(),
          availability: formData.availability,
          lessonType: formData.lessonType,
          transmission: formData.transmission,
          updatedAt: new Date().toISOString()
        };

        // Upload image if provided
        if (imageFile && storageBucketId) {
          try {
            const uploaded = await storage.createFile(
              storageBucketId,
              ID.unique(),
              imageFile
            );
            updateData.imageFileId = uploaded.$id;
            updateData.imageUrl = buildStorageFileUrl(storageBucketId, uploaded.$id);
          } catch (uploadError) {
            console.error('Error uploading instructor image during update:', uploadError);
          }
        }

        try {
          await databases.updateDocument(
            databaseId,
            instructorsCollectionId,
            editingInstructorId,
            updateData
          );
        } catch (err) {
          // If the instructor is an account-only entry, update the users collection instead
          try {
            await databases.updateDocument(
              databaseId,
              usersCollectionId,
              editingInstructorId,
              { name: formData.name.trim(), lessonType: formData.lessonType }
            );
          } catch (uErr) {
            console.error('Failed to update instructor or user document:', err, uErr);
            throw err;
          }
        }

        // Refresh and close modal
        await fetchInstructors();
        resetInstructorForm();
        setShowModal(false);
        return;
      }

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

      // Reuse an account created by a previous partial save, if present.
      const existingUsers = await databases.listDocuments(
        databaseId,
        usersCollectionId,
        [Query.equal('email', formData.email.trim())]
      );
      let authUserId = existingUsers.documents[0]?.$id;

      if (!authUserId) {
        authUserId = ID.unique();
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
            setError('This email already belongs to an account. Remove the incomplete instructor account or use another email.');
            return;
          }
          throw new Error('Failed to create instructor auth account: ' + authError.message);
        }
      }

      // Create user document
      if (!existingUsers.documents.length) {
        await databases.createDocument(
          databaseId,
          usersCollectionId,
          authUserId,
          {
            name: formData.name.trim(),
            email: formData.email.trim(),
            role: 'instructor',
            approved: true,
            createdAt: new Date().toISOString()
          }
        );
        console.log('Instructor user document created');
      }

      // Create instructor record
      await databases.createDocument(
        databaseId,
        instructorsCollectionId,
        authUserId,
        {
          name: formData.name.trim(),
          email: formData.email.trim(),
          certifications: formData.transmission === 'AT' ? 'Automatic Transmission' : 'Manual Transmission',
          availability: formData.availability,
          lessonType: formData.lessonType,
          transmission: formData.transmission,
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

    const openEditModal = (instructor) => {
      setEditingInstructorId(instructor.$id);
      setFormData({
        name: instructor.name || '',
        email: instructor.email || '',
        password: '',
        certifications: instructor.certifications || '',
        availability: instructor.availability || 'available',
        lessonType: instructor.lessonType || 'practical',
        transmission: instructor.transmission || 'MT'
      });
      setImagePreview(instructor.resolvedImageUrl || '');
      setShowModal(true);
    };

    const deleteInstructor = async (instructor) => {
      if (!window.confirm(`Delete instructor "${instructor.name}"? This cannot be undone.`)) return;
      try {
        if (instructor.isAccountOnly) {
          // Remove user document
          await databases.deleteDocument(databaseId, usersCollectionId, instructor.$id);
        } else {
          await databases.deleteDocument(databaseId, instructorsCollectionId, instructor.$id);
          // Also try to remove linked user document if exists by email
          try {
            const users = await databases.listDocuments(databaseId, usersCollectionId, [Query.equal('email', instructor.email)]);
            for (const u of users.documents) {
              await databases.deleteDocument(databaseId, usersCollectionId, u.$id);
            }
          } catch (uErr) {
            // ignore
            console.warn('Failed to remove linked user documents:', uErr);
          }
        }
        setInstructors(prev => prev.filter(i => i.$id !== instructor.$id));
      } catch (error) {
        console.error('Error deleting instructor:', error);
        setError('Failed to delete instructor.');
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
        <AdminPageHeader eyebrow="Team management" title="Instructors" description="Manage your teaching team, availability, and lesson assignments.">
          <button className="add-btn" onClick={() => { resetInstructorForm(); setShowModal(true); }}>
            <Plus size={17} aria-hidden="true" /> Add instructor
          </button>
        </AdminPageHeader>

        <div className="admin-directory-heading"><h2 className="section-title">Instructor directory</h2><span className="admin-count-badge">{instructors.length} instructors</span></div>

        {loading ? (
          <div className="loading">Loading instructors...</div>
        ) : instructors.length === 0 ? (
          <AdminEmptyState icon={GraduationCap} title="Build your teaching team" description="No instructors added yet. Click “Add instructor” to get started." />
        ) : (
          <>
            <div className="instructors-grid">
              {paginatedInstructors.map((instructor) => (
                <div key={instructor.$id} className="instructor-card">
                  <div className="instructor-avatar">
                    {instructor.resolvedImageUrl ? (
                      <img src={instructor.resolvedImageUrl} alt={instructor.name} />
                    ) : (
                      <UserRound size={30} strokeWidth={1.5} aria-hidden="true" />
                    )}
                  </div>
                  <div className="instructor-info">
                    <h3>{instructor.name}</h3>
                    {instructor.isAccountOnly && (
                      <p className="admin-instructor-email">
                        <Mail size={13} aria-hidden="true" /> {instructor.email}
                      </p>
                    )}
                    <div className="instructor-cert">
                      <div><span>Lesson type</span><strong>{instructor.lessonType === 'both' ? 'Theoretical & Driving' : instructor.lessonType === 'theory' ? 'Theoretical Class' : 'Driving Class'}</strong></div>
                      <div><span>Transmission</span><strong>{instructor.transmission || 'Not set'}</strong></div>
                      {(instructor.lessonType === 'theory' || instructor.lessonType === 'both') && !instructor.isAccountOnly && (
                        <>
                          <div><span>Booking slots</span><strong>{instructor.theoryRemainingSlots}/{instructor.theoryCapacity} available</strong></div>
                        </>
                      )}
                    </div>
                    {instructorSchedules[instructor.name]?.leaves && Array.isArray(instructorSchedules[instructor.name].leaves) && instructorSchedules[instructor.name].leaves.length > 0 && (
                      <div className="instructor-leaves admin-instructor-note">
                        <strong>On leave</strong><br />
                        {instructorSchedules[instructor.name].leaves.map((leave, idx) => (
                          <span key={idx}>
                            {new Date(leave.startDate).toLocaleDateString()} - {new Date(leave.endDate).toLocaleDateString()}
                            {leave.reason && ` (${leave.reason})`}
                            <br />
                          </span>
                        ))}
                      </div>
                    )}
                    {instructorSchedules[instructor.name]?.breaks && Array.isArray(instructorSchedules[instructor.name].breaks) && instructorSchedules[instructor.name].breaks.length > 0 && (
                      <div className="instructor-breaks admin-instructor-note">
                        <strong>Breaks</strong><br />
                        {instructorSchedules[instructor.name].breaks.map((brk, idx) => (
                          <span key={idx}>
                            {brk.day}: {brk.start} - {brk.end}
                            <br />
                          </span>
                        ))}
                      </div>
                    )}
                    {instructorSchedules[instructor.name]?.workingHours && (
                      <div className="instructor-working-hours admin-instructor-note">
                        <strong>Working hours</strong><br />
                        {Object.entries(instructorSchedules[instructor.name].workingHours).map(([day, hours]) => (
                          <span key={day}>
                            {day}: {hours.off ? 'Day off' : `${hours.start || 'N/A'} - ${hours.end || 'N/A'}`}<br />
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
                          <span className="status-badge confirmed">Booked</span>
                        )}
                        {instructor.availability === 'booked' && (
                          <small className="admin-locked-copy">Locked until lesson completed</small>
                        )}
                      </div>
                    )}
                    <div className="card-actions">
                      <div className="action-buttons">
                        <button className="action-btn edit-btn" onClick={() => openEditModal(instructor)}><Pencil size={14} aria-hidden="true" /> Edit</button>
                        <button className="action-btn delete-btn" onClick={() => deleteInstructor(instructor)}><Trash2 size={14} aria-hidden="true" /> Delete</button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="pagination">
              <button onClick={() => goToPage(currentPage - 1)} disabled={currentPage === 1} aria-label="Previous page"><ChevronLeft size={16} aria-hidden="true" /></button>
              {Array.from({ length: totalPages }, (_, idx) => idx + 1).map((page) => (
                <button
                  key={page}
                  className={currentPage === page ? 'active' : ''}
                  onClick={() => goToPage(page)}
                >
                  {page}
                </button>
              ))}
              <button onClick={() => goToPage(currentPage + 1)} disabled={currentPage === totalPages} aria-label="Next page"><ChevronRight size={16} aria-hidden="true" /></button>
            </div>
          </>
        )}

        {/* Add Instructor Modal */}
        {showModal && (
          <div className="modal-overlay" onClick={() => { resetInstructorForm(); setShowModal(false); }}>
            <div className="modal-content modal-large" role="dialog" aria-modal="true" aria-labelledby="admin-instructor-heading" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2 id="admin-instructor-heading">{editingInstructorId ? 'Edit instructor' : 'Add new instructor'}</h2>
                <button className="modal-close" aria-label="Close instructor dialog" onClick={() => { resetInstructorForm(); setShowModal(false); }}>×</button>
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
                  <label>Lesson Type *</label>
                  <select
                    name="lessonType"
                    value={formData.lessonType}
                    onChange={handleInputChange}
                    required
                  >
                    <option value="practical">Driving Class</option>
                    <option value="theory">Theoretical Class</option>
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
                  <label>Transmission *</label>
                  <select
                    name="transmission"
                    value={formData.transmission}
                    onChange={handleInputChange}
                    required
                  >
                    <option value="MT">Manual Transmission</option>
                    <option value="AT">Automatic Transmission</option>
                  </select>
                </div>

                <div className="form-group full">
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

                <div className="modal-actions full">
                  <button type="button" className="btn-cancel" onClick={() => { resetInstructorForm(); setShowModal(false); }}>
                    Cancel
                  </button>
                  <button type="submit" className="btn-submit">
                    {editingInstructorId ? 'Update Instructor' : 'Add Instructor'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Password Display Modal */}
        {showPasswordDisplay && (
          <div className="modal-overlay" onClick={() => setShowPasswordDisplay(false)}>
            <div className="modal-content admin-info-modal" role="dialog" aria-modal="true" aria-labelledby="admin-credentials-heading" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2 id="admin-credentials-heading"><CheckCircle2 size={20} aria-hidden="true" /> Instructor account created</h2>
                <button className="modal-close" aria-label="Close credentials dialog" onClick={() => setShowPasswordDisplay(false)}>×</button>
              </div>
              
              <div className="admin-credentials-body">
                <p className="admin-muted-copy">
                  Share these credentials with the instructor:
                </p>
                
                <div className="admin-credentials-box">
                  <p>
                    <strong>Email:</strong><br />
                    <code>{formData.email}</code>
                  </p>
                  
                  <p>
                    <strong>Password:</strong><br />
                    <code>{generatedPassword}</code>
                  </p>
                </div>

                <button
                  onClick={() => navigator.clipboard.writeText(`Email: ${formData.email}\nPassword: ${generatedPassword}`)}
                  className="admin-secondary-btn"
                >
                  <Clipboard size={16} aria-hidden="true" /> Copy credentials
                </button>

                <p className="admin-credentials-hint">
                  They can change this password after logging into the instructor page.
                </p>

                <button
                  onClick={() => setShowPasswordDisplay(false)}
                  className="admin-primary-btn"
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
