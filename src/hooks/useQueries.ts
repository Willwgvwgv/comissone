import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from './useAuth';
import { Sale } from '../../types';

export function useSales() {
  const { currentAgency, currentUser } = useAuth();
  
  return useQuery({
    queryKey: ['sales', currentAgency?.id],
    queryFn: async () => {
      if (!currentAgency?.id) return [];
      
      const { data, error } = await supabase
        .from('sales')
        .select('*, splits:broker_splits(*)')
        .eq('agency_id', currentAgency.id)
        .order('sale_date', { ascending: false });

      if (error) throw error;
      return data as Sale[];
    },
    enabled: !!currentAgency?.id && !!currentUser,
  });
}

export function useTeam() {
  const { currentAgency, currentUser } = useAuth();
  
  return useQuery({
    queryKey: ['team', currentAgency?.id],
    queryFn: async () => {
      if (!currentAgency?.id) return [];
      
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('agency_id', currentAgency.id);

      if (error) throw error;
      return data;
    },
    enabled: !!currentAgency?.id && !!currentUser,
  });
}
