import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import Login from './components/Login';
import Signup from './components/Signup';
import Dashboard from './components/Dashboard';
import AdminDashboard from './components/AdminDashboard';
import StudentManagement from './components/StudentManagement';
import InstructorsProfile from './components/InstructorsProfile';
import VehicleInventory from './components/VehicleInventory';
import UserDashboard from './components/UserDashboard';
import BookLesson from './components/BookLesson';
import PrivateRoute from './components/PrivateRoute';
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
