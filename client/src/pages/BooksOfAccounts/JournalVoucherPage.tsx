import { useState, useEffect, type FormEvent } from "react";
import BooksOfAccountsService from "../../services/BooksOfAccountsService";
import type { JournalVoucherRecord } from "../../Interfaces";
import SearchBar from "../../components/SearchBar";
import Pagination from "../../components/Pagination";
import Modal from "../../components/Modal";
import { exportToExcel, exportToPDF, printReport } from "../../utils/exportUtils";
import { FiPlus, FiEdit, FiTrash2, FiEye, FiPrinter, FiFileText, FiDownload, FiCalendar } from "react-icons/fi";
import Swal from "sweetalert2";

const JournalVoucherPage = () => {
  const [records, setRecords] = useState<JournalVoucherRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);

  // Search & Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [sortBy, setSortBy] = useState("voucher_date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<JournalVoucherRecord | null>(null);

  // Form Fields
  const [voucherNumber, setVoucherNumber] = useState("");
  const [voucherDate, setVoucherDate] = useState("");
  const [description, setDescription] = useState("");
  const [debitAccount, setDebitAccount] = useState("1010 - Cash on Hand");
  const [creditAccount, setCreditAccount] = useState("4010 - Sales Revenue");
  const [amount, setAmount] = useState("");
  const [preparedBy, setPreparedBy] = useState("");
  const [approvedBy, setApprovedBy] = useState("");
  const [status, setStatus] = useState<"Draft" | "Posted" | "Approved" | "Cancelled">("Draft");

  const [formErrors, setFormErrors] = useState<any>({});
  const [submitLoading, setSubmitLoading] = useState(false);

  const chartOfAccounts = [
    "1010 - Cash on Hand",
    "1020 - Cash in Bank",
    "1030 - Accounts Receivable",
    "1040 - Inventory Stock",
    "1050 - Equipment & Assets",
    "2010 - Accounts Payable",
    "3010 - Cooperative Paid-up Capital",
    "4010 - Sales Revenue",
    "4020 - Other Income",
    "5010 - Cost of Goods Sold",
    "5020 - Operating Expenses",
    "5030 - Salaries & Compensation",
    "5040 - Depreciation Expense"
  ];

  const statusesList = ["Draft", "Posted", "Approved", "Cancelled"];

  const fetchRecords = async (page: number = 1) => {
    try {
      setLoading(true);
      const res = await BooksOfAccountsService.loadJournalVouchers(
        page, search, statusFilter, startDate, endDate, 10, sortBy, sortOrder
      );
      setRecords(res.data.data);
      setCurrentPage(res.data.current_page);
      setLastPage(res.data.last_page);
    } catch (err) {
      console.error("Failed to load journal vouchers: ", err);
      Swal.fire("Error", "Could not fetch Journal Voucher Register records.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords(1);
  }, [search, statusFilter, startDate, endDate, sortBy, sortOrder]);

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
    setVoucherDate(new Date().toISOString().split("T")[0]);
    setDescription("");
    setDebitAccount("1010 - Cash on Hand");
    setCreditAccount("4010 - Sales Revenue");
    setAmount("");
    setPreparedBy("");
    setApprovedBy("Finance Manager");
    setStatus("Draft");
    setFormErrors({});
    setIsAddModalOpen(true);
  };

  const openEditModal = (r: JournalVoucherRecord) => {
    setSelectedRecord(r);
    setVoucherNumber(r.voucher_number);
    setVoucherDate(r.voucher_date ? (typeof r.voucher_date === 'string' ? r.voucher_date.split('T')[0] : r.voucher_date) : "");
    setDescription(r.description);
    setDebitAccount(r.debit_account);
    setCreditAccount(r.credit_account);
    setAmount(r.amount.toString());
    setPreparedBy(r.prepared_by);
    setApprovedBy(r.approved_by);
    setStatus(r.status);
    setFormErrors({});
    setIsEditModalOpen(true);
  };

  const openViewModal = (r: JournalVoucherRecord) => {
    setSelectedRecord(r);
    setIsViewModalOpen(true);
  };

  const handleAdd = async (e: FormEvent) => {
    e.preventDefault();
    setFormErrors({});

    try {
      setSubmitLoading(true);
      await BooksOfAccountsService.storeJournalVoucher({
        voucher_number: voucherNumber || undefined,
        voucher_date: voucherDate,
        description,
        debit_account: debitAccount,
        credit_account: creditAccount,
        amount: parseFloat(amount),
        prepared_by: preparedBy || undefined,
        approved_by: approvedBy,
        status
      });
      setIsAddModalOpen(false);
      Swal.fire("Saved", "Journal Voucher created successfully.", "success");
      fetchRecords(currentPage);
    } catch (err: any) {
      if (err.response && err.response.status === 422) {
        setFormErrors(err.response.data.errors);
      } else {
        Swal.fire("Error", "Failed to create Journal Voucher.", "error");
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
      await BooksOfAccountsService.updateJournalVoucher(selectedRecord.id, {
        voucher_number: voucherNumber,
        voucher_date: voucherDate,
        description,
        debit_account: debitAccount,
        credit_account: creditAccount,
        amount: parseFloat(amount),
        prepared_by: preparedBy,
        approved_by: approvedBy,
        status
      });
      setIsEditModalOpen(false);
      Swal.fire("Saved", "Journal Voucher updated successfully.", "success");
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

  const handleDelete = async (r: JournalVoucherRecord) => {
    const result = await Swal.fire({
      title: "Delete Journal Voucher?",
      text: `Are you sure you want to delete Journal Voucher ${r.voucher_number}?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#EF4444",
      cancelButtonColor: "#64748B",
      confirmButtonText: "Yes, delete",
      cancelButtonText: "Cancel"
    });

    if (!result.isConfirmed) return;

    try {
      await BooksOfAccountsService.destroyJournalVoucher(r.id);
      Swal.fire("Deleted", "Journal Voucher deleted successfully.", "success");
      fetchRecords(currentPage);
    } catch (err) {
      console.error(err);
      Swal.fire("Error", "Failed to delete Journal Voucher.", "error");
    }
  };

  const handlePrintVoucher = (r: JournalVoucherRecord) => {
    const headers = ["Account / Particulars", "Debit (₱)", "Credit (₱)"];
    const rows = [
      [`Debit: ${r.debit_account}`, `₱ ${parseFloat(r.amount.toString()).toLocaleString(undefined, { minimumFractionDigits: 2 })}`, "-"],
      [`Credit: ${r.credit_account}`, "-", `₱ ${parseFloat(r.amount.toString()).toLocaleString(undefined, { minimumFractionDigits: 2 })}`],
      [`Description: ${r.description}`, "", ""],
      [`Status: ${r.status} | Prepared By: ${r.prepared_by} | Approved By: ${r.approved_by}`, "", ""]
    ];
    printReport(`Journal Voucher - ${r.voucher_number} (${r.voucher_date})`, headers, rows);
  };

  const handleExportExcel = () => {
    const dataToExport = records.map(r => ({
      "Voucher No": r.voucher_number,
      "Date": r.voucher_date,
      "Debit Account": r.debit_account,
      "Credit Account": r.credit_account,
      "Amount (₱)": r.amount,
      "Prepared By": r.prepared_by,
      "Approved By": r.approved_by,
      "Status": r.status,
      "Description": r.description
    }));
    exportToExcel(dataToExport, `Journal_Voucher_Register_${new Date().toISOString().split("T")[0]}`);
  };

  const handlePrint = () => {
    const headers = ["Voucher No", "Date", "Debit Account", "Credit Account", "Amount (₱)", "Status", "Approved By"];
    const rows = records.map(r => [
      r.voucher_number,
      r.voucher_date,
      r.debit_account,
      r.credit_account,
      `₱ ${parseFloat(r.amount.toString()).toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
      r.status,
      r.approved_by
    ]);
    printReport("Journal Voucher Register", headers, rows);
  };

  const handleExportPDF = () => {
    const headers = ["Voucher No", "Date", "Debit Account", "Credit Account", "Amount (₱)", "Status", "Approved By"];
    const rows = records.map(r => [
      r.voucher_number,
      r.voucher_date,
      r.debit_account,
      r.credit_account,
      `₱ ${parseFloat(r.amount.toString()).toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
      r.status,
      r.approved_by
    ]);
    exportToPDF("Journal Voucher Register", headers, rows);
  };

  return (
    <div className="space-y-6">
      {/* Header Panel */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center bg-white p-6 rounded-2xl border border-slate-100 shadow-xs gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-2xl">📝</span>
            <h1 className="text-xl font-bold text-slate-800">Journal Voucher Register</h1>
          </div>
          <p className="text-sm text-slate-500 mt-0.5">Records all debit and credit journal vouchers for accounting adjustments and posted journal entries.</p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={handlePrint}
            className="px-3.5 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold text-xs flex items-center gap-1.5 transition cursor-pointer"
          >
            <FiPrinter className="w-4 h-4 text-slate-500" />
            <span>Print Register</span>
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
            <span>Create Voucher</span>
          </button>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4">
          <SearchBar value={search} onChange={setSearch} placeholder="Search voucher no, description, accounts, prepared by..." />

          <div className="flex flex-col sm:flex-row items-center gap-3">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full sm:w-40 px-3.5 py-2 border border-slate-200 rounded-xl bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary text-xs font-medium"
            >
              <option value="">All Statuses</option>
              {statusesList.map(s => (
                <option key={s} value={s}>{s}</option>
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
            <p className="text-slate-400 text-sm">Fetching journal vouchers...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100 text-sm">
              <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider text-xs">
                <tr>
                  <th onClick={() => handleSort("voucher_number")} className="px-6 py-4 text-left cursor-pointer hover:text-slate-700">
                    Voucher No {sortBy === "voucher_number" ? (sortOrder === "asc" ? "▲" : "▼") : ""}
                  </th>
                  <th onClick={() => handleSort("voucher_date")} className="px-6 py-4 text-left cursor-pointer hover:text-slate-700">
                    Date {sortBy === "voucher_date" ? (sortOrder === "asc" ? "▲" : "▼") : ""}
                  </th>
                  <th onClick={() => handleSort("debit_account")} className="px-6 py-4 text-left cursor-pointer hover:text-slate-700">
                    Debit Account {sortBy === "debit_account" ? (sortOrder === "asc" ? "▲" : "▼") : ""}
                  </th>
                  <th onClick={() => handleSort("credit_account")} className="px-6 py-4 text-left cursor-pointer hover:text-slate-700">
                    Credit Account {sortBy === "credit_account" ? (sortOrder === "asc" ? "▲" : "▼") : ""}
                  </th>
                  <th onClick={() => handleSort("amount")} className="px-6 py-4 text-right cursor-pointer hover:text-slate-700">
                    Amount (₱) {sortBy === "amount" ? (sortOrder === "asc" ? "▲" : "▼") : ""}
                  </th>
                  <th onClick={() => handleSort("status")} className="px-6 py-4 text-left cursor-pointer hover:text-slate-700">
                    Status {sortBy === "status" ? (sortOrder === "asc" ? "▲" : "▼") : ""}
                  </th>
                  <th className="px-6 py-4 text-left">Approved By</th>
                  <th className="px-6 py-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {records.length > 0 ? (
                  records.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 font-semibold text-primary">{r.voucher_number}</td>
                      <td className="px-6 py-4 whitespace-nowrap">{r.voucher_date}</td>
                      <td className="px-6 py-4 text-slate-800 font-medium">{r.debit_account}</td>
                      <td className="px-6 py-4 text-slate-800 font-medium">{r.credit_account}</td>
                      <td className="px-6 py-4 text-right font-bold text-slate-900">
                        ₱ {parseFloat(r.amount.toString()).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                          r.status === 'Approved' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                          r.status === 'Posted' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                          r.status === 'Draft' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                          'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}>
                          {r.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs font-medium text-slate-500">{r.approved_by}</td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex justify-center items-center gap-1">
                          <button
                            onClick={() => openViewModal(r)}
                            title="View Voucher"
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
                            title="Edit Voucher"
                            className="p-1.5 rounded-lg text-primary hover:bg-green-50 cursor-pointer"
                          >
                            <FiEdit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(r)}
                            title="Delete Voucher"
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
                      No journal vouchers found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
        <Pagination currentPage={currentPage} lastPage={lastPage} onPageChange={(p) => fetchRecords(p)} />
      </div>

      {/* CREATE VOUCHER MODAL */}
      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} showCloseButton={true}>
        <div className="p-2 space-y-4">
          <div>
            <h3 className="text-lg font-bold text-slate-800">Create Journal Voucher</h3>
            <p className="text-xs text-slate-500">Create accounting adjustment or ledger debit/credit voucher.</p>
          </div>

          <form onSubmit={handleAdd} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Voucher Date</label>
                <input
                  type="date"
                  required
                  value={voucherDate}
                  onChange={(e) => setVoucherDate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Voucher Number (Optional)</label>
                <input
                  type="text"
                  placeholder="Auto-generated (JV-...)"
                  value={voucherNumber}
                  onChange={(e) => setVoucherNumber(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
                {formErrors.voucher_number && <p className="text-red-500 text-xs mt-1">{formErrors.voucher_number[0]}</p>}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Debit Account</label>
                <select
                  value={debitAccount}
                  onChange={(e) => setDebitAccount(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {chartOfAccounts.map(a => (
                    <option key={a} value={a}>{a}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Credit Account</label>
                <select
                  value={creditAccount}
                  onChange={(e) => setCreditAccount(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {chartOfAccounts.map(a => (
                    <option key={a} value={a}>{a}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Voucher Amount (₱)</label>
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
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
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
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Description / Reason for Adjustment</label>
              <textarea
                required
                rows={2}
                placeholder="Details of accounting adjustment..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              ></textarea>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Prepared By (Optional)</label>
                <input
                  type="text"
                  placeholder="Defaults to current user"
                  value={preparedBy}
                  onChange={(e) => setPreparedBy(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

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
                {submitLoading ? "Creating..." : "Create Voucher"}
              </button>
            </div>
          </form>
        </div>
      </Modal>

      {/* EDIT VOUCHER MODAL */}
      <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} showCloseButton={true}>
        <div className="p-2 space-y-4">
          <div>
            <h3 className="text-lg font-bold text-slate-800">Edit Journal Voucher</h3>
            <p className="text-xs text-slate-500">Voucher: <span className="font-semibold text-primary">{selectedRecord?.voucher_number}</span></p>
          </div>

          <form onSubmit={handleEdit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Voucher Date</label>
                <input
                  type="date"
                  required
                  value={voucherDate}
                  onChange={(e) => setVoucherDate(e.target.value)}
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
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Debit Account</label>
                <select
                  value={debitAccount}
                  onChange={(e) => setDebitAccount(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {chartOfAccounts.map(a => (
                    <option key={a} value={a}>{a}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Credit Account</label>
                <select
                  value={creditAccount}
                  onChange={(e) => setCreditAccount(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {chartOfAccounts.map(a => (
                    <option key={a} value={a}>{a}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Voucher Amount (₱)</label>
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
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
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
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Description / Reason for Adjustment</label>
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
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Prepared By</label>
                <input
                  type="text"
                  required
                  value={preparedBy}
                  onChange={(e) => setPreparedBy(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

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
                {submitLoading ? "Updating..." : "Update Voucher"}
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
                <span className="text-xs uppercase font-bold text-primary tracking-wider">Journal Voucher Details</span>
                <h3 className="text-xl font-bold text-slate-800 mt-0.5">{selectedRecord.voucher_number}</h3>
                <p className="text-xs text-slate-400">Date: {selectedRecord.voucher_date}</p>
              </div>
              <button
                onClick={() => handlePrintVoucher(selectedRecord)}
                className="px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 font-semibold rounded-lg text-xs flex items-center gap-1 cursor-pointer"
              >
                <FiPrinter className="w-3.5 h-3.5" />
                <span>Print JV</span>
              </button>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-3 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-xs font-semibold text-slate-400 uppercase">Amount</span>
                <span className="text-xl font-extrabold text-slate-900">₱ {parseFloat(selectedRecord.amount.toString()).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200/60">
                <div>
                  <span className="text-xs font-semibold text-slate-400 uppercase block">Debit Account</span>
                  <span className="font-bold text-slate-800">{selectedRecord.debit_account}</span>
                </div>
                <div>
                  <span className="text-xs font-semibold text-slate-400 uppercase block">Credit Account</span>
                  <span className="font-bold text-slate-800">{selectedRecord.credit_account}</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm text-slate-700">
              <div className="col-span-2">
                <p className="text-xs font-semibold text-slate-400 uppercase">Description</p>
                <p className="mt-0.5 font-medium">{selectedRecord.description}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase">Prepared By</p>
                <p className="mt-0.5 font-medium">{selectedRecord.prepared_by}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase">Approved By</p>
                <p className="mt-0.5 font-medium">{selectedRecord.approved_by}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase">Voucher Status</p>
                <span className="inline-block mt-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  {selectedRecord.status}
                </span>
              </div>
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

export default JournalVoucherPage;
