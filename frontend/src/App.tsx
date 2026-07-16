import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import ConsumerDashboard from './pages/ConsumerDashboard';
import MerchantDashboard from './pages/MerchantDashboard';
import DriverDashboard from './pages/DriverDashboard';
import ProtectedRoute from './components/ProtectedRoute';

function App() {
  return (
    <Router>
      <Routes>
        {/* Authentication Routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Role-Specific Dashboards (Protected) */}
        <Route
          path="/consumer"
          element={
            <ProtectedRoute allowedRoles={['consumer']}>
              <ConsumerDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/merchant"
          element={
            <ProtectedRoute allowedRoles={['merchant']}>
              <MerchantDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/driver"
          element={
            <ProtectedRoute allowedRoles={['driver']}>
              <DriverDashboard />
            </ProtectedRoute>
          }
        />

        {/* Fallback Redirection */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
