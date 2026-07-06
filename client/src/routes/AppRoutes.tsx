import { Route, Routes, Navigate } from "react-router-dom";
import AppLayout from "../layout/AppLayout";
import LoginPage from "../pages/Login/LoginPage";
import { AuthProvider } from "../contexts/AuthContext";
import ProtectedRoute from "./ProtectedRoute";

// ── Page Imports ──────────────────────────────────────────────────
import DashboardPage from "../pages/Dashboard/DashboardPage";
import MembersPage from "../pages/Members/MembersPage";
import ProductionsPage from "../pages/Productions/ProductionsPage";
import SalesPage from "../pages/Sales/SalesPage";
import TasksPage from "../pages/Tasks/TasksPage";
import ReportsPage from "../pages/Reports/ReportsPage";
import UsersPage from "../pages/Users/UsersPage";
import SettingsPage from "../pages/Settings/SettingsPage";

const AppRoutes = () => {
  return (
    <>
      <AuthProvider>
        <Routes>
          {/* Public Route */}
          <Route path="/" element={<LoginPage />} />

          {/* Protected Routes — wrapped by AppLayout */}
          <Route
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/members" element={<MembersPage />} />
            <Route path="/productions" element={<ProductionsPage />} />
            <Route path="/sales" element={<SalesPage />} />
            <Route path="/tasks" element={<TasksPage />} />
            <Route path="/reports" element={<ReportsPage />} />
            <Route path="/users" element={<UsersPage />} />
            <Route path="/settings" element={<SettingsPage />} />

            {/* Fallback — redirect unknown protected paths to dashboard */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Route>
        </Routes>
      </AuthProvider>
    </>
  );
};

export default AppRoutes;
