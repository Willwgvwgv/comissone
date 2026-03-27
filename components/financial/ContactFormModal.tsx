import React, { useState, useEffect } from 'react';
import { X, User, Mail, Phone, FileText, CheckCircle2, AlertCircle } from 'lucide-react';
import { FinancialContact, FinancialContactType } from '../../types';

interface ContactFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (contact: Omit<FinancialContact, 'id' | 'agency_id' | 'created_at'>) => Promise<void>;
  editingContact?: FinancialContact | null;
}

const ContactFormModal: React.FC<ContactFormModalProps> = ({ isOpen, onClose, onSave, editingContact }) => {
  const [formData, setFormData] = useState<Omit<FinancialContact, 'id' | 'agency_id' | 'created_at'>>({
    name: '',
    document: '',
    email: '',
    phone: '',
    type: 'CLIENT',
    is_active: true
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (editingContact) {
      setFormData({
        name: editingContact.name,
        document: editingContact.document || '',
        email: editingContact.email || '',
        phone: editingContact.phone || '',
        type: editingContact.type,
        is_active: editingContact.is_active
      });
    } else {
      setFormData({
        name: '',
        document: '',
        email: '',
        phone: '',
        type: 'CLIENT',
        is_active: true
      });
    }
  }, [editingContact, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSave(formData);
      onClose();
    } catch (error) {
      console.error('Error saving contact:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white/95 backdrop-blur-xl border border-white/60 w-full max-w-md rounded-[40px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
        <div className="p-8 border-b border-black/5 flex items-center justify-between">
          <div>
            <h3 className="text-xl font-black text-slate-800">{editingContact ? 'Editar Contato' : 'Novo Contato'}</h3>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">
              {formData.type === 'CLIENT' ? 'Cliente' : formData.type === 'SUPPLIER' ? 'Fornecedor' : 'Cliente e Fornecedor'}
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Nome / Razão Social</label>
              <div className="relative group">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={16} />
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: João Silva ou Empresa LTDA"
                  className="w-full pl-12 pr-4 py-3 bg-slate-50 border-none rounded-2xl focus:ring-4 focus:ring-blue-100 outline-none text-sm font-semibold transition-all"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase ml-1">CPF / CNPJ</label>
                <div className="relative group">
                  <FileText className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={16} />
                  <input
                    type="text"
                    value={formData.document || ''}
                    onChange={e => setFormData({ ...formData, document: e.target.value })}
                    placeholder="000.000.000-00"
                    className="w-full pl-12 pr-4 py-3 bg-slate-50 border-none rounded-2xl focus:ring-4 focus:ring-blue-100 outline-none text-sm font-semibold transition-all"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Telefone</label>
                <div className="relative group">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={16} />
                  <input
                    type="text"
                    value={formData.phone || ''}
                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="(00) 00000-0000"
                    className="w-full pl-12 pr-4 py-3 bg-slate-50 border-none rounded-2xl focus:ring-4 focus:ring-blue-100 outline-none text-sm font-semibold transition-all"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase ml-1">E-mail</label>
              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={16} />
                <input
                  type="email"
                  value={formData.email || ''}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                  placeholder="exemplo@email.com"
                  className="w-full pl-12 pr-4 py-3 bg-slate-50 border-none rounded-2xl focus:ring-4 focus:ring-blue-100 outline-none text-sm font-semibold transition-all"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Tipo de Contato</label>
              <div className="flex gap-2">
                {(['CLIENT', 'SUPPLIER', 'BOTH'] as FinancialContactType[]).map(t => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setFormData({ ...formData, type: t })}
                    className={`flex-1 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border
                      ${formData.type === t 
                        ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-200' 
                        : 'bg-white border-slate-100 text-slate-400 hover:border-blue-200 hover:text-blue-500'}`}
                  >
                    {t === 'CLIENT' ? 'Cliente' : t === 'SUPPLIER' ? 'Fornecedor' : 'Ambos'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="pt-4 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-4 bg-slate-100 text-slate-600 rounded-3xl font-black text-xs uppercase tracking-widest hover:bg-slate-200 transition-all"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-6 py-4 bg-blue-600 text-white rounded-3xl font-black text-xs uppercase tracking-widest hover:bg-blue-700 transition-all shadow-xl shadow-blue-100 disabled:opacity-50"
            >
              {loading ? 'Salvando...' : editingContact ? 'Salvar' : 'Cadastrar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ContactFormModal;
