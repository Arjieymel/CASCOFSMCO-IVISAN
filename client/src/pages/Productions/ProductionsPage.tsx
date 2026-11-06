import { useState, useEffect, type FormEvent } from "react";
import ProductionService from "../../services/ProductionService";
import MemberService from "../../services/MemberService";
import SettingService from "../../services/SettingService";
import type { Production, Member, ProductionPayment } from "../../Interfaces";
import SearchBar from "../../components/SearchBar";
import Pagination from "../../components/Pagination";
import Modal from "../../components/Modal";
import { 
  FiPlus, 
  FiEdit, 
  FiTrash2, 
  FiCalendar, 
  FiAlertTriangle, 
  FiInfo, 
  FiDollarSign, 
  FiClock, 
  FiCheckCircle, 
  FiFileText,
  FiUser
} from "react-icons/fi";
import { formatPHP } from "../../utils/currencyUtils";
import Swal from "sweetalert2";

const ProductionsPage = () => {
  const [productions, setProductions] = useState<Production[]>([]);
  const [activeMembers, setActiveMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);

  // Cooperative CBU Setting
  const [cbuRateSetting, setCbuRateSetting] = useState<number | null>(null);

  // Search & Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [paymentStatusFilter, setPaymentStatusFilter] = useState("");
  const [productTypeFilter, setProductTypeFilter] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // CRUD States
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedProduction, setSelectedProduction] = useState<Production | null>(null);

  // Payment Modal States
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentProduction, setPaymentProduction] = useState<Production | null>(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split("T")[0]);
  const [paymentMethod, setPaymentMethod] = useState<"Cash" | "Check" | "Bank Transfer" | "GCash">("Cash");
  const [voucherNumber, setVoucherNumber] = useState("");
  const [approvedBy, setApprovedBy] = useState("General Manager");
  const [expenseAccount, setExpenseAccount] = useState("Copra Procurement Expenses");
  const [paymentRemarks, setPaymentRemarks] = useState("");
  const [paymentErrors, setPaymentErrors] = useState<any>({});
  const [paymentLoading, setPaymentLoading] = useState(false);

  // Payment History Modal States
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [historyProduction, setHistoryProduction] = useState<Production | null>(null);
  const [paymentHistoryList, setPaymentHistoryList] = useState<ProductionPayment[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Form Fields
  const [memberId, setMemberId] = useState("");
  const [productType, setProductType] = useState("Copra");
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState("kg");
  const [unitPrice, setUnitPrice] = useState("");
  const [source, setSource] = useState("");
  const [remarks, setRemarks] = useState("");
  const [productionDate, setProductionDate] = useState("");
  const [status, setStatus] = useState("Completed");

  const [formErrors, setFormErrors] = useState<any>({});
  const [submitLoading, setSubmitLoading] = useState(false);

  const productTypesList = ["Copra", "Whole Coconut"];
  const statusesList = ["Completed", "Cancelled"];
  const paymentStatusesList = ["Unpaid", "Partially Paid", "Paid"];
  const paymentMethodsList = ["Cash", "Check", "Bank Transfer", "GCash"];
  const expenseAccountsList = [
    "Copra Procurement Expenses",
    "Operating Expenses",
    "Raw Materials Purchase",
    "Miscellaneous"
  ];

  // Live Purchase & CBU Computation for Add/Edit forms
  const parsedQty = parseFloat(quantity) || 0;
  const parsedUnitPrice = parseFloat(unitPrice) || 0;
  const grossAmount = parsedQty * parsedUnitPrice;
  const hasCbuConfigured = cbuRateSetting !== null && cbuRateSetting > 0;
  const effectiveCbuRate = hasCbuConfigured ? (cbuRateSetting as number) : 0;
  const cbuDeduction = hasCbuConfigured ? (parsedQty * effectiveCbuRate) : 0;
  const netAmountPayable = Math.max(0, grossAmount - cbuDeduction);

  const fetchProductions = async (page: number = 1) => {
    try {
      setLoading(true);
      const res = await ProductionService.loadProductions(
        page, search, statusFilter, productTypeFilter, startDate, endDate, 10, paymentStatusFilter
      );
      setProductions(res.data.data);
      setCurrentPage(res.data.current_page);
      setLastPage(res.data.last_page);
    } catch (err) {
      console.error("Failed to load production records: ", err);
      Swal.fire("Error", "Could not fetch production logs.", "error");
    } finally {
      setLoading(false);
    }
  };

  const fetchActiveMembers = async () => {
    try {
      const res = await MemberService.loadMembers(1, "", "Active", "", 500);
      setActiveMembers(res.data.data);
    } catch (err) {
      console.error("Failed to load active members: ", err);
    }
  };

  const fetchSettings = async () => {
    try {
      const res = await SettingService.getSettings();
      if (res.data) {
        const rawRate = res.data.cbu_rate_per_kg;
        if (rawRate !== null && rawRate !== undefined && rawRate !== "") {
          const parsed = parseFloat(String(rawRate));
          if (!isNaN(parsed) && parsed > 0) {
            setCbuRateSetting(parsed);
          } else {
            setCbuRateSetting(null);
          }
        } else {
          setCbuRateSetting(null);
        }
      }
    } catch (err) {
      console.error("Failed to fetch cooperative settings:", err);
      setCbuRateSetting(null);
    }
  };

  useEffect(() => {
    fetchProductions(1);
    fetchActiveMembers();
    fetchSettings();
  }, [search, statusFilter, paymentStatusFilter, productTypeFilter, startDate, endDate]);

  const handlePageChange = (page: number) => {
    fetchProductions(page);
  };

  // Open Modals
  const openAddModal = () => {
    setMemberId(activeMembers[0]?.id?.toString() || "");
    setProductType("Copra");
    setQuantity("");
    setUnit("kg");
    setUnitPrice("");
    setSource("");
    setRemarks("");
    setProductionDate(new Date().toISOString().split("T")[0]);
    setStatus("Completed");
    setFormErrors({});
    setIsAddModalOpen(true);
  };

  const openEditModal = (p: Production) => {
    setSelectedProduction(p);
    setMemberId(p.member_id.toString());
    setProductType(p.product_type);
    setQuantity(p.quantity.toString());
    setUnit(p.unit);
    setUnitPrice(p.unit_price !== null && p.unit_price !== undefined && parseFloat(p.unit_price.toString()) > 0 ? p.unit_price.toString() : "");
    setSource(p.source);
    setRemarks(p.remarks || "");
    setProductionDate(p.production_date ? (typeof p.production_date === 'string' ? p.production_date.split('T')[0] : p.production_date) : "");
    setStatus(p.status);
    setFormErrors({});
    setIsEditModalOpen(true);
  };

  // Open Pay Member Modal
  const openPaymentModal = (p: Production) => {
    setPaymentProduction(p);
    const rem = parseFloat(p.remaining_balance?.toString() || "0");
    setPaymentAmount(rem > 0 ? rem.toFixed(2) : "");
    setPaymentDate(new Date().toISOString().split("T")[0]);
    setPaymentMethod("Cash");
    setVoucherNumber("");
    setApprovedBy("General Manager");
    setExpenseAccount("Copra Procurement Expenses");
    setPaymentRemarks(`Member payment for Production #${p.id} (${p.quantity}${p.unit} ${p.product_type})`);
    setPaymentErrors({});
    setIsPaymentModalOpen(true);
  };

  // Open Payment History Modal
  const openHistoryModal = async (p: Production) => {
    setHistoryProduction(p);
    setIsHistoryModalOpen(true);
    setHistoryLoading(true);
    try {
      const res = await ProductionService.getPayments(p.id);
      setPaymentHistoryList(res.data.payments || []);
    } catch (err) {
      console.error("Failed to load payment history:", err);
      setPaymentHistoryList(p.payments || []);
    } finally {
      setHistoryLoading(false);
    }
  };

  // Form Submissions
  const handleAddProduction = async (e: FormEvent) => {
    e.preventDefault();
    setFormErrors({});

    const payload = {
      member_id: parseInt(memberId),
      product_type: productType,
      quantity: parseFloat(quantity),
      unit,
      unit_price: parsedUnitPrice > 0 ? parsedUnitPrice : 0,
      gross_amount: grossAmount,
      cbu_rate_per_kg: effectiveCbuRate,
      cbu_deduction: cbuDeduction,
      net_amount: netAmountPayable,
      source,
      remarks,
      production_date: productionDate,
      status
    };

    try {
      setSubmitLoading(true);
      await ProductionService.storeProduction(payload);
      setIsAddModalOpen(false);
      Swal.fire({
        title: "Production Recorded",
        html: `<p class="text-sm">Batch recorded successfully. CBU contribution of <b>${formatPHP(cbuDeduction)}</b> credited to member records.</p><p class="text-xs text-slate-500 mt-2">Member payment status set to <b>Unpaid</b>. Record payment when disbursed.</p>`,
        icon: "success",
        confirmButtonColor: "#1F6B3D"
      });
      fetchProductions(currentPage);
    } catch (err: any) {
      if (err.response && err.response.status === 422) {
        setFormErrors(err.response.data.errors);
      } else {
        Swal.fire("Error", "Failed to save production record.", "error");
      }
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleEditProduction = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedProduction) return;
    setFormErrors({});

    const payload = {
      member_id: parseInt(memberId),
      product_type: productType,
      quantity: parseFloat(quantity),
      unit,
      unit_price: parsedUnitPrice > 0 ? parsedUnitPrice : 0,
      gross_amount: grossAmount,
      cbu_rate_per_kg: effectiveCbuRate,
      cbu_deduction: cbuDeduction,
      net_amount: netAmountPayable,
      source,
      remarks,
      production_date: productionDate,
      status
    };

    try {
      setSubmitLoading(true);
      await ProductionService.updateProduction(selectedProduction.id, payload);
      setIsEditModalOpen(false);
      Swal.fire("Saved", "Production record updated successfully.", "success");
      fetchProductions(currentPage);
    } catch (err: any) {
      if (err.response && err.response.status === 422) {
        setFormErrors(err.response.data.errors);
      } else {
        Swal.fire("Error", "Failed to update production record.", "error");
      }
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleDeleteProduction = async (p: Production) => {
    const memberName = p.member ? `${p.member.firstname} ${p.member.lastname}` : "Farmer";
    const result = await Swal.fire({
      title: "Delete Production Batch?",
      text: `Are you sure you want to delete this batch of ${p.quantity}kg ${p.product_type} for ${memberName}? Any linked disbursement records will also be reversed.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#EF4444",
      cancelButtonColor: "#64748B",
      confirmButtonText: "Yes, delete",
      cancelButtonText: "Cancel"
    });

    if (!result.isConfirmed) return;

    try {
      await ProductionService.destroyProduction(p.id);
      Swal.fire("Deleted", "Production record deleted successfully.", "success");
      fetchProductions(currentPage);
    } catch (err) {
      console.error(err);
      Swal.fire("Error", "Failed to delete production record.", "error");
    }
  };

  // Submit Member Payment
  const handleRecordPayment = async (e: FormEvent) => {
    e.preventDefault();
    if (!paymentProduction) return;
    setPaymentErrors({});

    const amt = parseFloat(paymentAmount);
    const rem = parseFloat(paymentProduction.remaining_balance?.toString() || "0");

    if (isNaN(amt) || amt <= 0) {
      setPaymentErrors({ amount: ["Please enter a valid payment amount greater than 0."] });
      return;
    }

    if (amt > rem + 0.005) {
      setPaymentErrors({ amount: [`Payment amount (${formatPHP(amt)}) cannot exceed remaining balance (${formatPHP(rem)}).`] });
      return;
    }

    setPaymentLoading(true);
    try {
      const res = await ProductionService.recordPayment(paymentProduction.id, {
        amount: amt,
        payment_date: paymentDate,
        payment_method: paymentMethod,
        voucher_number: voucherNumber.trim() || undefined,
        approved_by: approvedBy.trim() || undefined,
        expense_account: expenseAccount.trim() || undefined,
        remarks: paymentRemarks.trim() || undefined,
      });

      setIsPaymentModalOpen(false);
      const voucher = res.data.payment?.voucher_number;
      Swal.fire({
        title: "Payment Recorded",
        html: `<p class="text-sm">Payment of <b>${formatPHP(amt)}</b> recorded under Cash Disbursement Voucher: <b class="font-mono text-emerald-700">${voucher}</b>.</p><p class="text-xs text-slate-500 mt-2">Cash Balance updated in Cash Disbursement Journal.</p>`,
        icon: "success",
        confirmButtonColor: "#1F6B3D"
      });
      fetchProductions(currentPage);
    } catch (err: any) {
      console.error("Payment error:", err);
      if (err.response && err.response.status === 422) {
        setPaymentErrors(err.response.data.errors || { amount: [err.response.data.message] });
      } else {
        const msg = err.response?.data?.message || "Failed to record member payment.";
        Swal.fire("Payment Error", msg, "error");
      }
    } finally {
      setPaymentLoading(false);
    }
  };

  // Overall Totals
  const totalQuantity = productions.reduce((acc, p) => acc + (parseFloat(p.quantity?.toString() || "0") || 0), 0);
  const totalGross = productions.reduce((acc, p) => acc + (parseFloat(p.gross_amount?.toString() || "0") || 0), 0);
  const totalCbu = productions.reduce((acc, p) => acc + (parseFloat(p.cbu_deduction?.toString() || "0") || 0), 0);
  const totalNet = productions.reduce((acc, p) => acc + (parseFloat(p.net_amount?.toString() || "0") || 0), 0);
  const totalPaid = productions.reduce((acc, p) => acc + (parseFloat(p.paid_amount?.toString() || "0") || 0), 0);
  const totalRemaining = productions.reduce((acc, p) => acc + (parseFloat(p.remaining_balance?.toString() || "0") || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header Panel */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-6 rounded-2xl border border-slate-100 shadow-xs gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-800">Production Recording & Member Payouts</h1>
            <span className="text-[11px] font-bold bg-primary/10 text-primary px-2.5 py-0.5 rounded-full">
              Separated Payout Architecture
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-0.5">
            Record delivered crop yields, auto-calculate approved CBU retention, and disburse member payments with official Cash Disbursement Vouchers.
          </p>
        </div>
        <button
          onClick={openAddModal}
          className="bg-primary hover:bg-primary-dark text-white font-semibold py-2.5 px-4 rounded-xl shadow-md hover:shadow-lg transition flex items-center gap-2 cursor-pointer text-sm"
        >
          <FiPlus className="w-4 h-4" />
          <span>Record Production</span>
        </button>
      </div>

      {/* Summary Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Deliveries (Current View)</span>
          <span className="text-lg font-black text-slate-800 mt-1 block">
            {totalQuantity.toLocaleString()} <span className="text-xs font-semibold text-slate-400">kg</span>
          </span>
          <span className="text-[11px] text-slate-500 mt-0.5 block">{productions.length} batches</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Gross Procurement</span>
          <span className="text-lg font-black text-slate-800 mt-1 block">
            {formatPHP(totalGross)}
          </span>
          <span className="text-[11px] text-amber-700 font-semibold mt-0.5 block">
            CBU: {formatPHP(totalCbu)}
          </span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-emerald-100 bg-emerald-50/20 shadow-xs">
          <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block">Disbursed Payouts</span>
          <span className="text-lg font-black text-emerald-700 mt-1 block">
            {formatPHP(totalPaid)}
          </span>
          <span className="text-[11px] text-emerald-600 font-medium mt-0.5 block">
            Recorded in Cash Disbursement
          </span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-rose-100 bg-rose-50/20 shadow-xs">
          <span className="text-[10px] font-bold text-rose-800 uppercase tracking-wider block">Remaining Unpaid Balance</span>
          <span className="text-lg font-black text-rose-700 mt-1 block">
            {formatPHP(totalRemaining)}
          </span>
          <span className="text-[11px] text-rose-600 font-medium mt-0.5 block">
            Awaiting member disbursement
          </span>
        </div>
      </div>

      {/* Filter Options */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4">
          <SearchBar value={search} onChange={setSearch} placeholder="Search member, code, farm, voucher #..." />

          <div className="flex flex-wrap items-center gap-3">
            <select
              value={productTypeFilter}
              onChange={(e) => setProductTypeFilter(e.target.value)}
              className="px-3.5 py-2 border border-slate-200 rounded-xl bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary text-xs font-semibold"
            >
              <option value="">All Products</option>
              {productTypesList.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>

            <select
              value={paymentStatusFilter}
              onChange={(e) => setPaymentStatusFilter(e.target.value)}
              className="px-3.5 py-2 border border-slate-200 rounded-xl bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary text-xs font-semibold"
            >
              <option value="">All Payment Statuses</option>
              {paymentStatusesList.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3.5 py-2 border border-slate-200 rounded-xl bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary text-xs font-semibold"
            >
              <option value="">All Batch Statuses</option>
              {statusesList.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Date Filters Row */}
        <div className="flex flex-wrap items-center gap-3 border-t border-slate-50 pt-4 text-xs font-semibold text-slate-500">
          <span className="uppercase tracking-wider">Date Filters:</span>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs font-medium text-slate-600 focus:ring-1 focus:ring-primary focus:outline-none bg-white"
            />
            <span>to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs font-medium text-slate-600 focus:ring-1 focus:ring-primary focus:outline-none bg-white"
            />
          </div>
          {(startDate || endDate) && (
            <button
              onClick={() => { setStartDate(""); setEndDate(""); }}
              className="text-primary hover:underline font-bold text-[11px] cursor-pointer"
            >
              Clear dates
            </button>
          )}
        </div>
      </div>

      {/* Production Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            <p className="text-slate-400 text-sm">Searching production registry...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100 text-xs">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-4 py-3.5 text-left">Date</th>
                  <th className="px-4 py-3.5 text-left">Member Farmer</th>
                  <th className="px-4 py-3.5 text-left">Product</th>
                  <th className="px-4 py-3.5 text-right">Quantity</th>
                  <th className="px-4 py-3.5 text-right">Price/Unit</th>
                  <th className="px-4 py-3.5 text-right">Gross Amount</th>
                  <th className="px-4 py-3.5 text-right">CBU Deducted</th>
                  <th className="px-4 py-3.5 text-right">Net Payable</th>
                  <th className="px-4 py-3.5 text-right bg-emerald-500/5 text-emerald-800">Paid</th>
                  <th className="px-4 py-3.5 text-right bg-rose-500/5 text-rose-800 font-black">Remaining</th>
                  <th className="px-4 py-3.5 text-center">Payment Status</th>
                  <th className="px-4 py-3.5 text-left">Status</th>
                  <th className="px-4 py-3.5 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {productions.length > 0 ? (
                  productions.map((p) => {
                    const price = p.unit_price ? parseFloat(p.unit_price.toString()) : 0;
                    const gross = p.gross_amount ? parseFloat(p.gross_amount.toString()) : (price > 0 ? price * parseFloat(p.quantity.toString()) : 0);
                    const cbu = p.cbu_deduction ? parseFloat(p.cbu_deduction.toString()) : 0;
                    const net = p.net_amount ? parseFloat(p.net_amount.toString()) : (gross > 0 ? Math.max(0, gross - cbu) : 0);
                    const paid = parseFloat(p.paid_amount?.toString() || "0");
                    const remaining = parseFloat(p.remaining_balance?.toString() || (net - paid).toFixed(2));
                    const pmtStatus = p.payment_status || (remaining <= 0 ? "Paid" : (paid > 0 ? "Partially Paid" : "Unpaid"));

                    return (
                      <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <span className="font-medium text-slate-600">
                            {p.production_date ? (typeof p.production_date === 'string' ? p.production_date.split('T')[0] : p.production_date) : ""}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          {p.member ? (
                            <div>
                              <span className="font-semibold text-slate-800">{p.member.firstname} {p.member.lastname}</span>
                              <span className="block text-[10px] text-slate-400 font-mono font-medium">{p.member.member_code}</span>
                            </div>
                          ) : (
                            <span className="text-slate-400 italic">Unknown Farmer</span>
                          )}
                        </td>
                        <td className="px-4 py-3.5 font-semibold text-slate-800 whitespace-nowrap">{p.product_type}</td>
                        <td className="px-4 py-3.5 text-right font-bold text-slate-700 whitespace-nowrap">
                          {parseFloat(p.quantity.toString()).toLocaleString()} {p.unit}
                        </td>
                        <td className="px-4 py-3.5 text-right text-slate-600 whitespace-nowrap">
                          {price > 0 ? formatPHP(price) : <span className="text-slate-350">—</span>}
                        </td>
                        <td className="px-4 py-3.5 text-right font-semibold text-slate-800 whitespace-nowrap">
                          {gross > 0 ? formatPHP(gross) : <span className="text-slate-350">—</span>}
                        </td>
                        <td className="px-4 py-3.5 text-right whitespace-nowrap">
                          {cbu > 0 ? (
                            <span className="font-semibold text-amber-700">-{formatPHP(cbu)}</span>
                          ) : (
                            <span className="text-slate-400">₱0.00</span>
                          )}
                        </td>
                        <td className="px-4 py-3.5 text-right font-bold text-slate-800 whitespace-nowrap">
                          {net > 0 ? formatPHP(net) : <span className="text-slate-350">—</span>}
                        </td>
                        <td className="px-4 py-3.5 text-right font-semibold text-emerald-700 bg-emerald-500/5 whitespace-nowrap">
                          {paid > 0 ? formatPHP(paid) : <span className="text-slate-300">₱0.00</span>}
                        </td>
                        <td className="px-4 py-3.5 text-right font-extrabold text-rose-700 bg-rose-500/5 whitespace-nowrap">
                          {formatPHP(remaining)}
                        </td>
                        <td className="px-4 py-3.5 text-center whitespace-nowrap">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            pmtStatus === 'Paid' 
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                              : pmtStatus === 'Partially Paid' 
                              ? 'bg-amber-50 text-amber-700 border border-amber-200' 
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}>
                            {pmtStatus === 'Paid' && <FiCheckCircle className="w-3 h-3 mr-1" />}
                            {pmtStatus}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            p.status === 'Completed' ? 'bg-green-50 text-green-700' :
                            p.status === 'Approved' ? 'bg-blue-50 text-blue-700' :
                            p.status === 'Pending' ? 'bg-amber-50 text-amber-700' :
                            'bg-red-50 text-red-750'
                          }`}>
                            {p.status}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-center whitespace-nowrap">
                          <div className="flex justify-center items-center gap-1">
                            {/* Pay Member Button */}
                            <button
                              onClick={() => openPaymentModal(p)}
                              title={pmtStatus === 'Paid' ? "Fully Paid" : "Pay Member"}
                              disabled={pmtStatus === 'Paid' || p.status === 'Cancelled'}
                              className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition"
                            >
                              <FiDollarSign className="w-4 h-4" />
                            </button>

                            {/* Payment History Button */}
                            <button
                              onClick={() => openHistoryModal(p)}
                              title="Payment History"
                              className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 cursor-pointer transition"
                            >
                              <FiClock className="w-4 h-4" />
                            </button>

                            {/* Edit Button */}
                            <button
                              onClick={() => openEditModal(p)}
                              title="Edit Record"
                              className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 cursor-pointer transition"
                            >
                              <FiEdit className="w-4 h-4" />
                            </button>

                            {/* Delete Button */}
                            <button
                              onClick={() => handleDeleteProduction(p)}
                              title="Delete Record"
                              className="p-1.5 rounded-lg text-red-655 hover:bg-red-50 cursor-pointer transition"
                            >
                              <FiTrash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={13} className="px-6 py-12 text-center text-slate-400 font-medium">
                      No production records found for the selection.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
        <Pagination currentPage={currentPage} lastPage={lastPage} onPageChange={handlePageChange} />
      </div>

      {/* RECORD PRODUCTION MODAL */}
      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} showCloseButton={true}>
        <div className="p-2 space-y-4">
          <div>
            <h3 className="text-lg font-bold text-slate-800">Record Farmer Production</h3>
            <p className="text-xs text-slate-500">Record member delivered crop batch, purchase price, and approved CBU deduction.</p>
          </div>

          {activeMembers.length === 0 ? (
            <div className="p-4 bg-amber-50 border-l-4 border-amber-500 text-amber-800 text-xs rounded-r-lg flex gap-2">
              <FiAlertTriangle className="w-5 h-5 shrink-0" />
              <div>
                <p className="font-bold">No Active Members Found</p>
                <p className="mt-0.5">Please add active members in the Member Module first before recording coconut productions.</p>
              </div>
            </div>
          ) : (
            <form onSubmit={handleAddProduction} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Select Member Farmer</label>
                <select
                  value={memberId}
                  onChange={(e) => setMemberId(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {activeMembers.map(m => (
                    <option key={m.id} value={m.id}>{m.member_code} - {m.firstname} {m.lastname}</option>
                  ))}
                </select>
                {formErrors.member_id && <p className="text-red-550 text-xs mt-1">{formErrors.member_id[0]}</p>}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Product Type</label>
                  <select
                    value={productType}
                    onChange={(e) => setProductType(e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    {productTypesList.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Production Date</label>
                  <input
                    type="date"
                    required
                    value={productionDate}
                    onChange={(e) => setProductionDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-white"
                  />
                  {formErrors.production_date && <p className="text-red-550 text-xs mt-1">{formErrors.production_date[0]}</p>}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Quantity Delivered</label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.01"
                      required
                      min="0.01"
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                      placeholder="0.00"
                      className="w-full pl-3 pr-12 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-white"
                    />
                    <span className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-sm font-semibold text-slate-400 pointer-events-none">
                      {unit}
                    </span>
                  </div>
                  {formErrors.quantity && <p className="text-red-555 text-xs mt-1">{formErrors.quantity[0]}</p>}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Purchase Price per Unit (₱)</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-sm font-semibold text-slate-400 pointer-events-none">
                      ₱
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={unitPrice}
                      onChange={(e) => setUnitPrice(e.target.value)}
                      placeholder="0.00"
                      className="w-full pl-8 pr-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-white font-semibold"
                    />
                  </div>
                  {formErrors.unit_price && <p className="text-red-555 text-xs mt-1">{formErrors.unit_price[0]}</p>}
                </div>
              </div>

              {/* Purchase & CBU Computation Breakdown */}
              <div className="bg-slate-50/80 border border-slate-200/90 rounded-xl p-3.5 space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-700 border-b border-slate-200 pb-2">
                  <span>Purchase & CBU Computation</span>
                  {hasCbuConfigured ? (
                    <span className="inline-flex items-center text-[11px] font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-md">
                      Configured Rate: {formatPHP(effectiveCbuRate)}/{unit}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-100/80 px-2 py-0.5 rounded-md">
                      <FiAlertTriangle className="w-3 h-3 shrink-0" />
                      CBU rate not configured
                    </span>
                  )}
                </div>

                <div className="space-y-1.5 text-xs text-slate-600 font-medium">
                  <div className="flex justify-between items-center">
                    <span>Gross Amount</span>
                    <span className="font-bold text-slate-800">{formatPHP(grossAmount)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>
                      CBU Deduction {hasCbuConfigured ? `(${parsedQty.toLocaleString()} ${unit} × ${formatPHP(effectiveCbuRate)})` : '(Not deducted)'}
                    </span>
                    <span className={`font-bold ${cbuDeduction > 0 ? 'text-amber-700' : 'text-slate-400'}`}>
                      {cbuDeduction > 0 ? `- ${formatPHP(cbuDeduction)}` : formatPHP(0)}
                    </span>
                  </div>
                  <div className="pt-2 border-t border-slate-200 flex justify-between items-center text-sm font-bold">
                    <span className="text-slate-800">Net Amount Payable</span>
                    <span className="text-primary text-base font-extrabold">{formatPHP(netAmountPayable)}</span>
                  </div>
                </div>

                <div className="mt-2 pt-2 border-t border-slate-200/60 text-[11px] text-slate-500 flex items-start gap-1.5">
                  <FiInfo className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                  <span>
                    Production recording creates a pending payable (Unpaid). Actual cash outflow is recorded in Cash Disbursement Journal when CASCOFAMCO pays the member.
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Source Farm Location</label>
                  <input
                    type="text"
                    required
                    value={source}
                    onChange={(e) => setSource(e.target.value)}
                    placeholder="e.g. Brgy. Tabuc, Pontevedra"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-white"
                  />
                  {formErrors.source && <p className="text-red-555 text-xs mt-1">{formErrors.source[0]}</p>}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    {statusesList.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Remarks</label>
                <textarea
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="Optional notes regarding coconut quality, scale variance, etc."
                  rows={2}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-white"
                ></textarea>
              </div>

              <div className="flex gap-3 justify-end pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-sm font-semibold border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-500 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitLoading}
                  className="px-5 py-2 text-sm font-semibold bg-primary hover:bg-primary-dark text-white rounded-xl shadow-md transition cursor-pointer disabled:opacity-50"
                >
                  {submitLoading ? "Saving..." : "Save Record"}
                </button>
              </div>
            </form>
          )}
        </div>
      </Modal>

      {/* EDIT PRODUCTION MODAL */}
      <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} showCloseButton={true}>
        <div className="p-2 space-y-4">
          <div>
            <h3 className="text-lg font-bold text-slate-800">Edit Production Entry</h3>
            <p className="text-xs text-slate-500">Edit record data for Entry ID: <span className="font-semibold text-primary">{selectedProduction?.id}</span></p>
          </div>

          <form onSubmit={handleEditProduction} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Select Member Farmer</label>
              <select
                value={memberId}
                onChange={(e) => setMemberId(e.target.value)}
                required
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {activeMembers.map(m => (
                  <option key={m.id} value={m.id}>{m.member_code} - {m.firstname} {m.lastname}</option>
                ))}
              </select>
              {formErrors.member_id && <p className="text-red-550 text-xs mt-1">{formErrors.member_id[0]}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Product Type</label>
                <select
                  value={productType}
                  onChange={(e) => setProductType(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {productTypesList.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Production Date</label>
                <input
                  type="date"
                  required
                  value={productionDate}
                  onChange={(e) => setProductionDate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-white"
                />
                {formErrors.production_date && <p className="text-red-550 text-xs mt-1">{formErrors.production_date[0]}</p>}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Quantity Delivered</label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    required
                    min="0.01"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    placeholder="0.00"
                    className="w-full pl-3 pr-12 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-white"
                  />
                  <span className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-sm font-semibold text-slate-400 pointer-events-none">
                    {unit}
                  </span>
                </div>
                {formErrors.quantity && <p className="text-red-555 text-xs mt-1">{formErrors.quantity[0]}</p>}
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Purchase Price per Unit (₱)</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-sm font-semibold text-slate-400 pointer-events-none">
                    ₱
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={unitPrice}
                    onChange={(e) => setUnitPrice(e.target.value)}
                    placeholder="0.00"
                    className="w-full pl-8 pr-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-white font-semibold"
                  />
                </div>
                {formErrors.unit_price && <p className="text-red-555 text-xs mt-1">{formErrors.unit_price[0]}</p>}
              </div>
            </div>

            {/* Purchase & CBU Computation Breakdown */}
            <div className="bg-slate-50/80 border border-slate-200/90 rounded-xl p-3.5 space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-700 border-b border-slate-200 pb-2">
                <span>Purchase & CBU Computation</span>
                {hasCbuConfigured ? (
                  <span className="inline-flex items-center text-[11px] font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-md">
                    Configured Rate: {formatPHP(effectiveCbuRate)}/{unit}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-100/80 px-2 py-0.5 rounded-md">
                    <FiAlertTriangle className="w-3 h-3 shrink-0" />
                    CBU rate not configured
                  </span>
                )}
              </div>

              <div className="space-y-1.5 text-xs text-slate-600 font-medium">
                <div className="flex justify-between items-center">
                  <span>Gross Amount</span>
                  <span className="font-bold text-slate-800">{formatPHP(grossAmount)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>
                    CBU Deduction {hasCbuConfigured ? `(${parsedQty.toLocaleString()} ${unit} × ${formatPHP(effectiveCbuRate)})` : '(Not deducted)'}
                  </span>
                  <span className={`font-bold ${cbuDeduction > 0 ? 'text-amber-700' : 'text-slate-400'}`}>
                    {cbuDeduction > 0 ? `- ${formatPHP(cbuDeduction)}` : formatPHP(0)}
                  </span>
                </div>
                <div className="pt-2 border-t border-slate-200 flex justify-between items-center text-sm font-bold">
                  <span className="text-slate-800">Net Amount Payable</span>
                  <span className="text-primary text-base font-extrabold">{formatPHP(netAmountPayable)}</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Source Farm Location</label>
                <input
                  type="text"
                  required
                  value={source}
                  onChange={(e) => setSource(e.target.value)}
                  placeholder="e.g. Brgy. Tabuc, Pontevedra"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-white"
                />
                {formErrors.source && <p className="text-red-555 text-xs mt-1">{formErrors.source[0]}</p>}
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {statusesList.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Remarks</label>
              <textarea
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="Optional notes..."
                rows={2}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-white"
              ></textarea>
            </div>

            <div className="flex gap-3 justify-end pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="px-4 py-2 text-sm font-semibold border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-500 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitLoading}
                className="px-5 py-2 text-sm font-semibold bg-primary hover:bg-primary-dark text-white rounded-xl shadow-md transition cursor-pointer disabled:opacity-50"
              >
                {submitLoading ? "Updating..." : "Update Entry"}
              </button>
            </div>
          </form>
        </div>
      </Modal>

      {/* =========================================================================
          RECORD MEMBER PAYMENT MODAL
          ========================================================================= */}
      <Modal isOpen={isPaymentModalOpen} onClose={() => setIsPaymentModalOpen(false)} showCloseButton={true}>
        {paymentProduction && (
          <div className="p-2 space-y-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="p-2 bg-emerald-50 text-emerald-700 rounded-xl">
                  <FiDollarSign className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="text-lg font-bold text-slate-800">Record Member Payment</h3>
                  <p className="text-xs text-slate-400">
                    Disburse payout to member via Cash Disbursement Journal entry
                  </p>
                </div>
              </div>
            </div>

            {/* Member & Production Info Card */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 space-y-3 text-xs">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Payee Member</span>
                  <span className="text-sm font-bold text-slate-800 block">
                    {paymentProduction.member?.firstname} {paymentProduction.member?.lastname}
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">{paymentProduction.member?.member_code}</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Batch Reference</span>
                  <span className="font-bold text-slate-700 text-xs">Production #{paymentProduction.id}</span>
                  <span className="text-[10px] text-slate-400 block">{paymentProduction.quantity} {paymentProduction.unit} {paymentProduction.product_type}</span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-200 text-center">
                <div className="bg-white p-2 rounded-lg border border-slate-100">
                  <span className="text-[9px] font-bold text-slate-400 uppercase block">Net Payable</span>
                  <span className="text-xs font-bold text-slate-800 mt-0.5 block">
                    {formatPHP(parseFloat(paymentProduction.net_amount?.toString() || "0"))}
                  </span>
                </div>
                <div className="bg-white p-2 rounded-lg border border-slate-100">
                  <span className="text-[9px] font-bold text-slate-400 uppercase block">Already Paid</span>
                  <span className="text-xs font-bold text-emerald-700 mt-0.5 block">
                    {formatPHP(parseFloat(paymentProduction.paid_amount?.toString() || "0"))}
                  </span>
                </div>
                <div className="bg-white p-2 rounded-lg border border-rose-100 bg-rose-50/30">
                  <span className="text-[9px] font-bold text-rose-700 uppercase block">Remaining Balance</span>
                  <span className="text-xs font-black text-rose-700 mt-0.5 block">
                    {formatPHP(parseFloat(paymentProduction.remaining_balance?.toString() || "0"))}
                  </span>
                </div>
              </div>
            </div>

            {/* Payment Form */}
            <form onSubmit={handleRecordPayment} className="space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* Payment Amount */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="block text-xs font-bold text-slate-600 uppercase">Payment Amount (₱)</label>
                    <button
                      type="button"
                      onClick={() => setPaymentAmount(parseFloat(paymentProduction.remaining_balance?.toString() || "0").toFixed(2))}
                      className="text-[10px] text-primary hover:underline font-bold cursor-pointer"
                    >
                      Full Balance
                    </button>
                  </div>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-sm font-semibold text-slate-400 pointer-events-none">
                      ₱
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      max={parseFloat(paymentProduction.remaining_balance?.toString() || "0") + 0.005}
                      required
                      value={paymentAmount}
                      onChange={(e) => setPaymentAmount(e.target.value)}
                      placeholder="0.00"
                      className="w-full pl-8 pr-3 py-2 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary bg-white"
                    />
                  </div>
                  {paymentErrors.amount && <p className="text-red-500 text-xs mt-1">{paymentErrors.amount[0]}</p>}
                </div>

                {/* Payment Date */}
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Payment Date</label>
                  <input
                    type="date"
                    required
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-white text-slate-700 font-medium"
                  />
                  {paymentErrors.payment_date && <p className="text-red-500 text-xs mt-1">{paymentErrors.payment_date[0]}</p>}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* Payment Method */}
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Payment Method</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as any)}
                    required
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary text-slate-800 font-medium cursor-pointer"
                  >
                    {paymentMethodsList.map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>

                {/* Disbursement Voucher Number */}
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Disbursement Voucher #</label>
                  <input
                    type="text"
                    value={voucherNumber}
                    onChange={(e) => setVoucherNumber(e.target.value)}
                    placeholder="Auto-generated (CDV-YYYY-XXXX)"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-mono text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary bg-white"
                  />
                  {paymentErrors.voucher_number && <p className="text-red-500 text-xs mt-1">{paymentErrors.voucher_number[0]}</p>}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* Expense Account */}
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Expense Account</label>
                  <select
                    value={expenseAccount}
                    onChange={(e) => setExpenseAccount(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary text-slate-700 text-xs font-medium cursor-pointer"
                  >
                    {expenseAccountsList.map(acc => (
                      <option key={acc} value={acc}>{acc}</option>
                    ))}
                  </select>
                </div>

                {/* Approved By */}
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Approved By</label>
                  <input
                    type="text"
                    required
                    value={approvedBy}
                    onChange={(e) => setApprovedBy(e.target.value)}
                    placeholder="e.g. General Manager / Treasurer"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-white text-slate-700 font-medium"
                  />
                </div>
              </div>

              {/* Remarks */}
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Payment Remarks</label>
                <textarea
                  rows={2}
                  value={paymentRemarks}
                  onChange={(e) => setPaymentRemarks(e.target.value)}
                  placeholder="Optional reference notes (e.g. check number, bank transfer reference)..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-white text-slate-700"
                ></textarea>
              </div>

              {/* Dynamic Post-Payment Preview */}
              {parseFloat(paymentAmount) > 0 && (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs flex justify-between items-center font-medium text-slate-600">
                  <div>
                    <span>Remaining after payout: </span>
                    <b className="text-slate-800">
                      {formatPHP(Math.max(0, parseFloat(paymentProduction.remaining_balance?.toString() || "0") - parseFloat(paymentAmount)))}
                    </b>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                    parseFloat(paymentAmount) >= parseFloat(paymentProduction.remaining_balance?.toString() || "0")
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}>
                    {parseFloat(paymentAmount) >= parseFloat(paymentProduction.remaining_balance?.toString() || "0")
                      ? 'Will be Fully Paid'
                      : 'Will be Partially Paid'}
                  </span>
                </div>
              )}

              <div className="flex gap-3 justify-end pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsPaymentModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-500 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={paymentLoading}
                  className="px-5 py-2 text-xs font-bold bg-primary hover:bg-primary-dark text-white rounded-xl shadow-md transition cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                >
                  {paymentLoading ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Recording Payment...</span>
                    </>
                  ) : (
                    <>
                      <FiDollarSign className="w-4 h-4" />
                      <span>Confirm Disbursement</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}
      </Modal>

      {/* =========================================================================
          PAYMENT HISTORY MODAL
          ========================================================================= */}
      <Modal isOpen={isHistoryModalOpen} onClose={() => setIsHistoryModalOpen(false)} showCloseButton={true}>
        {historyProduction && (
          <div className="p-2 space-y-4">
            <div className="flex justify-between items-start border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] uppercase font-bold text-primary tracking-widest block">Payment History & Audit</span>
                <h3 className="text-lg font-bold text-slate-800 mt-0.5">
                  Production #{historyProduction.id} — {historyProduction.member?.firstname} {historyProduction.member?.lastname}
                </h3>
                <p className="text-xs text-slate-400">
                  Delivered {historyProduction.quantity} {historyProduction.unit} of {historyProduction.product_type} on {historyProduction.production_date ? (typeof historyProduction.production_date === 'string' ? historyProduction.production_date.split('T')[0] : historyProduction.production_date) : ""}
                </p>
              </div>
              <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                historyProduction.payment_status === 'Paid' 
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                  : historyProduction.payment_status === 'Partially Paid' 
                  ? 'bg-amber-50 text-amber-700 border border-amber-200' 
                  : 'bg-rose-50 text-rose-700 border border-rose-200'
              }`}>
                {historyProduction.payment_status || "Unpaid"}
              </span>
            </div>

            {/* Financial Summary */}
            <div className="grid grid-cols-3 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-100 text-xs">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Net Payable</span>
                <span className="text-sm font-extrabold text-slate-800 mt-0.5 block">
                  {formatPHP(parseFloat(historyProduction.net_amount?.toString() || "0"))}
                </span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Total Disbursed</span>
                <span className="text-sm font-extrabold text-emerald-700 mt-0.5 block">
                  {formatPHP(parseFloat(historyProduction.paid_amount?.toString() || "0"))}
                </span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Remaining Balance</span>
                <span className="text-sm font-extrabold text-rose-700 mt-0.5 block">
                  {formatPHP(parseFloat(historyProduction.remaining_balance?.toString() || "0"))}
                </span>
              </div>
            </div>

            {/* Transactions Table */}
            <div>
              <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
                Disbursement Transactions
              </h4>

              {historyLoading ? (
                <div className="py-8 text-center text-slate-400">
                  <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                  <p className="text-xs font-medium">Loading disbursement records...</p>
                </div>
              ) : paymentHistoryList.length > 0 ? (
                <div className="border border-slate-100 rounded-xl overflow-hidden">
                  <table className="min-w-full divide-y divide-slate-100 text-xs">
                    <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[9px]">
                      <tr>
                        <th className="px-3 py-2.5 text-left">Voucher #</th>
                        <th className="px-3 py-2.5 text-left">Date</th>
                        <th className="px-3 py-2.5 text-right">Amount</th>
                        <th className="px-3 py-2.5 text-left">Method</th>
                        <th className="px-3 py-2.5 text-left">Approved By</th>
                        <th className="px-3 py-2.5 text-left">Remarks</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700 bg-white">
                      {paymentHistoryList.map((pmt) => (
                        <tr key={pmt.id} className="hover:bg-slate-50/50">
                          <td className="px-3 py-2.5 font-mono font-bold text-primary whitespace-nowrap">
                            {pmt.voucher_number}
                          </td>
                          <td className="px-3 py-2.5 whitespace-nowrap">
                            {typeof pmt.payment_date === 'string' ? pmt.payment_date.split('T')[0] : pmt.payment_date}
                          </td>
                          <td className="px-3 py-2.5 text-right font-extrabold text-emerald-700 whitespace-nowrap">
                            {formatPHP(parseFloat(pmt.amount.toString()))}
                          </td>
                          <td className="px-3 py-2.5 whitespace-nowrap">
                            <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[10px] font-semibold">
                              {pmt.payment_method}
                            </span>
                          </td>
                          <td className="px-3 py-2.5 text-slate-600 whitespace-nowrap">
                            {pmt.approved_by || "General Manager"}
                          </td>
                          <td className="px-3 py-2.5 text-slate-500 truncate max-w-[150px]" title={pmt.remarks || ""}>
                            {pmt.remarks || "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="py-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200 p-6 space-y-1">
                  <FiAlertTriangle className="w-6 h-6 text-slate-300 mx-auto" />
                  <p className="text-xs font-semibold text-slate-600">No member disbursements recorded yet.</p>
                  <p className="text-[11px] text-slate-400">
                    Use the "Pay Member" button on the production table to disburse full or partial payment.
                  </p>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsHistoryModalOpen(false)}
                className="px-5 py-2 text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition cursor-pointer"
              >
                Close History
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default ProductionsPage;
