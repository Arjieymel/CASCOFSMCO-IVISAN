export interface User {
  id: number;
  username: string;
  role: 'Administrator' | 'Staff';
  status: 'Active' | 'Deactivated';
  email: string;
  profile_picture?: string;
  profile_picture_url?: string | null;
  last_login?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface Member {
  id: number;
  member_code: string;
  firstname: string;
  lastname: string;
  gender: 'Male' | 'Female' | 'Other';
  birthdate: string;
  age?: number;
  address: string;
  contact_number: string;
  email?: string | null;
  membership_date: string;
  status: 'Active' | 'Inactive';
  profile_picture?: string;
  profile_picture_url?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface Production {
  id: number;
  member_id: number;
  product_type: string;
  quantity: number | string;
  unit: string;
  source: string;
  remarks?: string | null;
  production_date: string;
  status: 'Pending' | 'Approved' | 'Completed' | 'Cancelled';
  member?: Member;
  created_at?: string;
  updated_at?: string;
}

export interface Sale {
  id: number;
  invoice_no: string;
  buyer: string;
  product: string;
  quantity: number | string;
  unit: string;
  unit_price: number | string;
  total_amount: number | string;
  payment_method: 'Cash' | 'GCash' | 'Bank Transfer' | 'Check';
  remarks?: string | null;
  status: 'Paid' | 'Pending' | 'Cancelled';
  sale_date: string;
  created_at?: string;
  updated_at?: string;
}

export interface Task {
  id: number;
  title: string;
  description?: string | null;
  assigned_to?: number | null;
  priority: 'Low' | 'Medium' | 'High';
  status: 'Pending' | 'In Progress' | 'Completed' | 'Overdue';
  progress: number;
  due_date: string;
  assignee?: User | null;
  created_at?: string;
  updated_at?: string;
}

export interface ReportRecord {
  id: number;
  report_type: string;
  generated_by: number;
  generated_at: string;
  file_path?: string | null;
  generator?: User;
}

export interface SystemSettings {
  cooperative_name: string;
  cooperative_logo: string | null;
  address: string;
  contact_number: string;
  email: string;
  theme_mode: 'light' | 'dark';
}

export interface ActivityLog {
  id: number;
  username: string;
  action: string;
  time_ago: string;
  created_at: string;
}

// 📚 Books of Accounts Interfaces
export interface CashRegisterRecord {
  id: number;
  date: string;
  reference_no: string;
  description: string;
  cash_in: number | string;
  cash_out: number | string;
  running_balance: number | string;
  recorded_by: string;
  user_id?: number | null;
  remarks?: string | null;
  user?: User;
  created_at?: string;
  updated_at?: string;
}

export interface CashDisbursementRecord {
  id: number;
  voucher_number: string;
  disbursement_date: string;
  payee: string;
  description: string;
  expense_account: string;
  amount: number | string;
  payment_method: string;
  approved_by: string;
  user_id?: number | null;
  remarks?: string | null;
  user?: User;
  created_at?: string;
  updated_at?: string;
}

export interface CashSalesBookRecord {
  id: number;
  invoice_number: string;
  sale_date: string;
  customer: string;
  product: string;
  quantity: number | string;
  unit_price: number | string;
  total_amount: number | string;
  payment_method: string;
  recorded_by: string;
  user_id?: number | null;
  user?: User;
  created_at?: string;
  updated_at?: string;
}

export interface CashReceiptRecord {
  id: number;
  or_number: string;
  receipt_date: string;
  received_from: string;
  description: string;
  source_of_income: string;
  amount_received: number | string;
  recorded_by: string;
  user_id?: number | null;
  remarks?: string | null;
  user?: User;
  created_at?: string;
  updated_at?: string;
}

export interface JournalVoucherRecord {
  id: number;
  voucher_number: string;
  voucher_date: string;
  description: string;
  debit_account: string;
  credit_account: string;
  amount: number | string;
  prepared_by: string;
  approved_by: string;
  status: 'Draft' | 'Posted' | 'Approved' | 'Cancelled';
  user_id?: number | null;
  user?: User;
  created_at?: string;
  updated_at?: string;
}

export interface GeneralLedgerRecord {
  id: number;
  account_code: string;
  account_title: string;
  transaction_date: string;
  reference_number: string;
  debit: number | string;
  credit: number | string;
  running_balance: number | string;
  source_module?: string | null;
  description?: string | null;
  created_at?: string;
  updated_at?: string;
}
