// src/App.tsx
import React, { useState } from 'react';
import RoleSelectPage from './components/RoleSelectPage';
import Login from './components/Login';
import StudentDashboard from './components/StudentDashboard';
import AdminDashboard from './components/admin/AdminDashboard';
import { Role } from './types/types';
import { useAuth } from './context/AuthContext';
import { Toaster } from './components/ui/sonner';

function App() {
  const [role, setRole] = useState<Role | null>(null);
  const { user, loading, logout } = useAuth();

  const handleSelectRole = (selectedRole: Role) => {
    setRole(selectedRole);
  };

  const handleBack = () => {
    setRole(null);
    logout();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Show role selection page if not logged in
  if (!user && !role) {
    return <RoleSelectPage onSelectRole={handleSelectRole} />;
  }

  // Show login page if role is selected but user is not logged in
  if (!user && role) {
    return <Login role={role} onBack={handleBack} />;
  }

  // Show dashboard based on role after login
  if (user && user.role === 'student') {
    return <StudentDashboard onLogout={handleBack} />;
  }

  if (user && user.role === 'admin') {
    return <AdminDashboard onLogout={handleBack} />;
  }

  return null;
}

export default App;