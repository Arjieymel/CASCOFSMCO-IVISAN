import AxiosInstance from "./AxiosInstance";

const SaleService = {
  loadSales: async (
    page: number,
    search: string = '',
    status: string = '',
    paymentMethod: string = '',
    startDate: string = '',
    endDate: string = '',
    perPage: number = 10
  ) => {
    try {
      let url = `/sales?page=${page}&per_page=${perPage}`;
      if (search) url += `&search=${encodeURIComponent(search)}`;
      if (status) url += `&status=${encodeURIComponent(status)}`;
      if (paymentMethod) url += `&payment_method=${encodeURIComponent(paymentMethod)}`;
      if (startDate) url += `&start_date=${encodeURIComponent(startDate)}`;
      if (endDate) url += `&end_date=${encodeURIComponent(endDate)}`;
      
      const response = await AxiosInstance.get(url);
      return response;
    } catch (error) {
      throw error;
    }
  },

  getSale: async (id: number | string) => {
    try {
      const response = await AxiosInstance.get(`/sales/${id}`);
      return response;
    } catch (error) {
      throw error;
    }
  },

  storeSale: async (data: any) => {
    try {
      const response = await AxiosInstance.post('/sales', data);
      return response;
    } catch (error) {
      throw error;
    }
  },

  updateSale: async (id: number | string, data: any) => {
    try {
      const response = await AxiosInstance.put(`/sales/${id}`, data);
      return response;
    } catch (error) {
      throw error;
    }
  },

  destroySale: async (id: number | string) => {
    try {
      const response = await AxiosInstance.delete(`/sales/${id}`);
      return response;
    } catch (error) {
      throw error;
    }
  }
};

export default SaleService;
