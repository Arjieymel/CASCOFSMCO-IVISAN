import AxiosInstance from "./AxiosInstance";

const ProductionService = {
  loadProductions: async (
    page: number, 
    search: string = '', 
    status: string = '', 
    productType: string = '', 
    startDate: string = '', 
    endDate: string = '',
    perPage: number = 10
  ) => {
    try {
      let url = `/productions?page=${page}&per_page=${perPage}`;
      if (search) url += `&search=${encodeURIComponent(search)}`;
      if (status) url += `&status=${encodeURIComponent(status)}`;
      if (productType) url += `&product_type=${encodeURIComponent(productType)}`;
      if (startDate) url += `&start_date=${encodeURIComponent(startDate)}`;
      if (endDate) url += `&end_date=${encodeURIComponent(endDate)}`;
      
      const response = await AxiosInstance.get(url);
      return response;
    } catch (error) {
      throw error;
    }
  },

  getProduction: async (id: number | string) => {
    try {
      const response = await AxiosInstance.get(`/productions/${id}`);
      return response;
    } catch (error) {
      throw error;
    }
  },

  storeProduction: async (data: any) => {
    try {
      const response = await AxiosInstance.post('/productions', data);
      return response;
    } catch (error) {
      throw error;
    }
  },

  updateProduction: async (id: number | string, data: any) => {
    try {
      const response = await AxiosInstance.put(`/productions/${id}`, data);
      return response;
    } catch (error) {
      throw error;
    }
  },

  destroyProduction: async (id: number | string) => {
    try {
      const response = await AxiosInstance.delete(`/productions/${id}`);
      return response;
    } catch (error) {
      throw error;
    }
  }
};

export default ProductionService;
