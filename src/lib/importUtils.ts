export interface ImportTransaction {
    id: string;
    date: string;
    description: string;
    amount: number;
    type: 'INCOME' | 'EXPENSE';
    fitid?: string;
    memo?: string;
    hash?: string;
}

// Palavras genéricas que não ajudam na identificação
const GENERIC_WORDS = new Set([
    'pix', 'ted', 'doc', 'transferencia', 'pagamento', 'pgto', 'debito',
    'credito', 'compra', 'saque', 'deposito', 'lancamento', 'bank', 'brasil',
    'br', 'ltda', 'sa', 'me', 'eireli', 'cnpj', 'cpf', 'via', 'de', 'da',
    'do', 'para', 'em', 'no', 'na', 'e', 'ou', 'comercio', 'servicos',
    'solucoes', 'internet', 'banking', 'mobile', 'app',
]);

/** Normaliza texto para comparação (sem acentos, minúsculo, sem palavras genéricas) */
export const normalizeDescription = (text: string): string[] => {
    return text
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9\s]/g, ' ')
        .split(/\s+/)
        .filter(w => w.length > 2 && !GENERIC_WORDS.has(w));
};

/** Similaridade Jaccard entre dois textos (0 a 1) */
export const textSimilarity = (a: string, b: string): number => {
    const tA = new Set(normalizeDescription(a));
    const tB = new Set(normalizeDescription(b));
    if (tA.size === 0 || tB.size === 0) return 0;
    const intersection = [...tA].filter(t => tB.has(t)).length;
    const union = new Set([...tA, ...tB]).size;
    return intersection / union;
};

export interface RecurringMatch {
    categoryId: string | null;
    categoryName: string;
    lastUsed: string;
    similarity: number;
    origDescription: string;
}

/** Busca correspondência recorrente na base (limiar ≥ 70%) */
export const findRecurringMatch = (
    importDesc: string,
    importAmount: number,
    systemTransactions: Array<{
        description: string;
        amount: number;
        due_date: string;
        category_id: string | null;
        category?: { name: string };
    }>
): RecurringMatch | null => {
    let best: RecurringMatch | null = null;
    let bestScore = 0.70;
    for (const sys of systemTransactions) {
        const sim = textSimilarity(importDesc, sys.description);
        const amtBonus = Math.abs(sys.amount - importAmount) < 0.01 ? 0.15 : 0;
        const score = sim + amtBonus;
        if (score > bestScore) {
            bestScore = score;
            best = {
                categoryId: sys.category_id,
                categoryName: sys.category?.name || 'Sem categoria',
                lastUsed: sys.due_date,
                similarity: sim,
                origDescription: sys.description,
            };
        }
    }
    return best;
};

// ---------------------------------------------------------------------------
// Parsers
// ---------------------------------------------------------------------------

export const parseOFX = (content: string): ImportTransaction[] => {
    const transactions: ImportTransaction[] = [];
    const blocks: string[] = [];

    // Tenta formato XML (com </STMTTRN>)
    const xmlRegex = /<STMTTRN>([\s\S]*?)<\/STMTTRN>/gi;
    let m;
    while ((m = xmlRegex.exec(content)) !== null) blocks.push(m[1]);

    // Formato SGML sem fechamento (padrão bancos BR)
    if (blocks.length === 0) {
        const parts = content.split(/<STMTTRN>/gi);
        for (let i = 1; i < parts.length; i++) blocks.push(parts[i]);
    }

    const getField = (block: string, tag: string): string => {
        const regex = new RegExp(`<${tag}>([^<\n\r]*)`, 'i');
        return block.match(regex)?.[1]?.trim() || '';
    };

    for (const block of blocks) {
        const trnType = getField(block, 'TRNTYPE');
        const dtPosted = getField(block, 'DTPOSTED').substring(0, 8);
        const trnAmt = getField(block, 'TRNAMT').replace(',', '.');
        const fitId = getField(block, 'FITID');
        const memo = getField(block, 'MEMO') || getField(block, 'NAME') || 'Sem descrição';

        if (!dtPosted || !trnAmt) continue;

        const year = dtPosted.substring(0, 4);
        const month = dtPosted.substring(4, 6);
        const day = dtPosted.substring(6, 8);
        const formattedDate = `${year}-${month}-${day}`;
        const amount = parseFloat(trnAmt);
        if (isNaN(amount)) continue;

        const hash = btoa(unescape(encodeURIComponent(`${formattedDate}${memo}${amount}${trnType}`))).slice(0, 32);

        transactions.push({
            id: crypto.randomUUID(),
            date: formattedDate,
            description: memo,
            amount: Math.abs(amount),
            type: amount >= 0 ? 'INCOME' : 'EXPENSE',
            fitid: fitId || undefined,
            memo,
            hash,
        });
    }

    return transactions;
};

export const parseCSV = (content: string): ImportTransaction[] => {
    try {
        const lines = content.split('\n').map(l => l.trim()).filter(Boolean);
        if (lines.length < 2) return [];

        const firstLine = lines[0];
        const separator = firstLine.includes(';') ? ';' : ',';
        const transactions: ImportTransaction[] = [];

        for (let i = 1; i < lines.length; i++) {
            const parts = lines[i].split(separator);
            if (parts.length < 2) continue;

            const datePart = parts[0]?.trim();
            const description = (parts[1] || parts[2] || '').trim().replace(/"/g, '');

            // Robust amount finding (look for last numeric part)
            let rawAmount = '';
            for (let j = parts.length - 1; j >= 1; j--) {
                const p = parts[j]?.trim().replace(/"/g, '').replace(/\s/g, '');
                if (p && /^-?[\d.,]+$/.test(p)) {
                    rawAmount = p;
                    break;
                }
            }

            if (!datePart || !rawAmount) continue;

            // Normalize amount
            let cleanAmount = rawAmount;
            if (cleanAmount.includes(',') && cleanAmount.includes('.')) {
                if (cleanAmount.lastIndexOf(',') > cleanAmount.lastIndexOf('.')) {
                    cleanAmount = cleanAmount.replace(/\./g, '').replace(',', '.');
                } else {
                    cleanAmount = cleanAmount.replace(/,/g, '');
                }
            } else if (cleanAmount.includes(',')) {
                cleanAmount = cleanAmount.replace(',', '.');
            }
            
            const amount = parseFloat(cleanAmount);
            if (isNaN(amount)) continue;

            // Robust date parsing
            let formattedDate = '';
            const dmyMatch = datePart.match(/(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})/);
            const ymdMatch = datePart.match(/(\d{4})[/-](\d{1,2})[/-](\d{1,2})/);

            if (dmyMatch) {
                let [_, d, m, y] = dmyMatch;
                if (y.length === 2) y = `20${y}`;
                formattedDate = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
            } else if (ymdMatch) {
                let [_, y, m, d] = ymdMatch;
                formattedDate = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
            }

            if (!formattedDate) continue;

            const hash = btoa(unescape(encodeURIComponent(`${formattedDate}${description}${amount}`))).slice(0, 32);

            transactions.push({
                id: crypto.randomUUID(),
                date: formattedDate,
                description: description || 'Sem descrição',
                amount: Math.abs(amount),
                type: amount >= 0 ? 'INCOME' : 'EXPENSE',
                hash,
            });
        }
        return transactions;
    } catch (err) {
        console.error('Error parsing CSV:', err);
        return [];
    }
};

/** Gera hash SHA-256 do conteúdo para evitar importações duplicadas */
export const generateFileHash = async (content: string): Promise<string> => {
    const msgUint8 = new TextEncoder().encode(content);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};
