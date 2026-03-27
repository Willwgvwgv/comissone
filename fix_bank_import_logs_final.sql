-- =====================================================
-- COMISSONE v2.0
-- SCRIPT: Criação e Atualização de bank_import_logs
-- Corrigir erro: "Could not find the table 'public.bank_import_logs'"
-- =====================================================

begin;

-- 1) Criar a tabela se não existir
create table if not exists public.bank_import_logs (
    id              uuid            default gen_random_uuid() primary key,
    agency_id       uuid            not null,
    account_id      uuid            not null references public.financial_accounts(id) on delete cascade,
    filename        text            not null,
    file_size       integer,
    file_hash       text,
    transaction_count integer       default 0,
    entries_sum     numeric(15,2)   default 0,
    exits_sum       numeric(15,2)   default 0,
    period_start    date,
    period_end      date,
    import_date     timestamptz     default now(),
    created_at      timestamptz     default now(),

    -- Colunas estatísticas (v2.2)
    reconciled_count integer        default 0,
    reconciled_sum   numeric(15,2)  default 0,
    created_count    integer        default 0,
    created_sum      numeric(15,2)  default 0
);

-- 2) Colunas extras em financial_transactions (se não existirem)
alter table public.financial_transactions
    add column if not exists import_id      uuid references public.bank_import_logs(id) on delete set null,
    add column if not exists bank_txn_id    text;           -- ID único do banco (FITID do OFX ou hash do CSV)

-- 3) Índices de performance e unicidade
create unique index if not exists idx_bank_txn_unique
    on public.financial_transactions (agency_id, bank_txn_id)
    where bank_txn_id is not null;

create index if not exists idx_bank_import_logs_agency
    on public.bank_import_logs (agency_id);

create index if not exists idx_bank_import_logs_account
    on public.bank_import_logs (account_id);

-- 4) RLS (Segurança por Agência)
alter table public.bank_import_logs enable row level security;

-- Política de leitura/escrita simplificada (baseada na agência do usuário)
do $$
begin
    if not exists (
        select 1 from pg_policies 
        where tablename = 'bank_import_logs' and policyname = 'agency_isolation_import_logs'
    ) then
        create policy "agency_isolation_import_logs"
            on public.bank_import_logs
            using (agency_id = (select agency_id::uuid from public.users where id = auth.uid()));
    end if;
end $$;

commit;
