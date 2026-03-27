
import React, { useState, useRef } from 'react';
import { User, UserRole } from '../types';

interface ProfileSettingsProps {
  currentUser: User;
  activeView: 'profile' | 'settings';
  theme: string;
  setTheme: (theme: string) => void;
}

const ProfileSettings: React.FC<ProfileSettingsProps> = ({ currentUser, activeView, theme, setTheme }) => {
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePhotoClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight mb-2">
          {activeView === 'profile' ? 'Meu Perfil' : 'Configurações do Sistema'}
        </h1>
        <p className="text-slate-500 dark:text-slate-400 font-medium">
          {activeView === 'profile' 
            ? 'Gerencie suas informações pessoais e como você aparece para a equipe.' 
            : 'Personalize sua experiência e ajuste as preferências globais da conta.'}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Lado Esquerdo: Resumo do Perfil */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-[32px] p-8 border border-slate-200/60 dark:border-slate-800 shadow-sm relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 dark:bg-blue-500/10 rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-110"></div>
            
            <div className="relative flex flex-col items-center py-4">
              <div className="relative mb-6">
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  className="hidden" 
                  accept="image/*" 
                  onChange={handleFileChange}
                />
                <div 
                  onClick={handlePhotoClick}
                  className="w-28 h-28 bg-blue-100 dark:bg-slate-800 rounded-[40px] flex items-center justify-center text-blue-600 dark:text-blue-400 font-black text-4xl shadow-xl border-4 border-white dark:border-slate-900 cursor-pointer overflow-hidden group/avatar"
                >
                  {photoPreview ? (
                    <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    currentUser.name.charAt(0)
                  )}
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover/avatar:opacity-100 transition-opacity">
                    <span className="material-symbols-outlined text-white text-2xl">photo_camera</span>
                  </div>
                </div>
                <button 
                  onClick={handlePhotoClick}
                  className="absolute bottom-0 right-0 w-10 h-10 bg-blue-600 text-white rounded-2xl flex items-center justify-center shadow-lg border-2 border-white hover:bg-blue-700 transition-all hover:scale-110 active:scale-95 z-10"
                >
                  <span className="material-symbols-outlined text-xl">edit</span>
                </button>
              </div>
              
              <h2 className="text-xl font-black text-slate-900 dark:text-white mb-1">{currentUser.name}</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 font-medium mb-4">{currentUser.email}</p>
              
              <span className={`px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${
                currentUser.role === UserRole.ADMIN 
                ? 'bg-indigo-50 text-indigo-700 border-indigo-100' 
                : 'bg-emerald-50 text-emerald-700 border-emerald-100'
              }`}>
                {currentUser.role}
              </span>
            </div>

            <div className="mt-8 pt-8 border-t border-slate-100 dark:border-slate-800">
              <div className="space-y-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500 font-medium">Status da Conta</span>
                  <span className="text-emerald-600 font-black uppercase text-[10px] tracking-widest bg-emerald-50 px-2 py-0.5 rounded">Ativo</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500 font-medium">Membro desde</span>
                  <span className="text-slate-700 font-bold">Nov 2023</span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-[32px] p-8 text-white shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16"></div>
            <h3 className="text-lg font-black mb-2 relative z-10 tracking-tight">ComissOne V2.5</h3>
            <p className="text-slate-400 text-xs font-medium mb-6 relative z-10 leading-relaxed uppercase tracking-widest">Premium Intelligence</p>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-white/10 rounded-lg border border-white/5 w-fit">
              <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse"></div>
              <span className="text-[10px] font-black uppercase text-emerald-400">Sistema Online</span>
            </div>
          </div>
        </div>

        {/* Lado Direito: Formulários Dinâmicos */}
        <div className="lg:col-span-2">
          {activeView === 'profile' ? (
            <>
              <div className="bg-white dark:bg-slate-900 rounded-[32px] border border-slate-200/60 dark:border-slate-800 shadow-sm overflow-hidden mb-8">
                <div className="p-8 border-b border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-800/30 flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">Informações Básicas</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1 uppercase tracking-widest">Atualize seus dados de contato</p>
                  </div>
                  <button className="px-6 py-2.5 bg-blue-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20 active:scale-95">Salvar Perfil</button>
                </div>
                
                <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Nome Completo</label>
                    <div className="relative group">
                      <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-500 transition-colors">person</span>
                      <input 
                        type="text" 
                        defaultValue={currentUser.name}
                        className="w-full pl-12 pr-6 py-3.5 bg-slate-50 dark:bg-slate-800/50 border border-transparent dark:border-slate-800 rounded-[20px] outline-none focus:bg-white dark:focus:bg-slate-800 focus:border-blue-200 dark:focus:border-blue-500/30 transition-all font-medium text-slate-700 dark:text-slate-200"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">E-mail</label>
                    <div className="relative group grayscale opacity-60">
                      <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-300">mail</span>
                      <input 
                        type="email" 
                        defaultValue={currentUser.email}
                        disabled
                        className="w-full pl-12 pr-6 py-3.5 bg-slate-100 dark:bg-slate-800 border border-transparent rounded-[20px] outline-none font-medium text-slate-500 cursor-not-allowed"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Telefone / WhatsApp</label>
                    <div className="relative group">
                      <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-500 transition-colors">call</span>
                      <input 
                        type="text" 
                        placeholder="(00) 00000-0000"
                        className="w-full pl-12 pr-6 py-3.5 bg-slate-50 dark:bg-slate-800/50 border border-transparent dark:border-slate-800 rounded-[20px] outline-none focus:bg-white dark:focus:bg-slate-800 focus:border-blue-200 dark:focus:border-blue-500/30 transition-all font-medium text-slate-700 dark:text-slate-200"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Cargo / Função</label>
                    <div className="relative group">
                      <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-500 transition-colors">badge</span>
                      <input 
                        type="text" 
                        defaultValue={currentUser.role === UserRole.ADMIN ? 'Gestor Imobiliário' : 'Consultor de Vendas'}
                        className="w-full pl-12 pr-6 py-3.5 bg-slate-50 dark:bg-slate-800/50 border border-transparent dark:border-slate-800 rounded-[20px] outline-none focus:bg-white dark:focus:bg-slate-800 focus:border-blue-200 dark:focus:border-blue-500/30 transition-all font-medium text-slate-700 dark:text-slate-200"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 rounded-[32px] border border-slate-200/60 dark:border-slate-800 shadow-sm overflow-hidden mb-8">
                <div className="p-8 border-b border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-800/30">
                  <h3 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">Segurança</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1 uppercase tracking-widest">Altere sua senha de acesso</p>
                </div>
                
                <div className="p-8">
                   <button 
                     onClick={async () => {
                       const { supabase } = await import('../src/lib/supabaseClient');
                       const { error } = await supabase.auth.resetPasswordForEmail(currentUser.email, {
                         redirectTo: `${window.location.origin}/reset-password`,
                       });
                       if (error) alert('Erro: ' + error.message);
                       else alert('E-mail de redefinição enviado!');
                     }}
                     className="w-full flex items-center justify-between p-6 bg-slate-50 dark:bg-slate-800/50 rounded-[24px] group hover:bg-blue-50/50 dark:hover:bg-blue-900/20 transition-all cursor-pointer border border-transparent hover:border-blue-100 dark:hover:border-blue-800"
                   >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-white dark:bg-slate-800 rounded-2xl flex items-center justify-center text-slate-400 group-hover:text-blue-600 shadow-sm transition-all">
                        <span className="material-symbols-outlined text-2xl">password</span>
                      </div>
                      <div className="text-left">
                        <h4 className="text-sm font-black text-slate-800 dark:text-slate-200">Redefinir Senha</h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Enviaremos um link para {currentUser.email}</p>
                      </div>
                    </div>
                    <span className="material-symbols-outlined text-slate-300 group-hover:translate-x-1 transition-transform">send</span>
                  </button>
                </div>
              </div>

              {/* Seção de Acesso Rápido (v2.6) */}
              <div className="bg-white dark:bg-slate-900 rounded-[32px] border border-slate-200/60 dark:border-slate-800 shadow-sm overflow-hidden mb-8">
                <div className="p-8 border-b border-slate-100 dark:border-slate-800 bg-blue-50/20 dark:bg-blue-900/10">
                  <h3 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">Portal de Acesso</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1 uppercase tracking-widest">Link pessoal para acesso rápido</p>
                </div>
                
                <div className="p-8 space-y-6">
                  <div className="space-y-4">
                    <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Seu Link Local (Ambiente Atual)</p>
                      <div className="flex items-center justify-between">
                        <code className="text-xs font-mono text-blue-600 dark:text-blue-400">{window.location.origin}</code>
                        <button 
                          onClick={() => {
                            navigator.clipboard.writeText(window.location.origin);
                            alert('Link copiado!');
                          }}
                          className="p-2 text-slate-400 hover:text-blue-600 transition-colors"
                        >
                          <span className="material-symbols-outlined text-lg">content_copy</span>
                        </button>
                      </div>
                    </div>

                    <button 
                      onClick={async () => {
                        const { supabase } = await import('../src/lib/supabaseClient');
                        const { error } = await supabase.auth.signInWithOtp({
                          email: currentUser.email,
                          options: { emailRedirectTo: window.location.origin }
                        });
                        if (error) alert('Erro: ' + error.message);
                        else alert('Link mágico enviado para seu e-mail!');
                      }}
                      className="w-full flex items-center justify-center gap-3 p-4 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400 rounded-[24px] hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-all font-black uppercase text-[11px] tracking-widest group border border-indigo-100 dark:border-indigo-800"
                    >
                      <span className="material-symbols-outlined text-[20px] group-hover:scale-110 transition-transform">bolt</span>
                      Enviar Link de Acesso p/ Mim
                    </button>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="bg-white dark:bg-slate-900 rounded-[32px] border border-slate-200/60 dark:border-slate-800 shadow-sm overflow-hidden mb-8">
                <div className="p-8 border-b border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-800/30 flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">Preferências da Conta</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1 uppercase tracking-widest">Personalize sua experiência no ComissOne</p>
                  </div>
                  <button className="px-6 py-2.5 bg-blue-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20 active:scale-95">Salvar Ajustes</button>
                </div>
                
                <div className="p-8 space-y-4">
                  {/* Notificações por E-mail */}
                  <div className="flex items-center justify-between p-6 bg-slate-50/50 dark:bg-slate-800/50 rounded-[24px] border border-slate-100/50 dark:border-slate-800/50 hover:bg-white dark:hover:bg-slate-800 hover:shadow-md transition-all duration-300">
                    <div className="flex items-center gap-5">
                      <div className="w-12 h-12 bg-white dark:bg-slate-800 rounded-2xl flex items-center justify-center text-blue-600 shadow-sm border border-slate-100 dark:border-slate-700">
                        <span className="material-symbols-outlined text-2xl">mail</span>
                      </div>
                      <div>
                        <h4 className="text-[15px] font-black text-slate-800 dark:text-slate-200 mb-0.5">Notificações por E-mail</h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Receba alertas sobre vencimentos de contas e comissões</p>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer group">
                      <input type="checkbox" className="sr-only peer" defaultChecked />
                      <div className="w-11 h-6 bg-slate-200 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600 shadow-inner"></div>
                    </label>
                  </div>

                  {/* Modo Escuro */}
                  <div className="flex items-center justify-between p-6 bg-slate-50/50 dark:bg-slate-800/50 rounded-[24px] border border-slate-100/50 dark:border-slate-800/50 hover:bg-white dark:hover:bg-slate-800 hover:shadow-md transition-all duration-300">
                    <div className="flex items-center gap-5">
                      <div className="w-12 h-12 bg-white dark:bg-slate-800 rounded-2xl flex items-center justify-center text-slate-400 shadow-sm border border-slate-100 dark:border-slate-700">
                        <span className="material-symbols-outlined text-2xl">dark_mode</span>
                      </div>
                      <div>
                        <h4 className="text-[15px] font-black text-slate-800 dark:text-slate-200 mb-0.5">Modo Escuro</h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Alternar visual do sistema entre tema claro e escuro</p>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer group">
                      <input 
                        type="checkbox" 
                        className="sr-only peer" 
                        checked={theme === 'dark'}
                        onChange={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                      />
                      <div className="w-11 h-6 bg-slate-200 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-slate-800 shadow-inner"></div>
                    </label>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 rounded-[32px] border border-slate-200/60 dark:border-slate-800 shadow-sm overflow-hidden">
                <div className="p-8 border-b border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-800/30">
                  <h3 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">Interface e Idioma</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1 uppercase tracking-widest">Ajuste a localização do sistema</p>
                </div>
                
                <div className="p-8 space-y-4">
                  <div className="flex items-center justify-between p-5 bg-slate-50/50 dark:bg-slate-800/50 rounded-2xl border border-slate-100/50 dark:border-slate-800/50">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-white dark:bg-slate-800 rounded-xl flex items-center justify-center text-slate-400 shadow-sm border border-slate-100 dark:border-slate-700">
                        <span className="material-symbols-outlined text-xl">language</span>
                      </div>
                      <div>
                        <h4 className="text-sm font-black text-slate-800 dark:text-slate-200">Idioma do Sistema</h4>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">Português (Brasil)</p>
                      </div>
                    </div>
                    <button className="px-4 py-2 bg-white dark:bg-slate-800 text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest border border-slate-100 dark:border-slate-700 rounded-xl hover:bg-blue-50 dark:hover:bg-blue-900/40 transition-colors">Alterar</button>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfileSettings;
