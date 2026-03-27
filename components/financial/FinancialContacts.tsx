import React, { useState, useMemo } from 'react';
import { User, Plus, Search, Filter, Mail, Phone, FileText, Edit2, Trash2, CheckCircle, XCircle } from 'lucide-react';
import { FinancialContact, FinancialContactType } from '../../types';
import ContactFormModal from './ContactFormModal';

interface FinancialContactsProps {
  contacts: FinancialContact[];
  onAdd: (contact: Omit<FinancialContact, 'id' | 'agency_id' | 'created_at'>) => Promise<any>;
  onUpdate: (id: string, updates: Partial<FinancialContact>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

const FinancialContacts: React.FC<FinancialContactsProps> = ({ contacts, onAdd, onUpdate, onDelete }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | FinancialContactType>('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<FinancialContact | null>(null);

  const filteredContacts = useMemo(() => {
    return contacts.filter(c => {
      const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          c.document?.includes(searchTerm) || 
                          c.email?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesType = typeFilter === 'ALL' || c.type === typeFilter || c.type === 'BOTH';
      return matchesSearch && matchesType;
    });
  }, [contacts, searchTerm, typeFilter]);

  const handleEdit = (contact: FinancialContact) => {
    setEditingContact(contact);
    setIsModalOpen(true);
  };

  const handleSave = async (data: Omit<FinancialContact, 'id' | 'agency_id' | 'created_at'>) => {
    if (editingContact) {
      await onUpdate(editingContact.id, data);
    } else {
      await onAdd(data);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative flex-1 w-full max-w-md group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={18} />
          <input
            type="text"
            placeholder="Buscar por nome, documento ou e-mail..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3.5 bg-white border border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-blue-100/50 shadow-sm transition-all font-medium text-sm"
          />
        </div>

        <div className="flex items-center gap-2 bg-white p-1.5 rounded-2xl border border-slate-100 shadow-sm">
           {(['ALL', 'CLIENT', 'SUPPLIER'] as const).map(t => (
             <button
               key={t}
               onClick={() => setTypeFilter(t)}
               className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all
                 ${typeFilter === t ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-50'}`}
             >
               {t === 'ALL' ? 'Todos' : t === 'CLIENT' ? 'Clientes' : 'Fornecedores'}
             </button>
           ))}
        </div>

        <button
          onClick={() => { setEditingContact(null); setIsModalOpen(true); }}
          className="btn-primary flex items-center gap-2 whitespace-nowrap"
        >
          <Plus size={20} /> Novo Contato
        </button>
      </div>

      <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="overflow-x-auto">
          <table className="table-base">
            <thead>
              <tr>
                <th>Contato</th>
                <th>Tipo</th>
                <th>Documento</th>
                <th>Comunicação</th>
                <th>Status</th>
                <th className="text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredContacts.length > 0 ? (
                filteredContacts.map(contact => (
                  <tr key={contact.id} className="group transition-all hover:bg-slate-50/80">
                    <td>
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white font-black text-lg shadow-sm
                          ${contact.type === 'CLIENT' ? 'bg-emerald-500' : contact.type === 'SUPPLIER' ? 'bg-orange-500' : 'bg-blue-600'}`}>
                          {contact.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex flex-col">
                          <span className="text-sm font-black text-slate-800 uppercase tracking-tight">{contact.name}</span>
                          <span className="text-[10px] text-slate-400 font-bold">{contact.type === 'CLIENT' ? 'Cliente' : contact.type === 'SUPPLIER' ? 'Fornecedor' : 'Ambos'}</span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className={`status-badge ${contact.type === 'CLIENT' ? 'status-success' : contact.type === 'SUPPLIER' ? 'status-warning' : 'status-info'}`}>
                        {contact.type === 'CLIENT' ? 'Cliente' : contact.type === 'SUPPLIER' ? 'Fornecedor' : 'Misto'}
                      </span>
                    </td>
                    <td>
                      <span className="text-xs font-mono text-slate-500 font-medium">{contact.document || '-'}</span>
                    </td>
                    <td>
                      <div className="flex flex-col gap-1">
                        {contact.email && (
                          <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-medium">
                            <Mail size={12} className="text-slate-300" />
                            {contact.email}
                          </div>
                        )}
                        {contact.phone && (
                          <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-medium">
                            <Phone size={12} className="text-slate-300" />
                            {contact.phone}
                          </div>
                        )}
                        {!contact.email && !contact.phone && <span className="text-slate-300">-</span>}
                      </div>
                    </td>
                    <td>
                      {contact.is_active !== false ? (
                        <div className="flex items-center gap-1.5 text-emerald-600">
                          <CheckCircle size={14} />
                          <span className="text-[10px] font-black uppercase tracking-widest">Ativo</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-red-400">
                          <XCircle size={14} />
                          <span className="text-[10px] font-black uppercase tracking-widest">Inativo</span>
                        </div>
                      )}
                    </td>
                    <td className="text-right">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleEdit(contact)}
                          className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                          title="Editar"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => onDelete(contact.id)}
                          className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                          title="Excluir"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-32 text-center text-slate-400">
                    Nenhum contato encontrado
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ContactFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSave}
        editingContact={editingContact}
      />
    </div>
  );
};

export default FinancialContacts;
