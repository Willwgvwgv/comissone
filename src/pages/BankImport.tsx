import React, { useState } from 'react';
import { Upload, CheckCircle2, AlertCircle, ArrowRight, FileText, Search } from 'lucide-react';

const BankImport: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Simulação de dados lidos do extrato
  const transactions = [
    { id: 1, date: '2026-03-15', desc: 'PIX RECEBIDO - FABIANA GOMES', value: 169.90, type: 'income', suggestion: 'Venda #1024' },
    { id: 2, date: '2026-03-16', desc: 'PAGAMENTO BOLETO - ALUGUEL', value: -1200.00, type: 'expense', suggestion: 'Despesa Fixa' },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-black text-slate-900 tracking-tighter">CONCILIAÇÃO BANCÁRIA</h1>
        <p className="text-slate-500 font-medium">Importe seu extrato OFX ou CSV e valide os lançamentos em um clique.</p>
      </div>

      {!file ? (
        /* ESTADO 1: UPLOAD */
        <div className="border-4 border-dashed border-slate-200 rounded-[2.5rem] p-20 flex flex-col items-center justify-center bg-white hover:border-blue-400 transition-all group">
          <div className="bg-blue-50 p-6 rounded-3xl text-blue-600 mb-4 group-hover:scale-110 transition-transform">
            <Upload size={48} />
          </div>
          <h3 className="text-xl font-black text-slate-800">Arraste seu extrato aqui</h3>
          <p className="text-slate-400 mb-6">Formatos aceitos: .OFX, .CSV ou .XLSX</p>
          <input 
            type="file" 
            className="hidden" 
            id="fileUpload" 
            onChange={(e) => setFile(e.target.files?.[0] || null)}
          />
          <label 
            htmlFor="fileUpload"
            className="bg-slate-900 text-white px-8 py-3 rounded-2xl font-bold cursor-pointer hover:bg-blue-600 transition-all"
          >
            Selecionar Arquivo
          </label>
        </div>
      ) : (
        /* ESTADO 2: CONCILIAÇÃO */
        <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
            <div className="flex items-center gap-3">
              <FileText className="text-blue-600" />
              <span className="font-bold text-slate-700">{file.name}</span>
              <button onClick={() => setFile(null)} className="text-xs text-red-500 font-bold uppercase ml-4">Trocar arquivo</button>
            </div>
            <button className="bg-green-600 text-white px-6 py-2 rounded-xl font-bold hover:bg-green-700 transition-all flex items-center gap-2">
              <CheckCircle2 size={18} /> Finalizar Conciliação
            </button>
          </div>

          <table className="w-full">
            <thead>
              <tr className="text-left bg-slate-50/50">
                <th className="p-6 text-xs font-black text-slate-400 uppercase tracking-widest">Data/Extrato</th>
                <th className="p-6 text-xs font-black text-slate-400 uppercase tracking-widest">Valor</th>
                <th className="p-6 text-xs font-black text-slate-400 uppercase tracking-widest text-center">Ação</th>
                <th className="p-6 text-xs font-black text-slate-400 uppercase tracking-widest">Sugestão no Sistema</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {transactions.map((t) => (
                <tr key={t.id} className="hover:bg-slate-50/30 transition-colors">
                  <td className="p-6">
                    <p className="font-bold text-slate-800">{t.desc}</p>
                    <p className="text-xs text-slate-400 font-medium">{t.date}</p>
                  </td>
                  <td className="p-6">
                    <span className={`font-black ${t.type === 'income' ? 'text-green-600' : 'text-red-500'}`}>
                      {t.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </span>
                  </td>
                  <td className="p-6 text-center">
                    <div className="flex justify-center">
                      <ArrowRight className="text-slate-300" />
                    </div>
                  </td>
                  <td className="p-6">
                    <div className="flex items-center justify-between bg-slate-50 p-3 rounded-2xl border border-slate-100">
                      <span className="text-sm font-bold text-slate-600">{t.suggestion}</span>
                      <button className="text-blue-600 hover:bg-blue-100 p-2 rounded-lg transition-all">
                        <Search size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default BankImport;
