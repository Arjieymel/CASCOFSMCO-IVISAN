import { useState, useEffect, type FormEvent } from "react";
import BooksOfAccountsService from "../../services/BooksOfAccountsService";
import type { CashRegisterRecord } from "../../Interfaces";
import SearchBar from "../../components/SearchBar";
import Pagination from "../../components/Pagination";
import Modal from "../../components/Modal";
import { exportToExcel, exportToPDF, printReport } from "../../utils/exportUtils";
import { FiPlus, FiEdit, FiTrash2, FiEye, FiPrinter, FiFileText, FiDownload, FiCalendar, FiArrowUpRight, FiArrowDownLeft } from "react-icons/fi";
import Swal from "sweetalert2";

const CashRegisterPage = () => {
  const [records, setRecords] = useState<CashRegisterRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);

  // Search & Filters
  const [search, setSearch] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [sortBy, setSortBy] = useState("date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<CashRegisterRecord | null>(null);

  // Form Fields
  const [date, setDate] = useState("");
  const [referenceNo, setReferenceNo] = useState("");
  const [description, setDescription] = useState("");
  const [cashIn, setCashIn] = useState("0");
  const [cashOut, setCashOut] = useState("0");
  const [remarks, setRemarks] = useState("");

  const [formErrors, setFormErrors] = useState<any>({});
  const [submitLoading, setSubmitLoading] = useState(false);

  const fetchRecords = async (page: number = 1) => {
    try {
      setLoading(true);
      const res = await BooksOfAccountsService.loadCashRegister(
        page, search, startDate, endDate, 10, sortBy, sortOrder
      );
      setRecords(res.data.data);
      setCurrentPage(res.data.current_page);
      setLastPage(res.data.last_page);
      setTotalRecords(res.data.total);
    } catch (err) {
      console.error("Failed to load cash register: ", err);
      Swal.fire("Error", "Could not fetch Cash Register Book records.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords(1);
  }, [search, startDate, endDate, sortBy, sortOrder]);

  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(column);
      setSortOrder("desc");
    }
  };

  const openAddModal = () => {
    setDate(new Date().toISOString().split("T")[0]);
    setReferenceNo("");
    setDescription("");
    setCashIn("0");
    setCashOut("0");
    setRemarks("");
    setFormErrors({});
    setIsAddModalOpen(true);
  };

  const openEditModal = (r: CashRegisterRecord) => {
    setSelectedRecord(r);
    setDate(r.date ? (typeof r.date === 'string' ? r.date.split('T')[0] : r.date) : "");
    setReferenceNo(r.reference_no);
    setDescription(r.description);
    setCashIn(r.cash_in.toString());
    setCashOut(r.cash_out.toString());
    setRemarks(r.remarks || "");
    setFormErrors({});
    setIsEditModalOpen(true);
  };

  const openViewModal = (r: CashRegisterRecord) => {
    setSelectedRecord(r);
    setIsViewModalOpen(true);
  };

  const handleAdd = async (e: FormEvent) => {
    e.preventDefault();
    setFormErrors({});

    try {
      setSubmitLoading(true);
      await BooksOfAccountsService.storeCashRegister({
        date,
        reference_no: referenceNo || undefined,
        description,
        cash_in: parseFloat(cashIn || "0"),
        cash_out: parseFloat(cashOut || "0"),
        remarks
      });
      setIsAddModalOpen(false);
      Swal.fire("Saved", "Cash Register transaction recorded successfully.", "success");
      fetchRecords(currentPage);
    } catch (err: any) {
      if (err.response && err.response.status === 422) {
        setFormErrors(err.response.data.errors);
      } else {
        Swal.fire("Error", "Failed to save record.", "error");
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
      await BooksOfAccountsService.updateCashRegister(selectedRecord.id, {
        date,
        reference_no: referenceNo,
        description,
        cash_in: parseFloat(cashIn || "0"),
        cash_out: parseFloat(cashOut || "0"),
        remarks
      });
      setIsEditModalOpen(false);
      Swal.fire("Saved", "Transaction updated successfully.", "success");
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

  const handleDelete = async (r: CashRegisterRecord) => {
    const result = await Swal.fire({
      title: "Delete Transaction?",
      text: `Are you sure you want to delete Cash Register entry ${r.reference_no}? Running balances will be recalculated.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#EF4444",
      cancelButtonColor: "#64748B",
      confirmButtonText: "Yes, delete",
      cancelButtonText: "Cancel"
    });

    if (!result.isConfirmed) return;

    try {
      await BooksOfAccountsService.destroyCashRegister(r.id);
      Swal.fire("Deleted", "Transaction deleted successfully.", "success");
      fetchRecords(currentPage);
    } catch (err) {
      console.error(err);
      Swal.fire("Error", "Failed to delete transaction.", "error");
    }
  };

  const handleExportExcel = () => {
    const dataToExport = records.map(r => ({
      "Date": r.date,
      "Ref No": r.reference_no,
      "Description": r.description,
      "Cash In (₱)": r.cash_in,
      "Cash Out (₱)": r.cash_out,
      "Running Balance (₱)": r.running_balance,
      "Recorded By": r.recorded_by,
      "Remarks": r.remarks || ""
    }));
    exportToExcel(dataToExport, `Cash_Register_Book_${new Date().toISOString().split("T")[0]}`);
  };

  const handlePrint = () => {
    const headers = ["Date", "Ref No", "Description", "Cash In (₱)", "Cash Out (₱)", "Running Balance (₱)", "Recorded By"];
    const rows = records.map(r => [
      r.date,
      r.reference_no,
      r.description,
      `₱ ${parseFloat(r.cash_in.toString()).toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
      `₱ ${parseFloat(r.cash_out.toString()).toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
      `₱ ${parseFloat(r.running_balance.toString()).toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
      r.recorded_by
    ]);
    printReport("Daily Cash Register Book", headers, rows);
  };

  const handleExportPDF = () => {
    const headers = ["Date", "Ref No", "Description", "Cash In (₱)", "Cash Out (₱)", "Running Balance (₱)", "Recorded By"];
    const rows = records.map(r => [
      r.date,
      r.reference_no,
      r.description,
      `₱ ${parseFloat(r.cash_in.toString()).toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
      `₱ ${parseFloat(r.cash_out.toString()).toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
      `₱ ${parseFloat(r.running_balance.toString()).toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
      r.recorded_by
    ]);
    exportToPDF("Daily Cash Register Book", headers, rows);
  };

  return (
    <div className="space-y-6">
      {/* Header Panel */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center bg-white p-6 rounded-2xl border border-slate-100 shadow-xs gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-2xl">📚</span>
            <h1 className="text-xl font-bold text-slate-800">Cash Register Book</h1>
          </div>
          <p className="text-sm text-slate-500 mt-0.5">Records all daily cash inflows and cash outflows serving as the cooperative's daily cash book.</p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={handlePrint}
            className="px-3.5 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold text-xs flex items-center gap-1.5 transition cursor-pointer"
          >
            <FiPrinter className="w-4 h-4 text-slate-500" />
            <span>Print</span>
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
            <span>Add New Transaction</span>
          </button>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4">
          <SearchBar value={search} onChange={setSearch} placeholder="Search reference no, description, user, remarks..." />

          <div className="flex items-center gap-3 border-t md:border-t-0 border-slate-100 pt-3 md:pt-0">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
              <FiCalendar className="w-4 h-4 text-slate-400" />
              <span>Date Range:</span>
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
            <p className="text-slate-400 text-sm">Fetching daily cash register logs...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100 text-sm">
              <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider text-xs">
                <tr>
                  <th onClick={() => handleSort("date")} className="px-6 py-4 text-left cursor-pointer hover:text-slate-700">
                    Date {sortBy === "date" ? (sortOrder === "asc" ? "▲" : "▼") : ""}
                  </th>
                  <th onClick={() => handleSort("reference_no")} className="px-6 py-4 text-left cursor-pointer hover:text-slate-700">
                    Ref No {sortBy === "reference_no" ? (sortOrder === "asc" ? "▲" : "▼") : ""}
                  </th>
                  <th className="px-6 py-4 text-left">Transaction Description</th>
                  <th onClick={() => handleSort("cash_in")} className="px-6 py-4 text-right cursor-pointer hover:text-slate-700">
                    Cash In (₱) {sortBy === "cash_in" ? (sortOrder === "asc" ? "▲" : "▼") : ""}
                  </th>
                  <th onClick={() => handleSort("cash_out")} className="px-6 py-4 text-right cursor-pointer hover:text-slate-700">
                    Cash Out (₱) {sortBy === "cash_out" ? (sortOrder === "asc" ? "▲" : "▼") : ""}
                  </th>
                  <th onClick={() => handleSort("running_balance")} className="px-6 py-4 text-right cursor-pointer hover:text-slate-700">
                    Running Balance (₱) {sortBy === "running_balance" ? (sortOrder === "asc" ? "▲" : "▼") : ""}
                  </th>
                  <th className="px-6 py-4 text-left">Recorded By</th>
                  <th className="px-6 py-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {records.length > 0 ? (
                  records.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap font-medium">{r.date}</td>
                      <td className="px-6 py-4 font-semibold text-primary">{r.reference_no}</td>
                      <td className="px-6 py-4 max-w-xs truncate">{r.description}</td>
                      <td className="px-6 py-4 text-right font-semibold text-emerald-600">
                        {parseFloat(r.cash_in.toString()) > 0 ? (
                          <span className="inline-flex items-center gap-1">
                            <FiArrowDownLeft className="w-3.5 h-3.5" />
                            ₱ {parseFloat(r.cash_in.toString()).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </span>
                        ) : "-"}
                      </td>
                      <td className="px-6 py-4 text-right font-semibold text-rose-600">
                        {parseFloat(r.cash_out.toString()) > 0 ? (
                          <span className="inline-flex items-center gap-1">
                            <FiArrowUpRight className="w-3.5 h-3.5" />
                            ₱ {parseFloat(r.cash_out.toString()).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </span>
                        ) : "-"}
                      </td>
                      <td className="px-6 py-4 text-right font-bold text-slate-800">
                        ₱ {parseFloat(r.running_balance.toString()).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-6 py-4 text-xs font-medium text-slate-500">{r.recorded_by}</td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex justify-center items-center gap-1.5">
                          <button
                            onClick={() => openViewModal(r)}
                            title="View Details"
                            className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 cursor-pointer"
                          >
                            <FiEye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => openEditModal(r)}
                            title="Edit Record"
                            className="p-1.5 rounded-lg text-primary hover:bg-green-50 cursor-pointer"
                          >
                            <FiEdit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(r)}
                            title="Delete Record"
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
                      No daily cash register records found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
        <Pagination currentPage={currentPage} lastPage={lastPage} onPageChange={(p) => fetchRecords(p)} />
      </div>

      {/* ADD MODAL */}
      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} showCloseButton={true}>
        <div className="p-2 space-y-4">
          <div>
            <h3 className="text-lg font-bold text-slate-800">Add Cash Register Transaction</h3>
            <p className="text-xs text-slate-500">Record daily cash inflow or cash outflow entry.</p>
          </div>

          <form onSubmit={handleAdd} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Transaction Date</label>
                <input
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
                {formErrors.date && <p className="text-red-500 text-xs mt-1">{formErrors.date[0]}</p>}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Reference No. (Optional)</label>
                <input
                  type="text"
                  placeholder="Auto-generated if blank"
                  value={referenceNo}
                  onChange={(e) => setReferenceNo(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
                {formErrors.reference_no && <p className="text-red-500 text-xs mt-1">{formErrors.reference_no[0]}</p>}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Description</label>
              <textarea
                required
                rows={2}
                placeholder="Details of cash movement..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              ></textarea>
              {formErrors.description && <p className="text-red-500 text-xs mt-1">{formErrors.description[0]}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Cash In (₱)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={cashIn}
                  onChange={(e) => setCashIn(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Cash Out (₱)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={cashOut}
                  onChange={(e) => setCashOut(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Remarks</label>
              <input
                type="text"
                placeholder="Additional notes"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
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
                {submitLoading ? "Saving..." : "Save Record"}
              </button>
            </div>
          </form>
        </div>
      </Modal>

      {/* EDIT MODAL */}
      <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} showCloseButton={true}>
        <div className="p-2 space-y-4">
          <div>
            <h3 className="text-lg font-bold text-slate-800">Edit Cash Register Record</h3>
            <p className="text-xs text-slate-500">Ref: <span className="font-semibold text-primary">{selectedRecord?.reference_no}</span></p>
          </div>

          <form onSubmit={handleEdit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Transaction Date</label>
                <input
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Reference No.</label>
                <input
                  type="text"
                  required
                  value={referenceNo}
                  onChange={(e) => setReferenceNo(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
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
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Cash In (₱)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={cashIn}
                  onChange={(e) => setCashIn(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Cash Out (₱)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={cashOut}
                  onChange={(e) => setCashOut(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
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
                {submitLoading ? "Updating..." : "Update Record"}
              </button>
            </div>
          </form>
        </div>
      </Modal>

      {/* VIEW MODAL */}
      <Modal isOpen={isViewModalOpen} onClose={() => setIsViewModalOpen(false)} showCloseButton={true}>
        {selectedRecord && (
          <div className="p-2 space-y-4">
            <div className="border-b border-slate-100 pb-3">
              <span className="text-xs uppercase font-bold text-primary tracking-wider">Cash Register Details</span>
              <h3 className="text-xl font-bold text-slate-800 mt-0.5">{selectedRecord.reference_no}</h3>
              <p className="text-xs text-slate-400">Date: {selectedRecord.date}</p>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm bg-slate-50 p-4 rounded-xl border border-slate-100">
              <div>
                <p className="text-xs text-slate-400 font-semibold uppercase">Cash In</p>
                <p className="font-bold text-emerald-600 text-base mt-0.5">₱ {parseFloat(selectedRecord.cash_in.toString()).toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400 font-semibold uppercase">Cash Out</p>
                <p className="font-bold text-rose-600 text-base mt-0.5">₱ {parseFloat(selectedRecord.cash_out.toString()).toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
              </div>
              <div className="col-span-2 border-t border-slate-200/60 pt-3">
                <p className="text-xs text-slate-400 font-semibold uppercase">Resulting Running Balance</p>
                <p className="font-extrabold text-slate-800 text-lg mt-0.5">₱ {parseFloat(selectedRecord.running_balance.toString()).toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
              </div>
            </div>

            <div className="space-y-2 text-sm text-slate-700">
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase">Description</p>
                <p className="mt-0.5 font-medium">{selectedRecord.description}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase">Recorded By</p>
                <p className="mt-0.5 font-medium">{selectedRecord.recorded_by}</p>
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

export default CashRegisterPage;
