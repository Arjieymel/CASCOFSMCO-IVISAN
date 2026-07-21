import { useState, useEffect, type FormEvent } from "react";
import BooksOfAccountsService from "../../services/BooksOfAccountsService";
import type { CashDisbursementRecord } from "../../Interfaces";
import SearchBar from "../../components/SearchBar";
import Pagination from "../../components/Pagination";
import Modal from "../../components/Modal";
import { exportToExcel, exportToPDF, printReport } from "../../utils/exportUtils";
import { FiPlus, FiEdit, FiTrash2, FiEye, FiPrinter, FiFileText, FiDownload, FiCalendar } from "react-icons/fi";
import Swal from "sweetalert2";

const CashDisbursementPage = () => {
  const [records, setRecords] = useState<CashDisbursementRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);

  // Search & Filters
  const [search, setSearch] = useState("");
  const [expenseFilter, setExpenseFilter] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [sortBy, setSortBy] = useState("disbursement_date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<CashDisbursementRecord | null>(null);

  // Form Fields
  const [voucherNumber, setVoucherNumber] = useState("");
  const [disbursementDate, setDisbursementDate] = useState("");
  const [payee, setPayee] = useState("");
  const [description, setDescription] = useState("");
  const [expenseAccount, setExpenseAccount] = useState("Operating Expenses");
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("Check");
  const [approvedBy, setApprovedBy] = useState("");
  const [remarks, setRemarks] = useState("");

  const [formErrors, setFormErrors] = useState<any>({});
  const [submitLoading, setSubmitLoading] = useState(false);

  const expenseAccounts = [
    "Operating Expenses",
    "Copra Procurement Expenses",
    "Equipment & Maintenance",
    "Utilities & Rent",
    "Salaries & Wages",
    "Office Supplies",
    "Transport & Shipping",
    "Miscellaneous"
  ];

  const paymentMethodsList = ["Cash", "Check", "Bank Transfer", "GCash"];

  const fetchRecords = async (page: number = 1) => {
    try {
      setLoading(true);
      const res = await BooksOfAccountsService.loadCashDisbursements(
        page, search, expenseFilter, startDate, endDate, 10, sortBy, sortOrder
      );
      setRecords(res.data.data);
      setCurrentPage(res.data.current_page);
      setLastPage(res.data.last_page);
    } catch (err) {
      console.error("Failed to load disbursements: ", err);
      Swal.fire("Error", "Could not fetch Cash Disbursement Journal records.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords(1);
  }, [search, expenseFilter, startDate, endDate, sortBy, sortOrder]);

  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(column);
      setSortOrder("desc");
    }
  };

  const openAddModal = () => {
    setVoucherNumber("");
    setDisbursementDate(new Date().toISOString().split("T")[0]);
    setPayee("");
    setDescription("");
    setExpenseAccount("Operating Expenses");
    setAmount("");
    setPaymentMethod("Check");
    setApprovedBy("General Manager");
    setRemarks("");
    setFormErrors({});
    setIsAddModalOpen(true);
  };

  const openEditModal = (r: CashDisbursementRecord) => {
    setSelectedRecord(r);
    setVoucherNumber(r.voucher_number);
    setDisbursementDate(r.disbursement_date ? (typeof r.disbursement_date === 'string' ? r.disbursement_date.split('T')[0] : r.disbursement_date) : "");
    setPayee(r.payee);
    setDescription(r.description);
    setExpenseAccount(r.expense_account);
    setAmount(r.amount.toString());
    setPaymentMethod(r.payment_method);
    setApprovedBy(r.approved_by);
    setRemarks(r.remarks || "");
    setFormErrors({});
    setIsEditModalOpen(true);
  };

  const openViewModal = (r: CashDisbursementRecord) => {
    setSelectedRecord(r);
    setIsViewModalOpen(true);
  };

  const handleAdd = async (e: FormEvent) => {
    e.preventDefault();
    setFormErrors({});

    try {
      setSubmitLoading(true);
      await BooksOfAccountsService.storeCashDisbursement({
        voucher_number: voucherNumber || undefined,
        disbursement_date: disbursementDate,
        payee,
        description,
        expense_account: expenseAccount,
        amount: parseFloat(amount),
        payment_method: paymentMethod,
        approved_by: approvedBy,
        remarks
      });
      setIsAddModalOpen(false);
      Swal.fire("Saved", "Disbursement voucher recorded successfully.", "success");
      fetchRecords(currentPage);
    } catch (err: any) {
      if (err.response && err.response.status === 422) {
        setFormErrors(err.response.data.errors);
      } else {
        Swal.fire("Error", "Failed to save disbursement record.", "error");
      }
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleEdit = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedRecord) return;
    setFormErrors({});

    try {
      setSubmitLoading(true);
      await BooksOfAccountsService.updateCashDisbursement(selectedRecord.id, {
        voucher_number: voucherNumber,
        disbursement_date: disbursementDate,
        payee,
        description,
        expense_account: expenseAccount,
        amount: parseFloat(amount),
        payment_method: paymentMethod,
        approved_by: approvedBy,
        remarks
      });
      setIsEditModalOpen(false);
      Swal.fire("Saved", "Disbursement voucher updated successfully.", "success");
      fetchRecords(currentPage);
    } catch (err: any) {
      if (err.response && err.response.status === 422) {
        setFormErrors(err.response.data.errors);
      } else {
        Swal.fire("Error", "Failed to update record.", "error");
      }
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleDelete = async (r: CashDisbursementRecord) => {
    const result = await Swal.fire({
      title: "Delete Voucher?",
      text: `Are you sure you want to delete Cash Disbursement Voucher ${r.voucher_number}?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#EF4444",
      cancelButtonColor: "#64748B",
      confirmButtonText: "Yes, delete",
      cancelButtonText: "Cancel"
    });

    if (!result.isConfirmed) return;

    try {
      await BooksOfAccountsService.destroyCashDisbursement(r.id);
      Swal.fire("Deleted", "Voucher deleted successfully.", "success");
      fetchRecords(currentPage);
    } catch (err) {
      console.error(err);
      Swal.fire("Error", "Failed to delete disbursement voucher.", "error");
    }
  };

  const handlePrintVoucher = (r: CashDisbursementRecord) => {
    const headers = ["Field", "Information"];
    const rows = [
      ["Voucher Number", r.voucher_number],
      ["Disbursement Date", r.disbursement_date],
      ["Payee", r.payee],
      ["Expense Account", r.expense_account],
      ["Amount Paid", `₱ ${parseFloat(r.amount.toString()).toLocaleString(undefined, { minimumFractionDigits: 2 })}`],
      ["Payment Method", r.payment_method],
      ["Description", r.description],
      ["Approved By", r.approved_by],
      ["Remarks", r.remarks || "N/A"]
    ];
    printReport(`Disbursement Voucher - ${r.voucher_number}`, headers, rows);
  };

  const handleExportExcel = () => {
    const dataToExport = records.map(r => ({
      "Voucher No": r.voucher_number,
      "Date": r.disbursement_date,
      "Payee": r.payee,
      "Expense Account": r.expense_account,
      "Amount (₱)": r.amount,
      "Payment Method": r.payment_method,
      "Approved By": r.approved_by,
      "Description": r.description,
      "Remarks": r.remarks || ""
    }));
    exportToExcel(dataToExport, `Cash_Disbursement_Journal_${new Date().toISOString().split("T")[0]}`);
  };

  const handlePrint = () => {
    const headers = ["Voucher No", "Date", "Payee", "Expense Account", "Amount (₱)", "Method", "Approved By"];
    const rows = records.map(r => [
      r.voucher_number,
      r.disbursement_date,
      r.payee,
      r.expense_account,
      `₱ ${parseFloat(r.amount.toString()).toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
      r.payment_method,
      r.approved_by
    ]);
    printReport("Cash Disbursement Journal", headers, rows);
  };

  const handleExportPDF = () => {
    const headers = ["Voucher No", "Date", "Payee", "Expense Account", "Amount (₱)", "Method", "Approved By"];
    const rows = records.map(r => [
      r.voucher_number,
      r.disbursement_date,
      r.payee,
      r.expense_account,
      `₱ ${parseFloat(r.amount.toString()).toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
      r.payment_method,
      r.approved_by
    ]);
    exportToPDF("Cash Disbursement Journal", headers, rows);
  };

  return (
    <div className="space-y-6">
      {/* Header Panel */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center bg-white p-6 rounded-2xl border border-slate-100 shadow-xs gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-2xl">💸</span>
            <h1 className="text-xl font-bold text-slate-800">Cash Disbursement Journal</h1>
          </div>
          <p className="text-sm text-slate-500 mt-0.5">Records all cash and check payments made by the cooperative for accounts and expenses.</p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={handlePrint}
            className="px-3.5 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold text-xs flex items-center gap-1.5 transition cursor-pointer"
          >
            <FiPrinter className="w-4 h-4 text-slate-500" />
            <span>Print Journal</span>
          </button>

          <button
            onClick={handleExportPDF}
            className="px-3.5 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold text-xs flex items-center gap-1.5 transition cursor-pointer"
          >
            <FiFileText className="w-4 h-4 text-red-500" />
            <span>Export PDF</span>
          </button>

          <button
            onClick={handleExportExcel}
            className="px-3.5 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold text-xs flex items-center gap-1.5 transition cursor-pointer"
          >
            <FiDownload className="w-4 h-4 text-emerald-600" />
            <span>Export Excel</span>
          </button>

          <button
            onClick={openAddModal}
            className="bg-primary hover:bg-primary-dark text-white font-semibold py-2 px-4 rounded-xl shadow-md hover:shadow-lg transition flex items-center gap-2 cursor-pointer text-xs"
          >
            <FiPlus className="w-4 h-4" />
            <span>Add Disbursement</span>
          </button>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4">
          <SearchBar value={search} onChange={setSearch} placeholder="Search voucher no, payee, account, description..." />

          <div className="flex flex-col sm:flex-row items-center gap-3">
            <select
              value={expenseFilter}
              onChange={(e) => setExpenseFilter(e.target.value)}
              className="w-full sm:w-52 px-3.5 py-2 border border-slate-200 rounded-xl bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary text-xs font-medium"
            >
              <option value="">All Expense Accounts</option>
              {expenseAccounts.map(e => (
                <option key={e} value={e}>{e}</option>
              ))}
            </select>

            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
              <FiCalendar className="w-4 h-4 text-slate-400" />
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:ring-1 focus:ring-primary focus:outline-none"
              />
              <span>to</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:ring-1 focus:ring-primary focus:outline-none"
              />
              {(startDate || endDate) && (
                <button
                  onClick={() => { setStartDate(""); setEndDate(""); }}
                  className="text-primary hover:underline font-bold text-[11px] ml-1 cursor-pointer"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            <p className="text-slate-400 text-sm">Fetching cash disbursement records...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100 text-sm">
              <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider text-xs">
                <tr>
                  <th onClick={() => handleSort("voucher_number")} className="px-6 py-4 text-left cursor-pointer hover:text-slate-700">
                    Voucher No {sortBy === "voucher_number" ? (sortOrder === "asc" ? "▲" : "▼") : ""}
                  </th>
                  <th onClick={() => handleSort("disbursement_date")} className="px-6 py-4 text-left cursor-pointer hover:text-slate-700">
                    Date {sortBy === "disbursement_date" ? (sortOrder === "asc" ? "▲" : "▼") : ""}
                  </th>
                  <th onClick={() => handleSort("payee")} className="px-6 py-4 text-left cursor-pointer hover:text-slate-700">
                    Payee {sortBy === "payee" ? (sortOrder === "asc" ? "▲" : "▼") : ""}
                  </th>
                  <th onClick={() => handleSort("expense_account")} className="px-6 py-4 text-left cursor-pointer hover:text-slate-700">
                    Expense Account {sortBy === "expense_account" ? (sortOrder === "asc" ? "▲" : "▼") : ""}
                  </th>
                  <th onClick={() => handleSort("amount")} className="px-6 py-4 text-right cursor-pointer hover:text-slate-700">
                    Amount (₱) {sortBy === "amount" ? (sortOrder === "asc" ? "▲" : "▼") : ""}
                  </th>
                  <th className="px-6 py-4 text-left">Method</th>
                  <th className="px-6 py-4 text-left">Approved By</th>
                  <th className="px-6 py-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {records.length > 0 ? (
                  records.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 font-semibold text-primary">{r.voucher_number}</td>
                      <td className="px-6 py-4 whitespace-nowrap">{r.disbursement_date}</td>
                      <td className="px-6 py-4 font-medium text-slate-800">{r.payee}</td>
                      <td className="px-6 py-4 text-slate-600">{r.expense_account}</td>
                      <td className="px-6 py-4 text-right font-bold text-rose-600">
                        ₱ {parseFloat(r.amount.toString()).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-6 py-4 text-xs font-semibold text-slate-500">{r.payment_method}</td>
                      <td className="px-6 py-4 text-xs font-medium text-slate-600">{r.approved_by}</td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex justify-center items-center gap-1">
                          <button
                            onClick={() => openViewModal(r)}
                            title="View Details"
                            className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 cursor-pointer"
                          >
                            <FiEye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handlePrintVoucher(r)}
                            title="Print Voucher"
                            className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 cursor-pointer"
                          >
                            <FiPrinter className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => openEditModal(r)}
                            title="Edit Disbursement"
                            className="p-1.5 rounded-lg text-primary hover:bg-green-50 cursor-pointer"
                          >
                            <FiEdit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(r)}
                            title="Delete Disbursement"
                            className="p-1.5 rounded-lg text-red-600 hover:bg-red-50 cursor-pointer"
                          >
                            <FiTrash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center text-slate-400 font-medium">
                      No cash disbursement records found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
        <Pagination currentPage={currentPage} lastPage={lastPage} onPageChange={(p) => fetchRecords(p)} />
      </div>

      {/* ADD DISBURSEMENT MODAL */}
      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} showCloseButton={true}>
        <div className="p-2 space-y-4">
          <div>
            <h3 className="text-lg font-bold text-slate-800">Add Cash Disbursement Voucher</h3>
            <p className="text-xs text-slate-500">Record a new payment voucher for expenses.</p>
          </div>

          <form onSubmit={handleAdd} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Disbursement Date</label>
                <input
                  type="date"
                  required
                  value={disbursementDate}
                  onChange={(e) => setDisbursementDate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Voucher Number (Optional)</label>
                <input
                  type="text"
                  placeholder="Auto-generated (CDV-...)"
                  value={voucherNumber}
                  onChange={(e) => setVoucherNumber(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
                {formErrors.voucher_number && <p className="text-red-500 text-xs mt-1">{formErrors.voucher_number[0]}</p>}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Payee Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Visayas Supplies Inc."
                  value={payee}
                  onChange={(e) => setPayee(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Expense Account</label>
                <select
                  value={expenseAccount}
                  onChange={(e) => setExpenseAccount(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {expenseAccounts.map(a => (
                    <option key={a} value={a}>{a}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Disbursement Amount (₱)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Payment Method</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {paymentMethodsList.map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Description</label>
              <textarea
                required
                rows={2}
                placeholder="Details of payment purpose..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              ></textarea>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Approved By</label>
                <input
                  type="text"
                  required
                  placeholder="Approving Officer"
                  value={approvedBy}
                  onChange={(e) => setApprovedBy(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Remarks</label>
                <input
                  type="text"
                  placeholder="Check # or additional notes"
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>

            <div className="flex gap-3 justify-end pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="px-4 py-2 text-sm font-semibold border border-slate-200 rounded-xl text-slate-500 hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitLoading}
                className="px-5 py-2 text-sm font-semibold bg-primary hover:bg-primary-dark text-white rounded-xl shadow-md cursor-pointer disabled:opacity-50"
              >
                {submitLoading ? "Saving..." : "Add Disbursement"}
              </button>
            </div>
          </form>
        </div>
      </Modal>

      {/* EDIT MODAL */}
      <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} showCloseButton={true}>
        <div className="p-2 space-y-4">
          <div>
            <h3 className="text-lg font-bold text-slate-800">Edit Cash Disbursement</h3>
            <p className="text-xs text-slate-500">Voucher: <span className="font-semibold text-primary">{selectedRecord?.voucher_number}</span></p>
          </div>

          <form onSubmit={handleEdit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Disbursement Date</label>
                <input
                  type="date"
                  required
                  value={disbursementDate}
                  onChange={(e) => setDisbursementDate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Voucher Number</label>
                <input
                  type="text"
                  required
                  value={voucherNumber}
                  onChange={(e) => setVoucherNumber(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Payee Name</label>
                <input
                  type="text"
                  required
                  value={payee}
                  onChange={(e) => setPayee(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Expense Account</label>
                <select
                  value={expenseAccount}
                  onChange={(e) => setExpenseAccount(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {expenseAccounts.map(a => (
                    <option key={a} value={a}>{a}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Disbursement Amount (₱)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Payment Method</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {paymentMethodsList.map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Description</label>
              <textarea
                required
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              ></textarea>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Approved By</label>
                <input
                  type="text"
                  required
                  value={approvedBy}
                  onChange={(e) => setApprovedBy(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Remarks</label>
                <input
                  type="text"
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>

            <div className="flex gap-3 justify-end pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="px-4 py-2 text-sm font-semibold border border-slate-200 rounded-xl text-slate-500 hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitLoading}
                className="px-5 py-2 text-sm font-semibold bg-primary hover:bg-primary-dark text-white rounded-xl shadow-md cursor-pointer disabled:opacity-50"
              >
                {submitLoading ? "Updating..." : "Update Disbursement"}
              </button>
            </div>
          </form>
        </div>
      </Modal>

      {/* VIEW VOUCHER MODAL */}
      <Modal isOpen={isViewModalOpen} onClose={() => setIsViewModalOpen(false)} showCloseButton={true}>
        {selectedRecord && (
          <div className="p-2 space-y-4">
            <div className="flex justify-between items-start border-b border-slate-100 pb-3">
              <div>
                <span className="text-xs uppercase font-bold text-primary tracking-wider">Disbursement Voucher</span>
                <h3 className="text-xl font-bold text-slate-800 mt-0.5">{selectedRecord.voucher_number}</h3>
                <p className="text-xs text-slate-400">Date: {selectedRecord.disbursement_date}</p>
              </div>
              <button
                onClick={() => handlePrintVoucher(selectedRecord)}
                className="px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 font-semibold rounded-lg text-xs flex items-center gap-1 cursor-pointer"
              >
                <FiPrinter className="w-3.5 h-3.5" />
                <span>Print Voucher</span>
              </button>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-3 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-xs font-semibold text-slate-400 uppercase">Amount Paid</span>
                <span className="text-xl font-extrabold text-rose-600">₱ {parseFloat(selectedRecord.amount.toString()).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200/60">
                <div>
                  <span className="text-xs font-semibold text-slate-400 uppercase block">Payee</span>
                  <span className="font-bold text-slate-800">{selectedRecord.payee}</span>
                </div>
                <div>
                  <span className="text-xs font-semibold text-slate-400 uppercase block">Expense Account</span>
                  <span className="font-semibold text-slate-700">{selectedRecord.expense_account}</span>
                </div>
              </div>
            </div>

            <div className="space-y-2 text-sm text-slate-700">
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase">Payment Method</p>
                <p className="mt-0.5 font-medium">{selectedRecord.payment_method}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase">Description / Purpose</p>
                <p className="mt-0.5 font-medium">{selectedRecord.description}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase">Approved By</p>
                <p className="mt-0.5 font-medium">{selectedRecord.approved_by}</p>
              </div>
              {selectedRecord.remarks && (
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase">Remarks</p>
                  <p className="mt-0.5 text-slate-600">{selectedRecord.remarks}</p>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-4 border-t border-slate-100">
              <button
                onClick={() => setIsViewModalOpen(false)}
                className="px-5 py-2 text-sm font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default CashDisbursementPage;
