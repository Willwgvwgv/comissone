import React, { useState, useMemo, useEffect } from 'react';
import {
    Plus, Search, ArrowUpCircle, ArrowDownCircle, AlertCircle,
    CheckCircle2, MoreVertical, Download, Wallet, Tags, Landmark,
    ChevronDown, Trash2, Edit2, RotateCcw, X, Upload, RefreshCw
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
import CreditCardManagement from './financial/CreditCardManagement';
import AccountsView from './financial/AccountsView';

// --- MOCK DATA FOR UI DEVELOPMENT (Remove after backend integration) ---
// const MOCK_TRANSACTIONS = ... (Removed in favor of using hook data)

interface FinancialProps {
    currentUser: User;
    initialTab?: 'overview' | 'transactions' | 'accounts' | 'categories' | 'reconciliation' | 'cards' | 'importacao';
}

const Financial: React.FC<FinancialProps> = ({ currentUser, initialTab = 'transactions' }) => {
    const [activeTab, setActiveTab] = useState<'overview' | 'transactions' | 'accounts' | 'categories' | 'reconciliation' | 'cards' | 'importacao'>(initialTab);

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

    // Global Date Filter State
    const [currentDate, setCurrentDate] = useState(new Date());

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
        transactions, categories, accounts, loading,
        updateTransactionStatus, deleteTransaction, addTransaction,
        reopenTransaction,
        addAccount, updateAccount, deleteAccount,
        addCategory, updateCategory, deleteCategory,
        refresh,
        confirmImport // Added confirmImport from useFinancial
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
        const months = [];
        // Show 6 months before and 5 months after selected date
        for (let i = -6; i <= 5; i++) {
            const d = new Date(currentDate.getFullYear(), currentDate.getMonth() + i, 1);
            months.push(d);
        }

        return months.map(date => {
            const m = date.getMonth();
            const y = date.getFullYear();
            const label = date.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }).replace('.', '');
            const isSelected = m === currentMonth && y === currentYear;

            // Filter transactions for this specific month/year
            const monthTrans = transactions.filter(t => {
                const [ty, tm, td] = t.due_date.split('-').map(Number);
                return (tm - 1) === m && ty === y;
            });

            const income = monthTrans
                .filter(t => t.type === 'INCOME')
                .reduce((acc, t) => acc + Number(t.amount), 0);

            const expense = monthTrans
                .filter(t => t.type === 'EXPENSE')
                .reduce((acc, t) => acc + Number(t.amount), 0);

            const balance = income - expense;

            return {
                name: label.charAt(0).toUpperCase() + label.slice(1),
                Receitas: income,
                Despesas: expense,
                Saldo: balance,
                originalDate: date,
                isSelected
            };
        });
    }, [transactions, currentDate]);
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
            data = data.filter(t => t.description.toLowerCase().includes(searchTerm.toLowerCase()));
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
            <header className="h-20 bg-white border-b border-slate-100 flex items-center justify-between px-8 shrink-0 z-10">
                <div>
                    <h1 className="header-title">Financeiro</h1>
                    <p className="header-subtitle">Gestão de caixa, contas e categorias</p>
                </div>

                <div className="flex items-center gap-2">
                    {activeTab === 'transactions' && (
                        <>
                            <button
                                onClick={() => openModal('INCOME')}
                                className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-xs font-bold shadow-sm transition-all"
                            >
                                <Plus size={14} /> Nova Receita
                            </button>
                            <button
                                onClick={() => openModal('EXPENSE')}
                                className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-xs font-bold shadow-sm transition-all"
                            >
                                <Plus size={14} /> Nova Despesa
                            </button>
                        </>
                    )}
                </div>
            </header>

            <main className="flex-1 overflow-y-auto p-8 relative">
                {activeTab === 'overview' && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        {/* Financial Health Chart */}
                        <div className="card-base border-none">
                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                                <div>
                                    <h3 className="text-xl font-black text-slate-800 flex items-center gap-2">
                                        Movimentação Financeira
                                    </h3>
                                    <p className="text-slate-400 text-sm font-medium">
                                        Receitas vs Despesas ({currentMonthLabel})
                                    </p>
                                </div>
                                <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-xl border border-slate-100">
                                    {['Diário', 'Semanal', 'Mensal'].map((period) => (
                                        <button
                                            key={period}
                                            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${period === 'Diário' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400 hover:text-slate-600 hover:underline'
                                                }`}
                                        >
                                            {period}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="h-[300px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                        <XAxis
                                            dataKey="name"
                                            axisLine={false}
                                            tickLine={false}
                                            tick={{ fill: '#64748b', fontSize: 12 }}
                                            dy={10}
                                        />
                                        <YAxis
                                            axisLine={false}
                                            tickLine={false}
                                            tick={{ fill: '#64748b', fontSize: 12 }}
                                            tickFormatter={(value) => `R$${value / 1000}k`}
                                        />
                                        <Tooltip
                                            contentStyle={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                            formatter={(value: number) => formatCurrency(value)}
                                            cursor={{ fill: '#f8fafc' }}
                                        />
                                        <Bar dataKey="Receitas" fill="#2563eb" radius={[6, 6, 0, 0]} barSize={32} />
                                        <Bar dataKey="Despesas" fill="#93c5fd" radius={[6, 6, 0, 0]} barSize={32} />
                                        <ReferenceLine y={0} stroke="#e2e8f0" />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Next Payables & Receivables Grid */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Next Payables */}
                            <div className="card-base border-none">
                                <div className="flex items-center justify-between mb-6">
                                    <h3 className="text-sm font-black text-slate-700 flex items-center gap-2 uppercase tracking-widest">
                                        <ArrowDownCircle className="text-red-500" size={18} /> CONTAS A PAGAR (PRÓXIMAS)
                                    </h3>
                                    <div className="relative group">
                                        <button className="flex items-center gap-2 bg-slate-50 hover:bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 transition-all">
                                            {currentDate.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }).replace('.', '').charAt(0).toUpperCase() + currentDate.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }).replace('.', '').slice(1)}
                                            <ChevronDown size={14} className="text-slate-400" />
                                        </button>
                                        <div className="absolute right-0 top-full mt-2 bg-white border border-slate-100 shadow-xl rounded-2xl p-2 hidden group-hover:block z-20 min-w-[150px] animate-in fade-in zoom-in-95 duration-200">
                                            <button onClick={handlePrevMonth} className="w-full text-left px-3 py-2 hover:bg-slate-50 hover:underline transition-all rounded-lg text-xs font-medium text-slate-600">Mês Anterior</button>
                                            <button onClick={handleNextMonth} className="w-full text-left px-3 py-2 hover:bg-slate-50 hover:underline transition-all rounded-lg text-xs font-medium text-slate-600">Próximo Mês</button>
                                        </div>
                                    </div>
                                </div>
                                {nextPayables.length === 0 ? (
                                    <p className="text-slate-400 text-sm py-4">Nenhuma conta pendente.</p>
                                ) : (
                                    <div className="space-y-3">
                                        {nextPayables.map(item => (
                                            <div key={item.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                                                <div>
                                                    <p className="font-semibold text-slate-700 text-sm">{item.description}</p>
                                                    <p className="text-xs text-slate-500">{formatDate(item.due_date)}</p>
                                                </div>
                                                <span className="font-bold text-red-600 text-sm">- {formatCurrency(item.amount)}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Next Receivables */}
                            <div className="card-base border-none">
                                <div className="flex items-center justify-between mb-6">
                                    <h3 className="text-sm font-black text-slate-700 flex items-center gap-2 uppercase tracking-widest">
                                        <ArrowUpCircle className="text-emerald-500" size={18} /> CONTAS A RECEBER (PRÓXIMAS)
                                    </h3>
                                    <div className="relative group">
                                        <button className="flex items-center gap-2 bg-slate-50 hover:bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 transition-all">
                                            {currentDate.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }).replace('.', '').charAt(0).toUpperCase() + currentDate.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }).replace('.', '').slice(1)}
                                            <ChevronDown size={14} className="text-slate-400" />
                                        </button>
                                        <div className="absolute right-0 top-full mt-2 bg-white border border-slate-100 shadow-xl rounded-2xl p-2 hidden group-hover:block z-20 min-w-[150px] animate-in fade-in zoom-in-95 duration-200">
                                            <button onClick={handlePrevMonth} className="w-full text-left px-3 py-2 hover:bg-slate-50 hover:underline transition-all rounded-lg text-xs font-medium text-slate-600">Mês Anterior</button>
                                            <button onClick={handleNextMonth} className="w-full text-left px-3 py-2 hover:bg-slate-50 hover:underline transition-all rounded-lg text-xs font-medium text-slate-600">Próximo Mês</button>
                                        </div>
                                    </div>
                                </div>
                                {nextReceivables.length === 0 ? (
                                    <p className="text-slate-400 text-sm py-4">Nenhum recebimento pendente.</p>
                                ) : (
                                    <div className="space-y-3">
                                        {nextReceivables.map(item => (
                                            <div key={item.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                                                <div>
                                                    <p className="font-semibold text-slate-700 text-sm">{item.description}</p>
                                                    <p className="text-xs text-slate-500">{formatDate(item.due_date)}</p>
                                                </div>
                                                <span className="font-bold text-emerald-600 text-sm">+ {formatCurrency(item.amount)}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
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
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4 animate-in fade-in duration-200">
                        <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden transform transition-all scale-100 flex flex-col animate-in zoom-in-95 duration-200">
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


                {activeTab === 'transactions' && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">

                        {/* --- DASHBOARD CARDS (Clean White Layout) --- */}
                        {/* --- DASHBOARD CARDS (Clean White Layout) --- */}
                        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
                            {/* Vencidos */}
                            <button
                                onClick={() => setActiveQuickFilter(activeQuickFilter === 'OVERDUE' ? 'ALL' : 'OVERDUE')}
                                className={`p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col items-center justify-center text-center transition-all ${activeQuickFilter === 'OVERDUE' ? 'bg-red-50 ring-2 ring-red-100' : 'bg-white hover:border-red-200'}`}
                            >
                                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Vencidos</p>
                                <span className={`text-xl font-black text-red-600`}>
                                    {formatCurrency(stats.valOverdue)}
                                </span>
                            </button>

                            {/* Vence Hoje */}
                            <button
                                onClick={() => setActiveQuickFilter(activeQuickFilter === 'TODAY' ? 'ALL' : 'TODAY')}
                                className={`p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col items-center justify-center text-center transition-all ${activeQuickFilter === 'TODAY' ? 'bg-orange-50 ring-2 ring-orange-100' : 'bg-white hover:border-orange-200'}`}
                            >
                                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Vencem hoje</p>
                                <span className={`text-xl font-black text-orange-600`}>
                                    {formatCurrency(stats.valToday)}
                                </span>
                            </button>

                            {/* A Vencer */}
                            <button
                                onClick={() => setActiveQuickFilter(activeQuickFilter === 'FUTURE' ? 'ALL' : 'FUTURE')}
                                className={`p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col items-center justify-center text-center transition-all ${activeQuickFilter === 'FUTURE' ? 'bg-blue-50 ring-2 ring-blue-100' : 'bg-white hover:border-blue-200'}`}
                            >
                                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">A vencer</p>
                                <span className={`text-xl font-black text-blue-600`}>
                                    {formatCurrency(stats.valFuture)}
                                </span>
                            </button>

                            {/* Pagos */}
                            <button
                                onClick={() => setActiveQuickFilter(activeQuickFilter === 'PAID' ? 'ALL' : 'PAID')}
                                className={`p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col items-center justify-center text-center transition-all ${activeQuickFilter === 'PAID' ? 'bg-emerald-50 ring-2 ring-emerald-100' : 'bg-white hover:border-emerald-200'}`}
                            >
                                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Pagos</p>
                                <span className={`text-xl font-black text-emerald-600`}>
                                    {formatCurrency(stats.valPaid)}
                                </span>
                            </button>

                            {/* Total do Período */}
                            <div className="p-6 rounded-2xl border border-blue-100 bg-blue-50/30 shadow-sm flex flex-col items-center justify-center text-center">
                                <div className="flex items-center gap-1 mb-2">
                                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Total do período</p>
                                    <div className="text-slate-400 cursor-help" title="Saldo líquido (Receitas - Despesas)">
                                        <AlertCircle size={12} />
                                    </div>
                                </div>
                                <span className={`text-xl font-black ${stats.totalBalance < 0 ? 'text-red-600' : 'text-blue-600'}`}>
                                    {formatCurrency(stats.totalBalance)}
                                </span>
                            </div>
                        </div>


                        {/* Filters Bar */}
                        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col lg:flex-row gap-4 lg:items-center justify-between">
                            <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
                                <div className="relative flex-1 lg:flex-none lg:w-64">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
                                    <input
                                        type="text"
                                        placeholder="Buscar lançamentos..."
                                        className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-100 text-sm"
                                        value={searchTerm}
                                        onChange={e => setSearchTerm(e.target.value)}
                                    />
                                </div>

                                <div className="flex items-center bg-slate-100 p-1 rounded-xl">
                                    <button
                                        onClick={() => setFilterType('ALL')}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${filterType === 'ALL' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'}`}
                                    >
                                        Todos
                                    </button>
                                    <button
                                        onClick={() => setFilterType('INCOME')}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${filterType === 'INCOME' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500'}`}
                                    >
                                        Receitas
                                    </button>
                                    <button
                                        onClick={() => setFilterType('EXPENSE')}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${filterType === 'EXPENSE' ? 'bg-white text-red-600 shadow-sm' : 'text-slate-500'}`}
                                    >
                                        Despesas
                                    </button>
                                </div>

                                {/* Date range and Month selector inputs */}
                                <div className="flex flex-wrap items-center gap-2 bg-slate-100 p-1 rounded-xl">
                                    {/* Month Navigator as part of the flow */}
                                    <div className={`flex items-center bg-white border border-slate-200 rounded-lg p-0.5 ${(startDate || endDate) ? 'opacity-40 grayscale pointer-events-none' : ''}`}>
                                        <button
                                            onClick={() => {
                                                setStartDate('');
                                                setEndDate('');
                                                handlePrevMonth();
                                            }}
                                            className="p-1 hover:bg-slate-50 text-slate-500 rounded-md transition-all"
                                        >
                                            <ChevronDown className="rotate-90" size={12} />
                                        </button>
                                        <div className="px-2 flex flex-col items-center min-w-[100px]">
                                            <span className="text-[10px] font-black text-slate-700 uppercase tracking-tight">{currentMonthLabel}</span>
                                        </div>
                                        <button
                                            onClick={() => {
                                                setStartDate('');
                                                setEndDate('');
                                                handleNextMonth();
                                            }}
                                            className="p-1 hover:bg-slate-50 text-slate-500 rounded-md transition-all"
                                        >
                                            <ChevronDown className="-rotate-90" size={12} />
                                        </button>
                                    </div>

                                    <div className="w-px h-4 bg-slate-200 mx-1 hidden sm:block"></div>

                                    <div className="flex items-center gap-1">
                                        <input
                                            type="date"
                                            value={startDate}
                                            onChange={(e) => setStartDate(e.target.value)}
                                            className="bg-transparent border-none text-[11px] font-bold text-slate-600 outline-none px-1 py-1 w-28 uppercase"
                                        />
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Até</span>
                                        <input
                                            type="date"
                                            value={endDate}
                                            onChange={(e) => setEndDate(e.target.value)}
                                            className="bg-transparent border-none text-[11px] font-bold text-slate-600 outline-none px-1 py-1 w-28 uppercase"
                                        />
                                        {(startDate || endDate) && (
                                            <button
                                                onClick={() => { setStartDate(''); setEndDate(''); }}
                                                className="p-1 text-slate-400 hover:text-red-500 transition-colors"
                                                title="Limpar período personalizado"
                                            >
                                                <X size={14} />
                                            </button>
                                        )}
                                    </div>
                                </div>

                                <select
                                    className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all appearance-none pr-10"
                                    value={filterStatus}
                                    onChange={(e: any) => setFilterStatus(e.target.value)}
                                >
                                    <option value="ALL">Status: Todos</option>
                                    <option value="PENDING">Em Aberto</option>
                                    <option value="PARTIAL">Pago Parcial</option>
                                    <option value="PAID">Liquidado</option>
                                </select>
                            </div>

                            <button className="flex items-center gap-2 text-slate-500 hover:text-blue-600 font-semibold text-sm px-4 py-2 hover:bg-blue-50 rounded-lg transition-colors">
                                <Download size={18} /> Exportar
                            </button>
                        </div>

                        {/* Transactions Table */}
                        <div className="card-base border-none p-0 overflow-hidden">
                            <table className="table-base">
                                <thead>
                                    <tr className="bg-slate-50 border-b border-slate-100 text-xs font-bold text-slate-500 uppercase tracking-wider">
                                        <th className="px-6 py-4">
                                            <input type="checkbox" className="rounded border-slate-300 text-blue-600 focus:ring-blue-200" />
                                        </th>
                                        <th className="px-6 py-4">Vencimento</th>
                                        <th className="px-6 py-4">Paga... <AlertCircle size={12} className="inline ml-1 opacity-50 cursor-help" /></th>
                                        <th className="px-6 py-4">Descrição</th>
                                        <th className="px-6 py-4 text-right">Valor (R$)</th>
                                        <th className="px-6 py-4 text-center">Situação</th>
                                        <th className="px-6 py-4 text-right">Ações</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {loading ? (
                                        <tr><td colSpan={8} className="px-6 py-12 text-center text-slate-500">Carregando dados financeiros...</td></tr>
                                    ) : filteredTransactions.length === 0 ? (
                                        <tr><td colSpan={8} className="px-6 py-12 text-center text-slate-400">Nenhum lançamento encontrado para os filtros.</td></tr>
                                    ) : (
                                        filteredTransactions.map((item) => (
                                            <tr key={item.id} className="hover:bg-slate-50/50 transition-colors group">
                                                <td className="px-6 py-4">
                                                    <input type="checkbox" className="rounded border-slate-300 text-blue-600 focus:ring-blue-200" />
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="text-sm font-medium text-slate-700">{formatDate(item.due_date)}</div>
                                                </td>
                                                <td className="px-6 py-4 text-xs font-semibold text-slate-400">
                                                    {item.payment_date ? formatDate(item.payment_date) : '-'}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex flex-col">
                                                        <div className="flex items-center gap-2">
                                                            {item.description.includes('(') && <RotateCcw size={12} className="text-slate-400 font-bold" />}
                                                            <span className="text-sm font-semibold text-slate-800">{item.description}</span>
                                                        </div>
                                                        <div className="flex items-center gap-2 mt-1">
                                                            <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-500 font-bold uppercase tracking-wider">{item.category_name}</span>
                                                            {item.account_name && <span className="text-[10px] text-slate-400 font-medium">| {item.account_name}</span>}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    {(item.status === 'PARTIAL' || (item.status === 'PENDING' && Number(item.paid_amount) > 0)) ? (
                                                        <>
                                                            <div className={`text-sm font-black ${item.type === 'INCOME' ? 'text-emerald-600' : 'text-red-600'}`}>
                                                                {item.type === 'INCOME' ? '+' : '-'} {formatCurrency(Number(item.amount) - (item.paid_amount || 0))}
                                                            </div>
                                                            <div className="text-[10px] text-slate-400 font-bold mt-1 line-through decoration-slate-400">
                                                                Total: {formatCurrency(item.amount)}
                                                            </div>
                                                        </>
                                                    ) : (
                                                        <div className={`text-sm font-black ${item.type === 'INCOME' ? 'text-emerald-600' : 'text-red-600'}`}>
                                                            {item.type === 'INCOME' ? '+' : '-'} {formatCurrency(item.amount)}
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex justify-center">
                                                        {item.status === 'PAID' && (
                                                            <span className="status-badge status-success">Liquidado</span>
                                                        )}
                                                        {item.status === 'PENDING' && (
                                                            <span className="status-badge status-warning">Em Aberto</span>
                                                        )}
                                                        {item.status === 'PARTIAL' && (
                                                            <span className="status-badge status-info">Pago Parcial</span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        {item.status === 'PAID' ? (
                                                            <button
                                                                onClick={() => reopenTransaction(item.id)}
                                                                title="Reabrir Lançamento"
                                                                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors shadow-sm bg-white"
                                                            >
                                                                <RotateCcw size={16} />
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
                                                                    className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors shadow-sm bg-white"
                                                                >
                                                                    <CheckCircle2 size={16} />
                                                                </button>
                                                                <button
                                                                    onClick={() => openEditModal(item)}
                                                                    title="Editar Lançamento"
                                                                    className="p-2 text-slate-400 hover:bg-slate-50 rounded-lg transition-colors"
                                                                >
                                                                    <Edit2 size={16} />
                                                                </button>
                                                                <button
                                                                    onClick={() => {
                                                                        setTransactionToDelete(item);
                                                                        setIsDeleteModalOpen(true);
                                                                    }}
                                                                    title="Excluir Lançamento"
                                                                    className="p-2 text-slate-400 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors"
                                                                >
                                                                    <Trash2 size={16} />
                                                                </button>
                                                            </>
                                                        )}
                                                        <button className="p-2 text-slate-400 hover:bg-slate-50 rounded-lg transition-colors">
                                                            <MoreVertical size={16} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* --- FOOTER SUMMARY --- */}
                        <div className="card-base border-none flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mt-4">
                            <div>
                                <h4 className="text-lg font-black text-slate-800">Total do período</h4>
                                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">
                                    {startDate && endDate ? `${formatDate(startDate)} a ${formatDate(endDate)}` : 'Consolidado do Período'}
                                </p>
                            </div>

                            <div className="flex flex-wrap items-center gap-8 bg-slate-50 px-6 py-4 rounded-xl border border-slate-100">
                                <div className="flex flex-col items-center px-4 border-r border-slate-200">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Entradas</span>
                                    <span className="text-base font-black text-emerald-600">
                                        {formatCurrency(filteredTransactions.filter(t => t.type === 'INCOME').reduce((acc, t) => acc + Number(t.amount), 0))}
                                    </span>
                                </div>
                                <div className="flex flex-col items-center px-4 border-r border-slate-200">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Saídas</span>
                                    <span className="text-base font-black text-red-600">
                                        {formatCurrency(filteredTransactions.filter(t => t.type === 'EXPENSE').reduce((acc, t) => acc + Number(t.amount), 0))}
                                    </span>
                                </div>
                                <div className="flex flex-col items-center px-4">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Saldo do Período</span>
                                    <span className={`text-xl font-black ${filteredTransactions.reduce((acc, t) => acc + (t.type === 'INCOME' ? Number(t.amount) : -Number(t.amount)), 0) < 0 ? 'text-red-600' : 'text-blue-600'}`}>
                                        {formatCurrency(filteredTransactions.reduce((acc, t) => acc + (t.type === 'INCOME' ? Number(t.amount) : -Number(t.amount)), 0))}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'categories' && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="card-base border-slate-100 flex justify-between items-center mb-6">
                            <h3 className="text-lg font-bold text-slate-700 flex items-center gap-2">
                                <Tags className="text-blue-600" /> Gerenciar Categorias
                            </h3>
                            <div className="flex gap-3">
                                <button
                                    onClick={handleGenerateDefaultCategories}
                                    disabled={isGeneratingCategories}
                                    className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-600 px-4 py-2 rounded-xl font-bold transition-all"
                                >
                                    {isGeneratingCategories ? <RefreshCw className="animate-spin" size={18} /> : <ArrowDownCircle size={18} />}
                                    Gerar Categorias Padrão
                                </button>
                                <button
                                    onClick={() => {
                                        setSelectedCategory(null);
                                        setIsAddCategoryModalOpen(true);
                                    }}
                                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl font-bold transition-all shadow-lg shadow-blue-200"
                                >
                                    <Plus size={18} /> Nova Categoria
                                </button>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {/* Income Categories */}
                            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                                <h4 className="text-sm font-bold text-emerald-600 uppercase tracking-wider mb-4 border-b border-slate-100 pb-2">Receitas</h4>
                                <div className="space-y-2">
                                    {categories.filter(c => c.type === 'INCOME').map(cat => (
                                        <div key={cat.id} className="flex items-center justify-between p-3 hover:bg-slate-50 rounded-lg transition-colors group">
                                            <div className="flex items-center gap-3">
                                                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color }}></div>
                                                <span className="font-medium text-slate-700">{cat.name}</span>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <button
                                                    onClick={() => {
                                                        setSelectedCategory(cat);
                                                        setIsAddCategoryModalOpen(true);
                                                    }}
                                                    className="text-slate-300 hover:text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity p-2 rounded-lg hover:bg-white"
                                                    title="Editar"
                                                >
                                                    <Edit2 size={14} />
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        if (confirm(`Excluir categoria "${cat.name}"?`)) {
                                                            deleteCategory(cat.id);
                                                        }
                                                    }}
                                                    className="text-slate-300 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity p-2 rounded-lg hover:bg-white"
                                                    title="Excluir"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Expense Categories */}
                            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                                <h4 className="text-sm font-bold text-red-600 uppercase tracking-wider mb-4 border-b border-slate-100 pb-2">Despesas</h4>
                                <div className="space-y-2">
                                    {categories.filter(c => c.type === 'EXPENSE').map(cat => (
                                        <div key={cat.id} className="flex items-center justify-between p-3 hover:bg-slate-50 rounded-lg transition-colors group">
                                            <div className="flex items-center gap-3">
                                                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color }}></div>
                                                <span className="font-medium text-slate-700">{cat.name}</span>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <button
                                                    onClick={() => {
                                                        setSelectedCategory(cat);
                                                        setIsAddCategoryModalOpen(true);
                                                    }}
                                                    className="text-slate-300 hover:text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity p-2 rounded-lg hover:bg-white"
                                                    title="Editar"
                                                >
                                                    <Edit2 size={14} />
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        if (confirm(`Excluir categoria "${cat.name}"?`)) {
                                                            deleteCategory(cat.id);
                                                        }
                                                    }}
                                                    className="text-slate-300 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity p-2 rounded-lg hover:bg-white"
                                                    title="Excluir"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'accounts' && (
                    selectedAccount ? (
                        <AccountDetails
                            account={selectedAccount}
                            transactions={transactions.filter(t => t.account_id === selectedAccount.id)}
                            categories={categories}
                            accounts={accounts}
                            onBack={() => setSelectedAccount(null)}
                            onAddTransaction={() => openModal('EXPENSE')} // Could be improved to pre-select account
                            onImport={() => {/* This will be handled inside AccountDetails */ }}
                            updateTransactionStatus={updateTransactionStatus}
                            addTransaction={addTransaction}
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
                        />
                    )
                )}

                {activeTab === 'importacao' && (
                    <StatementImport
                        accounts={accounts}
                        transactions={transactions}
                        categories={categories}
                        onConfirm={async (accId, filename, size, hash, txns) => {
                            await confirmImport(accId, filename, size, hash, txns);
                            setActiveTab('reconciliation');
                        }}
                    />
                )}

                {activeTab === 'reconciliation' && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
                            <div className="flex items-center gap-4">
                                <div className="bg-blue-600 p-3 rounded-2xl text-white shadow-lg shadow-blue-100">
                                    <RefreshCw size={24} />
                                </div>
                                <div>
                                    <h2 className="text-xl font-black text-slate-800 tracking-tight">Conciliação Bancária</h2>
                                    <p className="text-slate-500 font-medium text-xs">Vincule os lançamentos do seu extrato com o sistema</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-3">
                                <select
                                    className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all appearance-none pr-10"
                                    value={selectedAccountForReconciliation}
                                    onChange={(e) => setSelectedAccountForReconciliation(e.target.value)}
                                >
                                    {accounts.filter(a => a.type === 'BANK').map(acc => (
                                        <option key={acc.id} value={acc.id}>{acc.name}</option>
                                    ))}
                                </select>
                                <button
                                    onClick={() => setActiveTab('importacao')}
                                    className="px-6 py-2.5 bg-blue-600 text-white text-xs font-black rounded-xl shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all uppercase tracking-widest flex items-center gap-2"
                                >
                                    <Upload size={16} /> Nova Importação
                                </button>
                            </div>
                        </div>

                        {transactions.some(t => t.account_id === selectedAccountForReconciliation && t.import_id !== null && t.status === 'PENDING') ? (
                            <AccountReconciliation
                                account={currentAccountForRecon}
                                importedTransactions={transactions
                                    .filter(t => t.account_id === selectedAccountForReconciliation && t.import_id !== null && t.status === 'PENDING')
                                    .map(t => ({
                                        id: t.id,
                                        date: t.due_date,
                                        description: t.description,
                                        amount: Number(t.amount),
                                        type: t.type as 'INCOME' | 'EXPENSE',
                                        fitid: t.bank_txn_id
                                    }))
                                }
                                systemTransactions={transactions.filter(t => t.account_id === selectedAccountForReconciliation && t.import_id === null)}
                                categories={categories}
                                accounts={accounts}
                                onConfirmMatch={handleConfirmMatch}
                                onIgnore={async (id) => await deleteTransaction(id)}
                                onCreateNew={async (imp) => {
                                    const success = await handleCreateNew(imp);
                                    if (success) {
                                        await deleteTransaction(imp.id);
                                    }
                                }}
                                onTransfer={handleTransfer}
                            />
                        ) : (
                            <div className="bg-white rounded-3xl border border-dashed border-slate-300 p-24 text-center">
                                <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6 text-slate-300">
                                    <CheckCircle2 size={40} />
                                </div>
                                <h3 className="text-xl font-black text-slate-800 mb-2">Nenhum lançamento para conciliar</h3>
                                <p className="text-slate-500 max-w-sm mx-auto mb-8 font-medium">Sua conta está em dia! Importe um novo extrato para começar a conciliação.</p>
                                <button
                                    onClick={() => setActiveTab('importacao')}
                                    className="px-10 py-4 bg-slate-900 text-white font-black rounded-2xl hover:bg-black transition-all text-xs uppercase tracking-widest"
                                >
                                    Importar Extrato Bancário
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'cards' && (
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
                )}
            </main>
        </div>
    );
};

export default Financial;
