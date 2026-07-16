import React from 'react';
import { Navigate } from 'react-router-dom';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: string[];
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const token = localStorage.getItem('access_token');
  const role = localStorage.getItem('user_role');

  // If not logged in, redirect to login page
  if (!token) {
    return <Navigate to="/login" replace />;
  }

  // If role is specified and does not match the user's role, redirect to their home dashboard
  if (allowedRoles && role && !allowedRoles.includes(role)) {
    if (role === 'consumer') {
      return <Navigate to="/consumer" replace />;
    } else if (role === 'merchant') {
      return <Navigate to="/merchant" replace />;
    } else if (role === 'driver') {
      return <Navigate to="/driver" replace />;
    } else {
      return <Navigate to="/login" replace />;
    }
  }

  return <>{children}</>;
};

export default ProtectedRoute;
