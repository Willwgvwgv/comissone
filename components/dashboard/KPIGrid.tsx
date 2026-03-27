
import React from 'react';
import { 
    CheckCircle2, 
    Clock, 
    AlertCircle, 
    BarChart3,
    ArrowUpRight,
    ArrowDownRight
} from 'lucide-react';
import { formatCurrency } from '../../src/utils/formatters';

interface KPIGridProps {
    paidCommissions: number;
    pendingCommissions: number;
    overdueCommissions: number;
    canceledCount: number;
    totalVGV: number;
    reconciliationRate: number;
}

export const KPIGrid: React.FC<KPIGridProps> = ({ 
    paidCommissions, 
    pendingCommissions, 
    overdueCommissions,
    canceledCount,
    totalVGV,
    reconciliationRate 
}) => {
    return (
        <div className="space-y-8">
            {/* Grupo 1: Performance de Vendas & Comissões */}
            <div className="space-y-4">
                <div className="flex items-center gap-3 ml-2">
                    <div className="w-1.5 h-5 bg-m3-primary rounded-full shadow-sm shadow-m3-primary/30" />
                    <h4 className="text-[11px] font-black text-m3-on-surface-variant uppercase tracking-[0.2em] opacity-70">Fluxo de Comissões & Resultados</h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                    {/* VGV Total */}
                    <div className="bg-m3-surface-container-low p-6 rounded-[32px] border border-m3-outline-variant/30 shadow-sm group hover:shadow-xl hover:shadow-m3-primary/5 transition-all duration-300">
                        <p className="text-[10px] font-black text-m3-on-surface-variant uppercase tracking-widest mb-4 opacity-70">VGV Total</p>
                        <div className="flex items-center justify-between">
                            <h3 className="text-xl font-black text-m3-on-surface leading-none">{formatCurrency(totalVGV)}</h3>
                            <div className="w-10 h-10 bg-m3-primary-container text-m3-on-primary-container rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                                <span className="material-symbols-outlined text-xl">monitoring</span>
                            </div>
                        </div>
                    </div>

                    {/* Recebido */}
                    <div className="bg-m3-surface-container-low p-6 rounded-[32px] border border-m3-outline-variant/30 shadow-sm group hover:shadow-xl hover:shadow-emerald-500/5 transition-all duration-300">
                        <p className="text-[10px] font-black text-m3-on-surface-variant uppercase tracking-widest mb-4 opacity-70">Recebido</p>
                        <div className="flex items-center justify-between">
                            <h3 className="text-xl font-black text-m3-on-surface leading-none">{formatCurrency(paidCommissions)}</h3>
                            <div className="w-10 h-10 bg-emerald-100 text-emerald-700 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                                <span className="material-symbols-outlined text-xl font-bold">check_circle</span>
                            </div>
                        </div>
                    </div>

                    {/* A Receber */}
                    <div className="bg-m3-surface-container-low p-6 rounded-[32px] border border-m3-outline-variant/30 shadow-sm group hover:shadow-xl hover:shadow-m3-primary/5 transition-all duration-300">
                        <p className="text-[10px] font-black text-m3-on-surface-variant uppercase tracking-widest mb-4 opacity-70">A Receber</p>
                        <div className="flex items-center justify-between">
                            <h3 className="text-xl font-black text-m3-on-surface leading-none">{formatCurrency(pendingCommissions)}</h3>
                            <div className="w-10 h-10 bg-m3-primary-container text-m3-on-primary-container rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                                <span className="material-symbols-outlined text-xl">schedule</span>
                            </div>
                        </div>
                    </div>

                    {/* Vencido */}
                    <div className="bg-m3-surface-container-low p-6 rounded-[32px] border border-m3-outline-variant/30 shadow-sm group hover:shadow-xl hover:shadow-rose-500/5 transition-all duration-300">
                        <p className="text-[10px] font-black text-m3-on-surface-variant uppercase tracking-widest mb-4 opacity-70 text-m3-error/70">Vencido</p>
                        <div className="flex items-center justify-between">
                            <h3 className="text-xl font-black text-m3-error leading-none">{formatCurrency(overdueCommissions)}</h3>
                            <div className="w-10 h-10 bg-m3-error-container text-m3-error rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                                <span className="material-symbols-outlined text-xl font-bold">report</span>
                            </div>
                        </div>
                    </div>

                    {/* Distratos */}
                    <div className="bg-m3-surface-container-low p-6 rounded-[32px] border border-m3-outline-variant/30 shadow-sm group hover:shadow-xl hover:shadow-slate-500/5 transition-all duration-300">
                        <p className="text-[10px] font-black text-m3-on-surface-variant uppercase tracking-widest mb-4 opacity-70">Distratos</p>
                        <div className="flex items-center justify-between">
                            <h3 className="text-xl font-black text-m3-on-surface leading-none">{canceledCount}</h3>
                            <div className="w-10 h-10 bg-m3-surface-container-highest text-m3-on-surface rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform shadow-inner">
                                <span className="material-symbols-outlined text-xl">block</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
