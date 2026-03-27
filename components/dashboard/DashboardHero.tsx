import React from 'react';
import { TrendingUp, TrendingDown, Wallet, ShieldCheck } from 'lucide-react';
import { formatCurrency } from '../../src/utils/formatters';

interface DashboardHeroProps {
    userName: string;
    netWorth: number;
    reconciliationRate: number;
    incomeMonth: number;
    expenseMonth: number;
}

export const DashboardHero: React.FC<DashboardHeroProps> = ({
    userName,
    netWorth,
    reconciliationRate,
    incomeMonth,
    expenseMonth,
}) => {
    return (
        <div className="relative overflow-hidden rounded-[40px] bg-slate-900 px-10 py-14 text-white shadow-2xl shadow-slate-200/50">
            {/* Background Gradients */}
            <div className="absolute -right-20 -top-20 h-96 w-96 rounded-full bg-blue-600/30 blur-[120px]" />
            <div className="absolute -bottom-20 -left-20 h-96 w-96 rounded-full bg-indigo-600/20 blur-[120px]" />

            <div className="relative z-10 flex flex-col gap-10 md:flex-row md:items-center md:justify-between">
                <div>
                    <h2 className="text-xs font-black uppercase tracking-[0.4em] text-blue-400 mb-3 opacity-80">Visão Geral do Negócio</h2>
                    <h1 className="text-5xl md:text-6xl font-black tracking-tight mb-3">
                        Olá, <span className="text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400">{userName}</span>
                    </h1>
                    <p className="text-slate-400 font-medium max-w-md text-base leading-relaxed">
                        Sua saúde financeira em tempo real — métricas de competência do mês atual.
                    </p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {/* Receitas do Mês */}
                    <div className="bg-white/5 backdrop-blur-2xl p-6 rounded-[32px] border border-white/10 shadow-inner flex flex-col gap-1 min-w-[170px] hover:bg-white/10 transition-colors group">
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Receitas</span>
                            <div className="w-8 h-8 bg-emerald-500/20 rounded-xl flex items-center justify-center group-hover:bg-emerald-500/30 transition-colors">
                                <span className="material-symbols-outlined text-emerald-400 text-lg">trending_up</span>
                            </div>
                        </div>
                        <h3 className="text-xl font-black text-emerald-400 leading-tight">{formatCurrency(incomeMonth)}</h3>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tight">Competência mensal</p>
                    </div>

                    {/* Despesas do Mês */}
                    <div className="bg-white/5 backdrop-blur-2xl p-6 rounded-[32px] border border-white/10 shadow-inner flex flex-col gap-1 min-w-[170px] hover:bg-white/10 transition-colors group">
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Despesas</span>
                            <div className="w-8 h-8 bg-red-500/20 rounded-xl flex items-center justify-center group-hover:bg-red-500/30 transition-colors">
                                <span className="material-symbols-outlined text-red-400 text-lg">trending_down</span>
                            </div>
                        </div>
                        <h3 className="text-xl font-black text-red-400 leading-tight">{formatCurrency(expenseMonth)}</h3>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tight">Competência mensal</p>
                    </div>

                    {/* Patrimônio Líquido */}
                    <div className="bg-white/5 backdrop-blur-2xl p-6 rounded-[32px] border border-white/10 shadow-inner flex flex-col gap-1 min-w-[170px] hover:bg-white/10 transition-colors group">
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Patrimônio</span>
                            <div className="w-8 h-8 bg-blue-500/20 rounded-xl flex items-center justify-center group-hover:bg-blue-500/30 transition-colors">
                                <span className="material-symbols-outlined text-blue-400 text-lg">account_balance_wallet</span>
                            </div>
                        </div>
                        <h3 className="text-xl font-black text-white leading-tight">{formatCurrency(netWorth)}</h3>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tight">Saldo consolidado</p>
                    </div>

                    {/* Saúde da Reconciliação */}
                    <div className="bg-white/5 backdrop-blur-2xl p-6 rounded-[32px] border border-white/10 shadow-inner flex flex-col gap-1 min-w-[170px] hover:bg-white/10 transition-colors group">
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Reconciliação</span>
                            <div className="w-8 h-8 bg-indigo-500/20 rounded-xl flex items-center justify-center group-hover:bg-indigo-500/30 transition-colors">
                                <span className="material-symbols-outlined text-indigo-400 text-lg">verified_user</span>
                            </div>
                        </div>
                        <h3 className="text-xl font-black text-white leading-tight">{reconciliationRate}%</h3>
                        <div className="flex items-center gap-1.5 w-full mt-1.5">
                            <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                                <div className="h-full bg-indigo-400 rounded-full transition-all duration-1000" style={{ width: `${reconciliationRate}%` }} />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
