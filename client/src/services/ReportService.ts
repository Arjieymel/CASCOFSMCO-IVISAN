import AxiosInstance from "./AxiosInstance";

const ReportService = {
  generateReport: async (reportType: string, startDate: string = '', endDate: string = '') => {
    try {
      let url = `/reports?report_type=${reportType}`;
      if (startDate) url += `&start_date=${startDate}`;
      if (endDate) url += `&end_date=${endDate}`;
      
      const response = await AxiosInstance.get(url);
      return response;
    } catch (error) {
      throw error;
    }
  }
};

export default ReportService;
