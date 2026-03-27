import React, { useState, useMemo, useRef, useEffect } from 'react';
import { FinancialAccount, FinancialTransaction } from '../../types';
import { formatCurrency } from '../../src/utils/formatters';
import { TrendingUp, TrendingDown, MoreVertical, Edit2, Trash2, ArrowUpRight, ArrowDownRight, CreditCard, Landmark, CheckCircle2, History, X, Search, Filter, Calendar as CalendarIcon, Wallet, Plus, Download, ChevronRight } from 'lucide-react';

// ── Helpers ─────────────────────────────────────────────────────────────────
const fmt = (v: number) =>
    formatCurrency(v ?? 0);

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

const BankIcon: React.FC<{ name: string, color: string, textColor: string, abbr: string }> = ({ name, color, textColor, abbr }) => {
    const [error, setError] = React.useState(false);
    const logoUrl = getBankLogo(name);

    if (!logoUrl || error) {
        return (
            <div 
                className="w-full h-full flex items-center justify-center font-black text-xs"
                style={{ backgroundColor: color, color: textColor }}
            >
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

function getBankAbbrev(name: string) {
    const map: Record<string, string> = {
        itau: 'ITAÚ', bradesco: 'BDC', santander: 'SNT',
        'banco do brasil': 'BB', bb: 'BB', caixa: 'CEF',
        nubank: 'NU', inter: 'INT', c6: 'C6', picpay: 'PIC',
        sicoob: 'SCB', sicredi: 'SCR', btg: 'BTG', xp: 'XP', cresol: 'CRE',
    };
    const lower = name.toLowerCase();
    for (const [key, abbr] of Object.entries(map)) {
        if (lower.includes(key)) return abbr;
    }
    return name.slice(0, 3).toUpperCase();
}

function getBankColor(name: string) {
    const map: Record<string, string> = {
        itau: '#EC7000', bradesco: '#CC092F', santander: '#EC0000',
        'banco do brasil': '#F9C100', bb: '#F9C100', caixa: '#005CA9',
        nubank: '#820AD1', inter: '#FF7A00', c6: '#1B1C1E',
        picpay: '#21C25E', sicoob: '#006A3C', btg: '#0B3B5C', xp: '#000',
        sicredi: '#50A000', cresol: '#00543D',
    };
    const lower = name.toLowerCase();
    for (const [key, color] of Object.entries(map)) {
        if (lower.includes(key)) return color;
    }
    return '#3B82F6';
}

function getBankTextColor(name: string) {
    const lower = name.toLowerCase();
    if (lower.includes('c6')) return '#fff'; // C6 is black, needs white text
    if (lower.includes('brasil') || lower.includes(' bb')) return '#000'; // BB is yellow, needs black text
    return '#fff';
}

const now = new Date();
const CUR_MONTH = now.getMonth();
const CUR_YEAR = now.getFullYear();
const monthLabel = now.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' });

// ── 3-dot Menu ───────────────────────────────────────────────────────────────
function AccountMenu({ onEdit, onDelete }: { onEdit: () => void; onDelete: () => void }) {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const h = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener('mousedown', h);
        return () => document.removeEventListener('mousedown', h);
    }, []);
    return (
        <div className="relative" ref={ref}>
            <button
                onClick={e => { e.stopPropagation(); setOpen(o => !o); }}
                className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-m3-surface-container-high text-m3-on-surface-variant transition-all active:scale-90"
            >
                <span className="material-symbols-outlined text-xl">more_vert</span>
            </button>
            {open && (
                <div className="absolute right-0 top-12 w-44 bg-white rounded-[20px] shadow-2xl border border-m3-outline-variant/10 z-50 overflow-hidden py-2 animate-in fade-in zoom-in-95 duration-200">
                    <button
                        onClick={e => { e.stopPropagation(); onEdit(); setOpen(false); }}
                        className="w-full flex items-center gap-3 px-4 py-3 text-xs font-black text-m3-on-surface-variant hover:bg-m3-surface-container-low transition-colors"
                    >
                        <span className="material-symbols-outlined text-lg">edit</span> EDITAR CONTA
                    </button>
                    <button
                        onClick={e => { e.stopPropagation(); onDelete(); setOpen(false); }}
                        className="w-full flex items-center gap-3 px-4 py-3 text-xs font-black text-m3-error hover:bg-m3-error/5 transition-colors"
                    >
                        <span className="material-symbols-outlined text-lg">archive</span> ARQUIVAR
                    </button>
                </div>
            )}
        </div>
    );
}

// ── Delete Modal ─────────────────────────────────────────────────────────────
function DeleteModal({ account, onConfirm, onCancel }: {
    account: FinancialAccount; onConfirm: () => void; onCancel: () => void;
}) {
    return (
        <div className="fixed inset-0 bg-m3-on-surface/40 backdrop-blur-md flex items-center justify-center z-[80] p-6">
            <div className="bg-white w-full max-w-sm rounded-[32px] shadow-2xl overflow-hidden border border-m3-outline-variant/10 animate-in zoom-in-95 duration-300">
                <div className="bg-m3-error p-8 flex flex-col items-center text-center gap-4 text-white">
                    <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center shadow-lg backdrop-blur-md">
                        <span className="material-symbols-outlined text-3xl font-variation-fill">warning</span>
                    </div>
                    <div>
                        <h2 className="font-black text-xl tracking-tight">Arquivar Conta?</h2>
                        <p className="text-white/70 text-[10px] font-black uppercase tracking-widest mt-1">O histórico será preservado para relatórios</p>
                    </div>
                </div>
                <div className="p-8 space-y-6">
                    <div className="bg-m3-surface-container-low rounded-2xl p-4 border border-m3-outline-variant/10 flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-m3-on-surface/5 flex items-center justify-center text-m3-on-surface-variant">
                            <span className="material-symbols-outlined">account_balance</span>
                        </div>
                        <div>
                            <p className="font-black text-m3-on-surface text-sm uppercase tracking-tight">{account.name}</p>
                            <p className="text-[10px] font-black text-m3-on-surface-variant/40 uppercase tracking-widest">SALDO: {fmt(account.current_balance)}</p>
                        </div>
                    </div>
                    <p className="text-center text-xs font-black text-m3-on-surface-variant/60 leading-relaxed px-2 uppercase tracking-wide">
                        A conta deixará de aparecer nas listas ativas, mas todos os lançamentos continuarão salvos.
                    </p>
                    <div className="flex flex-col gap-3">
                        <button onClick={onConfirm} className="w-full py-4 bg-m3-error text-white font-black rounded-2xl text-xs transition-all hover:bg-red-700 shadow-lg shadow-m3-error/20 uppercase tracking-widest">SIM, ARQUIVAR AGORA</button>
                        <button onClick={onCancel} className="w-full py-4 bg-m3-surface-container-high text-m3-on-surface font-black rounded-2xl text-xs transition-all hover:bg-m3-surface-container-highest uppercase tracking-widest">CANCELAR</button>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ── Bank Account Card ────────────────────────────────────────────────────────
function AccountCard({ account, onClick, onEdit, onDelete }: {
    account: FinancialAccount;
    onClick: () => void; onEdit: () => void; onDelete: () => void;
}) {
    const color = getBankColor(account.name);
    const textColor = getBankTextColor(account.name);
    const logoUrl = getBankLogo(account.name);
    const abbrev = getBankAbbrev(account.name);

    return (
        <div
            onClick={onClick}
            className="group relative bg-m3-surface-container-low border border-m3-outline-variant/30 rounded-[32px] p-8 cursor-pointer transition-all duration-500 hover:shadow-2xl hover:border-m3-primary/20 hover:-translate-y-2 active:scale-95 shadow-sm overflow-hidden"
        >
            {/* Background Accent */}
            <div 
                className="absolute -right-8 -bottom-8 w-32 h-32 rounded-full opacity-0 group-hover:opacity-5 transition-opacity duration-500 blur-2xl"
                style={{ backgroundColor: color }}
            />

            <div className="flex items-start justify-between relative z-10 mb-8">
                <div 
                    className="w-16 h-16 rounded-2xl flex items-center justify-center p-2.5 bg-white border border-m3-outline-variant/10 shadow-sm flex-shrink-0 group-hover:scale-110 transition-transform duration-500 overflow-hidden"
                >
                    <BankIcon 
                        name={account.name} 
                        color={color} 
                        textColor={textColor}
                        abbr={abbrev} 
                    />
                </div>
                <AccountMenu onEdit={onEdit} onDelete={onDelete} />
            </div>

            <div className="space-y-1 relative z-10">
                <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-black text-m3-primary uppercase tracking-[0.2em] bg-m3-primary/10 px-2.5 py-1 rounded-full">
                        {account.type === 'CREDIT_CARD' ? 'Crédito' : 'Corrente'}
                    </span>
                    {(account as any).agency && (
                        <p className="text-[10px] font-black text-m3-on-surface-variant/40 uppercase tracking-widest">AG {(account as any).agency}</p>
                    )}
                </div>
                <p className="font-black text-m3-on-surface text-xl leading-tight tracking-tight group-hover:text-m3-primary transition-colors">{account.name}</p>
            </div>

            <div className="mt-10 relative z-10">
                <p className="text-[10px] font-black text-m3-on-surface-variant/40 uppercase tracking-[0.2em] mb-1">Saldo Disponível</p>
                <div className="flex items-center justify-between">
                    <p className="text-2xl font-black text-m3-on-surface tracking-tighter">{fmt(account.current_balance)}</p>
                    <div className="w-10 h-10 rounded-full bg-m3-surface-container-high flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-500 translate-x-4 group-hover:translate-x-0">
                        <span className="material-symbols-outlined text-m3-primary">chevron_right</span>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ── "Connect New Account" placeholder card ───────────────────────────────────
function ConnectCard({ onClick }: { onClick: () => void }) {
    return (
        <div
            onClick={onClick}
            className="group rounded-[32px] border-2 border-dashed border-m3-outline-variant/30 p-10 cursor-pointer hover:border-m3-primary/40 hover:bg-m3-primary/5 transition-all duration-500 flex flex-col items-center justify-center gap-6 min-h-[240px] text-center"
        >
            <div className="w-20 h-20 rounded-[24px] bg-m3-surface-container-low group-hover:bg-white group-hover:shadow-2xl group-hover:scale-110 flex items-center justify-center transition-all duration-500 border border-transparent group-hover:border-m3-primary/10">
                <span className="material-symbols-outlined text-4xl text-m3-outline-variant group-hover:text-m3-primary transition-colors">add</span>
            </div>
            <div>
                <p className="font-black text-m3-on-surface-variant/60 group-hover:text-m3-primary transition-colors uppercase tracking-[0.2em] text-xs">ADICIONAR CONTA</p>
                <p className="text-[10px] text-m3-on-surface-variant/30 font-black uppercase tracking-widest mt-1">Conecte seu banco ou carteira</p>
            </div>
        </div>
    );
}

// ── Credit Card Row ───────────────────────────────────────────────────────────
function CreditCardRow({ account, onClick, onEdit, onDelete }: {
    account: FinancialAccount;
    onClick: () => void; onEdit: () => void; onDelete: () => void;
}) {
    const color = getBankColor(account.name);
    const abbrev = getBankAbbrev(account.name);
    const logoUrl = getBankLogo(account.name);
    const isVisa = account.name.toLowerCase().includes('visa');
    const isMaster = account.name.toLowerCase().includes('master');

    const usagePercent = account.credit_limit ? (Math.abs(account.current_balance || 0) / account.credit_limit) * 100 : 0;

    return (
        <div
            onClick={onClick}
            className="group bg-white border border-m3-outline-variant/10 rounded-[24px] p-5 flex items-center gap-6 cursor-pointer transition-all duration-300 hover:shadow-xl hover:border-m3-primary/20 hover:-translate-y-1 active:scale-[0.98]"
        >
            <div className="relative">
                {logoUrl ? (
                    <div className="w-16 h-10 rounded-xl flex items-center justify-center p-2 bg-m3-surface-container-low border border-m3-outline-variant/10 flex-shrink-0 group-hover:bg-white transition-colors">
                        <img src={logoUrl} alt={account.name} className="max-w-full max-h-full object-contain mix-blend-multiply" />
                    </div>
                ) : (
                    <div
                        className="w-16 h-10 rounded-xl flex items-center justify-center text-white font-black text-[10px] flex-shrink-0 shadow-lg uppercase tracking-widest"
                        style={{ backgroundColor: color }}
                    >
                        {isVisa ? 'VISA' : isMaster ? 'MCARD' : abbrev}
                    </div>
                )}
                {/* Status Indicator */}
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full shadow-sm" />
            </div>

            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1.5">
                    <p className="font-black text-m3-on-surface text-sm truncate uppercase tracking-tight">{account.name}</p>
                    <span className="text-[9px] font-black text-m3-on-surface-variant/40 bg-m3-surface-container-high px-2 py-0.5 rounded-full border border-m3-outline-variant/5 uppercase tracking-widest">
                        •••• {account.last_four_digits || '0000'}
                    </span>
                </div>
                
                <div className="flex items-center gap-4">
                    <div className="flex-1 h-2 bg-m3-surface-container-high rounded-full overflow-hidden">
                        <div
                            className="h-full rounded-full transition-all duration-1000 shadow-inner"
                            style={{
                                width: `${Math.min(100, usagePercent)}%`,
                                backgroundColor: usagePercent > 90 ? '#ef4444' : usagePercent > 70 ? '#f59e0b' : '#3b82f6'
                            }}
                        />
                    </div>
                    <span className="text-[10px] font-black text-m3-on-surface-variant/60 w-8 tabular-nums">{Math.round(usagePercent)}%</span>
                </div>
            </div>

            <div className="text-right flex flex-col items-end gap-1">
                <p className="text-[9px] font-black text-m3-on-surface-variant/30 uppercase tracking-[0.2em]">Fatura Atual</p>
                <p className="font-black text-base text-m3-error tracking-tighter">{fmt(Math.abs(account.current_balance || 0))}</p>
            </div>

            <div className="pl-4 border-l border-m3-outline-variant/10 ml-2">
                <AccountMenu onEdit={onEdit} onDelete={onDelete} />
            </div>
        </div>
    );
}

// ── Main Component ────────────────────────────────────────────────────────────
interface AccountsViewProps {
    accounts: FinancialAccount[];
    transactions: FinancialTransaction[];
    loading: boolean;
    onNewAccount: () => void;
    onEditAccount: (account: FinancialAccount) => void;
    onDeleteAccount: (account: FinancialAccount) => void;
    onSelectAccount: (account: FinancialAccount) => void;
    onShowReconciliation: () => void;
}

const AccountsView: React.FC<AccountsViewProps> = ({
    accounts, transactions, loading,
    onNewAccount, onEditAccount, onDeleteAccount, onSelectAccount,
    onShowReconciliation
}) => {
    const [search, setSearch] = useState('');
    const [accountToDelete, setAccountToDelete] = useState<FinancialAccount | null>(null);

    const bankAccounts = accounts.filter(a => a.type === 'BANK');
    const cardAccounts = accounts.filter(a => a.type === 'CREDIT_CARD');

    const filtered = bankAccounts.filter(a => a.name.toLowerCase().includes(search.toLowerCase()));
    const filteredCards = cardAccounts.filter(a => a.name.toLowerCase().includes(search.toLowerCase()));

    const totalBalance = bankAccounts.reduce((s, a) => s + (a.current_balance || 0), 0);

    // Monthly stats from transactions
    const { monthlyIncome, monthlyExpense } = useMemo(() => {
        let inc = 0, exp = 0;
        transactions.forEach(t => {
            const d = new Date(t.due_date + 'T00:00:00');
            if (d.getMonth() === CUR_MONTH && d.getFullYear() === CUR_YEAR && t.status === 'PAID') {
                if (t.type === 'INCOME') inc += Number(t.amount);
                else exp += Number(t.amount);
            }
        });
        return { monthlyIncome: inc, monthlyExpense: exp };
    }, [transactions]);

    // Recent activity: last 5 paid transactions
    const recentActivity = useMemo(() =>
        [...transactions]
            .filter(t => t.status === 'PAID')
            .sort((a, b) => b.due_date.localeCompare(a.due_date))
            .slice(0, 5),
        [transactions]
    );

    const txnIcon = (type: string) => {
        if (type === 'INCOME') return <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0"><TrendingUp size={14} className="text-emerald-600" /></div>;
        return <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0"><TrendingDown size={14} className="text-red-600" /></div>;
    };

    const formatDate = (s: string) => {
        const d = new Date(s + 'T00:00:00');
        const today = new Date();
        if (d.toDateString() === today.toDateString()) return 'Hoje';
        const yesterday = new Date(); yesterday.setDate(today.getDate() - 1);
        if (d.toDateString() === yesterday.toDateString()) return 'Ontem';
        return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    };

    return (
        <div className="flex flex-col h-full space-y-6 animate-in fade-in duration-700">
            {/* Delete Modal */}
            {accountToDelete && (
                <DeleteModal
                    account={accountToDelete}
                    onCancel={() => setAccountToDelete(null)}
                    onConfirm={() => { onDeleteAccount(accountToDelete); setAccountToDelete(null); }}
                />
            )}

            {/* ── TOP HERO SECTION ── */}
            <div className="relative overflow-hidden rounded-[40px] bg-m3-surface-container-low p-10 border border-m3-outline-variant/30 shadow-sm">
                {/* Decorative Elements */}
                <div className="absolute -right-32 -top-32 w-96 h-96 bg-m3-primary/5 rounded-full blur-[100px]" />
                <div className="absolute -left-32 -bottom-32 w-96 h-96 bg-m3-primary/3 rounded-full blur-[80px]" />
                
                <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-10">
                    <div className="space-y-6">
                        <div className="flex items-center gap-4">
                            <div className="w-16 h-16 bg-white rounded-[24px] border border-m3-outline-variant/10 shadow-xl flex items-center justify-center text-m3-primary">
                                <span className="material-symbols-outlined text-3xl font-variation-fill">account_balance</span>
                            </div>
                            <div>
                                <h1 className="text-3xl font-black text-m3-on-surface tracking-tighter">Patrimônio Consolidado <span className="text-[10px] bg-emerald-100 text-emerald-600 px-2 py-0.5 rounded-full ml-2 align-middle">v2.2</span></h1>
                                <p className="text-[10px] font-black text-m3-on-surface-variant/40 uppercase tracking-[0.2em] mt-1">Gestão de Inteligência Financeira e Contas</p>
                            </div>
                        </div>
                        
                        <div className="flex items-end gap-4">
                            <div className="text-6xl font-black tracking-tighter text-m3-on-surface">
                                {fmt(totalBalance)}
                            </div>
                            <div className="mb-2 flex items-center gap-2 px-4 py-1.5 bg-emerald-500/10 text-emerald-600 rounded-full border border-emerald-500/20 text-[10px] font-black uppercase tracking-widest backdrop-blur-sm">
                                <span className="material-symbols-outlined text-sm font-black">trending_up</span> {bankAccounts.length} CONTAS ATIVAS
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-4 w-full md:w-auto">
                        <button
                            onClick={onNewAccount}
                            className="flex-1 md:flex-none flex items-center justify-center gap-3 bg-m3-primary text-white px-8 py-5 rounded-[24px] font-black text-xs transition-all hover:bg-m3-primary/90 hover:scale-105 active:scale-95 shadow-2xl shadow-m3-primary/20 uppercase tracking-[0.2em]"
                        >
                            <span className="material-symbols-outlined text-xl">add</span> NOVA CONTA
                        </button>
                    </div>
                </div>
            </div>

            {/* ── Main Content Area ── */}
            <div className="flex gap-10 flex-1 min-h-0">
                {/* LEFT COLUMN: Bank Accounts & Cards */}
                <div className="flex-1 space-y-10 overflow-y-auto no-scrollbar pr-4">
                    {/* Search & Tabs Header */}
                    <div className="flex flex-col sm:flex-row justify-between items-center bg-m3-surface-container-low p-6 rounded-[32px] border border-m3-outline-variant/20 shadow-sm sticky top-0 z-20 backdrop-blur-xl">
                        <div className="flex items-center gap-2 mb-4 sm:mb-0">
                            <span className="text-[10px] font-black text-white bg-m3-primary px-4 py-2 rounded-full uppercase tracking-[0.2em] shadow-lg shadow-m3-primary/10">Visão Geral</span>
                            <span className="text-[10px] font-black text-m3-on-surface-variant/40 px-4 py-2 rounded-full uppercase tracking-[0.2em] border border-m3-outline-variant/10">Arquivo</span>
                        </div>
                        <div className="relative w-full sm:w-80 group">
                            <span className="material-symbols-outlined absolute left-5 top-1/2 -translate-y-1/2 text-m3-on-surface-variant/40 group-focus-within:text-m3-primary transition-colors text-xl">search</span>
                            <input
                                type="text"
                                placeholder="PROCURAR POR BANCO OU CONTA..."
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                className="w-full pl-14 pr-6 py-4 bg-white/50 border border-m3-outline-variant/10 rounded-[20px] text-xs font-black uppercase tracking-wider outline-none focus:ring-4 focus:ring-m3-primary/5 focus:border-m3-primary/30 focus:bg-white transition-all shadow-inner placeholder:text-m3-on-surface-variant/20"
                            />
                        </div>
                    </div>

                    {loading ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-8">
                            {[1, 2, 3, 4].map(n => <div key={n} className="h-64 rounded-[32px] bg-m3-surface-container-low animate-pulse border border-m3-outline-variant/10" />)}
                        </div>
                    ) : (
                        <div className="space-y-12 pb-10">
                            {/* Bank Accounts Grid */}
                            <div className="space-y-6">
                                <div className="flex items-center justify-between px-4">
                                    <h2 className="text-xs font-black text-m3-on-surface-variant uppercase tracking-[0.3em] flex items-center gap-4">
                                        <span className="w-8 h-px bg-m3-outline-variant/30"></span> Contas Bancárias <span className="text-[10px] bg-m3-surface-container-high text-m3-primary px-3 py-1 rounded-full border border-m3-outline-variant/10">{filtered.length}</span>
                                    </h2>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-8">
                                    {filtered.map(acc => (
                                        <AccountCard
                                            key={acc.id}
                                            account={acc}
                                            onClick={() => onSelectAccount(acc)}
                                            onEdit={() => onEditAccount(acc)}
                                            onDelete={() => setAccountToDelete(acc)}
                                        />
                                    ))}
                                    <ConnectCard onClick={onNewAccount} />
                                </div>
                            </div>

                            {/* Credit Cards Section */}
                            {(filteredCards.length > 0) && (
                                <div className="space-y-6">
                                    <h2 className="text-xs font-black text-m3-on-surface-variant uppercase tracking-[0.3em] px-4 flex items-center gap-4">
                                        <span className="w-8 h-px bg-m3-outline-variant/30"></span> Cartões de Crédito <span className="text-[10px] bg-m3-surface-container-high text-m3-primary px-3 py-1 rounded-full border border-m3-outline-variant/10">{filteredCards.length}</span>
                                    </h2>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        {filteredCards.map(acc => (
                                            <CreditCardRow
                                                key={acc.id}
                                                account={acc}
                                                onClick={() => onSelectAccount(acc)}
                                                onEdit={() => onEditAccount(acc)}
                                                onDelete={() => setAccountToDelete(acc)}
                                            />
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* RIGHT COLUMN: Sidebar Stats */}
                <div className="w-80 hidden xl:flex flex-col gap-8">
                    {/* Monthly Summary Card */}
                    <div className="bg-m3-surface-container-low rounded-[32px] p-8 border border-m3-outline-variant/30 shadow-sm relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-m3-primary/5 rounded-full -mr-16 -mt-16"></div>
                        <div className="flex items-center justify-between mb-8 relative z-10">
                            <h3 className="text-[10px] font-black text-m3-on-surface-variant uppercase tracking-[0.2em]">Resultado Mensal</h3>
                            <span className="text-[10px] font-black text-m3-primary bg-m3-primary/10 px-3 py-1 rounded-full uppercase tracking-widest">{monthLabel}</span>
                        </div>
                        
                        <div className="space-y-4 relative z-10">
                            <div className="group p-5 bg-white rounded-2xl border border-m3-outline-variant/10 transition-all hover:border-emerald-500/30">
                                <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest mb-1">Entradas</p>
                                <p className="text-xl font-black text-emerald-600 tabular-nums">{fmt(monthlyIncome)}</p>
                            </div>
                            
                            <div className="group p-5 bg-white rounded-2xl border border-m3-outline-variant/10 transition-all hover:border-m3-error/30">
                                <p className="text-[9px] font-black text-m3-error uppercase tracking-widest mb-1">Saídas</p>
                                <p className="text-xl font-black text-m3-error tabular-nums">{fmt(monthlyExpense)}</p>
                            </div>
                            
                            <div className={`p-5 rounded-2xl border transition-all ${monthlyIncome - monthlyExpense >= 0 ? 'bg-m3-primary text-white border-transparent shadow-lg shadow-m3-primary/20' : 'bg-amber-500 text-white border-transparent'}`}>
                                <p className="text-[9px] font-black text-white/60 uppercase tracking-widest mb-1">Saldo Operacional</p>
                                <p className="text-xl font-black tabular-nums">{fmt(monthlyIncome - monthlyExpense)}</p>
                            </div>
                        </div>

                        <button className="w-full mt-8 py-4 bg-m3-surface-container-high hover:bg-m3-surface-container-highest text-m3-on-surface-variant font-black text-[10px] rounded-[16px] transition-all flex items-center justify-center gap-3 group uppercase tracking-[0.2em] relative z-10">
                            ANÁLISE <span className="material-symbols-outlined text-base group-hover:translate-x-1 transition-transform">chevron_right</span>
                        </button>
                    </div>

                    {/* Recent Stream */}
                    <div className="bg-m3-surface-container-low rounded-[32px] p-8 border border-m3-outline-variant/30 shadow-sm flex-1 flex flex-col min-h-0 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-m3-on-surface/5 rounded-full -mr-12 -mt-12"></div>
                        <div className="flex items-center justify-between mb-8 relative z-10">
                            <h3 className="text-[10px] font-black text-m3-on-surface-variant uppercase tracking-[0.2em]">Atividades</h3>
                            <button className="text-[9px] font-black text-m3-primary hover:underline transition-colors uppercase tracking-widest">VER TUDO</button>
                        </div>
                        
                        <div className="space-y-6 overflow-y-auto no-scrollbar flex-1 relative z-10">
                            {recentActivity.length === 0 ? (
                                <div className="text-center py-16">
                                    <div className="w-16 h-16 bg-m3-surface-container-high rounded-[20px] flex items-center justify-center mx-auto mb-4 border border-m3-outline-variant/10">
                                        <span className="material-symbols-outlined text-3xl text-m3-on-surface-variant/20">history</span>
                                    </div>
                                    <p className="text-m3-on-surface-variant/30 text-[9px] font-black uppercase tracking-widest">Sem atividades</p>
                                </div>
                            ) : (
                                recentActivity.map(t => {
                                    const acc = accounts.find(a => a.id === t.account_id);
                                    return (
                                        <div key={t.id} className="flex items-center gap-4 group">
                                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-110 ${t.type === 'INCOME' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-m3-error/10 text-m3-error'}`}>
                                                <span className="material-symbols-outlined text-xl">{t.type === 'INCOME' ? 'trending_up' : 'trending_down'}</span>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs font-black text-m3-on-surface truncate group-hover:text-m3-primary transition-colors tracking-tight">{t.description}</p>
                                                <p className="text-[9px] text-m3-on-surface-variant/40 font-black uppercase tracking-wider mt-0.5">
                                                    <span className="text-m3-on-surface-variant/60">{acc?.name ?? 'Conta'}</span> • {formatDate(t.due_date)}
                                                </p>
                                            </div>
                                            <div className="text-right">
                                                <p className={`text-xs font-black tabular-nums ${t.type === 'INCOME' ? 'text-emerald-600' : 'text-m3-on-surface'}`}>
                                                    {t.type === 'INCOME' ? '+' : '-'} {fmt(Number(t.amount))}
                                                </p>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                        
                        {/* Conciliação Teaser */}
                        <div className="mt-10 p-6 bg-m3-on-surface-variant rounded-[24px] text-white relative overflow-hidden group/teaser">
                            <div className="absolute -right-6 -bottom-6 opacity-10 group-hover/teaser:rotate-45 transition-transform duration-700">
                                <span className="material-symbols-outlined text-8xl">sync</span>
                            </div>
                            <p className="text-[9px] font-black text-white/40 mb-1 tracking-[0.2em] uppercase">Módulo Extra</p>
                            <h4 className="font-black text-sm mb-2 tracking-tight">Conciliação Inteligente</h4>
                            <p className="text-[9px] text-white/50 leading-relaxed mb-6 font-medium uppercase tracking-wider">Importe extratos e automatize sua gestão financeira.</p>
                            <button 
                                onClick={onShowReconciliation}
                                className="w-full py-3 bg-white text-m3-on-surface-variant font-black text-[9px] rounded-xl shadow-xl hover:bg-m3-surface-container-low transition-all uppercase tracking-widest active:scale-95"
                            >
                                CONFIGURAR AGORA
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AccountsView;
