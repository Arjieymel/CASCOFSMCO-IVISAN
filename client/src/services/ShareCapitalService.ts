import AxiosInstance from "./AxiosInstance";

const ShareCapitalService = {
  loadShareCapital: async (
    page: number = 1,
    search: string = '',
    status: string = '',
    feeStatus: string = '',
    perPage: number = 10,
    sortBy: string = 'paid_up_capital',
    order: string = 'desc'
  ) => {
    let url = `/share-capital?page=${page}&per_page=${perPage}&sort_by=${sortBy}&order=${order}`;
    if (search) url += `&search=${encodeURIComponent(search)}`;
    if (status) url += `&status=${encodeURIComponent(status)}`;
    if (feeStatus) url += `&membership_fee_status=${encodeURIComponent(feeStatus)}`;
    return AxiosInstance.get(url);
  },

  loadTransactions: async (
    page: number = 1,
    search: string = '',
    memberId: string | number = '',
    transactionType: string = '',
    startDate: string = '',
    endDate: string = '',
    perPage: number = 10,
    sortBy: string = 'transaction_date',
    order: string = 'desc'
  ) => {
    let url = `/share-capital/transactions?page=${page}&per_page=${perPage}&sort_by=${sortBy}&order=${order}`;
    if (search) url += `&search=${encodeURIComponent(search)}`;
    if (memberId) url += `&member_id=${encodeURIComponent(memberId)}`;
    if (transactionType) url += `&transaction_type=${encodeURIComponent(transactionType)}`;
    if (startDate) url += `&start_date=${encodeURIComponent(startDate)}`;
    if (endDate) url += `&end_date=${encodeURIComponent(endDate)}`;
    return AxiosInstance.get(url);
  },

  getMemberLedger: async (memberId: number | string) => {
    return AxiosInstance.get(`/share-capital/member/${memberId}`);
  },

  subscribe: async (data: {
    member_id: number;
    subscribed_shares: number;
    share_par_value: number;
    remarks?: string;
  }) => {
    return AxiosInstance.post('/share-capital/subscribe', data);
  },

  contribute: async (data: {
    member_id: number;
    amount: number;
    transaction_date: string;
    payment_method: string;
    reference_no?: string;
    remarks?: string;
    sync_cash_receipt?: boolean;
  }) => {
    return AxiosInstance.post('/share-capital/contribute', data);
  },

  recordMembershipFee: async (data: {
    member_id: number;
    amount: number;
    payment_date: string;
    payment_method: string;
    or_number?: string;
    remarks?: string;
    sync_cash_receipt?: boolean;
  }) => {
    return AxiosInstance.post('/share-capital/membership-fee', data);
  },
};

export default ShareCapitalService;
