import React, { useState, useEffect, useCallback } from 'react';
import { Bike, CarFront, ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { AdminEmptyState, AdminPageHeader } from './AdminUI';
import { databases, databaseId, vehiclesCollectionId, storage, storageBucketId, buildStorageFileUrl } from '../../appwrite/config';
import { ID, Query } from 'appwrite';
import './AdminPages.css';

function VehicleInventory() {
  const VEHICLES_PER_PAGE = 8;
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState('vehicle');
  const [formData, setFormData] = useState({
    plateNumber: '',
    model: '',
    transmission: 'MT',
    status: 'available',
    engineCapacity: '',
    bikeType: 'Scooter'
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
      status: 'available',
      engineCapacity: '',
      bikeType: 'Scooter'
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

    if (modalType === 'motorcycle') {
      if (!formData.engineCapacity.trim()) {
        setError('Please enter the motorcycle engine capacity');
        return;
      }

      if (!/^[0-9]+$/.test(formData.engineCapacity.trim())) {
        setError('Engine capacity must be a numeric value');
        return;
      }
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
          vehicleType: modalType === 'motorcycle' ? 'motorcycle' : 'car',
          status: formData.status,
          ...(modalType === 'motorcycle' && { engineCapacity: formData.engineCapacity.trim() }),
          bikeType: modalType === 'motorcycle' ? formData.bikeType : '',
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
        <AdminPageHeader eyebrow="Fleet management" title="Vehicle inventory" description="Keep your training fleet organized and ready for every lesson.">
            <button className="add-btn" onClick={() => { setModalType('vehicle'); setShowModal(true); }}>
              <Plus size={17} aria-hidden="true" /> Add vehicle
            </button>
            <button className="add-btn add-motorcycle-btn" onClick={() => { setModalType('motorcycle'); setShowModal(true); }}>
              <Plus size={17} aria-hidden="true" /> Add motorcycle
            </button>
        </AdminPageHeader>

        <div className="admin-directory-heading"><h2 className="section-title">Training fleet</h2><span className="admin-count-badge">{vehicles.length} vehicles</span></div>

        {loading ? (
          <div className="loading">Loading vehicles...</div>
        ) : vehicles.length === 0 ? (
          <AdminEmptyState icon={CarFront} title="Your fleet starts here" description="No vehicles added yet. Click “Add vehicle” to get started." />
        ) : (
          <>
            <div className="vehicles-grid">
              {paginatedVehicles.map((vehicle) => (
                <div key={vehicle.$id} className="vehicle-card">
                  <div className="vehicle-image">
                    <img src={vehicle.resolvedImageUrl} alt={vehicle.model || 'Vehicle'} />
                  </div>
                  <div className="vehicle-info">
                    <h3>{vehicle.model}</h3>
                    <div className="vehicle-details">Plate number <strong>{vehicle.plateNumber}</strong></div>
                    <div className="vehicle-badges">
                      <span className={`vehicle-type-badge ${vehicle.vehicleType || 'car'}`}>
                        {vehicle.vehicleType === 'motorcycle' ? <><Bike size={14} aria-hidden="true" /> Motorcycle</> : <><CarFront size={14} aria-hidden="true" /> Car</>}
                      </span>
                      <span className={`transmission-badge ${(vehicle.transmission || vehicle.motorcycleTransmission || 'MT').toLowerCase()}`}>
                        {vehicle.transmission || vehicle.motorcycleTransmission || 'MT'}
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
                        <span className="status-badge confirmed">Booked</span>
                      )}
                      {vehicle.status === 'booked' && (
                        <small className="admin-locked-copy">Locked until lesson completed</small>
                      )}
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

        {/* Add Vehicle Modal */}
        {showModal && (
          <div className="modal-overlay" onClick={() => { resetVehicleForm(); setShowModal(false); }}>
            <div className="modal-content modal-large" role="dialog" aria-modal="true" aria-labelledby="admin-vehicle-heading" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2 id="admin-vehicle-heading">{modalType === 'motorcycle' ? 'Add new motorcycle' : 'Add new vehicle'}</h2>
                <button className="modal-close" aria-label="Close vehicle dialog" onClick={() => { resetVehicleForm(); setShowModal(false); }}>×</button>
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
                  <label>{modalType === 'motorcycle' ? 'Motorcycle Model *' : 'Car Model *'}</label>
                  <input
                    type="text"
                    name="model"
                    value={formData.model}
                    onChange={handleInputChange}
                    placeholder={modalType === 'motorcycle' ? 'e.g., Honda Click 125i' : 'e.g., Toyota Vios 2024'}
                    required
                  />
                </div>

                {modalType === 'vehicle' ? (
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
                ) : (
                  <>
                    <div className="form-group">
                      <label>Engine Capacity (CC) *</label>
                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        name="engineCapacity"
                        value={formData.engineCapacity}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          engineCapacity: e.target.value.replace(/\D/g, '')
                        }))}
                        placeholder="e.g., 150"
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label>Motorcycle Type *</label>
                      <select
                        name="bikeType"
                        value={formData.bikeType}
                        onChange={handleInputChange}
                        required
                      >
                        <option value="Scooter">Scooter (Automatic)</option>
                        <option value="Barako">Barako (Manual)</option>
                      </select>
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
                  </>
                )}

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
