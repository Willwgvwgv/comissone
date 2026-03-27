-- =====================================================
-- COMISSONE v2.0
-- SCRIPT: client_contact_id em sales
-- Supabase / PostgreSQL
-- =====================================================

begin;

-- =====================================================
-- 1) COLUNA client_contact_id NA TABELA sales
-- =====================================================

alter table public.sales
    add column if not exists client_contact_id uuid null;

-- =====================================================
-- 2) FOREIGN KEY (segura: só cria se não existir)
-- =====================================================

do $$
begin
    if not exists (
        select 1
        from pg_constraint
        where conname = 'sales_client_contact_id_fkey'
    ) then
        alter table public.sales
            add constraint sales_client_contact_id_fkey
            foreign key (client_contact_id)
            references public.financial_contacts(id)
            on delete set null;
    end if;
end $$;

-- =====================================================
-- 3) ÍNDICES
-- =====================================================

-- Filtrar vendas por cliente
create index if not exists idx_sales_client_contact_id
    on public.sales (client_contact_id);

-- Join frequente: agência + cliente
create index if not exists idx_sales_agency_client
    on public.sales (agency_id, client_contact_id);

-- Otimização para listagem por cliente ordenada por data (Sugestão v2.2)
create index if not exists idx_sales_agency_client_date
    on public.sales (agency_id, client_contact_id, sale_date desc);

-- =====================================================
-- 4) VERIFICAÇÃO PÓS-MIGRAÇÃO
-- =====================================================

-- Confirmar estrutura:
-- select column_name, data_type, is_nullable
-- from information_schema.columns
-- where table_name = 'sales' and column_name = 'client_contact_id';

-- Confirmar FK:
-- select conname from pg_constraint where conname = 'sales_client_contact_id_fkey';

-- Ver distribuição dos dados:
-- select
--   count(*) as total,
--   count(client_contact_id) as com_contato,
--   count(*) - count(client_contact_id) as sem_contato,
--   count(buyer_name) as com_buyer_name_legado
-- from public.sales;

commit;
