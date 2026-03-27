import React, { useState, useMemo } from 'react';
import { FinancialAccount, FinancialTransaction, FinancialCategory } from '../../types';
import { formatCurrency } from '../../src/utils/formatters';

// ── Helpers ──────────
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
        cresol: 'https://logopng.com.br/wp-content/uploads/2021/05/cresol.png',
    };
    const lower = name.toLowerCase();
    for (const [key, logo] of Object.entries(map)) {
        if (lower.includes(key)) return logo;
    }
    return null;
}

const BankIcon: React.FC<{ name: string, abbr: string }> = ({ name, abbr }) => {
    const [error, setError] = React.useState(false);
    const logoUrl = getBankLogo(name);

    if (!logoUrl || error) {
        const color = name.toLowerCase().includes('nubank') ? '#8a05be' : 
                      name.toLowerCase().includes('inter') ? '#ff7a00' :
                      name.toLowerCase().includes('itau') ? '#ec7000' :
                      name.toLowerCase().includes('bradesco') ? '#cc092f' :
                      name.toLowerCase().includes('santander') ? '#ec0000' :
                      name.toLowerCase().includes('caixa') ? '#00509f' :
                      name.toLowerCase().includes('bb') || name.toLowerCase().includes('banco do brasil') ? '#f0cc00' :
                      name.toLowerCase().includes('cresol') ? '#00543D' : '#94a3b8';
        
        const textColor = (name.toLowerCase().includes('bb') || name.toLowerCase().includes('banco do brasil')) ? '#000' : '#fff';

        return (
            <div className="w-full h-full flex items-center justify-center font-black text-xs" style={{ backgroundColor: color, color: textColor }}>
                {abbr}
            </div>
        );
    }

    return (
        <img 
            src={logoUrl} 
            alt={name} 
            className="max-w-full max-h-full object-contain transition-opacity duration-300"
            onError={() => setError(true)}
        />
    );
};

const getCategoryIcon = (categoryName?: string) => {
    const name = categoryName?.toLowerCase() || '';
    if (name.includes('viagem')) return 'flight';
    if (name.includes('alimentação')) return 'restaurant';
    if (name.includes('suprimentos') || name.includes('papelaria')) return 'shopping_bag';
    if (name.includes('software') || name.includes('cloud')) return 'memory';
    if (name.includes('equipamento')) return 'monitor';
    return 'info';
};

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
        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* ── Header Section ── */}
            <div className="bg-m3-surface-container-low p-6 rounded-[32px] border border-m3-outline-variant/10 shadow-sm transition-all duration-300">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-white rounded-2xl shadow-xl flex items-center justify-center text-m3-primary border border-m3-outline-variant/5 transition-transform hover:scale-110">
                            <span className="material-symbols-outlined text-2xl font-variation-fill">credit_card</span>
                        </div>
                        <div>
                            <h1 className="text-xl font-black text-m3-on-surface tracking-tight">Gestão de Inteligência de Crédito</h1>
                            <p className="text-[10px] font-black text-m3-on-surface-variant/40 uppercase tracking-[0.2em] mt-0.5">Controle de faturas, limites e parcelamentos</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <button
                            onClick={onExport}
                            className="flex items-center gap-3 px-6 py-3.5 bg-m3-surface-container-high text-m3-on-surface-variant font-black rounded-2xl hover:bg-m3-surface-container-highest transition-all shadow-sm text-xs uppercase tracking-widest border border-m3-outline-variant/5"
                        >
                            <span className="material-symbols-outlined text-lg">download</span> EXPORTAR
                        </button>
                        <button
                            onClick={() => onAddExpense(selectedAccount?.id)}
                            className="flex items-center gap-3 px-8 py-3.5 bg-m3-primary text-white font-black rounded-2xl hover:bg-m3-primary/90 hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-m3-primary/20 text-xs uppercase tracking-[0.2em]"
                        >
                            <span className="material-symbols-outlined text-lg">add</span> NOVO GASTO
                        </button>
                    </div>
                </div>
            </div>

            {/* ── Key Metrics Cards ── */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Current Invoice */}
                <div className="bg-m3-surface-container-low p-8 rounded-[40px] border border-m3-outline-variant/10 shadow-sm relative overflow-hidden group transition-all hover:shadow-2xl hover:border-m3-primary/20">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-m3-primary/5 rounded-full -mr-16 -mt-16 group-hover:scale-125 transition-transform duration-700"></div>
                    <div className="flex justify-between items-start mb-6 relative z-10">
                        <p className="text-[10px] font-black text-m3-on-surface-variant/40 uppercase tracking-[0.3em]">Fatura Atual</p>
                        <div className="w-12 h-12 bg-white rounded-[16px] flex items-center justify-center text-m3-primary border border-m3-outline-variant/10 shadow-lg group-hover:scale-110 transition-transform">
                            <span className="material-symbols-outlined text-2xl font-variation-fill">receipt_long</span>
                        </div>
                    </div>
                    <div className="flex items-baseline gap-3 relative z-10">
                        <h3 className="text-4xl font-black text-m3-on-surface tracking-tighter tabular-nums">{formatCurrency(stats.currentMonthTotal)}</h3>
                        <div className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${stats.pctChange > 0 ? 'text-m3-error bg-m3-error/10' : 'text-emerald-500 bg-emerald-500/10 border border-emerald-500/20'}`}>
                            <span className="material-symbols-outlined text-xs font-black">{stats.pctChange > 0 ? 'trending_up' : 'trending_down'}</span>
                            {stats.pctChange}%
                        </div>
                    </div>
                    <div className="flex items-center gap-2 mt-4 text-[10px] font-black text-m3-on-surface-variant/40 uppercase tracking-widest relative z-10">
                        <span className="material-symbols-outlined text-sm font-black text-m3-primary/40">event</span>
                        VENCIMENTO: <span className="text-m3-primary/80">{stats.currentMonthDueDate || 'NÃO DEFINIDO'}</span>
                    </div>
                </div>

                {/* Closed Invoice */}
                <div className="bg-m3-surface-container-low p-8 rounded-[40px] border border-m3-outline-variant/10 shadow-sm relative overflow-hidden group transition-all hover:shadow-2xl">
                    <div className="flex justify-between items-start mb-6">
                        <p className="text-[10px] font-black text-m3-on-surface-variant/40 uppercase tracking-[0.3em]">Fatura Fechada</p>
                        <div className={`w-12 h-12 rounded-[16px] flex items-center justify-center border border-m3-outline-variant/10 shadow-lg transition-transform hover:scale-110 ${stats.isPrevMonthPaid ? 'bg-emerald-50 text-emerald-500' : 'bg-amber-50 text-amber-500'}`}>
                            <span className="material-symbols-outlined text-24 font-variation-fill">{stats.isPrevMonthPaid ? 'lock_open' : 'lock'}</span>
                        </div>
                    </div>
                    <div className="flex items-baseline gap-3">
                        <h3 className="text-4xl font-black text-m3-on-surface tracking-tighter tabular-nums">{formatCurrency(stats.lastMonthTotal)}</h3>
                    </div>
                    <div className="flex flex-col gap-1 mt-4">
                        <div className="flex items-center gap-2 text-[10px] font-black text-m3-on-surface-variant/40 uppercase tracking-widest">
                            <span className="material-symbols-outlined text-sm font-black">event</span> VENCIMENTO: <span className="text-m3-on-surface-variant/80">{stats.prevMonthDueDate || 'NÃO DEFINIDO'}</span>
                        </div>
                        <div className={`text-[10px] font-black uppercase tracking-widest ${stats.isPrevMonthPaid ? 'text-emerald-500' : 'text-amber-500 animate-pulse'}`}>
                            {stats.isPrevMonthPaid ? '✓ LIQUIDADA' : '! AGUARDANDO PAGAMENTO'}
                        </div>
                    </div>
                </div>

                {/* Available Limit */}
                <div className="bg-white p-8 rounded-[40px] border border-m3-outline-variant/10 shadow-sm relative overflow-hidden group transition-all hover:shadow-2xl hover:border-m3-primary/10">
                    <div className="absolute inset-0 bg-gradient-to-br from-m3-primary/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    <div className="flex justify-between items-start mb-6 relative z-10">
                        <p className="text-[10px] font-black text-m3-on-surface-variant/40 uppercase tracking-[0.3em]">Limite Disponível</p>
                        <div className="w-12 h-12 bg-m3-surface-container-low text-m3-primary rounded-[16px] flex items-center justify-center border border-m3-outline-variant/10 shadow-lg group-hover:scale-110 transition-transform">
                            <span className="material-symbols-outlined text-2xl font-variation-fill">account_balance_wallet</span>
                        </div>
                    </div>
                    <div className="flex items-baseline gap-3 relative z-10">
                        <h3 className="text-4xl font-black text-m3-on-surface tracking-tighter tabular-nums">{formatCurrency(stats.limitAvailable)}</h3>
                        <div className="px-2.5 py-1 bg-m3-error/5 text-m3-error rounded-full text-[10px] font-black uppercase tracking-widest border border-m3-error/10">
                            {stats.limitUsedPct}% USADO
                        </div>
                    </div>
                    <div className="mt-6 flex flex-col gap-2 relative z-10">
                        <div className="w-full h-2 bg-m3-surface-container-high rounded-full overflow-hidden shadow-inner">
                            <div 
                                className="h-full bg-m3-primary rounded-full transition-all duration-1000"
                                style={{ width: `${stats.limitUsedPct}%` }}
                            />
                        </div>
                        <p className="text-[10px] font-black text-m3-on-surface-variant/30 uppercase tracking-[0.2em] text-right">LIMITE TOTAL: {formatCurrency(stats.totalLimit)}</p>
                    </div>
                </div>
            </div>

            {/* ── Card Selector ── */}
            <div className="space-y-6">
                <div className="flex items-center justify-between px-4">
                    <h3 className="text-xs font-black text-m3-on-surface-variant uppercase tracking-[0.3em] flex items-center gap-4">
                        <span className="w-8 h-px bg-m3-outline-variant/30"></span> Selecione o Cartão <span className="text-[10px] bg-m3-surface-container-high text-m3-primary px-3 py-1 rounded-full border border-m3-outline-variant/10">{creditAccounts.length}</span>
                    </h3>
                    <button className="text-[10px] font-black text-m3-primary hover:underline uppercase tracking-widest">Ver todos os cartões</button>
                </div>
                
                <div className="flex gap-8 overflow-x-auto pb-6 no-scrollbar snap-x">
                    {creditAccounts.map(acc => (
                        <div
                            key={acc.id}
                            onClick={() => onSelectAccount(acc.id)}
                            className={`min-w-[340px] aspect-[1.6/1] rounded-[32px] p-8 flex flex-col justify-between cursor-pointer transition-all duration-500 snap-center border-2 ${selectedAccountId === acc.id
                                ? 'bg-slate-900 border-m3-primary shadow-2xl shadow-m3-primary/20 scale-[1.02] -translate-y-1'
                                : 'bg-m3-surface-container-low border-transparent hover:border-m3-primary/30 hover:shadow-xl'
                                }`}
                        >
                            <div className="flex justify-between items-start relative z-10">
                                <div className={selectedAccountId === acc.id ? 'text-white' : 'text-m3-on-surface'}>
                                    <p className="text-[10px] font-black opacity-40 uppercase tracking-[0.2em] mb-2">{acc.name}</p>
                                    <p className="text-xl font-black tracking-[0.2em] uppercase">•••• {acc.last_four_digits || '0000'}</p>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={(e) => { e.stopPropagation(); onEditCard(acc); }}
                                        className={`p-2.5 rounded-xl transition-all ${selectedAccountId === acc.id ? 'hover:bg-white/10 text-white/40 hover:text-white' : 'hover:bg-m3-surface-container-high text-m3-on-surface-variant/40 hover:text-m3-primary'}`}
                                    >
                                        <span className="material-symbols-outlined text-lg">edit</span>
                                    </button>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); onDeleteCard(acc); }}
                                        className={`p-2.5 rounded-xl transition-all ${selectedAccountId === acc.id ? 'hover:bg-red-500/20 text-white/40 hover:text-red-400' : 'hover:bg-m3-error/5 text-m3-on-surface-variant/40 hover:text-m3-error'}`}
                                    >
                                        <span className="material-symbols-outlined text-lg">delete</span>
                                    </button>
                                </div>
                            </div>

                            <div className="flex justify-between items-end relative z-10">
                                <div className={selectedAccountId === acc.id ? 'text-white' : 'text-m3-on-surface'}>
                                    <p className="text-[9px] font-black opacity-40 uppercase tracking-[0.2em] mb-1">Vencimento</p>
                                    <p className="font-black text-sm tracking-widest">DIA {acc.due_day}</p>
                                </div>
                                {(() => {
                                    const name = acc.name.toLowerCase();
                                    const abbr = name.includes('visa') ? 'VISA' : name.includes('master') ? 'MC' : 'CARD';
                                    return (
                                        <div className={`w-14 h-10 rounded-xl flex items-center justify-center p-1.5 overflow-hidden transition-all duration-500 ${selectedAccountId === acc.id ? 'bg-white shadow-lg' : 'bg-white border-m3-outline-variant/10 shadow-sm'}`}>
                                            <BankIcon name={acc.name} abbr={abbr} />
                                        </div>
                                    );
                                })()}
                            </div>
                            
                            {/* Chip Decorator */}
                            <div className="absolute top-1/2 left-8 w-10 h-8 bg-gradient-to-br from-amber-400 to-amber-600 rounded-md opacity-20 group-hover:opacity-40 transition-opacity"></div>
                        </div>
                    ))}

                    <div onClick={onAddCard} className="min-w-[240px] aspect-[1.2/1] bg-m3-surface-container-low rounded-[32px] border-2 border-dashed border-m3-outline-variant/30 flex flex-col items-center justify-center gap-6 text-m3-on-surface-variant/40 hover:bg-m3-primary/5 hover:border-m3-primary/40 hover:text-m3-primary transition-all duration-500 cursor-pointer group snap-center">
                        <div className="w-16 h-16 bg-white rounded-[24px] shadow-sm border border-m3-outline-variant/10 flex items-center justify-center group-hover:scale-110 group-hover:shadow-2xl transition-all">
                            <span className="material-symbols-outlined text-3xl">add</span>
                        </div>
                        <div className="text-center">
                            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Novo Cartão</span>
                            <p className="text-[9px] opacity-60 font-medium uppercase tracking-widest mt-1">Sincronizar Banco</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Transactions Area ── */}
            <div className="bg-m3-surface-container-low rounded-[32px] p-8 border border-m3-outline-variant/10 shadow-sm space-y-8">
                <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-8">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
                        <h3 className="text-xs font-black text-m3-on-surface uppercase tracking-[0.3em] flex items-center gap-4">
                            <span className="w-8 h-px bg-m3-primary/30"></span> Lançamentos da Fatura
                        </h3>
                        <div className="flex items-center gap-1 bg-white border border-m3-outline-variant/10 p-1.5 rounded-[20px] shadow-inner">
                            <button
                                onClick={() => setSelectedYear(prev => prev - 1)}
                                className="p-2 text-m3-on-surface-variant/40 hover:text-m3-primary hover:bg-m3-surface-container-high rounded-xl transition-all"
                                title="Ano Anterior"
                            >
                                <span className="material-symbols-outlined text-lg">first_page</span>
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
                                className="p-2 text-m3-on-surface-variant/40 hover:text-m3-primary hover:bg-m3-surface-container-high rounded-xl transition-all"
                                title="Mês Anterior"
                            >
                                <span className="material-symbols-outlined text-lg">chevron_left</span>
                            </button>

                            <div className="w-36 text-center font-black text-m3-on-surface text-[10px] uppercase tracking-[0.2em] whitespace-nowrap">
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
                                className="p-2 text-m3-on-surface-variant/40 hover:text-m3-primary hover:bg-m3-surface-container-high rounded-xl transition-all"
                                title="Próximo Mês"
                            >
                                <span className="material-symbols-outlined text-lg">chevron_right</span>
                            </button>
                            <button
                                onClick={() => setSelectedYear(prev => prev + 1)}
                                className="p-2 text-m3-on-surface-variant/40 hover:text-m3-primary hover:bg-m3-surface-container-high rounded-xl transition-all"
                                title="Próximo Ano"
                            >
                                <span className="material-symbols-outlined text-lg">last_page</span>
                            </button>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-4 w-full xl:w-auto">
                        <div className="relative flex-1 min-w-[240px] group">
                            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-m3-on-surface-variant/30 group-focus-within:text-m3-primary transition-colors">search</span>
                            <input
                                type="text"
                                placeholder="BUSCAR LANÇAMENTO..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                className="w-full pl-12 pr-4 py-3 bg-white border border-m3-outline-variant/10 rounded-2xl outline-none focus:ring-4 focus:ring-m3-primary/5 focus:border-m3-primary/30 transition-all font-black text-[10px] uppercase tracking-widest text-m3-on-surface placeholder:text-m3-on-surface-variant/20 shadow-inner"
                            />
                        </div>
                        
                        <div className="flex items-center gap-3 w-full sm:w-auto">
                            <select
                                value={statusFilter}
                                onChange={e => setStatusFilter(e.target.value)}
                                className="flex-1 sm:flex-none px-4 py-3 bg-white border border-m3-outline-variant/10 rounded-2xl outline-none focus:ring-4 focus:ring-m3-primary/5 font-black text-m3-on-surface-variant text-[10px] uppercase tracking-widest appearance-none cursor-pointer"
                                style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 24 24\' stroke=\'%23a1a1aa\'%3E%3Cpath stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'2\' d=\'M19 9l-7 7-7-7\'/%3E%3C/svg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.75rem center', backgroundSize: '1rem' }}
                            >
                                <option value="ALL">TODOS OS STATUS</option>
                                <option value="PAID">CONFIRMADO</option>
                                <option value="PENDING">PENDENTE</option>
                            </select>

                            {isInvoicePaid ? (
                                <button
                                    onClick={() => onReopenInvoice(selectedAccount.id, selectedMonth, selectedYear)}
                                    className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-3 font-black rounded-2xl transition-all border border-m3-outline-variant/10 text-m3-on-surface-variant hover:bg-m3-surface-container-high uppercase tracking-widest text-[10px]"
                                >
                                    <span className="material-symbols-outlined text-lg">replay</span> REABRIR
                                </button>
                            ) : (
                                <button
                                    disabled={stats.currentMonthTotal === 0}
                                    onClick={() => onPayInvoice(selectedAccount.id, stats.currentMonthTotal, selectedMonth, selectedYear)}
                                    className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-3 font-black rounded-2xl transition-all uppercase tracking-widest text-[10px] shadow-lg ${stats.currentMonthTotal === 0
                                        ? 'bg-m3-surface-container-high text-m3-on-surface-variant/20 cursor-not-allowed border border-transparent'
                                        : 'bg-emerald-500 text-white hover:bg-emerald-600 shadow-emerald-500/20'
                                        }`}
                                >
                                    <span className="material-symbols-outlined text-lg font-variation-fill">check_circle</span> {stats.currentMonthTotal === 0 ? 'SEM GASTOS' : 'LIQUIDAR'}
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                <div className="overflow-x-auto no-scrollbar">
                    <table className="w-full">
                        <thead className="border-b border-m3-outline-variant/5">
                            <tr>
                                <th className="pb-4 text-left text-[9px] font-black text-m3-on-surface-variant/30 uppercase tracking-[0.2em] px-4">Data</th>
                                <th className="pb-4 text-left text-[9px] font-black text-m3-on-surface-variant/30 uppercase tracking-[0.2em]">Descrição</th>
                                <th className="pb-4 text-center text-[9px] font-black text-m3-on-surface-variant/30 uppercase tracking-[0.2em]">Categoria</th>
                                <th className="pb-4 text-right text-[9px] font-black text-m3-on-surface-variant/30 uppercase tracking-[0.2em]">Valor</th>
                                <th className="pb-4 text-right text-[9px] font-black text-m3-on-surface-variant/30 uppercase tracking-[0.2em] px-4">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-m3-outline-variant/5">
                            {filteredTransactions.map(t => (
                                <tr key={t.id} className="group hover:bg-m3-primary/[0.02] transition-colors cursor-pointer">
                                    <td className="py-6 px-4">
                                        <p className="text-[10px] font-black text-m3-on-surface-variant/40 uppercase tracking-widest">
                                            {new Date(t.due_date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                                        </p>
                                        <p className="text-[9px] font-bold text-m3-on-surface-variant/20 mt-0.5">{new Date(t.due_date).getFullYear()}</p>
                                    </td>
                                    <td className="py-6">
                                        <div className="flex items-center gap-5">
                                            <div className="w-12 h-12 bg-white text-m3-on-surface-variant/30 rounded-2xl flex items-center justify-center border border-m3-outline-variant/5 group-hover:text-m3-primary group-hover:border-m3-primary/10 group-hover:shadow-lg transition-all">
                                                <span className="material-symbols-outlined text-xl">{getCategoryIcon(t.category_name)}</span>
                                            </div>
                                            <div>
                                                <p className="font-black text-m3-on-surface text-sm tracking-tight group-hover:text-m3-primary transition-colors">{t.description}</p>
                                                <p className="text-[9px] font-black text-m3-on-surface-variant/30 uppercase tracking-[0.15em] mt-1">
                                                    {t.provider ? `${t.provider} • ` : ''}
                                                    {t.installment_number ? `PARCELA ${String(t.installment_number).padStart(2, '0')}/${String(t.total_installments).padStart(2, '0')}` : 'À VISTA'}
                                                </p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="py-6 text-center">
                                        <span className="px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border" style={{ backgroundColor: (t.category_color || '#e2e8f0') + '08', color: t.category_color || '#64748b', borderColor: (t.category_color || '#64748b') + '20' }}>
                                            {t.category_name || 'OUTROS'}
                                        </span>
                                    </td>
                                    <td className="py-6 text-right font-black text-m3-on-surface text-base tracking-tighter tabular-nums px-2">
                                        {formatCurrency(Number(t.amount))}
                                    </td>
                                    <td className="py-6 px-4 text-right">
                                        <div className="flex items-center justify-end gap-2 text-[10px] font-black uppercase tracking-widest">
                                            <span className={`material-symbols-outlined text-lg ${t.status === 'PAID' ? 'text-emerald-500 font-variation-fill' : 'text-amber-500'}`}>
                                                {t.status === 'PAID' ? 'check_circle' : 'pending'}
                                            </span>
                                            <span className={t.status === 'PAID' ? 'text-emerald-600' : 'text-amber-600'}>
                                                {t.status === 'PAID' ? 'CONFIRMADO' : 'PROCESSANDO'}
                                            </span>
                                        </div>
                                    </td>
                                </tr>
                            ))}

                            {filteredTransactions.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="py-24 text-center">
                                        <div className="flex flex-col items-center gap-4 opacity-20">
                                            <span className="material-symbols-outlined text-5xl">search_off</span>
                                            <p className="text-[10px] font-black uppercase tracking-[0.3em]">Nenhum lançamento encontrado</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="flex justify-between items-center pt-8 border-t border-m3-outline-variant/5">
                    <p className="text-[10px] font-black text-m3-on-surface-variant/40 uppercase tracking-[0.3em]">Total do Período</p>
                    <div className="flex items-baseline gap-2">
                        <span className="text-xs font-black text-m3-on-surface-variant/20 uppercase tracking-widest">BRL</span>
                        <p className="text-3xl font-black text-m3-primary tracking-tighter tabular-nums">{formatCurrency(stats.currentMonthTotal)}</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CreditCardManagement;
