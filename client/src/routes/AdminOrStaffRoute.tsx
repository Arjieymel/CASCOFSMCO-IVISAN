import type { FC, ReactNode } from "react";
import { useAuth } from "../contexts/AuthContext";
import { Navigate } from "react-router-dom";
import { Spinner } from "../components/Spinner/Spinner";

interface AdminOrStaffRouteProps {
  children: ReactNode;
}

const AdminOrStaffRoute: FC<AdminOrStaffRouteProps> = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-white z-50">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!user || (user.role !== "Administrator" && user.role !== "Staff")) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

export default AdminOrStaffRoute;
