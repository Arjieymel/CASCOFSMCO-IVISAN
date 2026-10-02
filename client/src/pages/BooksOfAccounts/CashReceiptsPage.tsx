import { useState, useEffect, type FormEvent } from "react";
import BooksOfAccountsService from "../../services/BooksOfAccountsService";
import MemberService from "../../services/MemberService";
import type { CashReceiptRecord, Member } from "../../Interfaces";
import Pagination from "../../components/Pagination";
import Modal from "../../components/Modal";
import { exportToExcel, exportToPDF, printReport } from "../../utils/exportUtils";
import {
  FiEdit,
  FiTrash2,
  FiEye,
  FiPrinter,
  FiFileText,
  FiDownload,
  FiCalendar,
  FiSearch,
  FiFilter,
  FiX,
  FiInfo
} from "react-icons/fi";
import Swal from "sweetalert2";

const CashReceiptsPage = () => {
  const [records, setRecords] = useState<CashReceiptRecord[]>([]);
  const [activeMembers, setActiveMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);

  // Search & Filters
  const [search, setSearch] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [sortBy, setSortBy] = useState("receipt_date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Summary Totals from Database
  const [backendTotals, setBackendTotals] = useState<{
    cashOnHand: number;
    cashInBank: number;
    savingsDeposit: number;
    shareCapital: number;
    loanPayment: number;
    interestIncome: number;
    miscIncome: number;
    grandTotal: number;
  } | null>(null);

  // Member searchable dropdown states
  const [memberSearch, setMemberSearch] = useState("");
  const [isMemberDropdownOpen, setIsMemberDropdownOpen] = useState(false);

  // View modal state
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<CashReceiptRecord | null>(null);

  // Form Fields
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const [receiptDate, setReceiptDate] = useState(new Date().toISOString().split("T")[0]);
  const [orNumber, setOrNumber] = useState("");
  const [receivedFrom, setReceivedFrom] = useState("");
  const [description, setDescription] = useState("");
  const [amountReceived, setAmountReceived] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"Cash" | "GCash" | "Bank Transfer">("Cash");
  const [sourceOfIncome, setSourceOfIncome] = useState("Share Capital");
  const [remarks, setRemarks] = useState("");

  const [formErrors, setFormErrors] = useState<any>({});
  const [submitLoading, setSubmitLoading] = useState(false);

  const baseIncomeClassifications = [
    "Share Capital",
    "Loan Payment"
  ];
  const incomeClassificationOptions = baseIncomeClassifications.includes(sourceOfIncome)
    ? baseIncomeClassifications
    : [sourceOfIncome, ...baseIncomeClassifications];

  const fetchRecords = async (
    page: number = 1,
    searchQuery: string = search,
    start: string = startDate,
    end: string = endDate
  ) => {
    try {
      setLoading(true);
      const res = await BooksOfAccountsService.loadCashReceipts(
        page, searchQuery, start, end, 10, sortBy, sortOrder
      );
      setRecords(res.data.data || []);
      setCurrentPage(res.data.current_page || 1);
      setLastPage(res.data.last_page || 1);
      if (res.data.totals) {
        setBackendTotals(res.data.totals);
      }
    } catch (err: any) {
      console.error("Failed to load receipts: ", err);
      const msg = err.response?.data?.message || "Could not fetch Cash Receipts Journal records.";
      Swal.fire("Error", msg, "error");
    } finally {
      setLoading(false);
    }
  };

  const fetchActiveMembers = async () => {
    try {
      const res = await MemberService.loadMembers(1, "", "Active", "", 500);
      setActiveMembers(res.data.data || []);
    } catch (err) {
      console.error("Failed to load active members: ", err);
    }
  };

  // Debounced search and filter effect
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchRecords(1, search, startDate, endDate);
    }, 300);
    return () => clearTimeout(timer);
  }, [search, sortBy, sortOrder]);

  useEffect(() => {
    fetchActiveMembers();

    // Setup listener to close searchable dropdown when clicking outside
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest(".member-dropdown-container")) {
        setIsMemberDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(column);
      setSortOrder("desc");
    }
  };

  const handleClear = () => {
    setIsEditing(false);
    setEditingId(null);
    setReceiptDate(new Date().toISOString().split("T")[0]);
    setOrNumber("");
    setReceivedFrom("");
    setDescription("");
    setAmountReceived("");
    setPaymentMethod("Cash");
    setSourceOfIncome("Share Capital");
    setRemarks("");
    setFormErrors({});
  };

  const openEditRecord = (r: CashReceiptRecord) => {
    setIsEditing(true);
    setEditingId(r.id);
    const cleanDate = r.receipt_date
      ? (typeof r.receipt_date === "string" ? r.receipt_date.split("T")[0].split(" ")[0] : r.receipt_date)
      : "";
    setReceiptDate(cleanDate);
    setOrNumber(r.or_number || "");
    setReceivedFrom(r.received_from || "");
    setDescription(r.description || "");
    setAmountReceived(r.amount_received?.toString() || "");
    setSourceOfIncome(r.source_of_income || "Share Capital");

    // Parse payment method & remarks
    let method: "Cash" | "GCash" | "Bank Transfer" = "Cash";
    let restRemarks = r.remarks || "";
    if (r.payment_method && (r.payment_method === "Cash" || r.payment_method === "GCash" || r.payment_method === "Bank Transfer")) {
      method = r.payment_method;
      restRemarks = (r.remarks || "").replace(/^\[Method:\s*[^\]]+\]\s*/, "");
    } else if (r.remarks && r.remarks.startsWith("[Method: ")) {
      const match = r.remarks.match(/^\[Method:\s*([^\]]+)\]\s*(.*)/);
      if (match) {
        method = match[1] as any;
        restRemarks = match[2];
      }
    }
    setPaymentMethod(method);
    setRemarks(restRemarks);
    setFormErrors({});

    // Scroll form into view on mobile
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const openViewModal = (r: CashReceiptRecord) => {
    setSelectedRecord(r);
    setIsViewModalOpen(true);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormErrors({});

    const parsedAmount = parseFloat(amountReceived);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setFormErrors({ amount_received: ["Please enter a valid amount greater than 0.00."] });
      return;
    }

    setSubmitLoading(true);

    // Pack payment method into remarks cleanly
    const cleanRemarks = remarks.trim().replace(/^\[Method:\s*[^\]]+\]\s*/, "");
    const packedRemarks = `[Method: ${paymentMethod}] ${cleanRemarks}`.trim();

    const payload = {
      or_number: orNumber.trim() || undefined,
      receipt_date: receiptDate,
      received_from: receivedFrom.trim(),
      description: description.trim(),
      source_of_income: sourceOfIncome,
      amount_received: parsedAmount,
      payment_method: paymentMethod,
      remarks: packedRemarks
    };

    try {
      if (isEditing && editingId) {
        await BooksOfAccountsService.updateCashReceipt(editingId, payload);
        Swal.fire({
          title: "Saved",
          text: "Receipt record updated successfully.",
          icon: "success",
          confirmButtonColor: "#1F6B3D"
        });
      } else {
        await BooksOfAccountsService.storeCashReceipt(payload);
        Swal.fire({
          title: "Saved",
          text: "Official receipt recorded successfully.",
          icon: "success",
          confirmButtonColor: "#1F6B3D"
        });
      }
      handleClear();
      fetchRecords(currentPage);
    } catch (err: any) {
      console.error("Save receipt error: ", err);
      if (err.response && err.response.status === 422) {
        setFormErrors(err.response.data.errors || {});
      } else {
        const message = err.response?.data?.message || "Failed to save record.";
        Swal.fire("Error", message, "error");
      }
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleDelete = async (r: CashReceiptRecord) => {
    const result = await Swal.fire({
      title: "Delete Receipt?",
      text: `Are you sure you want to delete Official Receipt ${r.or_number}?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#EF4444",
      cancelButtonColor: "#64748B",
      confirmButtonText: "Yes, delete",
      cancelButtonText: "Cancel"
    });

    if (!result.isConfirmed) return;

    try {
      await BooksOfAccountsService.destroyCashReceipt(r.id);
      Swal.fire({
        title: "Deleted",
        text: "Receipt record deleted successfully.",
        icon: "success",
        confirmButtonColor: "#1F6B3D"
      });
      const targetPage = records.length === 1 && currentPage > 1 ? currentPage - 1 : currentPage;
      fetchRecords(targetPage);
    } catch (err: any) {
      console.error("Delete receipt error: ", err);
      const msg = err.response?.data?.message || "Failed to delete receipt record.";
      Swal.fire("Error", msg, "error");
    }
  };

  // Calculations for Summary Cards
  const getTotals = () => {
    if (backendTotals) {
      return backendTotals;
    }

    let cashOnHand = 0;
    let cashInBank = 0;
    let shareCapital = 0;
    let loanPayment = 0;
    let grandTotal = 0;

    records.forEach(r => {
      const amt = parseFloat(r.amount_received?.toString() || "0") || 0;

      let method = r.payment_method || "Cash";
      if (!r.payment_method && r.remarks && r.remarks.startsWith("[Method: ")) {
        const match = r.remarks.match(/^\[Method:\s*([^\]]+)\]/);
        if (match) method = match[1];
      }

      if (method.trim().toLowerCase() === "cash") {
        cashOnHand += amt;
      } else {
        cashInBank += amt;
      }

      const cls = (r.source_of_income || "").trim().toLowerCase();
      if (cls === "share capital") {
        shareCapital += amt;
      } else if (cls === "loan payment") {
        loanPayment += amt;
      }

      grandTotal += amt;
    });

    return {
      cashOnHand,
      cashInBank,
      shareCapital,
      loanPayment,
      grandTotal
    };
  };

  const totals = getTotals();

  const getAllExportRecords = async (): Promise<CashReceiptRecord[]> => {
    if (lastPage <= 1) {
      return records;
    }
    try {
      const res = await BooksOfAccountsService.loadCashReceipts(
        1, search, startDate, endDate, 10000, sortBy, sortOrder
      );
      return res.data.data || records;
    } catch (e) {
      console.error("Failed to load all records for export:", e);
      return records;
    }
  };

  // Export & Print functions
  const handlePrintReceipt = (r: CashReceiptRecord) => {
    let method = r.payment_method || "Cash";
    let restRemarks = r.remarks || "";
    if (r.remarks && r.remarks.startsWith("[Method: ")) {
      const match = r.remarks.match(/^\[Method:\s*([^\]]+)\]\s*(.*)/);
      if (match) {
        if (!r.payment_method) method = match[1];
        restRemarks = match[2];
      }
    }

    const cleanDate = r.receipt_date
      ? (typeof r.receipt_date === "string" ? r.receipt_date.split("T")[0].split(" ")[0] : r.receipt_date)
      : "";

    const headers = ["Field", "Details"];
    const rows = [
      ["Official Receipt No", r.or_number],
      ["Receipt Date", cleanDate],
      ["Received From", r.received_from],
      ["Payment Method", method],
      ["Income Classification", r.source_of_income],
      ["Amount Received", `₱ ${parseFloat(r.amount_received?.toString() || "0").toLocaleString(undefined, { minimumFractionDigits: 2 })}`],
      ["Particulars", r.description],
      ["Recorded By", r.recorded_by || "admin"],
      ["Remarks", restRemarks || "N/A"]
    ];
    printReport(`Official Receipt - ${r.or_number}`, headers, rows);
  };

  const handleExportExcel = async () => {
    const list = await getAllExportRecords();
    if (!list || list.length === 0) {
      Swal.fire("No Data", "There are no cash receipt records to export.", "info");
      return;
    }
    const dataToExport = list.map(r => {
      let method = r.payment_method || "Cash";
      let restRemarks = r.remarks || "";
      if (r.remarks && r.remarks.startsWith("[Method: ")) {
        const match = r.remarks.match(/^\[Method:\s*([^\]]+)\]\s*(.*)/);
        if (match) {
          if (!r.payment_method) method = match[1];
          restRemarks = match[2];
        }
      }
      const cleanDate = r.receipt_date
        ? (typeof r.receipt_date === "string" ? r.receipt_date.split("T")[0].split(" ")[0] : r.receipt_date)
        : "";
      return {
        "OR Number": r.or_number,
        "Date": cleanDate,
        "Received From": r.received_from,
        "Payment Method": method,
        "Income Classification": r.source_of_income,
        "Amount Received (₱)": parseFloat(r.amount_received?.toString() || "0"),
        "Particulars": r.description,
        "Recorded By": r.recorded_by || "admin",
        "Remarks": restRemarks || ""
      };
    });
    exportToExcel(dataToExport, `Cash_Receipts_Journal_Excel_${new Date().toISOString().split("T")[0]}`);
  };

  const handleExportCSV = async () => {
    const list = await getAllExportRecords();
    if (!list || list.length === 0) {
      Swal.fire("No Data", "There are no cash receipt records to export.", "info");
      return;
    }
    const dataToExport = list.map(r => {
      let method = r.payment_method || "Cash";
      let restRemarks = r.remarks || "";
      if (r.remarks && r.remarks.startsWith("[Method: ")) {
        const match = r.remarks.match(/^\[Method:\s*([^\]]+)\]\s*(.*)/);
        if (match) {
          if (!r.payment_method) method = match[1];
          restRemarks = match[2];
        }
      }
      const cleanDate = r.receipt_date
        ? (typeof r.receipt_date === "string" ? r.receipt_date.split("T")[0].split(" ")[0] : r.receipt_date)
        : "";
      return {
        "OR Number": r.or_number,
        "Date": cleanDate,
        "Received From": r.received_from,
        "Payment Method": method,
        "Income Classification": r.source_of_income,
        "Amount Received (₱)": parseFloat(r.amount_received?.toString() || "0"),
        "Particulars": r.description,
        "Recorded By": r.recorded_by || "admin",
        "Remarks": restRemarks || ""
      };
    });
    exportToExcel(dataToExport, `Cash_Receipts_Journal_CSV_${new Date().toISOString().split("T")[0]}`);
  };

  const handlePrint = async () => {
    const list = await getAllExportRecords();
    if (!list || list.length === 0) {
      Swal.fire("No Data", "There are no cash receipt records to print.", "info");
      return;
    }
    const headers = ["OR Number", "Date", "Received From", "Classification", "Total Amount (₱)", "Recorded By"];
    const rows = list.map(r => [
      r.or_number,
      r.receipt_date ? (typeof r.receipt_date === "string" ? r.receipt_date.split("T")[0].split(" ")[0] : r.receipt_date) : "",
      r.received_from,
      r.source_of_income,
      `₱ ${parseFloat(r.amount_received?.toString() || "0").toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
      r.recorded_by || "admin"
    ]);
    printReport("Cash Receipts Journal Summary", headers, rows);
  };

  const handleExportPDF = async () => {
    const list = await getAllExportRecords();
    if (!list || list.length === 0) {
      Swal.fire("No Data", "There are no cash receipt records to export.", "info");
      return;
    }
    const headers = ["OR Number", "Date", "Received From", "Classification", "Total Amount (₱)", "Recorded By"];
    const rows = list.map(r => [
      r.or_number,
      r.receipt_date ? (typeof r.receipt_date === "string" ? r.receipt_date.split("T")[0].split(" ")[0] : r.receipt_date) : "",
      r.received_from,
      r.source_of_income,
      `₱ ${parseFloat(r.amount_received?.toString() || "0").toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
      r.recorded_by || "admin"
    ]);
    exportToPDF("Cash Receipts Journal Summary", headers, rows);
  };

  const filteredMembers = activeMembers.filter(m => {
    const fullName = `${m.firstname} ${m.lastname}`.toLowerCase();
    const code = m.member_code.toLowerCase();
    const query = memberSearch.toLowerCase();
    return fullName.includes(query) || code.includes(query);
  });

  return (
    <div className="space-y-6">
      {/* Redesigned 3-Section Container (Flex/Grid) */}
      <div className="flex flex-col lg:flex-row gap-6">
        
        {/* ==========================================
            LEFT PANEL: New / Edit Cash Receipt Card (30%)
            ========================================== */}
        <div className="w-full lg:w-[30%] shrink-0">
          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-base font-bold text-slate-800">
                  {isEditing ? "Edit Cash Receipt" : "New Cash Receipt"}
                </h2>
                <p className="text-xs text-slate-400">
                  {isEditing ? `Modifying OR: ${orNumber}` : "Record official receipt inflows"}
                </p>
              </div>
              {isEditing && (
                <button
                  onClick={handleClear}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-50 cursor-pointer"
                  title="Cancel Edit"
                >
                  <FiX className="w-4.5 h-4.5" />
                </button>
              )}
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Receipt Date */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Receipt Date</label>
                <input
                  type="date"
                  required
                  value={receiptDate}
                  onChange={(e) => setReceiptDate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-white text-slate-800"
                />
                {formErrors.receipt_date && <p className="text-red-500 text-xs mt-1">{formErrors.receipt_date[0]}</p>}
              </div>

              {/* OR Number */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Official Receipt Number</label>
                <input
                  type="text"
                  placeholder="Auto-generated (OR-YYYY-XXXX)"
                  value={orNumber}
                  onChange={(e) => setOrNumber(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-white text-slate-800 font-mono"
                />
                {formErrors.or_number && <p className="text-red-500 text-xs mt-1">{formErrors.or_number[0]}</p>}
              </div>

              {/* Member / Customer Dropdown */}
              <div className="member-dropdown-container relative">
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Member / Customer</label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search member or enter client..."
                    required
                    value={receivedFrom}
                    onChange={(e) => {
                      setReceivedFrom(e.target.value);
                      setIsMemberDropdownOpen(true);
                    }}
                    onFocus={() => setIsMemberDropdownOpen(true)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-white text-slate-800"
                  />
                  {isMemberDropdownOpen && (
                    <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-60 overflow-y-auto">
                      <div className="p-2 border-b border-slate-100 bg-slate-50 sticky top-0">
                        <input
                          type="text"
                          placeholder="Search members..."
                          value={memberSearch}
                          onChange={(e) => setMemberSearch(e.target.value)}
                          className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-primary focus:outline-none bg-white"
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                      {filteredMembers.length > 0 ? (
                        filteredMembers.map((m) => (
                          <button
                            key={m.id}
                            type="button"
                            onClick={() => {
                              setReceivedFrom(`${m.firstname} ${m.lastname}`);
                              setIsMemberDropdownOpen(false);
                              setMemberSearch("");
                            }}
                            className="w-full text-left px-3 py-2 hover:bg-slate-50 text-xs text-slate-700 flex justify-between items-center border-b border-slate-50 last:border-b-0"
                          >
                            <span>{m.firstname} {m.lastname}</span>
                            <span className="text-[10px] bg-slate-150 text-slate-500 px-1.5 py-0.5 rounded font-mono font-medium">{m.member_code}</span>
                          </button>
                        ))
                      ) : (
                        <div className="px-3 py-3 text-xs text-slate-400 text-center">
                          No members found. Direct typing allowed.
                        </div>
                      )}
                    </div>
                  )}
                </div>
                {formErrors.received_from && <p className="text-red-500 text-xs mt-1">{formErrors.received_from[0]}</p>}
              </div>

              {/* Particulars */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Particulars</label>
                <textarea
                  required
                  rows={2}
                  placeholder="Particulars of payment receipt..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-white text-slate-800"
                ></textarea>
                {formErrors.description && <p className="text-red-500 text-xs mt-1">{formErrors.description[0]}</p>}
              </div>

              {/* Amount Received */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Amount Received</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 text-sm font-semibold pointer-events-none">₱</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    placeholder="0.00"
                    value={amountReceived}
                    onChange={(e) => setAmountReceived(e.target.value)}
                    className="w-full pl-7 pr-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-white text-slate-800 font-semibold"
                  />
                </div>
                {formErrors.amount_received && <p className="text-red-500 text-xs mt-1">{formErrors.amount_received[0]}</p>}
              </div>

              {/* Payment Method */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Payment Method</label>
                <div className="flex flex-wrap gap-x-4 gap-y-2">
                  {["Cash", "GCash", "Bank Transfer"].map((method) => (
                    <label key={method} className="flex items-center gap-1.5 text-xs font-medium text-slate-700 cursor-pointer">
                      <input
                        type="radio"
                        name="payment_method"
                        value={method}
                        checked={paymentMethod === method}
                        onChange={() => setPaymentMethod(method as any)}
                        className="text-primary focus:ring-primary border-slate-300 w-3.5 h-3.5"
                      />
                      <span>{method}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Income Classification */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Income Classification</label>
                <select
                  value={sourceOfIncome}
                  onChange={(e) => setSourceOfIncome(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary text-slate-800 font-semibold cursor-pointer"
                >
                  {incomeClassificationOptions.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                {formErrors.source_of_income && <p className="text-red-500 text-xs mt-1">{formErrors.source_of_income[0]}</p>}
              </div>

              {/* Remarks */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Remarks</label>
                <textarea
                  rows={2}
                  placeholder="Optional reference notes..."
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-white text-slate-800"
                ></textarea>
              </div>

              {/* Form Buttons */}
              <div className="flex gap-2.5 justify-end pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleClear}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-50 transition cursor-pointer"
                >
                  Clear
                </button>
                <button
                  type="submit"
                  disabled={submitLoading}
                  className="px-5 py-2 bg-primary hover:bg-primary-dark text-white rounded-xl text-xs font-bold shadow-md transition disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                >
                  {submitLoading ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>{isEditing ? "Update" : "Save"}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* ==========================================
            RIGHT PANEL: Cash Receipts Journal (70%)
            ========================================== */}
        <div className="w-full lg:w-[70%] flex-1 space-y-6">
          
          {/* Header Panel & Breadcrumbs */}
          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
            <div>
              <nav className="text-slate-400 text-[10px] uppercase tracking-wider flex items-center gap-1 mb-1 font-bold">
                <span className="hover:text-slate-600 cursor-pointer">Dashboard</span>
                <span>/</span>
                <span className="hover:text-slate-600 cursor-pointer">Books of Accounts</span>
                <span>/</span>
                <span className="text-slate-500 font-black">Cash Receipts Journal</span>
              </nav>
              <h1 className="text-lg font-extrabold text-slate-850">Cash Receipts Journal</h1>
            </div>
            
            <div className="text-xs bg-slate-50 border border-slate-150 px-3 py-1 rounded-xl font-medium text-slate-500 flex items-center gap-1">
              <FiInfo className="w-3.5 h-3.5 text-slate-450" />
              <span>Double-entry balancing enabled</span>
            </div>
          </div>

          {/* Top Toolbar */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5">
              
              {/* Search bar */}
              <div className="w-full md:w-72">
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 pointer-events-none">
                    <FiSearch className="w-4 h-4" />
                  </span>
                  <input
                    type="text"
                    placeholder="Search OR #, received from..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        fetchRecords(1, search, startDate, endDate);
                      }
                    }}
                    className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-primary bg-white text-slate-700 font-medium"
                  />
                </div>
              </div>

              {/* Date Filters & Clear & Filter Button */}
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
                  <FiCalendar className="w-4 h-4 text-slate-400" />
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        fetchRecords(1, search, startDate, endDate);
                      }
                    }}
                    className="px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 bg-white focus:outline-none"
                  />
                  <span>to</span>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        fetchRecords(1, search, startDate, endDate);
                      }
                    }}
                    className="px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 bg-white focus:outline-none"
                  />
                  {(startDate || endDate) && (
                    <button
                      type="button"
                      onClick={() => {
                        setStartDate("");
                        setEndDate("");
                        fetchRecords(1, search, "", "");
                      }}
                      className="text-primary hover:underline font-bold text-[10px] cursor-pointer"
                    >
                      Clear
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => fetchRecords(1, search, startDate, endDate)}
                  className="px-3.5 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 font-bold text-xs rounded-xl flex items-center gap-1.5 transition cursor-pointer"
                >
                  <FiFilter className="w-3.5 h-3.5 text-slate-500" />
                  <span>Filter</span>
                </button>
              </div>
            </div>

            {/* Redesigned Journal Table Section */}
            <div className="border-t border-slate-100">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-20 gap-3">
                  <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                  <p className="text-slate-400 text-sm font-semibold">Loading Cash Receipts records...</p>
                </div>
              ) : (
                <div className="overflow-x-auto w-full">
                  <table className="min-w-full divide-y divide-slate-100 text-xs table-fixed">
                    <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider text-[9px] sticky top-0 z-10 shadow-xs border-b border-slate-100">
                      <tr>
                        <th onClick={() => handleSort("receipt_date")} className="px-3 py-3.5 text-left cursor-pointer hover:text-slate-700 w-24">
                          Date {sortBy === "receipt_date" ? (sortOrder === "asc" ? "▲" : "▼") : ""}
                        </th>
                        <th onClick={() => handleSort("or_number")} className="px-3 py-3.5 text-left cursor-pointer hover:text-slate-700 w-28">
                          OR Number {sortBy === "or_number" ? (sortOrder === "asc" ? "▲" : "▼") : ""}
                        </th>
                        <th onClick={() => handleSort("received_from")} className="px-3 py-3.5 text-left cursor-pointer hover:text-slate-700 w-44">
                          Received From {sortBy === "received_from" ? (sortOrder === "asc" ? "▲" : "▼") : ""}
                        </th>
                        <th className="px-3 py-3.5 text-left w-48">Particulars</th>
                        
                        {/* Debit Columns */}
                        <th className="px-3 py-3.5 text-right w-28 bg-emerald-500/5 text-emerald-800 font-extrabold border-l border-slate-100">Cash on Hand</th>
                        <th className="px-3 py-3.5 text-right w-28 bg-emerald-500/5 text-emerald-800 font-extrabold">Cash in Bank</th>
                        
                        {/* Credit Columns */}
                        <th className="px-3 py-3.5 text-right w-28 bg-blue-500/5 text-blue-800 font-extrabold border-l border-slate-100">Share Capital</th>
                        <th className="px-3 py-3.5 text-right w-28 bg-blue-500/5 text-blue-800 font-extrabold">Loan Payment</th>
                        
                        <th onClick={() => handleSort("amount_received")} className="px-3 py-3.5 text-right cursor-pointer hover:text-slate-700 w-28 font-black text-slate-800 border-l border-slate-100">
                          Total Amount {sortBy === "amount_received" ? (sortOrder === "asc" ? "▲" : "▼") : ""}
                        </th>
                        <th className="px-3 py-3.5 text-center w-28 sticky right-0 bg-slate-50 border-l border-slate-200 z-20">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700 bg-white">
                      {records.length > 0 ? (
                        records.map((r, index) => {
                          const amt = parseFloat(r.amount_received?.toString() || "0") || 0;

                          // Parse payment method
                          let method = r.payment_method || "Cash";
                          if (!r.payment_method && r.remarks && r.remarks.startsWith("[Method: ")) {
                            const match = r.remarks.match(/^\[Method:\s*([^\]]+)\]/);
                            if (match) method = match[1];
                          }

                          // Debit Mapping
                          const isCash = method.trim().toLowerCase() === "cash";
                          const cashOnHand = isCash ? amt : 0;
                          const cashInBank = !isCash ? amt : 0;

                          // Credit Mapping
                          const cls = (r.source_of_income || "").trim().toLowerCase();
                          const isCapital = cls === "share capital";
                          const isLoan = cls === "loan payment";

                          const capitalVal = isCapital ? amt : 0;
                          const loanVal = isLoan ? amt : 0;

                          const formatCurrency = (val: number) => {
                            if (val === 0) return <span className="text-slate-300">—</span>;
                            return <span className="font-semibold">₱{val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>;
                          };

                          return (
                            <tr key={r.id} className={`hover:bg-slate-50/50 transition-colors ${index % 2 === 0 ? "bg-white" : "bg-slate-50/20"}`}>
                              <td className="px-3 py-3.5 whitespace-nowrap font-medium text-slate-500">
                                {r.receipt_date ? (typeof r.receipt_date === 'string' ? r.receipt_date.split('T')[0].split(' ')[0] : r.receipt_date) : ""}
                              </td>
                              <td className="px-3 py-3.5 font-bold text-primary truncate" title={r.or_number}>
                                {r.or_number}
                              </td>
                              <td className="px-3 py-3.5 font-semibold text-slate-800 truncate" title={r.received_from}>
                                {r.received_from}
                              </td>
                              <td className="px-3 py-3.5 truncate text-slate-500 max-w-[200px]" title={r.description}>
                                {r.description}
                              </td>
                              
                              {/* Debit */}
                              <td className="px-3 py-3.5 text-right bg-emerald-500/5 text-emerald-700 border-l border-slate-100">{formatCurrency(cashOnHand)}</td>
                              <td className="px-3 py-3.5 text-right bg-emerald-500/5 text-emerald-700">{formatCurrency(cashInBank)}</td>
                              
                              {/* Credit */}
                              <td className="px-3 py-3.5 text-right bg-blue-500/5 text-blue-700 border-l border-slate-100">{formatCurrency(capitalVal)}</td>
                              <td className="px-3 py-3.5 text-right bg-blue-500/5 text-blue-700">{formatCurrency(loanVal)}</td>
                              
                              {/* Total */}
                              <td className="px-3 py-3.5 text-right font-extrabold text-slate-900 bg-slate-50/20 border-l border-slate-150">
                                ₱{amt.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>
                              
                              {/* Actions */}
                              <td className="px-3 py-3.5 text-center sticky right-0 bg-white border-l border-slate-200 z-10 shadow-[-4px_0_10px_-4px_rgba(0,0,0,0.05)]">
                                <div className="flex justify-center items-center gap-0.5">
                                  <button
                                    onClick={() => openViewModal(r)}
                                    title="View Details"
                                    className="p-1 rounded-lg text-slate-500 hover:bg-slate-100 transition cursor-pointer"
                                  >
                                    <FiEye className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => handlePrintReceipt(r)}
                                    title="Print Receipt"
                                    className="p-1 rounded-lg text-blue-600 hover:bg-blue-50 transition cursor-pointer"
                                  >
                                    <FiPrinter className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => openEditRecord(r)}
                                    title="Edit Record"
                                    className="p-1 rounded-lg text-primary hover:bg-green-50 transition cursor-pointer"
                                  >
                                    <FiEdit className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => handleDelete(r)}
                                    title="Delete Record"
                                    className="p-1 rounded-lg text-red-650 hover:bg-red-55 transition cursor-pointer"
                                  >
                                    <FiTrash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan={13} className="px-6 py-12 text-center text-slate-400 font-medium">
                            No cash receipt journal logs found matching filter guidelines.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Pagination footer */}
            <div className="border-t border-slate-100 px-5 py-3.5 bg-slate-50 flex items-center justify-between">
              <Pagination currentPage={currentPage} lastPage={lastPage} onPageChange={(p) => fetchRecords(p)} />
            </div>
          </div>

          {/* ==========================================
              SUMMARY CARD STATS: Grid displays totals
              ========================================== */}
          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs space-y-4">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <FiInfo className="text-primary w-4 h-4" />
              <span>Live Ledger Classification Aggregations</span>
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {/* Total Cash on Hand */}
              <div className="bg-emerald-500/5 p-4 rounded-xl border border-emerald-100/50">
                <span className="text-[9px] font-bold text-emerald-800 uppercase tracking-wider block">Total Cash on Hand</span>
                <span className="text-sm font-extrabold text-emerald-700 mt-1 block">
                  ₱ {totals.cashOnHand.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>

              {/* Total Cash in Bank */}
              <div className="bg-emerald-500/5 p-4 rounded-xl border border-emerald-100/50">
                <span className="text-[9px] font-bold text-emerald-800 uppercase tracking-wider block">Total Cash in Bank</span>
                <span className="text-sm font-extrabold text-emerald-700 mt-1 block">
                  ₱ {totals.cashInBank.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>

              {/* Total Share Capital */}
              <div className="bg-blue-500/5 p-4 rounded-xl border border-blue-100/50">
                <span className="text-[9px] font-bold text-blue-800 uppercase tracking-wider block">Share Capital</span>
                <span className="text-sm font-extrabold text-blue-700 mt-1 block">
                  ₱ {totals.shareCapital.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>

              {/* Total Loan Payment */}
              <div className="bg-blue-500/5 p-4 rounded-xl border border-blue-100/50">
                <span className="text-[9px] font-bold text-blue-800 uppercase tracking-wider block">Loan Payments</span>
                <span className="text-sm font-extrabold text-blue-700 mt-1 block">
                  ₱ {totals.loanPayment.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>

              {/* Grand Total Receipts */}
              <div className="bg-primary p-4 rounded-xl border border-primary text-white shadow-xs">
                <span className="text-[9px] font-bold text-slate-100 uppercase tracking-wider block">Grand Total Receipts</span>
                <span className="text-sm font-black text-white mt-1 block">
                  ₱ {totals.grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>

          {/* ==========================================
              FOOTER ACTIONS: Print & Exports
              ========================================== */}
          <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 bg-white p-4 rounded-2xl border border-slate-100 shadow-xs">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Export options for this journal page
            </span>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handlePrint}
                className="px-3.5 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
              >
                <FiPrinter className="w-4 h-4 text-slate-500" />
                <span>Print Journal</span>
              </button>

              <button
                type="button"
                onClick={handleExportExcel}
                className="px-3.5 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
              >
                <FiDownload className="w-4 h-4 text-emerald-600" />
                <span>Excel</span>
              </button>

              <button
                type="button"
                onClick={handleExportCSV}
                className="px-3.5 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
              >
                <FiDownload className="w-4 h-4 text-teal-650" />
                <span>CSV</span>
              </button>

              <button
                type="button"
                onClick={handleExportPDF}
                className="px-3.5 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
              >
                <FiFileText className="w-4 h-4 text-red-500" />
                <span>PDF</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ==========================================
          VIEW RECEIPT MODAL
          ========================================== */}
      <Modal isOpen={isViewModalOpen} onClose={() => setIsViewModalOpen(false)} showCloseButton={true}>
        {selectedRecord && (
          <div className="p-2 space-y-4">
            <div className="flex justify-between items-start border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] uppercase font-bold text-primary tracking-widest block">Official Receipt Summary</span>
                <h3 className="text-lg font-bold text-slate-800 mt-1">{selectedRecord.or_number}</h3>
                <p className="text-xs text-slate-400">Transaction Date: {selectedRecord.receipt_date ? (typeof selectedRecord.receipt_date === 'string' ? selectedRecord.receipt_date.split('T')[0] : selectedRecord.receipt_date) : ""}</p>
              </div>
              <button
                onClick={() => handlePrintReceipt(selectedRecord)}
                className="px-3.5 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 font-bold rounded-xl text-xs flex items-center gap-1 transition cursor-pointer"
              >
                <FiPrinter className="w-4 h-4" />
                <span>Print OR</span>
              </button>
            </div>

            {/* Financial summary blocks */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-3.5 text-xs font-medium text-slate-700">
              <div className="flex justify-between items-center bg-white p-3 rounded-lg border border-slate-100">
                <span className="text-xs font-bold text-slate-400 uppercase">Amount Received</span>
                <span className="text-lg font-black text-emerald-600">
                  ₱ {parseFloat(selectedRecord.amount_received.toString()).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block mb-0.5">Received From</span>
                  <span className="font-bold text-slate-800 text-sm block">{selectedRecord.received_from}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block mb-0.5">Classification</span>
                  <span className="font-semibold text-slate-750 text-sm block">{selectedRecord.source_of_income}</span>
                </div>
              </div>
            </div>

            {/* Audit & Additional details */}
            <div className="space-y-3.5 text-xs text-slate-700 p-2">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase">Particulars / Description</p>
                <p className="mt-1 font-medium bg-slate-50/50 p-2.5 rounded-lg border border-slate-100 leading-relaxed">{selectedRecord.description}</p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Recorded By</p>
                  <p className="mt-1 font-semibold text-slate-800">{selectedRecord.recorded_by}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Payment Method</p>
                  <p className="mt-1 font-semibold text-slate-800">
                    {(() => {
                      let method = "Cash";
                      if (selectedRecord.remarks && selectedRecord.remarks.startsWith("[Method: ")) {
                        const match = selectedRecord.remarks.match(/^\[Method:\s*([^\]]+)\]/);
                        if (match) method = match[1];
                      }
                      return method;
                    })()}
                  </p>
                </div>
              </div>

              {(() => {
                let restRemarks = selectedRecord.remarks || "";
                if (selectedRecord.remarks && selectedRecord.remarks.startsWith("[Method: ")) {
                  const match = selectedRecord.remarks.match(/^\[Method:\s*([^\]]+)\]\s*(.*)/);
                  if (match) restRemarks = match[2];
                }
                if (!restRemarks) return null;
                return (
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Remarks</p>
                    <p className="mt-1 text-slate-500 font-medium">{restRemarks}</p>
                  </div>
                );
              })()}
            </div>

            <div className="flex justify-end pt-4 border-t border-slate-100">
              <button
                onClick={() => setIsViewModalOpen(false)}
                className="px-5 py-2 text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition cursor-pointer"
              >
                Close Details
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default CashReceiptsPage;
