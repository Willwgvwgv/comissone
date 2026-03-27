
import React from 'react';
import { LogOut, User as UserIcon, Bell, Wand2, ChevronLeft, ChevronRight } from 'lucide-react';
import { User, UserRole } from '../types';
import { NAV_ITEMS } from '../constants';
import { formatCurrency } from '../src/utils/formatters';

interface LayoutProps {
  children: React.ReactNode;
  currentUser: User;
  activeView: string;
  setActiveView: (view: string) => void;
  notifications: any[];
  onClearNotifications: () => void;
  onLogout: () => void;
  theme?: string;
  setTheme?: (theme: string) => void;
}

const Layout: React.FC<LayoutProps> = ({
  children,
  currentUser,
  activeView,
  setActiveView,
  notifications,
  onClearNotifications,
  onLogout,
  theme,
  setTheme
}) => {
  const [showNotifications, setShowNotifications] = React.useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = React.useState(() => {
    return localStorage.getItem('comissone_sidebar_collapsed') === 'true';
  });
  
  const [isProfileOpen, setIsProfileOpen] = React.useState(false);

  const toggleSidebar = () => {
    const newState = !isSidebarCollapsed;
    setIsSidebarCollapsed(newState);
    localStorage.setItem('comissone_sidebar_collapsed', String(newState));
  };

  const filteredNavItems = NAV_ITEMS.filter(item => item.roles.includes(currentUser.role));

  return (
    <div className="flex h-screen bg-transparent page-transition">
      {/* Sidebar - Glassmorphism */}
      <aside 
        className={`${isSidebarCollapsed ? 'w-20' : 'w-72'} bg-white/70 dark:bg-slate-900/80 backdrop-blur-xl border-r border-white/50 dark:border-slate-800 shadow-[4px_0_24px_-6px_rgba(0,0,0,0.05)] flex flex-col hidden md:flex shrink-0 relative z-20 transition-all duration-300 ease-in-out`}
      >
        {/* Toggle Button */}
        <button
          onClick={toggleSidebar}
          className="absolute -right-3 top-20 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-full p-1 shadow-md text-slate-400 dark:text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 z-30 transition-all hover:scale-110"
        >
          {isSidebarCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>

        <div className={`p-5 border-b border-white/30 bg-transparent flex items-center ${isSidebarCollapsed ? 'justify-center' : 'justify-between'}`}>
          {!isSidebarCollapsed ? (
            <div className="leading-tight min-w-0">
              <span className="text-lg font-semibold text-slate-900 dark:text-white tracking-tight">comissOne</span>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 tracking-wider font-medium uppercase">Gestão imobiliária</p>
            </div>
          ) : (
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-xs shadow-lg shadow-blue-500/20 animate-in zoom-in-50 duration-300">C1</div>
          )}
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto no-scrollbar">
          {filteredNavItems.map((item) => {
            const isFinancial = item.id === 'financial';
            const isFinancialSubItem = activeView.startsWith('financial-');
            const isExpanded = isFinancial && (activeView === 'financial' || isFinancialSubItem);

            return (
              <div key={item.id}>
                <button
                  onClick={() => {
                    const hasSubItems = !!item.subItems;
                    
                    if (isSidebarCollapsed && hasSubItems) {
                      setIsSidebarCollapsed(false);
                      if (isFinancial && item.subItems) {
                        setActiveView(item.subItems[0].id);
                      }
                      return;
                    }

                    if (isFinancial && item.subItems) {
                      if (!isExpanded) setActiveView(item.subItems[0].id);
                    } else {
                      setActiveView(item.id);
                    }
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 min-w-0 sidebar-item ${isSidebarCollapsed ? 'justify-center' : ''} ${isExpanded
                    ? 'bg-blue-50/80 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-semibold shadow-sm backdrop-blur-sm border border-blue-100/50 dark:border-blue-500/20'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                >
                  <div className="shrink-0">{item.icon}</div>
                  {!isSidebarCollapsed && <span className="text-sm min-w-0 flex-1 truncate text-left">{item.label}</span>}
                  {item.subItems && !isSidebarCollapsed && (
                    <svg
                      className={`ml-auto w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  )}
                </button>

                {item.subItems && isExpanded && !isSidebarCollapsed && (
                  <div className="ml-4 mt-1 space-y-1 animate-in slide-in-from-top-1 duration-200">
                    {item.subItems.map((subItem) => (
                      <button
                        key={subItem.id}
                        onClick={() => {
                          setActiveView(subItem.id);
                        }}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm transition-all ${activeView === subItem.id
                          ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-semibold shadow-sm'
                          : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-700 dark:hover:text-slate-200'
                          }`}
                      >
                        <div className="shrink-0">{subItem.icon}</div>
                        {subItem.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* Sidebar Footer Removed - Redundancy Cleanup */}
        <div className="p-4 border-t border-white/30 text-center">
            <p className="text-[10px] text-slate-400 font-medium uppercase tracking-[0.2em]">v2.5 Premium</p>
        </div>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden relative z-10">
        <header className="h-16 bg-white/70 dark:bg-slate-900/80 backdrop-blur-xl border-b border-white/50 dark:border-slate-800 shadow-sm flex items-center justify-between px-8 z-30">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-slate-800 to-slate-600 dark:from-slate-200 dark:to-slate-400 tracking-tight">
              {(() => {
                const item = NAV_ITEMS.find(i => i.id === activeView);
                if (item) return item.label;
                for (const mainItem of NAV_ITEMS) {
                  if (mainItem.subItems) {
                    const subItem = mainItem.subItems.find(si => si.id === activeView);
                    if (subItem) return subItem.label;
                  }
                }
                return 'Dashboard';
              })()}
            </h2>
          </div>
          <div className="flex items-center gap-4">
            {currentUser.role === UserRole.ADMIN && (
              <div className="relative">
                <button
                  onClick={() => setShowNotifications(!showNotifications)}
                  className={`relative p-2.5 rounded-full transition-all ${showNotifications ? 'bg-blue-50 text-blue-600' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}
                  title={`${notifications.length} solicitações pendentes`}
                >
                  <Bell size={20} strokeWidth={2.5} />
                  {notifications.length > 0 && (
                    <span className="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center bg-red-500 text-[9px] font-black text-white rounded-full border-2 border-white ring-2 ring-red-500/20">
                      {notifications.length}
                    </span>
                  )}
                </button>

                {showNotifications && (
                  <>
                    <div className="fixed inset-0 z-20" onClick={() => setShowNotifications(false)}></div>
                    <div className="absolute right-0 mt-3 w-85 bg-white/90 dark:bg-slate-900/95 backdrop-blur-2xl rounded-2xl shadow-2xl border border-white dark:border-slate-800 z-30 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-300">
                      <div className="p-5 border-b border-white/50 dark:border-slate-800/50 flex items-center justify-between bg-white/30 dark:bg-slate-800/30">
                        <div>
                          <h3 className="font-black text-slate-900 dark:text-white text-xs uppercase tracking-widest">Notificações</h3>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">Você tem {notifications.length} novos alertas</p>
                        </div>
                        {notifications.length > 0 && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onClearNotifications();
                              setShowNotifications(false);
                            }}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-black text-blue-600 hover:bg-blue-50 rounded-lg transition-all active:scale-95 group"
                          >
                            <Wand2 size={12} className="group-hover:rotate-12 transition-transform" />
                            LIMPAR TUDO
                          </button>
                        )}
                      </div>
                      <div className="max-h-80 overflow-y-auto custom-scrollbar">
                        {notifications.length > 0 ? (
                          <div className="divide-y divide-slate-100/50">
                            {notifications.map((notif) => (
                              <div
                                key={notif.id}
                                className="p-5 hover:bg-blue-50/50 transition-colors cursor-pointer group relative"
                                onClick={() => { setActiveView('commissions'); setShowNotifications(false); }}
                              >
                                <div className="flex items-start gap-4">
                                  <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600 shrink-0 group-hover:scale-110 transition-transform">
                                    <UserIcon size={16} strokeWidth={2.5} />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-[13px] text-slate-700 leading-relaxed font-medium">
                                      <span className="font-black text-slate-900">{notif.brokerName}</span> solicitou o pagamento.
                                    </p>
                                    <div className="flex items-center justify-between mt-3">
                                      <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100 uppercase tracking-widest">
                                        {formatCurrency(notif.value)}
                                      </span>
                                      <span className="text-[10px] text-slate-400 font-bold">{notif.date.split('-').reverse().join('/')}</span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="p-12 text-center">
                             <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 opacity-50">
                                <span className="material-symbols-outlined text-3xl text-slate-300">notifications_off</span>
                             </div>
                             <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Tudo limpo por aqui</p>
                          </div>
                        )}
                      </div>
                      <div className="p-4 border-t border-white/50 bg-white/30 text-center">
                        <button onClick={() => { setActiveView('commissions'); setShowNotifications(false); }} className="text-[10px] font-black text-slate-500 hover:text-blue-600 uppercase tracking-[0.2em] transition-colors">Ver todas as comissões</button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
            
            <div className="h-6 w-[1px] bg-slate-200/60 mx-1"></div>

            {/* Profile Dropdown - Consolidating User Options */}
            <div className="relative">
                <button 
                  onClick={() => setIsProfileOpen(!isProfileOpen)}
                  className={`flex items-center gap-3 p-1.5 pr-4 rounded-2xl transition-all duration-300 ${isProfileOpen ? 'bg-blue-50/80 dark:bg-blue-900/20 shadow-sm border border-blue-100/50 dark:border-blue-500/20' : 'hover:bg-slate-50 dark:hover:bg-slate-800/50 border border-transparent'}`}
                >
                    <div className="relative group">
                        <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center text-white font-black text-xs shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform">
                            {currentUser.name.charAt(0)}
                        </div>
                        <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 border-2 border-white dark:border-slate-900 rounded-full"></div>
                    </div>
                    <div className="text-left hidden sm:block">
                        <p className="text-[13px] font-black text-slate-900 dark:text-white leading-none mb-1">{currentUser.name}</p>
                        <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Acesso {currentUser.role}</p>
                    </div>
                    <svg className={`w-4 h-4 text-slate-400 dark:text-slate-500 transition-transform duration-300 ${isProfileOpen ? 'rotate-180 text-blue-500' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                    </svg>
                </button>

                {isProfileOpen && (
                  <>
                    <div className="fixed inset-0 z-20" onClick={() => setIsProfileOpen(false)}></div>
                    <div className="absolute right-0 mt-3 w-72 bg-white dark:bg-slate-900 rounded-[24px] shadow-2xl border border-slate-200 dark:border-slate-800 z-[100] overflow-hidden animate-in fade-in slide-in-from-top-2 zoom-in-95 duration-200">
                        {/* Header do Menu */}
                        <div className="p-6 bg-gradient-to-br from-slate-50 to-white dark:from-slate-800/50 dark:to-slate-900/50 border-b border-slate-100 dark:border-slate-800">
                            <div className="flex items-center gap-4 mb-4">
                                <div className="w-14 h-14 bg-blue-100 dark:bg-blue-900/30 rounded-[18px] flex items-center justify-center text-blue-600 dark:text-blue-400 font-black text-lg border-2 border-white dark:border-slate-900 shadow-sm">
                                    {currentUser.name.charAt(0)}
                                </div>
                                <div className="min-w-0">
                                    <h4 className="text-sm font-black text-slate-900 dark:text-white truncate" title={currentUser.name}>{currentUser.name}</h4>
                                    <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mb-2">{currentUser.email}</p>
                                    <span className={`text-[9px] font-black px-2.5 py-0.5 rounded-full uppercase border ${
                                        currentUser.role === UserRole.ADMIN 
                                        ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400 border-indigo-100 dark:border-indigo-800/50' 
                                        : 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border-emerald-100 dark:border-emerald-800/50'
                                    }`}>
                                        {currentUser.role}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Opções do Menu */}
                        <div className="p-2 pt-3 bg-white dark:bg-slate-900">
                            <button 
                                onClick={() => { setActiveView('profile'); setIsProfileOpen(false); }}
                                className="w-full flex items-center gap-3 px-4 py-3 text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl transition-all font-medium text-sm group"
                            >
                                <span className="material-symbols-outlined text-[20px] group-hover:scale-110 transition-transform">person</span>
                                Meu Perfil
                            </button>
                            <button 
                                onClick={() => { setActiveView('settings'); setIsProfileOpen(false); }}
                                className="w-full flex items-center gap-3 px-4 py-3 text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl transition-all font-medium text-sm group"
                            >
                                <span className="material-symbols-outlined text-[20px] group-hover:scale-110 transition-transform">settings</span>
                                Configurações
                            </button>
                            
                            <div className="my-2 mx-4 h-px bg-slate-100 dark:bg-slate-800"></div>

                            <button
                                onClick={onLogout}
                                className="w-full flex items-center gap-3 px-4 py-3 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all font-black uppercase tracking-widest text-[11px] group mb-2"
                            >
                                <span className="material-symbols-outlined text-[20px] group-hover:translate-x-1 transition-transform">logout</span>
                                Sair do Sistema
                            </button>
                        </div>

                        {/* Footer do Menu */}
                        <div className="px-6 py-3 bg-slate-50/30 text-center border-t border-white/50">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">ComissOne v2.5.0</p>
                        </div>
                    </div>
                  </>
                )}
            </div>
          </div>
        </header>

        <div className={`flex-1 bg-transparent ${activeView.startsWith('financial') ? 'overflow-y-auto p-0' : 'overflow-y-auto p-8'}`}>
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Layout;

