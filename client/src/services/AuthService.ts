import AxiosInstance from "./AxiosInstance";

const AuthService = {
  login: async (data: any) => {
    try {
      const response = await AxiosInstance.post('/login', data);
      return response;
    } catch (error) {
      throw error;
    }
  },
  logout: async () => {
    try {
      const response = await AxiosInstance.post('/logout');
      return response;
    } catch (error) {
      throw error;
    }
  },
  me: async () => {
    try {
      const response = await AxiosInstance.get('/user');
      return response;
    } catch (error) {
      throw error;
    }
  },
};

export default AuthService;