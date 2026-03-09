import React, { useState, useEffect, useMemo } from 'react';
import type { Session } from '@supabase/supabase-js';

import Layout from './components/Layout';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import Sales from './components/Sales';
import Commissions from './components/Commissions';
import Financial from './components/Financial';
import Team from './components/Team';
import Reports from './components/Reports';
import BrokerPortal from './components/broker/BrokerPortal';
import Register from './components/Register';

import { User, Sale, UserRole, CommissionStatus, Agency } from './types';
import { supabase } from './src/lib/supabaseClient';
import { updateCommissionStatus, updateForecastDate } from './src/lib/supabaseHooks';
import { getSubdomain, fetchAgencyBySlug } from './src/lib/agencyUtils';
import { clearAllDrafts } from './src/hooks/useAutoSave';

const TEST_AGENCY_ID = 'agency_001';
const round2 = (num: number) => Math.round((num + Number.EPSILON) * 100) / 100;

const App: React.FC = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeView, setActiveView] = useState('dashboard');
  const [sales, setSales] = useState<Sale[]>([]);
  const [team, setTeam] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [dismissedNotificationIds, setDismissedNotificationIds] = useState<string[]>(() => {
    const saved = localStorage.getItem('dismissed_notifications');
    return saved ? JSON.parse(saved) : [];
  });
  const [isRegistering, setIsRegistering] = useState(false);
  const [currentAgency, setCurrentAgency] = useState<Agency | null>(null);

  useEffect(() => {
    localStorage.setItem('dismissed_notifications', JSON.stringify(dismissedNotificationIds));
  }, [dismissedNotificationIds]);

  // ── Supabase Auth state listener ────────────────────────────────────────
  useEffect(() => {
    // Safety Timeout: Force loading to false if it takes too long (e.g., 10 seconds)
    const timeoutId = setTimeout(() => {
      if (loading) {
        console.warn('Carregamento demorou muito, forçando desbloqueio.');
        setLoading(false);
      }
    }, 10000);

    // Detect Agency via Subdomain
    const slug = getSubdomain();
    if (slug) {
      fetchAgencyBySlug(slug).then(agency => {
        if (agency) setCurrentAgency(agency);
      });
    }

    // Get initial session
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      if (s) {
        loadUserAndData(s.user.email!);
      } else {
        setLoading(false);
      }
    }).catch(err => {
      console.error('Erro ao pegar sessão:', err);
      setLoading(false);
    });

    // Listen for auth changes (login, logout, token refresh, OAuth callback)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, s) => {
      console.log('Auth event change:', event);
      // Ignorar TOKEN_REFRESHED e USER_UPDATED para não recarregar a tela
      if (event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') return;
      setSession(s);
      if (s) {
        loadUserAndData(s.user.email!);
      } else {
        setCurrentUser(null);
        setSales([]);
        setTeam([]);
        setLoading(false);
      }
    });

    return () => {
      clearTimeout(timeoutId);
      subscription.unsubscribe();
    };
  }, []);

  // ── Load user profile + sales data ──────────────────────────────────────
  async function loadUserAndData(email: string) {
    try {
      // Só mostra loading na primeira carga (quando não há usuário ainda)
      setLoading(prev => {
        if (prev) return true; // já está em loading, mantém
        // Se usuário já está carregado, não mostra loading
        return currentUser === null;
      });

      // 1. Find user record by email
      const { data: userData } = await supabase
        .from('users')
        .select('*')
        .ilike('email', email)
        .single();

      if (userData) {
        setCurrentUser(userData as User);
        await fetchData(userData.agency_id);
      } else {
        // User authenticated but no record in users table — shouldn't normally happen
        console.error('Usuário autenticado mas não encontrado na tabela users:', email);
        setLoading(false);
      }
    } catch (error) {
      console.error('Erro ao carregar dados do usuário:', error);
      setLoading(false);
    }
  }

  async function fetchData(agencyId: string = TEST_AGENCY_ID) {
    try {
      const [{ data: usersData }, { data: salesData }] = await Promise.all([
        supabase.from('users').select('*').eq('agency_id', agencyId),
        supabase.from('sales').select('*, splits:broker_splits(*)').eq('agency_id', agencyId).order('sale_date', { ascending: false }),
      ]);

      if (usersData) setTeam(usersData);
      if (salesData) setSales(salesData);
    } catch (error) {
      console.error('Erro ao buscar dados:', error);
    } finally {
      setLoading(false);
    }
  }

  // Convenience refetch using current user's agency
  const fetchInitialData = () => fetchData(currentUser?.agency_id ?? TEST_AGENCY_ID);

  // ── Notifications ────────────────────────────────────────────────────────
  const requestedNotifications = useMemo(() => {
    if (currentUser?.role !== UserRole.ADMIN) return [];
    const notifications: any[] = [];
    sales.forEach(sale => {
      sale.splits?.forEach(split => {
        if (split.status === CommissionStatus.REQUESTED && !dismissedNotificationIds.includes(split.id)) {
          notifications.push({
            id: split.id,
            brokerName: split.broker_name,
            value: split.calculated_value,
            saleId: sale.id,
            date: split.forecast_date || sale.sale_date
          });
        }
      });
    });
    return notifications.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [sales, currentUser, dismissedNotificationIds]);

  const handleClearNotifications = () => {
    setDismissedNotificationIds(prev => Array.from(new Set([...prev, ...requestedNotifications.map(n => n.id)])));
  };

  // ── Commission actions ───────────────────────────────────────────────────
  const handleUpdateCommissionStatus = async (
    saleId: string, brokerId: string, newStatus: CommissionStatus,
    receiptData?: string, paymentAmount?: number, remainingAmount?: number,
    installmentNumber?: number, remainingForecastDate?: string,
    notes?: string, discountValue?: number, id?: string
  ) => {
    try {
      await updateCommissionStatus(saleId, brokerId, newStatus, receiptData, paymentAmount, remainingAmount, installmentNumber, remainingForecastDate, notes, discountValue, id);
      await fetchInitialData();
    } catch (error: any) {
      console.error('Erro detalhado ao atualizar status:', error);
      const msg = error?.message || 'Erro desconhecido';
      const details = error?.details || '';
      const hint = error?.hint || '';
      alert(`Erro ao atualizar status: ${msg}\n${details}\n${hint}\n\nCertifique-se de ter executado o script FIX_PAGAMENTO_PARCIAL.sql no Supabase.`);
    }
  };

  const handleUpdateForecast = async (saleId: string, brokerId: string, newForecastDate: string, installmentNumber?: number, id?: string) => {
    try {
      await updateForecastDate(saleId, brokerId, newForecastDate, installmentNumber, id);
      await fetchInitialData();
    } catch (error) {
      console.error('Erro ao atualizar previsão:', error);
      alert('Erro ao atualizar previsão. Tente novamente.');
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    clearAllDrafts();
    setCurrentUser(null);
    setActiveView('dashboard');
  };

  // ── Broker: request payment ──────────────────────────────────────────────
  const handleBrokerRequestPayment = async (saleId: string, brokerId: string, installmentNumber?: number) => {
    await handleUpdateCommissionStatus(saleId, brokerId, CommissionStatus.REQUESTED, undefined, undefined, undefined, installmentNumber);
  };

  // ── Loading screen ───────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8fafc] flex-col p-6 relative overflow-hidden">
        {/* Grid Pattern Background */}
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.4]"
          style={{
            backgroundImage: `linear-gradient(#e5e7eb 1px, transparent 1px), linear-gradient(90deg, #e5e7eb 1px, transparent 1px)`,
            backgroundSize: '40px 40px'
          }}
        />

        <div className="text-center relative z-10">
          <div className="w-16 h-16 border-4 border-[#1e3a5f]/10 border-t-[#1e3a5f] rounded-full animate-spin mx-auto mb-6" />
          <img src="/logo.png" alt="ComissOne" className="h-8 w-auto opacity-50 grayscale mb-4 mx-auto" />
          <p className="text-[#1e3a5f] font-bold text-sm tracking-widest uppercase">Carregando Sistema...</p>
        </div>

        {/* Emergency Reset Button */}
        <div className="mt-12 pt-8 border-t border-slate-200 text-center max-w-xs relative z-10">
          <p className="text-[10px] text-slate-400 mb-4 font-bold uppercase tracking-wide">
            Se o carregamento travar, tente limpar a sessão local:
          </p>
          <button
            onClick={() => {
              localStorage.clear();
              sessionStorage.clear();
              supabase.auth.signOut().then(() => {
                window.location.reload();
              });
            }}
            className="text-[10px] font-black text-slate-500 hover:text-red-600 border border-slate-200 px-6 py-3 rounded-xl transition-all hover:bg-red-50 uppercase tracking-widest"
          >
            Limpar Sessão e Recarregar
          </button>
        </div>
      </div>
    );
  }

  // ── Not authenticated → Login/Register ──────────────────────────────────
  if (!session || !currentUser) {
    if (isRegistering) {
      return <Register agency={currentAgency} onBackToLogin={() => setIsRegistering(false)} />;
    }
    return (
      <Login
        agency={currentAgency}
        onLogin={() => { /* onAuthStateChange cuida do login */ }}
        onRegister={() => setIsRegistering(true)}
      />
    );
  }

  // ── BROKER role → Broker Portal ──────────────────────────────────────────
  if (currentUser.role === UserRole.BROKER) {
    return (
      <BrokerPortal
        currentUser={currentUser}
        sales={sales}
        onRequestPayment={handleBrokerRequestPayment}
        onLogout={handleLogout}
      />
    );
  }

  // ── ADMIN role → Full Layout ─────────────────────────────────────────────
  const financialTabMap: Record<string, 'transactions' | 'overview' | 'accounts' | 'categories' | 'reconciliation' | 'cards'> = {
    'financial-transactions': 'transactions',
    'financial-overview': 'overview',
    'financial-cards': 'cards',
    'financial-accounts': 'accounts',
    'financial-categories': 'categories',
    'financial-reconciliation': 'reconciliation',
  };

  const renderContent = () => {
    switch (activeView) {
      case 'dashboard':
        return <Dashboard sales={sales} currentUser={currentUser} />;
      case 'financial':
      case 'financial-transactions':
      case 'financial-overview':
      case 'financial-cards':
      case 'financial-accounts':
      case 'financial-categories':
      case 'financial-reconciliation': {
        const tab = financialTabMap[activeView] || 'transactions';
        return <Financial currentUser={currentUser} initialTab={tab} />;
      }
      case 'sales':
        return <Sales sales={sales} setSales={setSales} currentUser={currentUser} team={team} onRefetch={fetchInitialData} />;
      case 'commissions':
        return (
          <Commissions
            sales={sales}
            currentUser={currentUser}
            onUpdateStatus={handleUpdateCommissionStatus}
            onUpdateForecast={handleUpdateForecast}
          />
        );
      case 'reports':
        return <Reports sales={sales} team={team} currentUser={currentUser} />;
      case 'team':
        return (
          <Team
            team={team}
            currentUser={currentUser}
            onRefetch={fetchInitialData}
            onRemoveUser={async (userId) => {
              try {
                await supabase.from('users').delete().eq('id', userId);
                await fetchInitialData();
              } catch (error) {
                console.error('Erro ao remover usuário:', error);
                alert('Erro ao remover usuário. Tente novamente.');
              }
            }}
          />
        );
      default:
        return <Dashboard sales={sales} currentUser={currentUser} />;
    }
  };

  return (
    <Layout
      currentUser={currentUser}
      activeView={activeView}
      setActiveView={setActiveView}
      notifications={requestedNotifications}
      onClearNotifications={handleClearNotifications}
      onLogout={handleLogout}
    >
      {renderContent()}
    </Layout>
  );
};

export default App;
