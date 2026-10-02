import { Route, Routes, Navigate } from "react-router-dom";
import AppLayout from "../layout/AppLayout";
import LoginPage from "../pages/Login/LoginPage";
import { AuthProvider } from "../contexts/AuthContext";
import { ThemeProvider } from "../contexts/ThemeContext";
import { SettingProvider } from "../contexts/SettingContext";
import ProtectedRoute from "./ProtectedRoute";
import AdminRoute from "./AdminRoute";
import AdminOrStaffRoute from "./AdminOrStaffRoute";

// ── Page Imports ──────────────────────────────────────────────────
import DashboardPage from "../pages/Dashboard/DashboardPage";
import MembersPage from "../pages/Members/MembersPage";
import ShareCapitalPage from "../pages/ShareCapital/ShareCapitalPage";
import LoansPage from "../pages/Loans/LoansPage";
import ProductionsPage from "../pages/Productions/ProductionsPage";
import SalesPage from "../pages/Sales/SalesPage";
import TasksPage from "../pages/Tasks/TasksPage";
import ReportsPage from "../pages/Reports/ReportsPage";
import UsersPage from "../pages/Users/UsersPage";
import SettingsPage from "../pages/Settings/SettingsPage";

// 📚 Books of Accounts Pages (Active)
import CashDisbursementPage from "../pages/BooksOfAccounts/CashDisbursementPage";
import CashReceiptsPage from "../pages/BooksOfAccounts/CashReceiptsPage";
import GeneralLedgerPage from "../pages/BooksOfAccounts/GeneralLedgerPage";

const AppRoutes = () => {
  return (
    <>
      <AuthProvider>
        <SettingProvider>
          <ThemeProvider>
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
                <Route path="/share-capital" element={<ShareCapitalPage />} />
                <Route path="/loans" element={<LoansPage />} />
                <Route path="/productions" element={<ProductionsPage />} />
                <Route path="/sales" element={<SalesPage />} />
                <Route path="/tasks" element={<TasksPage />} />
                <Route path="/reports" element={<ReportsPage />} />
                <Route path="/users" element={<UsersPage />} />
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="/setting" element={<Navigate to="/settings" replace />} />

                {/* 📚 Books of Accounts Routes — Active Books Only */}
                <Route path="/books-of-accounts/cash-receipts" element={<AdminOrStaffRoute><CashReceiptsPage /></AdminOrStaffRoute>} />
                <Route path="/books-of-accounts/cash-disbursements" element={<AdminOrStaffRoute><CashDisbursementPage /></AdminOrStaffRoute>} />
                <Route path="/books-of-accounts/general-ledger" element={<AdminOrStaffRoute><GeneralLedgerPage /></AdminOrStaffRoute>} />

                {/* Fallback — redirect unknown protected paths to dashboard */}
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
              </Route>
            </Routes>
          </ThemeProvider>
        </SettingProvider>
      </AuthProvider>
    </>
  );
};

export default AppRoutes;
