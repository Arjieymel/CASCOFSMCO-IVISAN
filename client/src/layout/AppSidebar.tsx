import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useSidebar } from "../contexts/SidebarContext";
import { useAuth } from "../contexts/AuthContext";
import { useSettings } from "../contexts/SettingContext";
import {
  FiHome,
  FiUsers,
  FiPackage,
  FiDollarSign,
  FiCheckSquare,
  FiBarChart2,
  FiSettings,
  FiUser,
  FiBookOpen,
  FiChevronDown,
  FiChevronRight,
  FiX
} from "react-icons/fi";

const AppSidebar = () => {
  const { isOpen, toggleSidebar } = useSidebar();
  const { user } = useAuth();
  const { cooperativeName, cooperativeLogo } = useSettings();
  const location = useLocation();

  const isBooksRoute = location.pathname.startsWith('/books-of-accounts');
  const [booksOpen, setBooksOpen] = useState(isBooksRoute);

  const isCurrentPath = (path: string) => {
    return location.pathname === path;
  };

  const menuItems = [
    { path: "/dashboard", text: "Dashboard", icon: <FiHome className="w-5 h-5" />, roles: ['Administrator', 'Staff'] },
    { path: "/members", text: "Members", icon: <FiUsers className="w-5 h-5" />, roles: ['Administrator', 'Staff'] },
    { path: "/productions", text: "Productions", icon: <FiPackage className="w-5 h-5" />, roles: ['Administrator', 'Staff'] },
    { path: "/sales", text: "Sales Recording", icon: <FiDollarSign className="w-5 h-5" />, roles: ['Administrator', 'Staff'] },
    { path: "/tasks", text: "Task Monitoring", icon: <FiCheckSquare className="w-5 h-5" />, roles: ['Administrator', 'Staff'] },
    { path: "/reports", text: "Reports", icon: <FiBarChart2 className="w-5 h-5" />, roles: ['Administrator', 'Staff'] },
    { path: "/users", text: "Users", icon: <FiUser className="w-5 h-5" />, roles: ['Administrator'] },
    { path: "/settings", text: "Settings", icon: <FiSettings className="w-5 h-5" />, roles: ['Administrator', 'Staff'] },
  ];

  const booksSubmenu = [
    { path: "/books-of-accounts/cash-register", text: "Cash Register Book" },
    { path: "/books-of-accounts/cash-disbursements", text: "Cash Disbursement Journal" },
    { path: "/books-of-accounts/sales-book", text: "Cash Register Sales Book" },
    { path: "/books-of-accounts/cash-receipts", text: "Cash Receipts Journal" },
    { path: "/books-of-accounts/journal-vouchers", text: "Journal Voucher Register" },
    { path: "/books-of-accounts/general-ledger", text: "General Ledger" },
  ];

  const allowedMenuItems = menuItems.filter(item => !item.roles || (user && item.roles.includes(user.role)));
  const isAdmin = user && user.role === 'Administrator';

  return (
    <>
      {/* Mobile Sidebar Overlay */}
      {!isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 blur-xs sm:hidden"
          onClick={toggleSidebar}
        />
      )}

      <aside
        id="top-bar-sidebar"
        className={`fixed top-0 left-0 z-40 w-64 h-full bg-dark-green text-white transition-transform duration-300 ${isOpen ? "-translate-x-full" : "translate-x-0"
          } sm:translate-x-0 border-r border-dark-green/30 shadow-xl flex flex-col`}
        aria-label="Sidebar"
      >
        {/* Brand Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-sidebar-hover/40 bg-dark-green">
          <Link to="/dashboard" className="flex items-center gap-3">
            {cooperativeLogo ? (
              <img
                src={cooperativeLogo}
                alt="Logo"
                className="w-9 h-9 rounded-lg object-contain border border-white/10 p-1 bg-white/5 shadow-inner"
              />
            ) : (
              <div className="w-9 h-9 rounded-lg bg-accent text-dark-green font-bold flex items-center justify-center text-lg shadow-inner">
                {cooperativeName ? cooperativeName.charAt(0) : "C"}
              </div>
            )}
            <div className="overflow-hidden">
              <span className="text-base font-bold tracking-wider block leading-tight truncate max-w-30">
                {cooperativeName || "CASCOFAMCO"}
              </span>
              <span className="text-[10px] text-accent font-medium uppercase tracking-widest block truncate max-w-30">
                Ivisan Coconut
              </span>
            </div>
          </Link>
          <button
            onClick={toggleSidebar}
            className="sm:hidden p-1.5 rounded-lg hover:bg-sidebar-hover text-gray-300"
          >
            <FiX className="w-5 h-5" />
          </button>
        </div>

        {/* Menu Navigation */}
        <div className="flex-1 px-4 py-6 overflow-y-auto space-y-2">
          <ul className="space-y-1.5">
            {allowedMenuItems.map((item, index) => {
              const active = isCurrentPath(item.path);
              return (
                <li key={index}>
                  <Link
                    to={item.path}
                    className={`flex items-center gap-3.5 px-4 py-3 rounded-xl transition-all duration-200 group ${active
                      ? "bg-accent text-dark-green font-semibold shadow-md translate-x-1"
                      : "text-gray-300 hover:bg-sidebar-hover hover:text-white"
                      }`}
                  >
                    <span className={`transition-transform duration-200 group-hover:scale-110 ${active ? 'text-dark-green' : 'text-gray-400 group-hover:text-white'}`}>
                      {item.icon}
                    </span>
                    <span className="text-sm tracking-wide">{item.text}</span>
                  </Link>
                </li>
              );
            })}

            {/* 📚 Books of Accounts (Administrator and Staff) */}
            {user && (user.role === 'Administrator' || user.role === 'Staff') && (
              <li className="pt-1">
                <button
                  onClick={() => setBooksOpen(!booksOpen)}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-200 group ${isBooksRoute
                      ? "bg-sidebar-hover text-accent font-semibold"
                      : "text-gray-300 hover:bg-sidebar-hover hover:text-white"
                    }`}
                >
                  <div className="flex items-center gap-3.5">
                    <FiBookOpen className={`w-5 h-5 ${isBooksRoute ? 'text-accent' : 'text-gray-400 group-hover:text-white'}`} />
                    <span className="text-sm tracking-wide">📚 Books of Accounts</span>
                  </div>
                  {booksOpen ? (
                    <FiChevronDown className="w-4 h-4 text-gray-400" />
                  ) : (
                    <FiChevronRight className="w-4 h-4 text-gray-400" />
                  )}
                </button>

                {/* Submenu */}
                {booksOpen && (
                  <ul className="mt-1.5 ml-4 pl-3 border-l border-sidebar-hover/60 space-y-1">
                    {booksSubmenu.map((sub, sIdx) => {
                      const subActive = isCurrentPath(sub.path);
                      return (
                        <li key={sIdx}>
                          <Link
                            to={sub.path}
                            className={`block px-3 py-2 rounded-lg text-xs tracking-wide transition-all ${subActive
                                ? "bg-accent text-dark-green font-bold shadow-xs"
                                : "text-gray-300 hover:text-white hover:bg-sidebar-hover/50"
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
            )}
          </ul>
        </div>

        {/* Logged in User Profile Info (Footer of Sidebar) */}
        {user && (
          <div className="p-4 border-t border-sidebar-hover/30 bg-dark-green/85 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-sidebar-hover border border-sidebar-hover/60 overflow-hidden flex items-center justify-center shrink-0">
              {user.profile_picture_url ? (
                <img
                  src={user.profile_picture_url}
                  alt="profile"
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-sm font-bold text-accent uppercase">
                  {user.username.substring(0, 2)}
                </span>
              )}
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-semibold text-white truncate">{user.username}</p>
              <span className="text-[10px] text-accent bg-sidebar-hover/80 px-2 py-0.5 rounded-full font-medium inline-block mt-0.5 uppercase tracking-wide">
                {user.role}
              </span>
            </div>
          </div>
        )}
      </aside>
    </>
  );
};

export default AppSidebar;
