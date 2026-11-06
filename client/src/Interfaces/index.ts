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
  subscribed_shares?: number;
  share_par_value?: number | string;
  subscribed_capital?: number | string;
  paid_up_capital?: number | string;
  cbu_balance?: number | string;
  total_equity?: number | string;
  unpaid_subscribed_capital?: number | string;
  membership_fee_status?: 'Paid' | 'Unpaid' | 'Waived';
  membership_fee_amount?: number | string;
  membership_fee_or?: string | null;
  membership_fee_date?: string | null;
  full_name?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Production {
  id: number;
  member_id: number;
  product_type: string;
  quantity: number | string;
  unit: string;
  unit_price?: number | string | null;
  gross_amount?: number | string | null;
  cbu_rate_per_kg?: number | string | null;
  cbu_deduction?: number | string | null;
  net_amount?: number | string | null;
  cbu_deducted?: boolean;
  cbu_deducted_at?: string | null;
  cbu_transaction_id?: number | null;
  source: string;
  remarks?: string | null;
  status: 'Pending' | 'Approved' | 'Completed' | 'Rejected' | string;
  production_date: string;
  payment_status?: 'Unpaid' | 'Partially Paid' | 'Paid';
  paid_amount?: number | string;
  remaining_balance?: number | string;
  payments?: ProductionPayment[];
  member?: Member;
  created_at?: string;
  updated_at?: string;
}

export interface ProductionPayment {
  id: number;
  production_id: number;
  cash_disbursement_id?: number | null;
  member_id: number;
  voucher_number: string;
  payment_date: string;
  amount: number | string;
  payment_method: string;
  approved_by?: string | null;
  remarks?: string | null;
  user_id?: number | null;
  recorded_by?: string;
  created_at?: string;
  updated_at?: string;
  cash_disbursement?: any;
}

export interface SalePayment {
  id: number;
  sale_id: number;
  cash_receipt_id?: number | null;
  or_number: string;
  payment_date: string;
  amount: number | string;
  payment_method: string;
  remarks?: string | null;
  user_id?: number | null;
  recorded_by?: string;
  created_at?: string;
  updated_at?: string;
  cash_receipt?: any;
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
  paid_amount?: number | string;
  remaining_balance?: number | string;
  cash_receipt_id?: number | null;
  payment_method: 'Cash' | 'GCash' | 'Bank Transfer' | 'Check';
  remarks?: string | null;
  status: 'Paid' | 'Pending' | 'Credit' | 'Partially Paid' | 'Cancelled';
  sale_date: string;
  payments?: SalePayment[];
  cash_receipt?: any;
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
  theme_mode: string;
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
  payment_method?: string;
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

// 🌾 Member Share Capital & CBU Interfaces
export interface ShareCapitalTransaction {
  id: number;
  member_id: number;
  transaction_type: 'Subscription' | 'Share Capital Contribution' | 'CBU Contribution' | 'Withdrawal' | string;
  transaction_date: string;
  reference_no: string;
  amount: number | string;
  balance_after: number | string;
  source: string;
  payment_method: string;
  cash_receipt_id?: number | null;
  remarks?: string | null;
  recorded_by: string;
  user_id?: number | null;
  member?: {
    id: number;
    member_code: string;
    firstname: string;
    lastname: string;
    full_name?: string;
  };
  created_at?: string;
  updated_at?: string;
}

export interface ShareCapitalTotals {
  total_subscribed_capital: number;
  total_paid_up_capital: number;
  total_cbu_contributions: number;
  total_equity: number;
  total_membership_fees: number;
  total_members_count: number;
  paid_membership_fee_count: number;
  unpaid_membership_fee_count: number;
}

export interface ShareCapitalPolicy {
  share_par_value: string | number;
  default_membership_fee: string | number;
  min_subscribed_shares: string | number;
  min_initial_paid_up: string | number;
  cbu_rate_per_kg?: string | number;
}

// ============================================================
// 🏦 Loan Management Interfaces
// Derived from MemberLoan model, LoanRepayment model,
// and LoanController.php JSON responses.
// ============================================================

export type LoanStatus =
  | 'Pending'
  | 'Approved'
  | 'Released'
  | 'Active'
  | 'Fully Paid'
  | 'Rejected'
  | 'Cancelled';

export type PaymentMethod = 'Cash' | 'GCash' | 'Bank Transfer' | 'Check';

/** Minimal member shape embedded in loan responses */
export interface LoanMember {
  id: number;
  member_code: string;
  firstname: string;
  lastname: string;
  full_name?: string;
  paid_up_capital?: number | string;
  cbu_balance?: number | string;
}

/** Full loan repayment record — maps loan_repayments table */
export interface LoanRepayment {
  id: number;
  loan_id: number;
  member_id: number;
  or_number: string;
  cash_receipt_id?: number | null;
  payment_date: string;
  amount_paid: number | string;
  principal_paid: number | string;
  interest_paid: number | string;
  balance_after_payment: number | string;
  payment_method: PaymentMethod;
  remarks?: string | null;
  recorded_by: string;
  user_id?: number | null;
  user?: { id: number; username: string } | null;
  created_at?: string;
  updated_at?: string;
}

/** Full loan record — maps member_loans table */
export interface MemberLoan {
  id: number;
  member_id: number;
  loan_reference_no: string;
  requested_amount: number | string;
  approved_amount?: number | string | null;
  application_date: string;
  approval_date?: string | null;
  release_date?: string | null;
  status: LoanStatus;
  loan_purpose?: string | null;
  loan_type?: string;
  term_months?: number | null;
  interest_rate?: number | string | null;
  /** Computed attribute from MemberLoan model: release_date + term_months */
  due_date?: string | null;
  monthly_amortization?: number | string | null;
  total_interest?: number | string | null;
  total_payable?: number | string | null;
  total_amount_paid: number | string;
  outstanding_balance: number | string;
  remarks?: string | null;
  approved_by?: string | null;
  release_payment_method?: PaymentMethod | null;
  release_voucher_number?: string | null;
  disbursement_journal_id?: number | null;
  paid_up_capital_at_application: number | string;
  loan_multiplier_at_application: number | string;
  maximum_eligible_loan: number | string;
  /** Computed appended attribute from MemberLoan model */
  remaining_eligibility: number;
  /** Computed appended attribute from MemberLoan model */
  eligibility_status: 'Eligible' | 'Exceeds Limit' | 'Pending Multiplier Config';
  recorded_by: string;
  user_id?: number | null;
  user?: { id: number; username: string } | null;
  member?: LoanMember;
  repayments?: LoanRepayment[];
  created_at?: string;
  updated_at?: string;
}

/** Response from GET /loans/eligibility/{memberId} */
export interface LoanEligibility {
  member: {
    id: number;
    member_code: string;
    full_name: string;
    status: string;
  };
  paid_up_capital: number;
  cbu_balance?: number;
  total_equity?: number;
  approved_multiplier: number;
  maximum_eligible_loan: number;
  total_outstanding: number;
  remaining_eligibility: number;
  eligibility_status: 'Eligible' | 'Limit Reached' | 'Pending Multiplier Config';
}

/** Aggregate totals block from GET /loans */
export interface LoanTotals {
  total_loans: number;
  total_pending: number;
  total_active: number;
  total_outstanding_amount: number;
  total_released_amount: number;
}

/** Laravel paginated wrapper for loan records */
export interface PaginatedLoans {
  current_page: number;
  data: MemberLoan[];
  last_page: number;
  per_page: number;
  total: number;
  next_page_url?: string | null;
  prev_page_url?: string | null;
}

/** Laravel paginated wrapper for repayment records */
export interface PaginatedRepayments {
  current_page: number;
  data: LoanRepayment[];
  last_page: number;
  per_page: number;
  total: number;
}

/** Response from GET /loans */
export interface GetLoansResponse {
  loans: PaginatedLoans;
  totals: LoanTotals;
}

/** Response from GET /loans/{id} */
export interface GetLoanResponse {
  loan: MemberLoan;
  live_eligibility: {
    paid_up_capital: number;
    cbu_balance?: number;
    total_equity?: number;
    approved_multiplier: number;
    maximum_eligible_loan: number;
    other_outstanding: number;
    remaining_eligibility: number;
  };
  repayment_summary: {
    total_payments: number;
    total_paid: number;
    outstanding_balance: number;
  };
}

/** Response from GET /loans/{id}/repayments */
export interface GetRepaymentsResponse {
  loan: MemberLoan;
  repayments: PaginatedRepayments;
  summary: {
    total_paid: number;
    total_principal_paid: number;
    total_interest_paid: number;
    outstanding_balance: number;
    loan_status: LoanStatus;
  };
}

// ── Request payload shapes ────────────────────────────────────

export interface ApplyLoanPayload {
  member_id: number;
  requested_amount: number;
  application_date: string;
  loan_purpose?: string;
  loan_type?: string;
  term_months?: number | null;
  interest_rate?: number | null;
  remarks?: string;
}

export interface ApproveLoanPayload {
  approved_amount: number;
  approval_date: string;
  approved_by?: string;
  loan_type?: string;
  term_months?: number | null;
  interest_rate?: number | null;
  remarks?: string;
}

export interface ReleaseLoanPayload {
  release_date: string;
  release_payment_method: PaymentMethod;
  approved_by?: string;
  remarks?: string;
}

export interface RecordRepaymentPayload {
  payment_date: string;
  amount_paid: number;
  principal_paid?: number | null;
  interest_paid?: number | null;
  payment_method: PaymentMethod;
  or_number?: string;
  remarks?: string;
  sync_cash_receipt?: boolean;
}
