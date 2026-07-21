import { useState, useEffect, type FormEvent } from "react";
import BooksOfAccountsService from "../../services/BooksOfAccountsService";
import type { CashReceiptRecord } from "../../Interfaces";
import SearchBar from "../../components/SearchBar";
import Pagination from "../../components/Pagination";
import Modal from "../../components/Modal";
import { exportToExcel, exportToPDF, printReport } from "../../utils/exportUtils";
import { FiPlus, FiEdit, FiTrash2, FiEye, FiPrinter, FiFileText, FiDownload, FiCalendar } from "react-icons/fi";
import Swal from "sweetalert2";

const CashReceiptsPage = () => {
  const [records, setRecords] = useState<CashReceiptRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);

  // Search & Filters
  const [search, setSearch] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [sortBy, setSortBy] = useState("receipt_date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<CashReceiptRecord | null>(null);

  // Form Fields
  const [orNumber, setOrNumber] = useState("");
  const [receiptDate, setReceiptDate] = useState("");
  const [receivedFrom, setReceivedFrom] = useState("");
  const [description, setDescription] = useState("");
  const [sourceOfIncome, setSourceOfIncome] = useState("Sales Revenue");
  const [amountReceived, setAmountReceived] = useState("");
  const [remarks, setRemarks] = useState("");

  const [formErrors, setFormErrors] = useState<any>({});
  const [submitLoading, setSubmitLoading] = useState(false);

  const sourcesList = [
    "Sales Revenue",
    "Membership Capital Fees",
    "Service & Processing Fees",
    "Government / CDA Grant",
    "Interest Income",
    "Other Income"
  ];

  const fetchRecords = async (page: number = 1) => {
    try {
      setLoading(true);
      const res = await BooksOfAccountsService.loadCashReceipts(
        page, search, startDate, endDate, 10, sortBy, sortOrder
      );
      setRecords(res.data.data);
      setCurrentPage(res.data.current_page);
      setLastPage(res.data.last_page);
    } catch (err) {
      console.error("Failed to load receipts: ", err);
      Swal.fire("Error", "Could not fetch Cash Receipts Journal records.", "error");
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
    setOrNumber("");
    setReceiptDate(new Date().toISOString().split("T")[0]);
    setReceivedFrom("");
    setDescription("");
    setSourceOfIncome("Sales Revenue");
    setAmountReceived("");
    setRemarks("");
    setFormErrors({});
    setIsAddModalOpen(true);
  };

  const openEditModal = (r: CashReceiptRecord) => {
    setSelectedRecord(r);
    setOrNumber(r.or_number);
    setReceiptDate(r.receipt_date ? (typeof r.receipt_date === 'string' ? r.receipt_date.split('T')[0] : r.receipt_date) : "");
    setReceivedFrom(r.received_from);
    setDescription(r.description);
    setSourceOfIncome(r.source_of_income);
    setAmountReceived(r.amount_received.toString());
    setRemarks(r.remarks || "");
    setFormErrors({});
    setIsEditModalOpen(true);
  };

  const openViewModal = (r: CashReceiptRecord) => {
    setSelectedRecord(r);
    setIsViewModalOpen(true);
  };

  const handleAdd = async (e: FormEvent) => {
    e.preventDefault();
    setFormErrors({});

    try {
      setSubmitLoading(true);
      await BooksOfAccountsService.storeCashReceipt({
        or_number: orNumber || undefined,
        receipt_date: receiptDate,
        received_from: receivedFrom,
        description,
        source_of_income: sourceOfIncome,
        amount_received: parseFloat(amountReceived),
        remarks
      });
      setIsAddModalOpen(false);
      Swal.fire("Saved", "Official receipt recorded successfully.", "success");
      fetchRecords(currentPage);
    } catch (err: any) {
      if (err.response && err.response.status === 422) {
        setFormErrors(err.response.data.errors);
      } else {
        Swal.fire("Error", "Failed to record cash receipt.", "error");
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
      await BooksOfAccountsService.updateCashReceipt(selectedRecord.id, {
        or_number: orNumber,
        receipt_date: receiptDate,
        received_from: receivedFrom,
        description,
        source_of_income: sourceOfIncome,
        amount_received: parseFloat(amountReceived),
        remarks
      });
      setIsEditModalOpen(false);
      Swal.fire("Saved", "Receipt record updated successfully.", "success");
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
      Swal.fire("Deleted", "Receipt record deleted successfully.", "success");
      fetchRecords(currentPage);
    } catch (err) {
      console.error(err);
      Swal.fire("Error", "Failed to delete receipt record.", "error");
    }
  };

  const handlePrintReceipt = (r: CashReceiptRecord) => {
    const headers = ["Field", "Details"];
    const rows = [
      ["Official Receipt No", r.or_number],
      ["Receipt Date", r.receipt_date],
      ["Received From", r.received_from],
      ["Source of Income", r.source_of_income],
      ["Amount Received", `₱ ${parseFloat(r.amount_received.toString()).toLocaleString(undefined, { minimumFractionDigits: 2 })}`],
      ["Description", r.description],
      ["Recorded By", r.recorded_by],
      ["Remarks", r.remarks || "N/A"]
    ];
    printReport(`Official Receipt - ${r.or_number}`, headers, rows);
  };

  const handleExportExcel = () => {
    const dataToExport = records.map(r => ({
      "OR Number": r.or_number,
      "Date": r.receipt_date,
      "Received From": r.received_from,
      "Source of Income": r.source_of_income,
      "Amount Received (₱)": r.amount_received,
      "Description": r.description,
      "Recorded By": r.recorded_by,
      "Remarks": r.remarks || ""
    }));
    exportToExcel(dataToExport, `Cash_Receipts_Journal_${new Date().toISOString().split("T")[0]}`);
  };

  const handlePrint = () => {
    const headers = ["OR Number", "Date", "Received From", "Source of Income", "Amount Received (₱)", "Recorded By"];
    const rows = records.map(r => [
      r.or_number,
      r.receipt_date,
      r.received_from,
      r.source_of_income,
      `₱ ${parseFloat(r.amount_received.toString()).toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
      r.recorded_by
    ]);
    printReport("Cash Receipts Journal", headers, rows);
  };

  const handleExportPDF = () => {
    const headers = ["OR Number", "Date", "Received From", "Source of Income", "Amount Received (₱)", "Recorded By"];
    const rows = records.map(r => [
      r.or_number,
      r.receipt_date,
      r.received_from,
      r.source_of_income,
      `₱ ${parseFloat(r.amount_received.toString()).toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
      r.recorded_by
    ]);
    exportToPDF("Cash Receipts Journal", headers, rows);
  };

  return (
    <div className="space-y-6">
      {/* Header Panel */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center bg-white p-6 rounded-2xl border border-slate-100 shadow-xs gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-2xl">🧾</span>
            <h1 className="text-xl font-bold text-slate-800">Cash Receipts Journal</h1>
          </div>
          <p className="text-sm text-slate-500 mt-0.5">Records all money received by the cooperative with Official Receipt numbers.</p>
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
            <span>Add Receipt</span>
          </button>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4">
          <SearchBar value={search} onChange={setSearch} placeholder="Search OR number, received from, income source..." />

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

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            <p className="text-slate-400 text-sm">Fetching cash receipts records...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100 text-sm">
              <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider text-xs">
                <tr>
                  <th onClick={() => handleSort("or_number")} className="px-6 py-4 text-left cursor-pointer hover:text-slate-700">
                    OR Number {sortBy === "or_number" ? (sortOrder === "asc" ? "▲" : "▼") : ""}
                  </th>
                  <th onClick={() => handleSort("receipt_date")} className="px-6 py-4 text-left cursor-pointer hover:text-slate-700">
                    Date {sortBy === "receipt_date" ? (sortOrder === "asc" ? "▲" : "▼") : ""}
                  </th>
                  <th onClick={() => handleSort("received_from")} className="px-6 py-4 text-left cursor-pointer hover:text-slate-700">
                    Received From {sortBy === "received_from" ? (sortOrder === "asc" ? "▲" : "▼") : ""}
                  </th>
                  <th onClick={() => handleSort("source_of_income")} className="px-6 py-4 text-left cursor-pointer hover:text-slate-700">
                    Source of Income {sortBy === "source_of_income" ? (sortOrder === "asc" ? "▲" : "▼") : ""}
                  </th>
                  <th onClick={() => handleSort("amount_received")} className="px-6 py-4 text-right cursor-pointer hover:text-slate-700">
                    Amount Received (₱) {sortBy === "amount_received" ? (sortOrder === "asc" ? "▲" : "▼") : ""}
                  </th>
                  <th className="px-6 py-4 text-left">Recorded By</th>
                  <th className="px-6 py-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {records.length > 0 ? (
                  records.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 font-semibold text-primary">{r.or_number}</td>
                      <td className="px-6 py-4 whitespace-nowrap">{r.receipt_date}</td>
                      <td className="px-6 py-4 font-semibold text-slate-800">{r.received_from}</td>
                      <td className="px-6 py-4 text-slate-600">{r.source_of_income}</td>
                      <td className="px-6 py-4 text-right font-bold text-emerald-600">
                        ₱ {parseFloat(r.amount_received.toString()).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-6 py-4 text-xs font-medium text-slate-500">{r.recorded_by}</td>
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
                            onClick={() => handlePrintReceipt(r)}
                            title="Print Receipt"
                            className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 cursor-pointer"
                          >
                            <FiPrinter className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => openEditModal(r)}
                            title="Edit Receipt"
                            className="p-1.5 rounded-lg text-primary hover:bg-green-50 cursor-pointer"
                          >
                            <FiEdit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(r)}
                            title="Delete Receipt"
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
                    <td colSpan={7} className="px-6 py-12 text-center text-slate-400 font-medium">
                      No cash receipts records found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
        <Pagination currentPage={currentPage} lastPage={lastPage} onPageChange={(p) => fetchRecords(p)} />
      </div>

      {/* ADD RECEIPT MODAL */}
      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} showCloseButton={true}>
        <div className="p-2 space-y-4">
          <div>
            <h3 className="text-lg font-bold text-slate-800">Add Cash Receipt Record</h3>
            <p className="text-xs text-slate-500">Record a new incoming payment official receipt.</p>
          </div>

          <form onSubmit={handleAdd} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Receipt Date</label>
                <input
                  type="date"
                  required
                  value={receiptDate}
                  onChange={(e) => setReceiptDate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">OR Number (Optional)</label>
                <input
                  type="text"
                  placeholder="Auto-generated (OR-...)"
                  value={orNumber}
                  onChange={(e) => setOrNumber(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
                {formErrors.or_number && <p className="text-red-500 text-xs mt-1">{formErrors.or_number[0]}</p>}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Received From</label>
                <input
                  type="text"
                  required
                  placeholder="Payer / Member / Client"
                  value={receivedFrom}
                  onChange={(e) => setReceivedFrom(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Source of Income</label>
                <select
                  value={sourceOfIncome}
                  onChange={(e) => setSourceOfIncome(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {sourcesList.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Amount Received (₱)</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                placeholder="0.00"
                value={amountReceived}
                onChange={(e) => setAmountReceived(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Description / Particulars</label>
              <textarea
                required
                rows={2}
                placeholder="Particulars of cash receipt..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              ></textarea>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Remarks</label>
              <input
                type="text"
                placeholder="Bank slip #, reference notes"
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
                {submitLoading ? "Saving..." : "Add Receipt"}
              </button>
            </div>
          </form>
        </div>
      </Modal>

      {/* EDIT RECEIPT MODAL */}
      <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} showCloseButton={true}>
        <div className="p-2 space-y-4">
          <div>
            <h3 className="text-lg font-bold text-slate-800">Edit Cash Receipt</h3>
            <p className="text-xs text-slate-500">OR Number: <span className="font-semibold text-primary">{selectedRecord?.or_number}</span></p>
          </div>

          <form onSubmit={handleEdit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Receipt Date</label>
                <input
                  type="date"
                  required
                  value={receiptDate}
                  onChange={(e) => setReceiptDate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">OR Number</label>
                <input
                  type="text"
                  required
                  value={orNumber}
                  onChange={(e) => setOrNumber(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Received From</label>
                <input
                  type="text"
                  required
                  value={receivedFrom}
                  onChange={(e) => setReceivedFrom(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Source of Income</label>
                <select
                  value={sourceOfIncome}
                  onChange={(e) => setSourceOfIncome(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {sourcesList.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Amount Received (₱)</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                value={amountReceived}
                onChange={(e) => setAmountReceived(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Description / Particulars</label>
              <textarea
                required
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              ></textarea>
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
                {submitLoading ? "Updating..." : "Update Receipt"}
              </button>
            </div>
          </form>
        </div>
      </Modal>

      {/* VIEW RECEIPT MODAL */}
      <Modal isOpen={isViewModalOpen} onClose={() => setIsViewModalOpen(false)} showCloseButton={true}>
        {selectedRecord && (
          <div className="p-2 space-y-4">
            <div className="flex justify-between items-start border-b border-slate-100 pb-3">
              <div>
                <span className="text-xs uppercase font-bold text-primary tracking-wider">Official Receipt</span>
                <h3 className="text-xl font-bold text-slate-800 mt-0.5">{selectedRecord.or_number}</h3>
                <p className="text-xs text-slate-400">Date: {selectedRecord.receipt_date}</p>
              </div>
              <button
                onClick={() => handlePrintReceipt(selectedRecord)}
                className="px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 font-semibold rounded-lg text-xs flex items-center gap-1 cursor-pointer"
              >
                <FiPrinter className="w-3.5 h-3.5" />
                <span>Print OR</span>
              </button>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-3 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-xs font-semibold text-slate-400 uppercase">Amount Received</span>
                <span className="text-xl font-extrabold text-emerald-600">₱ {parseFloat(selectedRecord.amount_received.toString()).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200/60">
                <div>
                  <span className="text-xs font-semibold text-slate-400 uppercase block">Received From</span>
                  <span className="font-bold text-slate-800">{selectedRecord.received_from}</span>
                </div>
                <div>
                  <span className="text-xs font-semibold text-slate-400 uppercase block">Source of Income</span>
                  <span className="font-semibold text-slate-700">{selectedRecord.source_of_income}</span>
                </div>
              </div>
            </div>

            <div className="space-y-2 text-sm text-slate-700">
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase">Particulars / Description</p>
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

export default CashReceiptsPage;
