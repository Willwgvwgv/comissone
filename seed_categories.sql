-- SQL para inserir as categorias empresariais mais comuns
-- Execute este comando no SQL Editor do seu projeto Supabase para a agency_001

INSERT INTO financial_categories (name, type, color, agency_id) VALUES 
-- Receitas (Verdes e Azuis)
('Vendas de Serviços', 'INCOME', '#10b981', 'agency_001'),
('Comissões', 'INCOME', '#059669', 'agency_001'),
('Rendimentos', 'INCOME', '#3b82f6', 'agency_001'),
('Outras Receitas', 'INCOME', '#64748b', 'agency_001'),

-- Despesas (Vermelhos, Laranjas, Roxos e Cinzas)
('Aluguel e Condomínio', 'EXPENSE', '#ef4444', 'agency_001'),
('Salários e Encargos', 'EXPENSE', '#f59e0b', 'agency_001'),
('Pró-labore', 'EXPENSE', '#db2777', 'agency_001'),
('Marketing e Ads', 'EXPENSE', '#3b82f6', 'agency_001'),
('Impostos e Taxas', 'EXPENSE', '#475569', 'agency_001'),
('Tarifas Bancárias', 'EXPENSE', '#64748b', 'agency_001'),
('Software e SaaS', 'EXPENSE', '#7c3aed', 'agency_001'),
('Papelaria e Escritório', 'EXPENSE', '#f97316', 'agency_001'),
('Internet e Telefone', 'EXPENSE', '#06b6d4', 'agency_001'),
('Limpeza e Manutenção', 'EXPENSE', '#22c55e', 'agency_001'),
('Viagens e Estadias', 'EXPENSE', '#8b5cf6', 'agency_001'),
('Alimentação', 'EXPENSE', '#facc15', 'agency_001'),
('Contabilidade', 'EXPENSE', '#ea580c', 'agency_001'),
('Consultoria Jurídica', 'EXPENSE', '#1e293b', 'agency_001')
ON CONFLICT DO NOTHING;
