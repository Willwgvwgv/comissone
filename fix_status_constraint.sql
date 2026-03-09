-- Script para corrigir a restrição de STATUS
-- Execute este script no SQL Editor do Supabase para corrigir o erro de pagamento parcial

DO $$
BEGIN
    -- 1. Remover a restrição antiga (se existir)
    ALTER TABLE financial_transactions DROP CONSTRAINT IF EXISTS financial_transactions_status_check;
    
    -- 2. Adicionar a nova restrição permitindo 'PARTIAL'
    ALTER TABLE financial_transactions ADD CONSTRAINT financial_transactions_status_check 
    CHECK (status IN ('PENDING', 'PAID', 'PARTIAL'));

    -- 3. Forçar atualização do cache de esquema (opcional, mas bom pra garantir)
    NOTIFY pgrst, 'reload schema';
END $$;
