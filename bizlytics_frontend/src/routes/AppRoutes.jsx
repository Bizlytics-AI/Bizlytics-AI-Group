import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

import useAuth from '../hooks/useAuth';
import Loader from '../components/common/Loader';

// Pages
import Login from '../pages/auth/Login';
import CompanyRegister from '../pages/auth/CompanyRegister';
import HRRegister from '../pages/auth/HRRegister';
import AdminDashboard from '../pages/AdminDashboard';
import CompanyDashboard from '../pages/CompanyDashboard';
import HRDashboard from '../pages/HRDashboard';

// Protected Route Wrapper
const ProtectedRoute = ({ children, allowedRoles = [] }) => {
  const { isAuthenticated, loading, user } = useAuth();

  if (loading) return <Loader fullScreen />;

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Role-based access control
  if (allowedRoles.length > 0 && user && !allowedRoles.includes(user.role)) {
    // Redirect to their correct dashboard
    if (user.role === 'admin') return <Navigate to="/admin/dashboard" replace />;
    if (user.role === 'company') return <Navigate to="/company/dashboard" replace />;
    if (user.role === 'hr') return <Navigate to="/hr/dashboard" replace />;
    return <Navigate to="/login" replace />;
  }

  return children;
};

// Auth Route Wrapper (redirects to dashboard if already logged in)
const AuthRoute = ({ children }) => {
  const { isAuthenticated, loading, user } = useAuth();

  if (loading) return <Loader fullScreen />;

  if (isAuthenticated) {
    // Redirect based on role explicitly if hitting an auth route while logged in
    if (user?.role === 'admin') return <Navigate to="/admin/dashboard" replace />;
    if (user?.role === 'company') return <Navigate to="/company/dashboard" replace />;
    if (user?.role === 'hr') return <Navigate to="/hr/dashboard" replace />;
    return <Navigate to="/login" replace />;
  }

  return children;
};

// Smart dashboard redirect based on user's role
const DashboardRedirect = () => {
  const { user, loading } = useAuth();

  if (loading) return <Loader fullScreen />;

  if (user?.role === 'admin') return <Navigate to="/admin/dashboard" replace />;
  if (user?.role === 'company') return <Navigate to="/company/dashboard" replace />;
  if (user?.role === 'hr') return <Navigate to="/hr/dashboard" replace />;
  return <Navigate to="/login" replace />;
};

const AppRoutes = () => {
  return (
    <Routes>
      {/* Public Auth Routes */}
      <Route path="/login" element={<AuthRoute><Login /></AuthRoute>} />
      <Route path="/register/company" element={<AuthRoute><CompanyRegister /></AuthRoute>} />
      <Route path="/register/hr" element={<AuthRoute><HRRegister /></AuthRoute>} />

      {/* Protected Dashboard Routes based on role */}
      <Route
        path="/admin/dashboard"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AdminDashboard />
          </ProtectedRoute>
        }
      />

      <Route
        path="/company/dashboard"
        element={
          <ProtectedRoute allowedRoles={['company']}>
            <CompanyDashboard />
          </ProtectedRoute>
        }
      />

      <Route
        path="/hr/dashboard"
        element={
          <ProtectedRoute allowedRoles={['hr']}>
            <HRDashboard />
          </ProtectedRoute>
        }
      />

      {/* Generic /dashboard → redirects to role-specific dashboard */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <DashboardRedirect />
          </ProtectedRoute>
        }
      />

      {/* Fallback to login */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
};

export default AppRoutes;
