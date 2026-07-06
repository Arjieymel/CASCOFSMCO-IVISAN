import AxiosInstance from "./AxiosInstance";

const SettingService = {
  getSettings: async () => {
    try {
      const response = await AxiosInstance.get('/settings');
      return response;
    } catch (error) {
      throw error;
    }
  },

  updateSettings: async (data: FormData) => {
    try {
      const response = await AxiosInstance.post('/settings', data);
      return response;
    } catch (error) {
      throw error;
    }
  },

  changePassword: async (data: any) => {
    try {
      const response = await AxiosInstance.post('/settings/change-password', data);
      return response;
    } catch (error) {
      throw error;
    }
  },

  backupDatabase: async () => {
    try {
      const response = await AxiosInstance.post('/settings/backup');
      return response;
    } catch (error) {
      throw error;
    }
  },

  restoreDatabase: async (formData: FormData) => {
    try {
      const response = await AxiosInstance.post('/settings/restore', formData);
      return response;
    } catch (error) {
      throw error;
    }
  }
};

export default SettingService;
