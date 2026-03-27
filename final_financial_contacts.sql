-- =====================================================
-- COMISSONE v2.0
-- SCRIPT FINAL - CONTATOS FINANCEIROS
-- Supabase / PostgreSQL
-- =====================================================

begin;

-- =====================================================
-- 1) TABELA: financial_contacts
-- =====================================================

create table if not exists public.financial_contacts (
    id uuid primary key default gen_random_uuid(),
    agency_id uuid not null,
    name text not null,
    document text null,
    email text null,
    phone text null,
    type text not null default 'BOTH',
    is_active boolean not null default true,
    notes text null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),

    constraint financial_contacts_type_check
        check (type in ('CLIENT', 'SUPPLIER', 'BOTH'))
);

-- =====================================================
-- 2) COLUNA contact_id EM financial_transactions
-- =====================================================

alter table public.financial_transactions
    add column if not exists contact_id uuid null;

-- =====================================================
-- 3) FOREIGN KEY
-- =====================================================

do $$
begin
    if not exists (
        select 1
        from pg_constraint
        where conname = 'financial_transactions_contact_id_fkey'
    ) then
        alter table public.financial_transactions
        add constraint financial_transactions_contact_id_fkey
        foreign key (contact_id)
        references public.financial_contacts(id)
        on delete set null;
    end if;
end $$;

-- =====================================================
-- 4) ÍNDICES
-- =====================================================

create index if not exists idx_financial_contacts_agency_id
    on public.financial_contacts (agency_id);

create index if not exists idx_financial_contacts_type
    on public.financial_contacts (type);

create index if not exists idx_financial_contacts_is_active
    on public.financial_contacts (is_active);

create index if not exists idx_financial_contacts_name
    on public.financial_contacts (name);

create index if not exists idx_financial_transactions_contact_id
    on public.financial_transactions (contact_id);

create index if not exists idx_financial_transactions_agency_contact
    on public.financial_transactions (agency_id, contact_id);

-- =====================================================
-- 5) UPDATED_AT AUTOMÁTICO
-- =====================================================

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

do $$
begin
    if not exists (
        select 1
        from pg_trigger
        where tgname = 'trg_financial_contacts_updated_at'
    ) then
        create trigger trg_financial_contacts_updated_at
        before update on public.financial_contacts
        for each row
        execute function public.set_updated_at();
    end if;
end $$;

-- =====================================================
-- 6) RLS (Básico - Aberto para implementação)
-- =====================================================

alter table public.financial_contacts enable row level security;

-- leitura
do $$
begin
    if not exists (
        select 1
        from pg_policies
        where schemaname = 'public'
          and tablename = 'financial_contacts'
          and policyname = 'financial_contacts_select_policy'
    ) then
        create policy financial_contacts_select_policy
        on public.financial_contacts
        for select
        using (true);
    end if;
end $$;

-- inserção
do $$
begin
    if not exists (
        select 1
        from pg_policies
        where schemaname = 'public'
          and tablename = 'financial_contacts'
          and policyname = 'financial_contacts_insert_policy'
    ) then
        create policy financial_contacts_insert_policy
        on public.financial_contacts
        for insert
        with check (true);
    end if;
end $$;

-- atualização
do $$
begin
    if not exists (
        select 1
        from pg_policies
        where schemaname = 'public'
          and tablename = 'financial_contacts'
          and policyname = 'financial_contacts_update_policy'
    ) then
        create policy financial_contacts_update_policy
        on public.financial_contacts
        for update
        using (true)
        with check (true);
    end if;
end $$;

-- exclusão
do $$
begin
    if not exists (
        select 1
        from pg_policies
        where schemaname = 'public'
          and tablename = 'financial_contacts'
          and policyname = 'financial_contacts_delete_policy'
    ) then
        create policy financial_contacts_delete_policy
        on public.financial_contacts
        for delete
        using (true);
    end if;
end $$;

-- Índices Adicionais Recomendados
create index if not exists idx_financial_transactions_agency_id
    on public.financial_transactions (agency_id);

create index if not exists idx_financial_transactions_due_date
    on public.financial_transactions (due_date);

create index if not exists idx_financial_transactions_status
    on public.financial_transactions (status);

create index if not exists idx_financial_transactions_type
    on public.financial_transactions (type);

commit;
