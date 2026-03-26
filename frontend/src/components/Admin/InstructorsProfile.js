import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { databases, databaseId, instructorsCollectionId, bookingsCollectionId, storage, storageBucketId, buildStorageFileUrl } from '../../appwrite/config';
import { ID, Query } from 'appwrite';
import './AdminPages.css';

function InstructorsProfile() {
  const INSTRUCTORS_PER_PAGE = 8;
  const THEORY_MIN_CAPACITY = 15;
  const THEORY_MAX_CAPACITY = 20;
  const { logout } = useAuth();
  const navigate = useNavigate();

  const [instructors, setInstructors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    certifications: '',
    availability: 'available',
    lessonType: 'practical'
  });
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [error, setError] = useState('');

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

  const fetchInstructors = useCallback(async () => {
    try {
      setLoading(true);
      const response = await databases.listDocuments(
        databaseId,
        instructorsCollectionId,
        [Query.orderDesc('$createdAt')]
      );

      const mappedInstructors = await Promise.all(
        response.documents.map(async (instructor) => {
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

      setInstructors(mappedInstructors);
    } catch (error) {
      console.error('Error fetching instructors:', error);
      // If collection doesn't exist, show empty state
      setInstructors([]);
    } finally {
      setLoading(false);
    }
  }, [resolveInstructorImageUrl]);

  useEffect(() => {
    fetchInstructors();
  }, [fetchInstructors]);

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

    if (!formData.name.trim() || !formData.certifications.trim()) {
      setError('Please fill in all required fields');
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

      await databases.createDocument(
        databaseId,
        instructorsCollectionId,
        ID.unique(),
        {
          name: formData.name.trim(),
          certifications: formData.certifications.trim(),
          availability: formData.availability,
          lessonType: formData.lessonType,
          imageFileId,
          imageUrl,
          createdAt: new Date().toISOString()
        }
      );

      // Reset form and close modal
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
                    <div className="instructor-cert">
                      <strong>Teaches:</strong> {instructor.lessonType === 'both' ? 'Theory & Practical' : instructor.lessonType === 'theory' ? 'Theory Class' : 'Practical Lesson'}<br />
                      {(instructor.lessonType === 'theory' || instructor.lessonType === 'both') && (
                        <>
                          <strong>Booking Slots:</strong> {instructor.theoryRemainingSlots}/{instructor.theoryCapacity} available<br />
                        </>
                      )}
                      <strong>Certifications:</strong><br />
                      {instructor.certifications}
                    </div>
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
    </div>
  );
}

export default InstructorsProfile;
