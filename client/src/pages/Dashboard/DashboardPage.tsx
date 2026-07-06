import { useState, useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";
import DashboardService from "../../services/DashboardService";
import {
  FiUsers,
  FiPackage,
  FiDollarSign,
  FiCheckSquare,
  FiActivity,
  FiAlertTriangle,
  FiTrendingUp,
  FiClock
} from "react-icons/fi";
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
  charts: {
    labels: string[];
    production: number[];
    sales: number[];
  };
}

const DashboardPage = () => {
  const { user } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await DashboardService.getDashboardData();
      setData(res.data);
    } catch (err: any) {
      console.error("Failed to load dashboard data: ", err);
      setError("Failed to fetch dashboard data. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm font-semibold text-slate-500">Loading Dashboard Analytics...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6 bg-red-50 text-red-700 border-l-4 border-red-500 rounded-lg flex items-center gap-3">
        <FiAlertTriangle className="w-6 h-6 shrink-0" />
        <div>
          <p className="font-bold">Error Loading Dashboard</p>
          <p className="text-sm">{error || "Could not retrieve system summary counters."}</p>
          <button onClick={fetchDashboard} className="mt-2 text-xs bg-red-600 text-white font-bold py-1.5 px-3 rounded-lg hover:bg-red-700 transition">
            Retry Fetching
          </button>
        </div>
      </div>
    );
  }

  // Chart Configuration
  const productionChartData = {
    labels: data.charts.labels,
    datasets: [
      {
        label: "Production (kg)",
        data: data.charts.production,
        backgroundColor: "rgba(31, 107, 61, 0.7)",
        borderColor: "rgba(31, 107, 61, 1)",
        borderWidth: 1.5,
        borderRadius: 8,
      },
    ],
  };

  const salesChartData = {
    labels: data.charts.labels,
    datasets: [
      {
        fill: true,
        label: "Sales Amount (₱)",
        data: data.charts.sales,
        borderColor: "rgba(47, 133, 90, 1)",
        backgroundColor: "rgba(47, 133, 90, 0.1)",
        tension: 0.3,
        pointBackgroundColor: "rgba(47, 133, 90, 1)",
        pointHoverRadius: 7,
      },
    ],
  };

  return (
    <div className="space-y-6">
      {/* Welcome Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-6 rounded-2xl border border-slate-100 shadow-xs gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-800">CASCOFAMCO Operations Dashboard</h1>
          <p className="text-sm text-slate-500 mt-0.5">Welcome back, <span className="font-semibold text-primary">{user?.username}</span>. Here is today's cooperative overview.</p>
        </div>
        <div className="flex items-center gap-2 text-xs bg-slate-50 border border-slate-150 px-3 py-1.5 rounded-xl font-medium text-slate-600">
          <FiClock className="w-4 h-4 text-slate-400" />
          <span>Last updated: {new Date().toLocaleTimeString()}</span>
        </div>
      </div>

      {/* Low Stock Alerts Banner */}
      {data.quick_stats.low_stock_alerts.length > 0 && (
        <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-2xl flex items-start gap-3">
          <FiAlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
          <div>
            <h3 className="font-bold text-amber-800 text-sm">Low Stock Alert!</h3>
            <div className="text-xs text-amber-700 mt-1 flex flex-wrap gap-x-6 gap-y-1">
              {data.quick_stats.low_stock_alerts.map((alert, i) => (
                <span key={i} className="inline-flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block"></span>
                  <strong>{alert.product}</strong>: {alert.stock.toLocaleString()} kg remaining
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Total Members */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs flex items-center gap-5 hover:shadow-md transition-shadow">
          <div className="p-3.5 rounded-xl bg-green-50 text-primary">
            <FiUsers className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Members</p>
            <h3 className="text-2xl font-bold text-slate-800 mt-1">{data.cards.total_members}</h3>
          </div>
        </div>

        {/* Total Production */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs flex items-center gap-5 hover:shadow-md transition-shadow">
          <div className="p-3.5 rounded-xl bg-green-50 text-primary">
            <FiPackage className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Production</p>
            <h3 className="text-2xl font-bold text-slate-800 mt-1">{data.cards.total_production_kg.toLocaleString()} <span className="text-xs text-slate-400 font-normal">kg</span></h3>
          </div>
        </div>

        {/* Total Sales */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs flex items-center gap-5 hover:shadow-md transition-shadow">
          <div className="p-3.5 rounded-xl bg-green-50 text-primary">
            <FiDollarSign className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Wholesale Sales</p>
            <h3 className="text-2xl font-bold text-slate-800 mt-1">₱ {data.cards.total_sales_amount.toLocaleString()}</h3>
          </div>
        </div>

        {/* Pending Tasks */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs flex items-center gap-5 hover:shadow-md transition-shadow">
          <div className="p-3.5 rounded-xl bg-green-50 text-primary">
            <FiCheckSquare className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Active Operations Tasks</p>
            <h3 className="text-2xl font-bold text-slate-800 mt-1">{data.cards.pending_tasks}</h3>
          </div>
        </div>
      </div>

      {/* Analytics Graph Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Production */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-800">Monthly Coconut Production Summary</h3>
            <span className="text-[10px] uppercase font-bold text-primary bg-green-50 px-2 py-0.5 rounded-md">Past 6 months</span>
          </div>
          <div className="h-64 flex items-center justify-center">
            <Bar
              data={productionChartData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                  y: { grid: { color: "#F1F5F9" }, ticks: { font: { family: "Poppins", size: 10 } } },
                  x: { ticks: { font: { family: "Poppins", size: 10 } } }
                }
              }}
            />
          </div>
        </div>

        {/* Monthly Sales */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-800">Monthly Wholesale Copra Sales Performance</h3>
            <span className="text-[10px] uppercase font-bold text-primary bg-green-50 px-2 py-0.5 rounded-md">Revenue (PHP)</span>
          </div>
          <div className="h-64 flex items-center justify-center">
            <Line
              data={salesChartData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                  y: { grid: { color: "#F1F5F9" }, ticks: { font: { family: "Poppins", size: 10 } } },
                  x: { ticks: { font: { family: "Poppins", size: 10 } } }
                }
              }}
            />
          </div>
        </div>
      </div>

      {/* Quick Statistics & Recent Activities */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Statistics column */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs space-y-4">
          <h3 className="font-bold text-slate-800 flex items-center gap-2">
            <FiTrendingUp className="text-primary w-5 h-5" />
            <span>Today's Quick Stats</span>
          </h3>

          <div className="divide-y divide-slate-55 space-y-3.5">
            <div className="pt-2">
              <span className="text-xs font-semibold text-slate-400 block uppercase">Today's Production Input</span>
              <span className="text-lg font-bold text-slate-800 mt-1 inline-block">{data.quick_stats.today_production_kg.toLocaleString()} kg</span>
            </div>

            <div className="pt-3">
              <span className="text-xs font-semibold text-slate-400 block uppercase">Today's Sales Revenue</span>
              <span className="text-lg font-bold text-slate-800 mt-1 inline-block">₱ {data.quick_stats.today_sales_amount.toLocaleString()}</span>
            </div>

            <div className="pt-3">
              <span className="text-xs font-semibold text-slate-400 block uppercase">Latest Registered Member</span>
              {data.quick_stats.latest_member ? (
                <div className="mt-1">
                  <span className="font-bold text-primary text-sm block">{data.quick_stats.latest_member.name}</span>
                  <span className="text-[10px] text-slate-400 block">ID: {data.quick_stats.latest_member.code} | Date: {data.quick_stats.latest_member.date}</span>
                </div>
              ) : (
                <span className="text-xs text-slate-400 block mt-1">No member registered recently.</span>
              )}
            </div>
          </div>
        </div>

        {/* Recent Activities column */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs lg:col-span-2 flex flex-col">
          <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-4">
            <FiActivity className="text-primary w-5 h-5" />
            <span>System Activity Logs</span>
          </h3>

          <div className="flex-1 overflow-y-auto max-h-[280px] space-y-3.5 pr-2">
            {data.recent_activities.length > 0 ? (
              data.recent_activities.map((activity) => (
                <div key={activity.id} className="flex gap-3 text-sm items-start bg-slate-50/50 p-2.5 rounded-xl border border-slate-100">
                  <div className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs uppercase flex-shrink-0">
                    {activity.username.substring(0, 2)}
                  </div>
                  <div className="flex-1">
                    <p className="text-slate-700 leading-tight">
                      <span className="font-semibold text-slate-800">{activity.username}</span> {activity.action}
                    </p>
                    <span className="text-[10px] text-slate-400 block mt-1">{activity.time_ago} ({activity.created_at})</span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-slate-400 text-sm text-center py-10">No recent logs recorded.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
