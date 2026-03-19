
import React from 'react';
import {
  LayoutDashboard,
  ShoppingCart,
  Wallet,
  BarChart3,
  Users,
  Settings,
  ShieldCheck,
  Building2,
  Landmark,
  Filter,
  Tags,
  RefreshCw,
  CreditCard,
  Percent
} from 'lucide-react';
import { UserRole, Sale, User, CommissionStatus } from './types';

export const CURRENT_AGENCY_ID = 'agency_001';

export const MOCK_USERS: User[] = [
  { id: 'u1', name: 'Admin Imobiliária', email: 'admin@comissone.com', role: UserRole.ADMIN, agency_id: CURRENT_AGENCY_ID },
  { id: 'u2', name: 'João Silva', email: 'joao@comissone.com', role: UserRole.BROKER, agency_id: CURRENT_AGENCY_ID },
  { id: 'u3', name: 'Maria Souza', email: 'maria@comissone.com', role: UserRole.BROKER, agency_id: CURRENT_AGENCY_ID },
  { id: 'u4', name: 'Ricardo Pereira', email: 'ricardo@comissone.com', role: UserRole.BROKER, agency_id: CURRENT_AGENCY_ID },
];

export const MOCK_SALES: Sale[] = [
  {
    id: 's1',
    agency_id: CURRENT_AGENCY_ID,
    sale_date: '2023-11-15',
    property_address: 'Av. Paulista, 1000 - Apto 42',
    buyer_name: 'Carlos Eduardo',
    seller_name: 'Construtora XYZ',
    vgv: 1200000,
    commission_percentage: 6,
    total_commission_value: 72000,
    invoice_issued: true,
    splits: [
      { id: 'sp1', broker_id: 'u2', broker_name: 'João Silva', percentage: 50, calculated_value: 36000, status: CommissionStatus.PAID, payment_date: '2023-11-20', payment_method: 'PIX' },
      { id: 'sp2', broker_id: 'u3', broker_name: 'Maria Souza', percentage: 50, calculated_value: 36000, status: CommissionStatus.PENDING }
    ]
  },
  {
    id: 's2',
    agency_id: CURRENT_AGENCY_ID,
    sale_date: '2023-11-20',
    property_address: 'Rua Oscar Freire, 500 - Casa',
    buyer_name: 'Fernanda Lima',
    seller_name: 'Proprietário Direto',
    vgv: 3500000,
    commission_percentage: 5,
    total_commission_value: 175000,
    invoice_issued: false,
    splits: [
      { id: 'sp3', broker_id: 'u4', broker_name: 'Ricardo Pereira', percentage: 100, calculated_value: 175000, status: CommissionStatus.OVERDUE }
    ]
  },
  {
    id: 's3',
    agency_id: CURRENT_AGENCY_ID,
    sale_date: '2023-12-05',
    property_address: 'Alameda Santos, 222 - Sala 12',
    buyer_name: 'Global Tech Ltda',
    seller_name: 'Invest Imóveis',
    vgv: 850000,
    commission_percentage: 6,
    total_commission_value: 51000,
    invoice_issued: true,
    splits: [
      { id: 'sp4', broker_id: 'u2', broker_name: 'João Silva', percentage: 70, calculated_value: 35700, status: CommissionStatus.PENDING },
      { id: 'sp5', broker_id: 'u3', broker_name: 'Maria Souza', percentage: 30, calculated_value: 15300, status: CommissionStatus.PENDING }
    ]
  }
];

export const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={20} />, roles: [UserRole.ADMIN, UserRole.BROKER] },
  { id: 'sales', label: 'Vendas', icon: <ShoppingCart size={20} />, roles: [UserRole.ADMIN] },
  { id: 'commissions', label: 'Comissões', icon: <Wallet size={20} />, roles: [UserRole.ADMIN, UserRole.BROKER] },
  { id: 'reports', label: 'Relatórios', icon: <BarChart3 size={20} />, roles: [UserRole.ADMIN] },
  { id: 'team', label: 'Equipe', icon: <Users size={20} />, roles: [UserRole.ADMIN] },
  {
    id: 'financial',
    label: 'Financeiro',
    icon: <Landmark size={20} />,
    roles: [UserRole.ADMIN],
    subItems: [
      { id: 'financial-transactions', label: 'Extrato', icon: <Filter size={18} />, parentId: 'financial' },
      { id: 'financial-overview', label: 'Fluxo de Caixa', icon: <Landmark size={18} />, parentId: 'financial' },
      { id: 'financial-cards', label: 'Cartões', icon: <CreditCard size={18} />, parentId: 'financial' },
      { id: 'financial-accounts', label: 'Contas Bancárias', icon: <Wallet size={18} />, parentId: 'financial' },
      { id: 'financial-reconciliation', label: 'Conciliação Bancária', icon: <RefreshCw size={18} />, parentId: 'financial' },
      { id: 'financial-categories', label: 'Categorias', icon: <Tags size={18} />, parentId: 'financial' },
    ]
  },
];
