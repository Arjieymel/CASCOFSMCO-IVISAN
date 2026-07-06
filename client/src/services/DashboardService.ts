import AxiosInstance from "./AxiosInstance";

const DashboardService = {
  getDashboardData: async () => {
    try {
      const response = await AxiosInstance.get('/dashboard');
      return response;
    } catch (error) {
      throw error;
    }
  }
};

export default DashboardService;
