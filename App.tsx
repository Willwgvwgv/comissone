
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

import { UserRole, CommissionStatus } from './types';
import { supabase } from './src/lib/supabaseClient';
import { updateCommissionStatus, updateForecastDate } from './src/lib/supabaseHooks';
import { AuthProvider, useAuth } from './src/hooks/useAuth';
import { useSales, useTeam } from './src/hooks/useQueries';

const round2 = (num: number) => Math.round((num + Number.EPSILON) * 100) / 100;

const AppContent: React.FC = () => {
  const { currentUser, currentAgency, loading, isRegistering, setIsRegistering, logout } = useAuth();
  const { data: sales = [], refetch: refetchSales } = useSales();
  const { data: team = [], refetch: refetchTeam } = useTeam();

  const fetchInitialData = async () => {
    await Promise.all([refetchSales(), refetchTeam()]);
  };

  const [activeView, setActiveView] = useState(() => {
    return localStorage.getItem('comissone_active_view') || 'dashboard';
  });

  useEffect(() => {
    localStorage.setItem('comissone_active_view', activeView);
  }, [activeView]);

  const [dismissedNotificationIds, setDismissedNotificationIds] = useState<string[]>(() => {
    const saved = localStorage.getItem('dismissed_notifications');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem('dismissed_notifications', JSON.stringify(dismissedNotificationIds));
  }, [dismissedNotificationIds]);

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
      alert(`Erro ao atualizar status: ${error?.message || 'Erro desconhecido'}`);
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

  const handleBrokerRequestPayment = async (saleId: string, brokerId: string, installmentNumber?: number) => {
    await handleUpdateCommissionStatus(saleId, brokerId, CommissionStatus.REQUESTED, undefined, undefined, undefined, installmentNumber);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8fafc] flex-col p-6 relative overflow-hidden">
        <div className="text-center relative z-10">
          <div className="w-16 h-16 border-4 border-[#1e3a5f]/10 border-t-[#1e3a5f] rounded-full animate-spin mx-auto mb-6" />
          <img src="/logo.png" alt="ComissOne" className="h-8 w-auto opacity-50 grayscale mb-4 mx-auto" />
          <p className="text-[#1e3a5f] font-bold text-sm tracking-widest uppercase">Carregando Sistema...</p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    if (isRegistering) {
      return <Register agency={currentAgency} onBackToLogin={() => setIsRegistering(false)} />;
    }
    return (
      <Login
        agency={currentAgency}
        onLogin={() => {}}
        onRegister={() => setIsRegistering(true)}
      />
    );
  }

  if (currentUser.role === UserRole.BROKER) {
    return (
      <BrokerPortal
        currentUser={currentUser}
        sales={sales}
        onRequestPayment={handleBrokerRequestPayment}
        onLogout={logout}
      />
    );
  }

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
        return <Sales sales={sales} setSales={() => {}} currentUser={currentUser} team={team} onRefetch={fetchInitialData} />;
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
      onLogout={logout}
    >
      {renderContent()}
    </Layout>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

export default App;
