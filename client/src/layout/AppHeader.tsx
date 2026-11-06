import { useNavigate, Link } from "react-router-dom";
import { useHeader } from "../contexts/HeaderContext";
import { useSidebar } from "../contexts/SidebarContext";
import { useAuth } from "../contexts/AuthContext";
import { useState, type FormEvent } from "react";
import { FiMenu, FiLogOut, FiSettings, FiSearch, FiChevronDown } from "react-icons/fi";
import Swal from "sweetalert2";
import { useTheme } from "../contexts/ThemeContext";

const AppHeader = () => {
  const { currentTheme } = useTheme();
  const { isOpen, toggleUserMenu } = useHeader();
  const { toggleSidebar } = useSidebar();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const username = user?.username || "admin";
  const userRole = user?.role || "Administrator";

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
      <header className="fixed top-0 sm:left-64 sm:w-[calc(100%-16rem)] w-full z-30 bg-white border-b border-slate-200/80 shadow-[0_1px_4px_0_rgba(0,0,0,0.02)] h-18 sm:h-20 flex items-center justify-between px-4 sm:px-8 transition-all">
        {isOpen && (
          <div className="fixed inset-0 z-10 bg-transparent" onClick={toggleUserMenu} />
        )}

        {/* Left Side: Mobile Menu Button & Large Rounded Search Field */}
        <div className="flex items-center gap-3.5 flex-1 max-w-xl">
          <button
            type="button"
            onClick={toggleSidebar}
            className="inline-flex items-center p-2 text-slate-500 rounded-xl sm:hidden hover:bg-slate-100 focus:outline-none"
            aria-label="Open sidebar"
          >
            <FiMenu className="w-6 h-6" />
          </button>

        </div>

        {/* Right Side: Role Badge & Admin Avatar with Dropdown */}
        <div className="flex items-center gap-3 sm:gap-4 shrink-0">
          {/* Rounded Badge: System Role: Administrator */}
          <div className="hidden sm:inline-flex items-center gap-2 px-3.5 py-1.5 bg-primary/10 text-primary border border-primary/20 rounded-full text-xs font-semibold tracking-wide shadow-xs">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></span>
            <span>System Role: {userRole}</span>
          </div>

          {/* Admin Avatar Pill with Dropdown Arrow */}
          <div className="relative">
            <button
              type="button"
              onClick={toggleUserMenu}
              className="flex items-center gap-2.5 text-sm bg-slate-50 hover:bg-slate-100/80 border border-slate-200/80 rounded-full py-1.5 pl-1.5 pr-3 focus:outline-none transition-all cursor-pointer shadow-xs"
            >
              <div className="w-8 h-8 rounded-full bg-primary text-white font-bold flex items-center justify-center text-xs overflow-hidden shadow-inner">
                {user?.profile_picture_url ? (
                  <img
                    className="w-full h-full object-cover"
                    src={user.profile_picture_url}
                    alt={username}
                  />
                ) : (
                  <span className="uppercase">{username.substring(0, 2)}</span>
                )}
              </div>
              <span className="font-semibold text-slate-800 text-sm max-w-28 truncate">
                {username}
              </span>
              <FiChevronDown className="w-4 h-4 text-slate-400" />
            </button>

            {/* Profile Dropdown Menu */}
            <div
              className={`absolute right-0 mt-2.5 w-56 bg-white border border-slate-200/80 rounded-2xl shadow-xl divide-y divide-slate-100 z-50 transition-all duration-200 transform origin-top-right ${isOpen ? "scale-100 opacity-100 pointer-events-auto" : "scale-95 opacity-0 pointer-events-none"
                }`}
              id="dropdown-user"
            >
              <div className="px-4 py-3.5">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Signed In Account</p>
                <p className="text-sm font-bold text-slate-800 truncate mt-0.5">{username}</p>
                <p className="text-xs text-slate-500 truncate">{user?.email || "admin@ivisan.ph"}</p>
              </div>
              <div className="py-1.5">
                <Link
                  to="/settings"
                  className="flex items-center gap-2.5 px-4 py-2 text-sm text-slate-700 hover:bg-primary/10 hover:text-primary transition-colors"
                  onClick={toggleUserMenu}
                >
                  <FiSettings className="w-4 h-4 text-slate-400" />
                  <span>Settings</span>
                </Link>
              </div>
              <div className="py-1.5">
                <button
                  type="button"
                  className="flex items-center gap-2.5 w-full text-left px-4 py-2 text-sm text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer disabled:opacity-50"
                  onClick={handleLogout}
                  disabled={isLoading}
                >
                  <FiLogOut className="w-4 h-4" />
                  <span>{isLoading ? "Signing out..." : "Sign out"}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>
    </>
  );
};

export default AppHeader;
