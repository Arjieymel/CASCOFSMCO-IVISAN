import AxiosInstance from "./AxiosInstance";

const MemberService = {
  loadMembers: async (page: number, search: string = '', status: string = '', gender: string = '', perPage: number = 10) => {
    try {
      let url = `/members?page=${page}&per_page=${perPage}`;
      if (search) url += `&search=${encodeURIComponent(search)}`;
      if (status) url += `&status=${encodeURIComponent(status)}`;
      if (gender) url += `&gender=${encodeURIComponent(gender)}`;
      
      const response = await AxiosInstance.get(url);
      return response;
    } catch (error) {
      throw error;
    }
  },

  getMember: async (id: number | string) => {
    try {
      const response = await AxiosInstance.get(`/members/${id}`);
      return response;
    } catch (error) {
      throw error;
    }
  },

  storeMember: async (data: FormData) => {
    try {
      const response = await AxiosInstance.post('/members', data);
      return response;
    } catch (error) {
      throw error;
    }
  },

  updateMember: async (id: number | string, data: FormData) => {
    try {
      data.append('_method', 'PUT');
      const response = await AxiosInstance.post(`/members/${id}`, data);
      return response;
    } catch (error) {
      throw error;
    }
  },

  destroyMember: async (id: number | string) => {
    try {
      const response = await AxiosInstance.delete(`/members/${id}`);
      return response;
    } catch (error) {
      throw error;
    }
  }
};

export default MemberService;
