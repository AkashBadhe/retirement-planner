// Watchlist persistence (localStorage) and CSV import/export helpers.
// No external dependencies — a small, tolerant CSV parser handles imports.

const STORAGE_KEY = 'cashflow.watchlist.symbols';

/** Load the saved list of symbols (uppercased, de-duplicated). */
export function loadWatchlist(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    return dedupe(arr.map(s => String(s).trim().toUpperCase()).filter(Boolean));
  } catch {
    return [];
  }
}

/** Persist the list of symbols. */
export function saveWatchlist(symbols: string[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(dedupe(symbols)));
  } catch {
    // ignore quota/availability errors
  }
}

export function addSymbol(symbols: string[], symbol: string): string[] {
  const s = symbol.trim().toUpperCase();
  if (!s) return symbols;
  return dedupe([...symbols, s]);
}

export function removeSymbol(symbols: string[], symbol: string): string[] {
  const s = symbol.trim().toUpperCase();
  return symbols.filter(x => x !== s);
}

function dedupe(arr: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const s of arr) {
    const u = s.trim().toUpperCase();
    if (u && !seen.has(u)) {
      seen.add(u);
      out.push(u);
    }
  }
  return out;
}

/**
 * Parse symbols from CSV text. Tolerant of:
 *  - a header row (detected and skipped if it contains "symbol"/"ticker")
 *  - a single column of symbols, or a "Symbol"/"Ticker" column among others
 *  - comma, semicolon, tab, or newline separation
 */
export function parseSymbolsFromCsv(text: string): string[] {
  if (!text) return [];
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  if (lines.length === 0) return [];

  const splitRow = (line: string): string[] =>
    line.split(/[,;\t]/).map(c => c.trim().replace(/^"|"$/g, ''));

  // Detect a header row and the symbol column index
  let symbolCol = 0;
  let startIdx = 0;
  const firstCols = splitRow(lines[0]).map(c => c.toLowerCase());
  const headerIdx = firstCols.findIndex(c => c === 'symbol' || c === 'ticker' || c === 'scrip');
  const looksLikeHeader = firstCols.some(c => ['symbol', 'ticker', 'scrip', 'name', 'company'].includes(c));
  if (headerIdx >= 0) {
    symbolCol = headerIdx;
    startIdx = 1;
  } else if (looksLikeHeader) {
    startIdx = 1;
  }

  const symbols: string[] = [];
  for (let i = startIdx; i < lines.length; i++) {
    const cols = splitRow(lines[i]);
    const candidate = (cols[symbolCol] || cols[0] || '').trim().toUpperCase();
    // Keep plausible tickers (letters, digits, dot, hyphen, caret)
    if (candidate && /^[A-Z0-9.\-^&]+$/.test(candidate)) {
      symbols.push(candidate);
    }
  }
  return dedupe(symbols);
}

/** Build CSV text from the current symbols. */
export function buildCsv(symbols: string[]): string {
  return ['Symbol', ...symbols].join('\n');
}

/** Trigger a browser download of the watchlist as a CSV file. */
export function downloadCsv(symbols: string[], filename = 'watchlist.csv'): void {
  const blob = new Blob([buildCsv(symbols)], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
