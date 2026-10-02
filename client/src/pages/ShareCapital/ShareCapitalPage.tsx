import { useState, useEffect, type FormEvent } from "react";
import ShareCapitalService from "../../services/ShareCapitalService";
import MemberService from "../../services/MemberService";
import type { Member, ShareCapitalTransaction, ShareCapitalTotals, ShareCapitalPolicy } from "../../Interfaces";
import Pagination from "../../components/Pagination";
import Modal from "../../components/Modal";
import { exportToExcel, printReport } from "../../utils/exportUtils";
import {
  FiPlus,
  FiFileText,
  FiDownload,
  FiPrinter,
  FiSearch,
  FiFilter,
  FiUserCheck,
  FiCheckCircle,
  FiAlertCircle,
  FiLayers,
  FiTrendingUp,
  FiDollarSign,
  FiCreditCard,
  FiInfo,
  FiEye,
  FiCalendar,
  FiX
} from "react-icons/fi";
import { TbCurrencyPeso } from "react-icons/tb";
import Swal from "sweetalert2";

const ShareCapitalPage = () => {
  const [activeTab, setActiveTab] = useState<"members" | "transactions">("members");

  // Members Tab State
  const [members, setMembers] = useState<Member[]>([]);
  const [allActiveMembers, setAllActiveMembers] = useState<Member[]>([]);
  const [membersLoading, setMembersLoading] = useState(true);
  const [membersPage, setMembersPage] = useState(1);
  const [membersLastPage, setMembersLastPage] = useState(1);
  const [memberSearch, setMemberSearch] = useState("");
  const [feeStatusFilter, setFeeStatusFilter] = useState("");

  // Overall Statistics & Policy Settings
  const [totals, setTotals] = useState<ShareCapitalTotals>({
    total_subscribed_capital: 0,
    total_paid_up_capital: 0,
    total_cbu_contributions: 0,
    total_equity: 0,
    total_membership_fees: 0,
    total_members_count: 0,
    paid_membership_fee_count: 0,
    unpaid_membership_fee_count: 0,
  });
  const [policySettings, setPolicySettings] = useState<ShareCapitalPolicy>({
    share_par_value: "",
    default_membership_fee: "",
    min_subscribed_shares: "",
    min_initial_paid_up: "",
  });

  // Transactions Tab State
  const [transactions, setTransactions] = useState<ShareCapitalTransaction[]>([]);
  const [txLoading, setTxLoading] = useState(false);
  const [txPage, setTxPage] = useState(1);
  const [txLastPage, setTxLastPage] = useState(1);
  const [txSearch, setTxSearch] = useState("");
  const [txTypeFilter, setTxTypeFilter] = useState("");
  const [txStartDate, setTxStartDate] = useState("");
  const [txEndDate, setTxEndDate] = useState("");

  // Modals
  const [isContributeModalOpen, setIsContributeModalOpen] = useState(false);
  const [isFeeModalOpen, setIsFeeModalOpen] = useState(false);
  const [isLedgerModalOpen, setIsLedgerModalOpen] = useState(false);

  // Selected Member for Actions / Statement
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [memberLedgerData, setMemberLedgerData] = useState<any>(null);
  const [ledgerLoading, setLedgerLoading] = useState(false);

  // Form States - Contribution
  const [contribMemberId, setContribMemberId] = useState<number | string>("");
  const [contribAmount, setContribAmount] = useState("");
  const [contribDate, setContribDate] = useState(new Date().toISOString().split("T")[0]);
  const [contribMethod, setContribMethod] = useState("Cash");
  const [contribRef, setContribRef] = useState("");
  const [contribRemarks, setContribRemarks] = useState("");
  const [contribSyncReceipt, setContribSyncReceipt] = useState(true);
  const [contribSubmitting, setContribSubmitting] = useState(false);

  // Form States - Membership Fee
  const [feeMemberId, setFeeMemberId] = useState<number | string>("");
  const [feeAmount, setFeeAmount] = useState("");
  const [feeDate, setFeeDate] = useState(new Date().toISOString().split("T")[0]);
  const [feeMethod, setFeeMethod] = useState("Cash");
  const [feeOr, setFeeOr] = useState("");
  const [feeRemarks, setFeeRemarks] = useState("");
  const [feeSyncReceipt, setFeeSyncReceipt] = useState(true);
  const [feeSubmitting, setFeeSubmitting] = useState(false);

  // Load Member Share Capital Summaries
  const fetchShareCapital = async (page: number = 1) => {
    try {
      setMembersLoading(true);
      const res = await ShareCapitalService.loadShareCapital(
        page,
        memberSearch,
        "",
        feeStatusFilter,
        10,
        "paid_up_capital",
        "desc"
      );
      setMembers(res.data.members.data || []);
      setMembersPage(res.data.members.current_page || 1);
      setMembersLastPage(res.data.members.last_page || 1);
      if (res.data.totals) setTotals(res.data.totals);
      if (res.data.policy_settings) setPolicySettings(res.data.policy_settings);
    } catch (err) {
      console.error("Failed to load share capital data:", err);
    } finally {
      setMembersLoading(false);
    }
  };

  // Load All Active Members for Select Dropdowns
  const fetchAllActiveMembers = async () => {
    try {
      const res = await MemberService.loadMembers(1, "", "Active", "", 200);
      setAllActiveMembers(res.data.data || []);
    } catch (err) {
      console.error("Failed to load active members:", err);
    }
  };

  // Load Transactions Ledger
  const fetchTransactions = async (page: number = 1) => {
    try {
      setTxLoading(true);
      const res = await ShareCapitalService.loadTransactions(
        page,
        txSearch,
        "",
        txTypeFilter,
        txStartDate,
        txEndDate,
        10
      );
      setTransactions(res.data.data || []);
      setTxPage(res.data.current_page || 1);
      setTxLastPage(res.data.last_page || 1);
    } catch (err) {
      console.error("Failed to load transactions:", err);
    } finally {
      setTxLoading(false);
    }
  };

  useEffect(() => {
    fetchShareCapital(1);
    fetchAllActiveMembers();
  }, [memberSearch, feeStatusFilter]);

  useEffect(() => {
    if (activeTab === "transactions") {
      fetchTransactions(1);
    }
  }, [activeTab, txSearch, txTypeFilter, txStartDate, txEndDate]);

  // Open Contribution Modal
  const openContributeModal = (member?: Member) => {
    if (member) {
      setContribMemberId(member.id);
    } else if (allActiveMembers.length > 0) {
      setContribMemberId(allActiveMembers[0].id);
    }
    setContribAmount("");
    setContribDate(new Date().toISOString().split("T")[0]);
    setContribMethod("Cash");
    setContribRef("");
    setContribRemarks("");
    setContribSyncReceipt(true);
    setIsContributeModalOpen(true);
  };

  // Open Membership Fee Modal
  const openFeeModal = (member?: Member) => {
    if (member) {
      setFeeMemberId(member.id);
    } else if (allActiveMembers.length > 0) {
      setFeeMemberId(allActiveMembers[0].id);
    }
    setFeeAmount(policySettings.default_membership_fee ? String(policySettings.default_membership_fee) : "");
    setFeeDate(new Date().toISOString().split("T")[0]);
    setFeeMethod("Cash");
    setFeeOr("");
    setFeeRemarks("");
    setFeeSyncReceipt(true);
    setIsFeeModalOpen(true);
  };

  // Open Member Statement / Ledger Modal
  const openLedgerModal = async (member: Member) => {
    setSelectedMember(member);
    setIsLedgerModalOpen(true);
    try {
      setLedgerLoading(true);
      const res = await ShareCapitalService.getMemberLedger(member.id);
      setMemberLedgerData(res.data);
    } catch (err) {
      console.error("Failed to load member ledger:", err);
      Swal.fire("Error", "Failed to load member statement.", "error");
    } finally {
      setLedgerLoading(false);
    }
  };

  // Handle Share Capital Contribution Submission
  const handleContribSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!contribMemberId || !contribAmount || Number(contribAmount) <= 0) {
      Swal.fire("Validation Error", "Please specify a valid member and contribution amount.", "warning");
      return;
    }

    try {
      setContribSubmitting(true);
      await ShareCapitalService.contribute({
        member_id: Number(contribMemberId),
        amount: Number(contribAmount),
        transaction_date: contribDate,
        payment_method: contribMethod,
        reference_no: contribRef || undefined,
        remarks: contribRemarks,
        sync_cash_receipt: contribSyncReceipt,
      });

      setIsContributeModalOpen(false);
      Swal.fire({
        icon: "success",
        title: "Contribution Recorded!",
        text: `Share capital contribution of ₱${Number(contribAmount).toLocaleString('en-US', { minimumFractionDigits: 2 })} has been recorded and integrated into Cash Receipts Journal.`,
        confirmButtonColor: "#059669",
      });
      fetchShareCapital(membersPage);
      if (activeTab === "transactions") fetchTransactions(txPage);
    } catch (err: any) {
      Swal.fire("Error", err.response?.data?.message || "Failed to record contribution.", "error");
    } finally {
      setContribSubmitting(false);
    }
  };

  // Handle Membership Fee Submission
  const handleFeeSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!feeMemberId || !feeAmount || Number(feeAmount) <= 0) {
      Swal.fire("Validation Error", "Please specify a valid member and membership fee amount.", "warning");
      return;
    }

    try {
      setFeeSubmitting(true);
      await ShareCapitalService.recordMembershipFee({
        member_id: Number(feeMemberId),
        amount: Number(feeAmount),
        payment_date: feeDate,
        payment_method: feeMethod,
        or_number: feeOr || undefined,
        remarks: feeRemarks,
        sync_cash_receipt: feeSyncReceipt,
      });

      setIsFeeModalOpen(false);
      Swal.fire({
        icon: "success",
        title: "Membership Fee Recorded!",
        text: `Membership fee of ₱${Number(feeAmount).toLocaleString('en-US', { minimumFractionDigits: 2 })} recorded. Kept separate from Share Capital equity.`,
        confirmButtonColor: "#059669",
      });
      fetchShareCapital(membersPage);
    } catch (err: any) {
      Swal.fire("Error", err.response?.data?.message || "Failed to record membership fee.", "error");
    } finally {
      setFeeSubmitting(false);
    }
  };

  // Export Member Capital Summary to Excel
  const handleExportMembersExcel = () => {
    if (members.length === 0) return;
    const exportData = members.map((m) => ({
      "Member Code": m.member_code,
      "Member Name": `${m.firstname} ${m.lastname}`,
      "Membership Fee Status": m.membership_fee_status || "Unpaid",
      "Membership Fee (₱)": Number(m.membership_fee_amount || 0).toFixed(2),
      "Membership Fee OR": m.membership_fee_or || "N/A",
      "Paid-Up Share Capital (₱)": Number(m.paid_up_capital || 0).toFixed(2),
      "CBU Balance (₱)": Number(m.cbu_balance || 0).toFixed(2),
      "Total Equity (₱)": Number(m.total_equity || (Number(m.paid_up_capital || 0) + Number(m.cbu_balance || 0))).toFixed(2),
    }));
    exportToExcel(exportData, `CASCOFAMCO_Member_Share_Capital_${new Date().toISOString().split("T")[0]}`);
  };

  // Export Transactions Ledger to Excel
  const handleExportTxExcel = () => {
    if (transactions.length === 0) return;
    const exportData = transactions.map((t) => ({
      Date: t.transaction_date,
      "Reference / OR #": t.reference_no,
      "Member Code": t.member?.member_code || "N/A",
      "Member Name": t.member ? `${t.member.firstname} ${t.member.lastname}` : "N/A",
      Type: t.transaction_type,
      "Amount (₱)": Number(t.amount || 0).toFixed(2),
      "Balance After (₱)": Number(t.balance_after || 0).toFixed(2),
      "Payment Method": t.payment_method,
      Source: t.source,
      "Recorded By": t.recorded_by,
      Remarks: t.remarks || "",
    }));
    exportToExcel(exportData, `CASCOFAMCO_Share_Capital_Ledger_${new Date().toISOString().split("T")[0]}`);
  };

  // Print Member Individual Statement
  const handlePrintMemberStatement = () => {
    if (!memberLedgerData) return;
    const m = memberLedgerData.member;
    const s = memberLedgerData.summary;
    const txs: ShareCapitalTransaction[] = memberLedgerData.transactions || [];

    const headers = ["Date", "Reference / OR", "Transaction Type", "Payment Method", "Amount (₱)", "Running Balance (₱)", "Remarks"];
    const rows = txs.map((t) => [
      t.transaction_date,
      t.reference_no,
      t.transaction_type,
      t.payment_method,
      `₱${Number(t.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
      `₱${Number(t.balance_after).toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
      t.remarks || "-",
    ]);

    printReport(
      `Statement of Member Share Capital & Equity - ${m.firstname} ${m.lastname} (${m.member_code})`,
      headers,
      rows
    );
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-emerald-50 text-emerald-700">
              <TbCurrencyPeso className="w-6 h-6" />
            </span>
            <h1 className="text-xl font-bold text-slate-800">Member Share Capital & Equity</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Manage member subscriptions, paid-up share capital, CBU balances, and separate membership fee collections.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => openFeeModal()}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors cursor-pointer border border-slate-200 shadow-2xs"
          >
            <FiUserCheck className="w-4 h-4 text-emerald-600" />
            Record Membership Fee
          </button>
          <button
            onClick={() => openContributeModal()}
            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer shadow-sm"
          >
            <FiPlus className="w-4 h-4" />
            Add Share Capital Payment
          </button>
        </div>
      </div>

      {/* Policy Transparency Notice */}
      <div className="bg-emerald-50/60 border border-emerald-200/70 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-emerald-950">
        <div className="flex items-center gap-2.5">
          <FiInfo className="w-5 h-5 text-emerald-700 shrink-0" />
          <div>
            <span className="font-bold text-emerald-900">Cooperative Policy Parameters: </span>
            <span>
              Standard Membership Fee: <strong className="font-semibold">{policySettings.default_membership_fee ? `₱${Number(policySettings.default_membership_fee).toFixed(2)}` : "₱500.00"}</strong>
              {" • "}
              Membership fees are cooperative operating income and strictly separate from share capital equity.
            </span>
          </div>
        </div>
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Paid-Up Share Capital */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Paid-Up Share Capital</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <TbCurrencyPeso className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-bold text-emerald-700">
              ₱{totals.total_paid_up_capital.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">Actual paid member capital</p>
          </div>
        </div>

        {/* CBU Balance */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">CBU Balance</span>
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <FiTrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-bold text-amber-700">
              ₱{totals.total_cbu_contributions.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">Accumulated Capital Build-Up</p>
          </div>
        </div>

        {/* Total Equity */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Equity</span>
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <FiLayers className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-bold text-blue-700">
              ₱{totals.total_equity.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">Paid-Up Capital + CBU Balance</p>
          </div>
        </div>

        {/* Membership Fees Collected */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Membership Fee</span>
            <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <FiUserCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-bold text-purple-700">
              ₱{totals.total_membership_fees.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {totals.paid_membership_fee_count} of {totals.total_members_count} members paid
            </p>
          </div>
        </div>
      </div>

      {/* Tabs and Content Section */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden">
        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-100 px-6 pt-3 bg-slate-50/50">
          <button
            onClick={() => setActiveTab("members")}
            className={`pb-3 px-4 text-xs font-bold transition-colors cursor-pointer border-b-2 flex items-center gap-2 ${
              activeTab === "members"
                ? "border-emerald-600 text-emerald-800"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <FiLayers className="w-4 h-4" />
            Member Capital Accounts ({totals.total_members_count})
          </button>
          <button
            onClick={() => setActiveTab("transactions")}
            className={`pb-3 px-4 text-xs font-bold transition-colors cursor-pointer border-b-2 flex items-center gap-2 ${
              activeTab === "transactions"
                ? "border-emerald-600 text-emerald-800"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <FiFileText className="w-4 h-4" />
            Transaction Ledger & History
          </button>
        </div>

        {/* TAB 1: MEMBERS CAPITAL ACCOUNTS */}
        {activeTab === "members" && (
          <div className="p-6 space-y-4">
            {/* Search and Filters */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-2 w-full md:w-auto flex-1">
                <div className="relative flex-1 max-w-sm">
                  <FiSearch className="absolute left-3 top-2.5 text-slate-400 w-4 h-4" />
                  <input
                    type="text"
                    value={memberSearch}
                    onChange={(e) => setMemberSearch(e.target.value)}
                    placeholder="Search by name, member code..."
                    className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  />
                  {memberSearch && (
                    <button
                      onClick={() => setMemberSearch("")}
                      className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                    >
                      <FiX className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <select
                  value={feeStatusFilter}
                  onChange={(e) => setFeeStatusFilter(e.target.value)}
                  className="px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-600 bg-white text-slate-700"
                >
                  <option value="">All Membership Fee Status</option>
                  <option value="Paid">Fee Paid</option>
                  <option value="Unpaid">Fee Unpaid</option>
                </select>
              </div>

              <div className="flex items-center gap-2 self-end">
                <button
                  onClick={handleExportMembersExcel}
                  className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors cursor-pointer border border-slate-200 shadow-2xs"
                >
                  <FiDownload className="w-3.5 h-3.5" />
                  Export Excel
                </button>
              </div>
            </div>

            {/* Members Table */}
            <div className="overflow-x-auto rounded-xl border border-slate-100">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 uppercase tracking-wider font-semibold">
                    <th className="py-3 px-4">Member</th>
                    <th className="py-3 px-4">Membership Fee</th>
                    <th className="py-3 px-4 text-right">Paid-Up Share Capital</th>
                    <th className="py-3 px-4 text-right">CBU Balance</th>
                    <th className="py-3 px-4 text-right">Total Equity</th>
                    <th className="py-3 px-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {membersLoading ? (
                    <tr>
                      <td colSpan={6} className="py-10 text-center text-slate-400">
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-5 h-5 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
                          <span>Loading share capital records...</span>
                        </div>
                      </td>
                    </tr>
                  ) : members.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400">
                        No member records found matching the criteria.
                      </td>
                    </tr>
                  ) : (
                    members.map((m) => {
                      const isFeePaid = m.membership_fee_status === "Paid";
                      const paidUpAmt = Number(m.paid_up_capital || 0);
                      const cbuAmt = Number(m.cbu_balance || 0);
                      const equityAmt = Number(m.total_equity || (paidUpAmt + cbuAmt));

                      return (
                        <tr key={m.id} className="hover:bg-slate-50/80 transition-colors">
                          {/* Member */}
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs uppercase shrink-0">
                                {m.firstname.charAt(0)}{m.lastname.charAt(0)}
                              </div>
                              <div>
                                <span className="font-semibold text-slate-800 block">
                                  {m.firstname} {m.lastname}
                                </span>
                                <span className="text-[11px] font-mono text-slate-500">
                                  {m.member_code}
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* Membership Fee */}
                          <td className="py-3 px-4">
                            {isFeePaid ? (
                              <div className="space-y-0.5">
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  <FiCheckCircle className="w-3 h-3" /> Paid (₱{Number(m.membership_fee_amount || 0).toFixed(2)})
                                </span>
                                {m.membership_fee_or && (
                                  <span className="text-[10px] text-slate-400 block font-mono">
                                    Ref: {m.membership_fee_or}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <button
                                onClick={() => openFeeModal(m)}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 cursor-pointer"
                              >
                                <FiAlertCircle className="w-3 h-3" /> Unpaid • Pay Fee
                              </button>
                            )}
                          </td>

                          {/* Paid-Up Share Capital */}
                          <td className="py-3 px-4 text-right">
                            <span className="font-bold text-emerald-700 block">
                              ₱{paidUpAmt.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                            </span>
                          </td>

                          {/* CBU Balance */}
                          <td className="py-3 px-4 text-right">
                            <span className="font-semibold text-amber-700 block">
                              ₱{cbuAmt.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                            </span>
                          </td>

                          {/* Total Equity */}
                          <td className="py-3 px-4 text-right">
                            <span className="font-bold text-slate-900 block text-sm">
                              ₱{equityAmt.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                            </span>
                          </td>

                          {/* Actions */}
                          <td className="py-3 px-4 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => openContributeModal(m)}
                                title="Add Share Capital Contribution"
                                className="px-2.5 py-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors cursor-pointer border border-emerald-200"
                              >
                                + Pay
                              </button>
                              <button
                                onClick={() => openLedgerModal(m)}
                                title="View Member Statement & Ledger"
                                className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                              >
                                <FiFileText className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <Pagination
              currentPage={membersPage}
              lastPage={membersLastPage}
              onPageChange={(p) => {
                setMembersPage(p);
                fetchShareCapital(p);
              }}
            />
          </div>
        )}

        {/* TAB 2: TRANSACTIONS LEDGER */}
        {activeTab === "transactions" && (
          <div className="p-6 space-y-4">
            {/* Transaction Filters */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              <div className="relative">
                <FiSearch className="absolute left-3 top-2.5 text-slate-400 w-4 h-4" />
                <input
                  type="text"
                  value={txSearch}
                  onChange={(e) => setTxSearch(e.target.value)}
                  placeholder="Search OR#, Member, remarks..."
                  className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
              </div>

              <select
                value={txTypeFilter}
                onChange={(e) => setTxTypeFilter(e.target.value)}
                className="px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-600 bg-white text-slate-700"
              >
                <option value="">All Transaction Types</option>
                <option value="Share Capital Contribution">Share Capital Contribution</option>
                <option value="Subscription">Subscription Commitment</option>
                <option value="CBU Contribution">CBU Contribution</option>
              </select>

              <div className="flex items-center gap-1.5">
                <input
                  type="date"
                  value={txStartDate}
                  onChange={(e) => setTxStartDate(e.target.value)}
                  className="w-full px-2 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
                <span className="text-slate-400 text-xs">to</span>
                <input
                  type="date"
                  value={txEndDate}
                  onChange={(e) => setTxEndDate(e.target.value)}
                  className="w-full px-2 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
              </div>

              <div className="flex items-center justify-end gap-2">
                <button
                  onClick={handleExportTxExcel}
                  className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors cursor-pointer border border-slate-200 shadow-2xs"
                >
                  <FiDownload className="w-3.5 h-3.5" />
                  Export Excel
                </button>
              </div>
            </div>

            {/* Transactions Table */}
            <div className="overflow-x-auto rounded-xl border border-slate-100">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 uppercase tracking-wider font-semibold">
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Reference / OR #</th>
                    <th className="py-3 px-4">Member</th>
                    <th className="py-3 px-4">Type</th>
                    <th className="py-3 px-4 text-right">Amount</th>
                    <th className="py-3 px-4 text-right">Running Paid-Up</th>
                    <th className="py-3 px-4">Method / Source</th>
                    <th className="py-3 px-4">Recorded By</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {txLoading ? (
                    <tr>
                      <td colSpan={8} className="py-10 text-center text-slate-400">
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-5 h-5 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
                          <span>Loading transaction ledger...</span>
                        </div>
                      </td>
                    </tr>
                  ) : transactions.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-400">
                        No share capital transactions found.
                      </td>
                    </tr>
                  ) : (
                    transactions.map((tx) => (
                      <tr key={tx.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                          {tx.transaction_date}
                        </td>
                        <td className="py-3 px-4 font-mono font-semibold text-slate-800">
                          {tx.reference_no}
                        </td>
                        <td className="py-3 px-4">
                          {tx.member ? (
                            <div>
                              <span className="font-semibold text-slate-800 block">
                                {tx.member.firstname} {tx.member.lastname}
                              </span>
                              <span className="text-[10px] text-slate-500 font-mono">
                                {tx.member.member_code}
                              </span>
                            </div>
                          ) : (
                            <span className="text-slate-400 italic">Unknown Member</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                              tx.transaction_type === "Share Capital Contribution"
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : tx.transaction_type === "Subscription"
                                ? "bg-blue-50 text-blue-700 border-blue-200"
                                : "bg-amber-50 text-amber-700 border-amber-200"
                            }`}
                          >
                            {tx.transaction_type}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-slate-800">
                          ₱{Number(tx.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3 px-4 text-right font-semibold text-emerald-700">
                          ₱{Number(tx.balance_after).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3 px-4 text-slate-600">
                          {tx.payment_method}
                          {tx.remarks && (
                            <span className="block text-[10px] text-slate-400 truncate max-w-xs">
                              {tx.remarks}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-slate-500">
                          {tx.recorded_by}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <Pagination
              currentPage={txPage}
              lastPage={txLastPage}
              onPageChange={(p) => {
                setTxPage(p);
                fetchTransactions(p);
              }}
            />
          </div>
        )}
      </div>

      {/* MODAL 1: RECORD SHARE CAPITAL CONTRIBUTION */}
      <Modal isOpen={isContributeModalOpen} onClose={() => setIsContributeModalOpen(false)}>
        <div className="p-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-emerald-50 text-emerald-700">
                <TbCurrencyPeso className="w-5 h-5" />
              </span>
              <div>
                <h3 className="text-base font-bold text-slate-800">Record Share Capital Contribution</h3>
                <p className="text-xs text-slate-500">Adds to member paid-up share capital equity.</p>
              </div>
            </div>
            <button
              onClick={() => setIsContributeModalOpen(false)}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
            >
              <FiX className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleContribSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Select Member <span className="text-red-500">*</span>
              </label>
              <select
                required
                value={contribMemberId}
                onChange={(e) => setContribMemberId(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-600 bg-white"
              >
                <option value="">-- Choose Member --</option>
                {allActiveMembers.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.member_code} - {m.firstname} {m.lastname} (Paid: ₱{Number(m.paid_up_capital || 0).toFixed(2)})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Amount (₱) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  value={contribAmount}
                  onChange={(e) => setContribAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Payment Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={contribDate}
                  onChange={(e) => setContribDate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Payment Method <span className="text-red-500">*</span>
                </label>
                <select
                  value={contribMethod}
                  onChange={(e) => setContribMethod(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-600 bg-white"
                >
                  <option value="Cash">Cash</option>
                  <option value="GCash">GCash</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="Check">Check</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Official Receipt (OR) Number
                </label>
                <input
                  type="text"
                  value={contribRef}
                  onChange={(e) => setContribRef(e.target.value)}
                  placeholder="Leave blank for auto-generate"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-600 font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Remarks / Notes
              </label>
              <textarea
                rows={2}
                value={contribRemarks}
                onChange={(e) => setContribRemarks(e.target.value)}
                placeholder="Optional payment notes..."
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
            </div>

            {/* Accounting Sync Toggle */}
            <div className="bg-emerald-50/70 p-3.5 rounded-xl border border-emerald-200 flex items-start gap-2.5">
              <input
                type="checkbox"
                id="syncReceipt"
                checked={contribSyncReceipt}
                onChange={(e) => setContribSyncReceipt(e.target.checked)}
                className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500"
              />
              <label htmlFor="syncReceipt" className="text-xs text-emerald-900 cursor-pointer">
                <strong className="block font-semibold">Sync into Books of Accounts (Cash Receipts Journal)</strong>
                Automatically creates an Official Receipt in Cash Receipts under <em>Share Capital</em> to maintain unified General Ledger books.
              </label>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsContributeModalOpen(false)}
                className="px-4 py-2 border border-slate-200 text-slate-600 text-xs font-semibold rounded-xl hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={contribSubmitting}
                className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold rounded-xl shadow-sm transition-colors cursor-pointer disabled:opacity-50"
              >
                {contribSubmitting ? "Saving..." : "Record Contribution"}
              </button>
            </div>
          </form>
        </div>
      </Modal>

      {/* MODAL 2: RECORD MEMBERSHIP FEE */}
      <Modal isOpen={isFeeModalOpen} onClose={() => setIsFeeModalOpen(false)}>
        <div className="p-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-purple-50 text-purple-700">
                <FiUserCheck className="w-5 h-5" />
              </span>
              <div>
                <h3 className="text-base font-bold text-slate-800">Record Membership Fee</h3>
                <p className="text-xs text-slate-500">Cooperative one-time registration/membership fee.</p>
              </div>
            </div>
            <button
              onClick={() => setIsFeeModalOpen(false)}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
            >
              <FiX className="w-5 h-5" />
            </button>
          </div>

          {/* Strict Separation Warning */}
          <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl mb-4 text-xs text-amber-900 flex items-start gap-2">
            <FiAlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <strong>Cooperative Compliance Notice:</strong> Membership fees are operating income of the cooperative and are <strong>strictly kept separate</strong> from member share capital equity.
            </div>
          </div>

          <form onSubmit={handleFeeSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Select Member <span className="text-red-500">*</span>
              </label>
              <select
                required
                value={feeMemberId}
                onChange={(e) => setFeeMemberId(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-600 bg-white"
              >
                <option value="">-- Choose Member --</option>
                {allActiveMembers.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.member_code} - {m.firstname} {m.lastname} ({m.membership_fee_status === "Paid" ? "Fee Paid" : "Fee Unpaid"})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Membership Fee Amount (₱) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  value={feeAmount}
                  onChange={(e) => setFeeAmount(e.target.value)}
                  placeholder="e.g. 200.00"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Payment Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={feeDate}
                  onChange={(e) => setFeeDate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Payment Method <span className="text-red-500">*</span>
                </label>
                <select
                  value={feeMethod}
                  onChange={(e) => setFeeMethod(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-600 bg-white"
                >
                  <option value="Cash">Cash</option>
                  <option value="GCash">GCash</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Official Receipt (OR) Number
                </label>
                <input
                  type="text"
                  value={feeOr}
                  onChange={(e) => setFeeOr(e.target.value)}
                  placeholder="Auto-generated if empty"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-600 font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Remarks
              </label>
              <textarea
                rows={2}
                value={feeRemarks}
                onChange={(e) => setFeeRemarks(e.target.value)}
                placeholder="Optional remarks..."
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
            </div>

            {/* Accounting Sync Toggle */}
            <div className="bg-purple-50/70 p-3.5 rounded-xl border border-purple-200 flex items-start gap-2.5">
              <input
                type="checkbox"
                id="syncFeeReceipt"
                checked={feeSyncReceipt}
                onChange={(e) => setFeeSyncReceipt(e.target.checked)}
                className="mt-0.5 rounded text-purple-600 focus:ring-purple-500"
              />
              <label htmlFor="syncFeeReceipt" className="text-xs text-purple-900 cursor-pointer">
                <strong className="block font-semibold">Record in Books of Accounts (Cash Receipts Journal)</strong>
                Records as <em>Membership Fee</em> operating income in the Cash Receipts Journal.
              </label>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsFeeModalOpen(false)}
                className="px-4 py-2 border border-slate-200 text-slate-600 text-xs font-semibold rounded-xl hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={feeSubmitting}
                className="px-4 py-2 bg-purple-700 hover:bg-purple-800 text-white text-xs font-semibold rounded-xl shadow-sm transition-colors cursor-pointer disabled:opacity-50"
              >
                {feeSubmitting ? "Recording..." : "Record Fee"}
              </button>
            </div>
          </form>
        </div>
      </Modal>

      {/* MODAL 3: MEMBER SHARE CAPITAL STATEMENT & LEDGER */}
      <Modal isOpen={isLedgerModalOpen} onClose={() => setIsLedgerModalOpen(false)} className="max-w-3xl">
        <div className="p-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
            <div>
              <h3 className="text-base font-bold text-slate-800">Member Share Capital Statement</h3>
              <p className="text-xs text-slate-500">Official individual member equity audit ledger.</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handlePrintMemberStatement}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors cursor-pointer border border-slate-200"
              >
                <FiPrinter className="w-3.5 h-3.5" />
                Print Statement
              </button>
              <button
                onClick={() => setIsLedgerModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>
          </div>

          {ledgerLoading ? (
            <div className="py-12 text-center text-slate-400">
              <div className="w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              <p className="text-xs">Loading member statement...</p>
            </div>
          ) : memberLedgerData ? (
            <div className="space-y-5">
              {/* Member Card */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 flex flex-col sm:flex-row justify-between gap-4 text-xs">
                <div>
                  <h4 className="font-bold text-sm text-slate-800">
                    {memberLedgerData.member.firstname} {memberLedgerData.member.lastname}
                  </h4>
                  <p className="text-slate-500 font-mono mt-0.5">Code: {memberLedgerData.member.member_code}</p>
                  <p className="text-slate-500">Membership Date: {memberLedgerData.member.membership_date}</p>
                </div>

                <div className="grid grid-cols-3 gap-3 text-right">
                  <div>
                    <span className="text-[11px] text-slate-500 block uppercase">Paid-Up Share Capital</span>
                    <strong className="text-emerald-700 text-xs">
                      ₱{Number(memberLedgerData.summary.paid_up_capital).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </strong>
                  </div>

                  <div>
                    <span className="text-[11px] text-slate-500 block uppercase">CBU Balance</span>
                    <strong className="text-amber-700 text-xs">
                      ₱{Number(memberLedgerData.summary.cbu_balance).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </strong>
                  </div>

                  <div>
                    <span className="text-[11px] text-slate-500 block uppercase">Total Equity</span>
                    <strong className="text-slate-900 text-xs">
                      ₱{Number(memberLedgerData.summary.total_equity).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </strong>
                  </div>
                </div>
              </div>

              {/* Membership Fee Status Banner */}
              <div className={`p-3 rounded-xl border text-xs flex items-center justify-between ${
                memberLedgerData.summary.membership_fee_status === "Paid"
                  ? "bg-emerald-50 text-emerald-900 border-emerald-200"
                  : "bg-amber-50 text-amber-900 border-amber-200"
              }`}>
                <div className="flex items-center gap-2">
                  <FiUserCheck className="w-4 h-4 shrink-0" />
                  <span>
                    Membership Fee: <strong>{memberLedgerData.summary.membership_fee_status}</strong>
                    {memberLedgerData.summary.membership_fee_status === "Paid" && (
                      <> (₱{Number(memberLedgerData.summary.membership_fee_amount).toFixed(2)} on {memberLedgerData.summary.membership_fee_date || "N/A"}, OR: {memberLedgerData.summary.membership_fee_or || "N/A"})</>
                    )}
                  </span>
                </div>
                <span className="text-[10px] opacity-80 uppercase tracking-wider font-semibold">Separate from Share Capital</span>
              </div>

              {/* Transactions Ledger */}
              <div>
                <h5 className="font-bold text-xs text-slate-700 uppercase tracking-wider mb-2">Transaction History</h5>
                <div className="overflow-x-auto rounded-xl border border-slate-100">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 uppercase tracking-wider font-semibold text-[11px]">
                        <th className="py-2.5 px-3">Date</th>
                        <th className="py-2.5 px-3">OR / Ref #</th>
                        <th className="py-2.5 px-3">Type</th>
                        <th className="py-2.5 px-3 text-right">Amount (₱)</th>
                        <th className="py-2.5 px-3 text-right">Balance After (₱)</th>
                        <th className="py-2.5 px-3">Remarks</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(!memberLedgerData.transactions || memberLedgerData.transactions.length === 0) ? (
                        <tr>
                          <td colSpan={6} className="py-6 text-center text-slate-400">
                            No capital transactions recorded yet for this member.
                          </td>
                        </tr>
                      ) : (
                        memberLedgerData.transactions.map((tx: ShareCapitalTransaction) => (
                          <tr key={tx.id} className="hover:bg-slate-50/50">
                            <td className="py-2.5 px-3 text-slate-600 whitespace-nowrap">{tx.transaction_date}</td>
                            <td className="py-2.5 px-3 font-mono font-semibold text-slate-800">{tx.reference_no}</td>
                            <td className="py-2.5 px-3">
                              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                                {tx.transaction_type}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-right font-semibold text-slate-800">
                              ₱{Number(tx.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                            </td>
                            <td className="py-2.5 px-3 text-right font-bold text-emerald-700">
                              ₱{Number(tx.balance_after).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                            </td>
                            <td className="py-2.5 px-3 text-slate-500 text-[11px] truncate max-w-xs">
                              {tx.remarks || "-"}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </Modal>
    </div>
  );
};

export default ShareCapitalPage;
