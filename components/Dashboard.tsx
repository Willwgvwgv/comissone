import React, { useMemo, useState } from 'react';
import {
  ComposedChart,
  Area,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
} from 'recharts';

import {
  Filter,
  X,
  TrendingUp,
  CheckCircle2,
  Clock,
  Award,
  AlertCircle,
  MessageCircle,
  BarChart3
} from 'lucide-react';
import { Sale, UserRole, User, CommissionStatus, SaleStatus } from '../types';
import { useFinancial } from '../src/lib/useFinancial';
import { formatCurrency } from '../src/utils/formatters';

// Dashboard Components
import { DashboardHero } from './dashboard/DashboardHero';
import { KPIGrid } from './dashboard/KPIGrid';
import { FinancialHealthPanel } from './dashboard/FinancialHealthPanel';

interface DashboardProps {
  sales: Sale[];
  currentUser: User;
}

const MONTHS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

const Dashboard: React.FC<DashboardProps> = ({ sales, currentUser }) => {
  const isAdmin = currentUser.role === UserRole.ADMIN;

  const [period, setPeriod] = useState<string>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [showReconciledOnly, setShowReconciledOnly] = useState(false);

  const { transactions, accounts } = useFinancial(currentUser.agency_id);

  // --- Financial Stats (Competência: due_date no mês atual) ---
  const financialStats = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const todayStr = now.toISOString().split('T')[0];
    const in7d = new Date(now);
    in7d.setDate(now.getDate() + 7);
    const in7dStr = in7d.toISOString().split('T')[0];

    let incomeMonth = 0;
    let expenseMonth = 0;

    const overdueItems = [];
    const dueTodayItems = [];
    const dueNext7Items = [];

    for (const t of transactions) {
      const dueDate = new Date(t.due_date + 'T00:00:00');
      const isCurrentMonth = dueDate.getMonth() === currentMonth && dueDate.getFullYear() === currentYear;

      // Competência do mês
      if (isCurrentMonth) {
        if (t.type === 'INCOME') incomeMonth += Number(t.amount);
        if (t.type === 'EXPENSE') expenseMonth += Number(t.amount);
      }

      // Alert groups - mutually exclusive, by due_date relative to today
      if (t.status === 'PENDING' || t.status === 'PARTIAL') {
        if (t.due_date < todayStr) {
          overdueItems.push(t);
        } else if (t.due_date === todayStr) {
          dueTodayItems.push(t);
        } else if (t.due_date > todayStr && t.due_date <= in7dStr) {
          dueNext7Items.push(t);
        }
      }
    }

    const netBalance = incomeMonth - expenseMonth;

    const netWorth = accounts.reduce((acc, a) => acc + (a.current_balance || 0), 0);

    // Reconciliation rate
    const totalTx = transactions.length || 1;
    const reconciledCount = transactions.filter(t => t.status === 'PAID').length;
    const reconciliationRate = Math.round((reconciledCount / totalTx) * 100);

    const criticalAccounts = accounts.filter(a => (a.current_balance || 0) < 0);

    return {
      incomeMonth,
      expenseMonth,
      netBalance,
      netWorth,
      reconciliationRate,
      overdueItems,
      dueTodayItems,
      dueNext7Items,
      criticalAccounts,
    };
  }, [transactions, accounts]);

  // --- Cashflow chart: last 6 months ---
  const cashflowChartData = useMemo(() => {
    const now = new Date();
    const months: { label: string; year: number; month: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({ label: MONTHS[d.getMonth()], year: d.getFullYear(), month: d.getMonth() });
    }

    return months.map(({ label, year, month }) => {
      let income = 0;
      let expense = 0;
      for (const t of transactions) {
        const d = new Date(t.due_date + 'T00:00:00');
        if (d.getMonth() === month && d.getFullYear() === year) {
          if (t.type === 'INCOME') income += Number(t.amount);
          if (t.type === 'EXPENSE') expense += Number(t.amount);
        }
      }
      return { name: label, Receitas: income, Despesas: expense, Saldo: income - expense };
    });
  }, [transactions]);

  // --- Sales stats ---
  const filteredSales = useMemo(() => {
    let result = [...sales];
    if (!isAdmin) {
      result = result.filter(s => s.splits.some(split => split.broker_id === currentUser.id));
    }
    const now = new Date();
    result = result.filter(s => {
      const saleDate = new Date(s.sale_date + 'T00:00:00');
      if (period === 'month') return saleDate.getMonth() === now.getMonth() && saleDate.getFullYear() === now.getFullYear();
      if (period === 'quarter') {
        const q = Math.floor(now.getMonth() / 3);
        return Math.floor(saleDate.getMonth() / 3) === q && saleDate.getFullYear() === now.getFullYear();
      }
      if (period === 'year') return saleDate.getFullYear() === now.getFullYear();
      if (period === 'custom' && startDate && endDate) {
        const start = new Date(startDate + 'T00:00:00');
        const end = new Date(endDate + 'T23:59:59');
        return saleDate >= start && saleDate <= end;
      }
      return true;
    });
    return result.filter(s => s.status !== SaleStatus.CANCELED);
  }, [sales, period, startDate, endDate, isAdmin, currentUser.id]);

  const salesStats = useMemo(() => {
    let totalVGV = 0;
    let totalComm = 0;
    let paidComm = 0;
    let pendingComm = 0;
    let overdueComm = 0;
    let forecast30d = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const date30d = new Date(today);
    date30d.setDate(today.getDate() + 30);
    const canceledCount = sales.filter(s => s.status === SaleStatus.CANCELED).length;

    filteredSales.forEach(sale => {
      if (sale.id.startsWith('local-')) return;
      const hasPaidSplit = sale.splits.some(sp => sp.status === CommissionStatus.PAID);
      if (showReconciledOnly && !hasPaidSplit) return;
      totalVGV += sale.vgv;
      sale.splits.forEach(split => {
        const isTarget = isAdmin ? true : split.broker_id === currentUser.id;
        if (isTarget) {
          totalComm += split.calculated_value;
          const todayCalc = new Date();
          todayCalc.setHours(0, 0, 0, 0);
          const isOverdue = split.status === CommissionStatus.OVERDUE ||
            (split.status === CommissionStatus.PENDING && split.forecast_date && new Date(split.forecast_date + 'T00:00:00') < todayCalc);
          if (split.status === CommissionStatus.PAID) paidComm += split.calculated_value;
          else if (isOverdue) overdueComm += split.calculated_value;
          else {
            pendingComm += split.calculated_value;
            if (split.forecast_date) {
              const fd = new Date(split.forecast_date + 'T00:00:00');
              if (fd >= todayCalc && fd <= date30d) forecast30d += split.calculated_value;
            }
          }
        }
      });
    });

    const brokerPerfMap: Record<string, { name: string; vgv: number; commissions: number }> = {};
    filteredSales.forEach(s => {
      if (s.id.startsWith('local-')) return;
      s.splits.forEach(split => {
        if (!brokerPerfMap[split.broker_id]) brokerPerfMap[split.broker_id] = { name: split.broker_name, vgv: 0, commissions: 0 };
        brokerPerfMap[split.broker_id].commissions += split.calculated_value;
        brokerPerfMap[split.broker_id].vgv += (s.vgv * (split.percentage / 100));
      });
    });

    return {
      totalVGV, totalComm, paidComm, pendingComm, overdueComm, forecast30d, canceledCount,
      brokerPerformance: Object.values(brokerPerfMap).sort((a, b) => b.vgv - a.vgv),
    };
  }, [filteredSales, currentUser.id, isAdmin, sales, showReconciledOnly]);

  const chartData = useMemo(() => {
    const dataMap = new Map<string, { vgv: number; comm: number; order: number }>();
    filteredSales.forEach(sale => {
      const date = new Date(sale.sale_date + 'T00:00:00');
      const monthIndex = date.getMonth();
      const key = `${MONTHS[monthIndex]}/${date.getFullYear()}`;
      if (!dataMap.has(key)) dataMap.set(key, { vgv: 0, comm: 0, order: date.getTime() });
      const current = dataMap.get(key)!;
      current.vgv += sale.vgv;
      let saleComm = 0;
      sale.splits.forEach(split => {
        if (isAdmin ? true : split.broker_id === currentUser.id) saleComm += split.calculated_value;
      });
      current.comm += saleComm;
    });
    const sortedData = Array.from(dataMap.entries())
      .map(([name, data]) => ({ name: name.split('/')[0], vgv: data.vgv, comm: data.comm, order: data.order }))
      .sort((a, b) => a.order - b.order);
    return sortedData.map((item, index) => {
      let vgvDelta = 0, commDelta = 0;
      if (index > 0) {
        const prev = sortedData[index - 1];
        if (prev.vgv > 0) vgvDelta = ((item.vgv - prev.vgv) / prev.vgv) * 100;
        if (prev.comm > 0) commDelta = ((item.comm - prev.comm) / prev.comm) * 100;
      }
      return { ...item, vgvDelta, commDelta };
    });
  }, [filteredSales, isAdmin, currentUser.id]);

  const statusData = [
    { name: 'Pago', value: salesStats.paidComm, color: '#10b981' },
    { name: 'A Receber', value: salesStats.pendingComm, color: '#3b82f6' },
    { name: 'Vencido', value: salesStats.overdueComm, color: '#ef4444' },
  ];

  return (
    <div className="space-y-8 page-transition pb-10">

      {/* 1. Dashboard Hero – with real financial data */}
      <DashboardHero
        userName={currentUser.name}
        netWorth={financialStats.netWorth}
        reconciliationRate={financialStats.reconciliationRate}
        incomeMonth={financialStats.incomeMonth}
        expenseMonth={financialStats.expenseMonth}
      />

      {/* 2. Filter Bar */}
      <div className="bg-m3-surface-container-low rounded-[32px] p-6 border border-m3-outline-variant/30 shadow-sm backdrop-blur-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex items-center gap-3 text-m3-on-surface font-bold">
            <div className="w-10 h-10 bg-m3-primary/10 rounded-2xl flex items-center justify-center text-m3-primary">
              <span className="material-symbols-outlined">filter_list</span>
            </div>
            <div className="flex flex-col">
              <span className="text-sm leading-tight">Filtros de Análise</span>
              <span className="text-[10px] text-m3-on-surface-variant font-medium opacity-60">Personalize sua visão</span>
            </div>
            {(period !== 'all' || startDate !== '') && (
              <button
                onClick={() => { setPeriod('all'); setStartDate(''); setEndDate(''); }}
                className="ml-4 text-[10px] bg-m3-surface-container-high text-m3-on-surface-variant px-3 py-1.5 rounded-full flex items-center gap-2 hover:bg-m3-outline-variant/20 transition-all font-black uppercase tracking-wider cursor-pointer"
              >
                Limpar <span className="material-symbols-outlined text-xs">close</span>
              </button>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-6">
            <label className="flex items-center gap-3 cursor-pointer group">
              <div
                onClick={() => setShowReconciledOnly(!showReconciledOnly)}
                className={`w-11 h-6 rounded-full p-1 cursor-pointer transition-all duration-300 ${showReconciledOnly ? 'bg-m3-primary shadow-lg shadow-m3-primary/20' : 'bg-m3-outline-variant/50'}`}
              >
                <div className={`w-4 h-4 bg-white rounded-full transition-transform duration-300 shadow-sm ${showReconciledOnly ? 'translate-x-5' : 'translate-x-0'}`} />
              </div>
              <span className={`text-[10px] font-black uppercase tracking-[0.1em] transition-colors ${showReconciledOnly ? 'text-m3-primary' : 'text-m3-on-surface-variant opacity-60'}`}>Apenas Realizados</span>
            </label>
            
            <div className="flex items-center gap-2 bg-white/50 p-1 rounded-2xl border border-m3-outline-variant/30 shadow-inner">
              <select
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                className="bg-transparent text-sm font-bold text-m3-on-surface-variant px-4 py-2 outline-none border-none cursor-pointer appearance-none"
              >
                <option value="all">Todo o Período</option>
                <option value="month">Este Mês</option>
                <option value="quarter">Trimestre Atual</option>
                <option value="year">Ano Atual</option>
                <option value="custom">Datas Customizadas</option>
              </select>
              <span className="material-symbols-outlined text-m3-on-surface-variant/40 pr-3 pointer-events-none">expand_more</span>
            </div>

            {period === 'custom' && (
              <div className="flex items-center gap-4 bg-white/50 p-2 px-5 rounded-2xl border border-m3-outline-variant/30 animate-in fade-in slide-in-from-right-4 duration-500">
                <div className="flex items-center gap-2">
                  <label className="text-[10px] font-black text-m3-on-surface-variant uppercase tracking-widest opacity-60">De</label>
                  <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="bg-transparent text-xs font-bold text-m3-on-surface px-2 py-1.5 rounded-lg outline-none border-none focus:ring-0" />
                </div>
                <div className="w-px h-4 bg-m3-outline-variant/30" />
                <div className="flex items-center gap-2">
                  <label className="text-[10px] font-black text-m3-on-surface-variant uppercase tracking-widest opacity-60">Até</label>
                  <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="bg-transparent text-xs font-bold text-m3-on-surface px-2 py-1.5 rounded-lg outline-none border-none focus:ring-0" />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 3. KPI Grid – commission data */}
      <KPIGrid
        paidCommissions={salesStats.paidComm}
        pendingCommissions={salesStats.pendingComm}
        overdueCommissions={salesStats.overdueComm}
        canceledCount={salesStats.canceledCount}
        totalVGV={salesStats.totalVGV}
        reconciliationRate={financialStats.reconciliationRate}
      />

      {/* 4. Financial Health Panel – real financial data */}
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
        <FinancialHealthPanel
          stats={{
            incomeMonth: financialStats.incomeMonth,
            expenseMonth: financialStats.expenseMonth,
            netBalance: financialStats.netBalance,
            overdueItems: financialStats.overdueItems,
            dueTodayItems: financialStats.dueTodayItems,
            dueNext7Items: financialStats.dueNext7Items,
            criticalAccounts: financialStats.criticalAccounts,
          }}
          accounts={accounts}
        />
      </div>

      {/* 5. Cashflow Chart – last 6 months */}
      <div className="bg-m3-surface-container-low rounded-[32px] p-8 border border-m3-outline-variant/30 shadow-sm overflow-hidden group">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10">
          <div className="flex items-center gap-3">
            <div className="w-1.5 h-6 bg-m3-primary rounded-full shadow-sm shadow-m3-primary/30" />
            <h4 className="text-sm font-black text-m3-on-surface uppercase tracking-[0.2em] opacity-80">Fluxo de Caixa — Últimos 6 Meses</h4>
          </div>
          <div className="flex items-center gap-6 bg-white/40 backdrop-blur-md px-5 py-2.5 rounded-full border border-m3-outline-variant/20">
            <div className="flex items-center gap-2 text-[10px] font-black text-emerald-600 uppercase tracking-widest leading-none">
              <div className="w-3 h-1 bg-emerald-500 rounded-full" /> Receitas
            </div>
            <div className="flex items-center gap-2 text-[10px] font-black text-rose-600 uppercase tracking-widest leading-none">
              <div className="w-3 h-1 bg-rose-500 rounded-full" /> Despesas
            </div>
            <div className="flex items-center gap-2 text-[10px] font-black text-indigo-600 uppercase tracking-widest leading-none">
              <div className="w-3 h-1 bg-indigo-500 rounded-full bg-opacity-50" /> Saldo
            </div>
          </div>
        </div>
        <div className="h-[280px] min-h-[280px] -ml-4 relative">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={cashflowChartData} margin={{ top: 10, right: 10, bottom: 0, left: 10 }}>
              <defs>
                <linearGradient id="colorReceitas" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorDespesas" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#c2c6d4" strokeOpacity={0.2} />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#424752', fontSize: 11, fontWeight: 700 }} dy={15} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: '#424752', fontSize: 10, fontWeight: 700 }} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
              <Tooltip
                contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.15)', padding: '16px', backgroundColor: 'rgba(255, 255, 255, 0.95)', backdropFilter: 'blur(8px)' }}
                formatter={(value: number, name: string) => [formatCurrency(value), name]}
              />
              <Area type="monotone" dataKey="Receitas" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorReceitas)" dot={{ r: 4, fill: '#10b981', strokeWidth: 3, stroke: '#fff' }} activeDot={{ r: 6, strokeWidth: 0 }} />
              <Area type="monotone" dataKey="Despesas" stroke="#ef4444" strokeWidth={3} fillOpacity={1} fill="url(#colorDespesas)" dot={{ r: 4, fill: '#ef4444', strokeWidth: 3, stroke: '#fff' }} activeDot={{ r: 6, strokeWidth: 0 }} />
              <Line type="monotone" dataKey="Saldo" stroke="#6366f1" strokeWidth={2} strokeDasharray="6 6" dot={false} opacity={0.5} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 6. Sales Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-m3-surface-container-low rounded-[32px] p-8 border border-m3-outline-variant/30 shadow-sm group">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="w-1.5 h-6 bg-m3-primary rounded-full shadow-sm shadow-m3-primary/30" />
              <h3 className="text-sm font-black text-m3-on-surface uppercase tracking-[0.2em] opacity-80">Evolução de Vendas & Comissões</h3>
            </div>
          </div>
          <div className="h-[320px] min-h-[320px] -ml-4 relative">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#c2c6d4" strokeOpacity={0.2} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#424752', fontSize: 11, fontWeight: 700 }} dy={15} />
                <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fill: '#004e9c', fontSize: 10, fontWeight: 800 }} tickFormatter={(v) => `R$${v / 1000}k`} />
                <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fill: '#1566c3', fontSize: 10, fontWeight: 800 }} tickFormatter={(v) => `R$${v / 1000}k`} />
                <Tooltip
                  contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.15)', padding: '0', backgroundColor: 'transparent' }}
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      const vgv = payload[0]?.value as number;
                      const comm = payload[1]?.value as number;
                      return (
                        <div className="bg-white/95 backdrop-blur-xl p-5 rounded-[24px] shadow-2xl border border-m3-outline-variant/20 min-w-[220px] animate-in zoom-in-95 duration-200">
                          <p className="font-black text-m3-on-surface mb-3 border-b border-m3-outline-variant/10 pb-2 text-sm uppercase tracking-widest">{label}</p>
                          <div className="space-y-3">
                            <div className="flex items-center justify-between gap-4">
                              <span className="text-[10px] font-black text-m3-on-surface-variant uppercase tracking-wider opacity-60 leading-none">VGV Acumulado</span>
                              <span className="font-black text-m3-primary">{formatCurrency(vgv)}</span>
                            </div>
                            <div className="flex items-center justify-between gap-4">
                              <span className="text-[10px] font-black text-m3-on-surface-variant uppercase tracking-wider opacity-60 leading-none">Comissões Brutas</span>
                              <span className="font-black text-m3-primary-container">{formatCurrency(comm)}</span>
                            </div>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar yAxisId="left" dataKey="vgv" name="VGV Mensal" fill="#004e9c" radius={[8, 8, 0, 0]} barSize={45} />
                <Line yAxisId="right" type="monotone" dataKey="comm" name="Comissões" stroke="#1566c3" strokeWidth={4} dot={{ r: 6, fill: '#1566c3', strokeWidth: 3, stroke: '#fff' }} activeDot={{ r: 8, strokeWidth: 0 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-m3-surface-container-low rounded-[32px] p-8 border border-m3-outline-variant/30 shadow-sm">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-1.5 h-6 bg-m3-primary rounded-full shadow-sm shadow-m3-primary/30" />
            <h3 className="text-sm font-black text-m3-on-surface uppercase tracking-[0.2em] opacity-80">Status de Comissões</h3>
          </div>
          <div className="h-[250px] min-h-[250px] relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={statusData} cx="50%" cy="50%" innerRadius={70} outerRadius={95} paddingAngle={8} dataKey="value">
                  {statusData.map((entry, index) => (<Cell key={`cell-${index}`} fill={entry.color} className="stroke-none hover:opacity-80 transition-opacity" />))}
                </Pie>
                <Tooltip formatter={(value: unknown) => formatCurrency(value as number)} contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-m3-on-surface-variant text-[10px] font-black uppercase tracking-[0.2em] opacity-50">Total</span>
              <span className="text-m3-on-surface font-black text-xl tracking-tighter">{formatCurrency(salesStats.totalComm)}</span>
            </div>
          </div>
          <div className="mt-8 space-y-4">
            {statusData.map((item) => (
              <div key={item.name} className="flex items-center justify-between text-sm group cursor-default">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: item.color }} />
                  <span className="text-m3-on-surface-variant font-bold opacity-80 group-hover:opacity-100 transition-opacity">{item.name}</span>
                </div>
                <span className="font-black text-m3-on-surface">{formatCurrency(item.value)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 7. Broker Performance (Admin only) */}
      {isAdmin && salesStats.brokerPerformance.length > 0 && (
        <div className="bg-m3-surface-container-low rounded-[32px] border border-m3-outline-variant/30 shadow-sm overflow-hidden animate-in fade-in duration-1000 slide-in-from-bottom-6">
          <div className="p-8 border-b border-m3-outline-variant/10 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-1.5 h-6 bg-m3-primary rounded-full shadow-sm shadow-m3-primary/30" />
              <h3 className="text-sm font-black text-m3-on-surface uppercase tracking-[0.2em] opacity-80 flex items-center gap-2">
                Performance da Equipe
              </h3>
            </div>
            <div className="w-10 h-10 bg-m3-primary-container text-m3-on-primary-container rounded-2xl flex items-center justify-center">
              <span className="material-symbols-outlined text-xl">military_tech</span>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-[10px] font-black text-m3-on-surface-variant uppercase tracking-widest border-b border-m3-outline-variant/10">
                  <th className="py-5 px-8">Rank</th>
                  <th className="py-5 px-4">Especialista</th>
                  <th className="py-5 px-4">VGV Gerado</th>
                  <th className="py-5 px-8 text-right">Comissões</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-m3-outline-variant/5">
                {salesStats.brokerPerformance.map((broker, idx) => (
                  <tr key={broker.name} className="group hover:bg-white/40 transition-all duration-300">
                    <td className="py-5 px-8 pr-4">
                       <span className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-xs shadow-sm ${
                         idx === 0 ? 'bg-m3-tertiary-fixed text-m3-on-tertiary-fixed-variant' :
                         idx === 1 ? 'bg-m3-surface-container-high text-m3-on-surface' :
                         'bg-white text-m3-on-surface-variant'
                       }`}>
                         {idx + 1}
                       </span>
                    </td>
                    <td className="py-5 px-4">
                      <span className="font-bold text-m3-on-surface group-hover:text-m3-primary transition-colors">{broker.name}</span>
                    </td>
                    <td className="py-5 px-4">
                      <span className="font-bold text-m3-on-surface-variant text-sm">{formatCurrency(broker.vgv)}</span>
                    </td>
                    <td className="py-5 px-8 text-right">
                      <span className="font-black text-m3-primary text-base">{formatCurrency(broker.commissions)}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
