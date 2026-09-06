import { useState } from "react";
import ReportService from "../../services/ReportService";
import {
  FiBarChart2, FiDownload, FiPrinter, FiUsers, FiPackage,
  FiDollarSign, FiArchive, FiCheckCircle,
} from "react-icons/fi";
import Swal from "sweetalert2";

const reportTypes = [
  { id: "Production", label: "Production", icon: <FiPackage className="w-5 h-5" /> },
  { id: "Sales", label: "Sales", icon: <FiDollarSign className="w-5 h-5" /> },
  { id: "Member", label: "Members", icon: <FiUsers className="w-5 h-5" /> },
  { id: "Financial", label: "Financial", icon: <FiBarChart2 className="w-5 h-5" /> },
  { id: "Task", label: "Tasks", icon: <FiCheckCircle className="w-5 h-5" /> },
  { id: "Inventory", label: "Inventory", icon: <FiArchive className="w-5 h-5" /> },
];

const ReportsPage = () => {
  const [selectedType, setSelectedType] = useState("Production");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState<any>(null);

  const handleGenerate = async () => {
    try {
      setLoading(true);
      setReportData(null);
      const res = await ReportService.generateReport(selectedType, startDate, endDate);
      setReportData(res.data);
    } catch (err: any) {
      console.error("Report generation failed:", err);
      Swal.fire("Error", err.response?.data?.message || "Failed to generate report.", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = () => {
    if (!reportData?.details || reportData.details.length === 0) {
      Swal.fire("No Data", "Generate a report first before exporting.", "info");
      return;
    }
    const headers = Object.keys(reportData.details[0]);
    const csvRows = [headers.join(",")];
    for (const row of reportData.details) {
      csvRows.push(
        headers
          .map((h) => `"${(row[h] ?? "").toString().replace(/"/g, '""')}"`)
          .join(",")
      );
    }
    const blob = new Blob([csvRows.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `CASCOFAMCO_${selectedType}_Report_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    if (!reportData) return;
    window.print();
  };

  const SummaryCard = ({ label, value, sub }: { label: string; value: string | number; sub?: string }) => (
    <div className="bg-slate-50 border border-slate-100 rounded-xl p-4">
      <p className="text-xs font-semibold uppercase text-slate-400 tracking-wider">{label}</p>
      <p className="text-2xl font-bold text-slate-800 mt-1">{value}</p>
      {sub && <p className="text-xs text-slate-500 mt-0.5">{sub}</p>}
    </div>
  );

  const renderSummary = () => {
    if (!reportData?.summary) return null;
    const s = reportData.summary;
    switch (selectedType) {
      case "Production":
        return (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
            <SummaryCard label="Total Records" value={s.total_records ?? 0} />
            <SummaryCard label="Total Quantity" value={`${parseFloat(s.total_quantity || 0).toLocaleString()} kg`} />
            <SummaryCard label="Average per Record" value={`${parseFloat(s.average_quantity || 0).toLocaleString()} kg`} />
          </div>
        );
      case "Sales":
        return (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <SummaryCard label="Total Invoices" value={s.total_records ?? 0} />
            <SummaryCard label="Total Revenue" value={`₱ ${parseFloat(s.total_sales_amount || 0).toLocaleString()}`} />
            <SummaryCard label="Total Qty Sold" value={`${parseFloat(s.total_quantity_sold || 0).toLocaleString()} kg`} />
            <SummaryCard label="Avg Invoice" value={`₱ ${parseFloat(s.average_invoice_value || 0).toLocaleString()}`} />
          </div>
        );
      case "Member":
        return (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
            <SummaryCard label="Total Registered" value={s.total_registered ?? 0} />
            {s.by_status?.map((st: any) => (
              <SummaryCard key={st.status} label={st.status} value={st.count} />
            ))}
          </div>
        );
      case "Financial":
        return (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
            <SummaryCard label="Total Revenue" value={`₱ ${parseFloat(s.total_revenue || 0).toLocaleString()}`} />
            <SummaryCard label="Est. Member Payouts" value={`₱ ${parseFloat(s.estimated_member_payouts || 0).toLocaleString()}`} />
            <SummaryCard
              label="Net Surplus"
              value={`₱ ${parseFloat(s.net_surplus || 0).toLocaleString()}`}
              sub={s.net_surplus >= 0 ? "Cooperative surplus" : "Operating deficit"}
            />
          </div>
        );
      case "Task":
        return (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
            <SummaryCard label="Total Tasks" value={s.total_tasks ?? 0} />
            <SummaryCard label="Completed" value={s.completed ?? 0} />
            <SummaryCard label="Completion Rate" value={`${s.completion_rate ?? 0}%`} />
            <SummaryCard label="In Progress" value={s.in_progress ?? 0} />
            <SummaryCard label="Pending" value={s.pending ?? 0} />
            <SummaryCard label="Overdue" value={s.overdue ?? 0} />
          </div>
        );
      case "Inventory":
        return (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
            <SummaryCard label="Product Categories" value={s.total_product_categories ?? 0} />
            <SummaryCard label="Low Stock Categories" value={s.low_stock_categories ?? 0} />
            <SummaryCard label="Low Stock Threshold" value={`${s.low_stock_threshold ?? 0} kg`} />
          </div>
        );
      default:
        return null;
    }
  };

  const renderDetailsTable = () => {
    if (!reportData?.details || reportData.details.length === 0) {
      return (
        <div className="flex flex-col items-center py-12 text-slate-400">
          <FiBarChart2 className="w-10 h-10 opacity-30 mb-2" />
          <p className="font-medium">No detail records for the selected period.</p>
        </div>
      );
    }
    const headers = Object.keys(reportData.details[0]);
    const moneyKeys = ["amount", "revenue", "price", "payout", "profit", "total", "surplus"];
    const isMoneyKey = (h: string) => moneyKeys.some((k) => h.toLowerCase().includes(k));

    return (
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-100 text-xs">
          <thead className="bg-slate-50">
            <tr>
              {headers.map((h) => (
                <th key={h} className="px-4 py-3 text-left font-semibold uppercase text-slate-500 tracking-wider">
                  {h.replace(/_/g, " ")}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {reportData.details.map((row: any, i: number) => (
              <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                {headers.map((h) => (
                  <td key={h} className="px-4 py-3 text-slate-700">
                    {typeof row[h] === "number" && isMoneyKey(h)
                      ? `₱ ${row[h].toLocaleString(undefined, { minimumFractionDigits: 2 })}`
                      : row[h] ?? "—"}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Controls Card */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <h1 className="text-xl font-bold text-slate-800">Report Generation Center</h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Generate, filter, and export cooperative management reports.
            </p>
          </div>
          {reportData && (
            <div className="flex items-center gap-2 no-print">
              <button
                onClick={handleExportCSV}
                className="flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-green-50 text-primary border border-green-200 rounded-xl hover:bg-green-100 cursor-pointer transition-colors"
              >
                <FiDownload className="w-4 h-4" /> Export CSV
              </button>
              <button
                onClick={handlePrint}
                className="flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-slate-50 text-slate-700 border border-slate-200 rounded-xl hover:bg-slate-100 cursor-pointer transition-colors"
              >
                <FiPrinter className="w-4 h-4" /> Print
              </button>
            </div>
          )}
        </div>

        {/* Report Type Selector */}
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 mb-6">
          {reportTypes.map((rt) => (
            <button
              key={rt.id}
              onClick={() => { setSelectedType(rt.id); setReportData(null); }}
              className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 cursor-pointer transition-all text-sm font-semibold ${
                selectedType === rt.id
                  ? "border-primary bg-green-50 text-primary shadow-md"
                  : "border-slate-100 bg-white text-slate-500 hover:border-primary/30 hover:bg-slate-50"
              }`}
            >
              {rt.icon}
              <span className="text-xs text-center leading-tight">{rt.label}</span>
            </button>
          ))}
        </div>

        {/* Date Filters & Generate */}
        <div className="flex flex-wrap items-end gap-4 p-4 bg-slate-50 rounded-xl border border-slate-100">
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-white"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-white"
            />
          </div>
          <button
            onClick={handleGenerate}
            disabled={loading}
            className="flex items-center gap-2 px-6 py-2 bg-primary hover:bg-primary-dark text-white font-semibold rounded-xl shadow-md transition-colors cursor-pointer disabled:opacity-50 text-sm"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <FiBarChart2 className="w-4 h-4" />
            )}
            {loading ? "Generating..." : `Generate ${selectedType} Report`}
          </button>
        </div>
      </div>

      {/* Report Output */}
      {reportData && (
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs" id="report-output">
          <div className="flex justify-between items-start mb-6 pb-5 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-bold uppercase tracking-widest text-primary bg-green-50 border border-green-200 px-2.5 py-0.5 rounded-full">
                  Official Report
                </span>
              </div>
              <h2 className="text-xl font-bold text-slate-800 mt-2">
                CASCOFAMCO — {reportData.report_type} Report
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Period: <strong>{reportData.start_date || "All Time"}</strong> to{" "}
                <strong>{reportData.end_date || "Present"}</strong>
                {" · "} Generated by: <strong>{reportData.generated_by_user}</strong>
                {" · "} {reportData.generated_at}
              </p>
            </div>
            <div className="text-right hidden sm:block">
              <p className="text-3xl font-black text-primary/10 tracking-tight">CASCOFAMCO</p>
              <p className="text-xs text-slate-400">Ivisan Small Coconut Farmers</p>
            </div>
          </div>

          {/* Summary Cards */}
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Summary</h3>
          {renderSummary()}

          {/* Detail Table */}
          <div className="mt-4">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
              Detail Records ({reportData.details?.length || 0})
            </h3>
            {renderDetailsTable()}
          </div>
        </div>
      )}
    </div>
  );
};

export default ReportsPage;
