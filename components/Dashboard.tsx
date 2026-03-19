
import React, { useMemo, useState } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import { SortableWidget } from './SortableWidget';
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
  Legend
} from 'recharts';

import {
  Filter,
  User as UserIcon,
  X,
  TrendingUp,
  Wallet,
  CheckCircle2,
  Clock,
  Award,
  AlertCircle,
  MessageCircle,
  Phone
} from 'lucide-react';
import { Sale, UserRole, User, CommissionStatus, SaleStatus, FinancialTransaction } from '../types';
import { useFinancial } from '../src/lib/useFinancial';
import { round2 } from '../src/lib/supabaseHooks';
import { formatCurrency } from '../src/utils/formatters';

interface DashboardProps {
  sales: Sale[];
  currentUser: User;
}

const Dashboard: React.FC<DashboardProps> = ({ sales, currentUser }) => {
  const isAdmin = currentUser.role === UserRole.ADMIN;

  // Estados dos Filtros
  const [kpiOrder, setKpiOrder] = useState<string[]>(() => {
    const defaultOrder = ['kpi-vgv', 'kpi-comm', 'kpi-paid', 'kpi-pending', 'kpi-forecast', 'kpi-canceled'];
    const saved = localStorage.getItem('comissone_kpi_order_v2');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const missing = defaultOrder.filter(id => !parsed.includes(id));
        return [...parsed, ...missing];
      } catch (e) {
        return defaultOrder;
      }
    }
    return defaultOrder;
  });

  const [chartOrder, setChartOrder] = useState<string[]>(() => {
    const defaultOrder = ['chart-trends', 'chart-status', 'chart-broker-perf'];
    const saved = localStorage.getItem('comissone_chart_order_v2');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const missing = defaultOrder.filter(id => !parsed.includes(id));
        return [...parsed, ...missing];
      } catch (e) {
        return defaultOrder;
      }
    }
    return defaultOrder;
  });
  const [period, setPeriod] = useState<string>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEndLabel = (event: DragEndEvent, type: 'kpi' | 'chart') => {
    const { active, over } = event;
    if (active && over && active.id !== over.id) {
      if (type === 'kpi') {
        const oldIndex = kpiOrder.indexOf(active.id as string);
        const newIndex = kpiOrder.indexOf(over.id as string);
        const newOrder = arrayMove(kpiOrder, oldIndex, newIndex);
        setKpiOrder(newOrder);
        localStorage.setItem('comissone_kpi_order_v2', JSON.stringify(newOrder));
      } else {
        const oldIndex = chartOrder.indexOf(active.id as string);
        const newIndex = chartOrder.indexOf(over.id as string);
        const newOrder = arrayMove(chartOrder, oldIndex, newIndex);
        setChartOrder(newOrder);
        localStorage.setItem('comissone_chart_order_v2', JSON.stringify(newOrder));
      }
    }
  };

  const { transactions } = useFinancial(currentUser.agency_id);

  const filteredSales = useMemo(() => {
    let result = [...sales];

    // 1. Isolamento por Role
    if (!isAdmin) {
      result = result.filter(s => s.splits.some(split => split.broker_id === currentUser.id));
    }

    // 2. Filtro de Corretor (Admin) - REMOVIDO: Dashboard agora mostra tudo


    // 3. Filtro de Período
    const now = new Date();
    result = result.filter(s => {
      const saleDate = new Date(s.sale_date + 'T00:00:00');

      if (period === 'month') {
        return saleDate.getMonth() === now.getMonth() && saleDate.getFullYear() === now.getFullYear();
      }
      if (period === 'quarter') {
        const currentQuarter = Math.floor(now.getMonth() / 3);
        const saleQuarter = Math.floor(saleDate.getMonth() / 3);
        return saleQuarter === currentQuarter && saleDate.getFullYear() === now.getFullYear();
      }
      if (period === 'year') {
        return saleDate.getFullYear() === now.getFullYear();
      }
      if (period === 'custom' && startDate && endDate) {
        const start = new Date(startDate + 'T00:00:00');
        const end = new Date(endDate + 'T23:59:59');
        return saleDate >= start && saleDate <= end;
      }
      return true;
    });

    // 4. Ignorar vendas canceladas
    result = result.filter(s => s.status !== SaleStatus.CANCELED);

    return result;
  }, [sales, period, startDate, endDate, isAdmin, currentUser.id]);

  const stats = useMemo(() => {
    const totalVGV = filteredSales.reduce((acc, curr) => acc + curr.vgv, 0);
    let totalComm = 0;
    let paidComm = 0;
    let pendingComm = 0;
    let overdueComm = 0;
    let forecast30d = 0;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const date30d = new Date(today);
    date30d.setDate(today.getDate() + 30);

    // Contar vendas canceladas de todas as vendas (antes de filtrar)
    const canceledCount = sales.filter(s => s.status === SaleStatus.CANCELED).length;

    filteredSales.forEach(sale => {
      if (sale.id.startsWith('local-')) return; // Pular dados locais

      sale.splits.forEach(split => {
        const isTargetBroker = isAdmin
          ? true
          : split.broker_id === currentUser.id;

        if (isTargetBroker) {
          totalComm += split.calculated_value;

          const todayCalc = new Date();
          todayCalc.setHours(0, 0, 0, 0);
          const isActuallyOverdue = split.status === CommissionStatus.OVERDUE ||
            (split.status === CommissionStatus.PENDING && split.forecast_date && new Date(split.forecast_date + 'T00:00:00') < todayCalc);

          if (split.status === CommissionStatus.PAID) paidComm += split.calculated_value;
          else if (isActuallyOverdue) overdueComm += split.calculated_value;
          else {
            pendingComm += split.calculated_value;
            // Previsão 30 dias
            if (split.forecast_date) {
              const fd = new Date(split.forecast_date + 'T00:00:00');
              if (fd >= todayCalc && fd <= date30d) {
                forecast30d += split.calculated_value;
              }
            }
          }
        }

      });
    });

    const brokerPerfMap: Record<string, { name: string; vgv: number; commissions: number }> = {};
    filteredSales.forEach(s => {
      if (s.id.startsWith('local-')) return; // Pular dados locais

      s.splits.forEach(split => {
        if (!brokerPerfMap[split.broker_id]) {
          brokerPerfMap[split.broker_id] = { name: split.broker_name, vgv: 0, commissions: 0 };
        }
        brokerPerfMap[split.broker_id].commissions += split.calculated_value;
        brokerPerfMap[split.broker_id].vgv += (s.vgv * (split.percentage / 100));
      });
    });

    return {
      totalVGV: filteredSales.filter(s => !s.id.startsWith('local-')).reduce((acc, curr) => acc + curr.vgv, 0),
      totalComm,
      paidComm,
      pendingComm,
      overdueComm,
      forecast30d,
      canceledCount,
      brokerPerformance: Object.values(brokerPerfMap).sort((a, b) => b.vgv - a.vgv)
    };
  }, [filteredSales, currentUser.id, isAdmin, sales]);

  const chartData = useMemo(() => {
    // Agrupamento por mês
    const dataMap = new Map<string, { vgv: number; comm: number; order: number }>();
    const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

    // Inicializa os últimos 6 meses (ou o ano todo se preferir, aqui fazendo dinâmico com base nos dados)
    // Se não tiver dados, o gráfico ficará vazio, o que é correto para "zerar".
    // Para manter a estética, podemos preencher com os meses do ano se quiser, mas vamos focar nos dados reais.

    // Iterar sobre as vendas filtradas para preencher os dados
    filteredSales.forEach(sale => {
      const date = new Date(sale.sale_date + 'T00:00:00'); // Ajuste de fuso simples
      const monthIndex = date.getMonth();
      const monthName = months[monthIndex];
      const key = `${monthName}/${date.getFullYear()}`; // Chave única por mês/ano

      if (!dataMap.has(key)) {
        dataMap.set(key, { vgv: 0, comm: 0, order: date.getTime() });
      }

      const current = dataMap.get(key)!;
      current.vgv += sale.vgv;

      // Calcular comissão atribuída (considerando filtros de admin/broker)
      let saleComm = 0;
      sale.splits.forEach(split => {
        const isTargetBroker = isAdmin
          ? true
          : split.broker_id === currentUser.id;

        if (isTargetBroker) {
          saleComm += split.calculated_value;
        }
      });
      current.comm += saleComm;
    });

    // Converter para array, ordenar cronologicamente e calcular deltas
    const sortedData = Array.from(dataMap.entries())
      .map(([name, data]) => ({
        name: name.split('/')[0],
        fullDate: name,
        vgv: data.vgv,
        comm: data.comm,
        order: data.order
      }))
      .sort((a, b) => a.order - b.order);

    return sortedData.map((item, index) => {
      let vgvDelta = 0;
      let commDelta = 0;

      if (index > 0) {
        const prev = sortedData[index - 1];
        if (prev.vgv > 0) vgvDelta = ((item.vgv - prev.vgv) / prev.vgv) * 100;
        if (prev.comm > 0) commDelta = ((item.comm - prev.comm) / prev.comm) * 100;
      }

      return {
        ...item,
        vgvDelta,
        commDelta
      };
    });
  }, [filteredSales, isAdmin, currentUser.id]);


  const statusData = [
    { name: 'Pago', value: stats.paidComm, color: '#10b981' },
    { name: 'A Receber', value: stats.pendingComm, color: '#3b82f6' },
    { name: 'Vencido', value: stats.overdueComm, color: '#ef4444' },
  ];


  const clearFilters = () => {
    setPeriod('all');
    setStartDate('');
    setEndDate('');
  };

  // ── Transactions Due Today ────────────────────────────────────────────────
  const dueToday = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    return transactions.filter(t => t.due_date === todayStr && t.status !== 'PAID');
  }, [transactions]);

  const handleWhatsAppNotify = () => {
    if (!currentUser.phone) {
      alert("Por favor, cadastre seu número de WhatsApp na aba 'Equipe' para usar esta função.");
      return;
    }

    const title = "*COMISSONE - Lembrete de Hoje* 🚀\n\n";
    const items = dueToday.map(t => `- *${t.description}*: ${formatCurrency(t.amount)}`).join('\n');
    const footer = "\n\nConfira no sistema!";

    const message = encodeURIComponent(title + items + footer);
    const phone = currentUser.phone.replace(/\D/g, '');
    window.open(`https://wa.me/${phone}?text=${message}`, '_blank');
  };

  return (
    <div className="space-y-6 page-transition">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="header-title">Dashboard Operacional</h1>
          <p className="header-subtitle">Bem-vindo(a) de volta, {currentUser.name}</p>
        </div>
      </div>
      {/* Alerta de Vencimentos do Dia (Admin Only) */}
      {isAdmin && dueToday.length > 0 && (
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-6 rounded-[32px] shadow-[0_8px_32px_rgba(59,130,246,0.3)] relative overflow-hidden animate-slide-up duration-500 border border-blue-400/30">
          {/* Decorative shapes */}
          <div className="absolute -right-8 -top-8 w-32 h-32 bg-white/20 rounded-full blur-2xl" />
          <div className="absolute -left-8 -bottom-8 w-32 h-32 bg-blue-400/30 rounded-full blur-2xl" />

          <div className="flex flex-col md:flex-row items-center justify-between gap-6 relative z-10">
            <div className="flex items-center gap-5">
              <div className="w-14 h-14 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center text-white border border-white/30 shadow-inner">
                <AlertCircle size={32} />
              </div>
              <div className="text-white">
                <h3 className="text-xl font-black tracking-tight leading-tight">Vencimentos de Hoje!</h3>
                <p className="text-blue-100 text-sm font-medium opacity-90">
                  Você tem <span className="font-bold text-white underline decoration-blue-300 underline-offset-4">{dueToday.length} lançamentos</span> para pagar hoje.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto">
              <button
                onClick={handleWhatsAppNotify}
                className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-white text-blue-700 hover:bg-blue-50 px-6 py-3.5 rounded-2xl font-black text-sm transition-all shadow-lg active:scale-95 group"
              >
                <MessageCircle size={18} className="group-hover:rotate-12 transition-transform" />
                NOTIFICAR NO MEU WHATSAPP
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Barra de Filtros do Dashboard */}
      <div className="card-base mb-6 backdrop-blur-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-slate-700 font-semibold">
            <Filter size={18} className="text-blue-600" />
            <span>Filtros do Dashboard (v2)</span>
            {(period !== 'all' || startDate !== '') && (
              <button
                onClick={clearFilters}
                className="ml-2 text-[10px] bg-slate-100 text-slate-500 px-2 py-1 rounded-full flex items-center gap-1 hover:bg-slate-200 hover:text-slate-700 transition-all font-bold"
              >
                Limpar Filtros <X size={10} />
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 bg-slate-50 p-1 rounded-xl border border-slate-100">
              <select
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                className="bg-transparent text-sm font-medium text-slate-600 px-3 py-1.5 outline-none border-none cursor-pointer"
              >
                <option value="all">Período Total</option>
                <option value="month">Este Mês</option>
                <option value="quarter">Este Trimestre</option>
                <option value="year">Este Ano</option>
                <option value="custom">Datas Customizadas</option>
              </select>
            </div>

            {period === 'custom' && (
              <div className="flex items-center gap-3 bg-slate-50 p-1.5 px-3 rounded-xl border border-slate-100 animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="flex items-center gap-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">De:</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="bg-white text-xs text-slate-600 px-2 py-1 rounded-lg border border-slate-200 outline-none focus:ring-1 focus:ring-blue-400"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Até:</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="bg-white text-xs text-slate-600 px-2 py-1 rounded-lg border border-slate-200 outline-none focus:ring-1 focus:ring-blue-400"
                  />
                </div>
              </div>
            )}

            {/* Filtro de Corretor Removido */}
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      
      {/* KPI Cards */}
      <DndContext 
        sensors={sensors} 
        collisionDetection={closestCenter} 
        onDragEnd={(e) => handleDragEndLabel(e, 'kpi')}
      >
        <SortableContext items={kpiOrder} strategy={rectSortingStrategy}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {kpiOrder.map(id => {
              if (id === 'kpi-vgv') return (
                <SortableWidget key="kpi-vgv" id="kpi-vgv">
                  <div className="card-base relative overflow-hidden group h-full">
                    <div className="absolute top-0 right-[-10px] p-3 opacity-5 group-hover:scale-110 transition-transform duration-500 group-hover:rotate-6">
                      <TrendingUp size={100} className="text-blue-600" />
                    </div>
                    <div className="flex items-center justify-between mb-4 relative z-10">
                      <div className="p-2.5 bg-gradient-to-br from-blue-500/20 to-blue-600/5 text-blue-600 rounded-xl border border-blue-500/20 shadow-inner">
                        <TrendingUp size={22} />
                      </div>
                    </div>
                    <p className="text-sm font-medium text-slate-500 mb-1 relative z-10">VGV Total</p>
                    <p className="text-2xl font-bold text-slate-800 relative z-10">{formatCurrency(stats.totalVGV)}</p>
                  </div>
                </SortableWidget>
              );
              if (id === 'kpi-comm') return (
                <SortableWidget key="kpi-comm" id="kpi-comm">
                  <div className="card-base relative overflow-hidden group h-full">
                    <div className="absolute top-0 right-[-10px] p-3 opacity-5 group-hover:scale-110 transition-transform duration-500 group-hover:rotate-6">
                      <Wallet size={100} className="text-indigo-600" />
                    </div>
                    <div className="flex items-center justify-between mb-4 relative z-10">
                      <div className="p-2.5 bg-gradient-to-br from-indigo-500/20 to-indigo-600/5 text-indigo-600 rounded-xl border border-indigo-500/20 shadow-inner">
                        <Wallet size={22} />
                      </div>
                    </div>
                    <p className="text-sm font-medium text-slate-500 mb-1 relative z-10">Comissões Totais</p>
                    <p className="text-2xl font-bold text-slate-800 relative z-10">{formatCurrency(stats.totalComm)}</p>
                  </div>
                </SortableWidget>
              );
              if (id === 'kpi-paid') return (
                <SortableWidget key="kpi-paid" id="kpi-paid">
                  <div className="card-base relative overflow-hidden group h-full">
                    <div className="absolute top-0 right-[-10px] p-3 opacity-5 group-hover:scale-110 transition-transform duration-500 group-hover:rotate-6">
                      <CheckCircle2 size={100} className="text-emerald-600" />
                    </div>
                    <div className="flex items-center justify-between mb-4 relative z-10">
                      <div className="p-2.5 bg-gradient-to-br from-emerald-500/20 to-emerald-600/5 text-emerald-600 rounded-xl border border-emerald-500/20 shadow-inner">
                        <CheckCircle2 size={22} />
                      </div>
                    </div>
                    <p className="text-sm font-medium text-slate-500 mb-1 relative z-10">Recebido</p>
                    <p className="text-2xl font-bold text-slate-800 relative z-10">{formatCurrency(stats.paidComm)}</p>
                  </div>
                </SortableWidget>
              );
              if (id === 'kpi-pending') return (
                <SortableWidget key="kpi-pending" id="kpi-pending">
                  <div className="card-base relative overflow-hidden group h-full">
                    <div className="absolute top-0 right-[-10px] p-3 opacity-5 group-hover:scale-110 transition-transform duration-500 group-hover:-rotate-6">
                      <Clock size={100} className="text-amber-500" />
                    </div>
                    <div className="flex items-center justify-between mb-4 relative z-10">
                      <div className="p-2.5 bg-gradient-to-br from-amber-500/20 to-amber-600/5 text-amber-600 rounded-xl border border-amber-500/20 shadow-inner">
                        <Clock size={22} />
                      </div>
                    </div>
                    <p className="text-sm font-medium text-slate-500 mb-1 relative z-10">A Receber</p>
                    <p className="text-2xl font-bold text-slate-800 relative z-10">{formatCurrency(stats.pendingComm)}</p>
                  </div>
                </SortableWidget>
              );
              if (id === 'kpi-canceled') return (
                <SortableWidget key="kpi-canceled" id="kpi-canceled">
                  <div className="card-base relative overflow-hidden group h-full">
                    <div className="absolute top-0 right-[-10px] p-3 opacity-5 group-hover:scale-110 transition-transform duration-500 group-hover:-rotate-6">
                      <X size={100} className="text-slate-600" />
                    </div>
                    <div className="flex items-center justify-between mb-4 relative z-10">
                      <div className="p-2.5 bg-gradient-to-br from-slate-400/20 to-slate-500/5 text-slate-600 rounded-xl border border-slate-400/20 shadow-inner">
                        <X size={22} />
                      </div>
                    </div>
                    <p className="text-sm font-medium text-slate-500 mb-1 relative z-10">Distratos</p>
                    <p className="text-2xl font-bold text-slate-800 relative z-10">{stats.canceledCount}</p>
                  </div>
                </SortableWidget>
              );
              if (id === 'kpi-forecast') return (
                <SortableWidget key="kpi-forecast" id="kpi-forecast">
                  <div className="card-base relative overflow-hidden group h-full bg-gradient-to-br from-purple-500/5 to-fuchsia-500/5 border-purple-100">
                    <div className="absolute top-0 right-[-10px] p-3 opacity-5 group-hover:scale-110 transition-transform duration-500 group-hover:rotate-6">
                      <TrendingUp size={100} className="text-purple-600" />
                    </div>
                    <div className="flex items-center justify-between mb-4 relative z-10">
                      <div className="p-2.5 bg-gradient-to-br from-purple-500/20 to-purple-600/5 text-purple-600 rounded-xl border border-purple-500/20 shadow-inner">
                        <TrendingUp size={22} />
                      </div>
                      <span className="text-[10px] font-bold bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">+IA</span>
                    </div>
                    <p className="text-sm font-medium text-purple-800/60 mb-1 relative z-10">Previsão 30d</p>
                    <p className="text-2xl font-bold text-slate-800 relative z-10">{formatCurrency(stats.forecast30d)}</p>
                  </div>
                </SortableWidget>
              );
              return null;
            })}
          </div>
        </SortableContext>
      </DndContext>


      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 card-base">
          <h3 className="font-bold text-slate-800 text-lg mb-8 text-gradient">Evolução de Vendas e Comissões</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} dy={10} />
                <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fill: '#3b82f6', fontSize: 11, fontWeight: 700 }} tickFormatter={(v) => `R$${v / 1000}k`} />
                <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fill: '#6366f1', fontSize: 11, fontWeight: 700 }} tickFormatter={(v) => `R$${v / 1000}k`} />
                <Tooltip
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', padding: '12px' }}
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      const vgv = payload[0].value as number;
                      const comm = payload[1].value as number;
                      const vgvDelta = payload[0].payload.vgvDelta;
                      const commDelta = payload[1].payload.commDelta;

                      return (
                        <div className="bg-white p-4 rounded-2xl shadow-xl border border-slate-50 min-w-[200px]">
                          <p className="font-bold text-slate-800 mb-3 border-b border-slate-50 pb-2">{label}</p>
                          <div className="space-y-3">
                            <div>
                              <div className="flex items-center justify-between gap-4">
                                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">VGV Mensal</span>
                                <span className="font-bold text-blue-600">{formatCurrency(vgv)}</span>
                              </div>
                              {vgvDelta !== 0 && (
                                <p className={`text-[10px] font-bold mt-1 flex items-center gap-1 ${vgvDelta > 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                                  {vgvDelta > 0 ? <TrendingUp size={10} /> : <TrendingUp size={10} className="rotate-180" />}
                                  {vgvDelta > 0 ? '+' : ''}{vgvDelta.toFixed(1)}% vs mês anterior
                                </p>
                              )}
                            </div>
                            <div className="pt-2 border-t border-slate-50">
                              <div className="flex items-center justify-between gap-4">
                                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Comissões</span>
                                <span className="font-bold text-indigo-600">{formatCurrency(comm)}</span>
                              </div>
                              {commDelta !== 0 && (
                                <p className={`text-[10px] font-bold mt-1 flex items-center gap-1 ${commDelta > 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                                  {commDelta > 0 ? <TrendingUp size={10} /> : <TrendingUp size={10} className="rotate-180" />}
                                  {commDelta > 0 ? '+' : ''}{commDelta.toFixed(1)}% vs mês anterior
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend verticalAlign="top" align="right" iconType="circle" wrapperStyle={{ paddingBottom: '20px' }} />
                <Bar yAxisId="left" dataKey="vgv" name="VGV Mensal" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={40} />
                <Line yAxisId="right" type="monotone" dataKey="comm" name="Comissões" stroke="#6366f1" strokeWidth={4} dot={{ r: 6, fill: '#6366f1', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 8, strokeWidth: 0 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

        </div>

        <div className="card-base">
          <h3 className="font-bold text-slate-800 text-lg mb-8 text-gradient">Distribuição de Status</h3>
          <div className="h-[250px] relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: any) => formatCurrency(value)} />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-slate-400 text-xs font-medium uppercase tracking-widest">Total</span>
              <span className="text-slate-800 font-bold text-lg">{formatCurrency(stats.totalComm)}</span>
            </div>
          </div>
          <div className="mt-6 space-y-3">
            {statusData.map((item) => (
              <div key={item.name} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }}></div>
                  <span className="text-slate-600 font-medium">{item.name}</span>
                </div>
                <span className="font-bold text-slate-800">{formatCurrency(item.value)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {isAdmin && stats.brokerPerformance.length > 0 && (
        <div className="card-base">
          <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2 mb-8 text-gradient">
            <Award className="text-blue-600" size={20} /> Performance por Corretor
          </h3>
          <div className="overflow-x-auto rounded-xl">
            <table className="table-base">
              <thead>
                <tr className="text-left text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-50">
                  <th className="pb-4 pr-4">Posição</th>
                  <th className="pb-4 px-4">Corretor</th>
                  <th className="pb-4 px-4">VGV Atribuído</th>
                  <th className="pb-4 px-4 text-right">Comissões</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {stats.brokerPerformance.map((broker, idx) => (
                  <tr key={broker.name} className="group hover:bg-slate-50 transition-colors">
                    <td className="py-4 pr-4 font-bold text-slate-300">#{idx + 1}</td>
                    <td className="py-4 px-4 font-semibold text-slate-700">{broker.name}</td>
                    <td className="py-4 px-4 text-slate-600 font-medium">{formatCurrency(broker.vgv)}</td>
                    <td className="py-4 px-4 text-right font-bold text-blue-600">{formatCurrency(broker.commissions)}</td>
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
