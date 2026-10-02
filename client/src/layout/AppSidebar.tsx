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
  FiBookOpen,
  FiChevronDown,
  FiChevronRight,
  FiPieChart,
  FiCreditCard,
  FiFileText,
  FiX
} from "react-icons/fi";

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

  const menuGroups = [
    {
      label: "FINANCE & SALES",
      items: [
        { path: "/sales", text: "Sales Recording", icon: <FiFileText className="w-5 h-5" strokeWidth={1.5} /> },
        { path: "/tasks", text: "Task Monitoring", icon: <FiCheckSquare className="w-5 h-5" strokeWidth={1.5} /> },
        { path: "/reports", text: "Reports", icon: <FiBarChart2 className="w-5 h-5" strokeWidth={1.5} /> },
      ]
    },
    {
      label: "OPERATIONS",
      items: [
        { path: "/members", text: "Members", icon: <FiUsers className="w-5 h-5" strokeWidth={1.5} /> },
        { path: "/share-capital", text: "Share Capital", icon: <FiPieChart className="w-5 h-5" strokeWidth={1.5} /> },
        { path: "/loans", text: "Loans", icon: <FiCreditCard className="w-5 h-5" strokeWidth={1.5} /> },
        { path: "/productions", text: "Productions", icon: <FiPackage className="w-5 h-5" strokeWidth={1.5} /> },
      ]
    },
    {
      label: "SYSTEM & SUPPORT",
      items: [
        { path: "/settings", text: "Settings", icon: <FiSettings className="w-5 h-5" strokeWidth={1.5} /> },
      ]
    }
  ];

  const booksSubmenu = [
    { path: "/books-of-accounts/cash-receipts", text: "Cash Receipts Journal" },
    { path: "/books-of-accounts/cash-disbursements", text: "Cash Disbursement Journal" },
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
        className={`${
          isOpen ? "-translate-x-full" : "translate-x-0"
        } sm:translate-x-0 fixed top-0 left-0 z-40 w-72 h-full bg-[#051c14] text-white transition-all duration-300 shadow-2xl flex flex-col`}
        aria-label="Sidebar"
      >
        {/* Brand & Logo Area */}
        <div className="flex items-center justify-between px-6 py-6 border-b border-white/[0.1]">
          <Link to="/dashboard" className="flex items-center gap-3.5 group">
            <div className="bg-white rounded-xl p-1.5 flex items-center justify-center shrink-0">
              <img
                src={cooperativeLogo || "/niyog.png"}
                onError={(e) => {
                  (e.target as HTMLImageElement).src = "/favicon.svg";
                }}
                alt="Ivisan Coconut"
                className="w-8 h-8 object-contain transition-transform duration-200 group-hover:scale-105"
              />
            </div>
            <div className="overflow-hidden leading-tight">
              <span className="text-lg font-bold text-white tracking-tight block truncate">
                Ivisan Small...
              </span>
              <span className="text-[10px] font-bold text-[#00c875] tracking-widest uppercase block mt-0.5 truncate">
                IVISAN COCONUT
              </span>
            </div>
          </Link>

          <button
            onClick={toggleSidebar}
            className="sm:hidden p-1.5 rounded-lg text-[#00c875] hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Close sidebar"
          >
            <FiX className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Menu */}
        <div className="flex-1 px-5 py-6 overflow-y-auto space-y-6 scrollbar-none">
          {/* Dashboard (Standalone top) */}
          <Link
            to="/dashboard"
            className={`${
              isCurrentPath("/dashboard")
                ? "bg-[#176747] text-white font-semibold relative"
                : "text-white hover:bg-white/5 font-medium"
            } flex items-center gap-4 px-4 py-3.5 rounded-xl text-sm transition-all duration-150 group`}
          >
            {isCurrentPath("/dashboard") && (
              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-8 bg-[#2bd887] rounded-r-md" />
            )}
            <FiGrid className="w-5 h-5" strokeWidth={1.5} />
            <span className="tracking-wide text-[15px]">Dashboard</span>
          </Link>

          {/* Grouped Menus */}
          {menuGroups.map((group, index) => (
            <div key={index} className="space-y-3">
              <div className="flex items-center gap-4 px-1">
                <h3 className="text-[10px] font-bold tracking-widest text-white/70 uppercase">
                  {group.label}
                </h3>
                <div className="h-px bg-white/15 flex-1" />
              </div>
              
              <ul className="space-y-1">
                {group.items.map((item, itemIndex) => {
                  const active = isCurrentPath(item.path);
                  return (
                    <li key={itemIndex}>
                      <Link
                        to={item.path}
                        className={`${
                          active
                            ? "text-[#2bd887] font-semibold relative"
                            : "text-white/90 hover:text-white hover:bg-white/5 font-medium"
                        } flex items-center justify-between px-3 py-3 rounded-xl text-[15px] transition-all duration-150 group`}
                      >
                        <div className="flex items-center gap-4">
                          {active && (
                            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-[#2bd887] rounded-r-md" />
                          )}
                          <span className={`${active ? "text-[#2bd887]" : "text-[#2bd887]"}`}>
                            {item.icon}
                          </span>
                          <span className="tracking-wide">{item.text}</span>
                        </div>
                        <FiChevronRight className="w-4 h-4 text-white/40" strokeWidth={2} />
                      </Link>
                    </li>
                  );
                })}

                {/* Books of Accounts Appended to SYSTEM & SUPPORT */}
                {group.label === "SYSTEM & SUPPORT" && (
                  <li>
                    <button
                      onClick={() => setBooksOpen(!booksOpen)}
                      className={`${
                        isBooksRoute
                          ? "text-white font-semibold"
                          : "text-white/90 hover:text-white hover:bg-white/5 font-medium"
                      } w-full flex items-center justify-between px-3 py-3 rounded-xl text-[15px] transition-all duration-150 group cursor-pointer`}
                    >
                      <div className="flex items-center gap-4">
                        <span className="text-[#2bd887]">
                          <FiBookOpen className="w-5 h-5" strokeWidth={1.5} />
                        </span>
                        <span className="tracking-wide">Books of Accounts</span>
                      </div>
                      {booksOpen ? (
                        <FiChevronDown className="w-4 h-4 text-[#2bd887]" strokeWidth={2} />
                      ) : (
                        <FiChevronRight className="w-4 h-4 text-white/40" strokeWidth={2} />
                      )}
                    </button>

                    {/* Submenu */}
                    {booksOpen && (
                      <div className="relative mt-2 ml-[22px]">
                        {/* Vertical line connecting submenu items */}
                        <div className="absolute left-0 top-0 bottom-4 w-px bg-[#2bd887]" />
                        <ul className="pl-6 py-2 rounded-xl space-y-4">
                          {booksSubmenu.map((sub, sIdx) => {
                            const subActive = isCurrentPath(sub.path);
                            return (
                              <li key={sIdx} className="relative flex items-center">
                                {/* Bullet */}
                                <div className="absolute -left-[28px] w-2 h-2 rounded-full bg-[#2bd887]" />
                                <Link
                                  to={sub.path}
                                  className={`${
                                    subActive
                                      ? "text-white font-semibold"
                                      : "text-white/70 hover:text-white"
                                  } text-sm tracking-wide transition-colors duration-150 block w-full`}
                                >
                                  {sub.text}
                                </Link>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    )}
                  </li>
                )}
              </ul>
            </div>
          ))}
        </div>

        {/* User Profile Section */}
        <div className="px-6 pb-6 mt-auto">
          <div className="h-px bg-white/10 w-full mb-6" />
          <div className="flex items-center justify-between group cursor-pointer hover:bg-white/5 p-2 -m-2 rounded-xl transition-colors">
            <div className="flex items-center gap-4">
              <div className="relative shrink-0">
                <div className="w-11 h-11 rounded-full bg-[#009b55] flex items-center justify-center overflow-hidden">
                  {user?.profile_picture_url ? (
                    <img
                      src={user.profile_picture_url}
                      alt={username}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-base font-bold text-white uppercase tracking-wider">
                      {username.substring(0, 2)}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex flex-col text-left">
                <span className="text-base font-bold text-white tracking-tight">
                  {username}
                </span>
                <span className="text-[10px] font-bold tracking-widest text-[#00c875] uppercase mt-0.5">
                  {roleDisplay}
                </span>
              </div>
            </div>
            <FiChevronDown className="w-5 h-5 text-white/50" strokeWidth={1.5} />
          </div>
        </div>
      </aside>
    </>
  );
};

export default AppSidebar;
