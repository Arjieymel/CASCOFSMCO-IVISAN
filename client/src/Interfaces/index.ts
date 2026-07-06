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
