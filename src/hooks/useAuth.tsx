import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabaseClient';
import { User, Agency } from '../../types';
import { getSubdomain, fetchAgencyBySlug } from '../lib/agencyUtils';
import { clearAllDrafts } from '../hooks/useAutoSave';

interface AuthContextType {
  session: Session | null;
  currentUser: User | null;
  currentAgency: Agency | null;
  loading: boolean;
  isRegistering: boolean;
  setIsRegistering: (val: boolean) => void;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentAgency, setCurrentAgency] = useState<Agency | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRegistering, setIsRegistering] = useState(false);

  // Safety Timeout
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (loading) {
        console.warn('Carregamento demorou muito, forçando desbloqueio.');
        setLoading(false);
      }
    }, 10000);
    return () => clearTimeout(timeoutId);
  }, [loading]);

  useEffect(() => {
    const slug = getSubdomain();
    if (slug) {
      fetchAgencyBySlug(slug).then(agency => {
        if (agency) setCurrentAgency(agency);
      });
    }

    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      if (s) {
        loadUser(s.user.email!);
      } else {
        setLoading(false);
      }
    }).catch((err: any) => {
      console.error('Erro ao pegar sessão:', err);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, s) => {
      if (event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') return;
      
      // Se já temos uma sessão e o ID do usuário não mudou, evitamos recarregar tudo
      setSession(prev => {
        if (prev?.user?.id === s?.user?.id) return prev;
        return s;
      });

      if (s) {
        // Só carrega o usuário se ele for diferente do atual ou se não houver usuário
        if (!currentUser || currentUser.id !== s.user.id) {
          loadUser(s.user.email!);
        }
      } else {
        setCurrentUser(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const loadUser = async (email: string) => {
    try {
      setLoading(prev => (prev ? true : currentUser === null));
      const { data: userData } = await supabase
        .from('users')
        .select('*')
        .ilike('email', email)
        .maybeSingle(); // Usar maybeSingle em vez de single para evitar erro 406 se não existir
      
      if (userData) {
        // Auto-Reparo de Agency ID (v2.2) para garantir que seja sempre um UUID
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userData.agency_id);
        if (userData.agency_id && !isUuid) {
          console.log('Detectado Agency ID legado (slug). Reparando...', userData.agency_id);
          const { data: realAgency } = await supabase.from('agencies').select('id').eq('slug', userData.agency_id).maybeSingle();
          if (realAgency) {
            const { error: patchError } = await supabase.from('users').update({ agency_id: realAgency.id }).eq('id', userData.id);
            if (!patchError) {
              userData.agency_id = realAgency.id;
              console.log('Agency ID reparado com sucesso para:', realAgency.id);
            }
          }
        }
        // Só atualiza o estado se os dados mudaram de fato (evita flicker e re-renders globais)
        setCurrentUser(prev => {
          if (JSON.stringify(prev) === JSON.stringify(userData)) return prev;
          return userData as User;
        });
      } else {
        console.warn('Usuário não encontrado na tabela public.users:', email);
        
        // Auto-fix: O usuário existe no auth (Google Login ou cadastro que falhou no meio), mas não no BD público.
        // Vamos auto-criar a agência e o usuário para resolver o loop!
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        if (currentSession?.user) {
          const authUser = currentSession.user;
          const defaultAgencySlug = `agency-${Math.random().toString(36).substring(2, 8)}`;
          
          // 1. Criar agência genérica e obter o ID (UUID)
          const { data: agencyData, error: agencyError } = await supabase.from('agencies').insert([{
            name: 'Minha Imobiliária',
            slug: defaultAgencySlug
          }]).select().single();

          if (agencyError || !agencyData) {
            console.error('Falha ao criar agência no auto-fix:', agencyError);
            setLoading(false);
            return;
          }

          // 2. Criar perfil usando o ID da agência (UUID)
          const { data: newUserData, error: createError } = await supabase.from('users').insert([{
            id: authUser.id,
            name: authUser.user_metadata?.full_name || authUser.user_metadata?.name || email.split('@')[0],
            email: email,
            role: 'ADMIN',
            agency_id: agencyData.id // AGORA USANDO O UUID CORRETO
          }]).select().maybeSingle();

          if (newUserData && !createError) {
             console.log('Perfil auto-criado com sucesso!', newUserData);
             setCurrentUser(newUserData as User);
          } else {
             console.error('Falha ao auto-criar perfil!', createError);
             setCurrentUser(null);
          }
        } else {
          setCurrentUser(null);
        }
      }
    } catch (error: any) {
      console.error('Erro geral ao carregar usuário:', error);
      setCurrentUser(null);
    } finally {
      setLoading(false);
    }
  };

  const refreshUser = async () => {
    if (session?.user?.email) {
      await loadUser(session.user.email);
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    clearAllDrafts();
    setCurrentUser(null);
    setSession(null);
  };

  const value = useMemo(() => ({
    session,
    currentUser,
    currentAgency,
    loading,
    isRegistering,
    setIsRegistering,
    logout,
    refreshUser
  }), [session, currentUser, currentAgency, loading, isRegistering]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
