import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
    Plus, Search, MoreVertical, Edit2, Archive,
    CreditCard, Landmark, Bell, HelpCircle,
    TrendingDown, TrendingUp, ArrowRight, Filter,
    ArrowLeftRight, Upload, ExternalLink, RefreshCw,
    AlertTriangle, CheckCircle2, Clock
} from 'lucide-react';
import { FinancialAccount, FinancialTransaction } from '../../types';

// ── Helpers ─────────────────────────────────────────────────────────────────
const fmt = (v: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v ?? 0);

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

function getBankAbbrev(name: string) {
    const map: Record<string, string> = {
        itau: 'ITAÚ', bradesco: 'BDC', santander: 'SNT',
        'banco do brasil': 'BB', bb: 'BB', caixa: 'CEF',
        nubank: 'NU', inter: 'INT', c6: 'C6', picpay: 'PIC',
        sicoob: 'SCB', sicredi: 'SCR', btg: 'BTG', xp: 'XP',
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
        sicredi: '#50A000',
    };
    const lower = name.toLowerCase();
    for (const [key, color] of Object.entries(map)) {
        if (lower.includes(key)) return color;
    }
    return '#3B82F6';
}

function getBankTextColor(name: string) {
    // Yellow backgrounds need dark text
    const lower = name.toLowerCase();
    if (lower.includes('brasil') || lower.includes(' bb')) return '#000';
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
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-all"
            >
                <MoreVertical size={15} />
            </button>
            {open && (
                <div className="absolute right-0 top-8 w-36 bg-white rounded-xl shadow-xl border border-slate-100 z-50 overflow-hidden py-1">
                    <button
                        onClick={e => { e.stopPropagation(); onEdit(); setOpen(false); }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                    >
                        <Edit2 size={13} /> Editar
                    </button>
                    <button
                        onClick={e => { e.stopPropagation(); onDelete(); setOpen(false); }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                    >
                        <Archive size={13} /> Arquivar
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
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[80] p-4">
            <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden">
                <div className="bg-gradient-to-br from-red-500 to-rose-600 p-5 flex items-center gap-3 text-white">
                    <div className="p-2 bg-white/20 rounded-xl"><AlertTriangle size={18} /></div>
                    <div>
                        <h2 className="font-black text-base">Arquivar Conta</h2>
                        <p className="text-red-100 text-xs">O histórico será preservado</p>
                    </div>
                </div>
                <div className="p-5 space-y-4">
                    <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                        <p className="font-bold text-slate-800">{account.name}</p>
                        <p className="text-sm text-slate-500">Saldo: {fmt(account.current_balance)}</p>
                    </div>
                    <p className="text-sm text-slate-600">A conta deixará de aparecer nas listas ativas. Pode ser reativada pelo suporte.</p>
                    <div className="flex gap-3">
                        <button onClick={onCancel} className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-sm transition-all">Cancelar</button>
                        <button onClick={onConfirm} className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-sm transition-all shadow-lg shadow-red-100">Arquivar</button>
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
            className="card-base border-border-slate-100 cursor-pointer transition-all flex flex-col gap-3"
        >
            <div className="flex items-start justify-between">
                {logoUrl ? (
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center p-1 bg-white border border-slate-100 shadow-sm flex-shrink-0">
                        <img src={logoUrl} alt={account.name} className="max-w-full max-h-full object-contain mix-blend-multiply opacity-90" />
                    </div>
                ) : (
                    <div
                        className="w-12 h-12 rounded-xl flex items-center justify-center font-black text-sm shadow-sm flex-shrink-0"
                        style={{ backgroundColor: color, color: textColor }}
                    >
                        {abbrev}
                    </div>
                )}
                <AccountMenu onEdit={onEdit} onDelete={onDelete} />
            </div>

            <div>
                <p className="font-bold text-slate-800 text-[15px] leading-tight">{account.name}</p>
                {(account as any).agency || (account as any).account_number ? (
                    <p className="text-xs text-slate-400 mt-0.5">
                        {(account as any).agency ? `Ag: ${(account as any).agency}` : ''}
                        {(account as any).agency && (account as any).account_number ? ' | ' : ''}
                        {(account as any).account_number ? `CC: ${(account as any).account_number}` : ''}
                    </p>
                ) : (
                    <p className="text-xs text-slate-400 mt-0.5">
                        {account.type === 'CREDIT_CARD' ? 'Cartão de Crédito' : 'Conta Bancária'}
                    </p>
                )}
            </div>

            <div>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Saldo Atual</p>
                <div className="flex items-center justify-between">
                    <p className="text-xl font-black text-slate-800">{fmt(account.current_balance)}</p>
                    <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                        {account.type === 'CREDIT_CARD' ? 'Crédito' : 'Corrente'}
                    </span>
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
            className="rounded-2xl border-2 border-dashed border-slate-200 p-5 cursor-pointer hover:border-blue-300 hover:bg-blue-50/30 transition-all flex flex-col items-center justify-center gap-2 min-h-[170px] group"
        >
            <div className="w-10 h-10 rounded-full bg-slate-100 group-hover:bg-blue-100 flex items-center justify-center transition-all">
                <Plus size={20} className="text-slate-400 group-hover:text-blue-500" />
            </div>
            <p className="font-bold text-slate-500 group-hover:text-blue-600 text-sm transition-colors">Adicionar Conta</p>
            <p className="text-xs text-slate-400 text-center">Conecte uma nova conta bancária</p>
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

    return (
        <div
            onClick={onClick}
            className="card-base border-slate-100 flex items-center gap-4 cursor-pointer transition-all"
        >
            {logoUrl ? (
                <div className="w-12 h-8 rounded-lg flex items-center justify-center p-0.5 bg-white border border-slate-100 flex-shrink-0 shadow-sm">
                    <img src={logoUrl} alt={account.name} className="max-w-full max-h-full object-contain mix-blend-multiply opacity-90" />
                </div>
            ) : (
                <div
                    className="w-12 h-8 rounded-lg flex items-center justify-center text-white font-black text-[10px] flex-shrink-0 shadow-sm"
                    style={{ backgroundColor: color }}
                >
                    {isVisa ? 'VISA' : isMaster ? 'MSTR' : abbrev}
                </div>
            )}
            <div className="flex-1 min-w-0">
                <p className="font-bold text-slate-800 text-sm truncate">{account.name}</p>
                <p className="text-xs text-slate-400">
                    •••• {account.last_four_digits || '0000'}
                    {account.due_day ? ` · Vence em ${account.due_day}/12` : ''}
                </p>
            </div>
            <div>
                {/* Fatura bar */}
                {account.credit_limit && (
                    <div className="w-24 mb-1">
                        <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
                            <div
                                className="h-full rounded-full"
                                style={{
                                    width: `${Math.min(100, Math.abs(account.current_balance) / account.credit_limit * 100)}%`,
                                    backgroundColor: color
                                }}
                            />
                        </div>
                    </div>
                )}
                <div className="text-right">
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Fatura Atual</p>
                    <p className="font-black text-sm text-red-500">{fmt(Math.abs(account.current_balance))}</p>
                </div>
            </div>
            <AccountMenu onEdit={onEdit} onDelete={onDelete} />
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
}

const AccountsView: React.FC<AccountsViewProps> = ({
    accounts, transactions, loading,
    onNewAccount, onEditAccount, onDeleteAccount, onSelectAccount,
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
        <div className="flex flex-col h-full">
            {/* Delete Modal */}
            {accountToDelete && (
                <DeleteModal
                    account={accountToDelete}
                    onCancel={() => setAccountToDelete(null)}
                    onConfirm={() => { onDeleteAccount(accountToDelete); setAccountToDelete(null); }}
                />
            )}

            {/* ── Filters Bar ── */}
            <div className="card-base border-slate-100 mb-6">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="flex items-center gap-2 text-slate-700 font-semibold">
                        <Landmark size={18} className="text-blue-600" />
                        <span>Gestão de Contas</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                            <input
                                type="text"
                                placeholder="Buscar contas..."
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                className="pl-8 pr-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all w-full lg:w-56"
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Two-column layout ── */}
            <div className="flex gap-6 flex-1 min-h-0">
                {/* LEFT MAIN */}
                <div className="flex-1 min-w-0 space-y-6 overflow-y-auto">

                    {/* Hero Banner (White Card Standard) */}
                    <div className="card-base border-none relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:scale-110 transition-transform">
                            <Landmark size={80} className="text-blue-600" />
                        </div>
                        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div>
                                <div className="flex items-center gap-2 mb-4">
                                    <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                                        <Landmark size={24} />
                                    </div>
                                    <p className="text-sm font-medium text-slate-500">Patrimônio Líquido Consolidado</p>
                                </div>
                                <div className="flex items-center gap-3">
                                    <p className="text-4xl font-black tracking-tight text-slate-800">{fmt(totalBalance)}</p>
                                    <span className="flex items-center gap-1 bg-emerald-50 text-emerald-600 text-xs font-bold px-2.5 py-1 rounded-full border border-emerald-100">
                                        <TrendingUp size={11} /> +{bankAccounts.length > 0 ? bankAccounts.length : 0} contas
                                    </span>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 mt-4 md:mt-0">
                                <button
                                    onClick={onNewAccount}
                                    className="btn-primary"
                                >
                                    <Plus size={16} /> Adicionar Conta
                                </button>
                                <button className="flex items-center gap-2 bg-slate-50 hover:bg-slate-100 text-slate-600 font-bold px-5 py-2.5 rounded-xl transition-all text-sm border border-slate-200">
                                    <Upload size={15} /> Importar Extrato
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Contas Ativas */}
                    {loading ? (
                        <div className="grid grid-cols-2 gap-4">
                            {[1, 2, 3, 4].map(n => <div key={n} className="h-44 rounded-2xl bg-slate-100 animate-pulse" />)}
                        </div>
                    ) : (
                        <>
                            <div>
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-2">
                                        <h2 className="font-black text-slate-800">Contas Ativas</h2>
                                        <span className="text-xs text-slate-500 font-bold bg-slate-100 px-2 py-0.5 rounded-full">
                                            {String(filtered.length).padStart(2, '0')}
                                        </span>
                                    </div>
                                    <button className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 font-bold border border-slate-200 rounded-lg px-3 py-1.5 bg-white hover:bg-slate-50 transition-all">
                                        <Filter size={13} /> Filtrar
                                    </button>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
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

                            {/* Cartões de Crédito Vinculados */}
                            {filteredCards.length > 0 && (
                                <div>
                                    <h2 className="font-black text-slate-800 mb-4">Cartões de Crédito Vinculados</h2>
                                    <div className="space-y-3">
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
                        </>
                    )}
                </div>

                {/* RIGHT SIDEBAR */}
                <div className="w-72 flex-shrink-0 space-y-5">

                    {/* Movimentação Mensal */}
                    <div className="card-base border-slate-100">
                        <div className="flex items-center justify-between mb-4">
                            <p className="font-black text-slate-800 text-sm">Movimentação Mensal</p>
                            <span className="text-[10px] text-slate-400 font-bold uppercase">{monthLabel}</span>
                        </div>
                        <div className="space-y-3">
                            <div className="flex items-center justify-between p-3 bg-emerald-50 rounded-xl">
                                <div className="flex items-center gap-2">
                                    <div className="w-7 h-7 rounded-full bg-emerald-100 flex items-center justify-center">
                                        <TrendingDown size={13} className="text-emerald-600 rotate-180" />
                                    </div>
                                    <p className="text-sm font-bold text-slate-700">Entradas</p>
                                </div>
                                <p className="font-black text-emerald-600 text-sm">{fmt(monthlyIncome)}</p>
                            </div>
                            <div className="flex items-center justify-between p-3 bg-red-50 rounded-xl">
                                <div className="flex items-center gap-2">
                                    <div className="w-7 h-7 rounded-full bg-red-100 flex items-center justify-center">
                                        <TrendingDown size={13} className="text-red-500" />
                                    </div>
                                    <p className="text-sm font-bold text-slate-700">Saídas</p>
                                </div>
                                <p className="font-black text-red-500 text-sm">{fmt(monthlyExpense)}</p>
                            </div>
                        </div>
                        <button className="w-full mt-4 text-xs text-blue-600 font-bold hover:underline flex items-center justify-center gap-1">
                            Ver Fluxo Detalhado <ArrowRight size={12} />
                        </button>
                    </div>

                    {/* Atividade Recente */}
                    <div className="card-base border-slate-100">
                        <div className="flex items-center justify-between mb-4">
                            <p className="font-black text-slate-800 text-sm">Atividade Recente</p>
                            <button className="text-xs text-blue-600 font-bold hover:underline">Ver Tudo</button>
                        </div>
                        {recentActivity.length === 0 ? (
                            <div className="text-center py-6">
                                <Clock size={24} className="text-slate-300 mx-auto mb-2" />
                                <p className="text-slate-400 text-xs">Nenhuma atividade recente</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {recentActivity.map(t => {
                                    const acc = accounts.find(a => a.id === t.account_id);
                                    return (
                                        <div key={t.id} className="flex items-center gap-3">
                                            {txnIcon(t.type)}
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs font-bold text-slate-800 truncate">{t.description}</p>
                                                <p className="text-[10px] text-slate-400">{acc?.name ?? ''} · {formatDate(t.due_date)}</p>
                                            </div>
                                            <p className={`text-xs font-black flex-shrink-0 ${t.type === 'INCOME' ? 'text-emerald-600' : 'text-red-500'}`}>
                                                {t.type === 'INCOME' ? '+' : '-'} {fmt(Number(t.amount))}
                                            </p>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Contas Inativas */}
                    <div className="card-base border-slate-100">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Contas Inativas</p>
                        <div className="text-center py-4">
                            <Landmark size={22} className="text-slate-200 mx-auto mb-2" />
                            <p className="text-xs text-slate-400">Nenhuma conta arquivada</p>
                        </div>
                    </div>

                    {/* Conciliação Automática promo */}
                    <div className="card-base border-blue-100 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-2 opacity-5 scale-150 rotate-12 transition-transform group-hover:rotate-45">
                            <RefreshCw size={80} className="text-blue-600" />
                        </div>
                        <div className="relative z-10">
                            <div className="flex items-center gap-2 mb-2">
                                <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg">
                                    <RefreshCw size={14} />
                                </div>
                                <p className="font-black text-sm text-slate-800">Conciliação Automática</p>
                            </div>
                            <p className="text-slate-500 text-xs mb-4 leading-relaxed font-medium">
                                Economize tempo importando seus extratos bancários. O ComissOne identifica pagamentos automaticamente.
                            </p>
                            <button className="w-full py-2 bg-blue-50 hover:bg-blue-100 text-blue-600 font-bold text-xs rounded-xl transition-all">
                                Saber mais
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AccountsView;
