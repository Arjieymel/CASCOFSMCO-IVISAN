import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useSidebar } from "../contexts/SidebarContext";
import { useAuth } from "../contexts/AuthContext";
import { useSettings } from "../contexts/SettingContext";
import {
  FiGrid,
  FiUsers,
  FiPackage,
  FiCheckSquare,
  FiBarChart2,
  FiSettings,
  FiUser,
  FiBookOpen,
  FiChevronDown,
  FiChevronRight,
  FiX
} from "react-icons/fi";
import { TbCurrencyPeso } from "react-icons/tb";

const AppSidebar = () => {
  const { isOpen, toggleSidebar } = useSidebar();
  const { user } = useAuth();
  const { cooperativeName, cooperativeLogo } = useSettings();
  const location = useLocation();

  const isBooksRoute = location.pathname.startsWith("/books-of-accounts");
  const [booksOpen, setBooksOpen] = useState(isBooksRoute);

  const isCurrentPath = (path: string) => {
    return location.pathname === path;
  };

  const menuItems = [
    { path: "/dashboard", text: "Dashboard", icon: <FiGrid className="w-[18px] h-[18px]" strokeWidth={1.8} /> },
    { path: "/members", text: "Members", icon: <FiUsers className="w-[18px] h-[18px]" strokeWidth={1.8} /> },
    { path: "/productions", text: "Productions", icon: <FiPackage className="w-[18px] h-[18px]" strokeWidth={1.8} /> },
    { path: "/sales", text: "Sales Recording", icon: <TbCurrencyPeso className="w-[18px] h-[18px]" strokeWidth={1.8} /> },
    { path: "/tasks", text: "Task Monitoring", icon: <FiCheckSquare className="w-[18px] h-[18px]" strokeWidth={1.8} /> },
    { path: "/reports", text: "Reports", icon: <FiBarChart2 className="w-[18px] h-[18px]" strokeWidth={1.8} /> },
    { path: "/users", text: "Users", icon: <FiUser className="w-[18px] h-[18px]" strokeWidth={1.8} /> },
    { path: "/settings", text: "Settings", icon: <FiSettings className="w-[18px] h-[18px]" strokeWidth={1.8} /> },
  ];

  const booksSubmenu = [
    { path: "/books-of-accounts/cash-register", text: "Cash Register Book" },
    { path: "/books-of-accounts/cash-disbursements", text: "Cash Disbursement Journal" },
    { path: "/books-of-accounts/sales-book", text: "Cash Register Sales Book" },
    { path: "/books-of-accounts/cash-receipts", text: "Cash Receipts Journal" },
    { path: "/books-of-accounts/journal-vouchers", text: "Journal Voucher Register" },
    { path: "/books-of-accounts/general-ledger", text: "General Ledger" },
  ];

  const username = user?.username || "admin";
  const roleDisplay = (user?.role || "Administrator").toUpperCase();

  return (
    <>
      {/* Mobile Backdrop */}
      {!isOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-xs sm:hidden"
          onClick={toggleSidebar}
        />
      )}

      {/* Main Sidebar Container */}
      <aside
        id="top-bar-sidebar"
        className={`fixed top-0 left-0 z-40 w-64 h-full bg-[var(--theme-sidebar-bg)] text-white transition-all duration-300 ${
          isOpen ? "-translate-x-full" : "translate-x-0"
        } sm:translate-x-0 border-r border-white/10 shadow-2xl flex flex-col`}
        aria-label="Sidebar"
      >
        {/* Standalone Brand & Logo Area (No container box, no borders) */}
        <div className="flex items-center justify-between px-6 py-5.5 border-b border-white/[0.07] bg-black/20">
          <Link to="/dashboard" className="flex items-center gap-3.5 group">
            {/* Standalone Logo */}
            <img
              src={cooperativeLogo || "/niyog.png"}
              onError={(e) => {
                (e.target as HTMLImageElement).src = "/favicon.svg";
              }}
              alt="Ivisan Coconut"
              className="w-8 h-8 object-contain shrink-0 transition-transform duration-200 group-hover:scale-105"
            />
            {/* Clean Modern Typography */}
            <div className="overflow-hidden leading-tight">
              <span className="text-[15px] font-semibold text-white tracking-tight block truncate">
                Ivisan Smal…
              </span>
              <span className="text-[10px] font-medium text-[var(--theme-accent)]/90 tracking-widest uppercase block mt-0.5 truncate">
                IVISAN COCONUT
              </span>
            </div>
          </Link>

          <button
            onClick={toggleSidebar}
            className="sm:hidden p-1.5 rounded-lg text-[var(--theme-accent)] hover:text-white hover:bg-white/[0.08] transition-colors"
            aria-label="Close sidebar"
          >
            <FiX className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Menu */}
        <div className="flex-1 px-3.5 py-5 overflow-y-auto space-y-1 scrollbar-none">
          <ul className="space-y-1">
            {menuItems.map((item, index) => {
              const active = isCurrentPath(item.path);
              return (
                <li key={index}>
                  <Link
                    to={item.path}
                    className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm transition-all duration-150 group ${
                      active
                        ? "bg-[var(--theme-accent)] text-[#062c19] font-semibold shadow-sm"
                        : "text-white/80 hover:text-white hover:bg-[var(--theme-sidebar-hover)] font-medium"
                    }`}
                  >
                    <span
                      className={`transition-colors duration-150 ${
                        active ? "text-[#062c19]" : "text-[var(--theme-accent)]/80 group-hover:text-[var(--theme-accent)]"
                      }`}
                    >
                      {item.icon}
                    </span>
                    <span className="tracking-tight">{item.text}</span>
                  </Link>
                </li>
              );
            })}

            {/* Thin Horizontal Divider Line separating Books of Accounts */}
            <li className="py-2 px-1" aria-hidden="true">
              <div className="h-px bg-white/15 w-full" />
            </li>

            {/* Books of Accounts Navigation Item */}
            <li className="pt-0.5">
              <button
                onClick={() => setBooksOpen(!booksOpen)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm transition-all duration-150 group cursor-pointer ${
                  isBooksRoute
                    ? "bg-[var(--theme-accent)] text-[#062c19] font-semibold shadow-sm"
                    : "text-white/80 hover:text-white hover:bg-[var(--theme-sidebar-hover)] font-medium"
                }`}
              >
                <div className="flex items-center gap-3">
                  <FiBookOpen
                    className={`w-[18px] h-[18px] transition-colors duration-150 ${
                      isBooksRoute ? "text-[#062c19]" : "text-[var(--theme-accent)]/80 group-hover:text-[var(--theme-accent)]"
                    }`}
                    strokeWidth={1.8}
                  />
                  <span className="tracking-tight">Books of Accounts</span>
                </div>
                {booksOpen ? (
                  <FiChevronDown className="w-4 h-4 opacity-70" />
                ) : (
                  <FiChevronRight className="w-4 h-4 opacity-70" />
                )}
              </button>

              {/* Submenu */}
              {booksOpen && (
                <ul className="mt-1 ml-4 pl-3 border-l border-white/[0.1] space-y-1 py-1">
                  {booksSubmenu.map((sub, sIdx) => {
                    const subActive = isCurrentPath(sub.path);
                    return (
                      <li key={sIdx}>
                        <Link
                          to={sub.path}
                          className={`block px-3 py-1.5 rounded-lg text-xs tracking-wide transition-colors duration-150 ${
                            subActive
                              ? "bg-[var(--theme-accent)] text-[#062c19] font-semibold shadow-2xs"
                              : "text-white/70 hover:text-white hover:bg-[var(--theme-sidebar-hover)]"
                          }`}
                        >
                          {sub.text}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </li>
          </ul>
        </div>

        {/* Polished Admin Profile Section (Bottom) */}
        <div className="p-4 border-t border-white/[0.07] bg-black/20">
          <div className="flex items-center gap-3 px-3 py-2 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] transition-colors">
            {/* User Avatar with status dot */}
            <div className="relative shrink-0">
              <div className="w-9 h-9 rounded-full bg-white/10 border border-white/10 overflow-hidden flex items-center justify-center">
                {user?.profile_picture_url ? (
                  <img
                    src={user.profile_picture_url}
                    alt={username}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-xs font-bold text-[var(--theme-accent)] uppercase">
                    {username.substring(0, 2).toUpperCase()}
                  </span>
                )}
              </div>
              {/* Online status indicator */}
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-[var(--theme-accent)] ring-2 ring-black/40"></span>
            </div>

            {/* Profile Typography */}
            <div className="overflow-hidden min-w-0 flex-1 leading-snug">
              <p className="text-xs font-semibold text-white tracking-tight truncate">
                {username}
              </p>
              <span className="text-[10px] font-medium tracking-widest text-[var(--theme-accent)] uppercase block mt-0.5 truncate">
                {roleDisplay}
              </span>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};

export default AppSidebar;
