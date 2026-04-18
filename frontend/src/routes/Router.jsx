import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ProtectedRoute } from './ProtectedRoute';
import Login from '../pages/Auth/Login';
import EmployeeDashboard from '../pages/Dashboard/EmployeeDashboard';
import IdCard from '../pages/Dashboard/IdCard';
import EmployeesList from '../pages/Employees/EmployeesList';
import EmployeeForm from '../pages/Employees/EmployeeForm';
import EmployeeView from '../pages/Employees/EmployeeView';
import Designations from '../pages/HR/Designations';
import RolesPermissions from '../pages/HR/RolesPermissions';
import ProfileSettings from '../pages/Settings/ProfileSettings';
import ShiftRoster from '../pages/HR/ShiftRoster';
import CreateShift from '../pages/HR/CreateShift';
import AssignBulkShifts from '../pages/HR/AssignBulkShifts';
import Departments from '../pages/HR/Departments';
import Holidays from '../pages/HR/Holidays';
import Projects from '../pages/Work/Projects';
import ProjectDetails from '../pages/Work/ProjectDetails';
import Tasks from '../pages/Work/Tasks';
import Attendance from '../pages/Attendance/Attendance';
import Calendar from '../pages/Calendar';
import TicketsList from '../pages/Tickets/TicketsList';
import CreateTicket from '../pages/Tickets/CreateTicket';
import TicketDetail from '../pages/Tickets/TicketDetail';
import TicketFiles from '../pages/Tickets/TicketFiles';
import Leaves from '../pages/Leaves';
import NewLeave from '../pages/Leaves/NewLeave';
import Events from '../pages/Events/Events';

const Router = () => {
  const { isAuthenticated, loading } = useAuth();

  // Show loading screen during initial auth check to prevent route flashing
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/login"
          element={isAuthenticated ? <Navigate to="/dashboard/private" replace /> : <Login />}
        />
        <Route
          path="/dashboard"
          element={<Navigate to="/dashboard/private" replace />}
        />
        <Route
          path="/dashboard/private"
          element={
            <ProtectedRoute>
              <EmployeeDashboard variant="private" />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/advanced"
          element={
            <ProtectedRoute requireAdmin={true}>
              <EmployeeDashboard variant="advanced" />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/id-card"
          element={
            <ProtectedRoute>
              <IdCard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/employees"
          element={
            <ProtectedRoute requireModulePermission="Employees">
              <EmployeesList />
            </ProtectedRoute>
          }
        />
        <Route
          path="/employees/new"
          element={
            <ProtectedRoute requireModulePermission="Employees">
              <EmployeeForm />
            </ProtectedRoute>
          }
        />
        <Route
          path="/employees/:id/edit"
          element={
            <ProtectedRoute requireModulePermission="Employees">
              <EmployeeForm />
            </ProtectedRoute>
          }
        />
        <Route
          path="/employees/:id/view"
          element={
            <ProtectedRoute requireModulePermission="Employees">
              <EmployeeView />
            </ProtectedRoute>
          }
        />
        <Route
          path="/hr/departments"
          element={
            <ProtectedRoute requireModulePermission="Department">
              <Departments />
            </ProtectedRoute>
          }
        />
        <Route
          path="/hr/designations"
          element={
            <ProtectedRoute requireModulePermission="Designations">
              <Designations />
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings/roles"
          element={
            <ProtectedRoute requireAdmin={true}>
              <RolesPermissions />
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings/profile"
          element={
            <ProtectedRoute>
              <ProfileSettings />
            </ProtectedRoute>
          }
        />
        <Route
          path="/hr/shift-roster"
          element={
            <ProtectedRoute requireModulePermission="Shift Roster">
              <ShiftRoster />
            </ProtectedRoute>
          }
        />
        <Route
          path="/hr/shift-roster/create-shift"
          element={
            <ProtectedRoute requireModulePermission="Shift Roster">
              <CreateShift />
            </ProtectedRoute>
          }
        />
        <Route
          path="/hr/shift-roster/assign"
          element={
            <ProtectedRoute requireModulePermission="Shift Roster">
              <AssignBulkShifts />
            </ProtectedRoute>
          }
        />
        <Route
          path="/hr/holidays"
          element={
            <ProtectedRoute requireModulePermission="Holidays">
              <Holidays />
            </ProtectedRoute>
          }
        />
        <Route
          path="/work/projects"
          element={
            <ProtectedRoute requireModulePermission="Projects">
              <Projects />
            </ProtectedRoute>
          }
        />
        <Route
          path="/work/projects/:id"
          element={
            <ProtectedRoute requireModulePermission="Projects">
              <ProjectDetails />
            </ProtectedRoute>
          }
        />
        <Route
          path="/work/tasks"
          element={
            <ProtectedRoute requireModulePermission="Tasks">
              <Tasks />
            </ProtectedRoute>
          }
        />
        <Route
          path="/attendance"
          element={
            <ProtectedRoute requireModulePermission="Attendance">
              <Attendance />
            </ProtectedRoute>
          }
        />
        <Route
          path="/calendar"
          element={
            <ProtectedRoute>
              <Calendar />
            </ProtectedRoute>
          }
        />
        <Route
          path="/tickets"
          element={
            <ProtectedRoute requireModulePermission="Tickets">
              <TicketsList />
            </ProtectedRoute>
          }
        />
        <Route
          path="/tickets/create"
          element={
            <ProtectedRoute requireModulePermission="Tickets">
              <CreateTicket />
            </ProtectedRoute>
          }
        />
        <Route
          path="/tickets/:id"
          element={
            <ProtectedRoute requireModulePermission="Tickets">
              <TicketDetail />
            </ProtectedRoute>
          }
        />
        <Route
          path="/tickets/files"
          element={
            <ProtectedRoute requireModulePermission="Tickets">
              <TicketFiles />
            </ProtectedRoute>
          }
        />
        <Route
          path="/leaves"
          element={
            <ProtectedRoute requireModulePermission="Leaves">
              <Leaves />
            </ProtectedRoute>
          }
        />
        <Route
          path="/leaves/calendar"
          element={
            <ProtectedRoute requireModulePermission="Leaves">
              <Leaves initialView="calendar" />
            </ProtectedRoute>
          }
        />
        <Route
          path="/leaves/my-leaves"
          element={
            <ProtectedRoute requireModulePermission="Leaves">
              <Leaves initialView="my" />
            </ProtectedRoute>
          }
        />
        <Route
          path="/leaves/new"
          element={
            <ProtectedRoute requireModulePermission="Leaves">
              <NewLeave />
            </ProtectedRoute>
          }
        />
        <Route
          path="/events"
          element={
            <ProtectedRoute requireModulePermission="Events">
              <Events />
            </ProtectedRoute>
          }
        />

        <Route 
          path="/" 
          element={
            isAuthenticated ? (
              <Navigate to="/dashboard/private" replace />
            ) : (
              <Navigate to="/login" replace />
            )
          } 
        />
      </Routes>
    </BrowserRouter>
  );
};

export default Router;

