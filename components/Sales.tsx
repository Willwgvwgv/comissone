
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  Search,
  Plus,
  Download,
  Calendar,
  ChevronRight,
  Trash2,
  Edit2,
  ArrowRight,
  Save,
  X,
  FileText,
  DollarSign,
  User as UserIcon,
  MapPin,
  CreditCard,
  Building2,
  TrendingUp,
  Wallet,
  CheckCircle2,
  Clock,
  Info,
  ShoppingCart,
  Edit,
  Split,
  FileCheck,
  FileX,
  AlertCircle,
  FileX2,
  CheckCircle,
  RefreshCw
} from 'lucide-react';

import { useAutoSave, loadDraft, clearDraft } from '../src/hooks/useAutoSave';
import { AutoSaveIndicator } from './SupportComponents';
import { useSanitize } from '../src/hooks/useSanitize';
import { formatCurrency, formatCpfCnpjInput } from '../src/utils/formatters';
import { useFinancial } from '../src/lib/useFinancial';
import SearchableContactSelect from './financial/SearchableContactSelect';

import { Sale, User, UserRole, CommissionStatus, BrokerSplit, SaleStatus, FinancialContact } from '../types';
import { maskCPF, sanitizeInput } from '../src/utils/securityUtils';


const round2 = (num: number) => Math.round((num + Number.EPSILON) * 100) / 100;


interface SalesProps {
  sales: Sale[];
  setSales: React.Dispatch<React.SetStateAction<Sale[]>>;
  currentUser: User;
  team: User[];
  onRefetch?: () => void;
}

const DRAFT_KEY = 'comissone_sales_form_draft';

const Sales: React.FC<SalesProps> = ({ sales, setSales, currentUser, team, onRefetch }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSale, setEditingSale] = useState<Sale | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [saveFeedback, setSaveFeedback] = useState(false);

  // Contacts from financial module (reused)
  const { contacts, addContact } = useFinancial(currentUser.agency_id);
  const clientContacts = contacts.filter(c => c.is_active && (c.type === 'CLIENT' || c.type === 'BOTH'));

  // Estado para o modal de exclusÃƒÂ£o
  const [saleToDelete, setSaleToDelete] = useState<string | null>(null);

  // Estados para Filtros
  const [period, setPeriod] = useState<string>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [onlyInstallments, setOnlyInstallments] = useState(false);
  const [showCanceledSales, setShowCanceledSales] = useState(false);
  const [filterContactId, setFilterContactId] = useState<string>('');

  // Auditoria
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);
  const [loadingAudit, setLoadingAudit] = useState(false);
  const [selectedSaleForAudit, setSelectedSaleForAudit] = useState<Sale | null>(null);

  // Build a map of contact names for display enrichment
  const contactNameMap = useMemo(() => new Map(contacts.map(c => [c.id, c.name])), [contacts]);

  // LÃƒÂ³gica de Filtragem
  const filteredSales = useMemo(() => {
    let result = [...sales];

    // 0. Filtro de Canceladas
    if (!showCanceledSales) {
      result = result.filter(s => s.status !== SaleStatus.CANCELED);
    }

    // 0.1 Filtro de Parceladas
    if (onlyInstallments) {
      result = result.filter(s => s.is_installment);
    }

    // 0.2 Filtro por Cliente
    if (filterContactId) {
      result = result.filter(s => s.client_contact_id === filterContactId);
    }

    // 1. Busca por texto (inclui nome do contato vinculado)
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(s => {
        const contactName = s.client_contact_id ? (contactNameMap.get(s.client_contact_id) || '') : '';
        return (
          s.property_address.toLowerCase().includes(term) ||
          (s.buyer_name || '').toLowerCase().includes(term) ||
          (s.seller_name || '').toLowerCase().includes(term) ||
          contactName.toLowerCase().includes(term)
        );
      });
    }

    // 2. Filtro de Período
    const now = new Date();
    result = result.filter(s => {
      const saleDate = new Date(s.sale_date + 'T00:00:00');

      if (period === 'month') {
        return saleDate.getMonth() === now.getMonth() && saleDate.getFullYear() === now.getFullYear();
      }
      if (period === 'quarter') {
        const currentQuarter = Math.floor(now.getMonth() / 3);
        const saleQuarter = Math.floor(saleDate.getMonth() / 3);
        return saleQuarter === currentQuarter && saleDate.getFullYear() === now.getFullYear();
      }
      if (period === 'year') {
        return saleDate.getFullYear() === now.getFullYear();
      }
      if (period === 'custom' && startDate && endDate) {
        const start = new Date(startDate + 'T00:00:00');
        const end = new Date(endDate + 'T23:59:59');
        return saleDate >= start && saleDate <= end;
      }
      return true;
    });

    return result;
  }, [sales, searchTerm, period, startDate, endDate, showCanceledSales, onlyInstallments, filterContactId, contactNameMap]);

  // KPIs baseados nos dados filtrados
  const kpis = useMemo(() => {
    let agencyComm = 0;
    let salesWithoutInvoice = 0;
    let totalComm = 0;
    let vgvTotal = 0;
    let canceledCount = 0;

    filteredSales.forEach(s => {
      // Contar vendas canceladas separadamente
      if (s.status === SaleStatus.CANCELED) {
        canceledCount++;
        return;
      }

      vgvTotal += s.vgv;

      // Calcular a parte da agência nas comissões desta venda
      const agencySplit = s.splits.find(sp => sp.broker_name.toLowerCase().includes('agência') || sp.broker_name.toLowerCase().includes('admin'));
      if (agencySplit) {
        agencyComm += agencySplit.calculated_value;
      }

      // Contar vendas sem nota fiscal
      if (!s.invoice_number) {
        salesWithoutInvoice += 1;
      }

      totalComm += s.total_commission_value;
    });

    return {
      agencyComm,
      totalComm,
      vgvTotal,
      salesWithoutInvoice,
      canceledCount,
      count: filteredSales.filter(s => s.status !== SaleStatus.CANCELED).length
    };
  }, [filteredSales]);



  // Estado para Nova Venda / EdiÃƒÂ§ÃƒÂ£o
  const defaultNewSale: Partial<Sale> = {
    sale_date: new Date().toISOString().split('T')[0],
    commission_percentage: 6,
    client_contact_id: null,
    seller_contact_id: null,
    invoice_issued: false,
    invoice_number: '',
    is_installment: false,
    installments: []
  };

  const defaultInstallmentConfig = {
    count: 1,
    firstDate: new Date().toISOString().split('T')[0]
  };

  const [newSale, setNewSale] = useState<Partial<Sale>>(defaultNewSale);
  const [installmentConfig, setInstallmentConfig] = useState(defaultInstallmentConfig);

  // Integrar Auto-Save (somente para novas vendas)
  const { isSaving, lastSaved } = useAutoSave({
    key: DRAFT_KEY,
    data: !editingSale && isModalOpen ? { newSale, installmentConfig } : null,
    debounceMs: 2000
  });

  // Verificar rascunho ao carregar (RestauraÃƒÂ§ÃƒÂ£o AutomÃƒÂ¡tica e Silenciosa)
  useEffect(() => {
    if (!editingSale) {
      const draft = loadDraft<{ newSale: Partial<Sale>; installmentConfig: any }>(DRAFT_KEY);
      if (draft && draft.newSale && (draft.newSale.property_address || draft.newSale.buyer_name || draft.newSale.vgv)) {
        setNewSale(draft.newSale);
        setInstallmentConfig(draft.installmentConfig);
        setIsModalOpen(true); // Reabre a tela exatamente como estava
      }
    }
  }, []);

  const { sanitizeForm } = useSanitize();


  // Limpa o formulário sem fechar o modal
  const resetFormKeepOpen = () => {
    setEditingSale(null);
    setNewSale(defaultNewSale);
    setInstallmentConfig(defaultInstallmentConfig);
    setCurrentSplit({ brokerId: '', percentage: 100 });
    clearDraft(DRAFT_KEY);
    setSaveFeedback(true);
    setTimeout(() => setSaveFeedback(false), 3000);
  };

  const generateInstallments = () => {
    const count = Number(installmentConfig.count);
    if (count <= 0) return;

    const vgv = Number(newSale.vgv) || 0;
    const valuePerInstallment = round2(vgv / count);

    // Calcular a diferença para a última parcela bater o total exato
    const sumOthers = valuePerInstallment * (count - 1);
    const lastValue = round2(vgv - sumOthers);

    const newInstallments = Array.from({ length: count }).map((_, index) => {
      const date = new Date(installmentConfig.firstDate + 'T12:00:00');
      date.setMonth(date.getMonth() + index);

      const isLast = index === count - 1;

      return {
        installment_number: index + 1,
        due_date: date.toISOString().split('T')[0],
        value: isLast ? lastValue : valuePerInstallment,
        status: 'PENDING' as const
      };
    });

    setNewSale(prev => ({ ...prev, installments: newInstallments }));
  };


  const [currentSplit, setCurrentSplit] = useState<{ brokerId: string; percentage: number }>({
    brokerId: '',
    percentage: 100
  });

  React.useEffect(() => {
    const vgv = Number(newSale.vgv) || 0;
    const commPerc = Number(newSale.commission_percentage) || 0;
    const totalComm = round2((vgv * commPerc) / 100);

    setNewSale(prev => {
      const currentSplits = prev.splits || [];
      const updatedSplits = currentSplits.map(split => ({
        ...split,
        calculated_value: round2((totalComm * split.percentage) / 100)
      }));

      return {
        ...prev,
        total_commission_value: totalComm,
        splits: updatedSplits
      };
    });
  }, [newSale.vgv, newSale.commission_percentage]);


  const handleAddSplit = () => {
    if (!currentSplit.brokerId) return;

    let brokerName = "";
    let brokerId = currentSplit.brokerId;

    if (brokerId === "AGENCY") {
      brokerName = "Agência (Imobiliária)";
    } else {
      const broker = team.find(u => u.id === brokerId);
      if (!broker) return;
      brokerName = broker.name;
    }

    const vgv = Number(newSale.vgv) || 0;
    const totalComm = (vgv * (Number(newSale.commission_percentage) || 0)) / 100;
    const splitValue = (totalComm * currentSplit.percentage) / 100;

    const newSplit: BrokerSplit = {
      id: `temp-${Date.now()}`,
      broker_id: brokerId === "AGENCY" ? null : brokerId,
      broker_name: brokerName,
      percentage: currentSplit.percentage,
      calculated_value: splitValue,
      status: CommissionStatus.PENDING
    };

    setNewSale(prev => ({
      ...prev,
      splits: [...(prev.splits || []), newSplit]
    }));

    // Reset current split with remaining percentage
    const nextTotal = (newSale.splits?.reduce((a, b) => a + b.percentage, 0) || 0) + currentSplit.percentage;
    const remaining = Math.max(0, 100 - nextTotal);
    
    setCurrentSplit({ 
      brokerId: '', 
      percentage: remaining > 0 ? remaining : 100 
    });
  };

  const handleSmartSplit = () => {
    const currentTotal = newSale.splits?.reduce((a, b) => a + b.percentage, 0) || 0;
    const remaining = 100 - currentTotal;
    if (remaining <= 0) return;

    const vgv = Number(newSale.vgv) || 0;
    const totalComm = (vgv * (Number(newSale.commission_percentage) || 0)) / 100;
    const splitValue = (totalComm * remaining) / 100;

    const agencySplit: BrokerSplit = {
      id: `temp-agency-${Date.now()}`,
      broker_id: null,
      broker_name: "Agência (Imobiliária)",
      percentage: remaining,
      calculated_value: splitValue,
      status: CommissionStatus.PENDING
    };

    setNewSale(prev => ({
      ...prev,
      splits: [...(prev.splits || []), agencySplit]
    }));
    setCurrentSplit({ brokerId: '', percentage: 0 });
  };


  const handleSaveSale = async () => {
    if (!newSale.property_address || !newSale.vgv) {
      alert("Por favor, preencha o endereço e o valor da venda.");
      return;
    }

    const vgv = Number(newSale.vgv) || 0;
    const commPerc = Number(newSale.commission_percentage) || 0;
    const totalComm = (vgv * commPerc) / 100;

    try {
      const sanitized = sanitizeForm(newSale);

      if (editingSale) {
        // Atualizar venda existente
        const { supabase } = await import('../src/lib/supabaseClient');
        await supabase
          .from('sales')
          .update({
            sale_date: sanitized.sale_date,
            property_address: sanitized.property_address,
            buyer_name: sanitized.buyer_name,
            buyer_cpf: sanitized.buyer_cpf,
            seller_name: sanitized.seller_name,
            seller_cpf: sanitized.seller_cpf,
            vgv: vgv,
            commission_percentage: commPerc,
            total_commission_value: totalComm,
            invoice_issued: sanitized.invoice_issued || false,
            invoice_number: sanitized.invoice_number || '',
            notes: sanitized.notes,
            is_installment: sanitized.is_installment || false,
            installments: sanitized.installments || [],
            client_contact_id: newSale.client_contact_id || null,
            seller_contact_id: newSale.seller_contact_id || null,
          })
          .eq('id', editingSale.id);

        // Recarregar dados
        if (onRefetch) onRefetch();
      } else {
        // Criar nova venda
        const { supabase } = await import('../src/lib/supabaseClient');
        const { data: saleData, error: saleError } = await supabase
          .from('sales')
          .insert([{
            agency_id: currentUser.agency_id,
            sale_date: sanitized.sale_date,
            property_address: sanitized.property_address,
            buyer_name: sanitized.buyer_name,
            buyer_cpf: sanitized.buyer_cpf,
            seller_name: sanitized.seller_name,
            seller_cpf: sanitized.seller_cpf,
            vgv: vgv,
            commission_percentage: commPerc || 0,
            total_commission_value: totalComm,
            invoice_issued: sanitized.invoice_issued || false,
            invoice_number: sanitized.invoice_number || '',
            notes: sanitized.notes,
            is_installment: sanitized.is_installment || false,
            installments: sanitized.installments || [],
            client_contact_id: newSale.client_contact_id || null,
            seller_contact_id: newSale.seller_contact_id || null,
          }])
          .select()
          .single();

        if (saleError) throw saleError;

        // Criar splits se houver
        if (newSale.splits && newSale.splits.length > 0 && saleData) {
          let splitsToInsert: any[] = [];

          if (newSale.is_installment && newSale.installments && newSale.installments.length > 0) {
            // Se for parcelado, gerar um split para cada parcela
            newSale.splits.forEach(split => {
              newSale.installments!.forEach(inst => {
                splitsToInsert.push({
                  sale_id: saleData.id,
                  broker_id: split.broker_id,
                  broker_name: split.broker_name,
                  percentage: split.percentage,
                  calculated_value: split.calculated_value / newSale.installments!.length, // Valor dividido
                  status: CommissionStatus.PENDING,
                  forecast_date: inst.due_date, // Data da parcela
                  installment_number: inst.installment_number,
                  total_installments: newSale.installments!.length
                });
              });
            });
          } else {
            // Se não for parcelado, mantém como está
            splitsToInsert = newSale.splits.map(split => ({
              sale_id: saleData.id,
              broker_id: split.broker_id,
              broker_name: split.broker_name,
              percentage: split.percentage,
              calculated_value: split.calculated_value,
              status: split.status,
              forecast_date: split.forecast_date
            }));
          }

          // @ts-ignore
          const { error: splitError } = await supabase
            .from('broker_splits')
            .insert(splitsToInsert);

          if (splitError) {
            console.error('Erro ao salvar rateios:', splitError);
            // Se falhou o rateio, a venda ficou "órfã". 
            // Poderíamos tentar deletar a venda aqui, mas por enquanto vamos avisar o erro crítico.
            throw new Error(`A venda foi criada mas houve um erro ao salvar o rateio de comissões: ${splitError.message}`);
          }
        }

        // Recarregar dados
        if (onRefetch) onRefetch();
      }

      // Fechar o modal após salvar (nova venda ou edição) e mostrar a lista atualizada.
      closeModal();
    } catch (error) {
      // Fallback para desenvolvimento se o backend falhar
      if (process.env.NODE_ENV === 'development') {
        console.warn("Using local state fallback due to backend error");

        let fallbackSplits: BrokerSplit[] = [];

        if (newSale.is_installment && newSale.installments && newSale.installments.length > 0 && newSale.splits) {
          newSale.splits.forEach(split => {
            newSale.installments!.forEach(inst => {
              fallbackSplits.push({
                ...split,
                calculated_value: split.calculated_value / newSale.installments!.length,
                status: CommissionStatus.PENDING,
                forecast_date: inst.due_date,
                installment_number: inst.installment_number,
                total_installments: newSale.installments!.length
              });
            });
          });
        } else {
          fallbackSplits = newSale.splits!.map(s => ({ ...s, status: s.status || CommissionStatus.PENDING }));
        }

        const fallbackSale: Sale = {
          id: editingSale ? editingSale.id : `local-${Date.now()}`,
          agency_id: currentUser.agency_id,
          sale_date: newSale.sale_date!,
          property_address: newSale.property_address!,
          buyer_name: newSale.buyer_name || 'Não informado',
          buyer_cpf: newSale.buyer_cpf || '',
          seller_name: newSale.seller_name || 'Não informado',
          seller_cpf: newSale.seller_cpf || '',
          vgv,

          commission_percentage: commPerc,
          total_commission_value: totalComm,
          invoice_issued: newSale.invoice_issued || false,
          invoice_number: newSale.invoice_number || '',
          notes: newSale.notes,
          is_installment: newSale.is_installment || false,
          installments: newSale.installments || [],
          splits: fallbackSplits
        };

        if (editingSale) {
          setSales(prev => prev.map(s => s.id === editingSale.id ? fallbackSale : s));
        } else {
          setSales(prev => [fallbackSale, ...prev]);
        }
        closeModal();
        alert("Venda salva localmente (Erro no servidor/banco) - Verifique o console para detalhes.");
        return;
      }

      console.error('Erro ao salvar venda:', error);
      const errorMsg = error instanceof Error ? error.message :
        (typeof error === 'object' && error !== null && 'message' in error) ? (error as any).message :
          JSON.stringify(error);
      alert(`Erro ao salvar venda no banco de dados: ${errorMsg}\n\nA venda serÃƒÂ¡ mantida apenas temporariamente no seu navegador.`);
    }
  };

  const openEditModal = (sale: Sale) => {
    setEditingSale(sale);

    // Consolidar splits por corretor para edição (agrupar parcelas)
    const uniqueSplitsMap = new Map<string, BrokerSplit>();

    if (sale.splits) {
      sale.splits.forEach(split => {
        if (uniqueSplitsMap.has(split.broker_id)) {
          const existing = uniqueSplitsMap.get(split.broker_id)!;
          existing.calculated_value += split.calculated_value;
        } else {
          // Criar cÃƒÂ³pia para não mutar o original
          uniqueSplitsMap.set(split.broker_id, { ...split });
        }
      });
    }

    const consolidatedSplits = Array.from(uniqueSplitsMap.values());

    // Configurar estado de parcelas
    const installments = sale.installments || [];
    const isInstallment = sale.is_installment || (installments.length > 0);

    setInstallmentConfig({
      count: installments.length > 0 ? installments.length : 1,
      firstDate: installments.length > 0 ? installments[0].due_date : new Date().toISOString().split('T')[0]
    });

    setNewSale({
      ...sale,
      splits: consolidatedSplits.map(s => ({ ...s, status: s.status || CommissionStatus.PENDING })),
      is_installment: isInstallment,
      installments: installments
    });

    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingSale(null);
    setNewSale(defaultNewSale);
    setInstallmentConfig(defaultInstallmentConfig);
    // Limpar rascunho ao fechar/salvar
    localStorage.removeItem(DRAFT_KEY);
  };


  const confirmDeleteSale = async () => {
    if (saleToDelete) {
      try {
        const { supabase } = await import('../src/lib/supabaseClient');
        await supabase
          .from('sales')
          .delete()
          .eq('id', saleToDelete);

        // Recarregar dados
        if (onRefetch) onRefetch();
        setSaleToDelete(null);
      } catch (error) {
        console.error('Erro ao deletar venda:', error);
        alert('Erro ao deletar venda: ' + (error instanceof Error ? error.message : JSON.stringify(error)));
      }
    }
  };

  const handleDistrato = async (sale: Sale) => {
    console.log('Distrato clicked for sale:', sale.id);

    // VerificaÃƒÂ§ÃƒÂ£o de ID local
    if (sale.id.startsWith('local-')) {
      if (confirm('ATENÃƒâ€¡ÃƒÆ’O: Esta venda ÃƒÂ© local (não salva no banco). \n\nDeseja REMOVÃƒÅ -LA definitivamente?\n\nIsso apagarÃƒÂ¡ a venda e todas as comissões associadas da sua tela. Essa aÃƒÂ§ÃƒÂ£o não pode ser desfeita.')) {
        setSales(prev => prev.filter(s => s.id !== sale.id));
        alert('Venda local removida.');
      }
      return;
    }

    if (confirm(`Deseja marcar a venda do imóvel em ${sale.property_address} como Distrato? Isso cancelarÃƒÂ¡ TODAS as comissões vinculadas (pagas e pendentes).`)) {
      try {
        console.log('User confirmed distrato');
        const { supabase } = await import('../src/lib/supabaseClient');

        // 1. Atualizar status da venda para CANCELED
        console.log('Updating sale status to CANCELED...');
        const { error: saleError } = await supabase
          .from('sales')
          .update({ status: SaleStatus.CANCELED })
          .eq('id', sale.id);

        if (saleError) throw saleError;
        console.log('Sale status updated successfully');

        // 2. Marcar TODAS as comissões desta venda como CANCELED (incluindo pagas)
        console.log('Updating commission statuses to CANCELED...');
        const { error: commissionsError } = await supabase
          .from('broker_splits')
          .update({ status: CommissionStatus.CANCELED })
          .eq('sale_id', sale.id);

        if (commissionsError) throw commissionsError;
        console.log('Commission statuses updated successfully');

        // 3. Refetch data
        console.log('Refetching data...');
        if (onRefetch) {
          await onRefetch();
          console.log('Data refetched successfully');
        } else {
          console.warn('No onRefetch function provided');
        }

        alert('Distrato realizado com sucesso! Venda e comissões canceladas.');
      } catch (error) {
        console.error('Erro ao realizar distrato:', error);
        alert(`Erro ao processar distrato: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
      }
    } else {
      console.log('User canceled distrato');
    }
  };

  const openAuditModal = async (sale: Sale) => {
    setSelectedSaleForAudit(sale);
    setIsAuditModalOpen(true);
    setLoadingAudit(true);
    try {
      const { supabase } = await import('../src/lib/supabaseClient');
      const { data, error } = await supabase
        .from('sales_audit_log')
        .select('*')
        .eq('sale_id', sale.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAuditLogs(data || []);
    } catch (error) {
      console.error('Error fetching audit logs:', error);
    } finally {
      setLoadingAudit(false);
    }
  };

  const handleExportCSV = () => {
    const headers = [
      "Data Venda",
      "Comprador",
      "CPF/CNPJ Comprador",
      "Vendedor",
      "CPF/CNPJ Vendedor",
      "EndereÃƒÂ§o ImÃƒÂ³vel",
      "Nota Fiscal",
      "VGV",
      "Comissão Total"
    ];


    const rows = filteredSales.map(s => {
      return [
        s.sale_date ? new Date(s.sale_date).toLocaleDateString('pt-BR') : "",
        s.buyer_name || "",
        s.buyer_cpf || "",
        s.seller_name || "",
        s.seller_cpf || "",
        s.property_address ? s.property_address.replace(/,/g, ' ').replace(/\n/g, ' ') : "",
        s.invoice_number || "Não Emitida",
        formatCurrency(s.vgv).replace("R$\u00a0", ""),
        formatCurrency(s.total_commission_value || 0).replace("R$\u00a0", "")
      ];
    });



    const csvContent = "\uFEFF" + headers.join(";") + "\n" + rows.map(r => r.join(";")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `vendas_contabilidade_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };


  return (
    <div className="space-y-6 page-transition">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="header-title">Controle de Vendas <span className="text-[10px] bg-emerald-100 text-emerald-600 px-2 py-0.5 rounded-full ml-2 align-middle">v2.2</span></h1>
          <p className="header-subtitle">Visualize e gerencie todos os contratos e rateios</p>
        </div>
      </div>
      {/* M3 KPI Header Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-m3-surface-container-low p-6 rounded-[24px] border border-m3-outline-variant/30 flex items-center gap-4 hover:shadow-md transition-shadow">
          <div className="w-12 h-12 bg-m3-primary-container text-m3-on-primary-container rounded-2xl flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-2xl">home</span>
          </div>
          <div>
            <p className="text-xs font-bold text-m3-on-surface-variant uppercase tracking-widest mb-1">Comissões Imobiliária</p>
            <p className="text-xl font-black text-m3-on-surface">{formatCurrency(kpis.agencyComm)}</p>
          </div>
        </div>

        <div className="bg-m3-surface-container-low p-6 rounded-[24px] border border-m3-outline-variant/30 flex items-center gap-4 hover:shadow-md transition-shadow">
          <div className="w-12 h-12 bg-m3-secondary-container text-m3-on-secondary-container rounded-2xl flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-2xl">payments</span>
          </div>
          <div>
            <p className="text-xs font-bold text-m3-on-surface-variant uppercase tracking-widest mb-1">Comissão Total Gerada</p>
            <p className="text-xl font-black text-m3-on-surface">{formatCurrency(kpis.totalComm)}</p>
          </div>
        </div>

        <div className="bg-m3-surface-container-low p-6 rounded-[24px] border border-m3-outline-variant/30 flex items-center gap-4 hover:shadow-md transition-shadow">
          <div className="w-12 h-12 bg-m3-error-container text-m3-on-error-container rounded-2xl flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-2xl">receipt_long</span>
          </div>
          <div>
            <p className="text-xs font-bold text-m3-on-surface-variant uppercase tracking-widest mb-1">Vendas sem Nota</p>
            <p className="text-xl font-black text-m3-error">{kpis.salesWithoutInvoice}</p>
          </div>
        </div>

        <div className="bg-m3-surface-container-low p-6 rounded-[24px] border border-m3-outline-variant/30 flex items-center gap-4 hover:shadow-md transition-shadow">
          <div className="w-12 h-12 bg-m3-tertiary-container text-m3-on-tertiary-container rounded-2xl flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-2xl">shopping_cart</span>
          </div>
          <div>
            <p className="text-xs font-bold text-m3-on-surface-variant uppercase tracking-widest mb-1">Vendas Totais</p>
            <p className="text-xl font-black text-m3-on-surface">{kpis.count}</p>
          </div>
        </div>
      </div>




      {/* M3 Control Bar & Filters */}
      <div className="bg-m3-surface-container-low p-4 rounded-[28px] border border-m3-outline-variant shadow-sm mb-6">
        <div className="flex flex-col xl:flex-row items-stretch xl:items-center gap-4">
          
          {/* Search Field */}
          <div className="flex-1 relative group">
            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-m3-on-surface-variant group-focus-within:text-m3-primary transition-colors">search</span>
            <input
              type="text"
              placeholder="Buscar por imóvel, cliente ou vendedor..."
              className="w-full pl-12 pr-4 py-3 bg-white border border-m3-outline-variant rounded-2xl focus:ring-2 focus:ring-m3-primary/20 focus:border-m3-primary outline-none transition-all text-sm font-medium text-m3-on-surface"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Client Filter Selector */}
            {clientContacts.length > 0 && (
              <div className="flex items-center bg-white border border-m3-outline-variant rounded-2xl px-3 group focus-within:border-m3-primary transition-colors">
                <span className="material-symbols-outlined text-m3-on-surface-variant group-focus-within:text-m3-primary text-lg">person</span>
                <select
                  value={filterContactId}
                  onChange={(e) => setFilterContactId(e.target.value)}
                  className="bg-transparent text-sm font-bold text-m3-on-surface-variant px-2 py-3 outline-none cursor-pointer max-w-[180px]"
                >
                  <option value="">Todos os clientes</option>
                  {clientContacts.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
                {filterContactId && (
                  <button
                    type="button"
                    onClick={() => setFilterContactId('')}
                    className="text-m3-on-surface-variant hover:text-red-500 p-1 rounded-full transition-colors leading-none"
                  >
                    <span className="material-symbols-outlined text-sm">close</span>
                  </button>
                )}
              </div>
            )}

            {/* Period Selector */}
            <div className="flex items-center bg-white border border-m3-outline-variant rounded-2xl px-3 group focus-within:border-m3-primary transition-colors">
              <span className="material-symbols-outlined text-m3-on-surface-variant group-focus-within:text-m3-primary text-lg">calendar_month</span>
              <select
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                className="bg-transparent text-sm font-bold text-m3-on-surface-variant px-2 py-3 outline-none cursor-pointer"
              >
                <option value="all">Período Total</option>
                <option value="month">Este Mês</option>
                <option value="quarter">Este Trimestre</option>
                <option value="year">Este Ano</option>
                <option value="custom">Datas Customizadas</option>
              </select>
            </div>

            {/* Export CSV Button */}
            <button
              onClick={handleExportCSV}
              className="p-3 bg-white border border-m3-outline-variant rounded-2xl text-m3-on-surface-variant hover:bg-m3-primary/5 hover:text-m3-primary transition-all flex items-center justify-center shadow-sm"
              title="Exportar Listados"
            >
              <span className="material-symbols-outlined">download</span>
            </button>

            {/* New Sale Button */}
            <button
              onClick={() => setIsModalOpen(true)}
              className="bg-m3-primary text-white px-6 py-3 rounded-2xl font-bold flex items-center justify-center gap-2 hover:brightness-110 active:scale-95 transition-all shadow-lg shadow-m3-primary/20"
            >
              <span className="material-symbols-outlined">add</span>
              Nova Venda
            </button>
          </div>
        </div>

        {/* Custom Range Pop-down */}
        {period === 'custom' && (
          <div className="mt-4 flex items-center gap-4 bg-white p-4 rounded-2xl border border-m3-outline-variant animate-in slide-in-from-top-2 duration-300">
            <div className="flex items-center gap-2">
              <label className="text-[10px] font-bold text-m3-on-surface-variant uppercase tracking-widest">Início:</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-m3-surface-container-low text-xs font-bold text-m3-on-surface px-3 py-2 rounded-xl border border-m3-outline-variant outline-none focus:ring-2 focus:ring-m3-primary"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-[10px] font-bold text-m3-on-surface-variant uppercase tracking-widest">Fim:</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-m3-surface-container-low text-xs font-bold text-m3-on-surface px-3 py-2 rounded-xl border border-m3-outline-variant outline-none focus:ring-2 focus:ring-m3-primary"
              />
            </div>
          </div>
        )}
      </div>

      {/* Toggles / Quick Filters */}
      <div className="flex flex-wrap items-center gap-6 mb-6 px-2">
        <label className="flex items-center gap-3 cursor-pointer group">
          <div className="relative inline-flex items-center cursor-pointer">
            <input 
              type="checkbox" 
              className="sr-only peer" 
              checked={onlyInstallments}
              onChange={(e) => setOnlyInstallments(e.target.checked)}
            />
            <div className="w-10 h-5 bg-m3-outline-variant peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-m3-primary"></div>
          </div>
          <span className={`text-sm font-bold transition-all ${onlyInstallments ? 'text-m3-primary' : 'text-m3-on-surface-variant group-hover:text-m3-on-surface'}`}>
            Apenas parceladas
          </span>
        </label>

        <label className="flex items-center gap-3 cursor-pointer group">
          <div className="relative inline-flex items-center cursor-pointer">
            <input 
              type="checkbox" 
              className="sr-only peer" 
              checked={showCanceledSales}
              onChange={(e) => setShowCanceledSales(e.target.checked)}
            />
            <div className="w-10 h-5 bg-m3-outline-variant peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-m3-error"></div>
          </div>
          <span className={`text-sm font-bold transition-all ${showCanceledSales ? 'text-m3-error' : 'text-m3-on-surface-variant group-hover:text-m3-on-surface'}`}>
            Exibir canceladas / distratos
          </span>
        </label>
      </div>



      {/* Sales Table */}
      <div className="bg-m3-surface-container-low rounded-[28px] border border-m3-outline-variant/30 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-m3-surface-container text-[11px] font-black text-m3-on-surface-variant uppercase tracking-[0.15em] border-b border-m3-outline-variant/20">
                <th className="px-8 py-5 text-left">Data</th>
                <th className="px-8 py-5 text-left">Imóvel</th>
                <th className="px-6 py-5 text-left">Cliente</th>
                <th className="px-6 py-5 text-left">Vendedor</th>
                <th className="px-6 py-5 text-left">VGV</th>
                <th className="px-6 py-5 text-left text-center">Parcelas</th>
                <th className="px-6 py-5 text-left text-center">NF</th>
                <th className="px-8 py-5 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredSales.map(sale => (
                <tr
                  key={sale.id}
                  className={`transition-colors group ${sale.status === SaleStatus.CANCELED
                    ? 'bg-slate-50/80 hover:bg-slate-100/80 opacity-60'
                    : 'hover:bg-slate-50/50'
                    }`}
                >
                  <td className={`px-10 py-8 text-sm font-medium ${sale.status === SaleStatus.CANCELED ? 'text-slate-400 line-through' : 'text-slate-500'
                    }`}>
                    {new Date(sale.sale_date).toLocaleDateString('pt-BR')}
                  </td>
                  <td className="px-10 py-8">
                    <span className={`text-[14px] font-bold block leading-tight ${sale.status === SaleStatus.CANCELED ? 'text-slate-400 line-through' : 'text-slate-800'
                      }`}>
                      {sale.property_address}
                    </span>
                  </td>
                  <td className="px-6 py-8">
                    <div className="flex flex-col">
                      <span className={`text-sm font-medium ${sale.status === SaleStatus.CANCELED ? 'text-slate-400' : 'text-slate-600'}`}>
                        {sale.client_contact_id
                          ? (contactNameMap.get(sale.client_contact_id) || sale.buyer_name || '-')
                          : (sale.buyer_name || '-')}
                      </span>
                      {sale.client_contact_id && (
                        <span className="text-[9px] text-blue-400 font-black uppercase tracking-widest mt-0.5">Contato vinculado</span>
                      )}
                      {!sale.client_contact_id && sale.buyer_cpf && (
                        <span className="text-[10px] text-slate-400 font-bold font-mono mt-1">
                          {maskCPF(sale.buyer_cpf)}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-8">
                    <div className="flex flex-col">
                      <span className={`text-sm font-medium ${sale.status === SaleStatus.CANCELED ? 'text-slate-400' : 'text-slate-600'}`}>
                        {sale.seller_contact_id
                          ? (contactNameMap.get(sale.seller_contact_id) || sale.seller_name || '-')
                          : (sale.seller_name || '-')}
                      </span>
                      {sale.seller_contact_id && (
                        <span className="text-[9px] text-blue-400 font-black uppercase tracking-widest mt-0.5">Contato vinculado</span>
                      )}
                      {sale.seller_cpf && (
                        <span className="text-[10px] text-slate-400 font-bold font-mono mt-1">
                          {maskCPF(sale.seller_cpf)}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-8">
                    <span className={`text-[14px] font-bold ${sale.status === SaleStatus.CANCELED ? 'text-slate-400 line-through' : 'text-slate-800'
                      }`}>
                      {formatCurrency(sale.vgv)}
                    </span>
                  </td>
                  <td className="px-6 py-8">
                    {sale.is_installment && sale.installments && sale.installments.length > 0 ? (
                      <div className="flex flex-col">
                        <span className={`text-xs font-bold px-2 py-1 rounded-lg w-fit mb-1 ${sale.status === SaleStatus.CANCELED
                          ? 'text-slate-400 bg-slate-100'
                          : 'text-blue-600 bg-blue-50'
                          }`}>
                          {sale.installments.length}x
                        </span>
                        <span className="text-[10px] text-slate-400 font-medium">
                          Próx: {new Date(sale.installments.find(i => i.status === 'PENDING')?.due_date || sale.installments[sale.installments.length - 1].due_date).toLocaleDateString('pt-BR')}
                        </span>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400 font-medium ml-2">-</span>
                    )}
                  </td>
                  <td className="px-6 py-5 text-center">
                    {sale.invoice_issued ? (
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${sale.status === SaleStatus.CANCELED
                        ? 'bg-m3-surface-container text-m3-on-surface-variant border-m3-outline-variant/30'
                        : 'bg-m3-primary-container text-m3-on-primary-container border-m3-primary/10'
                        }`}>
                        <span className="material-symbols-outlined text-sm">fact_check</span> {sale.invoice_number ? `NF: ${sale.invoice_number}` : 'Sim'}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 bg-m3-surface-container-low text-m3-on-surface-variant px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border border-m3-outline-variant/20">
                        <span className="material-symbols-outlined text-sm">event_busy</span> Não
                      </span>
                    )}
                  </td>
                  <td className="px-8 py-5 text-right flex items-center justify-end gap-3 font-medium">
                    <div className="flex items-center gap-1 bg-white p-1 rounded-2xl border border-m3-outline-variant/20 shadow-sm">
                      {sale.status === SaleStatus.CANCELED && (
                        <span className="text-[10px] font-black text-m3-error uppercase tracking-widest px-2 mr-1 bg-m3-error-container/20 rounded-lg py-1">Cancelada</span>
                      )}

                      <button
                        onClick={() => openEditModal(sale)}
                        className="p-2 text-m3-on-surface-variant hover:text-m3-primary hover:bg-m3-primary/10 rounded-xl transition-all"
                        title="Editar Venda"
                      >
                        <span className="material-symbols-outlined text-lg">edit</span>
                      </button>

                      {sale.status !== SaleStatus.CANCELED ? (
                        <button
                          onClick={() => handleDistrato(sale)}
                          className="p-2 text-m3-on-surface-variant hover:text-m3-error hover:bg-m3-error-container/20 rounded-xl transition-all"
                          title="Fazer Distrato (Venda Caída)"
                        >
                          <span className="material-symbols-outlined text-lg">block</span>
                        </button>
                      ) : (
                        <button
                          onClick={async () => {
                            if (confirm("Deseja reativar esta venda?")) {
                              const { supabase } = await import('../src/lib/supabaseClient');
                              await supabase.from('sales').update({ status: SaleStatus.ACTIVE }).eq('id', sale.id);
                              if (onRefetch) onRefetch();
                            }
                          }}
                          className="p-2 text-m3-primary hover:bg-m3-primary/10 rounded-xl transition-all"
                          title="Reativar Venda"
                        >
                          <span className="material-symbols-outlined text-lg">check_circle</span>
                        </button>
                      )}

                      <button
                        onClick={() => setSaleToDelete(sale.id)}
                        className="p-2 text-m3-on-surface-variant hover:text-m3-error hover:bg-m3-error-container/20 rounded-xl transition-all"
                        title="Excluir Permanentemente"
                      >
                        <span className="material-symbols-outlined text-lg">delete</span>
                      </button>

                      <button
                        onClick={() => openAuditModal(sale)}
                        className="p-2 text-m3-on-surface-variant hover:text-m3-tertiary hover:bg-m3-tertiary-container/30 rounded-xl transition-all"
                        title="Ver Histórico de Alterações"
                      >
                        <span className="material-symbols-outlined text-lg">history</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredSales.length === 0 && (
            <div className="p-24 text-center text-slate-300">
              <ShoppingCart className="mx-auto mb-4 opacity-10" size={64} />
              <p className="font-medium text-slate-400">Nenhuma venda encontrada para os filtros aplicados</p>
            </div>
          )}
        </div>
      </div>

      {/* Modal de Confirmação de Exclusão */}
      {
        saleToDelete && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white/90 backdrop-blur-2xl border border-white/50 w-full max-w-sm rounded-[32px] shadow-2xl overflow-hidden animate-in zoom-in duration-300">
              <div className="p-8 text-center bg-transparent">
                <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
                  <AlertCircle size={32} />
                </div>
                <h3 className="text-xl font-bold text-slate-800 mb-2">Excluir Venda?</h3>
                <p className="text-slate-500 text-sm">
                  Esta ação é irreversível. Todos os rateios e comissões associados a esta venda serão removidos permanentemente.
                </p>
              </div>
              <div className="p-6 bg-slate-50 flex gap-3">
                <button
                  onClick={() => setSaleToDelete(null)}
                  className="flex-1 px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-600 font-bold hover:bg-slate-100 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmDeleteSale}
                  className="flex-1 px-4 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-all shadow-lg shadow-red-100"
                >
                  Excluir Venda
                </button>
              </div>
            </div>
          </div>
        )
      }

      {isModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-m3-surface w-full max-w-6xl rounded-[32px] shadow-2xl overflow-hidden flex flex-col max-h-[95vh] animate-in zoom-in duration-300">
            
            {/* Top Bar / Header */}
            <header className="flex justify-between items-center px-8 h-16 bg-white border-b border-m3-outline-variant shrink-0">
              <div className="flex items-center gap-4">
                <button onClick={closeModal} className="text-m3-primary hover:bg-m3-primary/5 p-2 rounded-full transition-colors flex items-center gap-2">
                  <span className="material-symbols-outlined text-xl">arrow_back</span>
                  <span className="text-sm font-medium">Voltar para Vendas</span>
                </button>
              </div>
              <div className="flex items-center gap-4">
                <AutoSaveIndicator isSaving={isSaving} lastSaved={lastSaved} />
                <button onClick={closeModal} className="text-m3-on-surface-variant hover:bg-m3-surface-variant p-2 rounded-full transition-colors leading-none">
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>
            </header>

            <div className="flex-1 overflow-y-auto p-8 lg:p-12">
              <div className="max-w-5xl mx-auto">
                <div className="mb-10">
                  <h1 className="text-3xl font-extrabold text-m3-on-surface tracking-tight">
                    {editingSale ? 'Editar Venda' : 'Nova Venda'}
                  </h1>
                  <p className="text-m3-on-surface-variant text-lg">Cadastre os detalhes do imóvel e o rateio de comissões.</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                  {/* Left Column: Basic Info & Participants */}
                  <div className="lg:col-span-7 space-y-6">
                    
                    {/* Card: Informações Básicas */}
                    <section className="bg-m3-surface-container-low p-6 rounded-2xl border border-m3-outline-variant shadow-sm">
                      <div className="flex items-center gap-2 mb-6 text-m3-primary">
                        <span className="material-symbols-outlined">info</span>
                        <h3 className="font-bold text-lg">Informações Básicas</h3>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="md:col-span-2">
                          <label className="block text-sm font-semibold mb-1 text-m3-on-surface-variant">Imóvel (Endereço / Unidade)</label>
                          <input 
                            type="text"
                            value={newSale.property_address || ''}
                            placeholder="Ex: Edifício Aurora, Apto 402"
                            className="w-full bg-white border border-m3-outline-variant rounded-xl focus:ring-2 focus:ring-m3-primary focus:border-m3-primary outline-none px-4 py-2.5 text-sm font-medium"
                            onChange={e => setNewSale({ ...newSale, property_address: e.target.value })}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-semibold mb-1 text-m3-on-surface-variant">VGV (Valor de Venda)</label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-m3-on-surface-variant font-bold">R$</span>
                            <input 
                              type="text"
                              value={new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2 }).format(newSale.vgv || 0)}
                              placeholder="0,00"
                              className="w-full pl-10 pr-5 bg-white border border-m3-outline-variant rounded-xl focus:ring-2 focus:ring-m3-primary focus:border-m3-primary text-right px-4 py-2.5 font-black text-m3-on-surface"
                              onChange={e => {
                                const val = e.target.value.replace(/\D/g, '');
                                setNewSale({ ...newSale, vgv: Number(val) / 100 });
                              }}
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-sm font-semibold mb-1 text-m3-on-surface-variant">% Comissão</label>
                            <input 
                              type="number"
                              value={newSale.commission_percentage || 6}
                              placeholder="6.0"
                              className="w-full bg-white border border-m3-outline-variant rounded-xl focus:ring-2 focus:ring-m3-primary focus:border-m3-primary px-4 py-2.5 text-sm font-black"
                              onChange={e => setNewSale({ ...newSale, commission_percentage: Number(e.target.value) })}
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-semibold mb-1 text-m3-on-surface-variant">Data</label>
                            <input 
                              type="date"
                              value={newSale.sale_date}
                              className="w-full bg-white border border-m3-outline-variant rounded-xl focus:ring-2 focus:ring-m3-primary focus:border-m3-primary px-4 py-2.5 text-sm font-medium"
                              onChange={e => setNewSale({ ...newSale, sale_date: e.target.value })}
                            />
                          </div>
                        </div>
                      </div>
                    </section>

                    {/* Card: Participantes e Configurações */}
                    <section className="bg-m3-surface-container-low p-6 rounded-2xl border border-m3-outline-variant shadow-sm">
                      <div className="flex items-center gap-2 mb-6 text-m3-primary">
                        <span className="material-symbols-outlined">group_add</span>
                        <h3 className="font-bold text-lg">Participantes e Configurações</h3>
                      </div>
                      <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {/* Comprador */}
                          <div className="space-y-2">
                            <label className="block text-sm font-semibold text-m3-on-surface-variant">Cliente Comprador</label>
                            <SearchableContactSelect
                              value={newSale.client_contact_id || null}
                              onChange={(id, name) => {
                                const contact = contacts.find(c => c.id === id);
                                setNewSale({ 
                                  ...newSale, 
                                  client_contact_id: id, 
                                  buyer_name: name || '',
                                  buyer_cpf: contact?.document || newSale.buyer_cpf || '' 
                                });
                              }}
                              onSaveNew={async (name) => {
                                const newContact = await addContact({ name, type: 'CLIENT', is_active: true });
                                return newContact;
                              }}
                              contacts={contacts}
                              placeholder="Buscar comprador..."
                            />
                            <input
                              type="text"
                              value={newSale.buyer_cpf || ''}
                              placeholder="Documento (CPF/CNPJ)"
                              className="w-full px-4 py-2 bg-white border border-m3-outline-variant rounded-xl text-xs font-semibold"
                              maxLength={18}
                              onChange={e => setNewSale({ ...newSale, buyer_cpf: formatCpfCnpjInput(e.target.value) })}
                            />
                          </div>
                          {/* Vendedor */}
                          <div className="space-y-2">
                            <label className="block text-sm font-semibold text-m3-on-surface-variant">Cliente Vendedor</label>
                            <div className="flex flex-col gap-1.5">
                              <SearchableContactSelect
                                value={newSale.seller_contact_id || null}
                                onChange={(id, name) => {
                                  const contact = contacts.find(c => c.id === id);
                                  setNewSale({ 
                                    ...newSale, 
                                    seller_contact_id: id, 
                                    seller_name: name || '',
                                    seller_cpf: contact?.document || newSale.seller_cpf || '' 
                                  });
                                }}
                                onSaveNew={async (name) => {
                                  const newContact = await addContact({ name, type: 'CLIENT', is_active: true });
                                  return newContact;
                                }}
                                contacts={contacts}
                                placeholder="Buscar vendedor..."
                              />
                              <input
                                type="text"
                                value={newSale.seller_cpf || ''}
                                placeholder="Documento (CPF/CNPJ)"
                                className="w-full px-4 py-2 bg-white border border-m3-outline-variant rounded-xl text-xs font-semibold"
                                maxLength={18}
                                onChange={e => setNewSale({ ...newSale, seller_cpf: formatCpfCnpjInput(e.target.value) })}
                              />
                            </div>
                          </div>
                        </div>

                        <div className="border-t border-m3-outline-variant pt-6">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Toggle NF */}
                            <div className="p-4 bg-white rounded-xl border border-m3-outline-variant space-y-3">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <span className="material-symbols-outlined text-m3-on-surface-variant">description</span>
                                  <div>
                                    <p className="font-semibold text-m3-on-surface">NF já emitida?</p>
                                    <p className="text-xs text-m3-on-surface-variant">Nota fiscal processada</p>
                                  </div>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                  <input 
                                    type="checkbox" 
                                    className="sr-only peer" 
                                    checked={!!newSale.invoice_issued}
                                    onChange={() => setNewSale({ ...newSale, invoice_issued: !newSale.invoice_issued, invoice_number: !newSale.invoice_issued ? '' : (newSale.invoice_number || '') })}
                                  />
                                  <div className="w-11 h-6 bg-m3-surface-container-highest peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-m3-primary transition-colors"></div>
                                </label>
                              </div>

                              {newSale.invoice_issued && (
                                <div className="pt-3 border-t border-m3-outline-variant/30 animate-in fade-in slide-in-from-top-1 duration-300">
                                  <label className="text-[10px] font-black text-m3-on-surface-variant uppercase ml-1 tracking-wider">Número da Nota Fiscal</label>
                                  <input 
                                    type="text"
                                    value={newSale.invoice_number || ''}
                                    onChange={(e) => setNewSale({ ...newSale, invoice_number: e.target.value })}
                                    placeholder="Ex: 000.123.456"
                                    className="w-full mt-1 px-4 py-2.5 bg-m3-surface-container-low border border-m3-outline-variant rounded-xl text-sm font-bold text-m3-on-surface placeholder:text-m3-on-surface-variant/30 focus:outline-none focus:ring-2 focus:ring-m3-primary/20 focus:border-m3-primary transition-all"
                                  />
                                </div>
                              )}
                            </div>
                            {/* Toggle Parcelada */}
                            <div className="flex items-center justify-between p-4 bg-white rounded-xl border border-m3-outline-variant">
                              <div className="flex items-center gap-3">
                                <span className="material-symbols-outlined text-m3-on-surface-variant">event_repeat</span>
                                <div>
                                  <p className="font-semibold text-m3-on-surface">Venda Parcelada?</p>
                                  <p className="text-xs text-m3-on-surface-variant">Múltiplas parcelas</p>
                                </div>
                              </div>
                              <label className="relative inline-flex items-center cursor-pointer">
                                <input 
                                  type="checkbox" 
                                  className="sr-only peer" 
                                  checked={!!newSale.is_installment}
                                  onChange={() => setNewSale({ ...newSale, is_installment: !newSale.is_installment, installments: !newSale.is_installment ? newSale.installments : [] })}
                                />
                                <div className="w-11 h-6 bg-m3-surface-container-highest peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-m3-primary"></div>
                              </label>
                            </div>
                          </div>

                          {/* Installment Config Inline */}
                          {newSale.is_installment && (
                            <div className="mt-4 p-4 bg-m3-surface-container rounded-xl border border-m3-outline-variant space-y-3 animate-in fade-in duration-300">
                              <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                  <label className="text-[10px] font-bold text-m3-on-surface-variant uppercase ml-1">Qtd Parcelas</label>
                                  <input
                                    type="number"
                                    value={installmentConfig.count}
                                    onChange={e => setInstallmentConfig({ ...installmentConfig, count: Number(e.target.value) })}
                                    className="w-full px-4 py-2 bg-white border border-m3-outline-variant rounded-lg text-sm font-semibold"
                                  />
                                </div>
                                <div className="space-y-1">
                                  <label className="text-[10px] font-bold text-m3-on-surface-variant uppercase ml-1">1ª Parcela</label>
                                  <input
                                    type="date"
                                    value={installmentConfig.firstDate}
                                    onChange={e => setInstallmentConfig({ ...installmentConfig, firstDate: e.target.value })}
                                    className="w-full px-4 py-2 bg-white border border-m3-outline-variant rounded-lg text-sm"
                                  />
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={generateInstallments}
                                className="w-full py-2 bg-m3-primary-container text-m3-on-primary-container font-bold rounded-lg hover:brightness-110 transition-all text-xs uppercase"
                              >
                                Gerar Fluxo de Parcelas
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </section>
                  </div>

                  {/* Right Column: Rateio de Comissão */}
                  <div className="lg:col-span-5">
                    <section className="bg-m3-surface-container-low p-6 rounded-2xl border border-m3-outline-variant shadow-sm h-full flex flex-col">
                      <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-2 text-m3-primary">
                          <span className="material-symbols-outlined">account_balance_wallet</span>
                          <h3 className="font-bold text-lg">Rateio de Comissão</h3>
                        </div>
                        {(() => {
                          const splitTotal = newSale.splits?.reduce((a, b) => a + b.percentage, 0) || 0;
                          return (
                            <span className={`px-3 py-1 rounded-full text-xs font-bold ${splitTotal === 100 ? 'bg-m3-primary-container text-m3-on-primary-container' : 'bg-m3-tertiary-fixed text-m3-on-tertiary-fixed-variant'}`}>
                              Soma do Rateio: {splitTotal}%
                            </span>
                          );
                        })()}
                      </div>

                      <div className="space-y-3 mb-6 flex-1 overflow-y-auto pr-1">
                        {/* Summary Box */}
                        {(() => {
                           const vgv = Number(newSale.vgv) || 0;
                           const commPerc = Number(newSale.commission_percentage) || 0;
                           const totalComm = (vgv * commPerc) / 100;
                           return (
                             <div className="p-4 bg-m3-primary text-white rounded-xl mb-4">
                               <p className="text-[10px] font-bold uppercase tracking-widest opacity-80">Comissão Total Bruta</p>
                               <p className="text-xl font-black mt-1">{formatCurrency(totalComm)}</p>
                             </div>
                           );
                        })()}

                        {/* Split Items */}
                        {(newSale.splits || []).map((split, idx) => (
                          <div key={idx} className="p-4 bg-white rounded-xl border border-m3-outline-variant flex items-center justify-between animate-in slide-in-from-right-4 duration-300">
                            <div className="flex items-center gap-3">
                              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${split.broker_id === null ? 'bg-m3-primary/10' : 'bg-slate-100'}`}>
                                <span className={`material-symbols-outlined ${split.broker_id === null ? 'text-m3-primary' : 'text-slate-500'}`} style={{ fontVariationSettings: '"FILL" 1' }}>
                                  {split.broker_id === null ? 'corporate_fare' : 'person'}
                                </span>
                              </div>
                              <div>
                                <p className="font-bold text-m3-on-surface text-sm">{split.broker_name}</p>
                                <p className="text-xs text-m3-on-surface-variant font-medium">{split.percentage}% — {formatCurrency(split.calculated_value)}</p>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => setNewSale({ ...newSale, splits: newSale.splits?.filter((_, i) => i !== idx) })}
                              className="text-m3-outline hover:text-red-600 transition-colors"
                            >
                              <span className="material-symbols-outlined text-lg">delete</span>
                            </button>
                          </div>
                        ))}

                        {/* Add Participant Input */}
                        <div className="p-4 bg-white rounded-xl border-2 border-dashed border-m3-outline-variant flex flex-col items-center justify-center gap-3 mt-4">
                          <p className="text-sm font-bold text-m3-on-surface-variant">Adicionar Participante</p>
                          <div className="w-full flex gap-2">
                            <select 
                              className="flex-1 bg-m3-surface-container-low border border-m3-outline-variant rounded-lg text-xs font-bold py-2 px-3 outline-none"
                              value={currentSplit.brokerId}
                              onChange={e => setCurrentSplit({ ...currentSplit, brokerId: e.target.value })}
                            >
                              <option value="">Seletor de Beneficiário...</option>
                              <option value="AGENCY">🏢 Agência (Imobiliária)</option>
                              {team.map(u => (
                                <option key={u.id} value={u.id}>{u.name}</option>
                              ))}
                            </select>
                            <div className="relative w-16">
                              <input 
                                type="number" 
                                className="w-full bg-m3-surface-container-low border border-m3-outline-variant rounded-lg text-xs font-black py-2 px-2 text-center" 
                                placeholder="%" 
                                value={currentSplit.percentage}
                                onChange={e => setCurrentSplit({ ...currentSplit, percentage: Number(e.target.value) })}
                              />
                            </div>
                          </div>
                          <button 
                            type="button"
                            onClick={handleAddSplit}
                            className="w-full py-2.5 text-m3-primary text-xs font-black border border-m3-primary/20 rounded-lg hover:bg-m3-primary/5 transition-colors uppercase tracking-widest"
                          >
                            + Adicionar ao Rateio
                          </button>
                        </div>
                      </div>

                      <div className="mt-auto space-y-3 shrink-0">
                        {((newSale.splits?.reduce((a, b) => a + b.percentage, 0) || 0) < 100) && (
                          <button 
                            type="button"
                            onClick={handleSmartSplit}
                            className="w-full py-3 bg-white border border-m3-primary text-m3-primary rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-m3-primary/5 transition-all text-xs uppercase tracking-widest"
                          >
                            <span className="material-symbols-outlined text-sm">auto_fix_high</span>
                            Completar com Agência ({100 - (newSale.splits?.reduce((a, b) => a + b.percentage, 0) || 0)}%)
                          </button>
                        )}
                        <div className="p-4 bg-m3-tertiary-fixed rounded-xl border border-m3-outline-variant/30 flex gap-3">
                          <span className="material-symbols-outlined text-m3-on-tertiary-fixed-variant">lightbulb</span>
                          <p className="text-xs text-m3-on-tertiary-fixed-variant leading-relaxed">
                            <b>Dica:</b> O rateio total deve somar exatamente 100% da comissão disponível para que a venda possa ser salva.
                          </p>
                        </div>
                      </div>
                    </section>
                  </div>
                </div>

                {/* Bottom Actions */}
                <div className="mt-12 flex items-center justify-end gap-4 border-t border-m3-outline-variant pt-8">
                  <button 
                    type="button"
                    onClick={() => { closeModal(); clearDraft(DRAFT_KEY); }}
                    className="px-8 py-3 text-m3-on-surface-variant font-bold hover:bg-m3-surface-container-highest transition-colors rounded-xl text-sm"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="button"
                    onClick={handleSaveSale}
                    disabled={(newSale.splits?.reduce((a, b) => a + b.percentage, 0) || 0) !== 100}
                    className={`px-10 py-3 rounded-xl font-extrabold shadow-lg transition-all flex items-center gap-2 text-sm uppercase tracking-wider ${
                      (newSale.splits?.reduce((a, b) => a + b.percentage, 0) || 0) === 100
                      ? 'bg-m3-primary text-white shadow-m3-primary/20 hover:scale-[1.02] active:scale-[0.98]'
                      : 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                    }`}
                  >
                    <span className="material-symbols-outlined text-base">save</span>
                    {editingSale ? 'Salvar Alterações' : 'Salvar Venda'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Auditoria (Timeline) */}
      {isAuditModalOpen && selectedSaleForAudit && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white border border-slate-200 w-full max-w-2xl rounded-[40px] shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in duration-300">
            <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-white sticky top-0 z-10">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center">
                  <Clock size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-800">Histórico de Alterações</h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{selectedSaleForAudit.property_address}</p>
                </div>
              </div>
              <button onClick={() => setIsAuditModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400">
                <X size={24} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-8 bg-slate-50/30">
              {loadingAudit ? (
                <div className="flex flex-col items-center justify-center h-64 text-slate-400">
                  <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-4" />
                  <p className="text-xs font-bold uppercase tracking-widest">Carregando histórico...</p>
                </div>
              ) : auditLogs.length > 0 ? (
                <div className="relative">
                  <div className="absolute left-[23px] top-4 bottom-4 w-0.5 bg-slate-100" />
                  <div className="space-y-8">
                    {auditLogs.map((log, idx) => {
                      const changedFields = log.old_data && log.new_data ? Object.keys(log.new_data).filter(key => 
                        JSON.stringify(log.old_data[key]) !== JSON.stringify(log.new_data[key]) && 
                        !['updated_at', 'id'].includes(key)
                      ) : [];

                      return (
                        <div key={log.id} className="relative pl-14 animate-in slide-in-from-left-4 duration-500" style={{ animationDelay: `${idx * 100}ms` }}>
                          <div className={`absolute left-0 w-12 h-12 rounded-2xl border-4 border-white shadow-sm flex items-center justify-center z-10
                            ${log.action_type === 'CREATE' ? 'bg-emerald-500 text-white' : 
                              log.action_type === 'DELETE' ? 'bg-rose-500 text-white' : 'bg-blue-600 text-white'}`}>
                            {log.action_type === 'CREATE' ? <Plus size={20} /> : log.action_type === 'STATUS_CHANGE' ? <RefreshCw size={20} /> : <Edit2 size={20} />}
                          </div>
                          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-3">
                            <div className="flex justify-between items-start">
                              <div>
                                <p className="text-sm font-black text-slate-800 uppercase tracking-tight">
                                  {log.action_type === 'CREATE' ? 'Venda Criada' : 'Venda Atualizada'}
                                </p>
                                <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">
                                  {new Date(log.created_at).toLocaleString('pt-BR')}
                                </p>
                              </div>
                              <div className="px-3 py-1 bg-slate-50 rounded-lg text-[9px] font-black text-slate-500 uppercase">
                                ID: {log.id.split('-')[0]}
                              </div>
                            </div>

                            {changedFields.length > 0 && (
                              <div className="space-y-2 pt-2 border-t border-slate-50">
                                {changedFields.map(field => (
                                  <div key={field} className="flex flex-col gap-1">
                                    <span className="text-[9px] font-black text-slate-400 uppercase">{field}</span>
                                    <div className="flex items-center gap-2 text-[11px]">
                                      <span className="text-slate-400 line-through bg-slate-50 px-2 py-0.5 rounded italic">
                                        {typeof log.old_data[field] === 'object' ? 'AlteraÃƒÂ§ÃƒÂ£o complexa' : String(log.old_data[field])}
                                      </span>
                                      <ArrowRight size={10} className="text-slate-300" />
                                      <span className="text-blue-700 font-bold bg-blue-50 px-2 py-0.5 rounded">
                                        {typeof log.new_data[field] === 'object' ? 'AlteraÃƒÂ§ÃƒÂ£o complexa' : String(log.new_data[field])}
                                      </span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}

                            <div className="flex items-center gap-2 pt-2">
                               <div className="w-5 h-5 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-400">
                                  <UserIcon size={12} />
                               </div>
                               <span className="text-[10px] text-slate-500 font-bold uppercase">
                                  Alterado por {team.find(u => u.id === log.user_id)?.name || 'Sistema'}
                               </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-64 text-slate-300">
                  <Info size={48} className="mb-4 opacity-20" />
                  <p className="text-sm font-bold uppercase tracking-widest text-center">Nenhum histórico encontrado<br/><span className="text-[10px] font-normal lowercase tracking-normal text-slate-400">As alterações comeÃƒÂ§am a ser rastreadas agora</span></p>
                </div>
              )}
            </div>

            <div className="p-8 border-t border-slate-100 bg-slate-50 flex justify-end">
               <button 
                onClick={() => setIsAuditModalOpen(false)}
                className="px-10 py-3 bg-white border border-slate-200 rounded-2xl text-slate-800 font-black text-xs uppercase tracking-widest hover:bg-slate-100 transition-all shadow-sm"
               >
                 Fechar Histórico
               </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Sales;
