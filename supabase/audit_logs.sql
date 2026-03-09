-- =====================================================
-- TABELA DE AUDITORIA - ComissOne
-- =====================================================

-- Criar tabela de logs de auditoria
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    action TEXT NOT NULL,                    -- INSERT, UPDATE, DELETE
    table_name TEXT NOT NULL,                -- sales, users, financial_transactions
    record_id UUID,                          -- ID do registro afetado
    old_data JSONB,                          -- Dados antes da alteração
    new_data JSONB,                          -- Dados após a alteração
    ip_address INET,                         -- IP do usuário
    user_agent TEXT,                         -- Browser/Sistema
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Criar índices para performance
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_table_name ON audit_logs(table_name);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_record_id ON audit_logs(record_id);

-- Habilitar RLS (Row Level Security)
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Política: ADMIN pode ver todos os logs
CREATE POLICY "Admins podem ver todos os logs"
    ON audit_logs FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role = 'admin'
        )
    );

-- Política: Qualquer usuário autenticado pode inserir logs
CREATE POLICY "Usuários autenticados podem inserir logs"
    ON audit_logs FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- =====================================================
-- TRIGGER DE AUDITORIA AUTOMÁTICA
-- =====================================================

-- Função genérica para auditoria
CREATE OR REPLACE FUNCTION audit_trigger_func()
RETURNS TRIGGER AS $$
DECLARE
    old_data JSONB;
    new_data JSONB;
BEGIN
    -- Determinar ação
    IF TG_OP = 'INSERT' THEN
        old_data := NULL;
        new_data := to_jsonb(NEW);
    ELSIF TG_OP = 'UPDATE' THEN
        old_data := to_jsonb(OLD);
        new_data := to_jsonb(NEW);
    ELSIF TG_OP = 'DELETE' THEN
        old_data := to_jsonb(OLD);
        new_data := NULL;
    END IF;

    -- Inserir log
    INSERT INTO audit_logs (
        user_id,
        action,
        table_name,
        record_id,
        old_data,
        new_data
    ) VALUES (
        auth.uid(),
        TG_OP,
        TG_TABLE_NAME,
        COALESCE(NEW.id, OLD.id),
        old_data,
        new_data
    );

    -- Retornar resultado
    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- APLICAR TRIGGERS NAS TABELAS CRÍTICAS
-- =====================================================

-- Trigger para tabela sales
DROP TRIGGER IF EXISTS audit_sales ON sales;
CREATE TRIGGER audit_sales
    AFTER INSERT OR UPDATE OR DELETE ON sales
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

-- Trigger para tabela users
DROP TRIGGER IF EXISTS audit_users ON users;
CREATE TRIGGER audit_users
    AFTER INSERT OR UPDATE OR DELETE ON users
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

-- Trigger para tabela financial_transactions (financeiro)
DROP TRIGGER IF EXISTS audit_financial_transactions ON financial_transactions;
CREATE TRIGGER audit_financial_transactions
    AFTER INSERT OR UPDATE OR DELETE ON financial_transactions
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

-- =====================================================
-- VIEW PARA CONSULTA DE LOGS
-- =====================================================

CREATE OR REPLACE VIEW audit_logs_view AS
SELECT 
    al.id,
    al.action,
    al.table_name,
    al.record_id,
    al.old_data,
    al.new_data,
    al.ip_address,
    al.created_at,
    u.name as user_nome,
    u.email as user_email
FROM audit_logs al
LEFT JOIN users u ON u.id = al.user_id
ORDER BY al.created_at DESC;

-- =====================================================
-- FUNÇÃO PARA LIMPAR LOGS ANTIGOS (opcional)
-- =====================================================

CREATE OR REPLACE FUNCTION clean_old_audit_logs(days_to_keep INTEGER DEFAULT 90)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM audit_logs
    WHERE created_at < NOW() - (days_to_keep || ' days')::INTERVAL;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
