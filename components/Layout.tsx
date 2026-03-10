
import React from 'react';
import { LogOut, User as UserIcon, Building2, Bell, Trash2, Eraser, Sparkles, Wand2 } from 'lucide-react';
import { User, UserRole } from '../types';
import { NAV_ITEMS } from '../constants';

interface LayoutProps {
  children: React.ReactNode;
  currentUser: User;
  activeView: string;
  setActiveView: (view: string) => void;
  notifications: any[];
  onClearNotifications: () => void;
  onLogout: () => void;
}



const Layout: React.FC<LayoutProps> = ({
  children,
  currentUser,
  activeView,
  setActiveView,
  notifications,
  onClearNotifications,
  onLogout
}) => {
  const [showNotifications, setShowNotifications] = React.useState(false);

  const filteredNavItems = NAV_ITEMS.filter(item => item.roles.includes(currentUser.role));

  return (
    <div className="flex h-screen bg-slate-50">
      {/* Sidebar */}
      <aside className="w-72 bg-white border-r border-slate-200 flex flex-col hidden md:flex shrink-0">
        <div className="p-5 border-b border-slate-200 bg-white">
          <div className="leading-tight min-w-0">
            <span className="text-lg font-semibold text-slate-900 tracking-tight">comissOne</span>
            <p className="text-[10px] text-slate-500 tracking-wider font-medium uppercase">Gestão imobiliária</p>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {filteredNavItems.map((item) => {
            const isFinancial = item.id === 'financial';
            const isFinancialSubItem = activeView.startsWith('financial-');
            const isExpanded = isFinancial && (activeView === 'financial' || isFinancialSubItem);

            return (
              <div key={item.id}>
                <button
                  onClick={() => {
                    if (isFinancial && item.subItems) {
                      // Toggle: if already on financial or sub-item, stay. Otherwise go to first sub-item
                      if (!isExpanded) {
                        setActiveView(item.subItems[0].id);
                      }
                    } else {
                      setActiveView(item.id);
                    }
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 min-w-0 ${isExpanded
                    ? 'bg-blue-50 text-blue-600 font-semibold shadow-sm'
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                    }`}
                >
                  <div className="shrink-0">{item.icon}</div>
                  <span className="text-sm min-w-0 flex-1 truncate text-left">{item.label}</span>
                  {item.subItems && (
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

                {/* Sub-items */}
                {item.subItems && isExpanded && (
                  <div className="ml-4 mt-1 space-y-1">
                    {item.subItems.map((subItem) => (
                      <button
                        key={subItem.id}
                        onClick={() => setActiveView(subItem.id)}
                        className={`w-full flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm transition-all ${activeView === subItem.id
                          ? 'bg-blue-100 text-blue-700 font-semibold'
                          : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
                          }`}
                      >
                        {subItem.icon}
                        {subItem.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-100">
          <div className="bg-white border border-slate-200 rounded-xl p-4 mb-4 shadow-sm min-w-0">
            <p className="text-xs text-slate-500 mb-1">Logado como</p>
            <p className="text-sm font-semibold text-slate-800 truncate" title={currentUser.name}>{currentUser.name}</p>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase mt-2 inline-block ${currentUser.role === UserRole.ADMIN ? 'bg-indigo-100 text-indigo-700' : 'bg-emerald-100 text-emerald-700'
              }`}>
              {currentUser.role}
            </span>
          </div>
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-4 py-3 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
          >
            <LogOut size={20} />
            <span className="text-sm">Sair</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Topbar */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 z-10">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-bold text-slate-800">
              {(() => {
                const item = NAV_ITEMS.find(i => i.id === activeView);
                if (item) return item.label;

                // Search in subItems
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
          <div className="flex items-center gap-6">
            {currentUser.role === UserRole.ADMIN && (
              <div className="relative">
                <button
                  onClick={() => setShowNotifications(!showNotifications)}
                  className={`relative p-2 rounded-full transition-all ${showNotifications ? 'bg-blue-50 text-blue-600' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}
                  title={`${notifications.length} solicitações pendentes`}
                >
                  <Bell size={20} />
                  {notifications.length > 0 && (
                    <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center bg-red-500 text-[10px] font-bold text-white rounded-full border-2 border-white">
                      {notifications.length}
                    </span>
                  )}
                </button>

                {showNotifications && (
                  <>
                    <div
                      className="fixed inset-0 z-20"
                      onClick={() => setShowNotifications(false)}
                    ></div>
                    <div className="absolute right-0 mt-3 w-80 bg-white rounded-2xl shadow-2xl border border-slate-100 z-30 overflow-hidden animate-in fade-in slide-in-from-top-2">
                      <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                        <h3 className="font-bold text-slate-800 text-sm">Notificações</h3>
                        {notifications.length > 0 && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onClearNotifications();
                              setShowNotifications(false);
                            }}
                            className="flex items-center gap-1.5 px-2 py-1 text-[10px] font-bold text-blue-600 hover:bg-blue-100 rounded-lg transition-colors group"
                            title="Limpar todas"
                          >
                            <Wand2 size={12} className="group-hover:rotate-12 transition-transform" />
                            LIMPAR TUDO
                          </button>
                        )}
                      </div>
                      <div className="max-h-80 overflow-y-auto">
                        {notifications.length > 0 ? (
                          <div className="divide-y divide-slate-50">
                            {notifications.map((notif) => (
                              <div
                                key={notif.id}
                                className="p-4 hover:bg-slate-50 transition-colors cursor-pointer group"
                                onClick={() => {
                                  setActiveView('commissions');
                                  setShowNotifications(false);
                                }}
                              >
                                <div className="flex items-start gap-3">
                                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 flex-shrink-0">
                                    <UserIcon size={14} />
                                  </div>
                                  <div className="flex-1">
                                    <p className="text-xs text-slate-700 leading-relaxed">
                                      <span className="font-bold text-slate-900">{notif.brokerName}</span> solicitou o pagamento de uma comissão.
                                    </p>
                                    <div className="flex items-center justify-between mt-2">
                                      <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
                                        {formatCurrency(notif.value)}
                                      </span>
                                      <span className="text-[10px] text-slate-400">{notif.date.split('-').reverse().join('/')}</span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="p-8 text-center">
                            <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-3 text-slate-300">
                              <Bell size={20} />
                            </div>
                            <p className="text-xs text-slate-500 font-medium">Nenhuma notificação nova</p>
                          </div>
                        )}
                      </div>
                      <div className="p-3 border-t border-slate-100 bg-slate-50/30 text-center">
                        <button
                          onClick={() => {
                            setActiveView('commissions');
                            setShowNotifications(false);
                          }}
                          className="text-[10px] font-bold text-slate-500 hover:text-blue-600 hover:underline transition-all uppercase tracking-widest"
                        >
                          Ver todas as comissões
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}


            <div className="h-8 w-[1px] bg-slate-200"></div>
            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-medium text-slate-700">{currentUser.name}</p>
                <p className="text-xs text-slate-400">{currentUser.email}</p>
              </div>
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold">
                {currentUser.name.charAt(0)}
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className={`flex-1 bg-slate-50/50 ${activeView.startsWith('financial') ? 'overflow-hidden p-0' : 'overflow-y-auto p-8'}`}>
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;
