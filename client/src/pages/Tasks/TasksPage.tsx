import { useState, useEffect, type FormEvent } from "react";
import TaskService from "../../services/TaskService";
import UserService from "../../services/UserService";
import type { Task, User } from "../../Interfaces";
import SearchBar from "../../components/SearchBar";
import Pagination from "../../components/Pagination";
import Modal from "../../components/Modal";
import {
  FiPlus, FiEdit, FiTrash2, FiCalendar, FiFlag,
} from "react-icons/fi";
import Swal from "sweetalert2";

const TasksPage = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [priority, setPriority] = useState("Medium");
  const [status, setStatus] = useState("Pending");
  const [progress, setProgress] = useState(0);
  const [dueDate, setDueDate] = useState("");

  const [formErrors, setFormErrors] = useState<any>({});
  const [submitLoading, setSubmitLoading] = useState(false);

  const priorityList = ["Low", "Medium", "High"];
  const statusList = ["Pending", "In Progress", "Completed", "Overdue"];

  const fetchTasks = async (page: number = 1) => {
    try {
      setLoading(true);
      const res = await TaskService.loadTasks(page, search, statusFilter, priorityFilter);
      setTasks(res.data.data);
      setCurrentPage(res.data.current_page);
      setLastPage(res.data.last_page);
    } catch (err) {
      console.error("Failed to load tasks:", err);
      Swal.fire("Error", "Could not fetch task list.", "error");
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await UserService.loadusers(1, "", "", "Active");
      setUsers(res.data.data || []);
    } catch (err) {
      console.error("Failed to load users:", err);
    }
  };

  useEffect(() => {
    fetchTasks(1);
  }, [search, statusFilter, priorityFilter]);

  useEffect(() => {
    fetchUsers();
  }, []);

  const handlePageChange = (page: number) => fetchTasks(page);

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setAssignedTo("");
    setPriority("Medium");
    setStatus("Pending");
    setProgress(0);
    setDueDate(new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0]);
    setFormErrors({});
  };

  const openAddModal = () => {
    resetForm();
    setIsAddModalOpen(true);
  };

  const openEditModal = (task: Task) => {
    setSelectedTask(task);
    setTitle(task.title);
    setDescription(task.description || "");
    setAssignedTo(task.assigned_to?.toString() || "");
    setPriority(task.priority);
    setStatus(task.status);
    setProgress(task.progress);
    setDueDate(typeof task.due_date === "string" ? task.due_date.split("T")[0] : "");
    setFormErrors({});
    setIsEditModalOpen(true);
  };

  const handleAddTask = async (e: FormEvent) => {
    e.preventDefault();
    setFormErrors({});
    const payload = {
      title,
      description,
      assigned_to: assignedTo ? parseInt(assignedTo) : null,
      priority,
      status,
      progress,
      due_date: dueDate,
    };
    try {
      setSubmitLoading(true);
      await TaskService.storeTask(payload);
      setIsAddModalOpen(false);
      Swal.fire("Saved!", "Task created successfully.", "success");
      fetchTasks(currentPage);
    } catch (err: any) {
      if (err.response?.status === 422) setFormErrors(err.response.data.errors);
      else Swal.fire("Error", "Failed to create task.", "error");
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleEditTask = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedTask) return;
    setFormErrors({});
    const payload = {
      title,
      description,
      assigned_to: assignedTo ? parseInt(assignedTo) : null,
      priority,
      status,
      progress,
      due_date: dueDate,
    };
    try {
      setSubmitLoading(true);
      await TaskService.updateTask(selectedTask.id, payload);
      setIsEditModalOpen(false);
      Swal.fire("Saved!", "Task updated successfully.", "success");
      fetchTasks(currentPage);
    } catch (err: any) {
      if (err.response?.status === 422) setFormErrors(err.response.data.errors);
      else Swal.fire("Error", "Failed to update task.", "error");
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleDeleteTask = async (task: Task) => {
    const result = await Swal.fire({
      title: "Delete Task?",
      text: `Delete task: "${task.title}"?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#EF4444",
      cancelButtonColor: "#64748B",
      confirmButtonText: "Yes, delete",
    });
    if (!result.isConfirmed) return;
    try {
      await TaskService.destroyTask(task.id);
      Swal.fire("Deleted!", "Task deleted.", "success");
      fetchTasks(currentPage);
    } catch {
      Swal.fire("Error", "Failed to delete task.", "error");
    }
  };

  const getStatusBadge = (s: string) => {
    const map: Record<string, string> = {
      Completed: "bg-green-50 text-green-700 border-green-200",
      "In Progress": "bg-blue-50 text-blue-700 border-blue-200",
      Pending: "bg-amber-50 text-amber-700 border-amber-200",
      Overdue: "bg-red-50 text-red-700 border-red-200",
    };
    return map[s] || "bg-slate-100 text-slate-600 border-slate-200";
  };

  const getPriorityStyle = (p: string) => {
    const map: Record<string, string> = {
      High: "text-red-600 font-bold",
      Medium: "text-amber-600 font-semibold",
      Low: "text-green-600 font-medium",
    };
    return map[p] || "text-slate-500";
  };

  const getProgressBarColor = (p: number) => {
    if (p >= 100) return "bg-green-500";
    if (p >= 50) return "bg-blue-500";
    return "bg-amber-400";
  };

  const TaskFormFields = () => (
    <div className="space-y-4">
      <div>
        <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">
          Task Title <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Verify copra delivery receipts"
          className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        />
        {formErrors.title && <p className="text-red-500 text-xs mt-1">{formErrors.title[0]}</p>}
      </div>

      <div>
        <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Description</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          placeholder="Detailed description of the task..."
          className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Assigned To</label>
          <select
            value={assignedTo}
            onChange={(e) => setAssignedTo(e.target.value)}
            className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="">— Unassigned —</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.username} ({u.role})
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Priority</label>
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
            className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {priorityList.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Status</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {statusList.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">
            Due Date <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            required
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
          {formErrors.due_date && <p className="text-red-500 text-xs mt-1">{formErrors.due_date[0]}</p>}
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">
          Progress — {progress}%
        </label>
        <input
          type="range"
          min={0}
          max={100}
          step={5}
          value={progress}
          onChange={(e) => setProgress(parseInt(e.target.value))}
          className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-primary"
        />
        <div className="flex justify-between text-xs text-slate-400 mt-1">
          <span>0%</span>
          <span className="font-semibold text-primary">{progress}%</span>
          <span>100%</span>
        </div>
        <div className="w-full bg-slate-100 rounded-full h-2 mt-1.5">
          <div
            className={`h-2 rounded-full transition-all duration-300 ${getProgressBarColor(progress)}`}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-6 rounded-2xl border border-slate-100 shadow-xs gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Cooperative Task Monitoring</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Track, assign, and monitor operational tasks across CASCOFAMCO teams.
          </p>
        </div>
        <button
          onClick={openAddModal}
          className="bg-primary hover:bg-primary-dark text-white font-semibold py-2.5 px-4 rounded-xl shadow-md hover:shadow-lg transition-all flex items-center gap-2 cursor-pointer text-sm"
        >
          <FiPlus className="w-4 h-4" />
          <span>Create Task</span>
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4">
        <SearchBar value={search} onChange={setSearch} placeholder="Search by title, description, or assignee..." />
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="w-full sm:w-36 px-3.5 py-2 border border-slate-200 rounded-xl bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary text-sm"
          >
            <option value="">All Priorities</option>
            {priorityList.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full sm:w-36 px-3.5 py-2 border border-slate-200 rounded-xl bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary text-sm"
          >
            <option value="">All Statuses</option>
            {statusList.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-slate-400 text-sm">Loading tasks...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100 text-sm">
              <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider text-xs">
                <tr>
                  <th className="px-6 py-4 text-left">Task</th>
                  <th className="px-6 py-4 text-left">Assigned To</th>
                  <th className="px-6 py-4 text-left">Priority</th>
                  <th className="px-6 py-4 text-left">Due Date</th>
                  <th className="px-6 py-4 text-left">Progress</th>
                  <th className="px-6 py-4 text-left">Status</th>
                  <th className="px-6 py-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {tasks.length > 0 ? (
                  tasks.map((task) => (
                    <tr key={task.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 max-w-xs">
                        <div className="font-semibold text-slate-800 truncate">{task.title}</div>
                        {task.description && (
                          <div className="text-xs text-slate-400 mt-0.5 truncate">{task.description}</div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {task.assignee ? (
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-primary/10 text-primary font-bold text-xs flex items-center justify-center uppercase flex-shrink-0">
                              {task.assignee.username.substring(0, 2)}
                            </div>
                            <div>
                              <div className="text-xs font-semibold text-slate-700">{task.assignee.username}</div>
                              <div className="text-[10px] text-slate-400">{task.assignee.role}</div>
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic text-xs">Unassigned</span>
                        )}
                      </td>
                      <td className={`px-6 py-4 text-xs uppercase tracking-wide ${getPriorityStyle(task.priority)}`}>
                        <FiFlag className="inline w-3.5 h-3.5 mr-1" />
                        {task.priority}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5 text-xs text-slate-600">
                          <FiCalendar className="text-slate-400 w-3.5 h-3.5" />
                          {typeof task.due_date === "string" ? task.due_date.split("T")[0] : task.due_date}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-24 bg-slate-100 rounded-full h-1.5">
                            <div
                              className={`h-1.5 rounded-full transition-all ${getProgressBarColor(task.progress)}`}
                              style={{ width: `${task.progress}%` }}
                            />
                          </div>
                          <span className="text-xs font-semibold text-slate-600">{task.progress}%</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getStatusBadge(task.status)}`}>
                          {task.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex justify-center items-center gap-2">
                          <button
                            onClick={() => openEditModal(task)}
                            title="Edit task"
                            className="p-1.5 rounded-lg text-primary hover:bg-green-50 cursor-pointer transition-colors"
                          >
                            <FiEdit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteTask(task)}
                            title="Delete task"
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
                    <td colSpan={7} className="px-6 py-16 text-center">
                      <div className="flex flex-col items-center gap-2 text-slate-400">
                        <FiFlag className="w-10 h-10 opacity-30" />
                        <p className="font-medium">No tasks found.</p>
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

      {/* Add Modal */}
      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} showCloseButton={true}>
        <div className="p-2 space-y-5">
          <div>
            <h3 className="text-lg font-bold text-slate-800">Create New Task</h3>
            <p className="text-xs text-slate-500 mt-0.5">Assign a new operational task to a cooperative team member.</p>
          </div>
          <form onSubmit={handleAddTask}>
            <TaskFormFields />
            <div className="flex gap-3 justify-end pt-4 mt-4 border-t border-slate-100">
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
                className="px-5 py-2 text-sm font-semibold bg-primary hover:bg-primary-dark text-white rounded-xl shadow-md cursor-pointer disabled:opacity-50 transition-colors"
              >
                {submitLoading ? "Creating..." : "Create Task"}
              </button>
            </div>
          </form>
        </div>
      </Modal>

      {/* Edit Modal */}
      <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} showCloseButton={true}>
        <div className="p-2 space-y-5">
          <div>
            <h3 className="text-lg font-bold text-slate-800">Edit Task</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Editing: <span className="font-semibold text-primary">{selectedTask?.title}</span>
            </p>
          </div>
          <form onSubmit={handleEditTask}>
            <TaskFormFields />
            <div className="flex gap-3 justify-end pt-4 mt-4 border-t border-slate-100">
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
                className="px-5 py-2 text-sm font-semibold bg-primary hover:bg-primary-dark text-white rounded-xl shadow-md cursor-pointer disabled:opacity-50 transition-colors"
              >
                {submitLoading ? "Updating..." : "Update Task"}
              </button>
            </div>
          </form>
        </div>
      </Modal>
    </div>
  );
};

export default TasksPage;
