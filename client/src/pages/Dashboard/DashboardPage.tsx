import { useState, useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";
import DashboardService from "../../services/DashboardService";
import {
  FiUsers,
  FiPackage,
  FiCheckSquare,
  FiActivity,
  FiTrendingUp,
  FiClock,
  FiArrowDownLeft,
  FiArrowUpRight,
  FiCreditCard,
  FiBookOpen,
  FiCalendar,
  FiChevronDown,
  FiAlertTriangle,
  FiRefreshCw
} from "react-icons/fi";
import { TbCurrencyPeso } from "react-icons/tb";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from "chart.js";
import { Bar, Line } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface DashboardData {
  cards: {
    total_members: number;
    total_production_kg: number;
    total_sales_amount: number;
    pending_tasks: number;
    total_cash_in?: number;
    total_cash_out?: number;
    current_cash_balance?: number;
    cash_on_hand?: number;
    cash_in_bank?: number;
    total_sales?: number;
  };
  quick_stats: {
    today_production_kg: number;
    today_sales_amount: number;
    latest_member: {
      name: string;
      code: string;
      date: string;
    } | null;
    low_stock_alerts: Array<{
      product: string;
      stock: number;
    }>;
  };
  recent_activities: Array<{
    id: number;
    username: string;
    action: string;
    time_ago: string;
    created_at: string;
  }>;
  recent_accounting_transactions?: Array<{
    type: string;
    reference: string;
    date: string;
    description: string;
    amount: number;
    created_at: string;
  }>;
  charts: {
    labels: string[];
    production: number[];
    sales: number[];
  };
}

const DashboardPage = () => {
  const { user } = useAuth();
  // Initialize data as null and loading as true to NEVER display stale/fake records before API finishes
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState("Jun 29, 2025 - Aug 29, 2025");
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await DashboardService.getDashboardData();
      if (res && res.data) {
        setData(res.data);
      }
    } catch (err: any) {
      console.error("Failed to load dashboard data: ", err);
      setError(err?.response?.data?.message || "Failed to fetch live dashboard analytics. Please verify server connection.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  // Floating label plugin for July Bar: dynamically checks July value
  const productionFloatingBadgePlugin = {
    id: "productionFloatingBadge",
    afterDatasetsDraw(chart: any) {
      const { ctx } = chart;
      const meta = chart.getDatasetMeta(0);
      const julyIndex = chart.data.labels?.findIndex(
        (label: string) => label.toLowerCase() === "july"
      ) ?? 4;
      
      const rawValue = chart.data.datasets?.[0]?.data?.[julyIndex];
      if (rawValue === undefined || rawValue === null || Number(rawValue) <= 0) {
        return; // Never draw floating label if July has 0 or is deleted
      }

      const bar = meta.data?.[julyIndex];
      if (!bar) return;

      const xPos = bar.x;
      const yPos = bar.y - 10;
      const text = `${Number(rawValue).toLocaleString()} kg`;

      ctx.save();
      ctx.font = "bold 11px Poppins, sans-serif";
      const textWidth = ctx.measureText(text).width;
      const boxWidth = textWidth + 18;
      const boxHeight = 24;
      const boxX = xPos - boxWidth / 2;
      const boxY = yPos - boxHeight;

      // Soft Shadow
      ctx.shadowColor = "rgba(6, 78, 59, 0.25)";
      ctx.shadowBlur = 8;
      ctx.shadowOffsetY = 3;

      // Pill Background
      ctx.fillStyle = "#064E3B"; // Dark emerald
      ctx.beginPath();
      ctx.roundRect(boxX, boxY, boxWidth, boxHeight, 8);
      ctx.fill();

      // Pointer Arrow
      ctx.beginPath();
      ctx.moveTo(xPos - 5, boxY + boxHeight);
      ctx.lineTo(xPos + 5, boxY + boxHeight);
      ctx.lineTo(xPos, boxY + boxHeight + 5);
      ctx.closePath();
      ctx.fill();

      // Text inside pill
      ctx.shadowColor = "transparent";
      ctx.fillStyle = "#A7F3D0"; // Mint green text
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(text, xPos, boxY + boxHeight / 2);
      ctx.restore();
    }
  };

  // Floating label plugin for July Sales Line Peak: dynamically checks July value
  const salesFloatingBadgePlugin = {
    id: "salesFloatingBadge",
    afterDatasetsDraw(chart: any) {
      const { ctx } = chart;
      const meta = chart.getDatasetMeta(0);
      const julyIndex = chart.data.labels?.findIndex(
        (label: string) => label.toLowerCase() === "july"
      ) ?? 4;

      const rawValue = chart.data.datasets?.[0]?.data?.[julyIndex];
      if (rawValue === undefined || rawValue === null || Number(rawValue) <= 0) {
        return; // Never draw floating label if July has 0 or is deleted
      }

      const point = meta.data?.[julyIndex];
      if (!point) return;

      const xPos = point.x;
      const yPos = point.y - 12;
      const text = `₱ ${Number(rawValue).toLocaleString()}`;

      ctx.save();
      ctx.font = "bold 11px Poppins, sans-serif";
      const textWidth = ctx.measureText(text).width;
      const boxWidth = textWidth + 18;
      const boxHeight = 24;
      const boxX = xPos - boxWidth / 2;
      const boxY = yPos - boxHeight;

      // Soft Shadow
      ctx.shadowColor = "rgba(6, 78, 59, 0.25)";
      ctx.shadowBlur = 8;
      ctx.shadowOffsetY = 3;

      // Pill Background
      ctx.fillStyle = "#064E3B";
      ctx.beginPath();
      ctx.roundRect(boxX, boxY, boxWidth, boxHeight, 8);
      ctx.fill();

      // Pointer Arrow
      ctx.beginPath();
      ctx.moveTo(xPos - 5, boxY + boxHeight);
      ctx.lineTo(xPos + 5, boxY + boxHeight);
      ctx.lineTo(xPos, boxY + boxHeight + 5);
      ctx.closePath();
      ctx.fill();

      // Text inside pill
      ctx.shadowColor = "transparent";
      ctx.fillStyle = "#A7F3D0";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(text, xPos, boxY + boxHeight / 2);
      ctx.restore();
    }
  };

  // Modern Skeleton Loader while loading initially
  if (loading && !data) {
    return (
      <div className="space-y-7 sm:space-y-8 pb-10">
        {/* Welcome Skeleton */}
        <div className="bg-white p-6 sm:p-7 rounded-[22px] border border-slate-200/80 shadow-xs flex justify-between items-center animate-pulse">
          <div className="space-y-2">
            <div className="h-6 w-64 bg-slate-200 rounded-lg"></div>
            <div className="h-4 w-96 bg-slate-100 rounded-lg"></div>
          </div>
          <div className="h-8 w-36 bg-slate-100 rounded-full"></div>
        </div>

        {/* 4 KPI Cards Skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white p-6 rounded-[22px] border border-slate-200/80 shadow-xs animate-pulse space-y-4">
              <div className="flex justify-between items-start">
                <div className="space-y-2">
                  <div className="h-3.5 w-24 bg-slate-200 rounded"></div>
                  <div className="h-8 w-20 bg-slate-300 rounded-lg"></div>
                </div>
                <div className="w-12 h-12 rounded-full bg-slate-100"></div>
              </div>
              <div className="h-3 w-32 bg-slate-100 rounded"></div>
            </div>
          ))}
        </div>

        {/* Books of Accounts Skeleton */}
        <div className="bg-white rounded-[22px] p-6 sm:p-7 border border-slate-200/80 shadow-xs animate-pulse space-y-5">
          <div className="flex justify-between items-center pb-3 border-b border-slate-100">
            <div className="h-5 w-72 bg-slate-200 rounded"></div>
            <div className="h-8 w-48 bg-slate-100 rounded-full"></div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-28 bg-slate-100 rounded-[18px]"></div>
            ))}
          </div>
        </div>

        {/* Charts Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-7">
          <div className="bg-white p-6 sm:p-7 rounded-[22px] border border-slate-200/80 shadow-xs animate-pulse h-80"></div>
          <div className="bg-white p-6 sm:p-7 rounded-[22px] border border-slate-200/80 shadow-xs animate-pulse h-80"></div>
        </div>
      </div>
    );
  }

  // Error State if API request fails
  if (error || !data) {
    return (
      <div className="p-8 bg-white border border-rose-200 rounded-[22px] shadow-sm flex flex-col items-center justify-center text-center space-y-4 max-w-xl mx-auto my-12">
        <div className="w-14 h-14 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center">
          <FiAlertTriangle className="w-7 h-7" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-slate-800">Unable to Load Dashboard</h3>
          <p className="text-sm text-slate-500 mt-1 max-w-md">
            {error || "Could not retrieve system summary metrics from the server."}
          </p>
        </div>
        <button
          onClick={fetchDashboard}
          className="inline-flex items-center gap-2 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold py-2.5 px-5 rounded-xl shadow-md transition cursor-pointer text-sm"
        >
          <FiRefreshCw className="w-4 h-4" />
          <span>Retry Loading</span>
        </button>
      </div>
    );
  }

  // Production Chart Configuration from Live Database
  const productionChartData = {
    labels: data.charts.labels,
    datasets: [
      {
        label: "Production (kg)",
        data: data.charts.production,
        backgroundColor: "rgba(16, 185, 129, 0.85)",
        hoverBackgroundColor: "rgba(5, 150, 105, 1)",
        borderRadius: 8,
        borderSkipped: false,
        barThickness: 38
      }
    ]
  };

  // Sales Chart Configuration from Live Database
  const salesChartData = {
    labels: data.charts.labels,
    datasets: [
      {
        fill: true,
        label: "Sales Amount (₱)",
        data: data.charts.sales,
        borderColor: "rgba(16, 185, 129, 1)",
        borderWidth: 2.75,
        backgroundColor: (context: any) => {
          const ctx = context.chart.ctx;
          const gradient = ctx.createLinearGradient(0, 0, 0, 260);
          gradient.addColorStop(0, "rgba(16, 185, 129, 0.25)");
          gradient.addColorStop(1, "rgba(16, 185, 129, 0.01)");
          return gradient;
        },
        tension: 0.38,
        pointBackgroundColor: "rgba(255, 255, 255, 1)",
        pointBorderColor: "rgba(16, 185, 129, 1)",
        pointBorderWidth: 2.5,
        pointRadius: (ctx: any) => (ctx.dataIndex === 4 ? 6 : 4),
        pointHoverRadius: 7
      }
    ]
  };

  return (
    <div className="space-y-7 sm:space-y-8 pb-10">
      {/* Welcome & Overview Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-6 sm:p-7 rounded-[22px] border border-slate-200/80 shadow-[0_2px_15px_-3px_rgba(0,0,0,0.03)] gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              CASCOFAMCO Operations Dashboard
            </h1>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Welcome back, <span className="font-semibold text-emerald-800">{user?.username || "admin"}</span>. Here is your coconut cooperative overview.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs bg-slate-50/90 border border-slate-200/80 px-4 py-2 rounded-full font-medium text-slate-600 shadow-2xs">
          <FiClock className="w-3.5 h-3.5 text-emerald-600" />
          <span>Last sync: {new Date().toLocaleTimeString()}</span>
        </div>
      </div>

      {/* Low Stock Alerts Banner (if any) */}
      {(() => {
        const monitoredAlertProducts = ["copra", "whole coconut"];
        const filteredAlerts = (data.quick_stats.low_stock_alerts || []).filter(
          (alert) => monitoredAlertProducts.includes(alert.product.trim().toLowerCase())
        );

        if (filteredAlerts.length === 0) return null;

        return (
          <div className="bg-amber-50/80 border-l-4 border-amber-500 p-4 rounded-r-2xl flex items-start gap-3 shadow-2xs">
            <FiAlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
            <div>
              <h3 className="font-bold text-amber-900 text-sm">Low Stock Alert!</h3>
              <div className="text-xs text-amber-800 mt-1 flex flex-wrap gap-x-6 gap-y-1">
                {filteredAlerts.map((alert, i) => (
                  <span key={i} className="inline-flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block"></span>
                    <strong>{alert.product}</strong>: {alert.stock.toLocaleString()} kg remaining
                  </span>
                ))}
              </div>
            </div>
          </div>
        );
      })()}

      {/* 1. Main Dashboard: Four Large KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-6">
        {/* TOTAL MEMBERS */}
        <div className="bg-white p-6 rounded-[22px] border border-slate-200/80 shadow-[0_2px_15px_-3px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_25px_-5px_rgba(0,0,0,0.06)] transition-all duration-200 flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Members</p>
              <h3 className="text-3xl font-extrabold text-slate-900 mt-2 tracking-tight">
                {data.cards.total_members}
              </h3>
            </div>
            <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 ring-4 ring-emerald-50/60 flex items-center justify-center shrink-0">
              <FiUsers className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-1.5 text-xs text-emerald-600 font-medium">
            <FiTrendingUp className="w-3.5 h-3.5" />
            <span>Active cooperative members</span>
          </div>
        </div>

        {/* TOTAL PRODUCTION */}
        <div className="bg-white p-6 rounded-[22px] border border-slate-200/80 shadow-[0_2px_15px_-3px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_25px_-5px_rgba(0,0,0,0.06)] transition-all duration-200 flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Production</p>
              <h3 className="text-3xl font-extrabold text-slate-900 mt-2 tracking-tight">
                {data.cards.total_production_kg.toLocaleString()}{" "}
                <span className="text-sm font-normal text-slate-400">kg</span>
              </h3>
            </div>
            <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 ring-4 ring-emerald-50/60 flex items-center justify-center shrink-0">
              <FiPackage className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-1.5 text-xs text-emerald-600 font-medium">
            <FiTrendingUp className="w-3.5 h-3.5" />
            <span>Verified harvest volume</span>
          </div>
        </div>

        {/* TOTAL WHOLESALE SALES */}
        <div className="bg-white p-6 rounded-[22px] border border-slate-200/80 shadow-[0_2px_15px_-3px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_25px_-5px_rgba(0,0,0,0.06)] transition-all duration-200 flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Wholesale Sales</p>
              <h3 className="text-3xl font-extrabold text-slate-900 mt-2 tracking-tight">
                ₱ {data.cards.total_sales_amount.toLocaleString()}
              </h3>
            </div>
            <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 ring-4 ring-emerald-50/60 flex items-center justify-center shrink-0">
              <TbCurrencyPeso className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-1.5 text-xs text-emerald-600 font-medium">
            <FiTrendingUp className="w-3.5 h-3.5" />
            <span>Commercial copra sales</span>
          </div>
        </div>

        {/* ACTIVE OPERATIONS TASKS */}
        <div className="bg-white p-6 rounded-[22px] border border-slate-200/80 shadow-[0_2px_15px_-3px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_25px_-5px_rgba(0,0,0,0.06)] transition-all duration-200 flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Active Operations Tasks</p>
              <h3 className="text-3xl font-extrabold text-slate-900 mt-2 tracking-tight">
                {data.cards.pending_tasks}
              </h3>
            </div>
            <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 ring-4 ring-emerald-50/60 flex items-center justify-center shrink-0">
              <FiCheckSquare className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-1.5 text-xs text-slate-400 font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block"></span>
            <span>{data.cards.pending_tasks === 0 ? "All operations up to date" : `${data.cards.pending_tasks} pending action`}</span>
          </div>
        </div>
      </div>

      {/* 2. Books of Accounts Section: Large White Rounded Container */}
      <div className="bg-white rounded-[22px] p-6 sm:p-7 border border-slate-200/80 shadow-[0_2px_15px_-3px_rgba(0,0,0,0.03)] space-y-5">
        {/* Title & Date Range Selector Header */}
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3.5 pb-2 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold text-sm">
              <FiBookOpen className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                Financial Overview
              </h2>
              <p className="text-xs text-slate-400">
                Summary of cash receipts, disbursements, and accounting balances
              </p>
            </div>
          </div>

          {/* Date-range selector on the upper-right */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsDatePickerOpen(!isDatePickerOpen)}
              className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full text-xs font-semibold bg-slate-50 hover:bg-slate-100/80 border border-slate-200 text-slate-700 transition-colors shadow-2xs cursor-pointer"
            >
              <FiCalendar className="w-3.5 h-3.5 text-emerald-600" />
              <span>{dateRange}</span>
              <FiChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {/* Dropdown Options */}
            {isDatePickerOpen && (
              <div className="absolute right-0 mt-2 w-64 bg-white border border-slate-200 rounded-2xl shadow-xl z-20 py-2 text-xs divide-y divide-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setDateRange("Jun 29, 2025 - Aug 29, 2025");
                    setIsDatePickerOpen(false);
                  }}
                  className="w-full text-left px-4 py-2.5 font-semibold text-emerald-700 hover:bg-emerald-50 flex items-center justify-between"
                >
                  <span>Jun 29, 2025 - Aug 29, 2025</span>
                  <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded">Active</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDateRange("Jul 01, 2025 - Jul 31, 2025");
                    setIsDatePickerOpen(false);
                  }}
                  className="w-full text-left px-4 py-2.5 text-slate-600 hover:bg-slate-50"
                >
                  July 2025 (Peak Harvest Period)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDateRange("Jan 01, 2025 - Dec 31, 2025");
                    setIsDatePickerOpen(false);
                  }}
                  className="w-full text-left px-4 py-2.5 text-slate-600 hover:bg-slate-50"
                >
                  Full Fiscal Year 2025
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Four Horizontally Arranged Financial Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* TOTAL CASH IN */}
          <div className="bg-emerald-50/60 p-5 rounded-[18px] border border-emerald-100 shadow-2xs flex flex-col justify-between hover:border-emerald-200 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider">Total Cash In</span>
              <div className="w-8 h-8 rounded-lg bg-emerald-500 text-white flex items-center justify-center shadow-xs">
                <FiArrowDownLeft className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <h4 className="text-2xl font-extrabold text-emerald-700 tracking-tight">
                ₱ {(data.cards.total_cash_in || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </h4>
              <p className="text-[11px] text-emerald-600/80 font-medium mt-1">Cash Receipts</p>
            </div>
          </div>

          {/* TOTAL CASH OUT */}
          <div className="bg-rose-50/60 p-5 rounded-[18px] border border-rose-100 shadow-2xs flex flex-col justify-between hover:border-rose-200 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-rose-800 uppercase tracking-wider">Total Cash Out</span>
              <div className="w-8 h-8 rounded-lg bg-rose-500 text-white flex items-center justify-center shadow-xs">
                <FiArrowUpRight className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <h4 className="text-2xl font-extrabold text-rose-700 tracking-tight">
                ₱ {(data.cards.total_cash_out || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </h4>
              <p className="text-[11px] text-rose-600/80 font-medium mt-1">Cash Disbursements</p>
            </div>
          </div>

          {/* CURRENT CASH BALANCE */}
          <div className="bg-[#0B2917] text-white p-5 rounded-[18px] border border-emerald-950 shadow-md flex flex-col justify-between relative overflow-hidden">
            <div className="flex items-center justify-between relative z-10">
              <span className="text-xs font-bold text-emerald-300 uppercase tracking-wider">Current Cash Balance</span>
              <div className="w-8 h-8 rounded-lg bg-emerald-800/80 text-[#86EFAC] flex items-center justify-center shadow-xs border border-emerald-700/50">
                <FiCreditCard className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3 relative z-10">
              <h4 className="text-2xl font-extrabold text-white tracking-tight">
                ₱ {(data.cards.current_cash_balance || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </h4>
              <div className="flex items-center gap-3 text-[10px] text-emerald-300 font-semibold mt-1">
                <span>Hand: ₱{(data.cards.cash_on_hand || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                <span>•</span>
                <span>Bank: ₱{(data.cards.cash_in_bank || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
            {/* Subtle background glow */}
            <div className="absolute -right-6 -bottom-6 w-24 h-24 rounded-full bg-emerald-500/10 blur-xl pointer-events-none"></div>
          </div>

          {/* TOTAL SALES */}
          <div className="bg-sky-50/60 p-5 rounded-[18px] border border-sky-100 shadow-2xs flex flex-col justify-between hover:border-sky-200 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-sky-800 uppercase tracking-wider">Total Sales</span>
              <div className="w-8 h-8 rounded-lg bg-sky-600 text-white flex items-center justify-center shadow-xs">
                <TbCurrencyPeso className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <h4 className="text-2xl font-extrabold text-sky-700 tracking-tight">
                ₱ {(data.cards.total_sales || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </h4>
              <p className="text-[11px] text-sky-600/80 font-medium mt-1">Sales Recording Module</p>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Charts Section: Two Large White Rounded Chart Cards Side-by-Side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-7">
        {/* Left Chart: Monthly Coconut Production Summary */}
        <div className="bg-white p-6 sm:p-7 rounded-[22px] border border-slate-200/80 shadow-[0_2px_15px_-3px_rgba(0,0,0,0.03)] flex flex-col justify-between">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="font-bold text-slate-900 text-base sm:text-lg tracking-tight">
                Monthly Coconut Production Summary
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">Kilograms harvested and delivered</p>
            </div>
            <span className="text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200/60 px-3 py-1 rounded-full">
              Past 6 Months
            </span>
          </div>

          <div className="h-72 w-full pt-4">
            <Bar
              data={productionChartData}
              plugins={[productionFloatingBadgePlugin]}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: { display: false },
                  tooltip: {
                    backgroundColor: "#0B2917",
                    titleFont: { family: "Poppins", size: 12 },
                    bodyFont: { family: "Poppins", size: 12 },
                    padding: 10,
                    cornerRadius: 8,
                    callbacks: {
                      label: (context) => ` ${(context.parsed.y ?? 0).toLocaleString()} kg`
                    }
                  }
                },
                scales: {
                  y: {
                    max: Math.max(2000, ...(data.charts.production || [0])),
                    grid: { color: "#F1F5F9" },
                    ticks: {
                      stepSize: 400,
                      font: { family: "Poppins", size: 11 },
                      color: "#94A3B8",
                      callback: (value) => `${value} kg`
                    }
                  },
                  x: {
                    grid: { display: false },
                    ticks: {
                      font: { family: "Poppins", size: 11, weight: 500 },
                      color: "#64748B"
                    }
                  }
                }
              }}
            />
          </div>
        </div>

        {/* Right Chart: Monthly Wholesale Copra Sales Performance */}
        <div className="bg-white p-6 sm:p-7 rounded-[22px] border border-slate-200/80 shadow-[0_2px_15px_-3px_rgba(0,0,0,0.03)] flex flex-col justify-between">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="font-bold text-slate-900 text-base sm:text-lg tracking-tight">
                Monthly Wholesale Copra Sales Performance
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">Total wholesale revenue realization</p>
            </div>
            <span className="text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200/60 px-3 py-1 rounded-full">
              Revenue (PHP)
            </span>
          </div>

          <div className="h-72 w-full pt-4">
            <Line
              data={salesChartData}
              plugins={[salesFloatingBadgePlugin]}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: { display: false },
                  tooltip: {
                    backgroundColor: "#0B2917",
                    titleFont: { family: "Poppins", size: 12 },
                    bodyFont: { family: "Poppins", size: 12 },
                    padding: 10,
                    cornerRadius: 8,
                    callbacks: {
                      label: (context) => ` ₱ ${(context.parsed.y ?? 0).toLocaleString()}`
                    }
                  }
                },
                scales: {
                  y: {
                    max: Math.max(12000, ...(data.charts.sales || [0])),
                    grid: { color: "#F1F5F9" },
                    ticks: {
                      stepSize: 2500,
                      font: { family: "Poppins", size: 11 },
                      color: "#94A3B8",
                      callback: (value) => `₱ ${value.toLocaleString()}`
                    }
                  },
                  x: {
                    grid: { display: false },
                    ticks: {
                      font: { family: "Poppins", size: 11, weight: 500 },
                      color: "#64748B"
                    }
                  }
                }
              }}
            />
          </div>
        </div>
      </div>

      {/* 4. Quick Statistics & Recent Accounting Transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-7">
        {/* Quick Statistics Column */}
        <div className="bg-white p-6 sm:p-7 rounded-[22px] border border-slate-200/80 shadow-[0_2px_15px_-3px_rgba(0,0,0,0.03)] space-y-5">
          <h3 className="font-bold text-slate-900 flex items-center gap-2.5 text-base">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <FiTrendingUp className="w-4 h-4" />
            </div>
            <span>Today's Quick Stats</span>
          </h3>

          <div className="divide-y divide-slate-100 space-y-4">
            <div className="pt-1">
              <span className="text-xs font-semibold text-slate-400 block uppercase tracking-wider">
                Today's Production Input
              </span>
              <span className="text-xl font-bold text-slate-900 mt-1 inline-block">
                {data.quick_stats.today_production_kg.toLocaleString()} kg
              </span>
            </div>

            <div className="pt-4">
              <span className="text-xs font-semibold text-slate-400 block uppercase tracking-wider">
                Today's Sales Revenue
              </span>
              <span className="text-xl font-bold text-slate-900 mt-1 inline-block">
                ₱ {data.quick_stats.today_sales_amount.toLocaleString()}
              </span>
            </div>

            <div className="pt-4">
              <span className="text-xs font-semibold text-slate-400 block uppercase tracking-wider">
                Latest Registered Member
              </span>
              {data.quick_stats.latest_member ? (
                <div className="mt-1.5 p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="font-bold text-emerald-800 text-sm block">
                    {data.quick_stats.latest_member.name}
                  </span>
                  <span className="text-[11px] text-slate-400 block mt-0.5">
                    ID: {data.quick_stats.latest_member.code} · Date: {data.quick_stats.latest_member.date}
                  </span>
                </div>
              ) : (
                <span className="text-xs text-slate-400 block mt-1">No member registered recently.</span>
              )}
            </div>
          </div>
        </div>

        {/* Recent Accounting Transactions Table Widget */}
        <div className="bg-white p-6 sm:p-7 rounded-[22px] border border-slate-200/80 shadow-[0_2px_15px_-3px_rgba(0,0,0,0.03)] lg:col-span-2 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-900 flex items-center gap-2.5 text-base">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
                <FiBookOpen className="w-4 h-4" />
              </div>
              <span>Recent Accounting Transactions</span>
            </h3>
            <span className="text-[11px] font-medium text-slate-400">Live Entries</span>
          </div>

          <div className="flex-1 overflow-x-auto">
            {data.recent_accounting_transactions && data.recent_accounting_transactions.length > 0 ? (
              <table className="min-w-full divide-y divide-slate-100 text-xs">
                <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider">
                  <tr>
                    <th className="px-3.5 py-2.5 text-left rounded-l-lg">Type</th>
                    <th className="px-3.5 py-2.5 text-left">Ref</th>
                    <th className="px-3.5 py-2.5 text-left">Date</th>
                    <th className="px-3.5 py-2.5 text-left">Description</th>
                    <th className="px-3.5 py-2.5 text-right rounded-r-lg">Amount (₱)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {data.recent_accounting_transactions.map((tx, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-3.5 py-3 font-medium text-slate-500">{tx.type}</td>
                      <td className="px-3.5 py-3 font-bold text-emerald-700">{tx.reference}</td>
                      <td className="px-3.5 py-3 whitespace-nowrap text-slate-500">{tx.date}</td>
                      <td className="px-3.5 py-3 truncate max-w-xs">{tx.description}</td>
                      <td
                        className={`px-3.5 py-3 text-right font-bold ${
                          tx.amount >= 0 ? "text-emerald-600" : "text-rose-600"
                        }`}
                      >
                        {tx.amount < 0 ? "-" : ""}₱{" "}
                        {Math.abs(tx.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="text-slate-400 text-xs text-center py-10">No accounting transactions recorded yet.</p>
            )}
          </div>
        </div>
      </div>

      {/* 5. System Activity Logs */}
      <div className="bg-white p-6 sm:p-7 rounded-[22px] border border-slate-200/80 shadow-[0_2px_15px_-3px_rgba(0,0,0,0.03)] flex flex-col">
        <h3 className="font-bold text-slate-900 flex items-center gap-2.5 mb-4 text-base">
          <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
            <FiActivity className="w-4 h-4" />
          </div>
          <span>System Audit & Activity Logs</span>
        </h3>

        <div className="overflow-y-auto max-h-56 space-y-3 pr-2">
          {data.recent_activities.length > 0 ? (
            data.recent_activities.map((activity) => (
              <div
                key={activity.id}
                className="flex gap-3 text-sm items-start bg-slate-50/70 p-3 rounded-xl border border-slate-100 hover:bg-slate-100/60 transition-colors"
              >
                <div className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs uppercase shrink-0">
                  {activity.username.substring(0, 2)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-slate-700 leading-snug">
                    <span className="font-semibold text-slate-900">{activity.username}</span> {activity.action}
                  </p>
                  <span className="text-[11px] text-slate-400 block mt-1">
                    {activity.time_ago} ({activity.created_at})
                  </span>
                </div>
              </div>
            ))
          ) : (
            <p className="text-slate-400 text-sm text-center py-10">No recent logs recorded.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
