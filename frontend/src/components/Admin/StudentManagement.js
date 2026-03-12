import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { databases, databaseId, usersCollectionId } from '../../appwrite/config';
import './AdminPages.css';
import EasyDriveLogo from '../../assets/EasyDriveLogo.png';

function StudentManagement() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    try {
      setLoading(true);
      console.log('Fetching students from database...');
      const response = await databases.listDocuments(
        databaseId,
        usersCollectionId
      );
      console.log('Total documents fetched:', response.documents.length);
      console.log('All users:', response.documents);
      
      // Filter out admin users
      const nonAdminUsers = response.documents.filter(user => user.role !== 'admin');
      console.log('Non-admin users:', nonAdminUsers.length);
      setStudents(nonAdminUsers);
    } catch (error) {
      console.error('Error fetching students:', error);
      alert('Failed to fetch students: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (userId) => {
    try {
      console.log('Attempting to approve user:', userId);
      console.log('Database ID:', databaseId);
      console.log('Collection ID:', usersCollectionId);
      
      const result = await databases.updateDocument(
        databaseId,
        usersCollectionId,
        userId,
        { approved: true }
      );
      
      console.log('Approval successful:', result);
      alert('✅ Student approved successfully! They can now book lessons.');
      
      // Refresh students list
      fetchStudents();
    } catch (error) {
      console.error('Error approving student:', error);
      console.error('Error details:', error.message, error.code, error.type);
      
      // Check if it's an attribute missing error
      if ((error.message && error.message.includes('Attribute not found')) || 
          error.code === 400 || error.type === 'attribute_not_found') {
        alert(
          '❌ SETUP ERROR: The "approved" attribute is missing from your Appwrite users collection!\n\n' +
          'To fix this:\n' +
          '1. Go to Appwrite Console: https://cloud.appwrite.io\n' +
          '2. Navigate to Databases → main-database → users collection\n' +
          '3. Click "Attributes" tab\n' +
          '4. Add new attribute:\n' +
          '   - Type: Boolean\n' +
          '   - Key: approved\n' +
          '   - Required: Yes\n' +
          '   - Default: false\n' +
          '5. Save and try again\n\n' +
          'Error: ' + error.message
        );
      } else if ((error.message && error.message.includes('permission')) || error.code === 401) {
        alert(
          '❌ PERMISSION ERROR: You don\'t have permission to update users.\n\n' +
          'To fix this:\n' +
          '1. Go to Appwrite Console\n' +
          '2. Navigate to Databases → main-database → users collection\n' +
          '3. Click "Settings" tab → "Permissions"\n' +
          '4. Add: Role "Any" with Update permission\n' +
          '   OR Role "Users" with Update permission\n\n' +
          'Error: ' + error.message
        );
      } else {
        alert(`❌ Failed to approve student: ${error.message || 'Unknown error'}\n\nCheck the console for details.`);
      }
    }
  };

  const handleApproveProfileChange = async (userId, pendingChanges) => {
    try {
      console.log('Approving profile changes for user:', userId);
      console.log('Pending changes:', pendingChanges);
      
      // Parse the pending changes
      const changes = JSON.parse(pendingChanges);
      
      // Extract only the actual user profile fields (ignore metadata like status, requestedAt)
      const updateData = {
        pendingChanges: null,
        hasChangeRequest: false
      };
      

      if (changes.name) updateData.name = changes.name;
      if (changes.email) updateData.email = changes.email;
      if (changes.phoneNumber) updateData.phoneNumber = changes.phoneNumber;
      
      await databases.updateDocument(
        databaseId,
        usersCollectionId,
        userId,
        updateData
      );
      
      alert('✅ Profile changes approved successfully!');
      fetchStudents();
    } catch (error) {
      console.error('Error approving profile changes:', error);
      alert(`❌ Failed to approve profile changes: ${error.message || 'Unknown error'}`);
    }
  };

  const handleRejectProfileChange = async (userId) => {
    try {
      console.log('Rejecting profile changes for user:', userId);
      
      // Clear the pending changes without applying them
      await databases.updateDocument(
        databaseId,
        usersCollectionId,
        userId,
        {
          pendingChanges: null,
          hasChangeRequest: false
        }
      );
      
      alert('✅ Profile changes rejected.');
      fetchStudents();
    } catch (error) {
      console.error('Error rejecting profile changes:', error);
      alert(`❌ Failed to reject profile changes: ${error.message || 'Unknown error'}`);
    }
  };

  // handleDecline function removed as it's not currently used
  // Uncomment if you want to add decline functionality later
  // const handleDecline = async (userId) => {
  //   try {
  //     await databases.updateDocument(
  //       databaseId,
  //       usersCollectionId,
  //       userId,
  //       { approved: false }
  //     );
  //     // Refresh students list
  //     fetchStudents();
  //   } catch (error) {
  //     console.error('Error declining student:', error);
  //     alert('Failed to decline student');
  //   }
  // };

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
      <button className="hamburger-btn" onClick={() => setSidebarOpen(!sidebarOpen)}>
        ☰
      </button>
          {/* Sidebar */}
          <div className={`admin-sidebar ${sidebarOpen ? '' : 'closed'}`}>
            <div className="admin-logo-section">
              <div className="admin-logo">
                <img src={EasyDriveLogo} alt="Easy Drive Logo" />
              </div>
            </div>

        <div className="admin-nav-buttons">
          <button 
            className="admin-nav-btn"
            onClick={() => navigate('/admin')}
          >
            <span className="nav-icon">🏠</span>
            Dashboard
          </button>
          <button 
            className="admin-nav-btn active"
            onClick={() => navigate('/admin/students')}
          >
            <span className="nav-icon">👥</span>
            Student Management
          </button>
          <button 
            className="admin-nav-btn"
            onClick={() => navigate('/admin/instructors')}
          >
            <span className="nav-icon">👨‍🏫</span>
            Instructors' Profile
          </button>
          <button 
            className="admin-nav-btn"
            onClick={() => navigate('/admin/vehicles')}
          >
            <span className="nav-icon">🚗</span>
            Vehicle Inventory
          </button>
          <button 
            className="admin-nav-btn"
            onClick={() => navigate('/admin/sms-monitoring')}
          >
            <span className="nav-icon">💬</span>
            SMS Monitoring
          </button>
        </div>

        <button className="admin-signout-btn" onClick={handleLogout}>
          Sign out
        </button>
      </div>

      {/* Main Content */}
      <div className="admin-main-content">
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px'}}>
          <h1 className="admin-page-title">Student Management</h1>
          <button 
            onClick={fetchStudents} 
            style={{
              padding: '10px 20px',
              background: '#5a9cf8',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontFamily: 'Poppins',
              fontSize: '14px',
              fontWeight: '500',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
             Refresh List
          </button>
        </div>

        <div className="student-table-container">
          <h2 className="section-title">STUDENT MANAGEMENT</h2>
          <div className="table-wrapper">
            <table className="student-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Full Name</th>
                <th>Email</th>
                <th>Status</th>
                <th>Profile Changes</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="6" className="table-empty">Loading...</td>
                </tr>
              ) : students.length === 0 ? (
                <tr>
                  <td colSpan="6" className="table-empty">No students registered yet</td>
                </tr>
              ) : (
                students.map((student, index) => (
                  <tr key={student.$id}>
                    <td style={{fontWeight: 600, color: '#1e3a5f'}}>{index + 1}</td>
                    <td style={{fontWeight: 500, color: '#1a1a1a'}}>{student.name}</td>
                    <td>{student.email}</td>
                    <td>
                      <span className={`status-badge ${student.approved ? 'approved' : 'pending'}`}>
                        {student.approved ? 'Approved' : 'Pending'}
                      </span>
                    </td>
                    <td>
                      {student.hasChangeRequest && student.pendingChanges ? (
                        <div style={{fontSize: '12px'}}>
                          <span style={{color: '#f59e0b', fontWeight: 600}}>⚠️ Pending Changes</span>
                          <details style={{marginTop: '5px', cursor: 'pointer'}}>
                            <summary style={{color: '#5a9cf8', cursor: 'pointer'}}>View Details</summary>
                            <div style={{marginTop: '8px', padding: '8px', background: '#f3f4f6', borderRadius: '4px', fontSize: '11px', textAlign: 'left'}}>
                              {(() => {
                                try {
                                  const changes = JSON.parse(student.pendingChanges);
                                  return Object.entries(changes).map(([key, value]) => (
                                    <div key={key} style={{marginBottom: '4px'}}>
                                      <strong style={{textTransform: 'capitalize'}}>{key}:</strong> {value}
                                    </div>
                                  ));
                                } catch (e) {
                                  return <div>Invalid data</div>;
                                }
                              })()}
                            </div>
                          </details>
                        </div>
                      ) : (
                        <span style={{color: '#9ca3af', fontSize: '12px'}}>No pending changes</span>
                      )}
                    </td>
                    <td>
                      <div style={{display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'flex-start'}}>
                        {/* Account approval button */}
                        {student.approved ? (
                          <span style={{color: '#16a34a', fontWeight: 600, fontSize: '14px'}}>✓ Approved</span>
                        ) : (
                          <button 
                            className="approve-btn" 
                            onClick={() => handleApprove(student.$id)}
                          >
                            Approve Account
                          </button>
                        )}
                        
                        {/* Profile change approval buttons */}
                        {student.hasChangeRequest && student.pendingChanges && (
                          <div style={{display: 'flex', gap: '6px'}}>
                            <button 
                              onClick={() => handleApproveProfileChange(student.$id, student.pendingChanges)}
                              style={{
                                padding: '6px 12px',
                                background: '#16a34a',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontSize: '12px',
                                fontWeight: '500'
                              }}
                            >
                              ✓ Approve Changes
                            </button>
                            <button 
                              onClick={() => handleRejectProfileChange(student.$id)}
                              style={{
                                padding: '6px 12px',
                                background: '#dc2626',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontSize: '12px',
                                fontWeight: '500'
                              }}
                            >
                              ✗ Reject
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          </div>
        </div>
      </div>
    </div>
  );
}

export default StudentManagement;
