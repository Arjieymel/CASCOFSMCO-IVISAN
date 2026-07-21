import { useState, useEffect, type FormEvent } from "react";
import BooksOfAccountsService from "../../services/BooksOfAccountsService";
import type { CashSalesBookRecord } from "../../Interfaces";
import SearchBar from "../../components/SearchBar";
import Pagination from "../../components/Pagination";
import Modal from "../../components/Modal";
import { exportToExcel, exportToPDF, printReport } from "../../utils/exportUtils";
import { FiPlus, FiEdit, FiTrash2, FiEye, FiPrinter, FiFileText, FiDownload, FiCalendar } from "react-icons/fi";
import Swal from "sweetalert2";

const CashSalesBookPage = () => {
  const [records, setRecords] = useState<CashSalesBookRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);

  // Search & Filters
  const [search, setSearch] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [sortBy, setSortBy] = useState("sale_date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<CashSalesBookRecord | null>(null);

  // Form Fields
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [saleDate, setSaleDate] = useState("");
  const [customer, setCustomer] = useState("");
  const [product, setProduct] = useState("Copra");
  const [quantity, setQuantity] = useState("");
  const [unitPrice, setUnitPrice] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("Cash");

  const [formErrors, setFormErrors] = useState<any>({});
  const [submitLoading, setSubmitLoading] = useState(false);

  const productList = ["Copra", "Coconut Oil", "Desiccated Coconut", "Charcoal", "Coir Fiber", "Whole Nut"];
  const paymentMethodsList = ["Cash", "Check", "Bank Transfer", "GCash"];

  const fetchRecords = async (page: number = 1) => {
    try {
      setLoading(true);
      const res = await BooksOfAccountsService.loadSalesBook(
        page, search, startDate, endDate, 10, sortBy, sortOrder
      );
      setRecords(res.data.data);
      setCurrentPage(res.data.current_page);
      setLastPage(res.data.last_page);
    } catch (err) {
      console.error("Failed to load sales book: ", err);
      Swal.fire("Error", "Could not fetch Cash Register Sales Book records.", "error");
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

  const computedTotal = () => {
    const q = parseFloat(quantity);
    const p = parseFloat(unitPrice);
    if (!isNaN(q) && !isNaN(p)) {
      return (q * p).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    return "0.00";
  };

  const openAddModal = () => {
    setInvoiceNumber("");
    setSaleDate(new Date().toISOString().split("T")[0]);
    setCustomer("");
    setProduct("Copra");
    setQuantity("");
    setUnitPrice("");
    setPaymentMethod("Cash");
    setFormErrors({});
    setIsAddModalOpen(true);
  };

  const openEditModal = (r: CashSalesBookRecord) => {
    setSelectedRecord(r);
    setInvoiceNumber(r.invoice_number);
    setSaleDate(r.sale_date ? (typeof r.sale_date === 'string' ? r.sale_date.split('T')[0] : r.sale_date) : "");
    setCustomer(r.customer);
    setProduct(r.product);
    setQuantity(r.quantity.toString());
    setUnitPrice(r.unit_price.toString());
    setPaymentMethod(r.payment_method);
    setFormErrors({});
    setIsEditModalOpen(true);
  };

  const openViewModal = (r: CashSalesBookRecord) => {
    setSelectedRecord(r);
    setIsViewModalOpen(true);
  };

  const handleAdd = async (e: FormEvent) => {
    e.preventDefault();
    setFormErrors({});

    try {
      setSubmitLoading(true);
      await BooksOfAccountsService.storeSalesBook({
        invoice_number: invoiceNumber || undefined,
        sale_date: saleDate,
        customer,
        product,
        quantity: parseFloat(quantity),
        unit_price: parseFloat(unitPrice),
        payment_method: paymentMethod
      });
      setIsAddModalOpen(false);
      Swal.fire("Saved", "Sale invoice recorded successfully in Sales Book.", "success");
      fetchRecords(currentPage);
    } catch (err: any) {
      if (err.response && err.response.status === 422) {
        setFormErrors(err.response.data.errors);
      } else {
        Swal.fire("Error", "Failed to record sale.", "error");
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
      await BooksOfAccountsService.updateSalesBook(selectedRecord.id, {
        invoice_number: invoiceNumber,
        sale_date: saleDate,
        customer,
        product,
        quantity: parseFloat(quantity),
        unit_price: parseFloat(unitPrice),
        payment_method: paymentMethod
      });
      setIsEditModalOpen(false);
      Swal.fire("Saved", "Sale invoice updated successfully.", "success");
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

  const handleDelete = async (r: CashSalesBookRecord) => {
    const result = await Swal.fire({
      title: "Delete Sale Record?",
      text: `Are you sure you want to delete Invoice ${r.invoice_number} for customer ${r.customer}?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#EF4444",
      cancelButtonColor: "#64748B",
      confirmButtonText: "Yes, delete",
      cancelButtonText: "Cancel"
    });

    if (!result.isConfirmed) return;

    try {
      await BooksOfAccountsService.destroySalesBook(r.id);
      Swal.fire("Deleted", "Sales record deleted successfully.", "success");
      fetchRecords(currentPage);
    } catch (err) {
      console.error(err);
      Swal.fire("Error", "Failed to delete sales record.", "error");
    }
  };

  const handlePrintInvoice = (r: CashSalesBookRecord) => {
    const headers = ["Field", "Details"];
    const rows = [
      ["Invoice Number", r.invoice_number],
      ["Invoice Date", r.sale_date],
      ["Customer / Buyer", r.customer],
      ["Product Item", r.product],
      ["Quantity Sold", `${parseFloat(r.quantity.toString()).toLocaleString()} kg`],
      ["Unit Price", `₱ ${parseFloat(r.unit_price.toString()).toFixed(2)} / kg`],
      ["Total Invoice Amount", `₱ ${parseFloat(r.total_amount.toString()).toLocaleString(undefined, { minimumFractionDigits: 2 })}`],
      ["Payment Method", r.payment_method],
      ["Recorded By", r.recorded_by]
    ];
    printReport(`Sales Invoice - ${r.invoice_number}`, headers, rows);
  };

  const handleExportExcel = () => {
    const dataToExport = records.map(r => ({
      "Invoice No": r.invoice_number,
      "Date": r.sale_date,
      "Customer": r.customer,
      "Product": r.product,
      "Quantity": r.quantity,
      "Unit Price (₱)": r.unit_price,
      "Total Amount (₱)": r.total_amount,
      "Payment Method": r.payment_method,
      "Recorded By": r.recorded_by
    }));
    exportToExcel(dataToExport, `Cash_Register_Sales_Book_${new Date().toISOString().split("T")[0]}`);
  };

  const handlePrint = () => {
    const headers = ["Invoice No", "Date", "Customer", "Product", "Qty", "Unit Price", "Total Amount (₱)", "Method", "Recorded By"];
    const rows = records.map(r => [
      r.invoice_number,
      r.sale_date,
      r.customer,
      r.product,
      r.quantity,
      `₱ ${parseFloat(r.unit_price.toString()).toFixed(2)}`,
      `₱ ${parseFloat(r.total_amount.toString()).toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
      r.payment_method,
      r.recorded_by
    ]);
    printReport("Cash Register Sales Book", headers, rows);
  };

  const handleExportPDF = () => {
    const headers = ["Invoice No", "Date", "Customer", "Product", "Qty", "Unit Price", "Total Amount (₱)", "Method", "Recorded By"];
    const rows = records.map(r => [
      r.invoice_number,
      r.sale_date,
      r.customer,
      r.product,
      r.quantity,
      `₱ ${parseFloat(r.unit_price.toString()).toFixed(2)}`,
      `₱ ${parseFloat(r.total_amount.toString()).toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
      r.payment_method,
      r.recorded_by
    ]);
    exportToPDF("Cash Register Sales Book", headers, rows);
  };

  return (
    <div className="space-y-6">
      {/* Header Panel */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center bg-white p-6 rounded-2xl border border-slate-100 shadow-xs gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-2xl">📈</span>
            <h1 className="text-xl font-bold text-slate-800">Cash Register Sales Book</h1>
          </div>
          <p className="text-sm text-slate-500 mt-0.5">Records all sales transactions, buyers, product volumes, and generated sales invoices.</p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={handlePrint}
            className="px-3.5 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold text-xs flex items-center gap-1.5 transition cursor-pointer"
          >
            <FiPrinter className="w-4 h-4 text-slate-500" />
            <span>Print Book</span>
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
            <span>Record Sale</span>
          </button>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4">
          <SearchBar value={search} onChange={setSearch} placeholder="Search invoice no, customer, product, recorded by..." />

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
            <p className="text-slate-400 text-sm">Fetching sales book entries...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100 text-sm">
              <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider text-xs">
                <tr>
                  <th onClick={() => handleSort("invoice_number")} className="px-6 py-4 text-left cursor-pointer hover:text-slate-700">
                    Invoice No {sortBy === "invoice_number" ? (sortOrder === "asc" ? "▲" : "▼") : ""}
                  </th>
                  <th onClick={() => handleSort("sale_date")} className="px-6 py-4 text-left cursor-pointer hover:text-slate-700">
                    Date {sortBy === "sale_date" ? (sortOrder === "asc" ? "▲" : "▼") : ""}
                  </th>
                  <th onClick={() => handleSort("customer")} className="px-6 py-4 text-left cursor-pointer hover:text-slate-700">
                    Customer {sortBy === "customer" ? (sortOrder === "asc" ? "▲" : "▼") : ""}
                  </th>
                  <th onClick={() => handleSort("product")} className="px-6 py-4 text-left cursor-pointer hover:text-slate-700">
                    Product {sortBy === "product" ? (sortOrder === "asc" ? "▲" : "▼") : ""}
                  </th>
                  <th onClick={() => handleSort("quantity")} className="px-6 py-4 text-right cursor-pointer hover:text-slate-700">
                    Quantity {sortBy === "quantity" ? (sortOrder === "asc" ? "▲" : "▼") : ""}
                  </th>
                  <th onClick={() => handleSort("unit_price")} className="px-6 py-4 text-right cursor-pointer hover:text-slate-700">
                    Unit Price (₱) {sortBy === "unit_price" ? (sortOrder === "asc" ? "▲" : "▼") : ""}
                  </th>
                  <th onClick={() => handleSort("total_amount")} className="px-6 py-4 text-right cursor-pointer hover:text-slate-700">
                    Total Amount (₱) {sortBy === "total_amount" ? (sortOrder === "asc" ? "▲" : "▼") : ""}
                  </th>
                  <th className="px-6 py-4 text-left">Payment</th>
                  <th className="px-6 py-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {records.length > 0 ? (
                  records.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 font-semibold text-primary">{r.invoice_number}</td>
                      <td className="px-6 py-4 whitespace-nowrap">{r.sale_date}</td>
                      <td className="px-6 py-4 font-semibold text-slate-800">{r.customer}</td>
                      <td className="px-6 py-4 text-slate-600">{r.product}</td>
                      <td className="px-6 py-4 text-right">{parseFloat(r.quantity.toString()).toLocaleString()} kg</td>
                      <td className="px-6 py-4 text-right">₱ {parseFloat(r.unit_price.toString()).toFixed(2)}</td>
                      <td className="px-6 py-4 text-right font-bold text-emerald-600">
                        ₱ {parseFloat(r.total_amount.toString()).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-6 py-4 text-xs font-medium text-slate-500">{r.payment_method}</td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex justify-center items-center gap-1">
                          <button
                            onClick={() => openViewModal(r)}
                            title="View Invoice"
                            className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 cursor-pointer"
                          >
                            <FiEye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handlePrintInvoice(r)}
                            title="Print Invoice"
                            className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 cursor-pointer"
                          >
                            <FiPrinter className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => openEditModal(r)}
                            title="Edit Sale"
                            className="p-1.5 rounded-lg text-primary hover:bg-green-50 cursor-pointer"
                          >
                            <FiEdit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(r)}
                            title="Delete Sale"
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
                    <td colSpan={9} className="px-6 py-12 text-center text-slate-400 font-medium">
                      No sales book records found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
        <Pagination currentPage={currentPage} lastPage={lastPage} onPageChange={(p) => fetchRecords(p)} />
      </div>

      {/* RECORD SALE MODAL */}
      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} showCloseButton={true}>
        <div className="p-2 space-y-4">
          <div>
            <h3 className="text-lg font-bold text-slate-800">Record Sales Book Entry</h3>
            <p className="text-xs text-slate-500">Record sales invoice and buyer details. Total amount is calculated automatically.</p>
          </div>

          <form onSubmit={handleAdd} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Sale Date</label>
                <input
                  type="date"
                  required
                  value={saleDate}
                  onChange={(e) => setSaleDate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Invoice Number (Optional)</label>
                <input
                  type="text"
                  placeholder="Auto-generated (CRSB-...)"
                  value={invoiceNumber}
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
                {formErrors.invoice_number && <p className="text-red-500 text-xs mt-1">{formErrors.invoice_number[0]}</p>}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Customer / Buyer</label>
                <input
                  type="text"
                  required
                  placeholder="Customer Name or Company"
                  value={customer}
                  onChange={(e) => setCustomer(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Product</label>
                <select
                  value={product}
                  onChange={(e) => setProduct(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {productList.map(p => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Quantity (kg)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  placeholder="0.00"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Unit Price (₱ per kg)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  placeholder="0.00"
                  value={unitPrice}
                  onChange={(e) => setUnitPrice(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
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

            {/* Calculated Total Display */}
            <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl flex justify-between items-center text-sm">
              <span className="font-semibold text-slate-500 uppercase text-xs">Auto Calculated Invoice Total:</span>
              <span className="font-bold text-emerald-600 text-lg">₱ {computedTotal()}</span>
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
                {submitLoading ? "Recording..." : "Record Sale"}
              </button>
            </div>
          </form>
        </div>
      </Modal>

      {/* EDIT SALE MODAL */}
      <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} showCloseButton={true}>
        <div className="p-2 space-y-4">
          <div>
            <h3 className="text-lg font-bold text-slate-800">Edit Sales Invoice</h3>
            <p className="text-xs text-slate-500">Invoice: <span className="font-semibold text-primary">{selectedRecord?.invoice_number}</span></p>
          </div>

          <form onSubmit={handleEdit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Sale Date</label>
                <input
                  type="date"
                  required
                  value={saleDate}
                  onChange={(e) => setSaleDate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Invoice Number</label>
                <input
                  type="text"
                  required
                  value={invoiceNumber}
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Customer / Buyer</label>
                <input
                  type="text"
                  required
                  value={customer}
                  onChange={(e) => setCustomer(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Product</label>
                <select
                  value={product}
                  onChange={(e) => setProduct(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {productList.map(p => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Quantity (kg)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Unit Price (₱ per kg)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  value={unitPrice}
                  onChange={(e) => setUnitPrice(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
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

            <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl flex justify-between items-center text-sm">
              <span className="font-semibold text-slate-500 uppercase text-xs">Auto Calculated Invoice Total:</span>
              <span className="font-bold text-emerald-600 text-lg">₱ {computedTotal()}</span>
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
                {submitLoading ? "Updating..." : "Update Sale"}
              </button>
            </div>
          </form>
        </div>
      </Modal>

      {/* VIEW INVOICE MODAL */}
      <Modal isOpen={isViewModalOpen} onClose={() => setIsViewModalOpen(false)} showCloseButton={true}>
        {selectedRecord && (
          <div className="p-2 space-y-4">
            <div className="flex justify-between items-start border-b border-slate-100 pb-3">
              <div>
                <span className="text-xs uppercase font-bold text-primary tracking-wider">Sales Invoice</span>
                <h3 className="text-xl font-bold text-slate-800 mt-0.5">{selectedRecord.invoice_number}</h3>
                <p className="text-xs text-slate-400">Date: {selectedRecord.sale_date}</p>
              </div>
              <button
                onClick={() => handlePrintInvoice(selectedRecord)}
                className="px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 font-semibold rounded-lg text-xs flex items-center gap-1 cursor-pointer"
              >
                <FiPrinter className="w-3.5 h-3.5" />
                <span>Print Invoice</span>
              </button>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-3 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-xs font-semibold text-slate-400 uppercase">Invoice Total</span>
                <span className="text-xl font-extrabold text-emerald-600">₱ {parseFloat(selectedRecord.total_amount.toString()).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200/60">
                <div>
                  <span className="text-xs font-semibold text-slate-400 uppercase block">Customer</span>
                  <span className="font-bold text-slate-800">{selectedRecord.customer}</span>
                </div>
                <div>
                  <span className="text-xs font-semibold text-slate-400 uppercase block">Product</span>
                  <span className="font-semibold text-slate-700">{selectedRecord.product}</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm text-slate-700">
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase">Quantity Sold</p>
                <p className="mt-0.5 font-medium">{parseFloat(selectedRecord.quantity.toString()).toLocaleString()} kg</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase">Unit Price</p>
                <p className="mt-0.5 font-medium">₱ {parseFloat(selectedRecord.unit_price.toString()).toFixed(2)} / kg</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase">Payment Method</p>
                <p className="mt-0.5 font-medium">{selectedRecord.payment_method}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase">Recorded By</p>
                <p className="mt-0.5 font-medium">{selectedRecord.recorded_by}</p>
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

export default CashSalesBookPage;
