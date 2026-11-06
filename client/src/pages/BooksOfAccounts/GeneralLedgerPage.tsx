import { useState, useEffect, type FormEvent } from "react";
import BooksOfAccountsService from "../../services/BooksOfAccountsService";
import type { GeneralLedgerRecord } from "../../Interfaces";
import SearchBar from "../../components/SearchBar";
import Pagination from "../../components/Pagination";
import Modal from "../../components/Modal";
import { exportToExcel, exportToPDF, printReport } from "../../utils/exportUtils";
import { FiPlus, FiEdit, FiTrash2, FiEye, FiPrinter, FiFileText, FiDownload, FiCalendar, FiRefreshCw } from "react-icons/fi";
import Swal from "sweetalert2";

const GeneralLedgerPage = () => {
  const [records, setRecords] = useState<GeneralLedgerRecord[]>([]);
  const [accountsList, setAccountsList] = useState<Array<{ account_code: string; account_title: string }>>([]);
  const [totals, setTotals] = useState<{ total_debit: number; total_credit: number; is_balanced: boolean } | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);

  // Search & Filters
  const [search, setSearch] = useState("");
  const [accountFilter, setAccountFilter] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [sortBy, setSortBy] = useState("transaction_date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<GeneralLedgerRecord | null>(null);

  // Form Fields
  const [accountCode, setAccountCode] = useState("1010");
  const [accountTitle, setAccountTitle] = useState("Cash on Hand");
  const [transactionDate, setTransactionDate] = useState("");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [debit, setDebit] = useState("0");
  const [credit, setCredit] = useState("0");
  const [sourceModule, setSourceModule] = useState("General Ledger");
  const [description, setDescription] = useState("");

  const [formErrors, setFormErrors] = useState<any>({});
  const [submitLoading, setSubmitLoading] = useState(false);

  const fetchRecords = async (page: number = 1) => {
    try {
      setLoading(true);
      const res = await BooksOfAccountsService.loadGeneralLedger(
        page, search, accountFilter, startDate, endDate, 10, sortBy, sortOrder
      );
      setRecords(res.data.records.data);
      setCurrentPage(res.data.records.current_page);
      setLastPage(res.data.records.last_page);
      if (res.data.accounts) {
        setAccountsList(res.data.accounts);
      }
      if (res.data.totals) {
        setTotals(res.data.totals);
      }
    } catch (err) {
      console.error("Failed to load general ledger: ", err);
      Swal.fire("Error", "Could not fetch General Ledger records.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords(1);
  }, [search, accountFilter, startDate, endDate, sortBy, sortOrder]);

  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(column);
      setSortOrder("desc");
    }
  };

  const handleSyncLedger = async () => {
    const result = await Swal.fire({
      title: "Sync General Ledger?",
      text: "This will aggregate all transactions across Cash Register, Cash Disbursement, Sales Book, Cash Receipts, and Journal Vouchers into the General Ledger.",
      icon: "info",
      showCancelButton: true,
      confirmButtonColor: "#1F6B3D",
      cancelButtonColor: "#64748B",
      confirmButtonText: "Yes, synchronize",
      cancelButtonText: "Cancel"
    });

    if (!result.isConfirmed) return;

    try {
      setSyncing(true);
      console.log("[GeneralLedger] Initiating synchronization request...");
      const res = await BooksOfAccountsService.syncGeneralLedger();
      console.log("[GeneralLedger] Sync response:", res.data);
      Swal.fire("Synchronized", res.data?.message || "General Ledger has been updated from all Books of Accounts.", "success");
      fetchRecords(1);
    } catch (err: any) {
      console.error("[GeneralLedger] Sync failed: ", err);
      const errorMessage = err?.response?.data?.message || err?.message || "Failed to synchronize General Ledger.";
      Swal.fire("Error", errorMessage, "error");
    } finally {
      setSyncing(false);
    }
  };

  const openAddModal = () => {
    setAccountCode("1010");
    setAccountTitle("Cash on Hand");
    setTransactionDate(new Date().toISOString().split("T")[0]);
    setReferenceNumber("");
    setDebit("0");
    setCredit("0");
    setSourceModule("General Ledger");
    setDescription("");
    setFormErrors({});
    setIsAddModalOpen(true);
  };

  const openEditModal = (r: GeneralLedgerRecord) => {
    setSelectedRecord(r);
    setAccountCode(r.account_code);
    setAccountTitle(r.account_title);
    setTransactionDate(r.transaction_date ? (typeof r.transaction_date === 'string' ? r.transaction_date.split('T')[0] : r.transaction_date) : "");
    setReferenceNumber(r.reference_number);
    setDebit(r.debit.toString());
    setCredit(r.credit.toString());
    setSourceModule(r.source_module || "General Ledger");
    setDescription(r.description || "");
    setFormErrors({});
    setIsEditModalOpen(true);
  };

  const openViewModal = (r: GeneralLedgerRecord) => {
    setSelectedRecord(r);
    setIsViewModalOpen(true);
  };

  const handleAdd = async (e: FormEvent) => {
    e.preventDefault();
    setFormErrors({});

    try {
      setSubmitLoading(true);
      await BooksOfAccountsService.storeGeneralLedger({
        account_code: accountCode,
        account_title: accountTitle,
        transaction_date: transactionDate,
        reference_number: referenceNumber,
        debit: parseFloat(debit || "0"),
        credit: parseFloat(credit || "0"),
        source_module: sourceModule,
        description
      });
      setIsAddModalOpen(false);
      Swal.fire("Saved", "General Ledger entry recorded successfully.", "success");
      fetchRecords(currentPage);
    } catch (err: any) {
      if (err.response && err.response.status === 422) {
        setFormErrors(err.response.data.errors);
      } else {
        Swal.fire("Error", "Failed to record General Ledger entry.", "error");
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
      await BooksOfAccountsService.updateGeneralLedger(selectedRecord.id, {
        account_code: accountCode,
        account_title: accountTitle,
        transaction_date: transactionDate,
        reference_number: referenceNumber,
        debit: parseFloat(debit || "0"),
        credit: parseFloat(credit || "0"),
        source_module: sourceModule,
        description
      });
      setIsEditModalOpen(false);
      Swal.fire("Saved", "General Ledger entry updated successfully.", "success");
      fetchRecords(currentPage);
    } catch (err: any) {
      if (err.response && err.response.status === 422) {
        setFormErrors(err.response.data.errors);
      } else {
        Swal.fire("Error", "Failed to update entry.", "error");
      }
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleDelete = async (r: GeneralLedgerRecord) => {
    const result = await Swal.fire({
      title: "Delete Ledger Entry?",
      text: `Are you sure you want to delete General Ledger entry ${r.reference_number}?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#EF4444",
      cancelButtonColor: "#64748B",
      confirmButtonText: "Yes, delete",
      cancelButtonText: "Cancel"
    });

    if (!result.isConfirmed) return;

    try {
      await BooksOfAccountsService.destroyGeneralLedger(r.id);
      Swal.fire("Deleted", "Ledger entry deleted successfully.", "success");
      fetchRecords(currentPage);
    } catch (err) {
      console.error(err);
      Swal.fire("Error", "Failed to delete ledger entry.", "error");
    }
  };

  const handleExportExcel = () => {
    const dataToExport = records.map(r => ({
      "Account Code": r.account_code,
      "Account Title": r.account_title,
      "Date": r.transaction_date,
      "Ref No": r.reference_number,
      "Debit (₱)": r.debit,
      "Credit (₱)": r.credit,
      "Running Balance (₱)": r.running_balance,
      "Module": r.source_module || "",
      "Description": r.description || ""
    }));
    exportToExcel(dataToExport, `General_Ledger_${new Date().toISOString().split("T")[0]}`);
  };

  const handlePrint = () => {
    const headers = ["Account Code", "Account Title", "Date", "Ref No", "Debit (₱)", "Credit (₱)", "Running Balance (₱)"];
    const rows = records.map(r => [
      r.account_code,
      r.account_title,
      r.transaction_date,
      r.reference_number,
      `₱ ${parseFloat(r.debit.toString()).toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
      `₱ ${parseFloat(r.credit.toString()).toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
      `₱ ${parseFloat(r.running_balance.toString()).toLocaleString(undefined, { minimumFractionDigits: 2 })}`
    ]);
    printReport("General Ledger Summary", headers, rows);
  };

  const handleExportPDF = () => {
    const headers = ["Account Code", "Account Title", "Date", "Ref No", "Debit (₱)", "Credit (₱)", "Running Balance (₱)"];
    const rows = records.map(r => [
      r.account_code,
      r.account_title,
      r.transaction_date,
      r.reference_number,
      `₱ ${parseFloat(r.debit.toString()).toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
      `₱ ${parseFloat(r.credit.toString()).toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
      `₱ ${parseFloat(r.running_balance.toString()).toLocaleString(undefined, { minimumFractionDigits: 2 })}`
    ]);
    exportToPDF("General Ledger Summary", headers, rows);
  };

  return (
    <div className="space-y-6">
      {/* Header Panel */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center bg-white p-6 rounded-2xl border border-slate-100 shadow-xs gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-2xl">📖</span>
            <h1 className="text-xl font-bold text-slate-800">General Ledger</h1>
          </div>
          <p className="text-sm text-slate-500 mt-0.5">Displays the summarized debits, credits, and running balances for every account across all books.</p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={handleSyncLedger}
            disabled={syncing}
            className="px-3.5 py-2 rounded-xl bg-primary hover:bg-primary-dark text-white font-semibold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-md disabled:opacity-50"
          >
            <FiRefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
            <span>{syncing ? "Synchronizing..." : "Sync All Books"}</span>
          </button>

          <button
            onClick={handlePrint}
            className="px-3.5 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold text-xs flex items-center gap-1.5 transition cursor-pointer"
          >
            <FiPrinter className="w-4 h-4 text-slate-500" />
            <span>Print Ledger</span>
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


        </div>
      </div>

      {/* Double-Entry Balancing Summary Banner */}
      {totals && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-emerald-500/5 p-4 rounded-2xl border border-emerald-100 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block">Total Debits</span>
              <span className="text-lg font-black text-emerald-700 mt-0.5 block">
                ₱ {totals.total_debit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            <span className="px-2.5 py-1 text-[10px] font-bold rounded-lg bg-emerald-100 text-emerald-800">DR</span>
          </div>

          <div className="bg-rose-500/5 p-4 rounded-2xl border border-rose-100 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-rose-800 uppercase tracking-wider block">Total Credits</span>
              <span className="text-lg font-black text-rose-700 mt-0.5 block">
                ₱ {totals.total_credit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            <span className="px-2.5 py-1 text-[10px] font-bold rounded-lg bg-rose-100 text-rose-800">CR</span>
          </div>

          <div className={`p-4 rounded-2xl border shadow-xs flex items-center justify-between ${
            totals.is_balanced 
              ? 'bg-emerald-50/50 border-emerald-200 text-emerald-800' 
              : 'bg-amber-50 border-amber-200 text-amber-800'
          }`}>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider block">Bookkeeping Status</span>
              <span className="text-sm font-extrabold mt-0.5 block flex items-center gap-1.5">
                {totals.is_balanced ? '✓ Balanced (Total Dr = Total Cr)' : '⚠ Discrepancy Detected'}
              </span>
            </div>
            <span className={`px-2.5 py-1 text-[10px] font-black rounded-lg ${
              totals.is_balanced ? 'bg-primary text-white' : 'bg-amber-500 text-white'
            }`}>
              {totals.is_balanced ? '100% BALANCED' : 'UNBALANCED'}
            </span>
          </div>
        </div>
      )}

      {/* Search & Filters */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4">
          <SearchBar value={search} onChange={setSearch} placeholder="Search account code, title, reference no, description..." />

          <div className="flex flex-col sm:flex-row items-center gap-3">
            <select
              value={accountFilter}
              onChange={(e) => setAccountFilter(e.target.value)}
              className="w-full sm:w-56 px-3.5 py-2 border border-slate-200 rounded-xl bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary text-xs font-medium"
            >
              <option value="">Filter by Account</option>
              {accountsList.map(a => (
                <option key={a.account_code} value={a.account_code}>{a.account_code} - {a.account_title}</option>
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
            <p className="text-slate-400 text-sm">Fetching General Ledger summary...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100 text-sm">
              <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider text-xs">
                <tr>
                  <th onClick={() => handleSort("account_code")} className="px-6 py-4 text-left cursor-pointer hover:text-slate-700">
                    Account Code {sortBy === "account_code" ? (sortOrder === "asc" ? "▲" : "▼") : ""}
                  </th>
                  <th onClick={() => handleSort("account_title")} className="px-6 py-4 text-left cursor-pointer hover:text-slate-700">
                    Account Title {sortBy === "account_title" ? (sortOrder === "asc" ? "▲" : "▼") : ""}
                  </th>
                  <th onClick={() => handleSort("transaction_date")} className="px-6 py-4 text-left cursor-pointer hover:text-slate-700">
                    Date {sortBy === "transaction_date" ? (sortOrder === "asc" ? "▲" : "▼") : ""}
                  </th>
                  <th onClick={() => handleSort("reference_number")} className="px-6 py-4 text-left cursor-pointer hover:text-slate-700">
                    Reference {sortBy === "reference_number" ? (sortOrder === "asc" ? "▲" : "▼") : ""}
                  </th>
                  <th onClick={() => handleSort("debit")} className="px-6 py-4 text-right cursor-pointer hover:text-slate-700">
                    Debit (₱) {sortBy === "debit" ? (sortOrder === "asc" ? "▲" : "▼") : ""}
                  </th>
                  <th onClick={() => handleSort("credit")} className="px-6 py-4 text-right cursor-pointer hover:text-slate-700">
                    Credit (₱) {sortBy === "credit" ? (sortOrder === "asc" ? "▲" : "▼") : ""}
                  </th>
                  <th onClick={() => handleSort("running_balance")} className="px-6 py-4 text-right cursor-pointer hover:text-slate-700">
                    Running Balance (₱) {sortBy === "running_balance" ? (sortOrder === "asc" ? "▲" : "▼") : ""}
                  </th>
                  <th className="px-6 py-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {records.length > 0 ? (
                  records.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 font-mono font-bold text-slate-800">{r.account_code}</td>
                      <td className="px-6 py-4 font-medium text-slate-800">{r.account_title}</td>
                      <td className="px-6 py-4 whitespace-nowrap">{r.transaction_date}</td>
                      <td className="px-6 py-4 font-semibold text-primary">{r.reference_number}</td>
                      <td className="px-6 py-4 text-right font-semibold text-emerald-600">
                        {parseFloat(r.debit.toString()) > 0 ? `₱ ${parseFloat(r.debit.toString()).toLocaleString(undefined, { minimumFractionDigits: 2 })}` : "-"}
                      </td>
                      <td className="px-6 py-4 text-right font-semibold text-rose-600">
                        {parseFloat(r.credit.toString()) > 0 ? `₱ ${parseFloat(r.credit.toString()).toLocaleString(undefined, { minimumFractionDigits: 2 })}` : "-"}
                      </td>
                      <td className="px-6 py-4 text-right font-bold text-slate-900">
                        ₱ {parseFloat(r.running_balance.toString()).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
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
                            onClick={() => openEditModal(r)}
                            title="Edit Entry"
                            className="p-1.5 rounded-lg text-primary hover:bg-green-50 cursor-pointer"
                          >
                            <FiEdit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(r)}
                            title="Delete Entry"
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
                      No General Ledger records found. Click "Sync All Books" to build ledger entries.
                    </td>
                  </tr>
                )}
              </tbody>
              {records.length > 0 && totals && (
                <tfoot className="bg-slate-50 border-t-2 border-slate-200 text-xs font-bold text-slate-800">
                  <tr>
                    <td colSpan={4} className="px-6 py-3.5 text-right uppercase tracking-wider text-slate-500">
                      Total Ledger Aggregations:
                    </td>
                    <td className="px-6 py-3.5 text-right font-black text-emerald-700 bg-emerald-500/10">
                      ₱ {totals.total_debit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-3.5 text-right font-black text-rose-700 bg-rose-500/10">
                      ₱ {totals.total_credit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td colSpan={2} className="px-6 py-3.5 text-center text-[11px] font-semibold text-slate-500">
                      {totals.is_balanced ? '✓ Perfectly Balanced' : 'Check Records'}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        )}
        <Pagination currentPage={currentPage} lastPage={lastPage} onPageChange={(p) => fetchRecords(p)} />
      </div>

      {/* ADD MANUAL ENTRY MODAL */}
      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} showCloseButton={true}>
        <div className="p-2 space-y-4">
          <div>
            <h3 className="text-lg font-bold text-slate-800">Add Manual General Ledger Entry</h3>
            <p className="text-xs text-slate-500">Record a standalone general ledger transaction.</p>
          </div>

          <form onSubmit={handleAdd} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Account Code</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 1010"
                  value={accountCode}
                  onChange={(e) => setAccountCode(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Account Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Cash on Hand"
                  value={accountTitle}
                  onChange={(e) => setAccountTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Transaction Date</label>
                <input
                  type="date"
                  required
                  value={transactionDate}
                  onChange={(e) => setTransactionDate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Reference Number</label>
                <input
                  type="text"
                  required
                  placeholder="Ref / Voucher / Slip #"
                  value={referenceNumber}
                  onChange={(e) => setReferenceNumber(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Debit Amount (₱)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={debit}
                  onChange={(e) => setDebit(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Credit Amount (₱)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={credit}
                  onChange={(e) => setCredit(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Description</label>
              <textarea
                rows={2}
                placeholder="Entry description..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              ></textarea>
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
                {submitLoading ? "Saving..." : "Save Entry"}
              </button>
            </div>
          </form>
        </div>
      </Modal>

      {/* EDIT ENTRY MODAL */}
      <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} showCloseButton={true}>
        <div className="p-2 space-y-4">
          <div>
            <h3 className="text-lg font-bold text-slate-800">Edit General Ledger Entry</h3>
            <p className="text-xs text-slate-500">Ref: <span className="font-semibold text-primary">{selectedRecord?.reference_number}</span></p>
          </div>

          <form onSubmit={handleEdit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Account Code</label>
                <input
                  type="text"
                  required
                  value={accountCode}
                  onChange={(e) => setAccountCode(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Account Title</label>
                <input
                  type="text"
                  required
                  value={accountTitle}
                  onChange={(e) => setAccountTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Transaction Date</label>
                <input
                  type="date"
                  required
                  value={transactionDate}
                  onChange={(e) => setTransactionDate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Reference Number</label>
                <input
                  type="text"
                  required
                  value={referenceNumber}
                  onChange={(e) => setReferenceNumber(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Debit Amount (₱)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={debit}
                  onChange={(e) => setDebit(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Credit Amount (₱)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={credit}
                  onChange={(e) => setCredit(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Description</label>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              ></textarea>
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
                {submitLoading ? "Updating..." : "Update Entry"}
              </button>
            </div>
          </form>
        </div>
      </Modal>

      {/* VIEW ENTRY MODAL */}
      <Modal isOpen={isViewModalOpen} onClose={() => setIsViewModalOpen(false)} showCloseButton={true}>
        {selectedRecord && (
          <div className="p-2 space-y-4">
            <div className="border-b border-slate-100 pb-3">
              <span className="text-xs uppercase font-bold text-primary tracking-wider">General Ledger Record</span>
              <h3 className="text-xl font-bold text-slate-800 mt-0.5">{selectedRecord.account_code} - {selectedRecord.account_title}</h3>
              <p className="text-xs text-slate-400">Ref: {selectedRecord.reference_number} | Date: {selectedRecord.transaction_date}</p>
            </div>

            <div className="grid grid-cols-3 gap-3 text-sm bg-slate-50 p-4 rounded-xl border border-slate-100">
              <div>
                <p className="text-xs text-slate-400 font-semibold uppercase">Debit</p>
                <p className="font-bold text-emerald-600 text-base mt-0.5">₱ {parseFloat(selectedRecord.debit.toString()).toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400 font-semibold uppercase">Credit</p>
                <p className="font-bold text-rose-600 text-base mt-0.5">₱ {parseFloat(selectedRecord.credit.toString()).toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400 font-semibold uppercase">Running Balance</p>
                <p className="font-extrabold text-slate-900 text-base mt-0.5">₱ {parseFloat(selectedRecord.running_balance.toString()).toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
              </div>
            </div>

            <div className="space-y-2 text-sm text-slate-700">
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase">Source Module</p>
                <p className="mt-0.5 font-medium">{selectedRecord.source_module || "General Ledger"}</p>
              </div>
              {selectedRecord.description && (
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase">Description</p>
                  <p className="mt-0.5 text-slate-600">{selectedRecord.description}</p>
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

export default GeneralLedgerPage;
