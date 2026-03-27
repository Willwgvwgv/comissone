import React from 'react';
import {
    TrendingUp,
    TrendingDown,
    Scale,
    AlertTriangle,
    AlertCircle,
    Clock,
    Landmark,
    CreditCard,
    ArrowUpRight,
    ArrowDownRight,
} from 'lucide-react';
import { FinancialTransaction, FinancialAccount } from '../../types';
import { formatCurrency } from '../../src/utils/formatters';

interface FinancialStats {
    incomeMonth: number;
    expenseMonth: number;
    netBalance: number;
    overdueItems: FinancialTransaction[];
    dueTodayItems: FinancialTransaction[];
    dueNext7Items: FinancialTransaction[];
    criticalAccounts: FinancialAccount[];
}

interface FinancialHealthPanelProps {
    stats: FinancialStats;
    accounts: FinancialAccount[];
    onNavigateToTransactions?: () => void;
}

const StatCard: React.FC<{
    label: string;
    value: number;
    icon: React.ReactNode;
    color: 'emerald' | 'red' | 'blue' | 'slate';
    trend?: number;
}> = ({ label, value, icon, color, trend }) => {
    const colorMap = {
        emerald: 'bg-emerald-50 border-emerald-100 text-emerald-600',
        red: 'bg-red-50 border-red-100 text-red-600',
        blue: 'bg-blue-50 border-blue-100 text-blue-600',
        slate: 'bg-slate-50 border-slate-100 text-slate-600',
    };
    const iconBgMap = {
        emerald: 'bg-emerald-100',
        red: 'bg-red-100',
        blue: 'bg-blue-100',
        slate: 'bg-slate-100',
    };
    const valueColorMap = {
        emerald: 'text-emerald-700',
        red: 'text-red-700',
        blue: 'text-blue-700',
        slate: 'text-slate-700',
    };

    return (
        <div className={`p-5 rounded-2xl border ${colorMap[color]} group hover:shadow-md transition-all`}>
            <div className="flex items-start justify-between mb-3">
                <p className="text-[10px] font-black uppercase tracking-widest opacity-70">{label}</p>
                <div className={`p-2 rounded-xl ${iconBgMap[color]}`}>
                    {icon}
                </div>
            </div>
            <h3 className={`text-xl font-black ${valueColorMap[color]}`}>{formatCurrency(value)}</h3>
            {trend !== undefined && (
                <div className={`flex items-center gap-1 mt-2 text-[10px] font-bold ${trend >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                    {trend >= 0 ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
                    <span>{Math.abs(trend).toFixed(1)}% vs mês anterior</span>
                </div>
            )}
        </div>
    );
};

const AlertBanner: React.FC<{
    label: string;
    count: number;
    total: number;
    color: 'red' | 'orange' | 'yellow';
    icon: React.ReactNode;
}> = ({ label, count, total, color, icon }) => {
    if (count === 0) return null;

    const colorMap = {
        red: 'bg-red-50 border-red-200 text-red-700',
        orange: 'bg-orange-50 border-orange-200 text-orange-700',
        yellow: 'bg-amber-50 border-amber-200 text-amber-700',
    };
    const badgeMap = {
        red: 'bg-red-600 text-white',
        orange: 'bg-orange-500 text-white',
        yellow: 'bg-amber-500 text-white',
    };

    return (
        <div className={`flex items-center justify-between p-4 rounded-2xl border ${colorMap[color]} transition-all`}>
            <div className="flex items-center gap-3">
                <div className="opacity-80">{icon}</div>
                <div>
                    <p className="font-bold text-sm">{label}</p>
                    <p className="text-xs opacity-70 font-medium">{count} lançamento{count > 1 ? 's' : ''}</p>
                </div>
            </div>
            <div className={`px-3 py-1.5 rounded-xl font-black text-sm ${badgeMap[color]}`}>
                {formatCurrency(total)}
            </div>
        </div>
    );
};

export const FinancialHealthPanel: React.FC<FinancialHealthPanelProps> = ({
    stats,
    accounts,
}) => {
    const { incomeMonth, expenseMonth, netBalance, overdueItems, dueTodayItems, dueNext7Items } = stats;

    const hasAlerts = overdueItems.length > 0 || dueTodayItems.length > 0 || dueNext7Items.length > 0;

    const overdueTotal = overdueItems.reduce((acc, t) => acc + Number(t.amount), 0);
    const dueTodayTotal = dueTodayItems.reduce((acc, t) => acc + Number(t.amount), 0);
    const dueNext7Total = dueNext7Items.reduce((acc, t) => acc + Number(t.amount), 0);

    const totalNetWorth = accounts.reduce((acc, a) => acc + (a.current_balance || 0), 0);
    const maxBalance = Math.max(...accounts.map(a => Math.abs(a.current_balance || 0)), 1);

    return (
        <div className="space-y-6">
            {/* Section Header */}
            <div className="flex items-center gap-2">
                <div className="w-1.5 h-5 bg-emerald-500 rounded-full" />
                <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Saúde Financeira do Mês</h4>
            </div>

            {/* Zone 1: Financial KPIs */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                    label="Receitas do Mês"
                    value={incomeMonth}
                    color="emerald"
                    icon={<TrendingUp size={16} className="text-emerald-600" />}
                />
                <StatCard
                    label="Despesas do Mês"
                    value={expenseMonth}
                    color="red"
                    icon={<TrendingDown size={16} className="text-red-600" />}
                />
                <StatCard
                    label="Saldo Líquido"
                    value={netBalance}
                    color={netBalance >= 0 ? 'blue' : 'red'}
                    icon={<Scale size={16} className={netBalance >= 0 ? 'text-blue-600' : 'text-red-600'} />}
                />
                <StatCard
                    label="Patrimônio Líquido"
                    value={totalNetWorth}
                    color="slate"
                    icon={<Landmark size={16} className="text-slate-600" />}
                />
            </div>

            {/* Zone 2: Smart Alerts */}
            {hasAlerts && (
                <div className="space-y-3">
                    <div className="flex items-center gap-2">
                        <div className="w-1.5 h-5 bg-red-500 rounded-full" />
                        <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Alertas de Vencimento</h4>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <AlertBanner
                            label="Vencidos"
                            count={overdueItems.length}
                            total={overdueTotal}
                            color="red"
                            icon={<AlertCircle size={18} />}
                        />
                        <AlertBanner
                            label="Vencem Hoje"
                            count={dueTodayItems.length}
                            total={dueTodayTotal}
                            color="orange"
                            icon={<AlertTriangle size={18} />}
                        />
                        <AlertBanner
                            label="Vencem em 7 Dias"
                            count={dueNext7Items.length}
                            total={dueNext7Total}
                            color="yellow"
                            icon={<Clock size={18} />}
                        />
                    </div>
                </div>
            )}

            {/* Zone 3: Account Balance Grid */}
            {accounts.length > 0 && (
                <div className="space-y-3">
                    <div className="flex items-center gap-2">
                        <div className="w-1.5 h-5 bg-indigo-500 rounded-full" />
                        <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Contas e Cartões</h4>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                        {accounts.map(account => {
                            const balance = account.current_balance || 0;
                            const isNegative = balance < 0;
                            const isCreditCard = account.type === 'CREDIT_CARD';
                            const barWidth = Math.min((Math.abs(balance) / maxBalance) * 100, 100);

                            return (
                                <div
                                    key={account.id}
                                    className={`p-4 rounded-2xl border transition-all ${isNegative ? 'bg-red-50/50 border-red-100' : 'bg-white border-slate-100'} hover:shadow-md`}
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                            {isCreditCard
                                                ? <CreditCard size={14} className="text-indigo-500" />
                                                : <Landmark size={14} className="text-blue-500" />
                                            }
                                            <span className="text-xs font-bold text-slate-600 truncate max-w-[100px]">{account.name}</span>
                                        </div>
                                        {isNegative && (
                                            <span className="text-[9px] font-black text-red-600 bg-red-100 px-1.5 py-0.5 rounded-full uppercase tracking-wider">Crítico</span>
                                        )}
                                    </div>
                                    <p className={`text-base font-black mb-2 ${isNegative ? 'text-red-600' : 'text-slate-800'}`}>
                                        {formatCurrency(balance)}
                                    </p>
                                    {/* Health bar */}
                                    <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
                                        <div
                                            className={`h-full rounded-full transition-all ${isNegative ? 'bg-red-400' : 'bg-emerald-400'}`}
                                            style={{ width: `${barWidth}%` }}
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
};
