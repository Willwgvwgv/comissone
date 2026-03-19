-- Correção de RLS para o Cadastro (Register.tsx) funcionar

-- 1. Políticas para a tabela AGENCIES
DROP POLICY IF EXISTS "Permitir insert agencies" ON agencies;
CREATE POLICY "Permitir insert agencies" ON agencies FOR INSERT TO authenticated, anon WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir update agencies" ON agencies;
CREATE POLICY "Permitir update agencies" ON agencies FOR UPDATE TO authenticated, anon USING (true);

-- 2. Políticas para a tabela USERS
DROP POLICY IF EXISTS "Permitir insert users" ON users;
CREATE POLICY "Permitir insert users" ON users FOR INSERT TO authenticated, anon WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir update users" ON users;
CREATE POLICY "Permitir update users" ON users FOR UPDATE TO authenticated, anon USING (true);

-- Dica de Ouro:
-- Como a criação do usuário no Supabase Auth dispara a criação da Agência pelo Frontend,
-- precisamos garantir que o visitante (anon) consiga Inserir esses dados na primeira etapa!
