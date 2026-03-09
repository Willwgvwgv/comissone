-- ============================================================
-- MIGRAÇÃO: Suporte ao Módulo de Importação de Extratos
-- Execute este SQL no Supabase SQL Editor (Dashboard > SQL)
-- ============================================================

-- 1. Tabela de logs de importação de extratos bancários
CREATE TABLE IF NOT EXISTS public.bank_import_logs (
    id              UUID            DEFAULT gen_random_uuid() PRIMARY KEY,
    agency_id       UUID            NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
    account_id      UUID            NOT NULL REFERENCES public.financial_accounts(id) ON DELETE CASCADE,
    filename        TEXT            NOT NULL,
    file_size       INTEGER,
    file_hash       TEXT,
    transaction_count INTEGER       DEFAULT 0,
    entries_sum     NUMERIC(15,2)   DEFAULT 0,
    exits_sum       NUMERIC(15,2)   DEFAULT 0,
    period_start    DATE,
    period_end      DATE,
    import_date     TIMESTAMPTZ     DEFAULT NOW(),
    created_at      TIMESTAMPTZ     DEFAULT NOW()
);

-- 2. Colunas extras em financial_transactions (se não existirem)
ALTER TABLE public.financial_transactions
    ADD COLUMN IF NOT EXISTS import_id      UUID REFERENCES public.bank_import_logs(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS bank_txn_id    TEXT;           -- ID único do banco (FITID do OFX ou hash do CSV)

-- 3. Índice para evitar duplicatas de importação  
CREATE UNIQUE INDEX IF NOT EXISTS idx_bank_txn_unique
    ON public.financial_transactions (agency_id, bank_txn_id)
    WHERE bank_txn_id IS NOT NULL;

-- 4. RLS (Row Level Security) para bank_import_logs
ALTER TABLE public.bank_import_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "agency_isolation_import_logs"
    ON public.bank_import_logs
    USING (agency_id = (SELECT agency_id FROM public.users WHERE id = auth.uid()));

-- ============================================================
-- FEITO! Agora a importação de extratos funcionará.
-- ============================================================
