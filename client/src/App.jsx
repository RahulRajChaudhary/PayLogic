import { Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import CompanySetup from './pages/CompanySetup';
import Dashboard from './pages/Dashboard';
import Employees from './pages/Employees';
import EmployeeForm from './pages/EmployeeForm';
import Contracts from './pages/Contracts';
import UserManagement from './pages/UserManagement';
import Attendance from './pages/Attendance';
import TimeOff from './pages/TimeOff';
import { ProtectedRoute } from './routes/ProtectedRoute';
import { useAuth } from './context/AuthContext';
import { HR_ROLES } from './constants/roles';

function RootRedirect() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={HR_ROLES.includes(user.role) ? '/employees' : '/dashboard'} replace />;
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<RootRedirect />} />
      <Route path="/login" element={<Login />} />
      <Route path="/setup" element={<CompanySetup />} />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/attendance"
        element={
          <ProtectedRoute>
            <Attendance />
          </ProtectedRoute>
        }
      />
      <Route
        path="/time-off"
        element={
          <ProtectedRoute>
            <TimeOff />
          </ProtectedRoute>
        }
      />
      <Route
        path="/employees"
        element={
          <ProtectedRoute roles={HR_ROLES}>
            <Employees />
          </ProtectedRoute>
        }
      />
      <Route
        path="/employees/:id"
        element={
          <ProtectedRoute roles={HR_ROLES}>
            <EmployeeForm />
          </ProtectedRoute>
        }
      />
      <Route
        path="/contracts"
        element={
          <ProtectedRoute roles={HR_ROLES}>
            <Contracts />
          </ProtectedRoute>
        }
      />
      <Route
        path="/users"
        element={
          <ProtectedRoute roles={['admin']}>
            <UserManagement />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

export default App;
