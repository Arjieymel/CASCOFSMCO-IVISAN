import { useState, useEffect, type FormEvent } from "react";
import MemberService from "../../services/MemberService";
import type { Member } from "../../Interfaces";
import SearchBar from "../../components/SearchBar";
import Pagination from "../../components/Pagination";
import Modal from "../../components/Modal";
import {
  FiPlus, FiEdit, FiTrash2, FiEye, FiUser, FiMail, FiPhone, FiMapPin, FiCalendar, FiGrid, FiList, FiInfo,
} from "react-icons/fi";
import { TbGenderMale, TbGenderFemale, TbIdBadge2, TbUsers } from "react-icons/tb";
import Swal from "sweetalert2";

// Helper to calculate member age
const calculateMemberAge = (birthdate?: string, age?: number) => {
  if (age !== undefined && age !== null && age > 0) return age;
  if (!birthdate) return 20;
  try {
    const birth = new Date(birthdate);
    const now = new Date();
    let calculated = now.getFullYear() - birth.getFullYear();
    const m = now.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) {
      calculated--;
    }
    return calculated > 0 ? calculated : 20;
  } catch {
    return 20;
  }
};

// Illustrated Farmer Avatar matching the guide design
const MemberCardAvatar = ({
  url,
  firstname,
  lastname,
  gender,
  className = "w-16 h-16 sm:w-18 sm:h-18",
}: {
  url?: string | null;
  firstname: string;
  lastname: string;
  gender?: string;
  className?: string;
}) => {
  if (url) {
    return (
      <img
        src={url}
        alt={`${firstname} ${lastname}`}
        className={`${className} rounded-full object-cover border-2 border-emerald-100 shadow-2xs`}
      />
    );
  }

  const isFemale = gender === "Female";

  return (
    <div className={`${className} rounded-full bg-emerald-100 overflow-hidden flex items-end justify-center relative border-2 border-emerald-200/70 shadow-2xs shrink-0`}>
      <svg viewBox="0 0 100 100" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Soft green circle background */}
        <circle cx="50" cy="50" r="50" fill="#DCFCE7" />

        {/* Hair Back */}
        <ellipse cx="50" cy={isFemale ? 42 : 38} rx={isFemale ? 24 : 20} ry={isFemale ? 26 : 22} fill="#1E293B" />

        {/* Ears */}
        <circle cx="30" cy="48" r="5" fill="#FDBA74" />
        <circle cx="70" cy="48" r="5" fill="#FDBA74" />

        {/* Neck */}
        <rect x="44" y="55" width="12" height="15" fill="#FED7AA" />

        {/* Face */}
        <ellipse cx="50" cy="48" rx="16" ry="18" fill="#FFEDD5" />

        {/* Hair Front */}
        {isFemale ? (
          <>
            <path d="M26 36 C26 22, 74 22, 74 36 C70 30, 62 28, 50 32 C38 28, 30 30, 26 36 Z" fill="#1E293B" />
            <path d="M26 36 C24 50, 26 62, 30 68 C32 60, 32 46, 32 40 Z" fill="#1E293B" />
            <path d="M74 36 C76 50, 74 62, 70 68 C68 60, 68 46, 68 40 Z" fill="#1E293B" />
          </>
        ) : (
          <>
            <path d="M30 40 C30 24, 70 24, 70 40 C65 32, 57 30, 50 33 C43 30, 35 32, 30 40 Z" fill="#1E293B" />
            <path d="M32 40 Q38 31 48 35 Q38 38 33 44 Z" fill="#1E293B" />
          </>
        )}

        {/* Green Shirt */}
        <path d="M20 100 C20 74, 34 68, 50 68 C66 68, 80 74, 80 100 Z" fill="#15803D" />

        {/* Collar / V-neck */}
        <path d="M43 68 Q50 78 57 68 Z" fill="#FFEDD5" />
      </svg>
    </div>
  );
};

// Redesigned Member Card Component according to the user guide image
interface MemberCardProps {
  member: {
    id?: number;
    firstname: string;
    lastname: string;
    member_code?: string;
    gender: string;
    age?: number;
    birthdate?: string;
    contact_number: string;
    membership_date: string;
    status: string;
    profile_picture_url?: string | null;
  };
  onView?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  isPreview?: boolean;
  showActions?: boolean;
}

const MemberCard = ({
  member,
  onView,
  onEdit,
  onDelete,
  isPreview = false,
  showActions,
}: MemberCardProps) => {
  const ageDisplay = calculateMemberAge(member.birthdate, member.age);
  const fullName = `${member.firstname || "FIRSTNAME"} ${member.lastname || "LASTNAME"}`.trim();
  const code = member.member_code || "MEM-2026-0001";
  const dateStr = member.membership_date || new Date().toISOString().split("T")[0];
  const isActive = member.status === "Active";
  const canShowActions = showActions ?? !isPreview;

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-md transition-all duration-200 p-4 sm:p-5 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 lg:gap-0">
      {/* 1. Avatar & Active Pill */}
      <div className="flex flex-col items-center justify-center lg:px-6 lg:border-r border-slate-100 shrink-0 gap-2">
        <MemberCardAvatar
          url={member.profile_picture_url}
          firstname={member.firstname}
          lastname={member.lastname}
          gender={member.gender}
        />
        <span
          className={`inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-semibold ${
            isActive
              ? "bg-emerald-50 text-emerald-700 border border-emerald-200/70"
              : "bg-slate-100 text-slate-600 border border-slate-200"
          }`}
        >
          <span
            className={`w-2 h-2 rounded-full ${
              isActive ? "bg-emerald-600" : "bg-slate-400"
            }`}
          ></span>
          <span>{member.status || "Active"}</span>
        </span>
      </div>

      {/* 2. Member Name, Code, and Details */}
      <div className="flex-1 lg:px-6 flex flex-col justify-center">
        <h3 className="text-lg sm:text-xl font-extrabold text-slate-800 tracking-tight uppercase">
          {fullName}
        </h3>

        <div className="flex items-center gap-2 mt-1 font-bold text-sm text-emerald-800">
          <TbIdBadge2 className="w-5 h-5 text-emerald-700 shrink-0" />
          <span>{code}</span>
        </div>

        <div className="flex flex-wrap items-center gap-4 sm:gap-6 mt-3 text-xs sm:text-sm font-semibold text-slate-600">
          <div className="flex items-center gap-1.5">
            {member.gender === "Female" ? (
              <TbGenderFemale className="w-4 h-4 text-slate-500 shrink-0" />
            ) : (
              <TbGenderMale className="w-4 h-4 text-slate-500 shrink-0" />
            )}
            <span>{member.gender || "Male"}</span>
          </div>

          <div className="flex items-center gap-1.5">
            <FiCalendar className="w-4 h-4 text-slate-500 shrink-0" />
            <span>~{ageDisplay} yrs</span>
          </div>

          <div className="flex items-center gap-1.5">
            <FiPhone className="w-4 h-4 text-slate-500 shrink-0" />
            <span>{member.contact_number || "09127054368"}</span>
          </div>
        </div>
      </div>

      {/* 3. Member Since & Status Info */}
      <div className={`lg:px-8 lg:border-l ${canShowActions ? "lg:border-r" : ""} border-slate-100 flex flex-col justify-center gap-3 shrink-0 py-2 lg:py-0 border-t border-b lg:border-t-0 lg:border-b-0`}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
            <FiCalendar className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[11px] font-semibold text-slate-400 block uppercase tracking-wider">
              Member Since
            </span>
            <span className="font-bold text-slate-800 text-sm">
              {dateStr}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
            <TbUsers className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[11px] font-semibold text-slate-400 block uppercase tracking-wider">
              Status
            </span>
            <span
              className={`inline-flex items-center px-3 py-0.5 rounded-full text-xs font-bold ${
                isActive
                  ? "bg-emerald-100 text-emerald-800"
                  : "bg-slate-100 text-slate-600"
              }`}
            >
              {member.status || "Active"}
            </span>
          </div>
        </div>
      </div>

      {/* 4. Action Buttons (View, Edit, Delete) - Only shown in member list, hidden in Add/Edit/View modals */}
      {canShowActions && (
        <div className="lg:pl-6 flex lg:flex-col flex-wrap justify-center items-center gap-2 shrink-0 pt-2 lg:pt-0">
          <button
            type="button"
            onClick={onView}
            className="w-full sm:w-28 py-1.5 px-3 rounded-full border border-emerald-600/70 text-emerald-800 hover:bg-emerald-600 hover:text-white transition flex items-center justify-center gap-1.5 text-xs font-bold cursor-pointer"
          >
            <FiEye className="w-3.5 h-3.5" />
            <span>View</span>
          </button>

          <button
            type="button"
            onClick={onEdit}
            className="w-full sm:w-28 py-1.5 px-3 rounded-full border border-emerald-600/70 text-emerald-800 hover:bg-emerald-600 hover:text-white transition flex items-center justify-center gap-1.5 text-xs font-bold cursor-pointer"
          >
            <FiEdit className="w-3.5 h-3.5" />
            <span>Edit</span>
          </button>

          <button
            type="button"
            onClick={onDelete}
            className="w-full sm:w-28 py-1.5 px-3 rounded-full border border-emerald-600/70 text-emerald-800 hover:bg-red-600 hover:border-red-600 hover:text-white transition flex items-center justify-center gap-1.5 text-xs font-bold cursor-pointer"
          >
            <FiTrash2 className="w-3.5 h-3.5" />
            <span>Delete</span>
          </button>
        </div>
      )}
    </div>
  );
};

const MembersPage = () => {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [viewMode, setViewMode] = useState<"cards" | "table">("cards");

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
  const [profilePicturePreview, setProfilePicturePreview] = useState<string | null>(null);
  
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
    setProfilePicturePreview(null);
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
    setProfilePicturePreview(member.profile_picture_url || null);
    setFormErrors({});
    setIsEditModalOpen(true);
  };

  const handleProfileFileChange = (file: File | null) => {
    setProfilePicture(file);
    if (file) {
      setProfilePicturePreview(URL.createObjectURL(file));
    } else {
      setProfilePicturePreview(null);
    }
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

          {/* View Mode Toggle: Cards (Guide Design) vs Table */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200/80 shrink-0">
            <button
              type="button"
              onClick={() => setViewMode("cards")}
              className={`py-1.5 px-3 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                viewMode === "cards"
                  ? "bg-white text-primary shadow-xs"
                  : "text-slate-500 hover:text-slate-700"
              }`}
              title="Card View (Guide Layout)"
            >
              <FiGrid className="w-3.5 h-3.5" />
              <span>Cards</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("table")}
              className={`py-1.5 px-3 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                viewMode === "table"
                  ? "bg-white text-primary shadow-xs"
                  : "text-slate-500 hover:text-slate-700"
              }`}
              title="Table View"
            >
              <FiList className="w-3.5 h-3.5" />
              <span>Table</span>
            </button>
          </div>
        </div>
      </div>

      {/* Members Directory Content */}
      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-xs flex flex-col items-center justify-center py-20 gap-3">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-400 text-sm">Searching member database...</p>
        </div>
      ) : viewMode === "cards" ? (
        /* Redesigned Cards View (Guided by screenshot) */
        <div className="space-y-3.5">
          {members.length > 0 ? (
            members.map((member) => (
              <MemberCard
                key={member.id}
                member={member}
                onView={() => openViewModal(member)}
                onEdit={() => openEditModal(member)}
                onDelete={() => handleDeleteMember(member)}
              />
            ))
          ) : (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-xs p-12 text-center text-slate-400 font-medium">
              No matching smallholder farmers found.
            </div>
          )}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-xs p-2">
            <Pagination currentPage={currentPage} lastPage={lastPage} onPageChange={handlePageChange} />
          </div>
        </div>
      ) : (
        /* Alternative Table View */
        <div className="bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden">
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
          <Pagination currentPage={currentPage} lastPage={lastPage} onPageChange={handlePageChange} />
        </div>
      )}

      {/* ADD MEMBER MODAL */}
      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} showCloseButton={true} className="sm:max-w-xl md:max-w-2xl lg:max-w-3xl">
        <div className="p-2 space-y-4">
          <div>
            <h3 className="text-lg font-bold text-slate-800">Add Cooperative Member</h3>
            <p className="text-xs text-slate-500">Add a new farmer registration profile to CASCOFAMCO.</p>
          </div>

          {/* Live Card Preview according to guide design */}
          <div className="space-y-1.5 bg-slate-50/80 p-3 rounded-2xl border border-slate-200/70">
            <div className="flex items-center justify-between text-xs text-slate-500 px-1">
              <span className="font-bold uppercase tracking-wider text-[11px] text-slate-600 flex items-center gap-1.5">
                <FiInfo className="w-3.5 h-3.5 text-primary" />
                Live Member Card Preview
              </span>
              <span className="text-[11px] text-slate-400 font-medium">Updates in real time as you fill out form</span>
            </div>
            <MemberCard
              member={{
                firstname: firstname || "RJ-MEL",
                lastname: lastname || "DOGELLO",
                member_code: "MEM-2026-AUTO",
                gender: gender || "Male",
                birthdate: birthdate || "2006-01-01",
                contact_number: contactNumber || "09127054368",
                membership_date: membershipDate || new Date().toISOString().split("T")[0],
                status: status || "Active",
                profile_picture_url: profilePicturePreview,
              }}
              isPreview={true}
            />
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
                onChange={(e) => handleProfileFileChange(e.target.files ? e.target.files[0] : null)}
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
      <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} showCloseButton={true} className="sm:max-w-xl md:max-w-2xl lg:max-w-3xl">
        <div className="p-2 space-y-4">
          <div>
            <h3 className="text-lg font-bold text-slate-800">Edit Member Registration</h3>
            <p className="text-xs text-slate-500">Update detailed info for: <span className="font-semibold text-primary">{firstname} {lastname}</span></p>
          </div>

          {/* Live Card Preview */}
          <div className="space-y-1.5 bg-slate-50/80 p-3 rounded-2xl border border-slate-200/70">
            <div className="flex items-center justify-between text-xs text-slate-500 px-1">
              <span className="font-bold uppercase tracking-wider text-[11px] text-slate-600 flex items-center gap-1.5">
                <FiInfo className="w-3.5 h-3.5 text-primary" />
                Live Member Card Preview
              </span>
              <span className="text-[11px] text-slate-400 font-medium">Updates in real time as you edit</span>
            </div>
            <MemberCard
              member={{
                firstname: firstname || "FIRSTNAME",
                lastname: lastname || "LASTNAME",
                member_code: selectedMember?.member_code || "MEM-2026-0001",
                gender: gender || "Male",
                birthdate: birthdate,
                age: calculateMemberAge(birthdate),
                contact_number: contactNumber,
                membership_date: membershipDate,
                status: status,
                profile_picture_url: profilePicturePreview,
              }}
              isPreview={true}
            />
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
                onChange={(e) => handleProfileFileChange(e.target.files ? e.target.files[0] : null)}
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
      <Modal isOpen={isViewModalOpen} onClose={() => setIsViewModalOpen(false)} showCloseButton={true} className="sm:max-w-xl md:max-w-2xl lg:max-w-3xl">
        {selectedMember && (
          <div className="p-2 space-y-6">
            <div className="border-b border-slate-100 pb-3">
              <MemberCard member={selectedMember} isPreview={true} />
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
