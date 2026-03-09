import React, { useState } from 'react';
import { Building2, AlertCircle, Mail, Lock, User as UserIcon, Globe, ArrowRight, ShieldCheck } from 'lucide-react';
import { supabase } from '../src/lib/supabaseClient';
import { UserRole, Agency } from '../types';

interface RegisterProps {
    onBackToLogin: () => void;
    agency: Agency | null;
}

const Register: React.FC<RegisterProps> = ({ onBackToLogin, agency }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [agencyName, setAgencyName] = useState('');
    const [slug, setSlug] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            // 1. Create Auth User
            const { data: authData, error: authError } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: { name }
                }
            });

            if (authError) throw authError;
            if (!authData.user) throw new Error('Não foi possível criar o usuário.');

            // 2. Create Agency
            const { data: agencyData, error: agencyError } = await supabase
                .from('agencies')
                .insert([{
                    name: agencyName,
                    slug: slug.toLowerCase().replace(/\s+/g, '-'),
                }])
                .select()
                .single();

            if (agencyError) {
                if (agencyError.message.includes('unique constraint')) {
                    throw new Error('Este endereço (URL) já está em uso. Tente outro.');
                }
                throw agencyError;
            }

            // 3. Create User Profile linked to Agency
            const { error: userError } = await supabase
                .from('users')
                .insert([{
                    id: authData.user.id,
                    name,
                    email,
                    role: UserRole.ADMIN,
                    agency_id: agencyData.slug // We use slug as the agency_id for now as per current schema pattern
                }]);

            if (userError) throw userError;

            setSuccess(true);
        } catch (err: any) {
            console.error('Erro no cadastro:', err);
            setError(err.message || 'Ocorreu um erro ao realizar o cadastro.');
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#f8fafc] p-4 font-sans relative overflow-hidden">
                <div className="absolute inset-0 pointer-events-none opacity-[0.4]"
                    style={{
                        backgroundImage: `linear-gradient(#e5e7eb 1px, transparent 1px), linear-gradient(90deg, #e5e7eb 1px, transparent 1px)`,
                        backgroundSize: '40px 40px'
                    }}
                />
                <div className="bg-white p-12 rounded-[40px] shadow-[0_20px_50px_rgba(0,0,0,0.1)] w-full max-w-[520px] border border-slate-100 flex flex-col items-center text-center relative z-10">
                    <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mb-6">
                        <ShieldCheck size={40} className="text-emerald-600" />
                    </div>
                    <h1 className="text-3xl font-black text-[#1e3a5f] mb-4">Conta Criada!</h1>
                    <p className="text-slate-500 font-medium mb-8">
                        Sua imobiliária <strong>{agencyName}</strong> foi cadastrada com sucesso.
                        Verifique seu e-mail para confirmar a conta e comece a usar.
                    </p>
                    <button
                        onClick={onBackToLogin}
                        className="w-full bg-[#1e3a5f] hover:bg-[#162a45] text-white font-black py-4.5 px-6 rounded-[20px] transition-all duration-300 shadow-xl shadow-[#1e3a5f]/20 uppercase tracking-[0.1em]"
                    >
                        Ir para o Login
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#f8fafc] p-4 font-sans relative overflow-hidden">
            <div className="absolute inset-0 pointer-events-none opacity-[0.4]"
                style={{
                    backgroundImage: `linear-gradient(#e5e7eb 1px, transparent 1px), linear-gradient(90deg, #e5e7eb 1px, transparent 1px)`,
                    backgroundSize: '40px 40px'
                }}
            />

            <div className="flex flex-col items-center gap-8 relative z-10 w-full max-w-[560px]">
                <div className="bg-white p-10 rounded-[40px] shadow-[0_20px_50px_rgba(0,0,0,0.1)] w-full border border-slate-100">
                    <div className="mb-8 text-center">
                        <img src="/logo.png" alt="ComissOne" className="h-16 w-auto mx-auto mb-4" />
                        <h1 className="text-2xl font-black text-[#1e3a5f] mb-2">Comece sua Jornada</h1>
                        <p className="text-slate-500 font-medium text-sm">Crie sua conta administrativa em segundos</p>
                    </div>

                    <form onSubmit={handleRegister} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="relative">
                                <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                                <input
                                    type="text"
                                    value={name}
                                    onChange={e => setName(e.target.value)}
                                    placeholder="Seu Nome"
                                    required
                                    className="w-full pl-12 pr-4 py-4 bg-[#fcfdfe] border border-slate-200 rounded-[18px] text-sm outline-none focus:border-blue-400 transition-all"
                                />
                            </div>
                            <div className="relative">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                                <input
                                    type="email"
                                    value={email}
                                    onChange={e => setEmail(e.target.value)}
                                    placeholder="Seu E-mail"
                                    required
                                    className="w-full pl-12 pr-4 py-4 bg-[#fcfdfe] border border-slate-200 rounded-[18px] text-sm outline-none focus:border-blue-400 transition-all"
                                />
                            </div>
                        </div>

                        <div className="relative">
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                            <input
                                type="password"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                placeholder="Crie uma Senha"
                                required
                                className="w-full pl-12 pr-4 py-4 bg-[#fcfdfe] border border-slate-200 rounded-[18px] text-sm outline-none focus:border-blue-400 transition-all"
                            />
                        </div>

                        <div className="pt-2">
                            <div className="flex items-center gap-2 mb-3 ml-1">
                                <Building2 size={16} className="text-blue-600" />
                                <span className="text-[10px] font-black text-[#1e3a5f] uppercase tracking-widest">Sua Imobiliária</span>
                            </div>
                            <div className="space-y-4">
                                <input
                                    type="text"
                                    value={agencyName}
                                    onChange={e => setAgencyName(e.target.value)}
                                    placeholder="Nome da Imobiliária"
                                    required
                                    className="w-full px-5 py-4 bg-[#fcfdfe] border border-slate-200 rounded-[18px] text-sm outline-none focus:border-blue-400 transition-all"
                                />
                                <div className="relative">
                                    <Globe className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                                    <input
                                        type="text"
                                        value={slug}
                                        onChange={e => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                                        placeholder="url-da-imobiliaria"
                                        required
                                        className="w-full pl-12 pr-32 py-4 bg-[#fcfdfe] border border-slate-200 rounded-[18px] text-sm outline-none focus:border-blue-400 transition-all"
                                    />
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400 uppercase">
                                        .comissone.com.br
                                    </div>
                                </div>
                            </div>
                        </div>

                        {error && (
                            <div className="bg-red-50 text-red-600 p-4 rounded-2xl border border-red-100 flex items-center gap-2 animate-in fade-in zoom-in duration-200">
                                <AlertCircle size={18} />
                                <p className="text-xs font-bold">{error}</p>
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full flex items-center justify-center gap-3 bg-[#1e3a5f] hover:bg-[#162a45] text-white font-black py-4.5 rounded-[20px] transition-all duration-300 shadow-xl shadow-[#1e3a5f]/20 uppercase tracking-[0.1em] text-xs disabled:opacity-60"
                        >
                            {loading ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <span className="flex items-center gap-2">Criar Minha Conta <ArrowRight size={18} /></span>
                            )}
                        </button>
                    </form>

                    <div className="mt-8 pt-6 border-t border-slate-50 text-center">
                        <button
                            onClick={onBackToLogin}
                            className="text-xs text-[#1e3a5f] hover:text-blue-700 hover:underline font-bold transition-all"
                        >
                            Já tem uma imobiliária? Faça login
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Register;
