import { useState, useEffect, type FormEvent } from "react";
import SettingService from "../../services/SettingService";
import { useAuth } from "../../contexts/AuthContext";
import { useTheme } from "../../contexts/ThemeContext";
import {
  FiSave, FiUpload, FiDatabase, FiLock, FiSettings, FiDownload, FiAlertTriangle, FiInfo, FiEye, FiEyeOff, FiCheck,
} from "react-icons/fi";
import Swal from "sweetalert2";

const SettingsPage = () => {
  const { user } = useAuth();
  const { themeKey, setTheme, availableThemes, currentTheme } = useTheme();
  const isAdmin = user?.role === "Administrator";

  // Cooperative Info
  const [cooperativeName, setCooperativeName] = useState("");
  const [address, setAddress] = useState("");
  const [contactNumber, setContactNumber] = useState("");
  const [email, setEmail] = useState("");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [currentLogoUrl, setCurrentLogoUrl] = useState<string | null>(null);
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [settingsSaving, setSettingsSaving] = useState(false);

  // Change Password
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newPasswordConfirmation, setNewPasswordConfirmation] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordErrors, setPasswordErrors] = useState<any>({});
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);

  // Database
  const [backupLoading, setBackupLoading] = useState(false);
  const [restoreLoading, setRestoreLoading] = useState(false);
  const [restoreFile, setRestoreFile] = useState<File | null>(null);

  const fetchSettings = async () => {
    try {
      setSettingsLoading(true);
      const res = await SettingService.getSettings();
      const s = res.data;
      setCooperativeName(s.cooperative_name || "");
      setAddress(s.address || "");
      setContactNumber(s.contact_number || "");
      setEmail(s.email || "");
      if (s.theme_mode) {
        setTheme(s.theme_mode);
      }
      setCurrentLogoUrl(s.cooperative_logo || null);
    } catch (err) {
      console.error("Failed to load settings:", err);
    } finally {
      setSettingsLoading(false);
    }
  };

  useEffect(() => { fetchSettings(); }, []);

  const handleSaveSettings = async (e: FormEvent) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append("cooperative_name", cooperativeName);
    formData.append("address", address);
    formData.append("contact_number", contactNumber);
    formData.append("email", email);
    formData.append("theme_mode", themeKey);
    if (logoFile) formData.append("cooperative_logo", logoFile);
    try {
      setSettingsSaving(true);
      const res = await SettingService.updateSettings(formData);
      if (res.data.cooperative_logo) setCurrentLogoUrl(res.data.cooperative_logo);
      setLogoFile(null);
      Swal.fire("Saved!", "Cooperative settings updated successfully.", "success");
    } catch (err: any) {
      Swal.fire("Error", err.response?.data?.message || "Failed to save settings.", "error");
    } finally { setSettingsSaving(false); }
  };

  const handleChangePassword = async (e: FormEvent) => {
    e.preventDefault();
    setPasswordErrors({});
    if (newPassword !== newPasswordConfirmation) {
      setPasswordErrors({ new_password: ["The passwords do not match."] });
      return;
    }
    try {
      setPasswordLoading(true);
      await SettingService.changePassword({
        current_password: currentPassword,
        new_password: newPassword,
        new_password_confirmation: newPasswordConfirmation,
      });
      setCurrentPassword(""); setNewPassword(""); setNewPasswordConfirmation("");
      Swal.fire("Done!", "Your password has been changed successfully.", "success");
    } catch (err: any) {
      if (err.response?.status === 422) setPasswordErrors(err.response.data.errors);
      else Swal.fire("Error", err.response?.data?.message || "Failed to change password.", "error");
    } finally { setPasswordLoading(false); }
  };

  const handleBackup = async () => {
    if (!isAdmin) { Swal.fire("Unauthorized", "Only Administrators can generate database backups.", "warning"); return; }
    const result = await Swal.fire({
      title: "Generate Backup?",
      text: "This will create a complete SQL backup of all CASCOFAMCO data.",
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: currentTheme.primary,
      cancelButtonColor: "#64748B",
      confirmButtonText: "Yes, generate backup",
    });
    if (!result.isConfirmed) return;
    try {
      setBackupLoading(true);
      const res = await SettingService.backupDatabase();
      Swal.fire({
        title: "Backup Complete!",
        html: `Database backup generated successfully.<br/><br/><a href="${res.data.download_url}" target="_blank" class="font-bold text-primary underline">Click here to download backup file</a>`,
        icon: "success",
        confirmButtonColor: currentTheme.primary,
      });
    } catch (err: any) {
      Swal.fire("Error", err.response?.data?.message || "Backup generation failed.", "error");
    } finally { setBackupLoading(false); }
  };

  const handleRestore = async (e: FormEvent) => {
    e.preventDefault();
    if (!isAdmin) { Swal.fire("Unauthorized", "Only Administrators can restore the database.", "warning"); return; }
    if (!restoreFile) { Swal.fire("Error", "Please select a valid SQL backup file first.", "error"); return; }
    const result = await Swal.fire({
      title: "⚠️ Restore Database?",
      html: `<strong class="text-red-600">This will permanently overwrite all current data!</strong><br/>This action cannot be undone. Are you absolutely sure?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#EF4444",
      cancelButtonColor: "#64748B",
      confirmButtonText: "Yes, restore database",
    });
    if (!result.isConfirmed) return;
    try {
      setRestoreLoading(true);
      const formData = new FormData();
      formData.append("backup_file", restoreFile);
      await SettingService.restoreDatabase(formData);
      Swal.fire("Restored!", "Database restored successfully. The page will now reload.", "success").then(() =>
        window.location.reload()
      );
    } catch (err: any) {
      Swal.fire("Error", err.response?.data?.message || "Database restore failed.", "error");
    } finally { setRestoreLoading(false); }
  };

  const SectionCard = ({
    title, icon, children, badge,
  }: {
    title: string;
    icon: React.ReactNode;
    children: React.ReactNode;
    badge?: React.ReactNode;
  }) => (
    <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs">
      <div className="flex items-center justify-between mb-5 pb-4 border-b border-slate-100">
        <h2 className="text-base font-bold text-slate-800 flex items-center gap-2.5">
          <span className="p-2 rounded-lg bg-green-50 text-primary">{icon}</span>
          {title}
        </h2>
        {badge}
      </div>
      {children}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs">
        <h1 className="text-xl font-bold text-slate-800">System Settings</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Configure cooperative information, account preferences, and system maintenance options.
        </p>
      </div>

      {/* Cooperative Information */}
      <SectionCard title="Cooperative Information" icon={<FiSettings className="w-5 h-5" />}>
        {settingsLoading ? (
          <div className="flex items-center justify-center py-10">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <form onSubmit={handleSaveSettings} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">
                  Cooperative Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={cooperativeName}
                  onChange={(e) => setCooperativeName(e.target.value)}
                  placeholder="e.g. CASCOFAMCO"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Contact Number</label>
                <input
                  type="text"
                  value={contactNumber}
                  onChange={(e) => setContactNumber(e.target.value)}
                  placeholder="e.g. 09XX-XXX-XXXX"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Official Address</label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="e.g. Poblacion, Ivisan, Capiz"
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. info@cascofamco.ph"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div className="md:col-span-2 mt-2">
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-2">
                  Interface Theme
                </label>
                <p className="text-xs text-slate-500 mb-3">
                  Select a theme color scheme below. Clicking any theme instantly updates the application interface in real time.
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                  {availableThemes.map((t) => {
                    const isSelected = themeKey === t.key;
                    return (
                      <button
                        key={t.key}
                        type="button"
                        onClick={() => setTheme(t.key)}
                        className={`relative text-left p-3 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                          isSelected
                            ? "border-primary bg-primary/5 ring-2 ring-primary/20 shadow-sm"
                            : "border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1 mb-2">
                          <span className="text-xs font-semibold text-slate-800 truncate flex items-center gap-1">
                            <span>{t.emoji}</span>
                            <span className="truncate">{t.name}</span>
                          </span>
                          {isSelected && (
                            <span className="w-4 h-4 rounded-full bg-primary text-white flex items-center justify-center shrink-0">
                              <FiCheck className="w-2.5 h-2.5" />
                            </span>
                          )}
                        </div>

                        {/* Color swatches */}
                        <div className="flex items-center gap-1 mt-1">
                          <span className="w-3.5 h-3.5 rounded-full border border-black/10 shadow-xs" style={{ backgroundColor: t.primary }} title="Primary" />
                          <span className="w-3.5 h-3.5 rounded-full border border-black/10 shadow-xs" style={{ backgroundColor: t.secondary }} title="Secondary" />
                          <span className="w-3.5 h-3.5 rounded-full border border-black/10 shadow-xs" style={{ backgroundColor: t.accent }} title="Accent" />
                          <span className="w-3.5 h-3.5 rounded-full border border-black/10 shadow-xs" style={{ backgroundColor: t.sidebarBg }} title="Sidebar" />
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Cooperative Logo</label>
              {currentLogoUrl && (
                <div className="mb-2">
                  <img
                    src={currentLogoUrl}
                    alt="Current Cooperative Logo"
                    className="h-16 rounded-lg object-contain border border-slate-100 p-1 bg-slate-50"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Current logo — upload a new file to replace it.</p>
                </div>
              )}
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setLogoFile(e.target.files ? e.target.files[0] : null)}
                className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-green-50 file:text-primary hover:file:bg-green-100 cursor-pointer"
              />
            </div>
            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={settingsSaving}
                className="flex items-center gap-2 px-5 py-2 bg-primary hover:bg-primary-dark text-white font-semibold rounded-xl shadow-md cursor-pointer disabled:opacity-50 transition-colors text-sm"
              >
                <FiSave className="w-4 h-4" />
                {settingsSaving ? "Saving..." : "Save Settings"}
              </button>
            </div>
          </form>
        )}
      </SectionCard>

      {/* Change Password */}
      <SectionCard title="Change Password" icon={<FiLock className="w-5 h-5" />}>
        <form onSubmit={handleChangePassword} className="space-y-4 max-w-md">
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Current Password</label>
            <div className="relative">
              <input
                type={showCurrentPassword ? "text" : "password"}
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full px-3 py-2 pr-10 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <button
                type="button"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                {showCurrentPassword ? <FiEyeOff className="w-4 h-4" /> : <FiEye className="w-4 h-4" />}
              </button>
            </div>
            {passwordErrors.current_password && (
              <p className="text-red-500 text-xs mt-1">{passwordErrors.current_password[0]}</p>
            )}
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">
              New Password <span className="text-slate-400 font-normal normal-case">(min. 6 characters)</span>
            </label>
            <div className="relative">
              <input
                type={showNewPassword ? "text" : "password"}
                required
                minLength={6}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-3 py-2 pr-10 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                {showNewPassword ? <FiEyeOff className="w-4 h-4" /> : <FiEye className="w-4 h-4" />}
              </button>
            </div>
            {passwordErrors.new_password && (
              <p className="text-red-500 text-xs mt-1">{passwordErrors.new_password[0]}</p>
            )}
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Confirm New Password</label>
            <div className="relative">
              <input
                type={showConfirmNewPassword ? "text" : "password"}
                required
                minLength={6}
                value={newPasswordConfirmation}
                onChange={(e) => setNewPasswordConfirmation(e.target.value)}
                className="w-full px-3 py-2 pr-10 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <button
                type="button"
                onClick={() => setShowConfirmNewPassword(!showConfirmNewPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                {showConfirmNewPassword ? <FiEyeOff className="w-4 h-4" /> : <FiEye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <button
            type="submit"
            disabled={passwordLoading}
            className="flex items-center gap-2 px-5 py-2 bg-primary hover:bg-primary-dark text-white font-semibold rounded-xl shadow-md cursor-pointer disabled:opacity-50 transition-colors text-sm"
          >
            <FiLock className="w-4 h-4" />
            {passwordLoading ? "Changing..." : "Change Password"}
          </button>
        </form>
      </SectionCard>

      {/* Database Maintenance — Admin Only */}
      {isAdmin ? (
        <SectionCard
          title="Database Maintenance"
          icon={<FiDatabase className="w-5 h-5" />}
          badge={
            <span className="text-xs font-semibold text-purple-700 bg-purple-50 border border-purple-200 px-2.5 py-0.5 rounded-full">
              Admin Only
            </span>
          }
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Backup */}
            <div className="p-5 bg-slate-50 border border-slate-100 rounded-xl">
              <div className="flex items-center gap-2 mb-2">
                <FiDatabase className="w-4 h-4 text-primary" />
                <h3 className="font-bold text-slate-700 text-sm">Backup Database</h3>
              </div>
              <p className="text-xs text-slate-500 mb-4">
                Generate a complete SQL backup of all CASCOFAMCO data for safekeeping and recovery purposes.
              </p>
              <button
                onClick={handleBackup}
                disabled={backupLoading}
                className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary-dark text-white font-semibold rounded-xl shadow-md cursor-pointer disabled:opacity-50 transition-colors text-sm"
              >
                <FiDownload className="w-4 h-4" />
                {backupLoading ? "Generating..." : "Generate Backup"}
              </button>
            </div>

            {/* Restore */}
            <div className="p-5 bg-red-50 border border-red-100 rounded-xl">
              <div className="flex items-center gap-2 mb-2">
                <FiAlertTriangle className="w-4 h-4 text-red-600" />
                <h3 className="font-bold text-red-700 text-sm">Restore Database</h3>
              </div>
              <p className="text-xs text-red-600/80 mb-4">
                <strong>Warning:</strong> Restoring will permanently overwrite ALL current data. Use extreme caution.
              </p>
              <form onSubmit={handleRestore} className="space-y-3">
                <input
                  type="file"
                  accept=".sql,text/plain"
                  onChange={(e) => setRestoreFile(e.target.files ? e.target.files[0] : null)}
                  className="w-full text-xs text-slate-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-red-100 file:text-red-700 hover:file:bg-red-200 cursor-pointer"
                />
                <button
                  type="submit"
                  disabled={restoreLoading || !restoreFile}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl shadow-md cursor-pointer disabled:opacity-50 transition-colors text-sm"
                >
                  <FiUpload className="w-4 h-4" />
                  {restoreLoading ? "Restoring..." : "Restore Database"}
                </button>
              </form>
            </div>
          </div>
        </SectionCard>
      ) : (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 flex items-center gap-3">
          <FiInfo className="w-5 h-5 text-amber-600 flex-shrink-0" />
          <p className="text-sm text-amber-700">
            <strong>Database Maintenance</strong> is restricted to Administrator accounts only.
          </p>
        </div>
      )}
    </div>
  );
};

export default SettingsPage;
