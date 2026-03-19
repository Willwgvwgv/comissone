
import React, { useMemo, useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  Legend,
  Cell
} from 'recharts';
import {
  FileDown,
  Calendar,
  TrendingUp,
  Users,
  Target,
  ArrowUpRight,
  ArrowDownRight,
  Filter,
  BarChart3,
  Award,
  PieChart as PieChartIcon,
  Wallet,
  CheckCircle2,
  Clock
} from 'lucide-react';

import { Sale, User, UserRole, CommissionStatus, SaleStatus } from '../types';
import { formatCurrency } from '../src/utils/formatters';

interface ReportsProps {
  sales: Sale[];
  team: User[];
  currentUser: User;
}

const Reports: React.FC<ReportsProps> = ({ sales, team, currentUser }) => {
  const [period, setPeriod] = useState<string>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [selectedBroker, setSelectedBroker] = useState<string>('all');
  const isAdmin = currentUser.role === UserRole.ADMIN;

  // 1. Filtragem de dados para o relatório
  const filteredData = useMemo(() => {
    let result = [...sales];
    const now = new Date();

    if (period === 'month') {
      result = result.filter(s => {
        const d = new Date(s.sale_date + 'T00:00:00');
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      });
    } else if (period === 'quarter') {
      const currentQuarter = Math.floor(now.getMonth() / 3);
      result = result.filter(s => {
        const d = new Date(s.sale_date + 'T00:00:00');
        return Math.floor(d.getMonth() / 3) === currentQuarter && d.getFullYear() === now.getFullYear();
      });
    } else if (period === 'year') {
      result = result.filter(s => {
        const d = new Date(s.sale_date + 'T00:00:00');
        return d.getFullYear() === now.getFullYear();
      });
    } else if (period === 'custom' && startDate && endDate) {
      const start = new Date(startDate + 'T00:00:00');
      const end = new Date(endDate + 'T23:59:59');
      result = result.filter(s => {
        const d = new Date(s.sale_date + 'T00:00:00');
        return d >= start && d <= end;
      });
    }

    if (selectedBroker !== 'all') {
      result = result.filter(s => s.splits.some(sp => sp.broker_id === selectedBroker));
    }

    // Filtrar vendas canceladas
    result = result.filter(s => s.status !== SaleStatus.CANCELED);

    return result;
  }, [sales, period, selectedBroker, startDate, endDate]);

  // 2. Agregação por Corretor
  const brokerPerformance = useMemo(() => {
    const map: Record<string, any> = {};

    // Inicializa com todos os membros da equipe para mostrar mesmo os que não venderam
    team.forEach(u => {
      if (u.role === UserRole.BROKER) {
        map[u.id] = { name: u.name, vgv: 0, comm: 0, salesCount: 0 };
      }
    });

    filteredData.forEach(sale => {
      sale.splits.forEach(split => {
        if (map[split.broker_id]) {
          map[split.broker_id].vgv += (sale.vgv * (split.percentage / 100));
          map[split.broker_id].comm += split.calculated_value;
          map[split.broker_id].salesCount += 1;
        }
      });
    });

    return Object.values(map).sort((a: any, b: any) => b.vgv - a.vgv);
  }, [filteredData, team]);

  // 4. Cálculo de Métricas Analíticas
  const analysisStats = useMemo(() => {
    let totalComm = 0;
    let paidComm = 0;
    let totalVGV = 0;

    filteredData.forEach(sale => {
      totalVGV += sale.vgv;
      sale.splits.forEach(split => {
        if (selectedBroker === 'all' || split.broker_id === selectedBroker) {
          totalComm += split.calculated_value;
          if (split.status === CommissionStatus.PAID) {
            paidComm += split.calculated_value;
          }
        }
      });
    });

    const efficiency = totalComm > 0 ? (paidComm / totalComm) * 100 : 0;
    const avgTicket = filteredData.length > 0 ? totalVGV / filteredData.length : 0;

    return { totalComm, paidComm, efficiency, avgTicket };
  }, [filteredData, selectedBroker]);


  const monthlyTrend = useMemo(() => {


    const dataMap = new Map<string, { vgv: number; comm: number; order: number }>();
    const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

    // Se não houver dados filtrados, retorna vazio para "zerar" o gráfico
    if (filteredData.length === 0) return [];

    filteredData.forEach(sale => {
      const date = new Date(sale.sale_date + 'T00:00:00');
      const monthIndex = date.getMonth();
      const monthName = months[monthIndex];
      const key = `${monthName}/${date.getFullYear()}`;

      if (!dataMap.has(key)) {
        dataMap.set(key, { vgv: 0, comm: 0, order: date.getTime() });
      }

      const current = dataMap.get(key)!;
      current.vgv += sale.vgv;

      // Calcular comissão atribuída
      let saleComm = 0;
      sale.splits.forEach(split => {
        // Se tiver filtro de broker, soma apenas a parte dele. Se não, soma tudo.
        if (selectedBroker === 'all' || split.broker_id === selectedBroker) {
          saleComm += split.calculated_value;
        }
      });
      current.comm += saleComm;
    });

    return Array.from(dataMap.entries()).map(([name, data]) => ({
      name: name.split('/')[0], // Nome do mês
      fullDate: name,
      vgv: data.vgv,
      comm: data.comm,
      order: data.order
    })).sort((a, b) => a.order - b.order);
  }, [filteredData, selectedBroker]);

  // 5. Comparativo Ano contra Ano (YoY)
  const yoyData = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const prevYear = currentYear - 1;
    const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

    // Inicializar os 12 meses
    const data = months.map(m => ({
      name: m,
      [currentYear]: 0,
      [prevYear]: 0
    }));

    sales.forEach(sale => {
      // Ignorar canceladas no YoY
      if (sale.status === SaleStatus.CANCELED) return;

      const date = new Date(sale.sale_date + 'T00:00:00');
      const year = date.getFullYear();
      const monthIdx = date.getMonth();

      if (year === currentYear) {
        data[monthIdx][currentYear] += sale.vgv;
      } else if (year === prevYear) {
        data[monthIdx][prevYear] += sale.vgv;
      }
    });

    return data;
  }, [sales]);

  const handleExportPDF = () => {

    window.print();
  };

  const getActiveFilterLabel = () => {
    if (period === 'all') return 'Período Total';
    if (period === 'month') return 'Este Mês';
    if (period === 'quarter') return 'Este Trimestre';
    if (period === 'year') return 'Este Ano';
    if (period === 'custom') return `De ${startDate || '...'} até ${endDate || '...'}`;
    return period;
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header & Main Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">Relatórios de Performance</h2>
          <p className="text-slate-400 text-sm font-medium">Análise detalhada de VGV, Comissões e Produtividade.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleExportPDF}
            className="flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl text-sm font-bold hover:bg-slate-50 transition-all shadow-sm no-print"
          >
            <FileDown size={18} /> Exportar PDF
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="card-base p-4 flex flex-wrap items-center gap-4 no-print">
        <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 rounded-2xl border border-slate-100">
          <Calendar size={16} className="text-slate-400" />
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="bg-transparent text-sm font-bold text-slate-600 outline-none cursor-pointer"
          >
            <option value="all">Todo o Período</option>
            <option value="month">Este Mês</option>
            <option value="quarter">Este Trimestre</option>
            <option value="year">Este Ano</option>
            <option value="custom">Datas Customizadas</option>
          </select>
        </div>

        {period === 'custom' && (
          <div className="flex items-center gap-3 bg-slate-50 p-1.5 px-3 rounded-2xl border border-slate-100 animate-in fade-in slide-in-from-left-2 duration-300">
            <div className="flex items-center gap-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">De:</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-white text-xs font-bold text-slate-600 px-2 py-1 rounded-lg border border-slate-200 outline-none focus:ring-1 focus:ring-blue-400"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Até:</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-white text-xs font-bold text-slate-600 px-2 py-1 rounded-lg border border-slate-200 outline-none focus:ring-1 focus:ring-blue-400"
              />
            </div>
          </div>
        )}

        {isAdmin && (
          <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 rounded-2xl border border-slate-100">
            <Users size={16} className="text-slate-400" />
            <select
              value={selectedBroker}
              onChange={(e) => setSelectedBroker(e.target.value)}
              className="bg-transparent text-sm font-bold text-slate-600 outline-none cursor-pointer"
            >
              <option value="all">Todos os Corretores</option>
              {team.filter(u => u.role === UserRole.BROKER).map(u => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
          </div>
        )}

        <div className="ml-auto flex items-center gap-2 text-[10px] font-black uppercase text-slate-400 tracking-widest">
          <Filter size={12} />
          Filtros Ativos: {period === 'all' ? 'Sempre' : period === 'custom' ? 'Range' : period}
        </div>
      </div>

      {/* Header visível apenas na impressão para dar contexto ao PDF */}
      <div className="hidden print:block border-b-2 border-slate-100 pb-4 mb-6">
        <h1 className="text-2xl font-black text-slate-800">ComissOne - Relatório de Performance</h1>
        <div className="flex gap-4 mt-2 text-sm text-slate-500 font-bold uppercase tracking-wider">
          <span>Período: {getActiveFilterLabel()}</span>
          <span>Corretor: {selectedBroker === 'all' ? 'Todos' : team.find(t => t.id === selectedBroker)?.name}</span>
        </div>
      </div>

      {/* Analytical KPI Header Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card-base p-6 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:scale-110 transition-transform">
            <Target size={64} className="text-blue-600" />
          </div>
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <Target size={24} />
            </div>
          </div>
          <p className="text-sm font-medium text-slate-500 mb-1">Ticket Médio</p>
          <p className="text-2xl font-bold text-slate-800">{formatCurrency(analysisStats.avgTicket)}</p>
          <p className="text-xs text-emerald-500 font-bold flex items-center gap-1 mt-2">
            <ArrowUpRight size={14} /> +4.2% <span className="text-slate-400 font-normal">vs mês ant.</span>
          </p>
        </div>

        <div className="card-base p-6 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:scale-110 transition-transform">
            <TrendingUp size={64} className="text-indigo-600" />
          </div>
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
              <TrendingUp size={24} />
            </div>
          </div>
          <p className="text-sm font-medium text-slate-500 mb-1">Eficiência de Recebimento</p>
          <p className="text-2xl font-bold text-slate-800">{analysisStats.efficiency.toFixed(1)}%</p>
          <p className="text-xs text-slate-400 font-medium mt-2">
            Pago: <span className="text-slate-700 font-bold">{formatCurrency(analysisStats.paidComm)}</span>
          </p>
        </div>

        <div className="card-base p-6 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:scale-110 transition-transform">
            <Award size={64} className="text-emerald-600" />
          </div>
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
              <Award size={24} />
            </div>
          </div>
          <p className="text-sm font-medium text-slate-500 mb-1">Top Performer</p>
          <p className="text-2xl font-bold text-slate-800">{brokerPerformance[0]?.name || '---'}</p>
          <p className="text-xs text-emerald-500 font-bold mt-2 uppercase tracking-wider">
            Líder em VGV no período
          </p>
        </div>
      </div>



      {/* Seasonal Analysis / YoY Comparison */}

      <div className="card-base p-8">
        <div className="flex items-center justify-between mb-10">
          <div>
            <h3 className="font-black text-slate-800 flex items-center gap-2">
              <TrendingUp className="text-emerald-600" size={20} /> Comparativo de Sazonalidade (VGV)
            </h3>
            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-1">Comparando desempenho mensal: {new Date().getFullYear()} vs {new Date().getFullYear() - 1}</p>
          </div>
        </div>
        <div className="h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={yoyData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 700 }} dy={10} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} tickFormatter={(v) => `R$${v / 1000}k`} />
              <Tooltip
                cursor={{ fill: '#f8fafc' }}
                contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }}
                formatter={(value: any) => formatCurrency(value)}
              />
              <Legend verticalAlign="top" align="right" iconType="circle" wrapperStyle={{ paddingBottom: '20px' }} />
              <Bar
                dataKey={new Date().getFullYear() - 1}
                name={`Ano Anterior (${new Date().getFullYear() - 1})`}
                fill="#cbd5e1"
                radius={[4, 4, 0, 0]}
                barSize={24}
              />
              <Bar
                dataKey={new Date().getFullYear()}
                name={`Ano Atual (${new Date().getFullYear()})`}
                fill="#3b82f6"
                radius={[4, 4, 0, 0]}
                barSize={24}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

        {/* Performance por Corretor Bar Chart */}
        <div className="card-base p-8">
          <div className="flex items-center justify-between mb-10">
            <h3 className="font-black text-slate-800 flex items-center gap-2">
              <BarChart3 className="text-blue-600" size={20} /> VGV por Corretor
            </h3>
            <span className="text-[10px] bg-slate-100 text-slate-500 px-3 py-1 rounded-full font-black uppercase tracking-widest no-print">Top 5</span>
          </div>
          <div className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={brokerPerformance.slice(0, 5)} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                <XAxis type="number" hide />
                <YAxis
                  dataKey="name"
                  type="category"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#64748b', fontSize: 12, fontWeight: 700 }}
                  width={100}
                />
                <Tooltip
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }}
                  formatter={(value: any) => formatCurrency(value)}
                />
                <Bar dataKey="vgv" radius={[0, 10, 10, 0]} barSize={32}>
                  {brokerPerformance.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={index === 0 ? '#3b82f6' : index === 1 ? '#6366f1' : index === 2 ? '#818cf8' : '#cbd5e1'} />
                  ))}

                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Evolução Line Chart */}
        <div className="card-base p-8">
          <div className="flex items-center justify-between mb-10">
            <h3 className="font-black text-slate-800 flex items-center gap-2">
              <TrendingUp className="text-indigo-600" size={20} /> Evolução de Comissões
            </h3>
          </div>
          <div className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthlyTrend}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 700 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} tickFormatter={(v) => `R$${v / 1000}k`} />
                <Tooltip
                  contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }}
                  formatter={(value: any) => formatCurrency(value)}
                />
                <Legend verticalAlign="top" align="right" iconType="circle" wrapperStyle={{ paddingBottom: '20px' }} />
                <Line type="monotone" dataKey="comm" name="Comissão Total" stroke="#6366f1" strokeWidth={4} dot={{ r: 6, fill: '#6366f1', strokeWidth: 3, stroke: '#fff' }} activeDot={{ r: 8 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Performance List Table */}
      <div className="card-base p-0 overflow-hidden break-inside-avoid">
        <div className="p-8 border-b border-slate-50 flex items-center justify-between">
          <h3 className="font-black text-slate-800 flex items-center gap-2 uppercase tracking-widest text-xs">
            Detalhamento por Corretor
          </h3>
          <div className="flex gap-1 no-print">
            <div className="w-2 h-2 rounded-full bg-blue-500"></div>
            <div className="w-2 h-2 rounded-full bg-slate-200"></div>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                <th className="px-8 py-5">Corretor</th>
                <th className="px-8 py-5">Vendas</th>
                <th className="px-8 py-5">VGV Total</th>
                <th className="px-8 py-5">Comissão Gerada</th>
                <th className="px-8 py-5 text-right">Eficiência</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {brokerPerformance.map((broker, idx) => (
                <tr key={broker.name} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${idx === 0 ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
                        {idx + 1}
                      </div>
                      <span className="font-bold text-slate-800">{broker.name}</span>
                    </div>
                  </td>
                  <td className="px-8 py-6 text-sm font-bold text-slate-500">{broker.salesCount} vendas</td>
                  <td className="px-8 py-6 text-sm font-black text-slate-800">{formatCurrency(broker.vgv)}</td>
                  <td className="px-8 py-6">
                    <span className="text-sm font-bold text-blue-600">{formatCurrency(broker.comm)}</span>
                  </td>
                  <td className="px-8 py-6 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden no-print">
                        <div
                          className={`h-full rounded-full transition-all duration-1000 ${idx === 0 ? 'bg-blue-600' : 'bg-slate-300'}`}
                          style={{ width: `${Math.min((broker.vgv / (brokerPerformance[0]?.vgv || 1)) * 100, 100)}%` }}
                        />
                      </div>
                      <span className="text-[10px] font-black text-slate-400">
                        {Math.round((broker.vgv / (brokerPerformance[0]?.vgv || 1)) * 100)}%
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Reports;


