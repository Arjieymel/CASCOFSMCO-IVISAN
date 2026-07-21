import { useNavigate, Link } from "react-router-dom";
import { useHeader } from "../contexts/HeaderContext";
import { useSidebar } from "../contexts/SidebarContext";
import { useAuth } from "../contexts/AuthContext";
import { useState, type FormEvent } from "react";
import { FiMenu, FiLogOut, FiSettings } from "react-icons/fi";
import Swal from "sweetalert2";
import { useTheme } from "../contexts/ThemeContext";

const AppHeader = () => {
  const { currentTheme } = useTheme();
  const { isOpen, toggleUserMenu } = useHeader();
  const { toggleSidebar } = useSidebar();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);

  const handleLogout = async (e: FormEvent) => {
    e.preventDefault();

    const result = await Swal.fire({
      title: "Logout?",
      text: "Are you sure you want to log out of CASCOFAMCO?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: currentTheme.primary,
      cancelButtonColor: "#64748B",
      confirmButtonText: "Yes, Log out",
      cancelButtonText: "Cancel"
    });

    if (!result.isConfirmed) return;

    try {
      setIsLoading(true);
      await logout();
      navigate("/");
    } catch (error) {
      console.error("Unexpected server error occurred during logging user out: ", error);
      Swal.fire("Error", "Logout failed. Please try again.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <nav className="fixed top-0 z-30 w-full bg-navbar-bg border-b border-slate-100 shadow-xs h-16 flex items-center justify-between px-4 sm:px-6">
        {isOpen && (
          <div className="fixed inset-0 z-10 bg-transparent" onClick={toggleUserMenu} />
        )}
        {/* Toggle Button & Brand for mobile */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={toggleSidebar}
            className="inline-flex items-center p-2 text-slate-500 rounded-lg sm:hidden hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-100"
          >
            <span className="sr-only">Open sidebar</span>
            <FiMenu className="w-6 h-6" />
          </button>

          <div className="sm:hidden font-bold text-primary tracking-wide text-sm">
            CASCOFAMCO
          </div>

          <div className="hidden sm:block text-slate-500 font-medium text-sm tracking-wide">

          </div>
        </div>

        {/* User profile dropdown and status */}
        <div className="flex items-center gap-4">
          {user && (
            <span className="hidden md:inline-flex text-xs font-semibold px-3 py-1 bg-green-50 text-primary border border-green-100 rounded-full">
              System Role: {user.role}
            </span>
          )}

          {user && (
            <div className="relative">
              <button
                type="button"
                onClick={toggleUserMenu}
                className="flex items-center gap-2 text-sm bg-slate-50 border border-slate-100 hover:bg-slate-100 rounded-full py-1.5 px-3 focus:outline-none transition-colors duration-150 cursor-pointer"
              >
                <div className="w-7 h-7 rounded-full bg-primary/10 border border-primary/20 overflow-hidden flex items-center justify-center">
                  {user.profile_picture_url ? (
                    <img
                      className="w-full h-full object-cover"
                      src={user.profile_picture_url}
                      alt="user profile"
                    />
                  ) : (
                    <span className="text-xs font-bold text-primary uppercase">
                      {user.username.substring(0, 2)}
                    </span>
                  )}
                </div>
                <span className="hidden sm:inline font-medium text-slate-700 max-w-28 truncate">
                  {user.username}
                </span>
              </button>

              {/* Profile dropdown menu */}
              <div
                className={`absolute right-0 mt-2 w-52 bg-white border border-slate-100 rounded-xl shadow-lg divide-y divide-slate-50 z-50 transition-all duration-200 transform origin-top-right ${isOpen ? "scale-100 opacity-100 pointer-events-auto" : "scale-95 opacity-0 pointer-events-none"
                  }`}
                id="dropdown-user"
              >
                <div className="px-4 py-3">
                  <p className="text-xs font-semibold text-slate-400">Account Details</p>
                  <p className="text-sm font-semibold text-slate-800 truncate mt-0.5">{user.username}</p>
                  <p className="text-[11px] text-slate-500 truncate">{user.email}</p>
                </div>
                <div className="py-1">
                  <Link
                    to="/settings"
                    className="flex items-center gap-2.5 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                    onClick={toggleUserMenu}
                  >
                    <FiSettings className="w-4 h-4 text-slate-400" />
                    <span>Settings</span>
                  </Link>
                </div>
                <div className="py-1">
                  <button
                    type="button"
                    className="flex items-center gap-2.5 w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 hover:text-red-700 transition-colors cursor-pointer disabled:opacity-50"
                    onClick={handleLogout}
                    disabled={isLoading}
                  >
                    <FiLogOut className="w-4 h-4" />
                    <span>{isLoading ? "Signing out..." : "Sign out"}</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </nav>
    </>
  );
};

export default AppHeader;
