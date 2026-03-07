import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { databases, databaseId, usersCollectionId } from '../appwrite/config';
import './AdminPages.css';

function StudentManagement() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    try {
      const response = await databases.listDocuments(
        databaseId,
        usersCollectionId
      );
      // Filter out admin users
      const nonAdminUsers = response.documents.filter(user => user.role !== 'admin');
      setStudents(nonAdminUsers);
    } catch (error) {
      console.error('Error fetching students:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (userId) => {
    try {
      await databases.updateDocument(
        databaseId,
        usersCollectionId,
        userId,
        { approved: true }
      );
      // Refresh students list
      fetchStudents();
    } catch (error) {
      console.error('Error approving student:', error);
      alert('Failed to approve student');
    }
  };

  const handleDecline = async (userId) => {
    try {
      await databases.updateDocument(
        databaseId,
        usersCollectionId,
        userId,
        { approved: false }
      );
      // Refresh students list
      fetchStudents();
    } catch (error) {
      console.error('Error declining student:', error);
      alert('Failed to decline student');
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
            className="admin-nav-btn active"
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
            className="admin-nav-btn"
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
        <h1 className="admin-page-title">Student Management - Admin Side</h1>

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
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="5" className="table-empty">Loading...</td>
                </tr>
              ) : students.length === 0 ? (
                <tr>
                  <td colSpan="5" className="table-empty">No students registered yet</td>
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
                      {student.approved ? (
                        <span style={{color: '#16a34a', fontWeight: 600, fontSize: '14px'}}>✓ Approved</span>
                      ) : (
                        <button 
                          className="approve-btn" 
                          onClick={() => handleApprove(student.$id)}
                        >
                          Approve
                        </button>
                      )}
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
