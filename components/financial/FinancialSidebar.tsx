import React from 'react';
import {
    LayoutDashboard,
    List,
    Wallet,
    Tags,
    ArrowRightLeft,
    CreditCard
} from 'lucide-react';

interface FinancialSidebarProps {
    activeTab: string;
    setActiveTab: (tab: any) => void;
    importedCount: number;
}

const FinancialSidebar: React.FC<FinancialSidebarProps> = ({ activeTab, setActiveTab, importedCount }) => {
    const menuItems: { id: string, label: string, icon: any, count?: number }[] = [
        { id: 'overview', label: 'Fluxo de Caixa', icon: LayoutDashboard },
        { id: 'transactions', label: 'Extrato', icon: List },
        { id: 'cards', label: 'Cartões', icon: CreditCard },
        { id: 'accounts', label: 'Contas', icon: Wallet },
        { id: 'categories', label: 'Categorias', icon: Tags },
    ];

    return (
        <aside className="w-64 bg-white border-r border-slate-200 flex flex-col shrink-0">
            <div className="p-8">
                <div className="flex items-center gap-3 text-blue-600 mb-8">
                    <Wallet size={32} />
                    <span className="text-xl font-black tracking-tighter text-slate-800">Financeiro</span>
                </div>

                <nav className="space-y-2">
                    {menuItems.map((item) => (
                        <button
                            key={item.id}
                            onClick={() => setActiveTab(item.id)}
                            className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all group ${activeTab === item.id
                                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-100'
                                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                                }`}
                        >
                            <div className="flex items-center gap-3">
                                <item.icon size={20} className={activeTab === item.id ? 'text-white' : 'text-slate-400 group-hover:text-blue-600 transition-colors'} />
                                <span className="font-bold text-sm tracking-tight">{item.label}</span>
                            </div>
                            {item.count !== undefined && item.count > 0 && (
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${activeTab === item.id ? 'bg-white text-blue-600' : 'bg-amber-500 text-white'
                                    }`}>
                                    {item.count}
                                </span>
                            )}
                        </button>
                    ))}
                </nav>
            </div>

            <div className="mt-auto p-8 pt-0">
                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Suporte</p>
                    <button className="text-xs font-bold text-slate-600 hover:text-blue-600 transition-colors">Centro de Ajuda</button>
                </div>
            </div>
        </aside>
    );
};

export default FinancialSidebar;
