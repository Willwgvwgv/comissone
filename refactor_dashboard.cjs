const fs = require('fs');
const path = require('path');

const targetPath = path.join('c:', 'Users', 'William', 'Desktop', 'ComissOne_OFICIAL_Fidelite', 'components', 'Dashboard.tsx');
let content = fs.readFileSync(targetPath, 'utf8');

// Add imports
const dndImports = `
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
`;

content = content.replace("import {\n  ComposedChart,", dndImports + "\nimport {\n  ComposedChart,");

// Add state to component
const stateReplacement = `
  const [period, setPeriod] = useState<string>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // DND Layout State
  const [kpiOrder, setKpiOrder] = useState<string[]>(() => {
    const saved = localStorage.getItem('comissone_kpi_order_v2');
    return saved ? JSON.parse(saved) : ['kpi-vgv', 'kpi-comm', 'kpi-paid', 'kpi-pending', 'kpi-canceled'];
  });

  const [chartOrder, setChartOrder] = useState<string[]>(() => {
    const saved = localStorage.getItem('comissone_chart_order_v2');
    return saved ? JSON.parse(saved) : ['chart-trends', 'chart-status', 'chart-broker-perf'];
  });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEndLabel = (event: DragEndEvent, type: 'kpi' | 'chart') => {
    const { active, over } = event;
    if (active.id !== over?.id) {
      if (type === 'kpi') {
        const oldIndex = kpiOrder.indexOf(active.id as string);
        const newIndex = kpiOrder.indexOf(over!.id as string);
        const newOrder = arrayMove(kpiOrder, oldIndex, newIndex);
        setKpiOrder(newOrder);
        localStorage.setItem('comissone_kpi_order_v2', JSON.stringify(newOrder));
      } else {
        const oldIndex = chartOrder.indexOf(active.id as string);
        const newIndex = chartOrder.indexOf(over!.id as string);
        const newOrder = arrayMove(chartOrder, oldIndex, newIndex);
        setChartOrder(newOrder);
        localStorage.setItem('comissone_chart_order_v2', JSON.stringify(newOrder));
      }
    }
  };
`;
content = content.replace(/const \[period, setPeriod.*?setEndDate<string>\(''\);/s, stateReplacement);

// Render KPI Cards
const kpiRender = `
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
              return null;
            })}
          </div>
        </SortableContext>
      </DndContext>
`;
content = content.replace(/<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">.*?<div className="grid grid-cols-1 lg:grid-cols-3 gap-8">/s, kpiRender + '\n\n      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">');

// For the charts and broker performance, we will also split them inside a DndContext
let chartsRegex = /<div className="grid grid-cols-1 lg:grid-cols-3 gap-8">.*?(?=<\/div>\n  \);)/s;
let chartsMatch = content.match(chartsRegex);

if (chartsMatch) {
  let chartsCode = chartsMatch[0];
  
  // Extract Evolução
  const evolucaoRegex = /<div className="lg:col-span-2 card-base">.*?<\/div>\n\n        <div className="card-base">/s;
  let evolucaoCode = chartsCode.match(evolucaoRegex)[0].replace('\n\n        <div className="card-base">', '');
  
  // Extract Status
  const statusRegex = /<div className="card-base">\n          <h3 className="font-bold text-slate-800 text-lg mb-8 text-gradient">Distribuição de Status<\/h3>.*?<\/div>\n      <\/div>/s;
  let statusCode = chartsCode.match(statusRegex)[0].replace('\n      </div>', '');
  
  // Extract Broker Perf (it's outside the grid! wait, let's include it)
  const brokerPerfRegex = /\{isAdmin && stats\.brokerPerformance\.length > 0 && \(\n        <div className="card-base">.*?<\/div>\n      \)\}/s;
  let brokerPerfCodeMatch = chartsCode.match(brokerPerfRegex);
  let brokerPerfCode = brokerPerfCodeMatch ? brokerPerfCodeMatch[0] : '';
  
  const chartsRender = `
      <DndContext 
        sensors={sensors} 
        collisionDetection={closestCenter} 
        onDragEnd={(e) => handleDragEndLabel(e, 'chart')}
      >
        <SortableContext items={chartOrder} strategy={rectSortingStrategy}>
          <div className="flex flex-col gap-8">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {chartOrder.map(id => {
                if (id === 'chart-trends') return (
                  <SortableWidget key="chart-trends" id="chart-trends" className="lg:col-span-2 w-full">
                    ${evolucaoCode.replace('<div className="lg:col-span-2 card-base">', '<div className="card-base h-full">')}
                  </SortableWidget>
                );
                if (id === 'chart-status') return (
                  <SortableWidget key="chart-status" id="chart-status" className="h-full">
                    ${statusCode}
                  </SortableWidget>
                );
                return null;
              })}
            </div>
            {chartOrder.includes('chart-broker-perf') && isAdmin && stats.brokerPerformance.length > 0 && (
              <SortableWidget key="chart-broker-perf" id="chart-broker-perf" className="w-full">
                ${brokerPerfCode.replace(/\{isAdmin && stats\.brokerPerformance\.length > 0 && \(\n        /, '').replace(/\n      \)\}/, '')}
              </SortableWidget>
            )}
          </div>
        </SortableContext>
      </DndContext>
  `;
  
  content = content.replace(chartsRegex, chartsRender + '\n');
}

fs.writeFileSync(targetPath, content, 'utf8');
console.log('Dashboard refactored successfully.');
