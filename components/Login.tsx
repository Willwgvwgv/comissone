import React, { useState } from 'react';
import { AlertCircle, Mail, Lock, Eye, EyeOff, ArrowRight, CheckCircle2 } from 'lucide-react';
import { supabase } from '../src/lib/supabaseClient';
import { Agency } from '../types';

interface LoginProps {
    onLogin: () => void;
    onRegister: () => void;
    agency: Agency | null;
}

const Login: React.FC<LoginProps> = ({ onLogin, onRegister, agency }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [resetSent, setResetSent] = useState(false);
    const [magicLinkSent, setMagicLinkSent] = useState(false);
    const [mode, setMode] = useState<'login' | 'reset' | 'magic'>('login');

    const handleEmailLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const { error: err } = await supabase.auth.signInWithPassword({ email, password });
            if (err) {
                if (err.message.includes('Invalid login credentials')) {
                    setError('E-mail ou senha incorretos.');
                } else {
                    setError(err.message);
                }
            } else {
                onLogin();
            }
        } catch {
            setError('Erro inesperado. Tente novamente.');
        } finally {
            setLoading(false);
        }
    };

    const handleMagicLink = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const { error: err } = await supabase.auth.signInWithOtp({
                email,
                options: { emailRedirectTo: window.location.origin }
            });
            if (err) {
                if (err.message.includes('rate limit')) {
                    setError('Muitas tentativas. Aguarde alguns minutos ou use outro método.');
                } else {
                    setError(err.message);
                }
            } else {
                setMagicLinkSent(true);
            }
        } catch {
            setError('Erro ao enviar link. Tente novamente.');
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleLogin = async () => {
        setError('');
        setLoading(true);
        try {
            const { error: err } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: { redirectTo: window.location.origin },
            });
            if (err) setError(err.message);
        } catch {
            setError('Erro ao conectar com Google.');
        } finally {
            setLoading(false);
        }
    };

    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/reset-password`,
            });
            if (err) {
                if (err.message.includes('rate limit')) {
                    setError('Limite de envio atingido. Tente novamente em 1 hora ou use o Google.');
                } else {
                    setError(err.message);
                }
            } else setResetSent(true);
        } catch {
            setError('Erro ao enviar email de recuperação.');
        } finally {
            setLoading(false);
        }
    };

    const bullets = [
        'Controle total das comissões',
        'Gestão de vendas imobiliárias',
        'Relatórios inteligentes de performance',
    ];

    return (
        <div className="min-h-screen flex font-sans bg-white">

            {/* ══ LEFT PANEL ══ */}
            <div
                className="hidden lg:flex lg:w-1/2 flex-col justify-between p-16 relative overflow-hidden"
                style={{ background: 'linear-gradient(135deg, #0f2744 0%, #1a4075 50%, #1e5fa8 100%)' }}
            >
                {/* Removed Grid overlay and Glow blobs */}

                {/* Main content */}
                <div className="relative z-10">
                    {/* Badge */}
                    <div
                        className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-white/20 mb-14"
                        style={{ background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(8px)' }}
                    >
                        <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                        <span className="text-[11px] font-black tracking-[0.12em] uppercase text-white/80">
                            Plataforma Imobiliária
                        </span>
                    </div>

                    <h1 className="text-5xl xl:text-6xl font-black leading-[1.08] text-white mb-7 tracking-tight">
                        Potencialize sua gestão imobiliária com precisão
                    </h1>

                    <p className="text-lg text-blue-200/75 font-medium leading-relaxed mb-12 max-w-md">
                        A plataforma completa para gestão de comissões, vendas e performance de corretores.
                    </p>

                    {/* Bullets */}
                    <ul className="space-y-4">
                        {bullets.map((b) => (
                            <li key={b} className="flex items-center gap-3">
                                <div
                                    className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
                                    style={{ background: 'rgba(16,185,129,0.2)', border: '1px solid rgba(16,185,129,0.4)' }}
                                >
                                    <CheckCircle2 size={14} className="text-emerald-400" />
                                </div>
                                <span className="text-white/85 font-medium text-[15px]">{b}</span>
                            </li>
                        ))}
                    </ul>
                </div>


            </div>

            {/* ══ RIGHT PANEL ══ */}
            <div
                className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-10 lg:p-16"
                style={{ background: '#f8fafc' }}
            >
                <div className="w-full max-w-[480px]">

                    {/* Card */}
                    <div className="bg-white rounded-[20px] p-8 shadow-[0_20px_40px_rgba(0,0,0,0.08)] border border-slate-100 w-full max-w-[420px]">

                        {/* Identidade Textual (sem logo) */}
                        <div className="flex flex-col items-center mb-10">
                            <h2 className="text-3xl font-black text-slate-800 tracking-tight">comissOne</h2>
                            <div className="w-10 h-1 bg-blue-600 rounded-full mt-2 mb-4"></div>
                            <p className="text-sm text-slate-500 font-medium">Plataforma de Gestão de Vendas e Comissões</p>
                        </div>

                        {/* Headings */}
                        {mode === 'login' && (
                            <div className="text-center mb-6">
                                <h2 className="text-2xl font-black text-slate-800 mb-2">
                                    {agency ? `Acesso — ${agency.name}` : 'Bem-vindo ao ComissOne'}
                                </h2>
                                <p className="text-slate-400 text-sm font-medium">
                                    {agency
                                        ? `Acesse a plataforma exclusiva da ${agency.name}`
                                        : 'Acesse sua conta para gerenciar vendas e comissões.'}
                                </p>
                            </div>
                        )}
                        {mode === 'magic' && (
                            <div className="text-center mb-6">
                                <h2 className="text-2xl font-black text-slate-800 mb-2">Acesso sem senha</h2>
                                <p className="text-slate-400 text-sm font-medium">Enviaremos um link mágico para seu e-mail</p>
                            </div>
                        )}
                        {mode === 'reset' && (
                            <div className="text-center mb-6">
                                <h2 className="text-2xl font-black text-slate-800 mb-2">Recuperar senha</h2>
                                <p className="text-slate-400 text-sm font-medium">Digite seu e-mail para receber as instruções</p>
                            </div>
                        )}

                        {/* ── LOGIN FORM ── */}
                        {mode === 'login' && !resetSent && !magicLinkSent && (
                            <div className="space-y-6">

                                {/* Google Button */}
                                <button
                                    onClick={handleGoogleLogin}
                                    disabled={loading}
                                    className="w-full flex items-center justify-center gap-[10px] h-[48px] bg-white border border-[#E5E7EB] rounded-[12px] font-semibold text-slate-700 text-sm hover:bg-[#F9FAFB] transition-all shadow-sm active:scale-[0.98] disabled:opacity-60"
                                >
                                    <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M17.64 9.20455C17.64 8.56636 17.5827 7.95273 17.4764 7.36364H9V10.845H13.8436C13.635 11.97 13.0009 12.9232 12.0477 13.5614V15.8195H14.9564C16.6582 14.2527 17.64 11.9455 17.64 9.20455Z" fill="#4285F4" />
                                        <path d="M9 18C11.43 18 13.4673 17.1941 14.9564 15.8195L12.0477 13.5614C11.2418 14.1014 10.2109 14.4205 9 14.4205C6.65591 14.4205 4.67182 12.8373 3.96409 10.71H1.02273V12.9127C2.50364 15.8595 5.51318 18 9 18Z" fill="#34A853" />
                                        <path d="M3.96409 10.71C3.78409 10.17 3.68182 9.59318 3.68182 9C3.68182 8.40682 3.78409 7.83 3.96409 7.29V5.08727H1.02273C0.413182 6.3 0.0681818 7.61318 0.0681818 9C0.0681818 10.3868 0.413182 11.7 1.02273 12.9127L3.96409 10.71Z" fill="#FBBC05" />
                                        <path d="M9 3.57955C10.3214 3.57955 11.5077 4.03364 12.4405 4.92545L15.0218 2.34409C13.4632 0.891818 11.4259 0 9 0C5.51318 0 2.50364 2.14045 1.02273 5.08727L3.96409 7.29C4.67182 5.16273 6.65591 3.57955 9 3.57955Z" fill="#EA4335" />
                                    </svg>
                                    Entrar com Google
                                </button>

                                {/* Divider */}
                                <div className="flex items-center gap-3">
                                    <div className="flex-1 h-px bg-slate-100" />
                                    <span className="text-[11px] font-bold text-slate-300 uppercase tracking-widest">ou</span>
                                    <div className="flex-1 h-px bg-slate-100" />
                                </div>

                                {/* Email + Password */}
                                <form onSubmit={handleEmailLogin} className="space-y-4">
                                    <div className="relative group">
                                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-[#2563EB] transition-colors" size={18} />
                                        <input
                                            type="email"
                                            value={email}
                                            onChange={e => setEmail(e.target.value)}
                                            placeholder="seu@email.com"
                                            required
                                            className="w-full h-[48px] pl-11 pr-4 bg-slate-50 border border-slate-200 rounded-xl text-[15px] text-slate-800 placeholder-slate-400 focus:border-[#2563EB] focus:ring-4 focus:ring-[rgba(37,99,235,0.1)] focus:bg-white outline-none transition-all"
                                        />
                                    </div>

                                    <div className="relative group">
                                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-[#2563EB] transition-colors" size={18} />
                                        <input
                                            type={showPassword ? 'text' : 'password'}
                                            value={password}
                                            onChange={e => setPassword(e.target.value)}
                                            placeholder="Sua senha"
                                            required
                                            className="w-full h-[48px] pl-11 pr-12 bg-slate-50 border border-slate-200 rounded-xl text-[15px] text-slate-800 placeholder-slate-400 focus:border-[#2563EB] focus:ring-4 focus:ring-[rgba(37,99,235,0.1)] focus:bg-white outline-none transition-all"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500 transition-colors"
                                        >
                                            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                        </button>
                                    </div>

                                    <div className="flex justify-between items-center px-0.5">
                                        <button
                                            type="button"
                                            onClick={() => setMode('magic')}
                                            className="text-xs font-semibold text-slate-400 hover:text-blue-600 hover:underline transition-all"
                                        >
                                            Acesso rápido (link)
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setMode('reset')}
                                            className="text-xs font-semibold text-slate-400 hover:text-blue-600 hover:underline transition-all"
                                        >
                                            Esqueceu a senha?
                                        </button>
                                    </div>

                                    {error && (
                                        <div className="bg-red-50 text-red-600 p-3.5 rounded-xl border border-red-100 flex items-center gap-3 text-xs font-semibold">
                                            <AlertCircle size={16} className="flex-shrink-0" />
                                            {error}
                                        </div>
                                    )}

                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="w-full h-[50px] flex items-center justify-center gap-2.5 rounded-xl font-bold text-white text-sm tracking-wide transition-all disabled:opacity-60 active:scale-[0.98]"
                                        style={{
                                            background: 'linear-gradient(90deg, #1E3A8A, #2563EB)',
                                            boxShadow: '0 4px 24px rgba(37,99,235,0.35)'
                                        }}
                                    >
                                        {loading ? (
                                            <>
                                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                Verificando...
                                            </>
                                        ) : (
                                            <>ACESSAR SISTEMA <ArrowRight size={18} /></>
                                        )}
                                    </button>

                                    <p className="text-center text-xs text-slate-400 pt-1">
                                        Novo por aqui?{' '}
                                        <button
                                            type="button"
                                            onClick={onRegister}
                                            className="font-bold text-blue-600 hover:text-blue-700 hover:underline transition-all"
                                        >
                                            Cadastre sua imobiliária
                                        </button>
                                    </p>
                                </form>
                            </div>
                        )}

                        {/* ── MAGIC / RESET FORMS ── */}
                        {(mode === 'magic' || mode === 'reset') && !magicLinkSent && !resetSent && (
                            <div className="space-y-4">
                                <form onSubmit={mode === 'magic' ? handleMagicLink : handleResetPassword} className="space-y-4">
                                    <div className="relative group">
                                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-500 transition-colors" size={18} />
                                        <input
                                            type="email"
                                            value={email}
                                            onChange={e => setEmail(e.target.value)}
                                            placeholder="Seu e-mail"
                                            required
                                            className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-[15px] text-slate-800 placeholder-slate-400 focus:border-blue-400 focus:ring-4 focus:ring-blue-50 focus:bg-white outline-none transition-all"
                                        />
                                    </div>

                                    {error && (
                                        <div className="bg-red-50 text-red-600 p-3.5 rounded-xl border border-red-100 flex items-center gap-3 text-xs font-semibold">
                                            <AlertCircle size={16} className="flex-shrink-0" />
                                            {error}
                                        </div>
                                    )}

                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="w-full flex items-center justify-center gap-2 py-4 rounded-xl font-bold text-white text-sm tracking-wide transition-all disabled:opacity-60"
                                        style={{
                                            background: 'linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%)',
                                            boxShadow: '0 4px 24px rgba(37,99,235,0.3)'
                                        }}
                                    >
                                        {loading ? (
                                            <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Enviando...</>
                                        ) : (
                                            mode === 'magic' ? 'Enviar Link Mágico' : 'Recuperar Senha'
                                        )}
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => setMode('login')}
                                        className="w-full text-xs font-semibold text-slate-400 hover:text-slate-600 hover:underline transition-all"
                                    >
                                        ← Voltar para o login
                                    </button>
                                </form>
                            </div>
                        )}

                        {/* ── SUCCESS FEEDBACK ── */}
                        {(magicLinkSent || resetSent) && (
                            <div className="text-center py-6">
                                <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto mb-5">
                                    <Mail size={32} className="text-emerald-500" />
                                </div>
                                <h3 className="text-xl font-black text-slate-800 mb-2">E-mail Enviado!</h3>
                                <p className="text-slate-400 text-sm font-medium mb-8">
                                    {magicLinkSent
                                        ? 'Verifique sua caixa de entrada e clique no link para logar instantaneamente.'
                                        : 'Enviamos as instruções de recuperação para o seu e-mail.'}
                                </p>
                                <button
                                    onClick={() => { setMode('login'); setMagicLinkSent(false); setResetSent(false); }}
                                    className="text-sm font-bold text-blue-600 hover:text-blue-700 hover:underline transition-all"
                                >
                                    ← Voltar ao login
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="mt-8 flex flex-wrap justify-center gap-x-5 gap-y-2 text-[11px] text-slate-400">
                        <span>© 2024 ComissOne. Todos os direitos reservados.</span>
                        <a href="#" className="hover:text-blue-600 hover:underline transition-all">Privacidade</a>
                        <a href="#" className="hover:text-blue-600 hover:underline transition-all">Termos</a>
                        <a href="#" className="hover:text-blue-600 hover:underline transition-all">Suporte</a>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;
