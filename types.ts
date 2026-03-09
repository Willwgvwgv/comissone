
export enum UserRole {
  ADMIN = 'ADMIN',
  BROKER = 'BROKER'
}

export enum CommissionStatus {
  PENDING = 'PENDING',
  PAID = 'PAID',
  PARTIAL = 'PARTIAL',
  OVERDUE = 'OVERDUE',
  REQUESTED = 'REQUESTED',
  CANCELED = 'CANCELED'
}

export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: UserRole;
  agency_id: string;
}

export interface Agency {
  id: string;
  name: string;
  slug: string;
  logo_url?: string;
  created_at?: string;
}

export interface BrokerSplit {
  id: string;
  broker_id: string | null;
  broker_name: string;
  percentage: number;
  calculated_value: number;
  status: CommissionStatus;
  payment_date?: string;
  payment_method?: string;
  forecast_date?: string;
  receipt_data?: string;
  installment_number?: number;
  total_installments?: number;
  notes?: string;
  discount_value?: number;
}

export interface SaleInstallment {
  installment_number: number;
  due_date: string;
  value: number;
  status: 'PENDING' | 'PAID';
}

export enum SaleStatus {
  ACTIVE = 'ACTIVE',
  CANCELED = 'CANCELED'
}

export interface Sale {
  id: string;
  agency_id: string;
  status?: SaleStatus;
  sale_date: string;
  property_address: string;
  buyer_name: string;
  buyer_cpf?: string;
  seller_name: string;
  seller_cpf?: string;
  vgv: number;
  commission_percentage: number;
  total_commission_value: number;
  invoice_issued: boolean;
  invoice_number?: string;
  notes?: string;
  is_installment?: boolean;
  installments?: SaleInstallment[];
  splits: BrokerSplit[];
}

export interface DashboardStats {
  totalVGV: number;
  totalCommission: number;
  paidCommission: number;
  pendingCommission: number;
  overdueCommission: number;
  brokerPerformance: { name: string; vgv: number; commissions: number }[];
}

// Financial Module Types
export type TransactionType = 'INCOME' | 'EXPENSE';
export type TransactionStatus = 'PENDING' | 'PAID' | 'PARTIAL';

export interface FinancialCategory {
  id: string;
  agency_id: string;
  name: string;
  type: TransactionType;
  color: string;
}

export interface FinancialAccount {
  id: string;
  agency_id: string;
  name: string;
  type: 'BANK' | 'CREDIT_CARD';
  initial_balance: number;
  current_balance: number;
  color: string;
  is_default: boolean;
  is_active?: boolean;  // false = arquivada (soft delete)
  credit_limit?: number; // Only for CREDIT_CARD
  closing_day?: number; // Only for CREDIT_CARD
  due_day?: number;     // Only for CREDIT_CARD
  linked_account_id?: string; // Bank account used to pay this card
  last_four_digits?: string; // Only for CREDIT_CARD
}

export interface BankImportLog {
  id: string;
  agency_id: string;
  account_id: string;
  filename: string;
  file_size: number;
  import_date: string;
  period_start: string;
  period_end: string;
  transaction_count: number;
  entries_sum: number;
  exits_sum: number;
  file_hash: string;
}

export interface ImportTransaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  type: 'INCOME' | 'EXPENSE';
  fitid?: string;
  memo?: string;
  hash?: string;
}

export interface FinancialTransaction {
  id: string;
  agency_id: string;
  description: string;
  amount: number;
  type: TransactionType;
  category_id: string;
  category_name?: string; // Joined field
  category_color?: string; // Joined field
  account_id: string;
  account_name?: string; // Joined field
  status: TransactionStatus;
  due_date: string;
  payment_date?: string | null;
  paid_amount?: number;
  notes?: string;
  attachment_url?: string;
  is_transfer?: boolean;
  transfer_group_id?: string;
  provider?: string; // Fornecedor
  installment_number?: number;
  total_installments?: number;
  import_id?: string;    // Reference to bank_import_logs
  bank_txn_id?: string;  // Unique ID from the bank (FITID) or hash
}
