import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import Login from './components/Auth/Login';
import Signup from './components/Auth/Signup';
import Dashboard from './components/User/Dashboard';
import AdminDashboard from './components/Admin/AdminDashboard';
import StudentManagement from './components/Admin/StudentManagement';
import InstructorsProfile from './components/Admin/InstructorsProfile';
import VehicleInventory from './components/Admin/VehicleInventory';
import SMSMonitoring from './components/Admin/SMSMonitoring';
import UserDashboard from './components/User/UserDashboard';
import BookLesson from './components/User/BookLesson';
import Profile from './components/User/Profile';
import InstructorDashboard from './components/Instructor/InstructorDashboard';
import AdminLayout from './components/Layouts/AdminLayout';
import UserLayout from './components/Layouts/UserLayout';
import InstructorLayout from './components/Layouts/InstructorLayout';
import PrivateRoute from './components/Shared/PrivateRoute';
import './App.css';

function AppContent() {
  const location = useLocation();
  const isAuthPage = location.pathname === '/login' || location.pathname === '/signup';

  return (
    <div className={`App ${isAuthPage ? 'auth-shell' : 'app-shell-gradient'}`}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        
        {/* Admin Routes with AdminLayout */}
        <Route 
          path="/admin/*" 
          element={
            <PrivateRoute>
              <AdminLayout />
            </PrivateRoute>
          }
        >
          <Route path="" element={<AdminDashboard />} />
          <Route path="students" element={<StudentManagement />} />
          <Route path="instructors" element={<InstructorsProfile />} />
          <Route path="vehicles" element={<VehicleInventory />} />
          <Route path="sms-monitoring" element={<SMSMonitoring />} />
        </Route>
        
        {/* User Routes with UserLayout */}
        <Route 
          path="/user-dashboard" 
          element={
            <PrivateRoute>
              <UserLayout />
            </PrivateRoute>
          }
        >
          <Route path="" element={<UserDashboard />} />
        </Route>
        
        <Route 
          path="/book-lesson" 
          element={
            <PrivateRoute>
              <UserLayout />
            </PrivateRoute>
          }
        >
          <Route path="" element={<BookLesson />} />
        </Route>
        
        <Route 
          path="/profile" 
          element={
            <PrivateRoute>
              <UserLayout />
            </PrivateRoute>
          }
        >
          <Route path="" element={<Profile />} />
        </Route>
        
        <Route 
          path="/dashboard" 
          element={
            <PrivateRoute>
              <UserLayout />
            </PrivateRoute>
          }
        >
          <Route path="" element={<Dashboard />} />
        </Route>

        {/* Instructor Routes with InstructorLayout */}
        <Route 
          path="/instructor/*" 
          element={
            <PrivateRoute>
              <InstructorLayout />
            </PrivateRoute>
          }
        >
          <Route path="" element={<InstructorDashboard />} />
        </Route>
        
        <Route path="/" element={<Navigate to="/login" />} />
      </Routes>
    </div>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </Router>
  );
}

export default App;
