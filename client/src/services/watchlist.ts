// Watchlist persistence and CSV import/export helpers.
// Symbols are stored in MongoDB (via the API), keyed by a per-browser client id.
// localStorage is kept as an offline cache / fallback so the UI works instantly
// and still functions if the API/DB is unreachable.

const STORAGE_KEY = 'cashflow.watchlist.symbols';
const CLIENT_ID_KEY = 'cashflow.watchlist.clientId';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:4000/api';

/** Get (or lazily create) a stable per-browser client id. */
export function getClientId(): string {
  try {
    let id = localStorage.getItem(CLIENT_ID_KEY);
    if (!id) {
      id = generateId();
      localStorage.setItem(CLIENT_ID_KEY, id);
    }
    return id;
  } catch {
    return generateId();
  }
}

function generateId(): string {
  // Prefer crypto.randomUUID where available, else a simple fallback
  const c: any = (globalThis as any).crypto;
  if (c && typeof c.randomUUID === 'function') return c.randomUUID();
  return 'cid-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
}

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
  const headerIdx = firstCols.findIndex(c => c === 'symbol' || c === 'ticker' || c === 'scrip' || c === 'instrument' || c === 'tradingsymbol');
  const looksLikeHeader = firstCols.some(c => ['symbol', 'ticker', 'scrip', 'name', 'company', 'instrument', 'tradingsymbol', 'isin'].includes(c));
  if (headerIdx >= 0) {
    symbolCol = headerIdx;
    startIdx = 1;
  } else if (looksLikeHeader) {
    startIdx = 1;
  }

  const symbols: string[] = [];
  // Common ETF/index suffixes to filter out (no fundamentals available)
  const etfPatterns = /BEES|GOLDBEES|SILVERBEES|MON100|MOSMALL|JUNIORBEES|HDFCSML/i;
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

// ---------------------------------------------------------------------------
// Remote (MongoDB-backed) sync
// ---------------------------------------------------------------------------

/**
 * Fetch the watchlist from the server. Uses `userId` if authenticated, else `clientId`.
 * Falls back to the local cache if the request fails.
 */
export async function fetchRemoteWatchlist(userId?: string | null): Promise<string[]> {
  const param = userId
    ? `userId=${encodeURIComponent(userId)}`
    : `clientId=${encodeURIComponent(getClientId())}`;
  try {
    const res = await fetch(`${API_BASE_URL}/watchlist?${param}`);
    if (!res.ok) throw new Error('failed');
    const data = await res.json();
    const symbols = dedupe(Array.isArray(data?.symbols) ? data.symbols : []);
    saveWatchlist(symbols); // refresh local cache
    return symbols;
  } catch {
    return loadWatchlist(); // offline fallback
  }
}

/**
 * Persist the full symbol list to the server (and local cache).
 * Returns true on success, false if the server could not be reached.
 */
export async function saveRemoteWatchlist(symbols: string[], userId?: string | null): Promise<boolean> {
  const normalized = dedupe(symbols);
  saveWatchlist(normalized); // always keep local cache in sync
  try {
    const body: any = { symbols: normalized };
    if (userId) body.userId = userId;
    else body.clientId = getClientId();
    const res = await fetch(`${API_BASE_URL}/watchlist`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    return res.ok;
  } catch {
    return false;
  }
}
