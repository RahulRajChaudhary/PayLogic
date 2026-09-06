import { Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Employees from './pages/Employees';
import EmployeeForm from './pages/EmployeeForm';
import Contracts from './pages/Contracts';
import Departments from './pages/Departments';
import WorkingSchedules from './pages/WorkingSchedules';
import UserManagement from './pages/UserManagement';
import Attendance from './pages/Attendance';
import TimeOff from './pages/TimeOff';
import TimeOffTypes from './pages/TimeOffTypes';
import Allocations from './pages/Allocations';
import SalaryStructures from './pages/SalaryStructures';
import SalaryRules from './pages/SalaryRules';
import Payruns from './pages/Payruns';
import PayrunDetail from './pages/PayrunDetail';
import Payslips from './pages/Payslips';
import PayslipDetail from './pages/PayslipDetail';
import { ProtectedRoute } from './routes/ProtectedRoute';
import { useAuth } from './context/AuthContext';
import { HR_ROLES, PAYROLL_ROLES } from './constants/roles';

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
        path="/time-off/allocations"
        element={
          <ProtectedRoute roles={HR_ROLES}>
            <Allocations />
          </ProtectedRoute>
        }
      />
      <Route
        path="/time-off/types"
        element={
          <ProtectedRoute roles={HR_ROLES}>
            <TimeOffTypes />
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
        path="/departments"
        element={
          <ProtectedRoute roles={HR_ROLES}>
            <Departments />
          </ProtectedRoute>
        }
      />
      <Route
        path="/working-schedules"
        element={
          <ProtectedRoute roles={HR_ROLES}>
            <WorkingSchedules />
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
      <Route
        path="/salary-structures"
        element={
          <ProtectedRoute roles={PAYROLL_ROLES}>
            <SalaryStructures />
          </ProtectedRoute>
        }
      />
      <Route
        path="/salary-rules"
        element={
          <ProtectedRoute roles={PAYROLL_ROLES}>
            <SalaryRules />
          </ProtectedRoute>
        }
      />
      <Route
        path="/payruns"
        element={
          <ProtectedRoute roles={PAYROLL_ROLES}>
            <Payruns />
          </ProtectedRoute>
        }
      />
      <Route
        path="/payruns/:id"
        element={
          <ProtectedRoute roles={PAYROLL_ROLES}>
            <PayrunDetail />
          </ProtectedRoute>
        }
      />
      <Route
        path="/payslips"
        element={
          <ProtectedRoute roles={PAYROLL_ROLES}>
            <Payslips />
          </ProtectedRoute>
        }
      />
      <Route
        path="/payslips/:id"
        element={
          <ProtectedRoute roles={PAYROLL_ROLES}>
            <PayslipDetail />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

export default App;
