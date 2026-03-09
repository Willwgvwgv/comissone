-- Migração para suporte a Cartões de Crédito e Transferências
-- Execute este script no SQL Editor do seu projeto Supabase

-- 1. Alterar tabela de Contas para suportar tipos e datas de cartão
ALTER TABLE financial_accounts 
ADD COLUMN IF NOT EXISTS type TEXT CHECK (type IN ('BANK', 'CREDIT_CARD')) DEFAULT 'BANK',
ADD COLUMN IF NOT EXISTS due_day INTEGER CHECK (due_day >= 1 AND due_day <= 31),
ADD COLUMN IF NOT EXISTS closing_day INTEGER CHECK (closing_day >= 1 AND closing_day <= 31),
ADD COLUMN IF NOT EXISTS linked_account_id UUID REFERENCES financial_accounts(id);

-- 2. Alterar tabela de Transações para suportar transferências
ALTER TABLE financial_transactions
ADD COLUMN IF NOT EXISTS is_transfer BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS transfer_group_id UUID;

-- 3. Comentários para documentação
COMMENT ON COLUMN financial_accounts.type IS 'Tipo da conta: Conta Corrente/Poupança ou Cartão de Crédito';
COMMENT ON COLUMN financial_accounts.due_day IS 'Dia de vencimento da fatura (para cartões)';
COMMENT ON COLUMN financial_accounts.closing_day IS 'Dia de fechamento da fatura (para cartões)';
COMMENT ON COLUMN financial_transactions.transfer_group_id IS 'ID compartilhado entre as duas pontas de uma transferência para facilitar exclusão/edição conjunta';
