import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './AdminPages.css';

function VehicleInventory() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  // Sample vehicle data
  const vehicles = [
    { id: 1, plate: 'XXXXXXXX', model: 'XXXXXXXX', transmission: 'MT', status: 'available' },
    { id: 2, plate: 'XXXXXXXX', model: 'XXXXXXXX', transmission: 'AT', status: 'due-service' },
    { id: 3, plate: 'XXXXXXXX', model: 'XXXXXXXX', transmission: 'AT', status: 'due-service' },
    { id: 4, plate: 'XXXXXXXX', model: 'XXXXXXXX', transmission: 'MT', status: 'due-service' },
    { id: 5, plate: 'XXXXXXXX', model: 'XXXXXXXX', transmission: 'AT', status: 'due-service' },
    { id: 6, plate: 'XXXXXXXX', model: 'XXXXXXXX', transmission: 'AT', status: 'maintenance' },
  ];

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
        <h1 className="admin-page-title">Vehicle Inventory - Admin Side</h1>

        <div className="vehicles-grid">
          {vehicles.map((vehicle) => (
            <div key={vehicle.id} className="vehicle-card">
              <div className="vehicle-image">
                <img src="https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=400&h=300&fit=crop" alt="Vehicle" />
              </div>
              <div className="vehicle-info">
                <h3>Plate Number: {vehicle.plate}</h3>
                <div className="vehicle-details">Model: {vehicle.model}</div>
                <div className="vehicle-badges">
                  <span className={`transmission-badge ${vehicle.transmission.toLowerCase()}`}>
                    {vehicle.transmission}
                  </span>
                  <span className={`status-badge ${vehicle.status}`}>
                    {vehicle.status === 'available' ? 'Available' : 
                     vehicle.status === 'due-service' ? 'Due for Service' : 'Maintenance'}
                  </span>
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
      </div>
    </div>
  );
}

export default VehicleInventory;
