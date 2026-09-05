import { Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import CompanySetup from './pages/CompanySetup';
import Dashboard from './pages/Dashboard';
import Employees from './pages/Employees';
import EmployeeForm from './pages/EmployeeForm';
import UserManagement from './pages/UserManagement';
import { ProtectedRoute } from './routes/ProtectedRoute';
import { useAuth } from './context/AuthContext';
import { HR_ROLES } from './constants/roles';

function RootRedirect() {
  const { user, loading } = useAuth();
  if (loading) return null;
  return <Navigate to={user ? '/dashboard' : '/login'} replace />;
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
