import React, { useState, useEffect, type FormEvent } from "react";
import LoanService from "../../services/LoanService";
import MemberService from "../../services/MemberService";
import type {
  MemberLoan,
  LoanTotals,
  LoanEligibility,
  LoanStatus,
  PaymentMethod,
  ApplyLoanPayload,
  ApproveLoanPayload,
  ReleaseLoanPayload,
  RecordRepaymentPayload,
  LoanRepayment,
  Member,
} from "../../Interfaces";
import Pagination from "../../components/Pagination";
import Modal from "../../components/Modal";
import {
  FiPlus,
  FiSearch,
  FiEye,
  FiCheckCircle,
  FiXCircle,
  FiDollarSign,
  FiList,
  FiAlertCircle,
  FiRefreshCw,
  FiX,
  FiFilter,
  FiCreditCard,
  FiTrendingDown,
  FiClock,
  FiSlash,
  FiCalendar,
  FiTag,
} from "react-icons/fi";
import { TbCurrencyPeso } from "react-icons/tb";
import Swal from "sweetalert2";

// ── Helpers ───────────────────────────────────────────────────────────────────

const peso = (v: number | string | null | undefined) =>
  `₱${Number(v ?? 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const pct = (v: number | string | null | undefined) =>
  `${(Number(v ?? 0) * 100).toFixed(2)}%`;

const today = () => new Date().toISOString().split("T")[0];

const STATUS_COLORS: Record<LoanStatus, string> = {
  Pending: "bg-amber-50 text-amber-700 border-amber-200",
  Approved: "bg-blue-50 text-blue-700 border-blue-200",
  Released: "bg-violet-50 text-violet-700 border-violet-200",
  Active: "bg-emerald-50 text-emerald-700 border-emerald-200",
  "Fully Paid": "bg-slate-100 text-slate-600 border-slate-200",
  Rejected: "bg-red-50 text-red-700 border-red-200",
  Cancelled: "bg-slate-50 text-slate-400 border-slate-200",
};

const LOAN_TYPES = ["Regular", "Emergency", "Agricultural", "Special"];
const PAYMENT_METHODS: PaymentMethod[] = ["Cash", "GCash", "Bank Transfer", "Check"];

// ── Component ─────────────────────────────────────────────────────────────────

const LoansPage = () => {
  // ── Tab ──────────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<"loans" | "repayments">("loans");

  // ── Loan List State ───────────────────────────────────────────────────────
  const [loans, setLoans] = useState<MemberLoan[]>([]);
  const [totals, setTotals] = useState<LoanTotals>({
    total_loans: 0,
    total_pending: 0,
    total_active: 0,
    total_outstanding_amount: 0,
    total_released_amount: 0,
  });
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [loanTypeFilter, setLoanTypeFilter] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // ── Active Members (for dropdowns) ────────────────────────────────────────
  const [activeMembers, setActiveMembers] = useState<Member[]>([]);

  // ── Selected Loan (detail view) ───────────────────────────────────────────
  const [selectedLoan, setSelectedLoan] = useState<MemberLoan | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // ── Eligibility Panel ─────────────────────────────────────────────────────
  const [eligibility, setEligibility] = useState<LoanEligibility | null>(null);
  const [eligibilityLoading, setEligibilityLoading] = useState(false);

  // ── Repayments Tab ────────────────────────────────────────────────────────
  const [repayments, setRepayments] = useState<LoanRepayment[]>([]);
  const [repayPage, setRepayPage] = useState(1);
  const [repayLastPage, setRepayLastPage] = useState(1);
  const [repayLoading, setRepayLoading] = useState(false);
  const [repaySummary, setRepaySummary] = useState<{
    total_paid: number;
    total_principal_paid: number;
    total_interest_paid: number;
    outstanding_balance: number;
    loan_status: LoanStatus;
  } | null>(null);

  // ── Modals ────────────────────────────────────────────────────────────────
  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);
  const [isApproveModalOpen, setIsApproveModalOpen] = useState(false);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [isReleaseModalOpen, setIsReleaseModalOpen] = useState(false);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [isRepayModalOpen, setIsRepayModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // ── Apply Form ────────────────────────────────────────────────────────────
  const [applyMemberId, setApplyMemberId] = useState<number | string>("");
  const [applyAmount, setApplyAmount] = useState("");
  const [applyDate, setApplyDate] = useState(today());
  const [applyPurpose, setApplyPurpose] = useState("");
  const [applyTerm, setApplyTerm] = useState("");
  const [applyRate, setApplyRate] = useState("");
  const [applyLoanType, setApplyLoanType] = useState("Regular");
  const [applyRemarks, setApplyRemarks] = useState("");
  const [applySubmitting, setApplySubmitting] = useState(false);

  // ── Approve Form ──────────────────────────────────────────────────────────
  const [approveLoanId, setApproveLoanId] = useState<number | string>("");
  const [approveAmount, setApproveAmount] = useState("");
  const [approveDate, setApproveDate] = useState(today());
  const [approveBy, setApproveBy] = useState("");
  const [approveTerm, setApproveTerm] = useState("");
  const [approveRate, setApproveRate] = useState("");
  const [approveLoanType, setApproveLoanType] = useState("Regular");
  const [approveRemarks, setApproveRemarks] = useState("");
  const [approveSubmitting, setApproveSubmitting] = useState(false);

  // ── Reject / Cancel Form ──────────────────────────────────────────────────
  const [actionLoanId, setActionLoanId] = useState<number | string>("");
  const [actionRemarks, setActionRemarks] = useState("");
  const [actionSubmitting, setActionSubmitting] = useState(false);

  // ── Release Form ──────────────────────────────────────────────────────────
  const [releaseDate, setReleaseDate] = useState(today());
  const [releaseMethod, setReleaseMethod] = useState<PaymentMethod>("Cash");
  const [releaseBy, setReleaseBy] = useState("");
  const [releaseRemarks, setReleaseRemarks] = useState("");
  const [releaseSubmitting, setReleaseSubmitting] = useState(false);

  // ── Repayment Form ────────────────────────────────────────────────────────
  const [repayDate, setRepayDate] = useState(today());
  const [repayAmount, setRepayAmount] = useState("");
  const [repayPrincipal, setRepayPrincipal] = useState("");
  const [repayInterest, setRepayInterest] = useState("");
  const [repayMethod, setRepayMethod] = useState<PaymentMethod>("Cash");
  const [repayOrNumber, setRepayOrNumber] = useState("");
  const [repayRemarks, setRepayRemarks] = useState("");
  const [repaySyncReceipt, setRepaySyncReceipt] = useState(true);
  const [repaySubmitting, setRepaySubmitting] = useState(false);

  // ── Data Fetching ─────────────────────────────────────────────────────────

  const fetchLoans = async (p: number = 1) => {
    try {
      setLoading(true);
      const res = await LoanService.getLoans({
        page: p,
        search,
        status: statusFilter,
        start_date: startDate,
        end_date: endDate,
      });
      setLoans(res.data.loans.data ?? []);
      setPage(res.data.loans.current_page ?? 1);
      setLastPage(res.data.loans.last_page ?? 1);
      setTotals(res.data.totals);
    } catch (err: any) {
      if (err?.response?.status !== 401) {
        console.error("Failed to load loans:", err);
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchActiveMembers = async () => {
    try {
      const res = await MemberService.loadMembers(1, "", "Active", "", 200);
      setActiveMembers(res.data.data ?? []);
    } catch (err) {
      console.error("Failed to load active members:", err);
    }
  };

  const fetchEligibility = async (memberId: number | string) => {
    if (!memberId) { setEligibility(null); return; }
    try {
      setEligibilityLoading(true);
      const res = await LoanService.getEligibility(memberId);
      setEligibility(res.data);
    } catch {
      setEligibility(null);
    } finally {
      setEligibilityLoading(false);
    }
  };

  const openDetail = async (loan: MemberLoan) => {
    setSelectedLoan(loan);
    setIsDetailModalOpen(true);
    try {
      setDetailLoading(true);
      const res = await LoanService.getLoan(loan.id);
      setSelectedLoan(res.data.loan);
    } catch (err) {
      console.error("Failed to load loan detail:", err);
    } finally {
      setDetailLoading(false);
    }
  };

  const fetchRepayments = async (loanId: number | string, p: number = 1) => {
    if (!loanId) return;
    try {
      setRepayLoading(true);
      const res = await LoanService.getRepayments(loanId, p);
      setRepayments(res.data.repayments.data ?? []);
      setRepayPage(res.data.repayments.current_page ?? 1);
      setRepayLastPage(res.data.repayments.last_page ?? 1);
      setRepaySummary(res.data.summary);
    } catch (err) {
      console.error("Failed to load repayments:", err);
    } finally {
      setRepayLoading(false);
    }
  };

  useEffect(() => {
    fetchLoans(1);
    fetchActiveMembers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, statusFilter, loanTypeFilter, startDate, endDate]);

  useEffect(() => {
    if (activeTab === "repayments" && selectedLoan) {
      fetchRepayments(selectedLoan.id, 1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, selectedLoan?.id]);

  useEffect(() => {
    fetchEligibility(applyMemberId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [applyMemberId]);

  // ── Open Approve Modal ────────────────────────────────────────────────────
  const openApproveModal = (loan: MemberLoan) => {
    setApproveLoanId(loan.id);
    setApproveAmount(String(loan.requested_amount));
    setApproveDate(today());
    setApproveBy("");
    setApproveTerm(loan.term_months ? String(loan.term_months) : "");
    setApproveRate(loan.interest_rate ? String(Number(loan.interest_rate) * 100) : "");
    setApproveLoanType((loan as any).loan_type ?? "Regular");
    setApproveRemarks("");
    setIsApproveModalOpen(true);
  };

  // ── Open Reject Modal ─────────────────────────────────────────────────────
  const openRejectModal = (loan: MemberLoan) => {
    setActionLoanId(loan.id);
    setActionRemarks("");
    setIsRejectModalOpen(true);
  };

  // ── Open Cancel Modal ─────────────────────────────────────────────────────
  const openCancelModal = (loan: MemberLoan) => {
    setActionLoanId(loan.id);
    setActionRemarks("");
    setIsCancelModalOpen(true);
  };

  // ── Open Release Modal ────────────────────────────────────────────────────
  const openReleaseModal = (loan: MemberLoan) => {
    setSelectedLoan(loan);
    setReleaseDate(today());
    setReleaseMethod("Cash");
    setReleaseBy("");
    setReleaseRemarks("");
    setIsReleaseModalOpen(true);
  };

  // ── Open Repay Modal ──────────────────────────────────────────────────────
  const openRepayModal = (loan: MemberLoan) => {
    setSelectedLoan(loan);
    setRepayDate(today());
    setRepayAmount("");
    setRepayPrincipal("");
    setRepayInterest("");
    setRepayMethod("Cash");
    setRepayOrNumber("");
    setRepayRemarks("");
    setRepaySyncReceipt(true);
    setIsRepayModalOpen(true);
  };

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleApplySubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!applyMemberId || !applyAmount || Number(applyAmount) <= 0) {
      Swal.fire("Validation Error", "Member and requested amount are required.", "warning");
      return;
    }
    const payload: ApplyLoanPayload & { loan_type?: string } = {
      member_id: Number(applyMemberId),
      requested_amount: Number(applyAmount),
      application_date: applyDate,
      loan_purpose: applyPurpose || undefined,
      term_months: applyTerm ? Number(applyTerm) : null,
      interest_rate: applyRate ? Number(applyRate) / 100 : null,
      loan_type: applyLoanType,
      remarks: applyRemarks || undefined,
    };
    try {
      setApplySubmitting(true);
      await LoanService.applyLoan(payload as ApplyLoanPayload);
      setIsApplyModalOpen(false);
      Swal.fire({
        icon: "success",
        title: "Loan Application Submitted!",
        text: "The application is now Pending for review.",
        confirmButtonColor: "#059669",
      });
      fetchLoans(1);
    } catch (err: any) {
      Swal.fire("Error", err?.response?.data?.message ?? "Failed to submit application.", "error");
    } finally {
      setApplySubmitting(false);
    }
  };

  const handleApproveSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!approveAmount || Number(approveAmount) <= 0) {
      Swal.fire("Validation Error", "Approved amount is required.", "warning");
      return;
    }
    const payload: ApproveLoanPayload & { loan_type?: string } = {
      approved_amount: Number(approveAmount),
      approval_date: approveDate,
      approved_by: approveBy || undefined,
      term_months: approveTerm ? Number(approveTerm) : null,
      interest_rate: approveRate ? Number(approveRate) / 100 : null,
      loan_type: approveLoanType,
      remarks: approveRemarks || undefined,
    };
    try {
      setApproveSubmitting(true);
      await LoanService.approveLoan(approveLoanId, payload as ApproveLoanPayload);
      setIsApproveModalOpen(false);
      Swal.fire({ icon: "success", title: "Loan Approved!", confirmButtonColor: "#059669" });
      fetchLoans(page);
    } catch (err: any) {
      Swal.fire("Error", err?.response?.data?.message ?? "Failed to approve loan.", "error");
    } finally {
      setApproveSubmitting(false);
    }
  };

  const handleRejectSubmit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      setActionSubmitting(true);
      await LoanService.rejectLoan(actionLoanId, { remarks: actionRemarks || undefined });
      setIsRejectModalOpen(false);
      Swal.fire({ icon: "info", title: "Loan Rejected.", confirmButtonColor: "#059669" });
      fetchLoans(page);
    } catch (err: any) {
      Swal.fire("Error", err?.response?.data?.message ?? "Failed to reject loan.", "error");
    } finally {
      setActionSubmitting(false);
    }
  };

  const handleCancelSubmit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      setActionSubmitting(true);
      await LoanService.cancelLoan(actionLoanId, { remarks: actionRemarks || undefined });
      setIsCancelModalOpen(false);
      Swal.fire({ icon: "info", title: "Loan Cancelled.", confirmButtonColor: "#059669" });
      fetchLoans(page);
    } catch (err: any) {
      Swal.fire("Error", err?.response?.data?.message ?? "Failed to cancel loan.", "error");
    } finally {
      setActionSubmitting(false);
    }
  };

  const handleReleaseSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedLoan) return;
    const payload: ReleaseLoanPayload = {
      release_date: releaseDate,
      release_payment_method: releaseMethod,
      approved_by: releaseBy || undefined,
      remarks: releaseRemarks || undefined,
    };
    try {
      setReleaseSubmitting(true);
      await LoanService.releaseLoan(selectedLoan.id, payload);
      setIsReleaseModalOpen(false);
      Swal.fire({
        icon: "success",
        title: "Loan Released!",
        text: "Funds disbursed and recorded in Cash Disbursement Journal.",
        confirmButtonColor: "#059669",
      });
      fetchLoans(page);
    } catch (err: any) {
      Swal.fire("Error", err?.response?.data?.message ?? "Failed to release loan.", "error");
    } finally {
      setReleaseSubmitting(false);
    }
  };

  const handleRepaySubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedLoan) return;
    if (!repayAmount || Number(repayAmount) <= 0) {
      Swal.fire("Validation Error", "Payment amount must be greater than zero.", "warning");
      return;
    }
    const payload: RecordRepaymentPayload = {
      payment_date: repayDate,
      amount_paid: Number(repayAmount),
      principal_paid: repayPrincipal ? Number(repayPrincipal) : null,
      interest_paid: repayInterest ? Number(repayInterest) : null,
      payment_method: repayMethod,
      or_number: repayOrNumber || undefined,
      remarks: repayRemarks || undefined,
      sync_cash_receipt: repaySyncReceipt,
    };
    try {
      setRepaySubmitting(true);
      await LoanService.recordRepayment(selectedLoan.id, payload);
      setIsRepayModalOpen(false);
      Swal.fire({
        icon: "success",
        title: "Repayment Recorded!",
        text: `Payment of ${peso(repayAmount)} recorded and synced with Cash Receipts Journal.`,
        confirmButtonColor: "#059669",
      });
      fetchLoans(page);
      if (activeTab === "repayments") fetchRepayments(selectedLoan.id, 1);
    } catch (err: any) {
      Swal.fire("Error", err?.response?.data?.message ?? "Failed to record repayment.", "error");
    } finally {
      setRepaySubmitting(false);
    }
  };

  // ── Shared Input Class ────────────────────────────────────────────────────
  const inputCls =
    "w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-600 bg-white text-slate-800";
  const labelCls = "block text-xs font-semibold text-slate-600 mb-1";

  // ── Loan type badge color ─────────────────────────────────────────────────
  const loanTypeBadge = (type: string) => {
    const map: Record<string, string> = {
      Regular: "bg-blue-50 text-blue-700 border-blue-200",
      Emergency: "bg-red-50 text-red-700 border-red-200",
      Agricultural: "bg-lime-50 text-lime-700 border-lime-200",
      Special: "bg-purple-50 text-purple-700 border-purple-200",
    };
    return map[type] ?? "bg-slate-50 text-slate-600 border-slate-200";
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">

      {/* ── Page Header ──────────────────────────────────────────────────── */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-emerald-50 text-emerald-700">
              <FiCreditCard className="w-6 h-6" />
            </span>
            <h1 className="text-xl font-bold text-slate-800">Loan Management</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Manage member loan applications, approvals, disbursements, and repayments.
          </p>
        </div>
        <button
          onClick={() => {
            setApplyMemberId("");
            setApplyAmount("");
            setApplyDate(today());
            setApplyPurpose("");
            setApplyTerm("");
            setApplyRate("");
            setApplyLoanType("Regular");
            setApplyRemarks("");
            setEligibility(null);
            setIsApplyModalOpen(true);
          }}
          className="flex items-center gap-1.5 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer shadow-sm"
        >
          <FiPlus className="w-4 h-4" />
          New Loan Application
        </button>
      </div>

      {/* ── Summary Cards ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          { label: "Total Loans", value: totals.total_loans, icon: <FiList />, color: "blue" },
          { label: "Pending", value: totals.total_pending, icon: <FiClock />, color: "amber" },
          { label: "Active", value: totals.total_active, icon: <FiCheckCircle />, color: "emerald" },
          { label: "Total Outstanding", value: peso(totals.total_outstanding_amount), icon: <TbCurrencyPeso />, color: "red" },
          { label: "Total Released", value: peso(totals.total_released_amount), icon: <FiTrendingDown />, color: "violet" },
        ].map((card) => (
          <div key={card.label} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{card.label}</span>
              <div className={`w-9 h-9 rounded-xl bg-${card.color}-50 text-${card.color}-600 flex items-center justify-center`}>
                {card.icon}
              </div>
            </div>
            <h3 className={`mt-3 text-2xl font-bold text-${card.color}-700`}>{card.value}</h3>
          </div>
        ))}
      </div>

      {/* ── Main Card with Tabs ───────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden">

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-100 px-6 pt-3 bg-slate-50/50">
          {([
            { key: "loans", label: "Loan Applications", icon: <FiList className="w-4 h-4" /> },
            { key: "repayments", label: "Repayment History", icon: <FiCreditCard className="w-4 h-4" />, disabled: !selectedLoan },
          ] as { key: string; label: string; icon: React.ReactElement; disabled?: boolean }[]).map((tab) => (
            <button
              key={tab.key}
              onClick={() => !tab.disabled && setActiveTab(tab.key as "loans" | "repayments")}
              disabled={tab.disabled}
              className={`pb-3 px-4 text-xs font-bold transition-colors cursor-pointer border-b-2 flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed ${activeTab === tab.key
                ? "border-emerald-600 text-emerald-800"
                : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
            >
              {tab.icon}
              {tab.label}
              {tab.key === "repayments" && selectedLoan && (
                <span className="text-[10px] font-mono text-slate-400 ml-1">
                  ({selectedLoan.loan_reference_no})
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ── TAB: LOAN LIST ──────────────────────────────────────────────── */}
        {activeTab === "loans" && (
          <div className="p-6 space-y-4">

            {/* Filters */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2 flex-1">

                {/* Search */}
                <div className="relative flex-1 min-w-50 max-w-sm">
                  <FiSearch className="absolute left-3 top-2.5 text-slate-400 w-4 h-4" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search ref#, member, purpose..."
                    className="w-full pl-9 pr-8 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  />
                  {search && (
                    <button onClick={() => setSearch("")} className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600">
                      <FiX className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Status Filter */}
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-600 bg-white text-slate-700"
                >
                  <option value="">All Statuses</option>
                  {(["Pending", "Approved", "Released", "Active", "Fully Paid", "Rejected", "Cancelled"] as LoanStatus[]).map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>

                {/* Loan Type Filter */}
                <select
                  value={loanTypeFilter}
                  onChange={(e) => setLoanTypeFilter(e.target.value)}
                  className="px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-600 bg-white text-slate-700"
                >
                  <option value="">All Loan Types</option>
                  {LOAN_TYPES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>

                {/* Date Range */}
                <div className="flex items-center gap-1.5">
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="px-2 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  />
                  <span className="text-slate-400 text-xs">to</span>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="px-2 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  />
                </div>

                {(statusFilter || loanTypeFilter || startDate || endDate) && (
                  <button
                    onClick={() => { setStatusFilter(""); setLoanTypeFilter(""); setStartDate(""); setEndDate(""); }}
                    className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-slate-500 hover:text-slate-800 border border-slate-200 rounded-xl hover:bg-slate-50"
                  >
                    <FiFilter className="w-3.5 h-3.5" /> Clear
                  </button>
                )}
              </div>

              <button
                onClick={() => fetchLoans(page)}
                className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl border border-slate-200 transition-colors cursor-pointer"
              >
                <FiRefreshCw className="w-3.5 h-3.5" /> Refresh
              </button>
            </div>

            {/* Loans Table */}
            <div className="overflow-x-auto rounded-xl border border-slate-100">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 uppercase tracking-wider font-semibold">
                    <th className="py-3 px-4 whitespace-nowrap">Reference #</th>
                    <th className="py-3 px-4 whitespace-nowrap">Member</th>
                    <th className="py-3 px-4 whitespace-nowrap">Paid-up Capital</th>
                    <th className="py-3 px-4 whitespace-nowrap">Loan Type</th>
                    <th className="py-3 px-4 text-right whitespace-nowrap">Requested</th>
                    <th className="py-3 px-4 text-right whitespace-nowrap">Approved</th>
                    <th className="py-3 px-4 text-center whitespace-nowrap">Rate</th>
                    <th className="py-3 px-4 text-center whitespace-nowrap">Term</th>
                    <th className="py-3 px-4 text-center whitespace-nowrap">Due Date</th>
                    <th className="py-3 px-4 text-right whitespace-nowrap">Outstanding</th>
                    <th className="py-3 px-4 text-center whitespace-nowrap">Status</th>
                    <th className="py-3 px-4 text-center whitespace-nowrap">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr>
                      <td colSpan={12} className="py-10 text-center text-slate-400">
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-5 h-5 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
                          <span>Loading loan records...</span>
                        </div>
                      </td>
                    </tr>
                  ) : loans.length === 0 ? (
                    <tr>
                      <td colSpan={12} className="py-10 text-center text-slate-400">
                        <FiAlertCircle className="w-6 h-6 mx-auto mb-2 text-slate-300" />
                        No loan records found.
                      </td>
                    </tr>
                  ) : (
                    loans.map((loan) => (
                      <tr key={loan.id} className="hover:bg-slate-50/80 transition-colors">

                        {/* Ref # */}
                        <td className="py-3 px-4">
                          <span className="font-mono font-semibold text-emerald-700">
                            {loan.loan_reference_no}
                          </span>
                        </td>

                        {/* Member */}
                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-800">
                            {loan.member
                              ? `${loan.member.firstname} ${loan.member.lastname}`
                              : `Member #${loan.member_id}`}
                          </div>
                          {loan.member && (
                            <div className="text-[11px] font-mono text-slate-400">
                              {loan.member.member_code}
                            </div>
                          )}
                        </td>

                        {/* Paid-up Capital */}
                        <td className="py-3 px-4 text-slate-600">
                          <span className="font-semibold text-emerald-700">
                            {peso(loan.paid_up_capital_at_application)}
                          </span>
                        </td>

                        {/* Loan Type */}
                        <td className="py-3 px-4">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${loanTypeBadge((loan as any).loan_type ?? "Regular")}`}>
                            <FiTag className="w-2.5 h-2.5" />
                            {(loan as any).loan_type ?? "Regular"}
                          </span>
                        </td>

                        {/* Requested */}
                        <td className="py-3 px-4 text-right font-semibold text-slate-800">
                          {peso(loan.requested_amount)}
                        </td>

                        {/* Approved */}
                        <td className="py-3 px-4 text-right text-slate-600">
                          {loan.approved_amount ? peso(loan.approved_amount) : "—"}
                        </td>

                        {/* Interest Rate */}
                        <td className="py-3 px-4 text-center text-slate-600">
                          {loan.interest_rate ? pct(loan.interest_rate) : "—"}
                        </td>

                        {/* Term */}
                        <td className="py-3 px-4 text-center text-slate-600">
                          {loan.term_months ? `${loan.term_months} mo.` : "—"}
                        </td>

                        {/* Due Date */}
                        <td className="py-3 px-4 text-center">
                          {(loan as any).due_date ? (
                            <span className="flex items-center justify-center gap-1 text-slate-600">
                              <FiCalendar className="w-3 h-3 text-slate-400" />
                              {(loan as any).due_date}
                            </span>
                          ) : "—"}
                        </td>

                        {/* Outstanding */}
                        <td className="py-3 px-4 text-right">
                          <span className={Number(loan.outstanding_balance) > 0 ? "font-bold text-red-600" : "text-slate-400"}>
                            {Number(loan.outstanding_balance) > 0 ? peso(loan.outstanding_balance) : "—"}
                          </span>
                        </td>

                        {/* Status */}
                        <td className="py-3 px-4 text-center">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${STATUS_COLORS[loan.status]}`}>
                            {loan.status}
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-4">
                          <div className="flex items-center justify-center gap-1.5 flex-wrap">

                            {/* View Detail */}
                            <button
                              onClick={() => openDetail(loan)}
                              title="View Detail"
                              className="p-1.5 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                            >
                              <FiEye className="w-4 h-4" />
                            </button>

                            {/* Approve */}
                            {loan.status === "Pending" && (
                              <button
                                onClick={() => openApproveModal(loan)}
                                title="Approve"
                                className="px-2 py-1 text-[11px] font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200 cursor-pointer"
                              >
                                Approve
                              </button>
                            )}

                            {/* Reject */}
                            {loan.status === "Pending" && (
                              <button
                                onClick={() => openRejectModal(loan)}
                                title="Reject"
                                className="p-1.5 text-red-400 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                              >
                                <FiXCircle className="w-4 h-4" />
                              </button>
                            )}

                            {/* Release */}
                            {loan.status === "Approved" && (
                              <button
                                onClick={() => openReleaseModal(loan)}
                                title="Release Funds"
                                className="px-2 py-1 text-[11px] font-semibold text-violet-700 bg-violet-50 hover:bg-violet-100 rounded-lg border border-violet-200 cursor-pointer"
                              >
                                Release
                              </button>
                            )}

                            {/* Record Payment */}
                            {(loan.status === "Released" || loan.status === "Active") && (
                              <button
                                onClick={() => openRepayModal(loan)}
                                title="Record Payment"
                                className="px-2 py-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg border border-emerald-200 cursor-pointer"
                              >
                                Pay
                              </button>
                            )}

                            {/* View Repayments */}
                            {(loan.status === "Released" || loan.status === "Active" || loan.status === "Fully Paid") && (
                              <button
                                onClick={() => { setSelectedLoan(loan); setActiveTab("repayments"); }}
                                title="View Repayment History"
                                className="p-1.5 text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                              >
                                <FiList className="w-4 h-4" />
                              </button>
                            )}

                            {/* Cancel */}
                            {(loan.status === "Pending" || loan.status === "Approved") && (
                              <button
                                onClick={() => openCancelModal(loan)}
                                title="Cancel"
                                className="p-1.5 text-slate-300 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                              >
                                <FiSlash className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <Pagination
              currentPage={page}
              lastPage={lastPage}
              onPageChange={(p) => { setPage(p); fetchLoans(p); }}
            />
          </div>
        )}

        {/* ── TAB: REPAYMENT HISTORY ─────────────────────────────────────── */}
        {activeTab === "repayments" && selectedLoan && (
          <div className="p-6 space-y-4">
            {/* Loan Summary Banner */}
            <div className="bg-slate-50 rounded-xl border border-slate-100 p-4 flex flex-wrap gap-6 text-xs">
              <div>
                <span className="text-slate-500 block">Loan Reference</span>
                <span className="font-mono font-bold text-emerald-700">{selectedLoan.loan_reference_no}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Member</span>
                <span className="font-semibold text-slate-800">
                  {selectedLoan.member ? `${selectedLoan.member.firstname} ${selectedLoan.member.lastname}` : `#${selectedLoan.member_id}`}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">Paid-up Capital</span>
                <span className="font-bold text-emerald-700">{peso(selectedLoan.paid_up_capital_at_application)}</span>
              </div>

              <div>
                <span className="text-slate-500 block">Loan Type</span>
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${loanTypeBadge((selectedLoan as any).loan_type ?? "Regular")}`}>
                  {(selectedLoan as any).loan_type ?? "Regular"}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">Approved Amount</span>
                <span className="font-bold text-slate-800">{peso(selectedLoan.approved_amount ?? selectedLoan.requested_amount)}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Interest Rate</span>
                <span className="font-bold text-slate-800">{selectedLoan.interest_rate ? pct(selectedLoan.interest_rate) : "—"}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Term</span>
                <span className="font-bold text-slate-800">{selectedLoan.term_months ? `${selectedLoan.term_months} months` : "—"}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Due Date</span>
                <span className="font-bold text-slate-800">{(selectedLoan as any).due_date ?? "—"}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Total Paid</span>
                <span className="font-bold text-emerald-700">{peso(repaySummary?.total_paid ?? selectedLoan.total_amount_paid)}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Outstanding Balance</span>
                <span className="font-bold text-red-600">{peso(repaySummary?.outstanding_balance ?? selectedLoan.outstanding_balance)}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Status</span>
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${STATUS_COLORS[selectedLoan.status]}`}>
                  {selectedLoan.status}
                </span>
              </div>
              {(selectedLoan.status === "Released" || selectedLoan.status === "Active") && (
                <div className="ml-auto self-center">
                  <button
                    onClick={() => openRepayModal(selectedLoan)}
                    className="flex items-center gap-1.5 px-3 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer"
                  >
                    <FiDollarSign className="w-4 h-4" /> Record Payment
                  </button>
                </div>
              )}
            </div>

            {/* Repayments Table */}
            <div className="overflow-x-auto rounded-xl border border-slate-100">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 uppercase tracking-wider font-semibold">
                    <th className="py-3 px-4">OR #</th>
                    <th className="py-3 px-4">Payment Date</th>
                    <th className="py-3 px-4">Method</th>
                    <th className="py-3 px-4 text-right">Amount Paid</th>
                    <th className="py-3 px-4 text-right">Balance After</th>
                    <th className="py-3 px-4">Recorded By</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {repayLoading ? (
                    <tr>
                      <td colSpan={6} className="py-10 text-center text-slate-400">
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-5 h-5 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
                          <span>Loading repayments...</span>
                        </div>
                      </td>
                    </tr>
                  ) : repayments.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400">
                        No repayments recorded yet.
                      </td>
                    </tr>
                  ) : (
                    repayments.map((r) => (
                      <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 font-mono text-emerald-700">{r.or_number}</td>
                        <td className="py-3 px-4 text-slate-600">{r.payment_date}</td>
                        <td className="py-3 px-4 text-slate-600">{r.payment_method}</td>
                        <td className="py-3 px-4 text-right font-bold text-slate-800">{peso(r.amount_paid)}</td>
                        <td className="py-3 px-4 text-right font-semibold text-red-600">{peso(r.balance_after_payment)}</td>
                        <td className="py-3 px-4 text-slate-500">{r.recorded_by}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <Pagination
              currentPage={repayPage}
              lastPage={repayLastPage}
              onPageChange={(p) => { setRepayPage(p); fetchRepayments(selectedLoan.id, p); }}
            />
          </div>
        )}
      </div>

      {/* ════════════════════════════════════════════════════════════════════ */}
      {/* MODALS                                                              */}
      {/* ════════════════════════════════════════════════════════════════════ */}

      {/* ── Apply Loan Modal ─────────────────────────────────────────────── */}
      <Modal isOpen={isApplyModalOpen} onClose={() => setIsApplyModalOpen(false)} showCloseButton>
        <h2 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
          <FiPlus className="text-emerald-600" /> New Loan Application
        </h2>
        <form onSubmit={handleApplySubmit} className="space-y-4">
          {/* Member */}
          <div>
            <label className={labelCls}>Member *</label>
            <select
              value={applyMemberId}
              onChange={(e) => setApplyMemberId(e.target.value)}
              required
              className={inputCls}
            >
              <option value="">— Select Member —</option>
              {activeMembers.map((m) => (
                <option key={m.id} value={m.id}>
                  [{m.member_code}] {m.firstname} {m.lastname}
                </option>
              ))}
            </select>
          </div>

          {/* Eligibility Panel */}
          {applyMemberId && (
            <div className={`rounded-xl border p-3 text-xs space-y-1.5 ${eligibilityLoading ? "bg-slate-50 border-slate-200" :
              (eligibility && eligibility.remaining_eligibility > 0 && Number(applyAmount || 0) <= eligibility.remaining_eligibility)
                ? "bg-emerald-50 border-emerald-200"
                : "bg-amber-50 border-amber-200"
              }`}>
              {eligibilityLoading ? (
                <div className="flex items-center gap-2 text-slate-400">
                  <div className="w-4 h-4 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
                  Checking eligibility...
                </div>
              ) : eligibility ? (
                <>
                  <div className="flex items-center justify-between mb-2 border-b border-current/10 pb-2">
                    <span className="font-bold text-slate-700">Eligibility Status</span>
                    <span className={`font-bold px-2 py-0.5 rounded-full text-[10px] uppercase tracking-wider ${eligibility.remaining_eligibility <= 0
                      ? "bg-amber-100 text-amber-800"
                      : Number(applyAmount || 0) <= eligibility.remaining_eligibility
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-red-100 text-red-700"
                      }`}>
                      {eligibility.remaining_eligibility <= 0
                        ? (eligibility.paid_up_capital <= 0 ? "No Paid-Up Capital" : "Limit Reached")
                        : Number(applyAmount || 0) <= eligibility.remaining_eligibility
                          ? "Eligible"
                          : "Exceeds Limit"}
                    </span>
                  </div>

                  {(eligibility.total_equity ?? 0) <= 0 && (
                    <div className="p-2 mb-2 rounded-lg bg-amber-100/70 border border-amber-200 text-amber-900 text-[11px] leading-relaxed">
                      <strong>Note:</strong> This member has ₱0.00 in Total Equity (Paid-Up Capital + CBU Balance). Loan borrowing limits are calculated as (Total Equity × Multiplier). Please record a Share Capital or CBU contribution first.
                    </div>
                  )}

                  <div className="flex justify-between"><span className="text-slate-500">Paid-Up Capital:</span><strong>{peso(eligibility.paid_up_capital)}</strong></div>
                  <div className="flex justify-between"><span className="text-slate-500">CBU Balance:</span><strong>{peso(eligibility.cbu_balance ?? 0)}</strong></div>
                  <div className="flex justify-between border-b border-current/10 pb-1 mb-0.5"><span className="font-semibold text-slate-700">Total Equity:</span><strong className="text-emerald-700">{peso(eligibility.total_equity ?? ((eligibility.paid_up_capital || 0) + (eligibility.cbu_balance || 0)))}</strong></div>
                  <div className="flex justify-between"><span className="text-slate-500">Approved Multiplier:</span><strong>×{eligibility.approved_multiplier || 2.0}</strong></div>
                  <div className="flex justify-between"><span className="text-slate-500">Max Eligible Loan:</span><strong>{peso(eligibility.maximum_eligible_loan)}</strong></div>
                  <div className="flex justify-between"><span className="text-slate-500">Outstanding Loans:</span><strong>{peso(eligibility.total_outstanding)}</strong></div>
                  <div className="flex justify-between border-t border-current/20 pt-1 mt-1">
                    <span className="font-semibold text-slate-700">Available to Borrow:</span>
                    <strong className={eligibility.remaining_eligibility > 0 ? "text-emerald-700 font-bold" : "text-amber-700 font-bold"}>
                      {peso(eligibility.remaining_eligibility)}
                    </strong>
                  </div>
                  {Number(applyAmount || 0) > 0 && (
                    <>
                      <div className="flex justify-between">
                        <span className="font-semibold text-slate-700">Requested Amount:</span>
                        <strong className={Number(applyAmount || 0) > eligibility.remaining_eligibility ? "text-red-600" : "text-blue-600"}>
                          {peso(applyAmount || 0)}
                        </strong>
                      </div>
                      <div className="flex justify-between border-t border-current/20 pt-1 mt-1">
                        <span className="font-bold text-slate-700">Remaining After Loan:</span>
                        <strong className={eligibility.remaining_eligibility - Number(applyAmount || 0) >= 0 ? "text-emerald-700" : "text-red-600"}>
                          {peso(eligibility.remaining_eligibility - Number(applyAmount || 0))}
                        </strong>
                      </div>
                    </>
                  )}
                </>
              ) : null}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Requested Amount (₱) *</label>
              <input type="number" min="1" step="0.01" value={applyAmount} onChange={(e) => setApplyAmount(e.target.value)} required className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Application Date *</label>
              <input type="date" value={applyDate} onChange={(e) => setApplyDate(e.target.value)} required className={inputCls} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Loan Type *</label>
              <select value={applyLoanType} onChange={(e) => setApplyLoanType(e.target.value)} required className={inputCls}>
                {LOAN_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Loan Purpose</label>
              <input type="text" value={applyPurpose} onChange={(e) => setApplyPurpose(e.target.value)} placeholder="Farm supplies, equipment, etc." className={inputCls} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Term (months)</label>
              <input type="number" min="1" max="360" value={applyTerm} onChange={(e) => setApplyTerm(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Interest Rate (% annual)</label>
              <input type="number" min="0" max="100" step="0.01" value={applyRate} onChange={(e) => setApplyRate(e.target.value)} placeholder="e.g. 12 for 12%" className={inputCls} />
            </div>
          </div>

          <div>
            <label className={labelCls}>Remarks</label>
            <textarea rows={2} value={applyRemarks} onChange={(e) => setApplyRemarks(e.target.value)} className={inputCls} />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setIsApplyModalOpen(false)} className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl cursor-pointer">
              Cancel
            </button>
            <button type="submit" disabled={applySubmitting || (eligibility ? Number(applyAmount || 0) > eligibility.remaining_eligibility : false)} className="px-4 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer">
              {applySubmitting ? "Submitting..." : "Submit Application"}
            </button>
          </div>
        </form>
      </Modal>

      {/* ── Approve Modal ────────────────────────────────────────────────── */}
      <Modal isOpen={isApproveModalOpen} onClose={() => setIsApproveModalOpen(false)} showCloseButton>
        <h2 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
          <FiCheckCircle className="text-blue-600" /> Approve Loan
        </h2>
        <form onSubmit={handleApproveSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Approved Amount (₱) *</label>
              <input type="number" min="1" step="0.01" value={approveAmount} onChange={(e) => setApproveAmount(e.target.value)} required className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Approval Date *</label>
              <input type="date" value={approveDate} onChange={(e) => setApproveDate(e.target.value)} required className={inputCls} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Loan Type</label>
              <select value={approveLoanType} onChange={(e) => setApproveLoanType(e.target.value)} className={inputCls}>
                {LOAN_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Approved By</label>
              <input type="text" value={approveBy} onChange={(e) => setApproveBy(e.target.value)} placeholder="Board Chairman, Manager..." className={inputCls} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Term (months)</label>
              <input type="number" min="1" max="360" value={approveTerm} onChange={(e) => setApproveTerm(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Interest Rate (% annual)</label>
              <input type="number" min="0" max="100" step="0.01" value={approveRate} onChange={(e) => setApproveRate(e.target.value)} className={inputCls} />
            </div>
          </div>
          <div>
            <label className={labelCls}>Remarks</label>
            <textarea rows={2} value={approveRemarks} onChange={(e) => setApproveRemarks(e.target.value)} className={inputCls} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setIsApproveModalOpen(false)} className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl cursor-pointer">Cancel</button>
            <button type="submit" disabled={approveSubmitting} className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl disabled:opacity-50 cursor-pointer">
              {approveSubmitting ? "Approving..." : "Approve Loan"}
            </button>
          </div>
        </form>
      </Modal>

      {/* ── Reject Modal ─────────────────────────────────────────────────── */}
      <Modal isOpen={isRejectModalOpen} onClose={() => setIsRejectModalOpen(false)} showCloseButton>
        <h2 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
          <FiXCircle className="text-red-500" /> Reject Loan Application
        </h2>
        <form onSubmit={handleRejectSubmit} className="space-y-4">
          <div>
            <label className={labelCls}>Reason / Remarks</label>
            <textarea rows={3} value={actionRemarks} onChange={(e) => setActionRemarks(e.target.value)} placeholder="Reason for rejection..." className={inputCls} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setIsRejectModalOpen(false)} className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl cursor-pointer">Cancel</button>
            <button type="submit" disabled={actionSubmitting} className="px-4 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-xl disabled:opacity-50 cursor-pointer">
              {actionSubmitting ? "Rejecting..." : "Reject Loan"}
            </button>
          </div>
        </form>
      </Modal>

      {/* ── Cancel Modal ─────────────────────────────────────────────────── */}
      <Modal isOpen={isCancelModalOpen} onClose={() => setIsCancelModalOpen(false)} showCloseButton>
        <h2 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
          <FiSlash className="text-slate-500" /> Cancel Loan
        </h2>
        <form onSubmit={handleCancelSubmit} className="space-y-4">
          <div>
            <label className={labelCls}>Reason / Remarks</label>
            <textarea rows={3} value={actionRemarks} onChange={(e) => setActionRemarks(e.target.value)} placeholder="Reason for cancellation..." className={inputCls} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setIsCancelModalOpen(false)} className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl cursor-pointer">Cancel</button>
            <button type="submit" disabled={actionSubmitting} className="px-4 py-2 text-xs font-semibold text-white bg-slate-600 hover:bg-slate-700 rounded-xl disabled:opacity-50 cursor-pointer">
              {actionSubmitting ? "Cancelling..." : "Cancel Loan"}
            </button>
          </div>
        </form>
      </Modal>

      {/* ── Release Modal ─────────────────────────────────────────────────── */}
      <Modal isOpen={isReleaseModalOpen} onClose={() => setIsReleaseModalOpen(false)} showCloseButton>
        <h2 className="text-base font-bold text-slate-800 mb-1 flex items-center gap-2">
          <FiDollarSign className="text-violet-600" /> Release Loan Funds
        </h2>
        {selectedLoan && (
          <p className="text-xs text-slate-500 mb-4">
            Disbursing <strong>{peso(selectedLoan.approved_amount)}</strong> for <strong>{selectedLoan.loan_reference_no}</strong>.
            This will create an entry in the Cash Disbursement Journal.
          </p>
        )}
        <form onSubmit={handleReleaseSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Release Date *</label>
              <input type="date" value={releaseDate} onChange={(e) => setReleaseDate(e.target.value)} required className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Payment Method *</label>
              <select value={releaseMethod} onChange={(e) => setReleaseMethod(e.target.value as PaymentMethod)} required className={inputCls}>
                {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className={labelCls}>Approved By</label>
            <input type="text" value={releaseBy} onChange={(e) => setReleaseBy(e.target.value)} placeholder="Authorized signatory..." className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Remarks</label>
            <textarea rows={2} value={releaseRemarks} onChange={(e) => setReleaseRemarks(e.target.value)} className={inputCls} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setIsReleaseModalOpen(false)} className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl cursor-pointer">Cancel</button>
            <button type="submit" disabled={releaseSubmitting} className="px-4 py-2 text-xs font-semibold text-white bg-violet-600 hover:bg-violet-700 rounded-xl disabled:opacity-50 cursor-pointer">
              {releaseSubmitting ? "Releasing..." : "Release Funds"}
            </button>
          </div>
        </form>
      </Modal>

      {/* ── Record Repayment Modal ───────────────────────────────────────── */}
      <Modal isOpen={isRepayModalOpen} onClose={() => setIsRepayModalOpen(false)} showCloseButton>
        <h2 className="text-base font-bold text-slate-800 mb-1 flex items-center gap-2">
          <FiDollarSign className="text-emerald-600" /> Record Loan Repayment
        </h2>
        {selectedLoan && (
          <p className="text-xs text-slate-500 mb-4">
            Loan <strong>{selectedLoan.loan_reference_no}</strong> — Outstanding: <strong className="text-red-600">{peso(selectedLoan.outstanding_balance)}</strong>.
          </p>
        )}
        <form onSubmit={handleRepaySubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Payment Date *</label>
              <input type="date" value={repayDate} onChange={(e) => setRepayDate(e.target.value)} required className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Amount Paid (₱) *</label>
              <input
                type="number" min="0.01" step="0.01"
                max={selectedLoan ? Number(selectedLoan.outstanding_balance) : undefined}
                value={repayAmount} onChange={(e) => setRepayAmount(e.target.value)} required className={inputCls}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Payment Method *</label>
              <select value={repayMethod} onChange={(e) => setRepayMethod(e.target.value as PaymentMethod)} required className={inputCls}>
                {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>OR Number <span className="text-slate-400">(auto if blank)</span></label>
              <input type="text" value={repayOrNumber} onChange={(e) => setRepayOrNumber(e.target.value)} className={inputCls} />
            </div>
          </div>
          <div>
            <label className={labelCls}>Remarks</label>
            <textarea rows={2} value={repayRemarks} onChange={(e) => setRepayRemarks(e.target.value)} className={inputCls} />
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <input type="checkbox" id="syncReceipt" checked={repaySyncReceipt} onChange={(e) => setRepaySyncReceipt(e.target.checked)} className="rounded accent-emerald-600" />
            <label htmlFor="syncReceipt">Sync with Cash Receipts Journal</label>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setIsRepayModalOpen(false)} className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl cursor-pointer">Cancel</button>
            <button type="submit" disabled={repaySubmitting} className="px-4 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl disabled:opacity-50 cursor-pointer">
              {repaySubmitting ? "Recording..." : "Record Payment"}
            </button>
          </div>
        </form>
      </Modal>

      {/* ── Loan Detail Modal ─────────────────────────────────────────────── */}
      <Modal isOpen={isDetailModalOpen} onClose={() => setIsDetailModalOpen(false)} showCloseButton>
        <h2 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
          <FiEye className="text-emerald-600" /> Loan Detail
        </h2>
        {detailLoading ? (
          <div className="flex items-center gap-2 text-slate-400 text-sm py-6 justify-center">
            <div className="w-5 h-5 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
            Loading...
          </div>
        ) : selectedLoan ? (
          <div className="space-y-3 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                <span className="text-slate-500 block mb-0.5">Reference #</span>
                <span className="font-mono font-bold text-emerald-700">{selectedLoan.loan_reference_no}</span>
              </div>
              <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                <span className="text-slate-500 block mb-0.5">Status</span>
                <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold border ${STATUS_COLORS[selectedLoan.status]}`}>
                  {selectedLoan.status}
                </span>
              </div>
            </div>

            <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
              <span className="text-slate-500 block mb-1">Member</span>
              {selectedLoan.member ? (
                <>
                  <span className="font-bold text-slate-800">{selectedLoan.member.firstname} {selectedLoan.member.lastname}</span>
                  <span className="ml-2 font-mono text-slate-400">{selectedLoan.member.member_code}</span>
                  <div className="mt-1 text-slate-500 flex flex-wrap gap-x-4">
                    <span>Paid-Up Capital: <strong className="text-emerald-700">{peso(selectedLoan.paid_up_capital_at_application)}</strong></span>
                    {selectedLoan.member?.cbu_balance !== undefined && (
                      <span>CBU Balance: <strong className="text-emerald-700">{peso(selectedLoan.member.cbu_balance)}</strong></span>
                    )}
                  </div>
                </>
              ) : `Member #${selectedLoan.member_id}`}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                <span className="text-slate-500 block mb-0.5">Loan Type</span>
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${loanTypeBadge((selectedLoan as any).loan_type ?? "Regular")}`}>
                  <FiTag className="w-2.5 h-2.5" />
                  {(selectedLoan as any).loan_type ?? "Regular"}
                </span>
              </div>
              <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                <span className="text-slate-500 block mb-0.5">Due Date</span>
                <span className="font-bold text-slate-800">{(selectedLoan as any).due_date ?? "—"}</span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                <span className="text-slate-500 block mb-0.5">Requested</span>
                <span className="font-bold text-slate-800">{peso(selectedLoan.requested_amount)}</span>
              </div>
              <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                <span className="text-slate-500 block mb-0.5">Approved</span>
                <span className="font-bold text-slate-800">{selectedLoan.approved_amount ? peso(selectedLoan.approved_amount) : "—"}</span>
              </div>
              <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                <span className="text-slate-500 block mb-0.5">Outstanding</span>
                <span className="font-bold text-red-600">{peso(selectedLoan.outstanding_balance)}</span>
              </div>
            </div>

            {selectedLoan.term_months && (
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 shadow-sm space-y-2">
                <h3 className="font-bold text-slate-800 mb-3 border-b pb-2 flex items-center gap-2">
                  <FiDollarSign className="text-emerald-600" /> Flat-Interest Calculation
                </h3>
                <div className="flex justify-between">
                  <span className="text-slate-500">Principal Amount:</span>
                  <span className="font-semibold text-slate-700">{peso(selectedLoan.approved_amount ?? selectedLoan.requested_amount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Annual Interest Rate:</span>
                  <span className="font-semibold text-slate-700">{selectedLoan.interest_rate ? pct(selectedLoan.interest_rate) : "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Term:</span>
                  <span className="font-semibold text-slate-700">{selectedLoan.term_months} months</span>
                </div>

                {/* Capstone Demonstration Formula Box */}
                <div className="my-3 p-3 bg-white rounded-lg border border-slate-200 space-y-2 text-[11px] font-mono text-slate-500 shadow-sm">
                  <div className="flex justify-between items-center">
                    <span>{peso(selectedLoan.approved_amount ?? selectedLoan.requested_amount)} × {selectedLoan.interest_rate ? pct(selectedLoan.interest_rate) : "0%"} × ({selectedLoan.term_months}/12)</span>
                    <span className="font-bold text-slate-700 border-l pl-2 border-slate-100">= {selectedLoan.total_interest ? peso(selectedLoan.total_interest) : "—"} Interest</span>
                  </div>
                  <div className="flex justify-between items-center border-t border-slate-100 pt-2">
                    <span>{peso(selectedLoan.approved_amount ?? selectedLoan.requested_amount)} + {selectedLoan.total_interest ? peso(selectedLoan.total_interest) : "—"}</span>
                    <span className="font-bold text-slate-700 border-l pl-2 border-slate-100">= {selectedLoan.total_payable ? peso(selectedLoan.total_payable) : "—"} Payable</span>
                  </div>
                </div>

                <div className="flex justify-between border-t border-slate-200 pt-2">
                  <span className="text-slate-500">Total Interest:</span>
                  <span className="font-semibold text-slate-700">{selectedLoan.total_interest ? peso(selectedLoan.total_interest) : "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Total Payable:</span>
                  <span className="font-bold text-slate-800">{selectedLoan.total_payable ? peso(selectedLoan.total_payable) : "—"}</span>
                </div>
                <div className="flex justify-between border-t border-slate-200 pt-2 mt-2">
                  <span className="font-bold text-emerald-800">Monthly Payment:</span>
                  <span className="font-bold text-emerald-700 text-sm">{selectedLoan.monthly_amortization ? peso(selectedLoan.monthly_amortization) : "—"}</span>
                </div>
              </div>
            )}

            {selectedLoan.loan_purpose && (
              <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                <span className="text-slate-500 block mb-0.5">Purpose</span>
                <span>{selectedLoan.loan_purpose}</span>
              </div>
            )}

            {selectedLoan.remarks && (
              <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                <span className="text-slate-500 block mb-0.5">Remarks</span>
                <span>{selectedLoan.remarks}</span>
              </div>
            )}

            <div className="grid grid-cols-3 gap-3">
              <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                <span className="text-slate-500 block mb-0.5">Applied</span>
                <span>{selectedLoan.application_date}</span>
              </div>
              {selectedLoan.approval_date && (
                <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                  <span className="text-slate-500 block mb-0.5">Approved</span>
                  <span>{selectedLoan.approval_date}</span>
                </div>
              )}
              {selectedLoan.release_date && (
                <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                  <span className="text-slate-500 block mb-0.5">Released</span>
                  <span>{selectedLoan.release_date}</span>
                </div>
              )}
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
};

export default LoansPage;
