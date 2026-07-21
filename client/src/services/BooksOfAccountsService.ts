import AxiosInstance from "./AxiosInstance";

const BooksOfAccountsService = {
  // 1. Cash Register Book
  loadCashRegister: async (
    page: number = 1,
    search: string = '',
    startDate: string = '',
    endDate: string = '',
    perPage: number = 10,
    sortBy: string = 'date',
    order: string = 'desc'
  ) => {
    let url = `/books-of-accounts/cash-register?page=${page}&per_page=${perPage}&sort_by=${sortBy}&order=${order}`;
    if (search) url += `&search=${encodeURIComponent(search)}`;
    if (startDate) url += `&start_date=${encodeURIComponent(startDate)}`;
    if (endDate) url += `&end_date=${encodeURIComponent(endDate)}`;
    return AxiosInstance.get(url);
  },
  getCashRegister: async (id: number | string) => AxiosInstance.get(`/books-of-accounts/cash-register/${id}`),
  storeCashRegister: async (data: any) => AxiosInstance.post('/books-of-accounts/cash-register', data),
  updateCashRegister: async (id: number | string, data: any) => AxiosInstance.put(`/books-of-accounts/cash-register/${id}`, data),
  destroyCashRegister: async (id: number | string) => AxiosInstance.delete(`/books-of-accounts/cash-register/${id}`),

  // 2. Cash Disbursement Journal
  loadCashDisbursements: async (
    page: number = 1,
    search: string = '',
    expenseAccount: string = '',
    startDate: string = '',
    endDate: string = '',
    perPage: number = 10,
    sortBy: string = 'disbursement_date',
    order: string = 'desc'
  ) => {
    let url = `/books-of-accounts/cash-disbursements?page=${page}&per_page=${perPage}&sort_by=${sortBy}&order=${order}`;
    if (search) url += `&search=${encodeURIComponent(search)}`;
    if (expenseAccount) url += `&expense_account=${encodeURIComponent(expenseAccount)}`;
    if (startDate) url += `&start_date=${encodeURIComponent(startDate)}`;
    if (endDate) url += `&end_date=${encodeURIComponent(endDate)}`;
    return AxiosInstance.get(url);
  },
  getCashDisbursement: async (id: number | string) => AxiosInstance.get(`/books-of-accounts/cash-disbursements/${id}`),
  storeCashDisbursement: async (data: any) => AxiosInstance.post('/books-of-accounts/cash-disbursements', data),
  updateCashDisbursement: async (id: number | string, data: any) => AxiosInstance.put(`/books-of-accounts/cash-disbursements/${id}`, data),
  destroyCashDisbursement: async (id: number | string) => AxiosInstance.delete(`/books-of-accounts/cash-disbursements/${id}`),

  // 3. Cash Register Sales Book
  loadSalesBook: async (
    page: number = 1,
    search: string = '',
    startDate: string = '',
    endDate: string = '',
    perPage: number = 10,
    sortBy: string = 'sale_date',
    order: string = 'desc'
  ) => {
    let url = `/books-of-accounts/sales-book?page=${page}&per_page=${perPage}&sort_by=${sortBy}&order=${order}`;
    if (search) url += `&search=${encodeURIComponent(search)}`;
    if (startDate) url += `&start_date=${encodeURIComponent(startDate)}`;
    if (endDate) url += `&end_date=${encodeURIComponent(endDate)}`;
    return AxiosInstance.get(url);
  },
  getSalesBook: async (id: number | string) => AxiosInstance.get(`/books-of-accounts/sales-book/${id}`),
  storeSalesBook: async (data: any) => AxiosInstance.post('/books-of-accounts/sales-book', data),
  updateSalesBook: async (id: number | string, data: any) => AxiosInstance.put(`/books-of-accounts/sales-book/${id}`, data),
  destroySalesBook: async (id: number | string) => AxiosInstance.delete(`/books-of-accounts/sales-book/${id}`),

  // 4. Cash Receipts Journal
  loadCashReceipts: async (
    page: number = 1,
    search: string = '',
    startDate: string = '',
    endDate: string = '',
    perPage: number = 10,
    sortBy: string = 'receipt_date',
    order: string = 'desc'
  ) => {
    let url = `/books-of-accounts/cash-receipts?page=${page}&per_page=${perPage}&sort_by=${sortBy}&order=${order}`;
    if (search) url += `&search=${encodeURIComponent(search)}`;
    if (startDate) url += `&start_date=${encodeURIComponent(startDate)}`;
    if (endDate) url += `&end_date=${encodeURIComponent(endDate)}`;
    return AxiosInstance.get(url);
  },
  getCashReceipt: async (id: number | string) => AxiosInstance.get(`/books-of-accounts/cash-receipts/${id}`),
  storeCashReceipt: async (data: any) => AxiosInstance.post('/books-of-accounts/cash-receipts', data),
  updateCashReceipt: async (id: number | string, data: any) => AxiosInstance.put(`/books-of-accounts/cash-receipts/${id}`, data),
  destroyCashReceipt: async (id: number | string) => AxiosInstance.delete(`/books-of-accounts/cash-receipts/${id}`),

  // 5. Journal Voucher Register
  loadJournalVouchers: async (
    page: number = 1,
    search: string = '',
    status: string = '',
    startDate: string = '',
    endDate: string = '',
    perPage: number = 10,
    sortBy: string = 'voucher_date',
    order: string = 'desc'
  ) => {
    let url = `/books-of-accounts/journal-vouchers?page=${page}&per_page=${perPage}&sort_by=${sortBy}&order=${order}`;
    if (search) url += `&search=${encodeURIComponent(search)}`;
    if (status) url += `&status=${encodeURIComponent(status)}`;
    if (startDate) url += `&start_date=${encodeURIComponent(startDate)}`;
    if (endDate) url += `&end_date=${encodeURIComponent(endDate)}`;
    return AxiosInstance.get(url);
  },
  getJournalVoucher: async (id: number | string) => AxiosInstance.get(`/books-of-accounts/journal-vouchers/${id}`),
  storeJournalVoucher: async (data: any) => AxiosInstance.post('/books-of-accounts/journal-vouchers', data),
  updateJournalVoucher: async (id: number | string, data: any) => AxiosInstance.put(`/books-of-accounts/journal-vouchers/${id}`, data),
  destroyJournalVoucher: async (id: number | string) => AxiosInstance.delete(`/books-of-accounts/journal-vouchers/${id}`),

  // 6. General Ledger
  loadGeneralLedger: async (
    page: number = 1,
    search: string = '',
    accountCode: string = '',
    startDate: string = '',
    endDate: string = '',
    perPage: number = 10,
    sortBy: string = 'transaction_date',
    order: string = 'desc'
  ) => {
    let url = `/books-of-accounts/general-ledger?page=${page}&per_page=${perPage}&sort_by=${sortBy}&order=${order}`;
    if (search) url += `&search=${encodeURIComponent(search)}`;
    if (accountCode) url += `&account_code=${encodeURIComponent(accountCode)}`;
    if (startDate) url += `&start_date=${encodeURIComponent(startDate)}`;
    if (endDate) url += `&end_date=${encodeURIComponent(endDate)}`;
    return AxiosInstance.get(url);
  },
  syncGeneralLedger: async () => AxiosInstance.post('/books-of-accounts/general-ledger/sync'),
  getGeneralLedger: async (id: number | string) => AxiosInstance.get(`/books-of-accounts/general-ledger/${id}`),
  storeGeneralLedger: async (data: any) => AxiosInstance.post('/books-of-accounts/general-ledger', data),
  updateGeneralLedger: async (id: number | string, data: any) => AxiosInstance.put(`/books-of-accounts/general-ledger/${id}`, data),
  destroyGeneralLedger: async (id: number | string) => AxiosInstance.delete(`/books-of-accounts/general-ledger/${id}`),
};

export default BooksOfAccountsService;
