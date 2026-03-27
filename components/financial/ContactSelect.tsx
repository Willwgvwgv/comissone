import React from 'react';
import { User, Plus } from 'lucide-react';
import { FinancialContact } from '../../types';

interface ContactSelectProps {
  value: string | null;
  onChange: (value: string | null) => void;
  contacts: FinancialContact[];
  onAddNew?: () => void;
  type?: 'INCOME' | 'EXPENSE';
}

const ContactSelect: React.FC<ContactSelectProps> = ({ value, onChange, contacts, onAddNew, type }) => {
  // Filter contacts by type if needed
  const filteredContacts = contacts.filter(c => c.is_active || c.id === value);

  return (
    <div className="w-full relative group">
      <select
        value={value || ''}
        onChange={e => onChange(e.target.value || null)}
        className="w-full bg-transparent border-none p-0 text-sm font-bold text-[#191c1e] focus:ring-0 appearance-none cursor-pointer"
      >
        <option value="">{`Selecionar...`}</option>
        {filteredContacts.map(c => (
          <option key={c.id} value={c.id}>{c.name}</option>
        ))}
      </select>
      
      {onAddNew && !value && (
        <button 
          type="button" 
          onClick={onAddNew}
          className="absolute right-0 top-1/2 -translate-y-1/2 text-emerald-600 hover:underline flex items-center gap-0.5 text-[10px] font-black uppercase tracking-wider"
        >
          <Plus size={12} /> novo
        </button>
      )}
    </div>
  );
};

export default ContactSelect;
