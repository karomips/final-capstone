import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { databases, databaseId, vehiclesCollectionId } from '../appwrite/config';
import { ID, Query } from 'appwrite';
import './AdminPages.css';

function VehicleInventory() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    plateNumber: '',
    model: '',
    transmission: 'MT',
    status: 'available',
    imageUrl: ''
  });
  const [error, setError] = useState('');

  useEffect(() => {
    fetchVehicles();
  }, []);

  const fetchVehicles = async () => {
    try {
      setLoading(true);
      const response = await databases.listDocuments(
        databaseId,
        vehiclesCollectionId,
        [Query.orderDesc('$createdAt')]
      );
      setVehicles(response.documents);
    } catch (error) {
      console.error('Error fetching vehicles:', error);
      // If collection doesn't exist, show empty state
      setVehicles([]);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.plateNumber.trim() || !formData.model.trim()) {
      setError('Please fill in all required fields');
      return;
    }

    try {
      await databases.createDocument(
        databaseId,
        vehiclesCollectionId,
        ID.unique(),
        {
          plateNumber: formData.plateNumber.trim(),
          model: formData.model.trim(),
          transmission: formData.transmission,
          status: formData.status,
          imageUrl: formData.imageUrl.trim() || 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=400&h=300&fit=crop',
          createdAt: new Date().toISOString()
        }
      );

      // Reset form and close modal
      setFormData({
        plateNumber: '',
        model: '',
        transmission: 'MT',
        status: 'available',
        imageUrl: ''
      });
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

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <div className="admin-page-container">
      {/* Sidebar */}
      <div className="admin-sidebar">
        <div className="admin-logo-section">
          <div className="admin-logo">
            <img src="/api/placeholder/80/80" alt="Logo" />
          </div>
        </div>

        <div className="admin-nav-buttons">
          <button 
            className="admin-nav-btn"
            onClick={() => navigate('/admin')}
          >
            Dashboard
          </button>
          <button 
            className="admin-nav-btn"
            onClick={() => navigate('/admin/students')}
          >
            Student Management
          </button>
          <button 
            className="admin-nav-btn"
            onClick={() => navigate('/admin/instructors')}
          >
            Instructors' Profile
          </button>
          <button 
            className="admin-nav-btn active"
            onClick={() => navigate('/admin/vehicles')}
          >
            Vehicle Inventory
          </button>
        </div>

        <button className="admin-signout-btn" onClick={handleLogout}>
          Sign out
        </button>
      </div>

      {/* Main Content */}
      <div className="admin-main-content">
        <div className="page-header">
          <h1 className="admin-page-title">Vehicle Inventory - Admin Side</h1>
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
              {vehicles.map((vehicle) => (
                <div key={vehicle.$id} className="vehicle-card">
                  <div className="vehicle-image">
                    <img src={vehicle.imageUrl} alt="Vehicle" />
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
                        <span style={{color: '#166534', fontSize: '11px', marginLeft: '8px', fontWeight: '600'}}>Booked</span>
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
              <button>◄</button>
              <button className="active">1</button>
              <button>►</button>
            </div>
          </>
        )}

        {/* Add Vehicle Modal */}
        {showModal && (
          <div className="modal-overlay" onClick={() => setShowModal(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>Add New Vehicle</h2>
                <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
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
                  <label>Image URL (Optional)</label>
                  <input
                    type="url"
                    name="imageUrl"
                    value={formData.imageUrl}
                    onChange={handleInputChange}
                    placeholder="https://example.com/car-image.jpg"
                  />
                  <small>Leave empty to use default image</small>
                </div>

                <div className="modal-actions">
                  <button type="button" className="btn-cancel" onClick={() => setShowModal(false)}>
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
    </div>
  );
}

export default VehicleInventory;
