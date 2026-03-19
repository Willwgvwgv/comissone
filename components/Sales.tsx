
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
  CheckCircle
} from 'lucide-react';

import { useAutoSave, loadDraft, clearDraft } from '../src/hooks/useAutoSave';
import { AutoSaveIndicator } from './SupportComponents';
import { useSanitize } from '../src/hooks/useSanitize';
import { formatCurrency, formatCpfCnpjInput } from '../src/utils/formatters';


import { Sale, User, UserRole, CommissionStatus, BrokerSplit, SaleStatus } from '../types';
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
  const [saveFeedback, setSaveFeedback] = useState(false); // toast de venda salva

  // Estado para o modal de exclusão
  const [saleToDelete, setSaleToDelete] = useState<string | null>(null);

  // Estados para Filtros
  const [period, setPeriod] = useState<string>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [onlyInstallments, setOnlyInstallments] = useState(false);
  const [showCanceledSales, setShowCanceledSales] = useState(false); // Padrão: Ocultar canceladas

  // Lógica de Filtragem
  const filteredSales = useMemo(() => {
    let result = [...sales];

    // 0. Filtro de Canceladas (Se não marcado, remove canceladas)
    if (!showCanceledSales) {
      result = result.filter(s => s.status !== SaleStatus.CANCELED);
    }

    // 0.1 Filtro de Parceladas
    if (onlyInstallments) {
      result = result.filter(s => s.is_installment);
    }


    // 1. Busca por texto
    if (searchTerm) {
      result = result.filter(s =>
        s.property_address.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.buyer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.seller_name.toLowerCase().includes(searchTerm.toLowerCase())
      );
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
  }, [sales, searchTerm, period, startDate, endDate]);

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



  // Estado para Nova Venda / Edição
  const defaultNewSale: Partial<Sale> = {
    sale_date: new Date().toISOString().split('T')[0],
    commission_percentage: 6,
    splits: [],
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

  // Verificar rascunho ao carregar (Restauração Automática e Silenciosa)
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
    setCurrentSplit({ brokerId: '', percentage: 100 });
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
            installments: sanitized.installments || []
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
            installments: sanitized.installments || []
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
      alert(`Erro ao salvar venda no banco de dados: ${errorMsg}\n\nA venda será mantida apenas temporariamente no seu navegador.`);
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
          // Criar cópia para não mutar o original
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

    // Verificação de ID local
    if (sale.id.startsWith('local-')) {
      if (confirm('ATENÇÃO: Esta venda é local (não salva no banco). \n\nDeseja REMOVÊ-LA definitivamente?\n\nIsso apagará a venda e todas as comissões associadas da sua tela. Essa ação não pode ser desfeita.')) {
        setSales(prev => prev.filter(s => s.id !== sale.id));
        alert('Venda local removida.');
      }
      return;
    }

    if (confirm(`Deseja marcar a venda do imóvel em ${sale.property_address} como Distrato? Isso cancelará TODAS as comissões vinculadas (pagas e pendentes).`)) {
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

  const handleExportCSV = () => {
    const headers = [
      "Data Venda",
      "Comprador",
      "CPF/CNPJ Comprador",
      "Vendedor",
      "CPF/CNPJ Vendedor",
      "Endereço Imóvel",
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
          <h1 className="header-title">Controle de Vendas</h1>
          <p className="header-subtitle">Visualize e gerencie todos os contratos e rateios</p>
        </div>
      </div>
      {/* KPI Header Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card-base relative overflow-hidden group">
          <div className="absolute top-0 right-[-10px] p-3 opacity-5 group-hover:scale-110 transition-transform duration-500 group-hover:rotate-6">
            <Building2 size={100} className="text-blue-600" />
          </div>
          <div className="flex items-center justify-between mb-4 relative z-10">
            <div className="p-2.5 bg-gradient-to-br from-blue-500/20 to-blue-600/5 text-blue-600 rounded-xl border border-blue-500/20 shadow-inner">
              <Building2 size={24} />
            </div>
          </div>
          <p className="text-sm font-medium text-slate-500 mb-1 relative z-10">Comissões Imobiliária</p>
          <p className="text-2xl font-bold text-slate-800 relative z-10">{formatCurrency(kpis.agencyComm)}</p>
        </div>

        <div className="card-base relative overflow-hidden group">
          <div className="absolute top-0 right-[-10px] p-3 opacity-5 group-hover:scale-110 transition-transform duration-500 group-hover:rotate-6">
            <Wallet size={100} className="text-indigo-600" />
          </div>
          <div className="flex items-center justify-between mb-4 relative z-10">
            <div className="p-2.5 bg-gradient-to-br from-indigo-500/20 to-indigo-600/5 text-indigo-600 rounded-xl border border-indigo-500/20 shadow-inner">
              <Wallet size={24} />
            </div>
          </div>
          <p className="text-sm font-medium text-slate-500 mb-1 relative z-10">Comissão Total Gerada</p>
          <p className="text-2xl font-bold text-slate-800 relative z-10">{formatCurrency(kpis.totalComm)}</p>
        </div>

        <div className="card-base relative overflow-hidden group">
          <div className="absolute top-0 right-[-10px] p-3 opacity-5 group-hover:scale-110 transition-transform duration-500 group-hover:rotate-6">
            <FileX2 size={100} className="text-red-600" />
          </div>
          <div className="flex items-center justify-between mb-4 relative z-10">
            <div className="p-2.5 bg-gradient-to-br from-red-500/20 to-red-600/5 text-red-600 rounded-xl border border-red-500/20 shadow-inner">
              <FileX2 size={24} />
            </div>
          </div>
          <p className="text-sm font-medium text-slate-500 mb-1 relative z-10">Vendas sem Nota</p>
          <p className="text-2xl font-bold text-red-600 relative z-10">{kpis.salesWithoutInvoice}</p>
        </div>

        <div className="card-base relative overflow-hidden group">
          <div className="absolute top-0 right-[-10px] p-3 opacity-5 group-hover:scale-110 transition-transform duration-500 group-hover:rotate-6">
            <ShoppingCart size={100} className="text-slate-600" />
          </div>
          <div className="flex items-center justify-between mb-4 relative z-10">
            <div className="p-2.5 bg-gradient-to-br from-slate-400/20 to-slate-500/5 text-slate-600 rounded-xl border border-slate-400/20 shadow-inner">
              <ShoppingCart size={24} />
            </div>
          </div>
          <p className="text-sm font-medium text-slate-500 mb-1 relative z-10">Vendas Totais</p>
          <p className="text-2xl font-bold text-slate-800 relative z-10">{kpis.count}</p>
        </div>
      </div>




      {/* Control Bar & Filtros */}
      <div className="card-base mb-6 backdrop-blur-xl">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex flex-1 items-center gap-3 w-full sm:w-auto bg-slate-50/80 p-1.5 rounded-2xl border border-slate-100">
            <div className="relative flex-1 max-lg">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                type="text"
                placeholder="Buscar por imóvel ou comprador..."
                className="w-full pl-11 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-100 outline-none transition-all shadow-sm text-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="flex items-center bg-white border border-slate-200 rounded-xl px-2">
              <Calendar size={16} className="text-slate-400 ml-2" />
              <select
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                className="bg-transparent text-sm font-medium text-slate-600 px-3 py-2.5 outline-none cursor-pointer"
              >
                <option value="all">Período Total</option>
                <option value="month">Este Mês</option>
                <option value="quarter">Este Trimestre</option>
                <option value="year">Este Ano</option>
                <option value="custom">Datas Customizadas</option>
              </select>
            </div>

            <button
              onClick={handleExportCSV}
              className="flex items-center justify-center p-2.5 bg-white border border-slate-200 rounded-xl text-slate-500 hover:bg-slate-50 hover:text-slate-800 hover:underline transition-all shadow-sm"
              title="Exportar Listados"
            >
              <Download size={18} />
            </button>
          </div>

          <button
            onClick={() => setIsModalOpen(true)}
            className="btn-primary w-full sm:w-auto flex items-center justify-center gap-2"
          >
            <Plus size={20} /> Nova Venda
          </button>
        </div>

        {period === 'custom' && (
          <div className="flex items-center gap-3 bg-white p-3 rounded-2xl border border-slate-100 shadow-sm animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="flex items-center gap-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Início:</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-slate-50 text-xs font-semibold text-slate-600 px-3 py-1.5 rounded-lg border border-slate-200 outline-none focus:ring-1 focus:ring-blue-400"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Fim:</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-slate-50 text-xs font-semibold text-slate-600 px-3 py-1.5 rounded-lg border border-slate-200 outline-none focus:ring-1 focus:ring-blue-400"
              />
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center gap-4 mb-2">
        <label className="flex items-center gap-2 cursor-pointer group">
          <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${onlyInstallments ? 'bg-blue-600 border-blue-600' : 'bg-white border-slate-300 group-hover:border-blue-400'}`}>
            {onlyInstallments && <CheckCircle size={14} className="text-white" />}
          </div>
          <input
            type="checkbox"
            className="hidden"
            checked={onlyInstallments}
            onChange={(e) => setOnlyInstallments(e.target.checked)}
          />
          <span className={`text-sm font-medium transition-all ${onlyInstallments ? 'text-blue-700' : 'text-slate-600 group-hover:text-blue-600 group-hover:underline'}`}>
            Mostrar apenas vendas parceladas
          </span>
        </label>

        <label className="flex items-center gap-2 cursor-pointer group">
          <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${showCanceledSales ? 'bg-red-500 border-red-500' : 'bg-white border-slate-300 group-hover:border-red-400'}`}>
            {showCanceledSales && <CheckCircle size={14} className="text-white" />}
          </div>
          <input
            type="checkbox"
            className="hidden"
            checked={showCanceledSales}
            onChange={(e) => setShowCanceledSales(e.target.checked)}
          />
          <span className={`text-sm font-medium transition-all ${showCanceledSales ? 'text-red-600' : 'text-slate-600 group-hover:text-red-500 group-hover:underline'}`}>
            Exibir vendas canceladas/distratos
          </span>
        </label>
      </div>



      {/* Sales Table */}
      <div className="card-base p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="table-base">
            <thead>
              <tr className="bg-transparent text-[11px] font-bold text-slate-400 uppercase tracking-[0.2em] border-b border-black/5">
                <th className="px-10 py-8">DATA</th>
                <th className="px-10 py-8">IMÓVEL</th>
                <th className="px-6 py-8">COMPRADOR</th>
                <th className="px-6 py-8">VENDEDOR</th>
                <th className="px-6 py-8">VGV</th>
                <th className="px-6 py-8">PARCELAS</th>
                <th className="px-6 py-8">NF</th>
                <th className="px-10 py-8 text-right">AÇÕES</th>
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
                        {sale.buyer_name}
                      </span>
                      {sale.buyer_cpf && (
                        <span className="text-[10px] text-slate-400 font-bold font-mono mt-1">
                          {maskCPF(sale.buyer_cpf)}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-8">
                    <div className="flex flex-col">
                      <span className={`text-sm font-medium ${sale.status === SaleStatus.CANCELED ? 'text-slate-400' : 'text-slate-600'}`}>
                        {sale.seller_name}
                      </span>
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
                  <td className="px-6 py-8">
                    {sale.invoice_issued ? (
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border ${sale.status === SaleStatus.CANCELED
                        ? 'bg-slate-100 text-slate-400 border-slate-200'
                        : 'bg-emerald-50 text-emerald-600 border-emerald-100'
                        }`}>
                        <FileCheck size={12} /> Sim
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 bg-slate-50 text-slate-400 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border border-slate-100">
                        <FileX size={12} /> Não
                      </span>
                    )}
                  </td>
                  <td className="px-10 py-8 text-right flex items-center justify-end gap-3">
                    <div className="flex items-center gap-1.5 bg-slate-50 p-1.5 rounded-2xl border border-slate-100">
                      {sale.status === SaleStatus.CANCELED && (
                        <span className="text-[10px] font-black text-red-500 uppercase tracking-widest px-2 mr-1 bg-red-50 rounded-lg py-1">Cancelada</span>
                      )}

                      <button
                        onClick={() => openEditModal(sale)}
                        className="p-2 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-xl transition-all"
                        title="Editar Venda"
                      >
                        <Edit size={18} />
                      </button>

                      {sale.status !== SaleStatus.CANCELED ? (
                        <button
                          onClick={() => handleDistrato(sale)}
                          className="p-2 text-slate-400 hover:text-orange-500 hover:bg-orange-50 rounded-xl transition-all"
                          title="Fazer Distrato (Venda Caída)"
                        >
                          <FileX size={18} />
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
                          className="p-2 text-emerald-500 hover:bg-emerald-50 rounded-xl transition-all"
                          title="Reativar Venda"
                        >
                          <CheckCircle size={18} />
                        </button>
                      )}

                      <button
                        onClick={() => setSaleToDelete(sale.id)}
                        className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                        title="Excluir Permanentemente"
                      >
                        <Trash2 size={18} />
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

      {/* Modal de Cadastro/Edição de Venda */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white/95 backdrop-blur-xl border border-white/60 w-full max-w-4xl rounded-[40px] shadow-2xl overflow-hidden flex flex-col max-h-[95vh] animate-in zoom-in duration-200">
            <div className="p-8 border-b border-black/5 flex items-center justify-between sticky top-0 bg-transparent z-10">
              <div>
                <h3 className="text-2xl font-black text-slate-800">{editingSale ? 'Editar Venda' : 'Nova Venda'}</h3>
                <p className="text-sm text-slate-400 font-medium">Cadastre os detalhes do imóvel e o rateio de comissões.</p>
              </div>
              <button onClick={closeModal} className="bg-slate-50 p-2 rounded-full text-slate-400 hover:text-slate-600 transition-colors">
                <X size={24} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-10">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                {/* COLUNA ESQUERDA */}
                <div className="space-y-8">
                  {/* Informações Básicas */}
                  <div className="space-y-4">
                    <h4 className="text-xs font-black uppercase text-blue-600 tracking-widest">Informações Básicas</h4>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Imóvel (Endereço / Unidade)</label>
                      <input
                        type="text"
                        value={newSale.property_address || ''}
                        placeholder="Ex: Av. Paulista, 1000 - Apto 42"
                        className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-blue-100 outline-none text-sm font-semibold"
                        onChange={e => setNewSale({ ...newSale, property_address: e.target.value })}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase ml-1 flex items-center gap-1.5">
                          <DollarSign size={12} className="text-blue-500" /> VGV (Valor de Venda)
                        </label>
                        <div className="relative group">
                          <span className="absolute left-5 top-1/2 -translate-y-1/2 text-sm font-black text-slate-400 group-focus-within:text-blue-500 transition-colors">R$</span>
                          <input
                            type="text"
                            value={new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2 }).format(newSale.vgv || 0)}
                            placeholder="0,00"
                            className="w-full pl-12 pr-5 py-4 bg-slate-50 border-2 border-transparent rounded-[20px] focus:ring-8 focus:ring-blue-50 focus:border-blue-200 outline-none text-sm font-black text-slate-700 transition-all"
                            onChange={e => {
                              const val = e.target.value.replace(/\D/g, '');
                              const num = Number(val) / 100;
                              setNewSale({ ...newSale, vgv: num });
                            }}
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase ml-1 flex items-center gap-1.5">
                          <TrendingUp size={12} className="text-emerald-500" /> % Comissão
                        </label>
                        <div className="relative group">
                          <input
                            type="number"
                            value={newSale.commission_percentage || 6}
                            className="w-full px-5 py-4 bg-slate-50 border-2 border-transparent rounded-[20px] focus:ring-8 focus:ring-emerald-50 focus:border-emerald-200 outline-none text-sm font-black text-slate-700 transition-all pr-10"
                            onChange={e => setNewSale({ ...newSale, commission_percentage: Number(e.target.value) })}
                          />
                          <span className="absolute right-5 top-1/2 -translate-y-1/2 text-sm font-black text-slate-400 group-focus-within:text-emerald-500 transition-colors">%</span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Data da Venda</label>
                      <input
                        type="date"
                        value={newSale.sale_date}
                        className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-blue-100 outline-none text-sm font-semibold text-slate-600"
                        onChange={e => setNewSale({ ...newSale, sale_date: e.target.value })}
                      />
                    </div>
                  </div>

                  {/* Participantes */}
                  <div className="space-y-4">
                    <h4 className="text-xs font-black uppercase text-blue-600 tracking-widest">Participantes</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <input type="text" value={newSale.buyer_name || ''} placeholder="Nome do Comprador" className="w-full px-5 py-3 bg-slate-50 border-none rounded-2xl text-sm" onChange={e => setNewSale({ ...newSale, buyer_name: e.target.value })} />
                      <input type="text" value={newSale.buyer_cpf || ''} placeholder="CPF do Comprador" className="w-full px-5 py-3 bg-slate-50 border-none rounded-2xl text-sm" maxLength={18} onChange={e => setNewSale({ ...newSale, buyer_cpf: formatCpfCnpjInput(e.target.value) })} />
                      <input type="text" value={newSale.seller_name || ''} placeholder="Nome do Vendedor" className="w-full px-5 py-3 bg-slate-50 border-none rounded-2xl text-sm" onChange={e => setNewSale({ ...newSale, seller_name: e.target.value })} />
                      <input type="text" value={newSale.seller_cpf || ''} placeholder="CPF do Vendedor" className="w-full px-5 py-3 bg-slate-50 border-none rounded-2xl text-sm" maxLength={18} onChange={e => setNewSale({ ...newSale, seller_cpf: formatCpfCnpjInput(e.target.value) })} />
                    </div>
                  </div>

                  {/* Nota Fiscal */}
                  <div className="flex flex-col gap-4 p-5 bg-blue-50/30 rounded-[32px] border border-blue-50">
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-7 rounded-full relative transition-colors cursor-pointer ${newSale.invoice_issued ? 'bg-blue-600' : 'bg-slate-200'}`} onClick={() => setNewSale({ ...newSale, invoice_issued: !newSale.invoice_issued })}>
                        <div className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-all shadow-sm ${newSale.invoice_issued ? 'left-6' : 'left-1'}`} />
                      </div>
                      <span className="text-sm font-bold text-slate-600">NF já emitida?</span>
                    </div>

                    {newSale.invoice_issued && (
                      <div className="animate-in fade-in slide-in-from-top-2 duration-300 w-full">
                        <input
                          type="text"
                          value={newSale.invoice_number || ''}
                          placeholder="Digite o número da Nota Fiscal..."
                          className="w-full px-5 py-3 bg-white border border-blue-100 rounded-2xl outline-none focus:ring-2 focus:ring-blue-200 text-sm font-semibold shadow-sm"
                          onChange={e => setNewSale({ ...newSale, invoice_number: e.target.value })}
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* COLUNA DIREITA */}
                <div className="space-y-8">
                  {/* Pagamento / Parcelamento */}
                  <div className="p-5 bg-slate-50 rounded-[32px] border border-slate-100 space-y-4">
                    <div className="flex items-center gap-3 mb-2">
                      <div
                        className={`w-12 h-7 rounded-full relative transition-colors cursor-pointer ${newSale.is_installment ? 'bg-blue-600' : 'bg-slate-200'}`}
                        onClick={() => {
                          const newVal = !newSale.is_installment;
                          setNewSale({
                            ...newSale,
                            is_installment: newVal,
                            installments: newVal ? newSale.installments : [] // Limpar se desativado
                          });
                        }}
                      >
                        <div className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-all shadow-sm ${newSale.is_installment ? 'left-6' : 'left-1'}`} />
                      </div>
                      <span className="text-sm font-bold text-slate-600">Venda Parcelada?</span>
                    </div>

                    {newSale.is_installment && (
                      <div className="animate-in fade-in slide-in-from-top-2 duration-300 space-y-4">
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Qtd Parcelas</label>
                            <input
                              type="number"
                              value={installmentConfig.count}
                              onChange={e => setInstallmentConfig({ ...installmentConfig, count: Number(e.target.value) })}
                              className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Data 1ª Parcela</label>
                            <input
                              type="date"
                              value={installmentConfig.firstDate}
                              onChange={e => setInstallmentConfig({ ...installmentConfig, firstDate: e.target.value })}
                              className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm"
                            />
                          </div>
                        </div>
                        <button
                          onClick={generateInstallments}
                          className="w-full bg-blue-100 text-blue-700 font-bold py-3 rounded-xl hover:bg-blue-200 transition-colors text-sm"
                        >
                          Gerar Parcelas
                        </button>

                        {newSale.installments && newSale.installments.length > 0 && (
                          <div className="max-h-40 overflow-y-auto space-y-2 pr-2">
                            {newSale.installments.map((inst, idx) => (
                              <div key={idx} className="flex justify-between items-center text-xs bg-white p-2 rounded-lg border border-slate-100">
                                <span className="font-bold text-slate-600">{inst.installment_number}ª Parcela</span>
                                <span className="text-slate-500">{inst.due_date.split('-').reverse().join('/')}</span>
                                <div className="text-right">
                                  <span className="block font-bold text-slate-800">{formatCurrency(inst.value)} <span className="text-[9px] text-slate-400 font-normal">VGV</span></span>
                                  <span className="block font-bold text-blue-600">{formatCurrency(((newSale.commission_percentage || 0) / 100 * (inst.value || 0)))} <span className="text-[9px] text-blue-300 font-normal">COM</span></span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Rateio de Comissão */}
                  <div className="bg-slate-50/50 p-8 rounded-[32px] border border-slate-100 space-y-6">
                    <div className="flex items-center gap-2 mb-2">
                      <Split className="text-blue-500" size={20} />
                      <h4 className="text-sm font-black text-slate-800 uppercase tracking-widest">Rateio de Comissão</h4>
                    </div>

                    <div className="flex gap-2">
                      <select
                        className="flex-1 px-4 py-3 bg-white border border-slate-100 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-blue-100"
                        value={currentSplit.brokerId}
                        onChange={e => setCurrentSplit({ ...currentSplit, brokerId: e.target.value })}
                      >
                        <option value="">Selecionar Beneficiário</option>
                        <option value="AGENCY" className="font-bold text-blue-600">Agência (Imobiliária)</option>
                        <hr />
                        {team.map(u => (
                          <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                        ))}
                      </select>
                      <input
                        type="number"
                        className="w-24 px-4 py-3 bg-white border border-slate-100 rounded-xl text-xs font-bold text-center outline-none focus:ring-2 focus:ring-blue-100"
                        value={currentSplit.percentage}
                        onChange={e => setCurrentSplit({ ...currentSplit, percentage: Number(e.target.value) })}
                        placeholder="%"
                      />
                      <button
                        onClick={handleAddSplit}
                        className="bg-blue-600 text-white p-3 rounded-xl hover:bg-blue-700 transition-colors shadow-lg shadow-blue-100"
                      >
                        <Plus size={20} />
                      </button>
                    </div>

                    <div className="space-y-3 max-h-[250px] overflow-y-auto pr-2">
                      {(newSale.splits || []).map((split, idx) => (
                        <div key={idx} className="bg-white p-4 rounded-2xl flex items-center justify-between border border-slate-100 animate-in slide-in-from-bottom-2 duration-300">
                          <div className="flex items-center gap-3">
                            {split.broker_id === 'AGENCY' ? (
                              <Building2 className="text-blue-500" size={16} />
                            ) : (
                              <UserIcon className="text-slate-400" size={16} />
                            )}
                            <div>
                              <p className="text-xs font-black text-slate-800">{split.broker_name}</p>
                              <p className="text-[10px] text-blue-600 font-bold uppercase">{split.percentage}% — {formatCurrency(split.calculated_value)}</p>
                            </div>
                          </div>
                          <button
                            onClick={() => setNewSale({ ...newSale, splits: newSale.splits?.filter((_, i) => i !== idx) })}
                            className="text-slate-300 hover:text-red-500 transition-colors"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      ))}
                    </div>

                    <div className="pt-6 border-t border-slate-100 space-y-2">
                      <div className="flex justify-between text-[10px] font-black uppercase text-slate-400">
                        <span>Soma do Rateio</span>
                        <span className={(newSale.splits?.reduce((a, b) => a + b.percentage, 0) || 0) === 100 ? 'text-emerald-500' : 'text-amber-500'}>
                          {(newSale.splits?.reduce((a, b) => a + b.percentage, 0) || 0)}%
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-8 border-t border-black/5 bg-transparent flex justify-end gap-4 sticky bottom-0 z-10">
              <button
                onClick={() => {
                  closeModal();
                  setNewSale(defaultNewSale);
                  setInstallmentConfig(defaultInstallmentConfig);
                  clearDraft(DRAFT_KEY);
                }}
                className="px-8 py-3 text-slate-400 font-bold hover:text-slate-600 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveSale}
                className="bg-blue-600 hover:bg-blue-700 text-white px-12 py-3 rounded-2xl font-black transition-all shadow-xl shadow-blue-200"
              >
                {editingSale ? 'Salvar Alterações' : 'Salvar Venda'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Sales;
