import { useState, useEffect, type FormEvent } from "react";
import MemberService from "../../services/MemberService";
import type { Member } from "../../Interfaces";
import SearchBar from "../../components/SearchBar";
import Pagination from "../../components/Pagination";
import Modal from "../../components/Modal";
import { FiPlus, FiEdit, FiTrash2, FiEye, FiUser, FiMail, FiPhone, FiMapPin, FiCalendar } from "react-icons/fi";
import Swal from "sweetalert2";

const MembersPage = () => {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);

  // Search & Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [genderFilter, setGenderFilter] = useState("");

  // CRUD Modals States
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);

  // Form Fields
  const [firstname, setFirstname] = useState("");
  const [lastname, setLastname] = useState("");
  const [gender, setGender] = useState("Male");
  const [birthdate, setBirthdate] = useState("");
  const [address, setAddress] = useState("");
  const [contactNumber, setContactNumber] = useState("");
  const [email, setEmail] = useState("");
  const [membershipDate, setMembershipDate] = useState("");
  const [status, setStatus] = useState("Active");
  const [profilePicture, setProfilePicture] = useState<File | null>(null);
  
  // Validation/Errors
  const [formErrors, setFormErrors] = useState<any>({});
  const [submitLoading, setSubmitLoading] = useState(false);

  const fetchMembers = async (page: number = 1) => {
    try {
      setLoading(true);
      const res = await MemberService.loadMembers(page, search, statusFilter, genderFilter);
      setMembers(res.data.data);
      setCurrentPage(res.data.current_page);
      setLastPage(res.data.last_page);
    } catch (err) {
      console.error("Failed to load members: ", err);
      Swal.fire("Error", "Could not fetch member directories.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMembers(1);
  }, [search, statusFilter, genderFilter]);

  const handlePageChange = (page: number) => {
    fetchMembers(page);
  };

  // Open modals
  const openAddModal = () => {
    setFirstname("");
    setLastname("");
    setGender("Male");
    setBirthdate("");
    setAddress("");
    setContactNumber("");
    setEmail("");
    setMembershipDate(new Date().toISOString().split('T')[0]);
    setStatus("Active");
    setProfilePicture(null);
    setFormErrors({});
    setIsAddModalOpen(true);
  };

  const openEditModal = (member: Member) => {
    setSelectedMember(member);
    setFirstname(member.firstname);
    setLastname(member.lastname);
    setGender(member.gender);
    setBirthdate(member.birthdate);
    setAddress(member.address);
    setContactNumber(member.contact_number);
    setEmail(member.email || "");
    setMembershipDate(member.membership_date);
    setStatus(member.status);
    setProfilePicture(null);
    setFormErrors({});
    setIsEditModalOpen(true);
  };

  const openViewModal = async (member: Member) => {
    try {
      const res = await MemberService.getMember(member.id);
      setSelectedMember(res.data);
      setIsViewModalOpen(true);
    } catch (err) {
      console.error("Failed to get member: ", err);
      Swal.fire("Error", "Could not fetch member detail file.", "error");
    }
  };

  // Submits
  const handleAddMember = async (e: FormEvent) => {
    e.preventDefault();
    setFormErrors({});

    const formData = new FormData();
    formData.append("firstname", firstname);
    formData.append("lastname", lastname);
    formData.append("gender", gender);
    formData.append("birthdate", birthdate);
    formData.append("address", address);
    formData.append("contact_number", contactNumber);
    if (email) formData.append("email", email);
    formData.append("membership_date", membershipDate);
    formData.append("status", status);
    if (profilePicture) {
      formData.append("profile_picture", profilePicture);
    }

    try {
      setSubmitLoading(true);
      await MemberService.storeMember(formData);
      setIsAddModalOpen(false);
      Swal.fire("Saved", "Member added successfully.", "success");
      fetchMembers(currentPage);
    } catch (err: any) {
      if (err.response && err.response.status === 422) {
        setFormErrors(err.response.data.errors);
      } else {
        Swal.fire("Error", "Failed to add member.", "error");
      }
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleEditMember = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedMember) return;
    setFormErrors({});

    const formData = new FormData();
    formData.append("firstname", firstname);
    formData.append("lastname", lastname);
    formData.append("gender", gender);
    formData.append("birthdate", birthdate);
    formData.append("address", address);
    formData.append("contact_number", contactNumber);
    formData.append("email", email);
    formData.append("membership_date", membershipDate);
    formData.append("status", status);
    if (profilePicture) {
      formData.append("profile_picture", profilePicture);
    }

    try {
      setSubmitLoading(true);
      await MemberService.updateMember(selectedMember.id, formData);
      setIsEditModalOpen(false);
      Swal.fire("Saved", "Member details updated successfully.", "success");
      fetchMembers(currentPage);
    } catch (err: any) {
      if (err.response && err.response.status === 422) {
        setFormErrors(err.response.data.errors);
      } else {
        Swal.fire("Error", "Failed to update member details.", "error");
      }
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleDeleteMember = async (member: Member) => {
    const result = await Swal.fire({
      title: "Delete Member?",
      text: `Are you sure you want to delete member: ${member.firstname} ${member.lastname}? This will permanently remove their records.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#EF4444",
      cancelButtonColor: "#64748B",
      confirmButtonText: "Yes, delete",
      cancelButtonText: "Cancel"
    });

    if (!result.isConfirmed) return;

    try {
      await MemberService.destroyMember(member.id);
      Swal.fire("Deleted", "Member removed from register.", "success");
      fetchMembers(currentPage);
    } catch (err) {
      console.error(err);
      Swal.fire("Error", "Cannot delete member. They may have active records.", "error");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-6 rounded-2xl border border-slate-100 shadow-xs gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Cooperative Member Registry</h1>
          <p className="text-sm text-slate-500 mt-0.5">Manage smallholder coconut farmers and members of CASCOFAMCO.</p>
        </div>
        <button
          onClick={openAddModal}
          className="bg-primary hover:bg-primary-dark text-white font-semibold py-2.5 px-4 rounded-xl shadow-md hover:shadow-lg transition flex items-center gap-2 cursor-pointer text-sm"
        >
          <FiPlus className="w-4 h-4" />
          <span>Add Member</span>
        </button>
      </div>

      {/* Filters and Search Bar */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4">
        <SearchBar value={search} onChange={setSearch} placeholder="Search by name, member code, address..." />
        
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full sm:w-40 px-3.5 py-2 border border-slate-200 rounded-xl bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
          >
            <option value="">All Statuses</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>

          <select
            value={genderFilter}
            onChange={(e) => setGenderFilter(e.target.value)}
            className="w-full sm:w-40 px-3.5 py-2 border border-slate-200 rounded-xl bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
          >
            <option value="">All Genders</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
            <option value="Other">Other</option>
          </select>
        </div>
      </div>

      {/* Members Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            <p className="text-slate-400 text-sm">Searching member database...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100 text-sm">
              <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider text-xs">
                <tr>
                  <th className="px-6 py-4 text-left">Code</th>
                  <th className="px-6 py-4 text-left">Farmer Name</th>
                  <th className="px-6 py-4 text-left">Gender</th>
                  <th className="px-6 py-4 text-left">Age</th>
                  <th className="px-6 py-4 text-left">Contact No</th>
                  <th className="px-6 py-4 text-left">Member Since</th>
                  <th className="px-6 py-4 text-left">Status</th>
                  <th className="px-6 py-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {members.length > 0 ? (
                  members.map((member) => (
                    <tr key={member.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 font-semibold text-primary">{member.member_code}</td>
                      <td className="px-6 py-4 flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-100 overflow-hidden flex items-center justify-center flex-shrink-0 border border-slate-200">
                          {member.profile_picture_url ? (
                            <img src={member.profile_picture_url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-xs text-slate-400 font-bold uppercase">{member.firstname[0]}{member.lastname[0]}</span>
                          )}
                        </div>
                        <span className="font-medium text-slate-800">{member.firstname} {member.lastname}</span>
                      </td>
                      <td className="px-6 py-4">{member.gender}</td>
                      <td className="px-6 py-4">{member.age} yrs</td>
                      <td className="px-6 py-4">{member.contact_number}</td>
                      <td className="px-6 py-4">{member.membership_date}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          member.status === 'Active' ? 'bg-green-50 text-green-700 border border-green-150' : 'bg-slate-100 text-slate-600 border border-slate-200'
                        }`}>
                          {member.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex justify-center items-center gap-2">
                          <button
                            onClick={() => openViewModal(member)}
                            title="View member card"
                            className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800 cursor-pointer"
                          >
                            <FiEye className="w-4.5 h-4.5" />
                          </button>
                          <button
                            onClick={() => openEditModal(member)}
                            title="Edit details"
                            className="p-1.5 rounded-lg text-primary hover:bg-green-50 cursor-pointer"
                          >
                            <FiEdit className="w-4.5 h-4.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteMember(member)}
                            title="Delete member"
                            className="p-1.5 rounded-lg text-red-650 hover:bg-red-50 cursor-pointer"
                          >
                            <FiTrash2 className="w-4.5 h-4.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center text-slate-400 font-medium">
                      No matching smallholder farmers found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
        <Pagination currentPage={currentPage} lastPage={lastPage} onPageChange={handlePageChange} />
      </div>

      {/* ADD MEMBER MODAL */}
      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} showCloseButton={true}>
        <div className="p-2 space-y-4">
          <div>
            <h3 className="text-lg font-bold text-slate-800">Add Cooperative Member</h3>
            <p className="text-xs text-slate-500">Add a new farmer registration profile to CASCOFAMCO.</p>
          </div>

          <form onSubmit={handleAddMember} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">First Name</label>
                <input
                  type="text"
                  required
                  value={firstname}
                  onChange={(e) => setFirstname(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
                {formErrors.firstname && <p className="text-red-500 text-xs mt-1">{formErrors.firstname[0]}</p>}
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Last Name</label>
                <input
                  type="text"
                  required
                  value={lastname}
                  onChange={(e) => setLastname(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
                {formErrors.lastname && <p className="text-red-500 text-xs mt-1">{formErrors.lastname[0]}</p>}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Gender</label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Birth Date</label>
                <input
                  type="date"
                  required
                  value={birthdate}
                  onChange={(e) => setBirthdate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
                {formErrors.birthdate && <p className="text-red-500 text-xs mt-1">{formErrors.birthdate[0]}</p>}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Contact Number</label>
                <input
                  type="text"
                  required
                  value={contactNumber}
                  onChange={(e) => setContactNumber(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="e.g. 09123456789"
                />
                {formErrors.contact_number && <p className="text-red-500 text-xs mt-1">{formErrors.contact_number[0]}</p>}
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="name@email.com"
                />
                {formErrors.email && <p className="text-red-500 text-xs mt-1">{formErrors.email[0]}</p>}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Farm/Home Address</label>
              <input
                type="text"
                required
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Municipality, Capiz"
              />
              {formErrors.address && <p className="text-red-500 text-xs mt-1">{formErrors.address[0]}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Membership Date</label>
                <input
                  type="date"
                  required
                  value={membershipDate}
                  onChange={(e) => setMembershipDate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
                {formErrors.membership_date && <p className="text-red-500 text-xs mt-1">{formErrors.membership_date[0]}</p>}
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Membership Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Farmer Photo</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setProfilePicture(e.target.files ? e.target.files[0] : null)}
                className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-green-50 file:text-primary hover:file:bg-green-100 cursor-pointer"
              />
              {formErrors.profile_picture && <p className="text-red-500 text-xs mt-1">{formErrors.profile_picture[0]}</p>}
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
                {submitLoading ? "Adding..." : "Save Farmer"}
              </button>
            </div>
          </form>
        </div>
      </Modal>

      {/* EDIT MEMBER MODAL */}
      <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} showCloseButton={true}>
        <div className="p-2 space-y-4">
          <div>
            <h3 className="text-lg font-bold text-slate-800">Edit Member Registration</h3>
            <p className="text-xs text-slate-500">Update detailed info for: <span className="font-semibold text-primary">{firstname} {lastname}</span></p>
          </div>

          <form onSubmit={handleEditMember} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">First Name</label>
                <input
                  type="text"
                  required
                  value={firstname}
                  onChange={(e) => setFirstname(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
                {formErrors.firstname && <p className="text-red-500 text-xs mt-1">{formErrors.firstname[0]}</p>}
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Last Name</label>
                <input
                  type="text"
                  required
                  value={lastname}
                  onChange={(e) => setLastname(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
                {formErrors.lastname && <p className="text-red-500 text-xs mt-1">{formErrors.lastname[0]}</p>}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Gender</label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Birth Date</label>
                <input
                  type="date"
                  required
                  value={birthdate}
                  onChange={(e) => setBirthdate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
                {formErrors.birthdate && <p className="text-red-500 text-xs mt-1">{formErrors.birthdate[0]}</p>}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Contact Number</label>
                <input
                  type="text"
                  required
                  value={contactNumber}
                  onChange={(e) => setContactNumber(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
                {formErrors.contact_number && <p className="text-red-500 text-xs mt-1">{formErrors.contact_number[0]}</p>}
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
                {formErrors.email && <p className="text-red-500 text-xs mt-1">{formErrors.email[0]}</p>}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Farm/Home Address</label>
              <input
                type="text"
                required
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
              {formErrors.address && <p className="text-red-500 text-xs mt-1">{formErrors.address[0]}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Membership Date</label>
                <input
                  type="date"
                  required
                  value={membershipDate}
                  onChange={(e) => setMembershipDate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
                {formErrors.membership_date && <p className="text-red-500 text-xs mt-1">{formErrors.membership_date[0]}</p>}
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Membership Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Update Photo (Optional)</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setProfilePicture(e.target.files ? e.target.files[0] : null)}
                className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-green-50 file:text-primary hover:file:bg-green-100 cursor-pointer"
              />
              {formErrors.profile_picture && <p className="text-red-500 text-xs mt-1">{formErrors.profile_picture[0]}</p>}
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
                {submitLoading ? "Updating..." : "Update Details"}
              </button>
            </div>
          </form>
        </div>
      </Modal>

      {/* VIEW MEMBER PROFILE MODAL */}
      <Modal isOpen={isViewModalOpen} onClose={() => setIsViewModalOpen(false)} showCloseButton={true}>
        {selectedMember && (
          <div className="p-2 space-y-6">
            <div className="flex items-center gap-4 border-b border-slate-100 pb-4">
              <div className="w-16 h-16 rounded-full bg-slate-100 border border-slate-250 overflow-hidden flex items-center justify-center flex-shrink-0">
                {selectedMember.profile_picture_url ? (
                  <img src={selectedMember.profile_picture_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <FiUser className="w-8 h-8 text-slate-400" />
                )}
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-800">{selectedMember.firstname} {selectedMember.lastname}</h3>
                <span className="text-xs text-primary font-semibold block mt-0.5">{selectedMember.member_code}</span>
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold mt-1.5 uppercase ${
                  selectedMember.status === 'Active' ? 'bg-green-50 text-green-700 border border-green-150' : 'bg-slate-100 text-slate-650'
                }`}>
                  {selectedMember.status}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div className="flex items-center gap-2.5 text-slate-600 bg-slate-50 p-3 rounded-xl">
                <FiUser className="w-4.5 h-4.5 text-slate-400" />
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase font-bold">Gender & Age</span>
                  <span className="font-medium text-slate-800">{selectedMember.gender} ({selectedMember.age} yrs)</span>
                </div>
              </div>

              <div className="flex items-center gap-2.5 text-slate-600 bg-slate-50 p-3 rounded-xl">
                <FiCalendar className="w-4.5 h-4.5 text-slate-400" />
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase font-bold">Birth Date</span>
                  <span className="font-medium text-slate-800">{selectedMember.birthdate}</span>
                </div>
              </div>

              <div className="flex items-center gap-2.5 text-slate-600 bg-slate-50 p-3 rounded-xl">
                <FiPhone className="w-4.5 h-4.5 text-slate-400" />
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase font-bold">Contact Number</span>
                  <span className="font-medium text-slate-800">{selectedMember.contact_number}</span>
                </div>
              </div>

              <div className="flex items-center gap-2.5 text-slate-600 bg-slate-50 p-3 rounded-xl">
                <FiMail className="w-4.5 h-4.5 text-slate-400" />
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase font-bold">Email Address</span>
                  <span className="font-medium text-slate-800">{selectedMember.email || 'None'}</span>
                </div>
              </div>

              <div className="flex items-center gap-2.5 text-slate-600 bg-slate-50 p-3 rounded-xl sm:col-span-2">
                <FiMapPin className="w-4.5 h-4.5 text-slate-400" />
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase font-bold">Home/Farm Location</span>
                  <span className="font-medium text-slate-800">{selectedMember.address}</span>
                </div>
              </div>

              <div className="flex items-center gap-2.5 text-slate-600 bg-slate-50 p-3 rounded-xl sm:col-span-2">
                <FiCalendar className="w-4.5 h-4.5 text-slate-400" />
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase font-bold">Membership Registration Date</span>
                  <span className="font-medium text-slate-800">{selectedMember.membership_date}</span>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsViewModalOpen(false)}
                className="px-4 py-2 text-sm font-semibold bg-slate-150 hover:bg-slate-200 text-slate-700 rounded-xl cursor-pointer"
              >
                Close Profile
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default MembersPage;
