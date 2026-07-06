import AxiosInstance from "./AxiosInstance";

const UserService = {
  loadusers: async (page: number, search: string = '', role: string = '', status: string = '') => {
    try {
      let url = `/users?page=${page}`;
      if (search) url += `&search=${encodeURIComponent(search)}`;
      if (role) url += `&role=${encodeURIComponent(role)}`;
      if (status) url += `&status=${encodeURIComponent(status)}`;
      
      const response = await AxiosInstance.get(url);
      return response;
    } catch (error) {
      throw error;
    }
  },
  
  storeUser: async (data: FormData) => {
    try {
      const response = await AxiosInstance.post("/users", data);
      return response;
    } catch (error) {
      throw error;
    }
  },
  
  updateUser: async (userId: string | number, data: FormData) => {
    try {
      // Send as POST with _method=PUT to support files upload on PHP side
      data.append('_method', 'PUT');
      const response = await AxiosInstance.post(`/users/${userId}`, data);
      return response;
    } catch (error) {
      throw error;
    }
  },
  
  destroyUser: async (userId: string | number) => {
    try {
      const response = await AxiosInstance.delete(`/users/${userId}`);
      return response;
    } catch (error) {
      throw error;
    }
  },

  resetPassword: async (userId: string | number, data: any) => {
    try {
      const response = await AxiosInstance.post(`/users/${userId}/reset-password`, data);
      return response;
    } catch (error) {
      throw error;
    }
  },

  deactivateUser: async (userId: string | number) => {
    try {
      const response = await AxiosInstance.post(`/users/${userId}/deactivate`);
      return response;
    } catch (error) {
      throw error;
    }
  }
};

export default UserService;
