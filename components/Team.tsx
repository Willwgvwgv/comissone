import React, { useState, useEffect } from 'react';
import {
  Plus, Edit, Trash2, UserPlus, X, Mail, Shield, User as UserIcon, Lock, Phone
} from 'lucide-react';
import { User, UserRole } from '../types';
import { supabase } from '../src/lib/supabaseClient';
import { sanitizeInput } from '../src/utils/securityUtils';
import { useAutoSave, loadDraft, clearDraft } from '../src/hooks/useAutoSave';
import { AutoSaveIndicator } from './SupportComponents';
import { useSanitize } from '../src/hooks/useSanitize';

const TEAM_DRAFT_KEY = 'comissone_team_form_draft';

interface TeamProps {
  team: User[];
  currentUser: User;
  onRemoveUser: (id: string) => void;
  onRefetch?: () => void;
}

const Team: React.FC<TeamProps> = ({ team, currentUser, onRemoveUser, onRefetch }) => {
  const { sanitizeForm } = useSanitize();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<Partial<User & { password?: string }>>({
    name: '',
    email: '',
    phone: '',
    role: UserRole.BROKER,
    password: ''
  });

  // Auto-Save integration
  const { isSaving, lastSaved } = useAutoSave({
    key: TEAM_DRAFT_KEY,
    data: !editingUser && isModalOpen ? formData : null,
    debounceMs: 2000
  });

  // Check for draft on modal open (Automatic Restoration)
  useEffect(() => {
    if (isModalOpen && !editingUser) {
      const draft = loadDraft<Partial<User & { password?: string }>>(TEAM_DRAFT_KEY);
      if (draft && (draft.name || draft.email)) {
        setFormData(draft);
      }
    }
  }, [isModalOpen, editingUser]);


  const openModal = (user?: User) => {
    if (user) {
      setEditingUser(user);
      setFormData(user);
    } else {
      setEditingUser(null);
      setFormData({
        name: '',
        email: '',
        phone: '',
        role: UserRole.BROKER,
        password: ''
      });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingUser(null);
    setLoading(false);
    setFormData({
      name: '',
      email: '',
      phone: '',
      role: UserRole.BROKER,
      password: ''
    });
    clearDraft(TEAM_DRAFT_KEY);
  };

  const handleSave = async () => {
    if (!formData.name || !formData.email) {
      alert("Por favor, preencha nome e e-mail.");
      return;
    }

    setLoading(true);
    try {
      const sanitized = sanitizeForm(formData);

      if (editingUser) {
        // Update user
        const { error } = await supabase
          .from('users')
          .update({
            name: sanitized.name,
            phone: sanitized.phone,
            role: sanitized.role
          })
          .eq('id', editingUser.id);

        if (error) throw error;
      } else {
        // 1. Create in Supabase Auth using a temporary client
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

        if (formData.password && supabaseUrl && anonKey) {
          const { createClient } = await import('@supabase/supabase-js');
          const tempClient = createClient(supabaseUrl, anonKey, {
            auth: { persistSession: false, autoRefreshToken: false }
          });

          const { error: authError } = await tempClient.auth.signUp({
            email: sanitized.email, // ✅ Sanitizado
            password: formData.password, // ❌ Não sanitizar senha
            options: {
              data: { name: sanitized.name } // ✅ Sanitizado
            }
          });

          if (authError && !authError.message.includes('already registered') && !authError.message.includes('already exists')) {
            throw new Error(`Erro Auth: ${authError.message}`);
          }
        } else if (formData.password) {
          throw new Error('Chaves VITE_SUPABASE_URL ou VITE_SUPABASE_ANON_KEY não configuradas.');
        }

        // 2. Create in public.users table
        const { error: dbError } = await supabase
          .from('users')
          .upsert([{
            name: sanitized.name,
            email: sanitized.email,
            phone: sanitized.phone,
            role: sanitized.role,
            agency_id: currentUser.agency_id
          }], { onConflict: 'email' });

        if (dbError) throw dbError;
      }

      if (onRefetch) onRefetch();
      clearDraft(TEAM_DRAFT_KEY);
      closeModal();
    } catch (error: any) {
      console.error('Erro ao salvar usuário:', error);
      alert('Erro ao salvar usuário: ' + (error.message || 'Erro inesperado'));
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = (id: string) => {
    if (id === currentUser.id) {
      alert("Você não pode remover a si mesmo.");
      return;
    }
    if (confirm("Tem certeza que deseja remover este membro da equipe? Todas as comissões associadas a ele também serão removidas.")) {
      onRemoveUser(id);
    }
  };

  return (
    <div className="space-y-6 page-transition">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="header-title">Membros da Equipe</h1>
          <p className="header-subtitle">Gerencie os acessos e perfis da sua imobiliária</p>
        </div>
        <button
          onClick={() => openModal()}
          className="btn-primary flex items-center gap-2"
        >
          <UserPlus size={20} /> Adicionar Membro
        </button>
      </div>

      <div className="card-base border-none p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="table-base">
            <thead>
              <tr>
                <th>Membro</th>
                <th>E-mail</th>
                <th>Cargo / Perfil</th>
                <th>ID</th>
                <th className="text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {team.map(user => (
                <tr key={user.id} className="group">
                  <td>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold text-sm border-2 border-white shadow-sm">
                        {user.name.charAt(0)}
                      </div>
                      <span className="font-bold text-slate-800">{user.name}</span>
                    </div>
                  </td>
                  <td className="text-slate-500 font-medium">{user.email}</td>
                  <td>
                    <span className={`text-[10px] px-2.5 py-1 rounded-lg font-black uppercase tracking-wider ${user.role === UserRole.ADMIN
                      ? 'bg-indigo-50 text-indigo-600 border border-indigo-100'
                      : 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                      }`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="text-[10px] font-bold text-slate-300">#{user.id.substring(0, 6)}</td>
                  <td className="text-right">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => openModal(user)}
                        className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Editar"
                      >
                        <Edit size={16} />
                      </button>
                      {user.id !== currentUser.id && (
                        <button
                          onClick={() => handleRemove(user.id)}
                          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Remover"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Adição / Edição */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-[32px] shadow-2xl overflow-hidden animate-in zoom-in duration-200">
            <div className="p-6 border-b border-slate-50 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-slate-800">{editingUser ? 'Editar Membro' : 'Novo Membro'}</h3>
                <p className="text-xs text-slate-400">Configure as informações do usuário.</p>
              </div>
              <button onClick={closeModal} className="bg-slate-50 p-2 rounded-full text-slate-400 hover:text-slate-600 transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Nome Completo</label>
                <div className="relative">
                  <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input
                    type="text"
                    value={formData.name}
                    placeholder="Ex: João da Silva"
                    className="w-full pl-11 pr-4 py-3 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-blue-100 outline-none text-sm font-semibold"
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">E-mail</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input
                    type="email"
                    value={formData.email}
                    placeholder="joao@imobiliaria.com"
                    className="w-full pl-11 pr-4 py-3 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-blue-100 outline-none text-sm font-semibold"
                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">WhatsApp (DDD + Número)</label>
                <div className="relative">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input
                    type="text"
                    value={formData.phone || ''}
                    placeholder="Ex: 11999999999"
                    className="w-full pl-11 pr-4 py-3 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-blue-100 outline-none text-sm font-semibold"
                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Perfil de Acesso</label>
                <div className="relative">
                  <Shield className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <select
                    className="w-full pl-11 pr-4 py-3 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-blue-100 outline-none text-sm font-semibold appearance-none cursor-pointer"
                    value={formData.role}
                    onChange={e => setFormData({ ...formData, role: e.target.value as UserRole })}
                  >
                    <option value={UserRole.BROKER}>Corretor (BROKER)</option>
                    <option value={UserRole.ADMIN}>Administrador (ADMIN)</option>
                  </select>
                </div>
              </div>

              {!editingUser && (
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Senha Inicial</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input
                      type="password"
                      value={formData.password || ''}
                      placeholder="••••••••"
                      className="w-full pl-11 pr-4 py-3 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-blue-100 outline-none text-sm font-semibold"
                      onChange={e => setFormData({ ...formData, password: e.target.value })}
                    />
                  </div>
                  <p className="text-[10px] text-slate-400 px-1">O corretor poderá alterar esta senha depois.</p>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-slate-50 bg-slate-50/50 flex justify-end gap-3">
              <button
                onClick={closeModal}
                className="px-6 py-2.5 text-slate-400 font-bold hover:text-slate-600 hover:underline transition-all text-sm"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-2.5 rounded-xl font-bold transition-all shadow-lg shadow-blue-100 text-sm"
              >
                Salvar Membro
              </button>
            </div>
          </div>
        </div>
      )}

      <AutoSaveIndicator isSaving={isSaving} lastSaved={lastSaved} />
    </div>
  );
};

export default Team;
