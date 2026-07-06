import AxiosInstance from "./AxiosInstance";

const TaskService = {
  loadTasks: async (
    page: number,
    search: string = '',
    status: string = '',
    priority: string = '',
    assignedTo: string | number = '',
    perPage: number = 10
  ) => {
    try {
      let url = `/tasks?page=${page}&per_page=${perPage}`;
      if (search) url += `&search=${encodeURIComponent(search)}`;
      if (status) url += `&status=${encodeURIComponent(status)}`;
      if (priority) url += `&priority=${encodeURIComponent(priority)}`;
      if (assignedTo) url += `&assigned_to=${encodeURIComponent(assignedTo)}`;
      
      const response = await AxiosInstance.get(url);
      return response;
    } catch (error) {
      throw error;
    }
  },

  getTask: async (id: number | string) => {
    try {
      const response = await AxiosInstance.get(`/tasks/${id}`);
      return response;
    } catch (error) {
      throw error;
    }
  },

  storeTask: async (data: any) => {
    try {
      const response = await AxiosInstance.post('/tasks', data);
      return response;
    } catch (error) {
      throw error;
    }
  },

  updateTask: async (id: number | string, data: any) => {
    try {
      const response = await AxiosInstance.put(`/tasks/${id}`, data);
      return response;
    } catch (error) {
      throw error;
    }
  },

  destroyTask: async (id: number | string) => {
    try {
      const response = await AxiosInstance.delete(`/tasks/${id}`);
      return response;
    } catch (error) {
      throw error;
    }
  }
};

export default TaskService;
