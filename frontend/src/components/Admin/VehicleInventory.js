import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { databases, databaseId, vehiclesCollectionId, storage, storageBucketId, buildStorageFileUrl } from '../../appwrite/config';
import { ID, Query } from 'appwrite';
import './AdminPages.css';

function VehicleInventory() {
  const VEHICLES_PER_PAGE = 8;
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    plateNumber: '',
    model: '',
    transmission: 'MT',
    status: 'available'
  });
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [error, setError] = useState('');

  const resolveVehicleImageUrl = useCallback((vehicle) => {
    if (vehicle?.imageFileId && storageBucketId) {
      return buildStorageFileUrl(storageBucketId, vehicle.imageFileId);
    }

    return vehicle?.imageUrl || 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=400&h=300&fit=crop';
  }, []);

  const fetchVehicles = useCallback(async () => {
    try {
      setLoading(true);
      const response = await databases.listDocuments(
        databaseId,
        vehiclesCollectionId,
        [Query.orderDesc('$createdAt')]
      );
      const mappedVehicles = response.documents.map((vehicle) => ({
        ...vehicle,
        resolvedImageUrl: resolveVehicleImageUrl(vehicle)
      }));
      setVehicles(mappedVehicles);
    } catch (error) {
      console.error('Error fetching vehicles:', error);
      // If collection doesn't exist, show empty state
      setVehicles([]);
    } finally {
      setLoading(false);
    }
  }, [resolveVehicleImageUrl]);

  useEffect(() => {
    fetchVehicles();
  }, [fetchVehicles]);

  useEffect(() => {
    setCurrentPage(1);
  }, [vehicles.length]);

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

    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const resetVehicleForm = () => {
    setFormData({
      plateNumber: '',
      model: '',
      transmission: 'MT',
      status: 'available'
    });
    setImageFile(null);
    setImagePreview('');
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.plateNumber.trim() || !formData.model.trim()) {
      setError('Please fill in all required fields');
      return;
    }

    try {
      // Use uploaded image if provided (upload to Appwrite Storage), otherwise fall back to default placeholder
      const defaultImage = 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=400&h=300&fit=crop';
      let imageToSave = defaultImage;
      let imageFileId = '';

      if (imageFile) {
        if (!storageBucketId) {
          console.warn('No storage bucket configured; default image will be used. Set REACT_APP_APPWRITE_STORAGE_BUCKET_ID to enable uploads.');
          setError('Image upload disabled: no storage bucket configured. Vehicle saved with default image.');
        } else {
          try {
            // Ensure the file is publicly readable so it can be displayed by any user.
            const uploaded = await storage.createFile(
              storageBucketId,
              ID.unique(),
              imageFile
            );
            imageFileId = uploaded.$id;
            imageToSave = buildStorageFileUrl(storageBucketId, uploaded.$id);
          } catch (uploadError) {
            console.warn('Image upload failed (falling back to placeholder):', uploadError);
            setError('Image upload failed – saving vehicle with default image.');
            imageToSave = defaultImage;
          }
        }
      }

      await databases.createDocument(
        databaseId,
        vehiclesCollectionId,
        ID.unique(),
        {
          plateNumber: formData.plateNumber.trim(),
          model: formData.model.trim(),
          transmission: formData.transmission,
          status: formData.status,
          imageFileId,
          imageUrl: imageToSave,
          createdAt: new Date().toISOString()
        }
      );

      // Reset form and close modal
      resetVehicleForm();
      setShowModal(false);
      
      // Refresh vehicles list
      fetchVehicles();
    } catch (error) {
      console.error('Error adding vehicle:', error);
      setError(error.message || 'Failed to add vehicle. Please try again.');
    }
  };

  const handleStatusChange = async (vehicleId, newStatus) => {
    try {
      await databases.updateDocument(
        databaseId,
        vehiclesCollectionId,
        vehicleId,
        { status: newStatus }
      );
      // Update local state
      setVehicles(prev => prev.map(v => 
        v.$id === vehicleId ? { ...v, status: newStatus } : v
      ));
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };



  const totalPages = Math.max(1, Math.ceil(vehicles.length / VEHICLES_PER_PAGE));
  const paginatedVehicles = vehicles.slice(
    (currentPage - 1) * VEHICLES_PER_PAGE,
    currentPage * VEHICLES_PER_PAGE
  );

  const goToPage = (page) => {
    setCurrentPage(Math.min(Math.max(page, 1), totalPages));
  };

  return (
    <div className="admin-main-content admin-main-content--fit">
        <div className="page-header">
          <h1 className="admin-page-title">Vehicle Inventory</h1>
          <button className="add-btn" onClick={() => setShowModal(true)}>
            + Add Vehicle
          </button>
        </div>

        {loading ? (
          <div className="loading">Loading vehicles...</div>
        ) : vehicles.length === 0 ? (
          <div className="empty-state">
            <p>No vehicles added yet. Click "Add Vehicle" to get started.</p>
          </div>
        ) : (
          <>
            <div className="vehicles-grid">
              {paginatedVehicles.map((vehicle) => (
                <div key={vehicle.$id} className="vehicle-card">
                  <div className="vehicle-image">
                    <img src={vehicle.resolvedImageUrl} alt="Vehicle" />
                  </div>
                  <div className="vehicle-info">
                    <h3>Model: {vehicle.model}</h3>
                    <div className="vehicle-details">Plate Number: {vehicle.plateNumber}</div>
                    <div className="vehicle-badges">
                      <span className={`transmission-badge ${vehicle.transmission.toLowerCase()}`}>
                        {vehicle.transmission}
                      </span>
                    </div>
                    <div className="status-dropdown-container">
                      <label>Status:</label>
                      <select 
                        value={vehicle.status || 'available'}
                        onChange={(e) => handleStatusChange(vehicle.$id, e.target.value)}
                        className="inline-status-select"
                        disabled={vehicle.status === 'booked'}
                      >
                        <option value="available">Available</option>
                        <option value="due-service">Due for Service</option>
                        <option value="maintenance">Maintenance</option>
                      </select>
                      {vehicle.status === 'booked' && (
                        <span style={{color: '#111f33', fontSize: '11px', marginLeft: '8px', fontWeight: '600'}}>Booked</span>
                      )}
                      {vehicle.status === 'booked' && (
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

        {/* Add Vehicle Modal */}
        {showModal && (
          <div className="modal-overlay" onClick={() => { resetVehicleForm(); setShowModal(false); }}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>Add New Vehicle</h2>
                <button className="modal-close" onClick={() => { resetVehicleForm(); setShowModal(false); }}>×</button>
              </div>
              
              <form onSubmit={handleSubmit} className="modal-form">
                {error && <div className="error-message">{error}</div>}
                
                <div className="form-group">
                  <label>Plate Number *</label>
                  <input
                    type="text"
                    name="plateNumber"
                    value={formData.plateNumber}
                    onChange={handleInputChange}
                    placeholder="e.g., ABC-1234"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Car Model *</label>
                  <input
                    type="text"
                    name="model"
                    value={formData.model}
                    onChange={handleInputChange}
                    placeholder="e.g., Toyota Corolla 2024"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Transmission Type *</label>
                  <select
                    name="transmission"
                    value={formData.transmission}
                    onChange={handleInputChange}
                    required
                  >
                    <option value="MT">MT (Manual Transmission)</option>
                    <option value="AT">AT (Automatic Transmission)</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Status *</label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleInputChange}
                    required
                  >
                    <option value="available">Available</option>
                    <option value="due-service">Due for Service</option>
                    <option value="maintenance">Maintenance</option>
                  </select>
                  <small>Note: Vehicles are automatically set to "Booked" when a user books them</small>
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
                  <small>Upload a photo of the vehicle or leave empty to use the default image.</small>
                </div>

                <div className="modal-actions">
                  <button type="button" className="btn-cancel" onClick={() => { resetVehicleForm(); setShowModal(false); }}>
                    Cancel
                  </button>
                  <button type="submit" className="btn-submit">
                    Add Vehicle
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
    </div>
  );
}

export default VehicleInventory;
