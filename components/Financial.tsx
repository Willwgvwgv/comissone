import React, { useState, useMemo, useEffect } from 'react';
import {
    Plus, Search, ArrowUpCircle, ArrowDownCircle, AlertCircle,
    CheckCircle2, MoreVertical, Download, Wallet, Tags, Landmark,
    ChevronDown, Trash2, Edit2, RotateCcw, X, Upload, RefreshCw,
    QrCode, Copy
} from 'lucide-react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
    ResponsiveContainer, ReferenceLine
} from 'recharts';
import { User, FinancialTransaction, FinancialCategory, FinancialAccount, TransactionType, TransactionStatus } from '../types';
import { useFinancial } from '../src/lib/useFinancial';
import { formatCurrency } from '../src/utils/formatters';
import { ImportTransaction } from '../src/lib/importUtils';
import AddTransactionModal from './modals/AddTransactionModal';
import DeleteConfirmationModal from './modals/DeleteConfirmationModal';
import AddAccountModal from './modals/AddAccountModal';
import AddCategoryModal from './modals/AddCategoryModal';
import AccountDetails from './financial/AccountDetails';
import AccountReconciliation from './financial/AccountReconciliation';
import StatementImport from './financial/StatementImport';
import UnifiedReconciliation from './financial/UnifiedReconciliation';
import BankImport from '../src/pages/BankImport';
import CreditCardManagement from './financial/CreditCardManagement';
import AccountsView from './financial/AccountsView';
import FinancialContacts from './financial/FinancialContacts';

// --- MOCK DATA FOR UI DEVELOPMENT (Remove after backend integration) ---
// const MOCK_TRANSACTIONS = ... (Removed in favor of using hook data)

export type FinancialTab = 'overview' | 'transactions' | 'accounts' | 'categories' | 'cards' | 'contacts';

interface FinancialProps {
    currentUser: User;
    initialTab?: FinancialTab;
}

const Financial: React.FC<FinancialProps> = ({ currentUser, initialTab = 'transactions' }) => {
    const [activeTab, setActiveTab] = useState<FinancialTab>(initialTab);

    // Sync activeTab with initialTab when it changes
    useEffect(() => {
        setActiveTab(initialTab);
    }, [initialTab]);
    const [filterType, setFilterType] = useState<'ALL' | 'INCOME' | 'EXPENSE'>('ALL');
    const [filterStatus, setFilterStatus] = useState<'ALL' | 'PAID' | 'PENDING' | 'PARTIAL'>('ALL');
    const [searchTerm, setSearchTerm] = useState('');

    // Quick Filter State
    const [activeQuickFilter, setActiveQuickFilter] = useState<'ALL' | 'OVERDUE' | 'TODAY' | 'FUTURE' | 'PAID'>('ALL');

    // Date Range Filters
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalType, setModalType] = useState<TransactionType>('INCOME');
    const [transactionToEdit, setTransactionToEdit] = useState<FinancialTransaction | null>(null);
    const [transactionToDelete, setTransactionToDelete] = useState<FinancialTransaction | null>(null);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [selectedAccountForNewTransaction, setSelectedAccountForNewTransaction] = useState<string>('');

    const [isAddAccountModalOpen, setIsAddAccountModalOpen] = useState(false);
    const [isAddCategoryModalOpen, setIsAddCategoryModalOpen] = useState(false);
    const [selectedAccount, setSelectedAccount] = useState<FinancialAccount | null>(null);
    const [selectedCategory, setSelectedCategory] = useState<FinancialCategory | null>(null);

    // Bank Reconciliation states
    const [selectedAccountForReconciliation, setSelectedAccountForReconciliation] = useState<string>('');

    // Payment Modal State
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [transactionToPay, setTransactionToPay] = useState<FinancialTransaction | null>(null);
    const [paymentAmount, setPaymentAmount] = useState('');
    const [selectedPaymentAccount, setSelectedPaymentAccount] = useState<string>('');

    // PIX Modal State
    const [isPixModalOpen, setIsPixModalOpen] = useState(false);
    const [transactionForPix, setTransactionForPix] = useState<FinancialTransaction | null>(null);

    // Global Date Filter State
    const [currentDate, setCurrentDate] = useState(new Date());
    const [chartPeriod, setChartPeriod] = useState<'Diário' | 'Semanal' | 'Mensal'>('Mensal');

    const handlePrevMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    };

    const handleNextMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    };

    const currentMonthLabel = currentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();

    // Use real data hook
    const {
        transactions, categories, accounts, importLogs, loading,
        updateTransactionStatus, deleteTransaction, addTransaction,
        reopenTransaction,
        addAccount, updateAccount, deleteAccount,
        addCategory, updateCategory, deleteCategory,
        contacts, addContact, updateContact, deleteContact,
        refresh,
        addImportLog, updateImportLog, deleteImportLog,
        confirmImport
    } = useFinancial(currentUser.agency_id);

    // --- POPULATE DEFAULT CATEGORIES ---
    const [isGeneratingCategories, setIsGeneratingCategories] = useState(false);

    const handleGenerateDefaultCategories = async () => {
        if (!confirm('Deseja criar as categorias padrão? Isso não excluirá suas categorias atuais.')) return;
        setIsGeneratingCategories(true);

        const defaultCategories: { name: string, type: 'INCOME' | 'EXPENSE', color: string }[] = [
            // 1.1 Vendas de Imóveis
            { name: '1.1 Vendas - Comissão de Venda', type: 'INCOME', color: '#059669' },
            { name: '1.1 Vendas - Comissão de Lançamento', type: 'INCOME', color: '#059669' },
            { name: '1.1 Vendas - Comissão de Repasse', type: 'INCOME', color: '#059669' },
            { name: '1.1 Vendas - Comissão de Captação', type: 'INCOME', color: '#059669' },
            { name: '1.1 Vendas - Taxa de Intermediação', type: 'INCOME', color: '#059669' },
            { name: '1.1 Vendas - Taxa Setup', type: 'INCOME', color: '#059669' },
            { name: '1.1 Vendas - Bônus de Performance', type: 'INCOME', color: '#059669' },
            { name: '1.1 Vendas - Premiação Comercial', type: 'INCOME', color: '#059669' },
            // 1.2 Aluguéis
            { name: '1.2 Aluguéis - Taxa de Administração', type: 'INCOME', color: '#10B981' },
            { name: '1.2 Aluguéis - Primeira Locação', type: 'INCOME', color: '#10B981' },
            { name: '1.2 Aluguéis - Renovação Contratual', type: 'INCOME', color: '#10B981' },
            { name: '1.2 Aluguéis - Multa Contratual', type: 'INCOME', color: '#10B981' },
            { name: '1.2 Aluguéis - Seguro Fiança', type: 'INCOME', color: '#10B981' },
            { name: '1.2 Aluguéis - Garantia Locatícia', type: 'INCOME', color: '#10B981' },
            { name: '1.2 Aluguéis - Rescisão Contratual', type: 'INCOME', color: '#10B981' },
            { name: '1.2 Aluguéis - Juros por Atraso', type: 'INCOME', color: '#10B981' },
            // 1.3 Serviços e Honorários
            { name: '1.3 Serviços - Avaliação de Imóvel', type: 'INCOME', color: '#34D399' },
            { name: '1.3 Serviços - Consultoria Imobiliária', type: 'INCOME', color: '#34D399' },
            { name: '1.3 Serviços - Regularização Documental', type: 'INCOME', color: '#34D399' },
            { name: '1.3 Serviços - Honorários Jurídicos', type: 'INCOME', color: '#34D399' },
            { name: '1.3 Serviços - Laudos Técnicos', type: 'INCOME', color: '#34D399' },
            { name: '1.3 Serviços - Indicação / Parceria', type: 'INCOME', color: '#34D399' },
            { name: '1.3 Serviços - Reembolso Recebido', type: 'INCOME', color: '#34D399' },
            // 1.4 Receitas Financeiras
            { name: '1.4 Finanças - Juros Recebidos', type: 'INCOME', color: '#047857' },
            { name: '1.4 Finanças - Rendimentos Bancários', type: 'INCOME', color: '#047857' },
            { name: '1.4 Finanças - Cashback', type: 'INCOME', color: '#047857' },
            { name: '1.4 Finanças - Descontos Obtidos', type: 'INCOME', color: '#047857' },

            // 2.1 Comissões e Repasse
            { name: '2.1 Comissões - Corretor Interno', type: 'EXPENSE', color: '#E11D48' },
            { name: '2.1 Comissões - Corretor Externo', type: 'EXPENSE', color: '#E11D48' },
            { name: '2.1 Comissões - Split de Comissão', type: 'EXPENSE', color: '#E11D48' },
            { name: '2.1 Comissões - Captação', type: 'EXPENSE', color: '#E11D48' },
            { name: '2.1 Comissões - Parceria', type: 'EXPENSE', color: '#E11D48' },
            { name: '2.1 Comissões - Premiação Comercial', type: 'EXPENSE', color: '#E11D48' },
            { name: '2.1 Comissões - Antecipação', type: 'EXPENSE', color: '#E11D48' },
            // 2.2 Bancárias
            { name: '2.2 Bancárias - Taxa PIX/TED/DOC', type: 'EXPENSE', color: '#BE123C' },
            { name: '2.2 Bancárias - Tarifa Bancária / Anuidade', type: 'EXPENSE', color: '#BE123C' },
            { name: '2.2 Bancárias - Juros / Multas', type: 'EXPENSE', color: '#BE123C' },
            { name: '2.2 Bancárias - Taxa Antecipação/Boleto', type: 'EXPENSE', color: '#BE123C' },
            { name: '2.2 Bancárias - Estorno Bancário', type: 'EXPENSE', color: '#BE123C' },
            // 2.3 Operacional
            { name: '2.3 Operacional - Aluguel / Condomínio', type: 'EXPENSE', color: '#9F1239' },
            { name: '2.3 Operacional - Energia / Água / Internet', type: 'EXPENSE', color: '#9F1239' },
            { name: '2.3 Operacional - Material / Limpeza', type: 'EXPENSE', color: '#9F1239' },
            { name: '2.3 Operacional - Software / CRM / Site', type: 'EXPENSE', color: '#9F1239' },
            { name: '2.3 Operacional - Contabilidade / Jurídico', type: 'EXPENSE', color: '#9F1239' },
            // 2.4 Marketing
            { name: '2.4 Marketing - Ads / Tráfego', type: 'EXPENSE', color: '#F43F5E' },
            { name: '2.4 Marketing - Portais Imobiliários', type: 'EXPENSE', color: '#F43F5E' },
            { name: '2.4 Marketing - Mídias / Branding / Vídeos', type: 'EXPENSE', color: '#F43F5E' },
            { name: '2.4 Marketing - Placas / Impressos', type: 'EXPENSE', color: '#F43F5E' },
            // 2.5 Veículos
            { name: '2.5 Veículos - Combustível / Pedágio', type: 'EXPENSE', color: '#Rose-600' },
            { name: '2.5 Veículos - Manutenção / IPVA / Seguro', type: 'EXPENSE', color: '#Rose-600' },
            // 2.6 Impostos
            { name: '2.6 Impostos - ISS / Simples / IRPJ / CSLL', type: 'EXPENSE', color: '#881337' },
            { name: '2.6 Impostos - INSS / FGTS', type: 'EXPENSE', color: '#881337' },
            // 2.7 Pessoal
            { name: '2.7 Pessoal - Pró-labore / Salários', type: 'EXPENSE', color: '#FCA5A5' },
            { name: '2.7 Pessoal - Vale Transporte / Alimentação', type: 'EXPENSE', color: '#FCA5A5' },
            { name: '2.7 Pessoal - Comissão Adm / Treinamentos', type: 'EXPENSE', color: '#FCA5A5' },

            // 3. TRANSFERÊNCIAS
            { name: '3.0 Transferência - Recebida (Aporte/Empréstimo)', type: 'INCOME', color: '#3B82F6' },
            { name: '3.0 Transferência - Enviada (Retirada/Pagamentos)', type: 'EXPENSE', color: '#3B82F6' },
            { name: '3.0 Transferência - Entre Contas', type: 'EXPENSE', color: '#3B82F6' },

            // 4. CONCILIAÇÃO
            { name: '4.0 Conciliação - Entrada PIX / TED / Boleto', type: 'INCOME', color: '#8B5CF6' },
            { name: '4.0 Conciliação - Pagamentos / Débito', type: 'EXPENSE', color: '#8B5CF6' },
            { name: '4.0 Conciliação - Estornos', type: 'EXPENSE', color: '#8B5CF6' }
        ];

        try {
            const existingNames = categories.map(c => c.name);
            const toAdd = defaultCategories.filter(c => !existingNames.includes(c.name));

            for (const cat of toAdd) {
                await addCategory(cat);
            }
            if (toAdd.length > 0) {
                alert(`${toAdd.length} categorias padrão geradas com sucesso!`);
            } else {
                alert(`Todas as categorias padrão já existem.`);
            }
        } catch (error) {
            console.error(error);
            alert('Erro ao gerar categorias.');
        } finally {
            setIsGeneratingCategories(false);
        }
    };

    // Sync selected account for reconciliation
    useEffect(() => {
        if (accounts.length > 0 && !selectedAccountForReconciliation) {
            setSelectedAccountForReconciliation(accounts[0].id);
        }
    }, [accounts, selectedAccountForReconciliation]);

    // --- CHART LOGIC (12 Months Window centered on current) ----------------
    // const chartData = ... (Refined to show window around selected date)
    const chartData = useMemo(() => {
        if (chartPeriod === 'Diário') {
            const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
            const days = [];
            for (let i = 1; i <= daysInMonth; i++) {
                days.push(new Date(currentYear, currentMonth, i));
            }

            return days.map(date => {
                const dateStr = date.toISOString().split('T')[0];
                const dayTrans = transactions.filter(t => t.due_date === dateStr);
                const income = dayTrans.filter(t => t.type === 'INCOME').reduce((acc, t) => acc + Number(t.amount), 0);
                const expense = dayTrans.filter(t => t.type === 'EXPENSE').reduce((acc, t) => acc + Number(t.amount), 0);

                return {
                    name: date.getDate().toString().padStart(2, '0'),
                    Receitas: income,
                    Despesas: expense,
                    Saldo: income - expense,
                    originalDate: date,
                    isSelected: date.getDate() === new Date().getDate() && date.getMonth() === new Date().getMonth() && date.getFullYear() === new Date().getFullYear()
                };
            });
        }

        if (chartPeriod === 'Semanal') {
            const weeks = [];
            const lastDay = new Date(currentYear, currentMonth + 1, 0).getDate();
            for (let i = 0; i < 4; i++) {
                const start = i * 7 + 1;
                const end = i === 3 ? lastDay : (i + 1) * 7;
                weeks.push({ label: `Sem ${i + 1}`, start, end });
            }

            return weeks.map(w => {
                const weekTrans = transactions.filter(t => {
                    const [ty, tm, td] = t.due_date.split('-').map(Number);
                    return ty === currentYear && (tm - 1) === currentMonth && td >= w.start && td <= w.end;
                });
                const income = weekTrans.filter(t => t.type === 'INCOME').reduce((acc, t) => acc + Number(t.amount), 0);
                const expense = weekTrans.filter(t => t.type === 'EXPENSE').reduce((acc, t) => acc + Number(t.amount), 0);

                return {
                    name: w.label,
                    Receitas: income,
                    Despesas: expense,
                    Saldo: income - expense
                };
            });
        }

        // Regular Monthly view
        const months = [];
        for (let i = -6; i <= 5; i++) {
            const d = new Date(currentDate.getFullYear(), currentDate.getMonth() + i, 1);
            months.push(d);
        }

        return months.map(date => {
            const m = date.getMonth();
            const y = date.getFullYear();
            const label = date.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }).replace('.', '');
            const isSelected = m === currentMonth && y === currentYear;

            const monthTrans = transactions.filter(t => {
                const [ty, tm] = t.due_date.split('-').map(Number);
                return (tm - 1) === m && ty === y;
            });

            const income = monthTrans.filter(t => t.type === 'INCOME').reduce((acc, t) => acc + Number(t.amount), 0);
            const expense = monthTrans.filter(t => t.type === 'EXPENSE').reduce((acc, t) => acc + Number(t.amount), 0);

            return {
                name: label.charAt(0).toUpperCase() + label.slice(1),
                Receitas: income,
                Despesas: expense,
                Saldo: income - expense,
                originalDate: date,
                isSelected
            };
        });
    }, [transactions, currentDate, chartPeriod, currentMonth, currentYear]);
    // ----------------------------------------------------------

    // --- Derived State (Filtered by CURRENT MONTH) ---
    const monthTransactions = useMemo(() => {
        return transactions.filter(t => {
            // Priority: Explicit Date Range
            if (startDate || endDate) {
                if (startDate && t.due_date < startDate) return false;
                if (endDate && t.due_date > endDate) return false;
                return true;
            }

            // Fallback: Selected Month/Year
            const [ty, tm] = t.due_date.split('-').map(Number);
            return (tm - 1) === currentMonth && ty === currentYear;
        });
    }, [transactions, currentMonth, currentYear, startDate, endDate]);

    const filteredTransactions = useMemo(() => {
        let data = [...transactions];
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // 1. Month/Year Filter (only if no explicit date range)
        if (!startDate && !endDate) {
            data = data.filter(t => {
                const [ty, tm] = t.due_date.split('-').map(Number);
                return (tm - 1) === currentMonth && ty === currentYear;
            });
        }

        // 2. Explicit Date Range Filter
        if (startDate) {
            data = data.filter(t => t.due_date >= startDate);
        }
        if (endDate) {
            data = data.filter(t => t.due_date <= endDate);
        }

        // 3. Quick Filters (Balloons)
        if (activeQuickFilter !== 'ALL') {
            // For "Active" filters (Overdue, Today, Future), we want items that are NOT fully paid.
            // PARTIAL transactions should appear in these lists because they have a remaining balance.
            if (activeQuickFilter === 'OVERDUE') {
                data = data.filter(t => t.status !== 'PAID' && new Date(t.due_date + 'T00:00:00') < today);
            } else if (activeQuickFilter === 'TODAY') {
                const todayStr = today.toISOString().split('T')[0];
                data = data.filter(t => t.due_date === todayStr && t.status !== 'PAID');
            } else if (activeQuickFilter === 'FUTURE') {
                // Changed from t.status === 'PENDING' to allow PARTIAL
                data = data.filter(t => (t.status === 'PENDING' || t.status === 'PARTIAL') && new Date(t.due_date + 'T00:00:00') > today);
            } else if (activeQuickFilter === 'PAID') {
                // For PAID, we show fully PAID and PARTIAL (since they have a paid portion)
                data = data.filter(t => t.status === 'PAID' || t.status === 'PARTIAL');
            }
        }

        // 4. Conventional Filters
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            data = data.filter(t => 
                t.description.toLowerCase().includes(term) ||
                (t.contact_name && t.contact_name.toLowerCase().includes(term))
            );
        }
        if (filterType !== 'ALL') {
            data = data.filter(t => t.type === filterType);
        }
        if (filterStatus !== 'ALL') {
            data = data.filter(t => t.status === filterStatus);
        }

        return data.sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime());
    }, [transactions, searchTerm, filterType, filterStatus, currentMonth, currentYear, startDate, endDate, activeQuickFilter]);

    const stats = useMemo(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Filter transactions for the CURRENT VIEW (which is monthTransactions filtered by active filters ideally, or just monthTransactions?)
        // The user wants "Extrato" (Statement) KPIs. Usually these reflect the *currently visible* period (month).
        // Let's use `monthTransactions` as the base to reflect the selected month's overview.

        let totalIncome = 0;
        let totalExpense = 0;

        // Apply type filter to stats as well (so "Despesas" view shows only Expense stats, etc)
        const statsData = monthTransactions.filter(t => {
            if (filterType === 'ALL') return true;
            return t.type === filterType;
        });

        // Calculate Totals for Balance
        statsData.forEach(t => {
            const val = Number(t.amount);
            if (t.type === 'INCOME') totalIncome += val;
            else totalExpense += val;
        });

        const pending = statsData.filter(t => t.status === 'PENDING' || t.status === 'PARTIAL');
        const completed = statsData.filter(t => t.status === 'PAID' || t.status === 'PARTIAL');

        const calcSum = (arr: any[], type: 'PENDING' | 'PAID') => arr.reduce((acc, t) => {
            let val = 0;
            if (type === 'PENDING') {
                // For pending, we want the REMAINING amount
                val = Number(t.amount) - (t.paid_amount || 0);
            } else {
                // For paid, we want the PAID amount
                val = t.paid_amount || 0;
                // If status is PAID, paid_amount might be null/undefined in old data, fallback to amount
                if (t.status === 'PAID' && !t.paid_amount) val = Number(t.amount);
            }
            return acc + (t.type === 'INCOME' ? val : -val);
        }, 0);

        // "Vencidos" (Overdue)
        const overdueTrans = pending.filter(t => new Date(t.due_date + 'T00:00:00') < today && t.status !== 'PAID');
        const valOverdue = calcSum(overdueTrans, 'PENDING');

        // "Vence Hoje" (Due Today)
        const todayTrans = pending.filter(t => {
            const d = new Date(t.due_date + 'T00:00:00');
            return d.getDate() === today.getDate() && d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear() && t.status !== 'PAID';
        });
        const valToday = calcSum(todayTrans, 'PENDING');

        // "A Vencer" (To Come)
        const futureTrans = pending.filter(t => new Date(t.due_date + 'T00:00:00') > today && t.status !== 'PAID');
        const valFuture = calcSum(futureTrans, 'PENDING');

        // "Pagos" (Paid/Received) - Actually realized
        const valPaid = calcSum(completed, 'PAID');

        // "Total do Período" (Balance)
        // Total Balance should reflect Realized Income - Realized Expense? Or Projected?
        // Usually "Fluxo de Caixa" implies Realized + Pending?
        // Let's keep it as Total Inflow - Total Outflow (Projected + Realized) to match "Balance"
        const totalBalance = totalIncome - totalExpense;

        return {
            valOverdue,
            valToday,
            valFuture,
            valPaid,
            totalBalance
        };
    }, [monthTransactions]);

    // Next Payables (Global or Monthly? Usually Global for "Next", but let's keep it focussed implies urgency)
    // Let's keep Next Payables as "Global Next 5" regardless of month view for the Overview, 
    // BUT for the Dashboard Cards in Transactions tab, they should reflect the SELECTED MONTH.

    // Global Next (for Overview widget)
    const nextPayables = useMemo(() => {
        return transactions
            .filter(t => t.type === 'EXPENSE' && t.status === 'PENDING')
            .filter(t => {
                const [ty, tm] = t.due_date.split('-').map(Number);
                return (tm - 1) === currentMonth && ty === currentYear;
            })
            .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())
            .slice(0, 5);
    }, [transactions, currentMonth, currentYear]);

    const nextReceivables = useMemo(() => {
        return transactions
            .filter(t => t.type === 'INCOME' && t.status === 'PENDING')
            .filter(t => {
                const [ty, tm] = t.due_date.split('-').map(Number);
                return (tm - 1) === currentMonth && ty === currentYear;
            })
            .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())
            .slice(0, 5);
    }, [transactions, currentMonth, currentYear]);

    const openModal = (type: TransactionType) => {
        setModalType(type);
        setTransactionToEdit(null);
        setIsModalOpen(true);
    };

    const openEditModal = (transaction: FinancialTransaction) => {
        setTransactionToEdit(transaction);
        setModalType(transaction.type);
        setIsModalOpen(true);
    };

    const formatDate = (dateStr: string) => {
        if (!dateStr) return '-';
        // Ensure we only take the date part to avoid "Invalid Date" with time components
        const cleanDate = dateStr.substring(0, 10);
        const [y, m, d] = cleanDate.split('-').map(Number);
        if (isNaN(y) || isNaN(m) || isNaN(d)) return dateStr;
        return new Date(y, m - 1, d).toLocaleDateString('pt-BR');
    };

    const currentAccountForRecon = accounts.find(a => a.id === selectedAccountForReconciliation) || accounts[0];

    const handleConfirmMatch = async (importId: string, systemId: string) => {
        try {
            // 1. Marcar a transação do sistema como PAGA na conta bancária correta
            // Idealmente, também deveríamos atrelar o 'import_id' nela para registro,
            // mas o updateTransactionStatus foca apenas no status.
            await updateTransactionStatus(systemId, 'PAID', selectedAccountForReconciliation);

            // 2. Apagar a transação provisória (PENDING) que veio da importação
            await deleteTransaction(importId);
        } catch (error) {
            console.error('Erro ao conciliar:', error);
            alert('Erro ao confirmar conciliação.');
        }
    };

    const handleCreateNew = async (imp: any) => {
        try {
            await addTransaction({
                description: imp.description,
                amount: imp.amount,
                type: imp.type,
                due_date: imp.date,
                status: 'PAID',
                payment_date: imp.date,
                account_id: selectedAccountForReconciliation,
                category_id: imp.category_id
            });
            return true;
        } catch (error) {
            console.error('Erro ao criar transação:', error);
            alert('Erro ao criar novo lançamento. Por favor, verifique se seu banco de dados está atualizado.');
            return false;
        }
    };

    const handleTransfer = async (importId: string, targetAccountId: string) => {
        // Find the transaction in the loaded list
        const imp = transactions.find(t => t.id === importId);
        if (!imp) return;

        try {
            const transferGroupId = crypto.randomUUID();
            const targetAccount = accounts.find(a => a.id === targetAccountId);
            const sourceAccount = accounts.find(a => a.id === selectedAccountForReconciliation);

            // 1. Transaction in the Origin Account (Bank Account)
            await addTransaction({
                description: `TRANSFERÊNCIA ENVIADA PARA: ${targetAccount?.name || 'OUTRA CONTA'}`,
                amount: imp.amount,
                type: 'EXPENSE',
                due_date: imp.due_date,
                status: 'PAID',
                payment_date: imp.due_date,
                account_id: selectedAccountForReconciliation,
                category_id: null,
                is_transfer: true,
                transfer_group_id: transferGroupId
            });

            // 2. Transaction in the Destination Account (Credit Card or other Bank)
            await addTransaction({
                description: `TRANSFERÊNCIA RECEBIDA DE: ${sourceAccount?.name || 'OUTRA CONTA'}`,
                amount: imp.amount,
                type: 'INCOME',
                due_date: imp.due_date,
                status: 'PAID',
                payment_date: imp.due_date,
                account_id: targetAccountId,
                category_id: null,
                is_transfer: true,
                transfer_group_id: transferGroupId
            });

            // Delete the imported temporary "PENDING" transaction
            await deleteTransaction(importId);
        } catch (error) {
            console.error('Erro na transferência:', error);
            alert('Erro ao realizar transferência.');
        }
    };

    return (
        <div className="flex-1 flex flex-col h-full overflow-hidden relative page-transition">
            <header className="h-[72px] bg-white/80 backdrop-blur-xl border-b border-m3-outline-variant/10 flex items-center justify-between px-10 shrink-0 z-10">
                <div className="flex flex-col">
                    <h1 className="text-2xl font-black text-m3-on-surface tracking-tight leading-none mb-1">Financeiro</h1>
                    <p className="text-[10px] font-black text-m3-on-surface-variant/40 uppercase tracking-[0.2em]">Gestão de caixa, contas e categorias</p>
                </div>

                <div className="flex items-center gap-4">
                    {activeTab === 'transactions' && (
                        <>
                            <button
                                onClick={() => openModal('INCOME')}
                                className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-[12px] text-xs font-black shadow-lg shadow-emerald-200/50 transition-all hover:-translate-y-0.5"
                            >
                                <span className="material-symbols-outlined text-lg">add_circle</span> Nova Receita
                            </button>
                            <button
                                onClick={() => openModal('EXPENSE')}
                                className="flex items-center gap-2 bg-m3-error hover:bg-red-700 text-white px-5 py-2.5 rounded-[12px] text-xs font-black shadow-lg shadow-m3-error/20 transition-all hover:-translate-y-0.5"
                            >
                                <span className="material-symbols-outlined text-lg">do_not_disturb_on</span> Nova Despesa
                            </button>
                        </>
                    )}
                </div>
            </header>

            <main className="flex-1 overflow-y-auto p-8 relative">
                <div className={activeTab === 'overview' ? 'block' : 'hidden'}>
                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        {/* Financial Health Chart */}
                        <div className="bg-m3-surface-container-low rounded-[32px] p-8 border border-m3-outline-variant/30 shadow-sm relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-m3-primary/5 rounded-full -mr-32 -mt-32"></div>
                            
                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10 relative z-10">
                                <div>
                                    <h3 className="text-xl font-black text-m3-on-surface flex items-center gap-3">
                                        <span className="material-symbols-outlined text-m3-primary">analytics</span> Movimentação Financeira
                                    </h3>
                                    <p className="text-[10px] font-black text-m3-on-surface-variant/40 uppercase tracking-[0.2em] mt-1">
                                        Fluxo de Receitas vs Despesas ({currentMonthLabel})
                                    </p>
                                </div>
                                <div className="flex items-center gap-2 bg-m3-surface-container-high p-1.5 rounded-[16px] border border-m3-outline-variant/20">
                                    {['Diário', 'Semanal', 'Mensal'].map((period) => (
                                        <button
                                            key={period}
                                            onClick={() => setChartPeriod(period as any)}
                                            className={`px-5 py-2 rounded-[12px] text-xs font-black transition-all ${chartPeriod === period ? 'bg-m3-primary text-white shadow-lg shadow-m3-primary/20' : 'text-m3-on-surface-variant hover:text-m3-on-surface'
                                                }`}
                                        >
                                            {period}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="h-[340px] min-h-[340px] w-full relative z-10">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.03)" />
                                        <XAxis
                                            dataKey="name"
                                            axisLine={false}
                                            tickLine={false}
                                            tick={{ fill: 'rgba(0,0,0,0.4)', fontSize: 10, fontWeight: 900 }}
                                            dy={15}
                                        />
                                        <YAxis
                                            axisLine={false}
                                            tickLine={false}
                                            tick={{ fill: 'rgba(0,0,0,0.4)', fontSize: 10, fontWeight: 900 }}
                                            tickFormatter={(value) => `R$ ${value >= 1000 ? (value / 1000).toFixed(0) + 'k' : value}`}
                                        />
                                        <Tooltip
                                            contentStyle={{ 
                                                backgroundColor: 'rgba(255,255,255,0.95)', 
                                                borderRadius: '20px', 
                                                border: '1px solid rgba(0,0,0,0.05)', 
                                                boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)',
                                                backdropFilter: 'blur(10px)',
                                                padding: '12px'
                                            }}
                                            itemStyle={{ fontSize: '12px', fontWeight: 900 }}
                                            labelStyle={{ fontSize: '10px', fontWeight: 900, marginBottom: '8px', color: 'rgba(0,0,0,0.4)', textTransform: 'uppercase', letterSpacing: '0.1em' }}
                                            formatter={(value: number) => [formatCurrency(value), '']}
                                            cursor={{ fill: 'rgba(0,0,0,0.02)', radius: 10 }}
                                        />
                                        <Bar dataKey="Receitas" fill="#10b981" radius={[8, 8, 8, 8]} barSize={24} />
                                        <Bar dataKey="Despesas" fill="#ef4444" radius={[8, 8, 8, 8]} barSize={24} />
                                        <ReferenceLine y={0} stroke="rgba(0,0,0,0.05)" />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Next Payables & Receivables Grid */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            {/* Next Payables */}
                            <div className="bg-m3-surface-container-low rounded-[32px] p-8 border border-m3-outline-variant/30 shadow-sm relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-24 h-24 bg-m3-error/5 rounded-full -mr-12 -mt-12"></div>
                                <div className="flex items-center justify-between mb-8">
                                    <h3 className="text-[10px] font-black text-m3-on-surface-variant uppercase tracking-[0.2em] flex items-center gap-3">
                                        <span className="material-symbols-outlined text-m3-error text-xl font-variation-fill">event_busy</span> Contas a Pagar
                                    </h3>
                                    <div className="relative group">
                                        <button className="flex items-center gap-2 bg-m3-surface-container-high px-4 py-2 rounded-xl border border-m3-outline-variant/10 text-xs font-black text-m3-on-surface transition-all hover:bg-m3-surface-container-highest">
                                            {currentDate.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }).toUpperCase()}
                                            <span className="material-symbols-outlined text-base">expand_more</span>
                                        </button>
                                        <div className="absolute right-0 top-full mt-2 bg-white border border-m3-outline-variant/10 shadow-2xl rounded-2xl p-2 hidden group-hover:block z-20 min-w-[180px] animate-in fade-in zoom-in-95 duration-200 backdrop-blur-xl">
                                            <button onClick={handlePrevMonth} className="w-full text-left px-4 py-3 hover:bg-m3-surface-container-low transition-all rounded-xl text-xs font-black text-m3-on-surface-variant flex items-center gap-3">
                                                <span className="material-symbols-outlined text-lg">chevron_left</span> Mês Anterior
                                            </button>
                                            <button onClick={handleNextMonth} className="w-full text-left px-4 py-3 hover:bg-m3-surface-container-low transition-all rounded-xl text-xs font-black text-m3-on-surface-variant flex items-center gap-3">
                                                <span className="material-symbols-outlined text-lg">chevron_right</span> Próximo Mês
                                            </button>
                                        </div>
                                    </div>
                                </div>
                                {nextPayables.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-12 text-m3-on-surface-variant/30">
                                        <span className="material-symbols-outlined text-4xl mb-2">check_circle</span>
                                        <p className="text-xs font-black uppercase tracking-widest">Tudo em dia!</p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {nextPayables.map(item => (
                                            <div key={item.id} className="flex items-center justify-between p-4 bg-white/50 rounded-2xl border border-m3-outline-variant/10 hover:border-m3-error/20 transition-all group">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-10 h-10 rounded-xl bg-m3-error/10 text-m3-error flex items-center justify-center translate-y-0 group-hover:-translate-y-1 transition-transform">
                                                        <span className="material-symbols-outlined text-xl">payments</span>
                                                    </div>
                                                    <div>
                                                        <p className="font-black text-m3-on-surface text-sm truncate max-w-[180px]">{item.description}</p>
                                                        <p className="text-[10px] font-black text-m3-on-surface-variant/40 uppercase tracking-wider mt-0.5">{formatDate(item.due_date)}</p>
                                                    </div>
                                                </div>
                                                <span className="font-black text-m3-error text-sm">- {formatCurrency(item.amount)}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Next Receivables */}
                            <div className="bg-m3-surface-container-low rounded-[32px] p-8 border border-m3-outline-variant/30 shadow-sm relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full -mr-12 -mt-12"></div>
                                <div className="flex items-center justify-between mb-8">
                                    <h3 className="text-[10px] font-black text-m3-on-surface-variant uppercase tracking-[0.2em] flex items-center gap-3">
                                        <span className="material-symbols-outlined text-emerald-500 text-xl font-variation-fill">event_available</span> Contas a Receber
                                    </h3>
                                    <div className="relative group">
                                        <button className="flex items-center gap-2 bg-m3-surface-container-high px-4 py-2 rounded-xl border border-m3-outline-variant/10 text-xs font-black text-m3-on-surface transition-all hover:bg-m3-surface-container-highest">
                                            {currentDate.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }).toUpperCase()}
                                            <span className="material-symbols-outlined text-base">expand_more</span>
                                        </button>
                                        <div className="absolute right-0 top-full mt-2 bg-white border border-m3-outline-variant/10 shadow-2xl rounded-2xl p-2 hidden group-hover:block z-20 min-w-[180px] animate-in fade-in zoom-in-95 duration-200 backdrop-blur-xl">
                                            <button onClick={handlePrevMonth} className="w-full text-left px-4 py-3 hover:bg-m3-surface-container-low transition-all rounded-xl text-xs font-black text-m3-on-surface-variant flex items-center gap-3">
                                                <span className="material-symbols-outlined text-lg">chevron_left</span> Mês Anterior
                                            </button>
                                            <button onClick={handleNextMonth} className="w-full text-left px-4 py-3 hover:bg-m3-surface-container-low transition-all rounded-xl text-xs font-black text-m3-on-surface-variant flex items-center gap-3">
                                                <span className="material-symbols-outlined text-lg">chevron_right</span> Próximo Mês
                                            </button>
                                        </div>
                                    </div>
                                </div>
                                {nextReceivables.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-12 text-m3-on-surface-variant/30">
                                        <span className="material-symbols-outlined text-4xl mb-2">savings</span>
                                        <p className="text-xs font-black uppercase tracking-widest">Nenhum recebimento</p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {nextReceivables.map(item => (
                                            <div key={item.id} className="flex items-center justify-between p-4 bg-white/50 rounded-2xl border border-m3-outline-variant/10 hover:border-emerald-200/50 transition-all group">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center translate-y-0 group-hover:-translate-y-1 transition-transform">
                                                        <span className="material-symbols-outlined text-xl">account_balance_wallet</span>
                                                    </div>
                                                    <div>
                                                        <p className="font-black text-m3-on-surface text-sm truncate max-w-[180px]">{item.description}</p>
                                                        <p className="text-[10px] font-black text-m3-on-surface-variant/40 uppercase tracking-wider mt-0.5">{formatDate(item.due_date)}</p>
                                                    </div>
                                                </div>
                                                <span className="font-black text-emerald-600 text-sm">+ {formatCurrency(item.amount)}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
                <AddTransactionModal
                    isOpen={isModalOpen}
                    onClose={() => {
                        setIsModalOpen(false);
                        setTransactionToEdit(null);
                        setSelectedAccountForNewTransaction('');
                    }}
                    type={modalType}
                    agencyId={currentUser.agency_id}
                    initialData={transactionToEdit}
                    initialAccountId={selectedAccountForNewTransaction}
                    accounts={accounts}
                    categories={categories}
                    contacts={contacts}
                    onSuccess={() => {
                        refresh(); // Reload data
                    }}

                />

                <DeleteConfirmationModal
                    isOpen={isDeleteModalOpen}
                    onClose={() => {
                        setIsDeleteModalOpen(false);
                        setTransactionToDelete(null);
                    }}
                    onConfirm={async (deleteAllFuture) => {
                        if (transactionToDelete) {
                            await deleteTransaction(transactionToDelete.id, deleteAllFuture);
                            setIsDeleteModalOpen(false);
                            setTransactionToDelete(null);
                            refresh();
                        }
                    }}
                    transaction={transactionToDelete}
                />

                <AddAccountModal
                    isOpen={isAddAccountModalOpen}
                    onClose={() => {
                        setIsAddAccountModalOpen(false);
                        setSelectedAccount(null);
                    }}
                    initialData={selectedAccount}
                    onSuccess={async (data) => {
                        if (selectedAccount?.id) {
                            await updateAccount(selectedAccount.id, data);
                        } else {
                            await addAccount({
                                ...data,
                                current_balance: data.initial_balance || 0
                            });
                        }
                        refresh();
                    }}
                    accounts={accounts}
                />

                <AddCategoryModal
                    isOpen={isAddCategoryModalOpen}
                    onClose={() => {
                        setIsAddCategoryModalOpen(false);
                        setSelectedCategory(null);
                    }}
                    initialData={selectedCategory}
                    onSuccess={async (data) => {
                        if (selectedCategory?.id) {
                            await updateCategory(selectedCategory.id, data);
                        } else {
                            await addCategory(data);
                        }
                        refresh();
                    }}
                />

                {/* Payment Modal */}
                {isPaymentModalOpen && transactionToPay && (
                    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-[60] p-4 animate-in fade-in duration-200">
                        <div className="bg-white/95 backdrop-blur-xl border border-white/60 w-full max-w-md rounded-[32px] shadow-2xl overflow-hidden transform transition-all scale-100 flex flex-col animate-in zoom-in-95 duration-200">
                            {/* Header */}
                            <div className={`px-8 py-6 flex items-center justify-between ${transactionToPay.type === 'INCOME' ? 'bg-emerald-600' : 'bg-red-600'}`}>
                                <div>
                                    <h2 className="text-white font-black text-2xl flex items-center gap-3">
                                        <CheckCircle2 size={28} />
                                        Liquidar
                                    </h2>
                                    <p className="text-white/80 text-sm font-medium mt-1">
                                        Confirme o pagamento deste lançamento
                                    </p>
                                </div>
                                <button
                                    onClick={() => {
                                        setIsPaymentModalOpen(false);
                                        setTransactionToPay(null);
                                        setPaymentAmount('');
                                    }}
                                    className="p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-all"
                                >
                                    <X size={24} />
                                </button>
                            </div>

                            <div className="p-8 space-y-6">
                                {/* Description Preview */}
                                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Referente a</p>
                                    <p className="text-slate-700 font-bold text-lg leading-tight">{transactionToPay.description}</p>
                                </div>

                                {/* Amounts Grid */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Valor Total</p>
                                        <p className={`text-lg font-black ${transactionToPay.type === 'INCOME' ? 'text-emerald-600' : 'text-red-600'}`}>
                                            {formatCurrency(transactionToPay.amount)}
                                        </p>
                                    </div>
                                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Restante</p>
                                        <p className="text-lg font-black text-slate-700">
                                            {formatCurrency(Number(transactionToPay.amount) - (transactionToPay.paid_amount || 0))}
                                        </p>
                                    </div>
                                </div>

                                {/* Payment Input */}
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Valor a Pagar Agora</label>
                                    <div className="relative">
                                        <div className="absolute left-5 top-1/2 -translate-y-1/2 font-bold text-slate-400">R$</div>
                                        <input
                                            type="number"
                                            value={paymentAmount}
                                            onChange={(e) => setPaymentAmount(e.target.value)}
                                            className="w-full pl-12 pr-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all font-black text-2xl text-slate-700"
                                            placeholder="0.00"
                                            step="0.01"
                                            min="0"
                                        />
                                    </div>
                                </div>

                                {/* Account Selection */}
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Conta / Banco</label>
                                    <div className="relative">
                                        <Wallet className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                        <select
                                            value={selectedPaymentAccount}
                                            onChange={(e) => setSelectedPaymentAccount(e.target.value)}
                                            className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all font-bold text-slate-700 appearance-none"
                                        >
                                            {accounts.map(acc => (
                                                <option key={acc.id} value={acc.id}>
                                                    {acc.name} ({formatCurrency(acc.current_balance)})
                                                </option>
                                            ))}
                                        </select>
                                        <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                    </div>
                                </div>

                                {/* Action Buttons */}
                                <div className="pt-2">
                                    <button
                                        onClick={async () => {
                                            if (!paymentAmount) return;

                                            // 1. Sanitize input (replace comma with dot for cross-browser safety)
                                            // Even with type="number", value usage can vary.
                                            const sanitizedAmount = String(paymentAmount).replace(',', '.');
                                            const payVal = Number(sanitizedAmount);

                                            if (isNaN(payVal) || payVal <= 0) {
                                                alert('Por favor, insira um valor válido.');
                                                return;
                                            }

                                            const totalAmount = Number(transactionToPay.amount);
                                            const alreadyPaid = Number(transactionToPay.paid_amount || 0);
                                            const remaining = totalAmount - alreadyPaid; // use this for capping check

                                            // Check for overpayment logic if desired, or just cap it
                                            // For now, we stick to the cap logic but ensure correct numbers

                                            const newTotalPaid = alreadyPaid + payVal;

                                            try {
                                                if (transactionToPay.id === 'temp-pay') {
                                                    // Cadastro dinâmico da fatura do cartão
                                                    // Quando é um pagamento de fatura "temp-pay", o addTransaction já cria o registro PAGO no banco.
                                                    // Não precisamos chamar updateTransactionStatus para a ID "temp-pay" pois ela não existe no banco.
                                                    await addTransaction({
                                                        description: transactionToPay.description,
                                                        amount: payVal,
                                                        type: 'EXPENSE',
                                                        status: 'PAID',
                                                        due_date: transactionToPay.due_date,
                                                        payment_date: new Date().toISOString().split('T')[0],
                                                        account_id: selectedPaymentAccount,
                                                        category_id: transactionToPay.category_id || categories.find(c => c.type === 'EXPENSE')?.id || null as any,
                                                    });

                                                    const m = (transactionToPay as any).custom_invoice_month;
                                                    const y = (transactionToPay as any).custom_invoice_year;
                                                    const cId = (transactionToPay as any).custom_card_id;

                                                    const itemsToClose = transactions.filter(t => {
                                                        if (t.account_id !== cId) return false;
                                                        if (t.status === 'PAID') return false;
                                                        const date = new Date(t.due_date);
                                                        return date.getMonth() === m && date.getFullYear() === y;
                                                    });

                                                    // Use Promise.all to make it faster
                                                    await Promise.all(itemsToClose.map(item =>
                                                        updateTransactionStatus(item.id, 'PAID', cId, Number(item.amount))
                                                    ));
                                                } else {
                                                    if (newTotalPaid >= totalAmount) {
                                                        // Liquidar total
                                                        await updateTransactionStatus(transactionToPay.id, 'PAID', selectedPaymentAccount, totalAmount);
                                                    } else {
                                                        // Parcial
                                                        await updateTransactionStatus(transactionToPay.id, 'PARTIAL', selectedPaymentAccount, newTotalPaid);
                                                    }
                                                }

                                                setIsPaymentModalOpen(false);
                                                setTransactionToPay(null);
                                                setPaymentAmount('');
                                                refresh(); // Refresh list to update UI
                                            } catch (error) {
                                                console.error("Erro ao processar pagamento:", error);
                                                alert("Erro ao processar o pagamento. Verifique se os dados estão corretos.");
                                            }
                                        }}
                                        className={`w-full py-4 text-white font-bold rounded-2xl transition-all shadow-lg transform hover:-translate-y-1 ${transactionToPay.type === 'INCOME'
                                            ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200'
                                            : 'bg-red-600 hover:bg-red-700 shadow-red-200'
                                            }`}
                                    >
                                        Confirmar Pagamento
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* PIX Modal */}
                {isPixModalOpen && transactionForPix && (
                    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-[60] p-4 animate-in fade-in duration-200">
                        <div className="bg-white/95 backdrop-blur-xl border border-white/60 w-full max-w-sm rounded-[32px] shadow-2xl overflow-hidden transform transition-all scale-100 flex flex-col animate-in zoom-in-95 duration-200">
                            <div className="px-8 py-6 bg-indigo-600 flex items-center justify-between">
                                <div>
                                    <h2 className="text-white font-black text-2xl flex items-center gap-3">
                                        <QrCode size={28} />
                                        Cobrar via PIX
                                    </h2>
                                </div>
                                <button
                                    onClick={() => {
                                        setIsPixModalOpen(false);
                                        setTransactionForPix(null);
                                    }}
                                    className="p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-all"
                                >
                                    <X size={24} />
                                </button>
                            </div>

                            <div className="p-8 space-y-6 flex flex-col items-center text-center">
                                <div className="w-full bg-slate-50 p-4 rounded-2xl border border-slate-100 mb-2">
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Referente a</p>
                                    <p className="text-slate-700 font-bold text-lg leading-tight">{transactionForPix.description}</p>
                                    <p className="text-2xl font-black text-emerald-600 mt-2">{formatCurrency(Number(transactionForPix.amount) - (transactionForPix.paid_amount || 0))}</p>
                                </div>

                                <div className="bg-white p-4 border-2 border-slate-100 rounded-3xl shadow-sm inline-block">
                                    <img src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=00020101021126580014br.gov.bcb.pix0136%7B${transactionForPix.id}%7D5204000053039865405${(Number(transactionForPix.amount) - (transactionForPix.paid_amount || 0)).toFixed(2)}5802BR5915COMISSONE TESTE6009SAO_PAULO62070503***6304`} alt="QR Code PIX" className="w-48 h-48 rounded-xl opacity-90" />
                                </div>
                                <p className="text-xs text-slate-500 font-medium max-w-[250px]">
                                    Escaneie o QR Code com o app do seu banco para pagar, ou use o Pix Copia e Cola abaixo.
                                </p>

                                <div className="w-full">
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 text-left">PIX Copia e Cola (Demonstração)</label>
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="text"
                                            readOnly
                                            value={`00020101021126580014br.gov.bcb.pix0136${transactionForPix.id}5204000053039865405${(Number(transactionForPix.amount) - (transactionForPix.paid_amount || 0)).toFixed(2)}5802BR5915COMISSONE TESTE6009SAO_PAULO62070503***6304`}
                                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-mono text-xs text-slate-500 truncate"
                                        />
                                        <button 
                                            onClick={() => alert('Código PIX copiado!')}
                                            className="p-3 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-xl transition-all font-bold"
                                            title="Copiar código"
                                        >
                                            <Copy size={18} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                <div className={activeTab === 'transactions' ? 'block' : 'hidden'}>
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">

                        {/* --- DASHBOARD CARDS (M3 Premium Layout) --- */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6 mb-10">
                            {/* Vencidos */}
                            <button
                                onClick={() => setActiveQuickFilter(activeQuickFilter === 'OVERDUE' ? 'ALL' : 'OVERDUE')}
                                className={`group p-6 rounded-[32px] border transition-all duration-300 flex flex-col items-center text-center relative overflow-hidden ${
                                    activeQuickFilter === 'OVERDUE' 
                                    ? 'bg-m3-error-container border-m3-error/30 ring-2 ring-m3-error/20 shadow-lg scale-[1.02]' 
                                    : 'bg-m3-surface-container-low border-m3-outline-variant/30 hover:border-m3-error/40 hover:shadow-md'
                                }`}
                            >
                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 transition-colors ${activeQuickFilter === 'OVERDUE' ? 'bg-m3-error text-white' : 'bg-m3-error/10 text-m3-error'}`}>
                                    <span className="material-symbols-outlined text-2xl font-variation-fill">event_busy</span>
                                </div>
                                <p className="text-[10px] font-black text-m3-on-surface-variant uppercase tracking-[0.2em] mb-1 opacity-60">Vencidos</p>
                                <span className="text-xl font-black text-m3-on-surface tracking-tighter">
                                    {formatCurrency(stats.valOverdue)}
                                </span>
                            </button>

                            {/* Vence Hoje */}
                            <button
                                onClick={() => setActiveQuickFilter(activeQuickFilter === 'TODAY' ? 'ALL' : 'TODAY')}
                                className={`group p-6 rounded-[32px] border transition-all duration-300 flex flex-col items-center text-center relative overflow-hidden ${
                                    activeQuickFilter === 'TODAY' 
                                    ? 'bg-m3-primary-container border-m3-primary/30 ring-2 ring-m3-primary/20 shadow-lg scale-[1.02]' 
                                    : 'bg-m3-surface-container-low border-m3-outline-variant/30 hover:border-m3-primary/40 hover:shadow-md'
                                }`}
                            >
                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 transition-colors ${activeQuickFilter === 'TODAY' ? 'bg-m3-primary text-white' : 'bg-m3-primary/10 text-m3-primary'}`}>
                                    <span className="material-symbols-outlined text-2xl">today</span>
                                </div>
                                <p className="text-[10px] font-black text-m3-on-surface-variant uppercase tracking-[0.2em] mb-1 opacity-60">Vencem hoje</p>
                                <span className="text-xl font-black text-m3-on-surface tracking-tighter">
                                    {formatCurrency(stats.valToday)}
                                </span>
                            </button>

                            {/* A Vencer */}
                            <button
                                onClick={() => setActiveQuickFilter(activeQuickFilter === 'FUTURE' ? 'ALL' : 'FUTURE')}
                                className={`group p-6 rounded-[32px] border transition-all duration-300 flex flex-col items-center text-center relative overflow-hidden ${
                                    activeQuickFilter === 'FUTURE' 
                                    ? 'bg-m3-secondary-container border-m3-secondary/30 ring-2 ring-m3-secondary/20 shadow-lg scale-[1.02]' 
                                    : 'bg-m3-surface-container-low border-m3-outline-variant/30 hover:border-m3-secondary/40 hover:shadow-md'
                                }`}
                            >
                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 transition-colors ${activeQuickFilter === 'FUTURE' ? 'bg-m3-secondary text-white' : 'bg-m3-secondary/10 text-m3-secondary'}`}>
                                    <span className="material-symbols-outlined text-2xl">event_upcoming</span>
                                </div>
                                <p className="text-[10px] font-black text-m3-on-surface-variant uppercase tracking-[0.2em] mb-1 opacity-60">A vencer</p>
                                <span className="text-xl font-black text-m3-on-surface tracking-tighter">
                                    {formatCurrency(stats.valFuture)}
                                </span>
                            </button>

                            {/* Pagos */}
                            <button
                                onClick={() => setActiveQuickFilter(activeQuickFilter === 'PAID' ? 'ALL' : 'PAID')}
                                className={`group p-6 rounded-[32px] border transition-all duration-300 flex flex-col items-center text-center relative overflow-hidden ${
                                    activeQuickFilter === 'PAID' 
                                    ? 'bg-emerald-100 border-emerald-500/30 ring-2 ring-emerald-500/20 shadow-lg scale-[1.02]' 
                                    : 'bg-m3-surface-container-low border-m3-outline-variant/30 hover:border-emerald-500/40 hover:shadow-md'
                                }`}
                            >
                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 transition-colors ${activeQuickFilter === 'PAID' ? 'bg-emerald-600 text-white' : 'bg-emerald-50/50 text-emerald-600'}`}>
                                    <span className="material-symbols-outlined text-2xl font-variation-fill">check_circle</span>
                                </div>
                                <p className="text-[10px] font-black text-m3-on-surface-variant uppercase tracking-[0.2em] mb-1 opacity-60">Pagos</p>
                                <span className="text-xl font-black text-m3-on-surface tracking-tighter">
                                    {formatCurrency(stats.valPaid)}
                                </span>
                            </button>

                            {/* Total do Período */}
                            <div className="p-6 rounded-[32px] border border-m3-outline-variant/30 bg-m3-surface-container-low flex flex-col items-center justify-center text-center shadow-sm relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-24 h-24 bg-m3-primary/5 rounded-full -mr-8 -mt-8" />
                                <div className="w-12 h-12 rounded-2xl bg-m3-primary/10 text-m3-primary flex items-center justify-center mb-4">
                                    <span className="material-symbols-outlined text-2xl">account_balance_wallet</span>
                                </div>
                                <div className="flex items-center gap-1 mb-1">
                                    <p className="text-[10px] font-black text-m3-on-surface-variant uppercase tracking-[0.2em] opacity-60">Saldo Período</p>
                                    <div className="text-m3-on-surface-variant/40 cursor-help" title="Saldo líquido (Receitas - Despesas)">
                                        <span className="material-symbols-outlined text-xs">info</span>
                                    </div>
                                </div>
                                <span className={`text-xl font-black tracking-tighter ${stats.totalBalance < 0 ? 'text-m3-error' : 'text-m3-primary'}`}>
                                    {formatCurrency(stats.totalBalance)}
                                </span>
                            </div>
                        </div>

                        {/* Filters Bar (M3 Premium Redesign) */}
                        <div className="bg-m3-surface-container-low rounded-[32px] p-2 border border-m3-outline-variant/30 shadow-sm mb-10 flex flex-col divide-y divide-m3-outline-variant/10">
                            {/* Top Row: Search & Tabs */}
                            <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-2 p-2">
                                <div className="relative flex-1 group">
                                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-m3-on-surface-variant/40 group-focus-within:text-m3-primary transition-colors">search</span>
                                    <input
                                        type="text"
                                        placeholder="Buscar transação, contato ou descrição..."
                                        className="w-full pl-12 pr-6 py-3.5 bg-m3-surface-container-high/50 border border-transparent rounded-[24px] outline-none focus:bg-white focus:border-m3-primary/30 focus:ring-4 focus:ring-m3-primary/5 text-sm font-medium transition-all placeholder:text-m3-on-surface-variant/30"
                                        value={searchTerm}
                                        onChange={e => setSearchTerm(e.target.value)}
                                    />
                                </div>

                                <div className="flex items-center bg-m3-surface-container-high/60 p-1 rounded-[24px] border border-m3-outline-variant/10 self-start lg:self-auto">
                                    {[
                                        { id: 'ALL', label: 'Todos', icon: 'list' },
                                        { id: 'INCOME', label: 'Receitas', icon: 'trending_up', activeClass: 'bg-emerald-600 text-white shadow-lg shadow-emerald-200/50' },
                                        { id: 'EXPENSE', label: 'Despesas', icon: 'trending_down', activeClass: 'bg-m3-error text-white shadow-lg shadow-red-200/50' }
                                    ].map((t) => (
                                        <button
                                            key={t.id}
                                            onClick={() => setFilterType(t.id as any)}
                                            className={`flex items-center gap-2 px-5 py-2.5 rounded-[20px] text-xs font-black uppercase tracking-widest transition-all ${filterType === t.id 
                                                ? (t.activeClass || 'bg-white text-m3-on-surface shadow-sm') 
                                                : 'text-m3-on-surface-variant opacity-60 hover:opacity-100 hover:bg-white/40'}`}
                                        >
                                            <span className="material-symbols-outlined text-lg">{t.icon}</span>
                                            {t.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Bottom Row: Dates & Secondary Filters */}
                            <div className="flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-4 p-2 pt-3">
                                <div className="flex flex-wrap items-center gap-3">
                                    {/* Month Selector */}
                                    <div className={`flex items-center bg-m3-surface-container-high/60 border border-m3-outline-variant/10 rounded-[20px] p-1 transition-all ${(startDate || endDate) ? 'opacity-40 grayscale pointer-events-none' : ''}`}>
                                        <button
                                            onClick={() => { setStartDate(''); setEndDate(''); handlePrevMonth(); }}
                                            className="w-8 h-8 flex items-center justify-center hover:bg-white rounded-full text-m3-on-surface-variant transition-all hover:shadow-sm"
                                        >
                                            <span className="material-symbols-outlined text-xl">chevron_left</span>
                                        </button>
                                        <div className="px-4 flex flex-col items-center min-w-[140px]">
                                            <span className="text-[10px] font-black text-m3-on-surface uppercase tracking-[0.15em]">{currentMonthLabel}</span>
                                        </div>
                                        <button
                                            onClick={() => { setStartDate(''); setEndDate(''); handleNextMonth(); }}
                                            className="w-8 h-8 flex items-center justify-center hover:bg-white rounded-full text-m3-on-surface-variant transition-all hover:shadow-sm"
                                        >
                                            <span className="material-symbols-outlined text-xl">chevron_right</span>
                                        </button>
                                    </div>

                                    <div className="hidden sm:block w-px h-6 bg-m3-outline-variant/20 mx-1"></div>

                                    {/* Custom Range */}
                                    <div className="flex items-center gap-2 bg-m3-surface-container-high/60 border border-m3-outline-variant/10 rounded-[20px] px-4 py-1.5 h-[42px]">
                                        <span className="material-symbols-outlined text-m3-on-surface-variant/40 text-lg">calendar_month</span>
                                        <input
                                            type="date"
                                            value={startDate}
                                            onChange={(e) => setStartDate(e.target.value)}
                                            className="bg-transparent border-none text-[10px] font-black text-m3-on-surface outline-none w-24 uppercase p-0"
                                        />
                                        <span className="text-[8px] font-black text-m3-on-surface-variant/30 uppercase tracking-widest px-1">até</span>
                                        <input
                                            type="date"
                                            value={endDate}
                                            onChange={(e) => setEndDate(e.target.value)}
                                            className="bg-transparent border-none text-[10px] font-black text-m3-on-surface outline-none w-24 uppercase p-0"
                                        />
                                    </div>
                                </div>

                                <div className="flex flex-wrap items-center gap-3">
                                    <div className="relative">
                                        <select
                                            className="bg-m3-surface-container-high/60 border border-m3-outline-variant/10 rounded-[20px] pl-5 pr-10 py-2.5 text-[10px] font-black uppercase tracking-widest text-m3-on-surface-variant outline-none focus:ring-4 focus:ring-m3-primary/5 transition-all appearance-none cursor-pointer"
                                            value={filterStatus}
                                            onChange={(e: any) => setFilterStatus(e.target.value)}
                                        >
                                            <option value="ALL">Status: Todos</option>
                                            <option value="PENDING">Em Aberto</option>
                                            <option value="PARTIAL">Pago Parcial</option>
                                            <option value="PAID">Liquidado</option>
                                        </select>
                                        <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-m3-on-surface-variant pointer-events-none text-lg">unfold_more</span>
                                    </div>

                                    <div className="w-px h-6 bg-m3-outline-variant/20 mx-1"></div>

                                    {(filterStatus !== 'ALL' || searchTerm !== '' || startDate !== '' || activeQuickFilter !== 'ALL' || filterType !== 'ALL') && (
                                        <button
                                            onClick={() => {
                                                setFilterType('ALL');
                                                setFilterStatus('ALL');
                                                setSearchTerm('');
                                                setStartDate('');
                                                setEndDate('');
                                                setActiveQuickFilter('ALL');
                                            }}
                                            className="h-[42px] px-6 rounded-[20px] bg-m3-error/10 text-m3-error text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-m3-error/20 transition-all group"
                                        >
                                            <span className="material-symbols-outlined text-lg group-hover:rotate-90 transition-transform">close</span>
                                            Limpar Filtros
                                        </button>
                                    )}

                                    <button className="h-[42px] px-6 rounded-[20px] text-m3-on-surface-variant/60 hover:text-m3-primary hover:bg-m3-primary/5 text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all">
                                        <span className="material-symbols-outlined text-lg">file_download</span>
                                        Exportar
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Transactions Table */}
                        <div className="bg-m3-surface-container-low rounded-[32px] border border-m3-outline-variant/30 shadow-sm overflow-hidden">
                            <table className="w-full border-collapse">
                                <thead>
                                    <tr className="bg-m3-surface-container/30 border-b border-m3-outline-variant/10">
                                        <th className="px-6 py-5 text-left">
                                            <div className="flex items-center justify-center w-5 h-5 rounded border border-m3-outline-variant opacity-30"></div>
                                        </th>
                                        <th className="px-6 py-5 text-left text-[10px] font-black text-m3-on-surface-variant uppercase tracking-[0.2em]">Vencimento</th>
                                        <th className="px-6 py-5 text-left text-[10px] font-black text-m3-on-surface-variant uppercase tracking-[0.2em]">Liquidado em</th>
                                        <th className="px-6 py-5 text-left text-[10px] font-black text-m3-on-surface-variant uppercase tracking-[0.2em]">Descrição / Categoria</th>
                                        <th className="px-6 py-5 text-left text-[10px] font-black text-m3-on-surface-variant uppercase tracking-[0.2em]">Favorecido</th>
                                        <th className="px-6 py-5 text-right text-[10px] font-black text-m3-on-surface-variant uppercase tracking-[0.2em]">Valor Total</th>
                                        <th className="px-6 py-5 text-center text-[10px] font-black text-m3-on-surface-variant uppercase tracking-[0.2em]">Situação</th>
                                        <th className="px-6 py-5 text-right text-[10px] font-black text-m3-on-surface-variant uppercase tracking-[0.2em]">Ações</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {loading ? (
                                        <tr><td colSpan={8} className="px-6 py-20 text-center text-m3-on-surface-variant/40 font-black uppercase tracking-widest text-[10px]">Carregando dados financeiros...</td></tr>
                                    ) : filteredTransactions.length === 0 ? (
                                        <tr><td colSpan={8} className="px-6 py-20 text-center text-m3-on-surface-variant/40 font-black uppercase tracking-widest text-[10px]">Nenhum lançamento encontrado para os filtros.</td></tr>
                                    ) : (
                                        filteredTransactions.map((item) => (
                                            <tr key={item.id} className="hover:bg-m3-surface-container-high/40 transition-all duration-200 group border-b border-m3-outline-variant/5 last:border-0">
                                                <td className="px-6 py-5">
                                                    <div className="w-5 h-5 rounded border border-m3-outline-variant/30 group-hover:border-m3-primary/50 transition-colors"></div>
                                                </td>
                                                <td className="px-6 py-5">
                                                    <div className="text-sm font-bold text-m3-on-surface">{formatDate(item.due_date)}</div>
                                                </td>
                                                <td className="px-6 py-5">
                                                    <div className="text-[11px] font-black text-m3-on-surface-variant/50 uppercase tracking-wider">
                                                        {item.payment_date ? formatDate(item.payment_date) : '—'}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-5">
                                                    <div className="flex flex-col gap-1.5">
                                                        <div className="flex items-center gap-2">
                                                            {item.description.includes('(') && <span className="material-symbols-outlined text-sm text-m3-on-surface-variant/40">history</span>}
                                                            <span className="text-sm font-black text-m3-on-surface leading-snug">{item.description}</span>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-m3-surface-container text-m3-on-surface-variant uppercase tracking-widest">{item.category_name}</span>
                                                            {item.account_name && <span className="text-[9px] font-bold text-m3-on-surface-variant/40 uppercase tracking-widest flex items-center gap-1.5"><span className="w-1 h-1 rounded-full bg-m3-on-surface-variant/20"></span> {item.account_name}</span>}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-5">
                                                    <div className="text-[11px] font-black text-m3-on-surface-variant/70 uppercase tracking-widest">
                                                        {item.contact_name || '—'}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-5 text-right">
                                                    <div className="flex flex-col items-end">
                                                        {(item.status === 'PARTIAL' || (item.status === 'PENDING' && Number(item.paid_amount) > 0)) ? (
                                                            <>
                                                                <div className={`text-sm font-black ${item.type === 'INCOME' ? 'text-emerald-600' : 'text-m3-error'}`}>
                                                                    {item.type === 'INCOME' ? '+' : '-'} {formatCurrency(Number(item.amount) - (item.paid_amount || 0))}
                                                                </div>
                                                                <div className="text-[9px] text-m3-on-surface-variant/40 font-black uppercase tracking-widest mt-0.5 line-through">
                                                                    Total: {formatCurrency(item.amount)}
                                                                </div>
                                                            </>
                                                        ) : (
                                                            <div className={`text-sm font-black ${item.type === 'INCOME' ? 'text-emerald-600' : 'text-m3-error'}`}>
                                                                {item.type === 'INCOME' ? '+' : '-'} {formatCurrency(item.amount)}
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-5">
                                                    <div className="flex justify-center">
                                                        {item.status === 'PAID' ? (
                                                            <span className="px-3 py-1 rounded-full bg-emerald-100/50 text-emerald-700 text-[9px] font-black uppercase tracking-widest border border-emerald-200/50 flex items-center gap-1.5">
                                                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Liquidado
                                                            </span>
                                                        ) : item.status === 'PENDING' ? (
                                                            <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border flex items-center gap-1.5 ${
                                                                new Date(item.due_date) < new Date() && !item.payment_date 
                                                                ? 'bg-m3-error-container/30 text-m3-error border-m3-error/20' 
                                                                : 'bg-amber-100/50 text-amber-700 border-amber-200/50'
                                                            }`}>
                                                                <span className={`w-1.5 h-1.5 rounded-full ${new Date(item.due_date) < new Date() && !item.payment_date ? 'bg-m3-error' : 'bg-amber-500'}`}></span>
                                                                {new Date(item.due_date) < new Date() && !item.payment_date ? 'Vencido' : 'Em Aberto'}
                                                            </span>
                                                        ) : (
                                                            <span className="px-3 py-1 rounded-full bg-sky-100/50 text-sky-700 text-[9px] font-black uppercase tracking-widest border border-sky-200/50 flex items-center gap-1.5">
                                                                <span className="w-1.5 h-1.5 rounded-full bg-sky-500 shadow-[0_0_5px_rgba(14,165,233,0.5)]"></span> Parcial
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-5 text-right">
                                                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-x-2 group-hover:translate-x-0">
                                                        {item.status === 'PAID' ? (
                                                            <button
                                                                onClick={() => reopenTransaction(item.id)}
                                                                title="Reabrir Lançamento"
                                                                className="w-9 h-9 flex items-center justify-center text-m3-primary hover:bg-m3-primary/10 rounded-xl transition-all"
                                                            >
                                                                <span className="material-symbols-outlined text-lg">history</span>
                                                            </button>
                                                        ) : (
                                                            <>
                                                                <button
                                                                    onClick={() => {
                                                                        setTransactionToPay(item);
                                                                        const remaining = Number(item.amount) - (item.paid_amount || 0);
                                                                        setPaymentAmount(remaining.toString());
                                                                        setSelectedPaymentAccount(item.account_id || (accounts.length > 0 ? accounts[0].id : ''));
                                                                        setIsPaymentModalOpen(true);
                                                                    }}
                                                                    title="Liquidar Lançamento"
                                                                    className="w-9 h-9 flex items-center justify-center text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all"
                                                                >
                                                                    <span className="material-symbols-outlined text-lg">check_circle</span>
                                                                </button>
                                                                {item.type === 'INCOME' && (
                                                                    <button
                                                                        onClick={() => {
                                                                            setTransactionForPix(item);
                                                                            setIsPixModalOpen(true);
                                                                        }}
                                                                        title="Gerar Cobrança PIX"
                                                                        className="w-9 h-9 flex items-center justify-center text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                                                                    >
                                                                        <span className="material-symbols-outlined text-lg">qr_code</span>
                                                                    </button>
                                                                )}
                                                                <button
                                                                    onClick={() => openEditModal(item)}
                                                                    title="Editar Lançamento"
                                                                    className="w-9 h-9 flex items-center justify-center text-m3-on-surface-variant hover:bg-m3-surface-container rounded-xl transition-all"
                                                                >
                                                                    <span className="material-symbols-outlined text-lg">edit</span>
                                                                </button>
                                                                <button
                                                                    onClick={() => {
                                                                        setTransactionToDelete(item);
                                                                        setIsDeleteModalOpen(true);
                                                                    }}
                                                                    title="Excluir Lançamento"
                                                                    className="w-9 h-9 flex items-center justify-center text-m3-error hover:bg-m3-error/10 rounded-xl transition-all"
                                                                >
                                                                    <span className="material-symbols-outlined text-lg">delete</span>
                                                                </button>
                                                            </>
                                                        )}
                                                        <button className="w-9 h-9 flex items-center justify-center text-m3-on-surface-variant opacity-40 hover:opacity-100 hover:bg-m3-surface-container rounded-xl transition-all">
                                                            <span className="material-symbols-outlined text-lg">more_vert</span>
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* --- FOOTER SUMMARY (M3 Premium Design) --- */}
                        <div className="bg-m3-surface-container-low rounded-[32px] p-8 border border-m3-outline-variant/30 shadow-sm mt-8 flex flex-col lg:flex-row justify-between items-center gap-8">
                            <div className="text-center lg:text-left">
                                <h4 className="text-sm font-black text-m3-on-surface uppercase tracking-[0.2em] mb-1 opacity-60">Consolidado</h4>
                                <p className="text-lg font-black text-m3-on-surface tracking-tighter">
                                    {startDate && endDate ? `${formatDate(startDate)} a ${formatDate(endDate)}` : 'Geral do Período'}
                                </p>
                            </div>

                            <div className="flex flex-wrap justify-center gap-6">
                                {/* Entradas */}
                                <div className="bg-white/5 px-8 pt-4 pb-5 rounded-3xl border border-m3-outline-variant/10 flex flex-col items-center min-w-[160px] shadow-sm">
                                    <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3">
                                        <span className="material-symbols-outlined text-base">trending_up</span>
                                    </div>
                                    <span className="text-[10px] font-black text-m3-on-surface-variant/50 uppercase tracking-widest mb-1.5">Entradas</span>
                                    <span className="text-xl font-black text-emerald-600 tracking-tighter">
                                        {formatCurrency(filteredTransactions.filter(t => t.type === 'INCOME').reduce((acc, t) => acc + Number(t.amount), 0))}
                                    </span>
                                </div>

                                {/* Saídas */}
                                <div className="bg-white/5 px-8 pt-4 pb-5 rounded-3xl border border-m3-outline-variant/10 flex flex-col items-center min-w-[160px] shadow-sm">
                                    <div className="w-8 h-8 rounded-xl bg-m3-error/10 text-m3-error flex items-center justify-center mb-3">
                                        <span className="material-symbols-outlined text-base">trending_down</span>
                                    </div>
                                    <span className="text-[10px] font-black text-m3-on-surface-variant/50 uppercase tracking-widest mb-1.5">Saídas</span>
                                    <span className="text-xl font-black text-m3-error tracking-tighter">
                                        {formatCurrency(filteredTransactions.filter(t => t.type === 'EXPENSE').reduce((acc, t) => acc + Number(t.amount), 0))}
                                    </span>
                                </div>

                                {/* Saldo Final */}
                                <div className="bg-m3-primary/5 px-10 pt-4 pb-5 rounded-3xl border border-m3-primary/10 flex flex-col items-center min-w-[200px] shadow-md relative overflow-hidden">
                                    <div className="absolute top-0 right-0 w-16 h-16 bg-m3-primary/5 rounded-full -mr-6 -mt-6"></div>
                                    <div className="w-10 h-10 rounded-2xl bg-m3-primary text-white flex items-center justify-center mb-3 shadow-lg shadow-m3-primary/20">
                                        <span className="material-symbols-outlined text-xl font-variation-fill">account_balance</span>
                                    </div>
                                    <span className="text-[10px] font-black text-m3-primary uppercase tracking-[0.2em] mb-1.5">Saldo Líquido</span>
                                    <span className={`text-2xl font-black tracking-tighter ${filteredTransactions.reduce((acc, t) => acc + (t.type === 'INCOME' ? Number(t.amount) : -Number(t.amount)), 0) < 0 ? 'text-m3-error' : 'text-m3-primary'}`}>
                                        {formatCurrency(filteredTransactions.reduce((acc, t) => acc + (t.type === 'INCOME' ? Number(t.amount) : -Number(t.amount)), 0))}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className={activeTab === 'categories' ? 'block' : 'hidden'}>
                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="bg-m3-surface-container-low rounded-[32px] p-8 border border-m3-outline-variant/30 flex justify-between items-center shadow-sm">
                            <div className="flex flex-col">
                                <h3 className="text-xl font-black text-m3-on-surface flex items-center gap-3">
                                    <span className="material-symbols-outlined text-m3-primary text-2xl">label</span> Gerenciar Categorias
                                </h3>
                                <p className="text-[10px] font-black text-m3-on-surface-variant/40 uppercase tracking-[0.2em] mt-1">Organize seus lançamentos por tipo e centro de custo</p>
                            </div>
                            <div className="flex gap-4">
                                <button
                                    onClick={handleGenerateDefaultCategories}
                                    disabled={isGeneratingCategories}
                                    className="flex items-center gap-2 bg-m3-surface-container-high text-m3-on-surface px-6 py-3 rounded-[16px] text-xs font-black transition-all hover:bg-m3-surface-container-highest border border-m3-outline-variant/20"
                                >
                                    {isGeneratingCategories ? <span className="material-symbols-outlined animate-spin text-lg">refresh</span> : <span className="material-symbols-outlined text-lg">magic_button</span>}
                                    Gerar Padrão
                                </button>
                                <button
                                    onClick={() => {
                                        setSelectedCategory(null);
                                        setIsAddCategoryModalOpen(true);
                                    }}
                                    className="flex items-center gap-2 bg-m3-primary text-white px-6 py-3 rounded-[16px] text-xs font-black transition-all hover:bg-m3-primary/90 shadow-lg shadow-m3-primary/20"
                                >
                                    <span className="material-symbols-outlined text-lg">add</span> Nova Categoria
                                </button>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {/* Income Categories */}
                            <div className="bg-m3-surface-container-low rounded-[32px] p-8 border border-m3-outline-variant/30 shadow-sm relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full -mr-12 -mt-12"></div>
                                <h4 className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Receitas
                                </h4>
                                <div className="space-y-2">
                                    {categories.filter(c => c.type === 'INCOME').length === 0 ? (
                                        <p className="text-xs text-m3-on-surface-variant/40 font-black uppercase tracking-widest py-10 text-center">Nenhuma categoria de receita</p>
                                    ) : (
                                        categories.filter(c => c.type === 'INCOME').map(cat => (
                                            <div key={cat.id} className="flex items-center justify-between p-4 hover:bg-white rounded-2xl transition-all group border border-transparent hover:border-emerald-100/50 hover:shadow-sm">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-sm" style={{ backgroundColor: `${cat.color}15`, color: cat.color }}>
                                                        <span className="material-symbols-outlined text-xl">label</span>
                                                    </div>
                                                    <span className="text-sm font-black text-m3-on-surface">{cat.name}</span>
                                                </div>
                                                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
                                                    <button
                                                        onClick={() => {
                                                            setSelectedCategory(cat);
                                                            setIsAddCategoryModalOpen(true);
                                                        }}
                                                        className="w-10 h-10 flex items-center justify-center text-m3-on-surface-variant hover:bg-m3-surface-container-high rounded-xl transition-all"
                                                        title="Editar"
                                                    >
                                                        <span className="material-symbols-outlined text-lg">edit</span>
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            if (confirm(`Excluir categoria "${cat.name}"?`)) {
                                                                deleteCategory(cat.id);
                                                            }
                                                        }}
                                                        className="w-10 h-10 flex items-center justify-center text-m3-error hover:bg-m3-error/10 rounded-xl transition-all"
                                                        title="Excluir"
                                                    >
                                                        <span className="material-symbols-outlined text-lg">delete</span>
                                                    </button>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>

                            {/* Expense Categories */}
                            <div className="bg-m3-surface-container-low rounded-[32px] p-8 border border-m3-outline-variant/30 shadow-sm relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-24 h-24 bg-m3-error/5 rounded-full -mr-12 -mt-12"></div>
                                <h4 className="text-[10px] font-black text-m3-error uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-m3-error"></span> Despesas
                                </h4>
                                <div className="space-y-2">
                                    {categories.filter(c => c.type === 'EXPENSE').length === 0 ? (
                                        <p className="text-xs text-m3-on-surface-variant/40 font-black uppercase tracking-widest py-10 text-center">Nenhuma categoria de despesa</p>
                                    ) : (
                                        categories.filter(c => c.type === 'EXPENSE').map(cat => (
                                            <div key={cat.id} className="flex items-center justify-between p-4 hover:bg-white rounded-2xl transition-all group border border-transparent hover:border-m3-error/10 hover:shadow-sm">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-sm" style={{ backgroundColor: `${cat.color}15`, color: cat.color }}>
                                                        <span className="material-symbols-outlined text-xl">label</span>
                                                    </div>
                                                    <span className="text-sm font-black text-m3-on-surface">{cat.name}</span>
                                                </div>
                                                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
                                                    <button
                                                        onClick={() => {
                                                            setSelectedCategory(cat);
                                                            setIsAddCategoryModalOpen(true);
                                                        }}
                                                        className="w-10 h-10 flex items-center justify-center text-m3-on-surface-variant hover:bg-m3-surface-container-high rounded-xl transition-all"
                                                        title="Editar"
                                                    >
                                                        <span className="material-symbols-outlined text-lg">edit</span>
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            if (confirm(`Excluir categoria "${cat.name}"?`)) {
                                                                deleteCategory(cat.id);
                                                            }
                                                        }}
                                                        className="w-10 h-10 flex items-center justify-center text-m3-error hover:bg-m3-error/10 rounded-xl transition-all"
                                                        title="Excluir"
                                                    >
                                                        <span className="material-symbols-outlined text-lg">delete</span>
                                                    </button>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className={activeTab === 'accounts' ? 'block' : 'hidden'}>
                    {selectedAccount ? (
                        <AccountDetails
                            account={selectedAccount}
                            transactions={transactions.filter(t => t.account_id === selectedAccount.id)}
                            allTransactions={transactions}
                            categories={categories}
                            accounts={accounts}
                            currentUser={currentUser}
                            importLogs={importLogs}
                            contacts={contacts}
                            onBack={() => setSelectedAccount(null)}
                            onAddTransaction={() => openModal('EXPENSE')} // Could be improved to pre-select account
                            onImport={() => {/* This will be handled inside AccountDetails */ }}
                            updateTransactionStatus={updateTransactionStatus}
                            addTransaction={addTransaction}
                            addImportLog={addImportLog}
                            updateImportLog={updateImportLog}
                            deleteImportLog={deleteImportLog}
                        />
                    ) : (
                        <AccountsView
                            accounts={accounts}
                            transactions={transactions}
                            loading={loading}
                            onNewAccount={() => {
                                setSelectedAccount(null);
                                setIsAddAccountModalOpen(true);
                            }}
                            onEditAccount={(acc) => {
                                setSelectedAccount(acc);
                                setIsAddAccountModalOpen(true);
                            }}
                            onDeleteAccount={(acc) => {
                                deleteAccount(acc.id);
                                refresh();
                            }}
                            onSelectAccount={(acc) => setSelectedAccount(acc)}
                            onShowReconciliation={() => {
                                const bank = accounts.find(a => a.type === 'BANK');
                                if (bank) setSelectedAccount(bank);
                                else if (accounts.length > 0) setSelectedAccount(accounts[0]);
                                setActiveTab('accounts');
                            }}
                        />
                    )}
                </div>


                <div className={activeTab === 'cards' ? 'block' : 'hidden'}>
                    <CreditCardManagement
                        accounts={accounts}
                        transactions={transactions}
                        categories={categories}
                        selectedAccountId={selectedAccount?.id || ''}
                        onSelectAccount={(id) => {
                            const acc = accounts.find(a => a.id === id);
                            if (acc) setSelectedAccount(acc);
                        }}
                        onAddExpense={(accountId) => {
                            if (accountId) setSelectedAccountForNewTransaction(accountId);
                            openModal('EXPENSE');
                        }}
                        onAddCard={() => {
                            setSelectedAccount(null);
                            setIsAddAccountModalOpen(true);
                        }}
                        onExport={() => alert('Exportando lançamentos...')}
                        onPayInvoice={(accountId, amount, month, year) => {
                            const cardAcc = accounts.find(a => a.id === accountId);
                            const targetAccId = cardAcc?.linked_account_id || accounts.find(a => a.type === 'BANK')?.id || '';

                            setTransactionToPay({
                                id: 'temp-pay',
                                description: `PAGAMENTO FATURA - ${cardAcc?.name}`,
                                amount: amount,
                                type: 'EXPENSE',
                                status: 'PENDING',
                                due_date: new Date().toISOString().split('T')[0],
                                account_id: targetAccId, // Pay FROM bank account
                                agency_id: currentUser.agency_id,
                                category_id: '',
                                custom_invoice_month: month,
                                custom_invoice_year: year,
                                custom_card_id: accountId
                            } as any);
                            setPaymentAmount(amount.toString());
                            setSelectedPaymentAccount(targetAccId);
                            setIsPaymentModalOpen(true);
                        }}
                        onReopenInvoice={async (accountId, month, year) => {
                            if (confirm('Deseja reabrir esta fatura? Isso voltará os lançamentos deste mês para "Em Aberto". O pagamento gerado na conta bancária não será excluído automaticamente.')) {
                                const itemsToReopen = transactions.filter(t => {
                                    if (t.account_id !== accountId) return false;
                                    if (t.status !== 'PAID') return false;
                                    const date = new Date(t.due_date);
                                    return date.getMonth() === month && date.getFullYear() === year;
                                });

                                try {
                                    await Promise.all(itemsToReopen.map(item =>
                                        updateTransactionStatus(item.id, 'PENDING', accountId)
                                    ));
                                    refresh();
                                    alert('Fatura reaberta com sucesso.');
                                } catch (e) {
                                    alert('Erro ao reabrir fatura.');
                                }
                            }
                        }}
                        onEditCard={(account) => {
                            setSelectedAccount(account);
                            setIsAddAccountModalOpen(true);
                        }}
                        onDeleteCard={(account) => {
                            if (confirm(`Deseja excluir o cartão ${account.name}? Isso não excluirá os lançamentos vinculados.`)) {
                                deleteAccount(account.id);
                                refresh();
                            }
                        }}
                        onEditTransaction={(transaction) => {
                            openEditModal(transaction);
                        }}
                        onDeleteTransaction={(transaction) => {
                            setTransactionToDelete(transaction);
                            setIsDeleteModalOpen(true);
                        }}
                    />
                </div>

                <div className={activeTab === 'contacts' ? 'block' : 'hidden'}>
                    <FinancialContacts 
                        contacts={contacts} 
                        onAdd={addContact}
                        onUpdate={updateContact}
                        onDelete={deleteContact}
                    />
                </div>
            </main>
        </div>
    );
};

export default Financial;
