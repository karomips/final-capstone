import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
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
import PrivateRoute from './components/Shared/PrivateRoute';
import './App.css';

function App() {
  return (
    <Router>
      <AuthProvider>
        <div className="App">
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route 
              path="/admin" 
              element={
                <PrivateRoute>
                  <AdminDashboard />
                </PrivateRoute>
              } 
            />
            <Route 
              path="/admin/students" 
              element={
                <PrivateRoute>
                  <StudentManagement />
                </PrivateRoute>
              } 
            />
            <Route 
              path="/admin/instructors" 
              element={
                <PrivateRoute>
                  <InstructorsProfile />
                </PrivateRoute>
              } 
            />
            <Route 
              path="/admin/vehicles" 
              element={
                <PrivateRoute>
                  <VehicleInventory />
                </PrivateRoute>
              } 
            />
            <Route 
              path="/admin/sms-monitoring" 
              element={
                <PrivateRoute>
                  <SMSMonitoring />
                </PrivateRoute>
              } 
            />
            <Route 
              path="/user-dashboard" 
              element={
                <PrivateRoute>
                  <UserDashboard />
                </PrivateRoute>
              } 
            />
            <Route 
              path="/book-lesson" 
              element={
                <PrivateRoute>
                  <BookLesson />
                </PrivateRoute>
              } 
            />
            <Route 
              path="/profile" 
              element={
                <PrivateRoute>
                  <Profile />
                </PrivateRoute>
              } 
            />
            <Route 
              path="/dashboard" 
              element={
                <PrivateRoute>
                  <Dashboard />
                </PrivateRoute>
              } 
            />
            <Route path="/" element={<Navigate to="/login" />} />
          </Routes>
        </div>
      </AuthProvider>
    </Router>
  );
}

export default App;
