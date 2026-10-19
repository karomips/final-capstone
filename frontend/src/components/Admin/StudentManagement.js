import React, { useState, useEffect } from 'react';
import { Check, ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';
import { AdminPageHeader } from './AdminUI';
import { databases, databaseId, usersCollectionId } from '../../appwrite/config';
import './AdminPages.css';

function StudentManagement() {
  const STUDENTS_PER_PAGE = 10;
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    fetchStudents();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [students.length]);

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

  const totalPages = Math.max(1, Math.ceil(students.length / STUDENTS_PER_PAGE));
  const startIndex = (currentPage - 1) * STUDENTS_PER_PAGE;
  const paginatedStudents = students.slice(startIndex, startIndex + STUDENTS_PER_PAGE);

  const goToPage = (page) => {
    setCurrentPage(Math.min(Math.max(page, 1), totalPages));
  };

  return (
    <div className="admin-main-content admin-main-content--fit">
        <AdminPageHeader eyebrow="Student administration" title="Student management" description="Manage student accounts and review profile change requests.">
          <button onClick={fetchStudents} className="admin-secondary-btn admin-secondary-btn--compact">
            <RefreshCw size={16} aria-hidden="true" /> Refresh list
          </button>
        </AdminPageHeader>

        <div className="student-table-container">
          <div className="section-toolbar"><div><h2 className="section-title">Student directory</h2><p className="admin-section-description">Account status and approval requests</p></div><span className="admin-count-badge">{students.length} students</span></div>
          <div className="table-wrapper" role="region" aria-label="Student directory" tabIndex={0}>
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
                paginatedStudents.map((student, index) => (
                  <tr key={student.$id}>
                    <td className="admin-row-number">{String(startIndex + index + 1).padStart(2, '0')}</td>
                    <td><div className="admin-student-name"><span className="admin-student-avatar" aria-hidden="true">{(student.name || 'S').trim().charAt(0).toUpperCase()}</span><span className="name-cell">{student.name}</span></div></td>
                    <td>{student.email}</td>
                    <td>
                      <span className={`status-badge ${student.approved ? 'approved' : 'pending'}`}>
                        {student.approved ? 'Approved' : 'Pending'}
                      </span>
                    </td>
                    <td>
                      {student.hasChangeRequest && student.pendingChanges ? (
                        <div className="admin-change-request">
                          <span className="admin-pending-copy">Pending changes</span>
                          <details>
                            <summary>View details</summary>
                            <div className="admin-change-details">
                              {(() => {
                                try {
                                  const changes = JSON.parse(student.pendingChanges);
                                  return Object.entries(changes).map(([key, value]) => (
                                    <div key={key}>
                                      <strong>{key}:</strong> {value}
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
                        <span className="admin-muted-copy">No pending changes</span>
                      )}
                    </td>
                    <td>
                      <div className="admin-student-actions">
                        {/* Account approval button */}
                        {student.approved ? (
                          <span className="admin-approved-copy"><Check size={14} aria-hidden="true" /> Approved</span>
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
                          <div className="admin-change-actions">
                            <button 
                              onClick={() => handleApproveProfileChange(student.$id, student.pendingChanges)}
                              className="approve-btn"
                            >
                              Approve changes
                            </button>
                            <button 
                              onClick={() => handleRejectProfileChange(student.$id)}
                              className="decline-btn"
                            >
                              Reject
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

          {!loading && students.length > 0 && (
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
          )}
        </div>
      </div>
  );
}

export default StudentManagement;
