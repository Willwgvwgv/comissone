import React from 'react';
import { X, Trash2, AlertTriangle, RefreshCw, CheckCircle } from 'lucide-react';
import { FinancialTransaction } from '../../types';

interface DeleteConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (deleteAllFuture: boolean) => void;
    transaction: FinancialTransaction | null;
}

const DeleteConfirmationModal: React.FC<DeleteConfirmationModalProps> = ({ isOpen, onClose, onConfirm, transaction }) => {
    if (!isOpen || !transaction) return null;

    const isRecurring = transaction.description.includes('(') && transaction.description.includes(')');

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4 animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden transform transition-all scale-100 flex flex-col animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="bg-red-50 p-6 flex items-center justify-between border-b border-red-100">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-red-100 rounded-xl text-red-600">
                            <Trash2 size={24} />
                        </div>
                        <div>
                            <h3 className="text-lg font-black text-red-900">Excluir Lançamento</h3>
                            <p className="text-xs font-bold text-red-600 uppercase tracking-wide">Ação Irreversível</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-red-100 rounded-full text-red-400 hover:text-red-700 transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Você está excluindo</p>
                        <p className="text-slate-700 font-bold text-lg leading-tight">{transaction.description}</p>
                        <p className="text-sm font-medium text-slate-500 mt-1">
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(transaction.amount))}
                        </p>
                    </div>

                    {isRecurring ? (
                        <div className="space-y-4">
                            <div className="bg-amber-50 p-4 rounded-xl border border-amber-100 flex gap-3 text-amber-800 text-sm font-medium">
                                <AlertTriangle className="shrink-0" size={20} />
                                <p>Este lançamento faz parte de uma recorrência. Como deseja prosseguir?</p>
                            </div>

                            <div className="grid grid-cols-1 gap-3">
                                <button
                                    onClick={() => onConfirm(false)}
                                    className="flex items-center gap-4 p-4 rounded-2xl border-2 border-slate-100 hover:border-slate-300 hover:bg-slate-50 transition-all text-left group"
                                >
                                    <div className="p-3 bg-slate-100 text-slate-500 rounded-xl group-hover:bg-white group-hover:text-slate-700 transition-colors shadow-sm">
                                        <Trash2 size={20} />
                                    </div>
                                    <div>
                                        <p className="font-bold text-slate-700">Apenas este</p>
                                        <p className="text-xs text-slate-500">Excluir somente a parcela selecionada</p>
                                    </div>
                                </button>

                                <button
                                    onClick={() => onConfirm(true)}
                                    className="flex items-center gap-4 p-4 rounded-2xl border-2 border-red-100 bg-red-50/30 hover:border-red-300 hover:bg-red-50 transition-all text-left group"
                                >
                                    <div className="p-3 bg-red-100 text-red-600 rounded-xl group-hover:bg-white transition-colors shadow-sm">
                                        <RefreshCw size={20} />
                                    </div>
                                    <div>
                                        <p className="font-bold text-slate-700">Todas as futuras</p>
                                        <p className="text-xs text-slate-500">Excluir esta e todas as próximas</p>
                                    </div>
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="text-slate-600 text-sm">
                            Tem certeza que deseja remover este lançamento? Ele não aparecerá mais nos relatórios e extratos.
                        </div>
                    )}
                </div>

                {/* Footer (Only for non-recurring, recurring has inline buttons) */}
                {!isRecurring && (
                    <div className="p-6 bg-slate-50 border-t border-slate-100 flex gap-3">
                        <button
                            onClick={onClose}
                            className="flex-1 px-4 py-3 bg-white border border-slate-200 text-slate-600 font-black rounded-xl hover:bg-slate-100 transition-all"
                        >
                            CANCELAR
                        </button>
                        <button
                            onClick={() => onConfirm(false)}
                            className="flex-1 px-4 py-3 bg-red-600 text-white font-black rounded-xl hover:bg-red-700 shadow-lg shadow-red-200 transition-all"
                        >
                            CONFIRMAR EXCLUSÃO
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default DeleteConfirmationModal;
