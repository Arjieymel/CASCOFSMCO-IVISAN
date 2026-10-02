import { useState, useEffect, type FormEvent } from "react";
import SaleService from "../../services/SaleService";
import type { Sale } from "../../Interfaces";
import SearchBar from "../../components/SearchBar";
import Pagination from "../../components/Pagination";
import Modal from "../../components/Modal";
import { FiPlus, FiEdit, FiTrash2, FiCalendar } from "react-icons/fi";
import Swal from "sweetalert2";

const SalesPage = () => {
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);

  // Search & Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [paymentFilter, setPaymentFilter] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // CRUD States
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);

  // Form Fields
  const [buyer, setBuyer] = useState("");
  const [product, setProduct] = useState("Copra");
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState("kg");
  const [unitPrice, setUnitPrice] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("Cash");
  const [remarks, setRemarks] = useState("");
  const [status, setStatus] = useState("Paid");
  const [saleDate, setSaleDate] = useState("");

  const [formErrors, setFormErrors] = useState<any>({});
  const [submitLoading, setSubmitLoading] = useState(false);

  const productList = ["Coconut Oil", "Desiccated Coconut", "Charcoal", "Coir Fiber"];
  const paymentMethodsList = ["Cash", "GCash", "Bank Transfer", "Check"];
  const statusesList = ["Paid", "Cancelled"];

  const fetchSales = async (page: number = 1) => {
    try {
      setLoading(true);
      const res = await SaleService.loadSales(
        page, search, statusFilter, paymentFilter, startDate, endDate
      );
      setSales(res.data.data);
      setCurrentPage(res.data.current_page);
      setLastPage(res.data.last_page);
    } catch (err) {
      console.error("Failed to load sales: ", err);
      Swal.fire("Error", "Could not fetch sales logs.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSales(1);
  }, [search, statusFilter, paymentFilter, startDate, endDate]);

  const handlePageChange = (page: number) => {
    fetchSales(page);
  };

  // Open Modals
  const openAddModal = () => {
    setBuyer("");
    setProduct("Copra");
    setQuantity("");
    setUnit("kg");
    setUnitPrice("");
    setPaymentMethod("Cash");
    setRemarks("");
    setStatus("Paid");
    setSaleDate(new Date().toISOString().split("T")[0]);
    setFormErrors({});
    setIsAddModalOpen(true);
  };

  const openEditModal = (s: Sale) => {
    setSelectedSale(s);
    setBuyer(s.buyer);
    setProduct(s.product);
    setQuantity(s.quantity.toString());
    setUnit(s.unit);
    setUnitPrice(s.unit_price.toString());
    setPaymentMethod(s.payment_method);
    setRemarks(s.remarks || "");
    setStatus(s.status);
    setSaleDate(s.sale_date ? (typeof s.sale_date === 'string' ? s.sale_date.split('T')[0] : s.sale_date) : "");
    setFormErrors({});
    setIsEditModalOpen(true);
  };

  // Form Submissions
  const handleAddSale = async (e: FormEvent) => {
    e.preventDefault();
    setFormErrors({});

    const payload = {
      buyer,
      product,
      quantity: parseFloat(quantity),
      unit,
      unit_price: parseFloat(unitPrice),
      payment_method: paymentMethod,
      remarks,
      status,
      sale_date: saleDate
    };

    try {
      setSubmitLoading(true);
      await SaleService.storeSale(payload);
      setIsAddModalOpen(false);
      Swal.fire("Saved", "Sales invoice recorded successfully.", "success");
      fetchSales(currentPage);
    } catch (err: any) {
      if (err.response && err.response.status === 422) {
        setFormErrors(err.response.data.errors);
      } else {
        Swal.fire("Error", "Failed to record sales invoice.", "error");
      }
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleEditSale = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedSale) return;
    setFormErrors({});

    const payload = {
      buyer,
      product,
      quantity: parseFloat(quantity),
      unit,
      unit_price: parseFloat(unitPrice),
      payment_method: paymentMethod,
      remarks,
      status,
      sale_date: saleDate
    };

    try {
      setSubmitLoading(true);
      await SaleService.updateSale(selectedSale.id, payload);
      setIsEditModalOpen(false);
      Swal.fire("Saved", "Sales record updated successfully.", "success");
      fetchSales(currentPage);
    } catch (err: any) {
      if (err.response && err.response.status === 422) {
        setFormErrors(err.response.data.errors);
      } else {
        Swal.fire("Error", "Failed to update sales record.", "error");
      }
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleDeleteSale = async (s: Sale) => {
    const result = await Swal.fire({
      title: "Delete Sale?",
      text: `Are you sure you want to delete sales invoice: ${s.invoice_no} to ${s.buyer}? This will reverse the wholesale sales figure.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#EF4444",
      cancelButtonColor: "#64748B",
      confirmButtonText: "Yes, delete",
      cancelButtonText: "Cancel"
    });

    if (!result.isConfirmed) return;

    try {
      await SaleService.destroySale(s.id);
      Swal.fire("Deleted", "Sales record has been deleted.", "success");
      fetchSales(currentPage);
    } catch (err) {
      console.error(err);
      Swal.fire("Error", "Failed to delete sales record.", "error");
    }
  };

  // Computes total inline for the forms
  const computedTotal = () => {
    const q = parseFloat(quantity);
    const p = parseFloat(unitPrice);
    if (!isNaN(q) && !isNaN(p)) {
      return (q * p).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    return "0.00";
  };

  return (
    <div className="space-y-6">
      {/* Header Panel */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-6 rounded-2xl border border-slate-100 shadow-xs gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Wholesale Sales Recording</h1>
          <p className="text-sm text-slate-500 mt-0.5">Record wholesale copra sales, generate invoices, track buyers and payouts.</p>
        </div>
        <button
          onClick={openAddModal}
          className="bg-primary hover:bg-primary-dark text-white font-semibold py-2.5 px-4 rounded-xl shadow-md hover:shadow-lg transition flex items-center gap-2 cursor-pointer text-sm"
        >
          <FiPlus className="w-4 h-4" />
          <span>Record New Sale</span>
        </button>
      </div>

      {/* Search & Filters */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4">
          <SearchBar value={search} onChange={setSearch} placeholder="Search by invoice no, buyer, product..." />

          <div className="flex flex-col sm:flex-row items-center gap-3">
            <select
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value)}
              className="w-full sm:w-42 px-3.5 py-2 border border-slate-200 rounded-xl bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
            >
              <option value="">All Payments</option>
              {paymentMethodsList.map(method => (
                <option key={method} value={method}>{method}</option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full sm:w-40 px-3.5 py-2 border border-slate-200 rounded-xl bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
            >
              <option value="">All Statuses</option>
              {statusesList.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Date Filter Row */}
        <div className="flex flex-wrap items-center gap-3 border-t border-slate-50 pt-4 text-xs font-semibold text-slate-500">
          <span className="uppercase tracking-wider">Date Filters:</span>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs font-medium text-slate-600 focus:ring-1 focus:ring-primary focus:outline-none"
            />
            <span>to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs font-medium text-slate-600 focus:ring-1 focus:ring-primary focus:outline-none"
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

      {/* Sales Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            <p className="text-slate-400 text-sm">Searching sales logs...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100 text-sm">
              <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider text-xs">
                <tr>
                  <th className="px-6 py-4 text-left">Invoice No</th>
                  <th className="px-6 py-4 text-left">Date</th>
                  <th className="px-6 py-4 text-left">Buyer</th>
                  <th className="px-6 py-4 text-left">Product</th>
                  <th className="px-6 py-4 text-left">Qty</th>
                  <th className="px-6 py-4 text-left">Unit Price</th>
                  <th className="px-6 py-4 text-left">Total Amount</th>
                  <th className="px-6 py-4 text-left">Payment</th>
                  <th className="px-6 py-4 text-left">Status</th>
                  <th className="px-6 py-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {sales.length > 0 ? (
                  sales.map((sale) => (
                    <tr key={sale.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 font-semibold text-primary">{sale.invoice_no}</td>
                      <td className="px-6 py-4 flex items-center gap-2">
                        <FiCalendar className="text-slate-400 w-4 h-4" />
                        <span>{sale.sale_date ? (typeof sale.sale_date === 'string' ? sale.sale_date.split('T')[0] : sale.sale_date) : ""}</span>
                      </td>
                      <td className="px-6 py-4 font-semibold text-slate-800">{sale.buyer}</td>
                      <td className="px-6 py-4">{sale.product}</td>
                      <td className="px-6 py-4">{parseFloat(sale.quantity.toString()).toLocaleString()} {sale.unit}</td>
                      <td className="px-6 py-4">₱ {parseFloat(sale.unit_price.toString()).toFixed(2)}</td>
                      <td className="px-6 py-4 font-bold text-primary">₱ {parseFloat(sale.total_amount.toString()).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-1.5 font-medium">
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-400 inline-block"></span>
                          {sale.payment_method}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${sale.status === 'Paid' ? 'bg-green-50 text-green-700 border border-green-150' :
                          sale.status === 'Pending' ? 'bg-amber-50 text-amber-700 border border-amber-150' :
                            'bg-red-50 text-red-750 border border-red-150'
                          }`}>
                          {sale.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex justify-center items-center gap-2">
                          <button
                            onClick={() => openEditModal(sale)}
                            title="Edit Invoice"
                            className="p-1.5 rounded-lg text-primary hover:bg-green-50 cursor-pointer"
                          >
                            <FiEdit className="w-4.5 h-4.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteSale(sale)}
                            title="Delete Invoice"
                            className="p-1.5 rounded-lg text-red-655 hover:bg-red-50 cursor-pointer"
                          >
                            <FiTrash2 className="w-4.5 h-4.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={10} className="px-6 py-12 text-center text-slate-400 font-medium">
                      No sales invoice records found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
        <Pagination currentPage={currentPage} lastPage={lastPage} onPageChange={handlePageChange} />
      </div>

      {/* ADD SALE RECORD MODAL */}
      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} showCloseButton={true}>
        <div className="p-2 space-y-4">
          <div>
            <h3 className="text-lg font-bold text-slate-800">Record Wholesale Sale</h3>
            <p className="text-xs text-slate-500">Record a new buyer transaction. Total amount is calculated automatically.</p>
          </div>

          <form onSubmit={handleAddSale} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Buyer Company/Name</label>
              <input
                type="text"
                required
                value={buyer}
                onChange={(e) => setBuyer(e.target.value)}
                placeholder="e.g. Franklin Baker Company"
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
              {formErrors.buyer && <p className="text-red-550 text-xs mt-1">{formErrors.buyer[0]}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Product Category</label>
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
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Transaction Date</label>
                <input
                  type="date"
                  required
                  value={saleDate}
                  onChange={(e) => setSaleDate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
                {formErrors.sale_date && <p className="text-red-550 text-xs mt-1">{formErrors.sale_date[0]}</p>}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Quantity (Weight)</label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    required
                    min="0.01"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    placeholder="0.00"
                    className="w-full pl-3 pr-12 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  <span className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-sm font-semibold text-slate-400 pointer-events-none">
                    {unit}
                  </span>
                </div>
                {formErrors.quantity && <p className="text-red-550 text-xs mt-1">{formErrors.quantity[0]}</p>}
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Unit Price (PHP per kg)</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 text-sm pointer-events-none">₱</span>
                  <input
                    type="number"
                    step="0.01"
                    required
                    min="0.01"
                    value={unitPrice}
                    onChange={(e) => setUnitPrice(e.target.value)}
                    placeholder="0.00"
                    className="w-full pl-7 pr-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                {formErrors.unit_price && <p className="text-red-550 text-xs mt-1">{formErrors.unit_price[0]}</p>}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Payment Method</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {paymentMethodsList.map(method => (
                    <option key={method} value={method}>{method}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Sales Status</label>
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

            {/* Auto calculate display */}
            <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl flex justify-between items-center text-sm">
              <span className="font-semibold text-slate-500 uppercase text-xs">Auto Calculated Invoice Total:</span>
              <span className="font-bold text-primary text-lg">₱ {computedTotal()}</span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Remarks</label>
              <textarea
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="Remarks regarding shipping terms, delayed checks, etc."
                rows={2}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary"
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
                {submitLoading ? "Recording..." : "Record Sale"}
              </button>
            </div>
          </form>
        </div>
      </Modal>

      {/* EDIT SALE RECORD MODAL */}
      <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} showCloseButton={true}>
        <div className="p-2 space-y-4">
          <div>
            <h3 className="text-lg font-bold text-slate-800">Edit Sales Transaction</h3>
            <p className="text-xs text-slate-500">Edit sales data for Invoice: <span className="font-semibold text-primary">{selectedSale?.invoice_no}</span></p>
          </div>

          <form onSubmit={handleEditSale} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Buyer Company/Name</label>
              <input
                type="text"
                required
                value={buyer}
                onChange={(e) => setBuyer(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
              {formErrors.buyer && <p className="text-red-550 text-xs mt-1">{formErrors.buyer[0]}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Product Category</label>
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
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Transaction Date</label>
                <input
                  type="date"
                  required
                  value={saleDate}
                  onChange={(e) => setSaleDate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
                {formErrors.sale_date && <p className="text-red-550 text-xs mt-1">{formErrors.sale_date[0]}</p>}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Quantity (Weight)</label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    required
                    min="0.01"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    className="w-full pl-3 pr-12 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  <span className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-sm font-semibold text-slate-400 pointer-events-none">
                    {unit}
                  </span>
                </div>
                {formErrors.quantity && <p className="text-red-550 text-xs mt-1">{formErrors.quantity[0]}</p>}
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Unit Price (PHP per kg)</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 text-sm pointer-events-none">₱</span>
                  <input
                    type="number"
                    step="0.01"
                    required
                    min="0.01"
                    value={unitPrice}
                    onChange={(e) => setUnitPrice(e.target.value)}
                    className="w-full pl-7 pr-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                {formErrors.unit_price && <p className="text-red-550 text-xs mt-1">{formErrors.unit_price[0]}</p>}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Payment Method</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {paymentMethodsList.map(method => (
                    <option key={method} value={method}>{method}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Sales Status</label>
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

            {/* Auto calculate display */}
            <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl flex justify-between items-center text-sm">
              <span className="font-semibold text-slate-500 uppercase text-xs">Auto Calculated Invoice Total:</span>
              <span className="font-bold text-primary text-lg">₱ {computedTotal()}</span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Remarks</label>
              <textarea
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                rows={2}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary"
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
                {submitLoading ? "Updating..." : "Update Transaction"}
              </button>
            </div>
          </form>
        </div>
      </Modal>
    </div>
  );
};

export default SalesPage;
