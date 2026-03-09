import React, { useState, useMemo } from 'react';
import {
    LogOut, Building2, CheckCircle2, Clock,
    AlertTriangle, Send, ChevronRight, DollarSign,
    TrendingUp, Banknote, Bell, XCircle, Info, Landmark
} from 'lucide-react';
import { User, Sale, CommissionStatus } from '../../types';

const fmt = (v: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v ?? 0);

const formatDate = (d?: string) => {
    if (!d) return '—';
    const [y, m, day] = d.split('-');
    return `${day}/${m}/${y}`;
};

const STATUS_CONFIG: Record<CommissionStatus, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
    PENDING: { label: 'Pendente', color: 'text-amber-500', bg: 'bg-amber-50/50 border-amber-100', icon: <Clock size={12} /> },
    OVERDUE: { label: 'Vencida', color: 'text-red-500', bg: 'bg-red-50/50 border-red-100', icon: <AlertTriangle size={12} /> },
    REQUESTED: { label: 'Solicitado', color: 'text-blue-500', bg: 'bg-blue-50/50 border-blue-100', icon: <Send size={12} /> },
    PAID: { label: 'Pago', color: 'text-emerald-500', bg: 'bg-emerald-50/50 border-emerald-100', icon: <CheckCircle2 size={12} /> },
    PARTIAL: { label: 'Parcial', color: 'text-blue-400', bg: 'bg-blue-50/30 border-blue-100', icon: <Landmark size={12} /> },
    CANCELED: { label: 'Cancelado', color: 'text-slate-400', bg: 'bg-slate-50/50 border-slate-100', icon: <XCircle size={12} /> },
};

interface BrokerEntry {
    saleId: string;
    address: string;
    buyerName: string;
    saleDate: string;
    splitValue: number;
    status: CommissionStatus;
    forecastDate?: string;
    paymentDate?: string;
    installmentNumber?: number;
    totalInstallments?: number;
    brokerId: string;
}

interface BrokerPortalProps {
    currentUser: User;
    sales: Sale[];
    onRequestPayment: (saleId: string, brokerId: string, installmentNumber?: number) => Promise<void>;
    onLogout: () => void;
}

const BrokerPortal: React.FC<BrokerPortalProps> = ({ currentUser, sales, onRequestPayment, onLogout }) => {
    const [requesting, setRequesting] = useState<string | null>(null);
    const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

    const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3000);
    };

    const myCommissions: BrokerEntry[] = useMemo(() => {
        const entries: BrokerEntry[] = [];
        sales.forEach(sale => {
            sale.splits?.forEach(split => {
                if (split.broker_id === currentUser.id) {
                    entries.push({
                        saleId: sale.id,
                        address: sale.property_address,
                        buyerName: sale.buyer_name,
                        saleDate: sale.sale_date,
                        splitValue: split.calculated_value,
                        status: split.status,
                        forecastDate: split.forecast_date,
                        paymentDate: split.payment_date,
                        installmentNumber: split.installment_number,
                        totalInstallments: split.total_installments,
                        brokerId: split.broker_id,
                    });
                }
            });
        });
        return entries.sort((a, b) => b.saleDate.localeCompare(a.saleDate));
    }, [sales, currentUser.id]);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const totalReceived = myCommissions.filter(c => c.status === CommissionStatus.PAID).reduce((s, c) => s + c.splitValue, 0);
    const totalPending = myCommissions.filter(c => c.status === CommissionStatus.PENDING || c.status === CommissionStatus.REQUESTED).reduce((s, c) => s + c.splitValue, 0);
    const totalOverdue = myCommissions.filter(c => {
        const isOverdue = c.status === CommissionStatus.OVERDUE ||
            (c.status === CommissionStatus.PENDING && c.forecastDate && new Date(c.forecastDate + 'T00:00:00') < today);
        return isOverdue;
    }).reduce((s, c) => s + c.splitValue, 0);

    const handleRequest = async (entry: BrokerEntry) => {
        const key = `${entry.saleId}-${entry.installmentNumber}`;
        setRequesting(key);
        try {
            await onRequestPayment(entry.saleId, entry.brokerId, entry.installmentNumber);
            showToast('Solicitação enviada! O gestor foi notificado.', 'success');
        } catch {
            showToast('Erro ao enviar solicitação. Tente novamente.', 'error');
        } finally {
            setRequesting(null);
        }
    };

    return (
        <div className="min-h-screen bg-[#F8FAFC] flex flex-col font-sans">
            {/* Toast */}
            {toast && (
                <div className={`fixed top-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2.5 px-6 py-3 rounded-2xl shadow-2xl text-[13px] font-medium transition-all animate-in fade-in slide-in-from-top-4 ${toast.type === 'success' ? 'bg-[#0F172A] text-white' : 'bg-red-600 text-white'
                    }`}>
                    {toast.type === 'success' ? <CheckCircle2 size={16} className="text-emerald-400" /> : <AlertTriangle size={16} />}
                    {toast.msg}
                </div>
            )}

            {/* Header - Ultra thin and minimal */}
            <header className="bg-white border-b border-slate-100/80 px-4 py-5 flex items-center justify-between sticky top-0 z-40">
                <div>
                    <div className="leading-tight">
                        <span className="text-xl font-bold text-slate-800">comissOne</span>
                        <p className="text-[9px] text-slate-400 font-medium tracking-wider">PORTAL DO CORRETOR</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <div className="text-right hidden xs:block">
                        <p className="text-[12px] font-medium text-slate-700">{currentUser.name.split(' ')[0]}</p>
                        <p className="text-[9px] text-slate-300 uppercase tracking-tighter">Fidelite</p>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 font-medium text-[11px]">
                        {currentUser.name.charAt(0)}
                    </div>
                    <button
                        onClick={onLogout}
                        className="p-2 text-slate-300 hover:text-red-500 transition-colors"
                    >
                        <LogOut size={16} />
                    </button>
                </div>
            </header>

            <main className="flex-1 max-w-md mx-auto w-full px-5 py-8 space-y-8">
                {/* Welcome - Soft fonts */}
                <div className="space-y-1">
                    <h1 className="text-[24px] font-medium text-slate-800 tracking-tight">Olá, {currentUser.name.split(' ')[0]}! 👋</h1>
                    <p className="text-[13px] text-slate-400 font-light">Confira o resumo das suas comissões.</p>
                </div>

                {/* Summary Cards - Glass/Modern style but lighter */}
                <div className="grid grid-cols-3 gap-3">
                    <div className="bg-white rounded-[20px] p-4 border border-slate-50 shadow-sm">
                        <div className="w-7 h-7 rounded-lg bg-emerald-50/50 flex items-center justify-center mb-3">
                            <CheckCircle2 size={13} className="text-emerald-500" />
                        </div>
                        <p className="text-[9px] font-medium text-slate-400 uppercase tracking-widest mb-1">Recebido</p>
                        <p className="font-medium text-emerald-600 text-[13px]">{fmt(totalReceived)}</p>
                    </div>
                    <div className="bg-white rounded-[20px] p-4 border border-slate-50 shadow-sm">
                        <div className="w-7 h-7 rounded-lg bg-amber-50/50 flex items-center justify-center mb-3">
                            <Clock size={13} className="text-amber-500" />
                        </div>
                        <p className="text-[9px] font-medium text-slate-400 uppercase tracking-widest mb-1">A receber</p>
                        <p className="font-medium text-amber-600 text-[13px]">{fmt(totalPending)}</p>
                    </div>
                    <div className="bg-white rounded-[20px] p-4 border border-slate-50 shadow-sm">
                        <div className="w-7 h-7 rounded-lg bg-red-50/50 flex items-center justify-center mb-3">
                            <AlertTriangle size={13} className="text-red-400" />
                        </div>
                        <p className="text-[9px] font-medium text-slate-400 uppercase tracking-widest mb-1">Vencido</p>
                        <p className="font-medium text-red-500 text-[13px]">{fmt(totalOverdue)}</p>
                    </div>
                </div>

                {/* Overdue Alert - Subtle and clean */}
                {totalOverdue > 0 && (
                    <div className="bg-[#FEF2F2] border border-red-100 rounded-2xl p-4 flex items-center gap-4">
                        <div className="bg-red-500 p-1.5 rounded-lg shadow-sm shadow-red-200">
                            <AlertTriangle size={14} className="text-white" />
                        </div>
                        <div>
                            <p className="text-[13px] font-medium text-red-800">Comissões vencidas detectadas.</p>
                            <p className="text-[11px] text-red-500/80 font-light mt-0.5">Clique no botão de solicitação abaixo para cobrar.</p>
                        </div>
                    </div>
                )}

                {/* List Header */}
                <div className="space-y-5">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                        <h2 className="font-medium text-slate-400 text-[10px] uppercase tracking-[0.25em]">Minhas Comissões</h2>
                        <span className="text-[10px] font-light text-slate-300">{myCommissions.length} itens</span>
                    </div>

                    {myCommissions.length === 0 ? (
                        <div className="py-16 text-center space-y-3">
                            <Banknote size={32} className="text-slate-100 mx-auto" />
                            <p className="text-[13px] text-slate-300 font-light">Tudo em dia por aqui.</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {myCommissions.map((entry, idx) => {
                                const today = new Date();
                                today.setHours(0, 0, 0, 0);
                                const isOverdue = entry.status === CommissionStatus.OVERDUE ||
                                    (entry.status === CommissionStatus.PENDING && entry.forecastDate && new Date(entry.forecastDate + 'T00:00:00') < today);

                                const cfg = (isOverdue && entry.status === CommissionStatus.PENDING)
                                    ? STATUS_CONFIG[CommissionStatus.OVERDUE]
                                    : (STATUS_CONFIG[entry.status] ?? STATUS_CONFIG.PENDING);

                                const key = `${entry.saleId}-${entry.installmentNumber ?? idx}`;
                                const isReq = requesting === key;
                                const canReq = isOverdue || entry.status === CommissionStatus.OVERDUE;

                                return (
                                    <div key={key} className="bg-white rounded-[24px] border border-slate-50 shadow-sm overflow-hidden transition-all active:scale-[0.99] active:bg-slate-50/50">
                                        <div className="p-6">
                                            {/* Status Badge - Floating Right */}
                                            <div className="flex items-start justify-between mb-5">
                                                <div className="space-y-1 pr-6 flex-1">
                                                    <h3 className="text-[15px] font-medium text-slate-800 leading-tight tracking-tight">{entry.address}</h3>
                                                    <p className="text-[12px] text-slate-400 font-light">{entry.buyerName}</p>
                                                </div>
                                                <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[9px] font-medium uppercase tracking-tight ${cfg.bg} ${cfg.color} border-current/20`}>
                                                    {cfg.icon}
                                                    {cfg.label}
                                                </div>
                                            </div>

                                            <div className="flex items-end justify-between">
                                                <div className="space-y-1.5">
                                                    <p className="text-[10px] text-slate-400 font-medium uppercase tracking-widest leading-none">
                                                        {entry.totalInstallments && entry.totalInstallments > 1
                                                            ? `Parcela ${entry.installmentNumber ?? 1} de ${entry.totalInstallments}`
                                                            : 'Comissão integral'
                                                        }
                                                    </p>
                                                    <p className="font-semibold text-slate-800 text-[18px] tracking-tight">{fmt(entry.splitValue)}</p>
                                                </div>
                                                <div className="text-right space-y-1.5">
                                                    <p className="text-[10px] text-slate-400 font-medium uppercase tracking-widest leading-none">
                                                        {entry.status === 'PAID' ? 'Recebido' : 'Previsto'}
                                                    </p>
                                                    <p className="text-[12px] font-medium text-slate-600">
                                                        {entry.status === 'PAID'
                                                            ? formatDate(entry.paymentDate)
                                                            : formatDate(entry.forecastDate)
                                                        }
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Action Button - Only if overdue */}
                                            {canReq && (
                                                <div className="mt-6">
                                                    <button
                                                        onClick={() => handleRequest(entry)}
                                                        disabled={isReq}
                                                        className="w-full flex items-center justify-center gap-2 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-2xl text-[12px] transition-all disabled:opacity-50 shadow-md shadow-blue-100"
                                                    >
                                                        {isReq ? (
                                                            <div className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                                                        ) : (
                                                            <><Send size={14} /> Solicitar Pagamento</>
                                                        )}
                                                    </button>
                                                </div>
                                            )}

                                            {/* Status Info */}
                                            {entry.status === 'REQUESTED' && (
                                                <div className="mt-5 flex items-center gap-2 px-3 py-2 bg-blue-50/30 rounded-xl border border-blue-50/50">
                                                    <Info size={12} className="text-blue-400" />
                                                    <p className="text-[10px] text-blue-500 font-medium uppercase tracking-wide">Aguardando aprovação</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </main>

            <footer className="text-center py-10 opacity-20">
                <p className="text-[10px] text-slate-400 font-medium uppercase tracking-[0.4em]">ComissOne</p>
            </footer>
        </div>
    );
};

export default BrokerPortal;
