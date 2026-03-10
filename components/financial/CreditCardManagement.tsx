import React, { useState, useMemo } from 'react';
import {
    CreditCard,
    ChevronRight,
    ChevronLeft,
    ChevronsLeft,
    ChevronsRight,
    Search,
    Filter,
    Download,
    Plus,
    ArrowRightLeft,
    MoreHorizontal,
    Calendar,
    Lock,
    Unlock,
    CreditCard as CardIcon,
    Wallet,
    Info,
    Plane,
    Utensils,
    ShoppingBag,
    Cpu,
    Monitor,
    Trash2,
    Edit2,
    RotateCcw
} from 'lucide-react';
import { FinancialAccount, FinancialTransaction, FinancialCategory } from '../../types';
import { formatCurrency } from '../../src/utils/formatters';

interface CreditCardManagementProps {
    accounts: FinancialAccount[];
    transactions: FinancialTransaction[];
    categories: FinancialCategory[];
    selectedAccountId: string;
    onSelectAccount: (id: string) => void;
    onAddExpense: (accountId?: string) => void;
    onAddCard: () => void;
    onExport: () => void;
    onPayInvoice: (accountId: string, amount: number, month: number, year: number) => void;
    onReopenInvoice: (accountId: string, month: number, year: number) => void;
    onEditCard: (account: FinancialAccount) => void;
    onDeleteCard: (account: FinancialAccount) => void;
    onEditTransaction: (transaction: FinancialTransaction) => void;
    onDeleteTransaction: (transaction: FinancialTransaction) => void;
}

function getBankLogo(name: string) {
    const map: Record<string, string> = {
        itau: 'https://logospng.org/download/itau/logo-itau-256.png',
        bradesco: 'https://logospng.org/download/bradesco/logo-banco-bradesco-256.png',
        santander: 'https://logospng.org/download/santander/logo-santander-256.png',
        'banco do brasil': 'https://logospng.org/download/banco-do-brasil/logo-banco-do-brasil-256.png',
        bb: 'https://logospng.org/download/banco-do-brasil/logo-banco-do-brasil-256.png',
        caixa: 'https://logospng.org/download/caixa-economica-federal/logo-caixa-economica-federal-256.png',
        nubank: 'https://logospng.org/download/nubank/logo-nubank-roxo-256.png',
        inter: 'https://logospng.org/download/banco-inter/logo-banco-inter-256.png',
        c6: 'https://logodepot.com/upfiles/logos/c6-bank-logo-ED29CD8FCB-seeklogo.com.png',
        picpay: 'https://logospng.org/download/picpay/logo-picpay-256.png',
        sicoob: 'https://logospng.org/download/sicoob/logo-sicoob-256.png',
        sicredi: 'https://logospng.org/download/sicredi/logo-sicredi-256.png',
        btg: 'https://logospng.org/download/btg-pactual/logo-btg-pactual-256.png',
        xp: 'https://logospng.org/download/xp-investimentos/logo-xp-investimentos-256.png',
    };
    const lower = name.toLowerCase();
    for (const [key, logo] of Object.entries(map)) {
        if (lower.includes(key)) return logo;
    }
    return null; // Return null if not famous bank
}

const getCategoryIcon = (categoryName?: string) => {
    const name = categoryName?.toLowerCase() || '';
    if (name.includes('viagem')) return <Plane size={18} />;
    if (name.includes('alimentação')) return <Utensils size={18} />;
    if (name.includes('suprimentos') || name.includes('papelaria')) return <ShoppingBag size={18} />;
    if (name.includes('software') || name.includes('cloud')) return <Cpu size={18} />;
    if (name.includes('equipamento')) return <Monitor size={18} />;
    return <Info size={18} />;
};

const CreditCardManagement: React.FC<CreditCardManagementProps> = ({
    accounts,
    transactions,
    categories,
    selectedAccountId,
    onSelectAccount,
    onAddExpense,
    onAddCard,
    onExport,
    onPayInvoice,
    onReopenInvoice,
    onEditCard,
    onDeleteCard,
    onEditTransaction,
    onDeleteTransaction
}) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [statusFilter, setStatusFilter] = useState('ALL');

    const creditAccounts = accounts.filter(acc => acc.type === 'CREDIT_CARD');
    const selectedAccount = accounts.find(acc => acc.id === selectedAccountId) || creditAccounts[0];

    // Months for filter (6 months ahead to 6 months ago)
    const months = useMemo(() => {
        const result = [];
        const now = new Date();
        for (let i = -6; i <= 6; i++) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const monthName = d.toLocaleString('pt-BR', { month: 'short' }).replace('.', '');
            result.push({
                label: `${monthName}/${d.getFullYear()}`,
                month: d.getMonth(),
                year: d.getFullYear()
            });
        }
        return result;
    }, []);

    const filteredTransactions = useMemo(() => {
        return transactions.filter(t => {
            if (t.account_id !== selectedAccount?.id) return false;

            const date = new Date(t.due_date);
            const isSameMonth = date.getMonth() === selectedMonth && date.getFullYear() === selectedYear;
            const matchesSearch = t.description.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesStatus = statusFilter === 'ALL' || t.status === statusFilter;

            return isSameMonth && matchesSearch && matchesStatus;
        });
    }, [transactions, selectedAccount, selectedMonth, selectedYear, searchTerm, statusFilter]);

    const stats = useMemo(() => {
        const currentMonthTotal = filteredTransactions
            .filter(t => t.type === 'EXPENSE')
            .reduce((acc, t) => acc + Number(t.amount), 0);

        // Calculate limit available dynamically based on pending transactions
        const currentBalance = transactions
            .filter(t => t.account_id === selectedAccount?.id && t.type === 'EXPENSE' && t.status !== 'PAID')
            .reduce((acc, t) => acc + Number(t.amount), 0);

        const totalLimit = selectedAccount?.credit_limit || 0;
        const limitAvailable = Math.max(0, totalLimit - currentBalance);
        const limitUsedPct = totalLimit > 0 ? Math.round(((totalLimit - limitAvailable) / totalLimit) * 100) : 0;

        // Calculate previous month total natively
        let prevMonth = selectedMonth - 1;
        let prevMonthYear = selectedYear;
        if (prevMonth < 0) {
            prevMonth = 11;
            prevMonthYear -= 1;
        }

        const prevMonthExpenses = transactions.filter(t => {
            if (t.account_id !== selectedAccount?.id) return false;
            if (t.type !== 'EXPENSE') return false;
            const date = new Date(t.due_date);
            return date.getMonth() === prevMonth && date.getFullYear() === prevMonthYear;
        });

        const lastMonthTotal = prevMonthExpenses.reduce((acc, t) => acc + Number(t.amount), 0);
        const isPrevMonthPaid = prevMonthExpenses.length > 0 && prevMonthExpenses.every(t => t.status === 'PAID');

        let prevMonthDueDate = '';
        if (selectedAccount?.due_day) {
            const d = new Date(prevMonthYear, prevMonth, selectedAccount.due_day);
            prevMonthDueDate = d.toLocaleDateString('pt-BR');
        } else if (prevMonthExpenses.length > 0) {
            prevMonthDueDate = new Date(prevMonthExpenses[0].due_date).toLocaleDateString('pt-BR');
        }

        let currentMonthDueDate = '';
        if (selectedAccount?.due_day) {
            const d = new Date(selectedYear, selectedMonth, selectedAccount.due_day);
            currentMonthDueDate = d.toLocaleDateString('pt-BR');
        }

        let pctChange = 0;
        if (lastMonthTotal > 0) {
            pctChange = Math.round(((currentMonthTotal - lastMonthTotal) / lastMonthTotal) * 100);
        } else if (currentMonthTotal > 0) {
            pctChange = 100;
        }

        return {
            currentMonthTotal,
            lastMonthTotal,
            limitAvailable,
            totalLimit,
            limitUsedPct,
            isPrevMonthPaid,
            prevMonthDueDate,
            currentMonthDueDate,
            pctChange
        };
    }, [filteredTransactions, selectedAccount, transactions, selectedMonth, selectedYear]);

    const isInvoicePaid = useMemo(() => {
        const expenses = filteredTransactions.filter(t => t.type === 'EXPENSE');
        if (expenses.length === 0) return false;
        return expenses.every(t => t.status === 'PAID');
    }, [filteredTransactions]);

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header section */}
            <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm transition-all duration-300 mb-6">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="flex items-center gap-2 text-slate-700 font-semibold">
                        <CreditCard size={18} className="text-blue-600" />
                        <span>Gestão de Cartões de Crédito</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={onExport}
                            className="flex items-center gap-2 px-5 py-2 bg-slate-50 border border-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-100 transition-all shadow-sm text-sm"
                        >
                            <Download size={16} /> Exportar
                        </button>
                        <button
                            onClick={() => onAddExpense(selectedAccount?.id)}
                            className="flex items-center gap-2 px-5 py-2 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-all shadow-md shadow-blue-200 text-sm"
                        >
                            <Plus size={16} /> Novo Gasto
                        </button>
                    </div>
                </div>
            </div>

            {/* Metrics cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm relative overflow-hidden group">
                    <div className="flex justify-between items-start mb-4">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Fatura Atual</p>
                        <div className="p-2 bg-blue-50 text-blue-600 rounded-xl group-hover:scale-110 transition-transform">
                            <CardIcon size={20} />
                        </div>
                    </div>
                    <div className="flex items-baseline gap-3">
                        <h3 className="text-3xl font-black text-slate-800">{formatCurrency(stats.currentMonthTotal)}</h3>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${stats.pctChange > 0 ? 'text-rose-500 bg-rose-50' : 'text-emerald-500 bg-emerald-50'}`}>
                            {stats.pctChange > 0 ? '+' : ''}{stats.pctChange}%
                        </span>
                    </div>
                    <p className="text-xs text-slate-400 font-medium mt-2">Próximo vencimento: {stats.currentMonthDueDate || 'Não definido'}</p>
                </div>

                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm relative overflow-hidden group">
                    <div className="flex justify-between items-start mb-4">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Fatura Fechada</p>
                        <div className="p-2 bg-slate-50 text-slate-400 rounded-xl">
                            {stats.isPrevMonthPaid ? <Lock size={20} /> : <Unlock size={20} className="text-amber-500" />}
                        </div>
                    </div>
                    <div className="flex items-baseline gap-3">
                        <h3 className="text-3xl font-black text-slate-800">{formatCurrency(stats.lastMonthTotal)}</h3>
                    </div>
                    <p className="text-xs text-slate-400 font-medium mt-2">Vencimento: {stats.prevMonthDueDate || 'Não definido'} {stats.isPrevMonthPaid ? '(Pago)' : '(Pendente)'}</p>
                </div>

                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm relative overflow-hidden group">
                    <div className="flex justify-between items-start mb-4">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Limite Disponível</p>
                        <div className="p-2 bg-orange-50 text-orange-600 rounded-xl group-hover:scale-110 transition-transform">
                            <Wallet size={20} />
                        </div>
                    </div>
                    <div className="flex items-baseline gap-3">
                        <h3 className="text-3xl font-black text-slate-800">{formatCurrency(stats.limitAvailable)}</h3>
                        <span className="text-xs font-bold text-rose-500 bg-rose-50 px-2 py-0.5 rounded-full">-{stats.limitUsedPct}%</span>
                    </div>
                    <p className="text-xs text-slate-400 font-medium mt-2">Limite total: {formatCurrency(stats.totalLimit)}</p>
                </div>
            </div>

            {/* Card selector */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                        Selecione o Cartão
                    </h3>
                    <button className="text-xs font-bold text-blue-600 hover:underline">Ver todos os cartões</button>
                </div>
                <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
                    {creditAccounts.map(acc => (
                        <div
                            key={acc.id}
                            onClick={() => onSelectAccount(acc.id)}
                            className={`min-w-[320px] aspect-[1.6/1] rounded-2xl p-6 flex flex-col justify-between cursor-pointer transition-all border ${selectedAccountId === acc.id
                                ? 'bg-slate-900 border-slate-800 shadow-xl'
                                : 'bg-white border-slate-200 shadow-sm hover:border-blue-300'
                                }`}
                        >
                            <div className="flex justify-between items-start">
                                <div className={selectedAccountId === acc.id ? 'text-white' : 'text-slate-800'}>
                                    <p className="text-xs font-bold opacity-60 uppercase tracking-widest mb-1">{acc.name}</p>
                                    <p className="text-lg font-black tracking-[0.2em] uppercase">**** {acc.last_four_digits || acc.name.slice(-4).replace(/\D/g, '') || '0000'}</p>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={(e) => { e.stopPropagation(); onEditCard(acc); }}
                                        className={`p-1.5 rounded-lg transition-colors ${selectedAccountId === acc.id ? 'hover:bg-white/10 text-slate-400 hover:text-white' : 'hover:bg-slate-100 text-slate-400 hover:text-slate-600'}`}
                                    >
                                        <Edit2 size={14} />
                                    </button>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); onDeleteCard(acc); }}
                                        className={`p-1.5 rounded-lg transition-colors ${selectedAccountId === acc.id ? 'hover:bg-red-500/20 text-slate-400 hover:text-red-400' : 'hover:bg-red-50 text-slate-400 hover:text-red-500'}`}
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            </div>

                            <div className="flex justify-between items-end">
                                <div className={selectedAccountId === acc.id ? 'text-white' : 'text-slate-800'}>
                                    <p className="text-[10px] font-bold opacity-40 uppercase tracking-widest mb-1">Vencimento</p>
                                    <p className="text-sm font-bold tracking-tight">Dia {acc.due_day}</p>
                                </div>
                                {(() => {
                                    const logoUrl = getBankLogo(acc.name);
                                    if (logoUrl) {
                                        return (
                                            <div className={`w-12 h-8 rounded-md flex items-center justify-center p-0.5 border ${selectedAccountId === acc.id ? 'bg-white/90 border-transparent' : 'bg-white border-slate-100'}`}>
                                                <img src={logoUrl} alt={acc.name} className="max-w-full max-h-full object-contain mix-blend-multiply opacity-90" />
                                            </div>
                                        );
                                    }
                                    return (
                                        <div className={`w-12 h-8 rounded-md flex items-center justify-center font-black text-[10px] ${selectedAccountId === acc.id ? 'bg-white/10 text-white/80' : 'bg-slate-100 text-slate-400'}`}>
                                            {acc.name.toLowerCase().includes('visa') ? 'VISA' : acc.name.toLowerCase().includes('master') ? 'MSTR' : 'CRDT'}
                                        </div>
                                    );
                                })()}
                            </div>
                        </div>
                    ))}

                    <div onClick={onAddCard} className="min-w-[200px] aspect-[1/1] bg-slate-50/50 rounded-2xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center gap-3 text-slate-400 hover:bg-blue-50/50 hover:border-blue-300 hover:text-blue-500 transition-all cursor-pointer">
                        <div className="p-3 bg-white rounded-full shadow-sm border border-slate-100">
                            <Plus size={20} className="text-slate-400" />
                        </div>
                        <span className="text-sm font-bold">Novo Cartão</span>
                    </div>
                </div>
            </div>

            {/* Transactions area */}
            <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm space-y-6">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div className="flex items-center gap-4">
                        <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
                            Lançamentos da Fatura
                        </h3>
                        <div className="flex items-center gap-1 bg-slate-50 border border-slate-100 p-1.5 rounded-xl">
                            <button
                                onClick={() => setSelectedYear(prev => prev - 1)}
                                className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-white rounded-lg transition-all shadow-sm-hover"
                                title="Ano Anterior"
                            >
                                <ChevronsLeft size={16} />
                            </button>
                            <button
                                onClick={() => {
                                    if (selectedMonth === 0) {
                                        setSelectedMonth(11);
                                        setSelectedYear(prev => prev - 1);
                                    } else {
                                        setSelectedMonth(prev => prev - 1);
                                    }
                                }}
                                className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-white rounded-lg transition-all shadow-sm-hover"
                                title="Mês Anterior"
                            >
                                <ChevronLeft size={16} />
                            </button>

                            <div className="w-32 text-center font-black text-slate-700 text-xs uppercase tracking-widest whitespace-nowrap">
                                {new Date(selectedYear, selectedMonth, 1).toLocaleString('pt-BR', { month: 'short', year: 'numeric' }).replace('.', '')}
                            </div>

                            <button
                                onClick={() => {
                                    if (selectedMonth === 11) {
                                        setSelectedMonth(0);
                                        setSelectedYear(prev => prev + 1);
                                    } else {
                                        setSelectedMonth(prev => prev + 1);
                                    }
                                }}
                                className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-white rounded-lg transition-all shadow-sm-hover"
                                title="Próximo Mês"
                            >
                                <ChevronRight size={16} />
                            </button>
                            <button
                                onClick={() => setSelectedYear(prev => prev + 1)}
                                className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-white rounded-lg transition-all shadow-sm-hover"
                                title="Próximo Ano"
                            >
                                <ChevronsRight size={16} />
                            </button>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                        <div className="relative flex-1 md:w-64">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input
                                type="text"
                                placeholder="Buscar lançamento..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl outline-none focus:ring-2 focus:ring-blue-100 transition-all font-bold text-slate-700 placeholder:text-slate-400"
                            />
                        </div>
                        <select
                            value={selectedAccountId}
                            onChange={e => onSelectAccount(e.target.value)}
                            className="px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl outline-none focus:ring-2 focus:ring-blue-100 font-bold text-slate-700 text-sm max-w-[150px] truncate"
                        >
                            {creditAccounts.map(acc => (
                                <option key={acc.id} value={acc.id}>
                                    {acc.name} (**** {acc.last_four_digits || acc.name.slice(-4).replace(/\D/g, '') || '0000'})
                                </option>
                            ))}
                        </select>
                        <select
                            value={statusFilter}
                            onChange={e => setStatusFilter(e.target.value)}
                            className="px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl outline-none focus:ring-2 focus:ring-blue-100 font-bold text-slate-700 text-sm"
                        >
                            <option value="ALL">Todos os status</option>
                            <option value="PAID">Confirmado</option>
                            <option value="PENDING">Pendente</option>
                        </select>
                        <button
                            onClick={() => onAddExpense(selectedAccountId)}
                            className="flex items-center gap-2 px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-all whitespace-nowrap"
                        >
                            <Plus size={18} /> Novo Gasto
                        </button>
                        {isInvoicePaid ? (
                            <button
                                onClick={() => onReopenInvoice(selectedAccount.id, selectedMonth, selectedYear)}
                                className="flex items-center gap-2 px-5 py-2.5 font-bold rounded-xl transition-all border border-slate-200 text-slate-700 hover:bg-slate-50 whitespace-nowrap shadow-sm"
                            >
                                <RotateCcw size={18} /> Reabrir Fatura
                            </button>
                        ) : (
                            <button
                                disabled={stats.currentMonthTotal === 0}
                                onClick={() => onPayInvoice(selectedAccount.id, stats.currentMonthTotal, selectedMonth, selectedYear)}
                                className={`flex items-center gap-2 px-5 py-2.5 font-bold rounded-xl transition-all whitespace-nowrap ${stats.currentMonthTotal === 0
                                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                    : 'bg-blue-50 text-blue-600 hover:bg-blue-100 shadow-sm'
                                    }`}
                            >
                                <CardIcon size={18} /> {stats.currentMonthTotal === 0 ? 'Nenhum Gasto' : 'Pagar Fatura'}
                            </button>
                        )}
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="border-b border-slate-50">
                            <tr>
                                <th className="pb-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Data</th>
                                <th className="pb-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Descrição</th>
                                <th className="pb-4 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">Categoria</th>
                                <th className="pb-4 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Valor</th>
                                <th className="pb-4 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                                <th className="pb-4 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50/50">
                            {filteredTransactions.map(t => (
                                <tr key={t.id} className="group hover:bg-slate-50/50 transition-colors">
                                    <td className="py-6 text-sm font-bold text-slate-500">
                                        {new Date(t.due_date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
                                    </td>
                                    <td className="py-6">
                                        <div className="flex items-center gap-4">
                                            <div className="p-3 bg-slate-50 text-slate-400 rounded-2xl group-hover:bg-white group-hover:text-blue-500 group-hover:shadow-sm transition-all">
                                                {getCategoryIcon(t.category_name)}
                                            </div>
                                            <div>
                                                <p className="font-black text-slate-800">{t.description}</p>
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                                                    {t.provider ? `${t.provider} • ` : ''}
                                                    {t.installment_number ? `Parcela ${String(t.installment_number).padStart(2, '0')}/${String(t.total_installments).padStart(2, '0')}` : 'À vista'}
                                                </p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="py-6 text-center">
                                        <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider" style={{ backgroundColor: (t.category_color || '#e2e8f0') + '15', color: t.category_color || '#64748b' }}>
                                            {t.category_name || 'Outros'}
                                        </span>
                                    </td>
                                    <td className="py-6 text-right font-black text-slate-800">
                                        R$ {t.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                    </td>
                                    <td className="py-6 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <div className={`w-2 h-2 rounded-full ${t.status === 'PAID' ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'}`}></div>
                                            <span className={`text-[10px] font-black uppercase tracking-widest ${t.status === 'PAID' ? 'text-emerald-500' : 'text-amber-500'}`}>
                                                {t.status === 'PAID' ? 'Confirmado' : 'Processando'}
                                            </span>
                                        </div>
                                    </td>
                                </tr>
                            ))}

                            {filteredTransactions.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="py-20 text-center text-slate-400 font-bold italic">
                                        Nenhum lançamento encontrado para este período.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="flex justify-between items-center pt-8 border-t border-slate-50">
                    <p className="text-sm font-black text-slate-800 uppercase tracking-widest">Total do Período</p>
                    <p className="text-2xl font-black text-blue-600">{formatCurrency(stats.currentMonthTotal)}</p>
                </div>
            </div>
        </div>
    );
};

export default CreditCardManagement;
