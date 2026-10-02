import { useState, useEffect, type FormEvent } from "react";
import ProductionService from "../../services/ProductionService";
import MemberService from "../../services/MemberService";
import SettingService from "../../services/SettingService";
import type { Production, Member } from "../../Interfaces";
import SearchBar from "../../components/SearchBar";
import Pagination from "../../components/Pagination";
import Modal from "../../components/Modal";
import { FiPlus, FiEdit, FiTrash2, FiCalendar, FiAlertTriangle, FiInfo } from "react-icons/fi";
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
  const [productTypeFilter, setProductTypeFilter] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // CRUD States
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedProduction, setSelectedProduction] = useState<Production | null>(null);

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

  // Live Purchase & CBU Computation
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
        page, search, statusFilter, productTypeFilter, startDate, endDate
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
      // Fetch active members to populate the dropdown (page 1, up to 500 members)
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
  }, [search, statusFilter, productTypeFilter, startDate, endDate]);

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
      Swal.fire("Saved", "Production record added successfully.", "success");
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
      text: `Are you sure you want to delete this batch of ${p.quantity}kg ${p.product_type} for ${memberName}?`,
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

  return (
    <div className="space-y-6">
      {/* Header Panel */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-6 rounded-2xl border border-slate-100 shadow-xs gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Coconut Production Records</h1>
          <p className="text-sm text-slate-500 mt-0.5">Record and monitor coconut yields and copra deliveries purchased from cooperative members.</p>
        </div>
        <button
          onClick={openAddModal}
          className="bg-primary hover:bg-primary-dark text-white font-semibold py-2.5 px-4 rounded-xl shadow-md hover:shadow-lg transition flex items-center gap-2 cursor-pointer text-sm"
        >
          <FiPlus className="w-4 h-4" />
          <span>Record Production</span>
        </button>
      </div>

      {/* Filter Options */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4">
          <SearchBar value={search} onChange={setSearch} placeholder="Search by member name, farm, remarks..." />

          <div className="flex flex-col sm:flex-row items-center gap-3">
            <select
              value={productTypeFilter}
              onChange={(e) => setProductTypeFilter(e.target.value)}
              className="w-full sm:w-40 px-3.5 py-2 border border-slate-200 rounded-xl bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
            >
              <option value="">All Products</option>
              {productTypesList.map(type => (
                <option key={type} value={type}>{type}</option>
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

        {/* Date Filters Row */}
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

      {/* Production Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            <p className="text-slate-400 text-sm">Searching production registry...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100 text-sm">
              <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider text-xs">
                <tr>
                  <th className="px-5 py-4 text-left">Date</th>
                  <th className="px-5 py-4 text-left">Member Farmer</th>
                  <th className="px-5 py-4 text-left">Product</th>
                  <th className="px-5 py-4 text-right">Quantity</th>
                  <th className="px-5 py-4 text-right">Price/Unit</th>
                  <th className="px-5 py-4 text-right">Gross Amount</th>
                  <th className="px-5 py-4 text-right">CBU Deducted</th>
                  <th className="px-5 py-4 text-right">Net Payable</th>
                  <th className="px-5 py-4 text-left">Source Farm</th>
                  <th className="px-5 py-4 text-left">Status</th>
                  <th className="px-5 py-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {productions.length > 0 ? (
                  productions.map((p) => {
                    const price = p.unit_price ? parseFloat(p.unit_price.toString()) : 0;
                    const gross = p.gross_amount ? parseFloat(p.gross_amount.toString()) : (price > 0 ? price * parseFloat(p.quantity.toString()) : 0);
                    const cbu = p.cbu_deduction ? parseFloat(p.cbu_deduction.toString()) : 0;
                    const net = p.net_amount ? parseFloat(p.net_amount.toString()) : (gross > 0 ? Math.max(0, gross - cbu) : 0);

                    return (
                      <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-5 py-4 flex items-center gap-2 whitespace-nowrap">
                          <FiCalendar className="text-slate-400 w-4 h-4 shrink-0" />
                          <span>{p.production_date ? (typeof p.production_date === 'string' ? p.production_date.split('T')[0] : p.production_date) : ""}</span>
                        </td>
                        <td className="px-5 py-4 whitespace-nowrap">
                          {p.member ? (
                            <div>
                              <span className="font-semibold text-slate-800">{p.member.firstname} {p.member.lastname}</span>
                              <span className="block text-[10px] text-slate-400 font-medium">{p.member.member_code}</span>
                            </div>
                          ) : (
                            <span className="text-slate-400 italic">Unknown Farmer</span>
                          )}
                        </td>
                        <td className="px-5 py-4 font-semibold text-slate-800 whitespace-nowrap">{p.product_type}</td>
                        <td className="px-5 py-4 text-right font-bold text-slate-700 whitespace-nowrap">
                          {parseFloat(p.quantity.toString()).toLocaleString()} {p.unit}
                        </td>
                        <td className="px-5 py-4 text-right text-slate-600 whitespace-nowrap">
                          {price > 0 ? formatPHP(price) : <span className="text-slate-350">—</span>}
                        </td>
                        <td className="px-5 py-4 text-right font-semibold text-slate-800 whitespace-nowrap">
                          {gross > 0 ? formatPHP(gross) : <span className="text-slate-350">—</span>}
                        </td>
                        <td className="px-5 py-4 text-right whitespace-nowrap">
                          {cbu > 0 ? (
                            <span className="font-semibold text-amber-700">-{formatPHP(cbu)}</span>
                          ) : (
                            <span className="text-slate-400">₱0.00</span>
                          )}
                        </td>
                        <td className="px-5 py-4 text-right font-bold text-primary whitespace-nowrap">
                          {net > 0 ? formatPHP(net) : (gross > 0 ? formatPHP(gross) : <span className="text-slate-350">—</span>)}
                        </td>
                        <td className="px-5 py-4 text-slate-600 whitespace-nowrap">{p.source}</td>
                        <td className="px-5 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${p.status === 'Completed' ? 'bg-green-50 text-green-700 border border-green-150' :
                            p.status === 'Approved' ? 'bg-blue-50 text-blue-700 border border-blue-150' :
                              p.status === 'Pending' ? 'bg-amber-50 text-amber-700 border border-amber-150' :
                                'bg-red-50 text-red-750 border border-red-150'
                            }`}>
                            {p.status}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-center whitespace-nowrap">
                          <div className="flex justify-center items-center gap-2">
                            <button
                              onClick={() => openEditModal(p)}
                              title="Edit Record"
                              className="p-1.5 rounded-lg text-primary hover:bg-green-50 cursor-pointer"
                            >
                              <FiEdit className="w-4.5 h-4.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteProduction(p)}
                              title="Delete Record"
                              className="p-1.5 rounded-lg text-red-655 hover:bg-red-50 cursor-pointer"
                            >
                              <FiTrash2 className="w-4.5 h-4.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={11} className="px-6 py-12 text-center text-slate-400 font-medium">
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
            <p className="text-xs text-slate-500">Record member delivered crop batch, purchase price, and CBU deduction.</p>
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
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary"
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
                      className="w-full pl-3 pr-12 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary"
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
                      className="w-full pl-8 pr-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary"
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
                      CBU Rate: {formatPHP(effectiveCbuRate)}/{unit}
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

                {!hasCbuConfigured && (
                  <p className="text-[11px] text-amber-600 pt-1 flex items-center gap-1">
                    <FiInfo className="w-3.5 h-3.5 shrink-0" />
                    <span>CBU deduction is not applied because no CBU rate is configured in Cooperative Settings.</span>
                  </p>
                )}
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
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary"
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
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary"
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
                    className="w-full pl-3 pr-12 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary"
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
                    className="w-full pl-8 pr-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary"
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
                    CBU Rate: {formatPHP(effectiveCbuRate)}/{unit}
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

              {!hasCbuConfigured && (
                <p className="text-[11px] text-amber-600 pt-1 flex items-center gap-1">
                  <FiInfo className="w-3.5 h-3.5 shrink-0" />
                  <span>CBU deduction is not applied because no CBU rate is configured in Cooperative Settings.</span>
                </p>
              )}
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
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary"
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
                {submitLoading ? "Updating..." : "Update Entry"}
              </button>
            </div>
          </form>
        </div>
      </Modal>
    </div>
  );
};

export default ProductionsPage;
