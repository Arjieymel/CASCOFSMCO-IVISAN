import { useState, useEffect, type FormEvent } from "react";
import UserService from "../../services/UserService";
import type { User } from "../../Interfaces";
import SearchBar from "../../components/SearchBar";
import Pagination from "../../components/Pagination";
import Modal from "../../components/Modal";
import {
  FiPlus, FiEdit, FiTrash2, FiKey, FiToggleLeft, FiToggleRight,
  FiShield, FiClock, FiUser, FiEye, FiEyeOff,
} from "react-icons/fi";
import Swal from "sweetalert2";

const rolesList = ["Administrator", "Staff"];
const statusesList = ["Active", "Deactivated"];

interface UserFormFieldsProps {
  isEdit?: boolean;
  username: string;
  setUsername: (value: string) => void;
  email: string;
  setEmail: (value: string) => void;
  role: string;
  setRole: (value: string) => void;
  status: string;
  setStatus: (value: string) => void;
  password?: string;
  setPassword?: (value: string) => void;
  passwordConfirmation?: string;
  setPasswordConfirmation?: (value: string) => void;
  setProfilePicture: (file: File | null) => void;
  formErrors: any;
}

const UserFormFields = ({
  isEdit = false,
  username,
  setUsername,
  email,
  setEmail,
  role,
  setRole,
  status,
  setStatus,
  password = "",
  setPassword,
  passwordConfirmation = "",
  setPasswordConfirmation,
  setProfilePicture,
  formErrors,
}: UserFormFieldsProps) => {
  const [showPassword, setShowPassword] = useState(false);
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">
            Username <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            required
            minLength={4}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="e.g. jdelacruz"
            className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
          {formErrors.username && <p className="text-red-500 text-xs mt-1">{formErrors.username[0]}</p>}
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">
            Email Address <span className="text-red-500">*</span>
          </label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="e.g. staff@cascofamco.ph"
            className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
          {formErrors.email && <p className="text-red-500 text-xs mt-1">{formErrors.email[0]}</p>}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">System Role</label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {rolesList.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Account Status</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {statusesList.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>
      {!isEdit && (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">
              Password <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword?.(e.target.value)}
                className="w-full px-3 py-2 pr-10 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                {showPassword ? <FiEyeOff className="w-4 h-4" /> : <FiEye className="w-4 h-4" />}
              </button>
            </div>
            {formErrors.password && <p className="text-red-500 text-xs mt-1">{formErrors.password[0]}</p>}
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Confirm Password</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                required
                minLength={6}
                value={passwordConfirmation}
                onChange={(e) => setPasswordConfirmation?.(e.target.value)}
                className="w-full px-3 py-2 pr-10 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                {showPassword ? <FiEyeOff className="w-4 h-4" /> : <FiEye className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>
      )}
      <div>
        <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">
          Profile Photo {isEdit && <span className="normal-case text-slate-400 font-normal">(leave blank to keep current)</span>}
        </label>
        <input
          type="file"
          accept="image/*"
          onChange={(e) => setProfilePicture(e.target.files ? e.target.files[0] : null)}
          className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-green-50 file:text-primary hover:file:bg-green-100 cursor-pointer"
        />
      </div>
    </div>
  );
};

const UsersPage = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("Staff");
  const [status, setStatus] = useState("Active");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [profilePicture, setProfilePicture] = useState<File | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [newPasswordConfirmation, setNewPasswordConfirmation] = useState("");
  const [showResetPassword, setShowResetPassword] = useState(false);

  const [formErrors, setFormErrors] = useState<any>({});
  const [submitLoading, setSubmitLoading] = useState(false);

  const fetchUsers = async (page: number = 1) => {
    try {
      setLoading(true);
      const res = await UserService.loadusers(page, search, roleFilter, statusFilter);
      setUsers(res.data.data);
      setCurrentPage(res.data.current_page);
      setLastPage(res.data.last_page);
    } catch (err) {
      console.error("Failed to load users:", err);
      Swal.fire("Error", "Could not load user list.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(1); }, [search, roleFilter, statusFilter]);
  const handlePageChange = (page: number) => fetchUsers(page);

  const openAddModal = () => {
    setUsername(""); setEmail(""); setRole("Staff"); setStatus("Active");
    setPassword(""); setPasswordConfirmation(""); setProfilePicture(null); setFormErrors({});
    setIsAddModalOpen(true);
  };

  const openEditModal = (u: User) => {
    setSelectedUser(u);
    setUsername(u.username); setEmail(u.email || ""); setRole(u.role); setStatus(u.status);
    setProfilePicture(null); setFormErrors({});
    setIsEditModalOpen(true);
  };

  const openResetModal = (u: User) => {
    setSelectedUser(u);
    setNewPassword(""); setNewPasswordConfirmation(""); setFormErrors({});
    setShowResetPassword(false);
    setIsResetModalOpen(true);
  };

  const handleAddUser = async (e: FormEvent) => {
    e.preventDefault();
    setFormErrors({});
    const formData = new FormData();
    formData.append("username", username);
    formData.append("email", email);
    formData.append("role", role);
    formData.append("status", status);
    formData.append("password", password);
    formData.append("password_confirmation", passwordConfirmation);
    if (profilePicture) formData.append("profile_picture", profilePicture);
    try {
      setSubmitLoading(true);
      await UserService.storeUser(formData);
      setIsAddModalOpen(false);
      Swal.fire("Saved!", "User account created successfully.", "success");
      fetchUsers(currentPage);
    } catch (err: any) {
      if (err.response?.status === 422) setFormErrors(err.response.data.errors);
      else Swal.fire("Error", err.response?.data?.message || "Failed to create user.", "error");
    } finally { setSubmitLoading(false); }
  };

  const handleEditUser = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    setFormErrors({});
    const formData = new FormData();
    formData.append("username", username);
    formData.append("email", email);
    formData.append("role", role);
    formData.append("status", status);
    if (profilePicture) formData.append("profile_picture", profilePicture);
    try {
      setSubmitLoading(true);
      await UserService.updateUser(selectedUser.id, formData);
      setIsEditModalOpen(false);
      Swal.fire("Saved!", "User account updated.", "success");
      fetchUsers(currentPage);
    } catch (err: any) {
      if (err.response?.status === 422) setFormErrors(err.response.data.errors);
      else Swal.fire("Error", err.response?.data?.message || "Failed to update user.", "error");
    } finally { setSubmitLoading(false); }
  };

  const handleResetPassword = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    setFormErrors({});
    try {
      setSubmitLoading(true);
      await UserService.resetPassword(selectedUser.id, {
        password: newPassword,
        password_confirmation: newPasswordConfirmation,
      });
      setIsResetModalOpen(false);
      Swal.fire("Done!", "Password reset successfully.", "success");
    } catch (err: any) {
      if (err.response?.status === 422) setFormErrors(err.response.data.errors);
      else Swal.fire("Error", err.response?.data?.message || "Failed to reset password.", "error");
    } finally { setSubmitLoading(false); }
  };

  const handleToggleStatus = async (u: User) => {
    const action = u.status === "Active" ? "deactivate" : "reactivate";
    const result = await Swal.fire({
      title: `${action.charAt(0).toUpperCase() + action.slice(1)} User?`,
      text: `Are you sure you want to ${action} the account: ${u.username}?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: u.status === "Active" ? "#EF4444" : "#1F6B3D",
      cancelButtonColor: "#64748B",
      confirmButtonText: `Yes, ${action}`,
    });
    if (!result.isConfirmed) return;
    try {
      const res = await UserService.deactivateUser(u.id);
      Swal.fire("Updated!", res.data.message, "success");
      fetchUsers(currentPage);
    } catch (err: any) {
      Swal.fire("Error", err.response?.data?.message || "Failed to update status.", "error");
    }
  };

  const handleDeleteUser = async (u: User) => {
    const result = await Swal.fire({
      title: "Delete User?",
      text: `Permanently delete account: ${u.username}? This cannot be undone.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#EF4444",
      cancelButtonColor: "#64748B",
      confirmButtonText: "Yes, delete",
    });
    if (!result.isConfirmed) return;
    try {
      await UserService.destroyUser(u.id);
      Swal.fire("Deleted!", "User account permanently deleted.", "success");
      fetchUsers(currentPage);
    } catch (err: any) {
      Swal.fire("Error", err.response?.data?.message || "Failed to delete user.", "error");
    }
  };

  const getRoleBadge = (r: string) => {
    const map: Record<string, string> = {
      Administrator: "bg-purple-50 text-purple-700 border-purple-200",
      Staff: "bg-blue-50 text-blue-700 border-blue-200",
    };
    return map[r] || "bg-slate-100 text-slate-600 border-slate-200";
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-6 rounded-2xl border border-slate-100 shadow-xs gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-800">System User Management</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Manage administrator and staff accounts with role-based access control.
          </p>
        </div>
        <button
          onClick={openAddModal}
          className="bg-primary hover:bg-primary-dark text-white font-semibold py-2.5 px-4 rounded-xl shadow-md hover:shadow-lg transition-all flex items-center gap-2 cursor-pointer text-sm"
        >
          <FiPlus className="w-4 h-4" />
          <span>Create User</span>
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4">
        <SearchBar value={search} onChange={setSearch} placeholder="Search by username or email..." />
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="w-full sm:w-40 px-3.5 py-2 border border-slate-200 rounded-xl bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary text-sm"
          >
            <option value="">All Roles</option>
            {rolesList.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full sm:w-40 px-3.5 py-2 border border-slate-200 rounded-xl bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary text-sm"
          >
            <option value="">All Statuses</option>
            {statusesList.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-slate-400 text-sm">Loading users...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100 text-sm">
              <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider text-xs">
                <tr>
                  <th className="px-6 py-4 text-left">User Account</th>
                  <th className="px-6 py-4 text-left">Role</th>
                  <th className="px-6 py-4 text-left">Email</th>
                  <th className="px-6 py-4 text-left">Status</th>
                  <th className="px-6 py-4 text-left">Last Login</th>
                  <th className="px-6 py-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {users.length > 0 ? (
                  users.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-primary/10 border border-primary/20 overflow-hidden flex items-center justify-center shrink-0">
                            {u.profile_picture_url ? (
                              <img src={u.profile_picture_url} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-xs font-bold text-primary uppercase">
                                {u.username.substring(0, 2)}
                              </span>
                            )}
                          </div>
                          <span className="font-semibold text-slate-800">{u.username}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getRoleBadge(u.role)}`}>
                          <FiShield className="w-3 h-3" />
                          {u.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-500 text-sm">{u.email || "—"}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${u.status === "Active"
                            ? "bg-green-50 text-green-700 border-green-200"
                            : "bg-red-50 text-red-700 border-red-200"
                          }`}>
                          {u.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5 text-xs text-slate-500">
                          <FiClock className="w-3.5 h-3.5 text-slate-400" />
                          {u.last_login ? new Date(u.last_login).toLocaleDateString() : "Never"}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex justify-center items-center gap-1.5">
                          <button
                            onClick={() => openEditModal(u)}
                            title="Edit user"
                            className="p-1.5 rounded-lg text-primary hover:bg-green-50 cursor-pointer transition-colors"
                          >
                            <FiEdit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => openResetModal(u)}
                            title="Reset password"
                            className="p-1.5 rounded-lg text-amber-600 hover:bg-amber-50 cursor-pointer transition-colors"
                          >
                            <FiKey className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleToggleStatus(u)}
                            title={u.status === "Active" ? "Deactivate" : "Reactivate"}
                            className={`p-1.5 rounded-lg cursor-pointer transition-colors ${u.status === "Active"
                                ? "text-red-500 hover:bg-red-50"
                                : "text-green-600 hover:bg-green-50"
                              }`}
                          >
                            {u.status === "Active" ? (
                              <FiToggleRight className="w-4 h-4" />
                            ) : (
                              <FiToggleLeft className="w-4 h-4" />
                            )}
                          </button>
                          <button
                            onClick={() => handleDeleteUser(u)}
                            title="Delete user"
                            className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 cursor-pointer transition-colors"
                          >
                            <FiTrash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="px-6 py-16 text-center">
                      <div className="flex flex-col items-center gap-2 text-slate-400">
                        <FiUser className="w-10 h-10 opacity-30" />
                        <p className="font-medium">No user accounts found.</p>
                        <p className="text-xs">Try adjusting your search or filters.</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
        <Pagination currentPage={currentPage} lastPage={lastPage} onPageChange={handlePageChange} />
      </div>

      {/* Add User Modal */}
      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} showCloseButton>
        <div className="p-2 space-y-5">
          <div>
            <h3 className="text-lg font-bold text-slate-800">Create User Account</h3>
            <p className="text-xs text-slate-500 mt-0.5">Add a new system user with role-based access control.</p>
          </div>
          <form onSubmit={handleAddUser}>
            <UserFormFields
              username={username}
              setUsername={setUsername}
              email={email}
              setEmail={setEmail}
              role={role}
              setRole={setRole}
              status={status}
              setStatus={setStatus}
              password={password}
              setPassword={setPassword}
              passwordConfirmation={passwordConfirmation}
              setPasswordConfirmation={setPasswordConfirmation}
              setProfilePicture={setProfilePicture}
              formErrors={formErrors}
            />
            <div className="flex gap-3 justify-end pt-4 mt-4 border-t border-slate-100">
              <button type="button" onClick={() => setIsAddModalOpen(false)} className="px-4 py-2 text-sm font-semibold border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-500 cursor-pointer">Cancel</button>
              <button type="submit" disabled={submitLoading} className="px-5 py-2 text-sm font-semibold bg-primary hover:bg-primary-dark text-white rounded-xl shadow-md cursor-pointer disabled:opacity-50 transition-colors">
                {submitLoading ? "Creating..." : "Create Account"}
              </button>
            </div>
          </form>
        </div>
      </Modal>

      {/* Edit User Modal */}
      <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} showCloseButton>
        <div className="p-2 space-y-5">
          <div>
            <h3 className="text-lg font-bold text-slate-800">Edit User Account</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Updating: <span className="font-semibold text-primary">{selectedUser?.username}</span>
            </p>
          </div>
          <form onSubmit={handleEditUser}>
            <UserFormFields
              isEdit
              username={username}
              setUsername={setUsername}
              email={email}
              setEmail={setEmail}
              role={role}
              setRole={setRole}
              status={status}
              setStatus={setStatus}
              setProfilePicture={setProfilePicture}
              formErrors={formErrors}
            />
            <div className="flex gap-3 justify-end pt-4 mt-4 border-t border-slate-100">
              <button type="button" onClick={() => setIsEditModalOpen(false)} className="px-4 py-2 text-sm font-semibold border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-500 cursor-pointer">Cancel</button>
              <button type="submit" disabled={submitLoading} className="px-5 py-2 text-sm font-semibold bg-primary hover:bg-primary-dark text-white rounded-xl shadow-md cursor-pointer disabled:opacity-50 transition-colors">
                {submitLoading ? "Updating..." : "Save Changes"}
              </button>
            </div>
          </form>
        </div>
      </Modal>

      {/* Reset Password Modal */}
      <Modal isOpen={isResetModalOpen} onClose={() => setIsResetModalOpen(false)} showCloseButton>
        <div className="p-2 space-y-5">
          <div>
            <h3 className="text-lg font-bold text-slate-800">Reset Password</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Setting new password for: <span className="font-semibold text-primary">{selectedUser?.username}</span>
            </p>
          </div>
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">New Password</label>
              <div className="relative">
                <input
                  type={showResetPassword ? "text" : "password"}
                  required
                  minLength={6}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3 py-2 pr-10 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <button
                  type="button"
                  onClick={() => setShowResetPassword(!showResetPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  {showResetPassword ? <FiEyeOff className="w-4 h-4" /> : <FiEye className="w-4 h-4" />}
                </button>
              </div>
              {formErrors.password && <p className="text-red-500 text-xs mt-1">{formErrors.password[0]}</p>}
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Confirm New Password</label>
              <div className="relative">
                <input
                  type={showResetPassword ? "text" : "password"}
                  required
                  minLength={6}
                  value={newPasswordConfirmation}
                  onChange={(e) => setNewPasswordConfirmation(e.target.value)}
                  className="w-full px-3 py-2 pr-10 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <button
                  type="button"
                  onClick={() => setShowResetPassword(!showResetPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  {showResetPassword ? <FiEyeOff className="w-4 h-4" /> : <FiEye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div className="flex gap-3 justify-end pt-4 border-t border-slate-100">
              <button type="button" onClick={() => setIsResetModalOpen(false)} className="px-4 py-2 text-sm font-semibold border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-500 cursor-pointer">Cancel</button>
              <button type="submit" disabled={submitLoading} className="px-5 py-2 text-sm font-semibold bg-primary hover:bg-primary-dark text-white rounded-xl shadow-md cursor-pointer disabled:opacity-50 transition-colors">
                {submitLoading ? "Resetting..." : "Reset Password"}
              </button>
            </div>
          </form>
        </div>
      </Modal>
    </div>
  );
};

export default UsersPage;
