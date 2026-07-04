import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Paper,
  Typography,
  Box,
  Button,
  TextField,
  Autocomplete,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TableSortLabel,
  Chip,
  IconButton,
  CircularProgress,
  Alert,
  Tooltip,
  LinearProgress,
} from '@mui/material';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import DownloadIcon from '@mui/icons-material/Download';
import RefreshIcon from '@mui/icons-material/Refresh';
import { searchSymbols, SymbolSearchResult } from '../services/yahooFinance';
import { quickValuation, QuickValuation } from '../services/quickValuation';
import {
  loadWatchlist,
  saveWatchlist,
  addSymbol,
  removeSymbol,
  parseSymbolsFromCsv,
  downloadCsv,
} from '../services/watchlist';

type Row = QuickValuation & { loading?: boolean };

type SortKey = 'symbol' | 'price' | 'intrinsicValue' | 'upsidePct' | 'qualityScore' | 'peRatio' | 'roe' | 'verdict';

function money(num: number, currency: string): string {
  if (!num) return '—';
  const sym = currency === 'INR' ? '₹' : '$';
  return `${sym}${num.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

function verdictColor(v: string): string {
  switch (v) {
    case 'BUY': return '#1b5e20';
    case 'ACCUMULATE': return '#2e7d32';
    case 'HOLD': return '#f57c00';
    case 'AVOID': return '#e65100';
    case 'EXIT': return '#b71c1c';
    default: return '#546e7a';
  }
}

function formatSymbolDisplay(symbol: string): string {
  if (symbol.endsWith('.NS')) return `${symbol.replace('.NS', '')} (NSE)`;
  if (symbol.endsWith('.BO')) return `${symbol.replace('.BO', '')} (BSE)`;
  return symbol;
}

const WatchlistTable: React.FC = () => {
  const navigate = useNavigate();
  const [symbols, setSymbols] = useState<string[]>([]);
  const [rows, setRows] = useState<Record<string, Row>>({});
  const [searchResults, setSearchResults] = useState<SymbolSearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [inputDisplay, setInputDisplay] = useState('');
  const [importMsg, setImportMsg] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>('upsidePct');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const searchTimeout = useRef<NodeJS.Timeout | null>(null);
  const fileInput = useRef<HTMLInputElement | null>(null);

  // Load persisted symbols on mount
  useEffect(() => {
    setSymbols(loadWatchlist());
  }, []);

  // Persist whenever symbols change
  useEffect(() => {
    saveWatchlist(symbols);
  }, [symbols]);

  // Fetch valuation for a single symbol
  const loadRow = useCallback(async (symbol: string) => {
    setRows(prev => ({ ...prev, [symbol]: { ...(prev[symbol] as Row), symbol, loading: true } as Row }));
    const result = await quickValuation(symbol);
    setRows(prev => ({ ...prev, [symbol]: { ...result, loading: false } }));
  }, []);

  // Load any symbols that don't yet have data
  useEffect(() => {
    symbols.forEach(s => {
      if (!rows[s]) loadRow(s);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbols]);

  const handleAdd = (symbol: string) => {
    const next = addSymbol(symbols, symbol);
    setSymbols(next);
    setInputDisplay('');
    setSearchResults([]);
  };

  const handleRemove = (symbol: string) => {
    setSymbols(removeSymbol(symbols, symbol));
    setRows(prev => {
      const copy = { ...prev };
      delete copy[symbol];
      return copy;
    });
  };

  const handleRefreshAll = () => {
    symbols.forEach(s => loadRow(s));
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result || '');
      const parsed = parseSymbolsFromCsv(text);
      if (parsed.length === 0) {
        setImportMsg('No valid symbols found in the file.');
        return;
      }
      const next = parsed.reduce((acc, s) => addSymbol(acc, s), symbols);
      setSymbols(next);
      setImportMsg(`Imported ${parsed.length} symbol(s).`);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  const sortedSymbols = [...symbols].sort((a, b) => {
    const ra = rows[a];
    const rb = rows[b];
    if (!ra || !rb) return 0;
    let av: number | string;
    let bv: number | string;
    if (sortKey === 'symbol' || sortKey === 'verdict') {
      av = (ra[sortKey] as string) || '';
      bv = (rb[sortKey] as string) || '';
      return sortDir === 'asc' ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av));
    }
    av = (ra[sortKey] as number) || 0;
    bv = (rb[sortKey] as number) || 0;
    return sortDir === 'asc' ? (av as number) - (bv as number) : (bv as number) - (av as number);
  });

  const headers: { key: SortKey; label: string; align: 'left' | 'right' }[] = [
    { key: 'symbol', label: 'Symbol', align: 'left' },
    { key: 'price', label: 'Price', align: 'right' },
    { key: 'intrinsicValue', label: 'Intrinsic', align: 'right' },
    { key: 'upsidePct', label: 'Upside', align: 'right' },
    { key: 'verdict', label: 'Signal', align: 'left' },
    { key: 'qualityScore', label: 'Quality', align: 'right' },
    { key: 'peRatio', label: 'P/E', align: 'right' },
    { key: 'roe', label: 'ROE', align: 'right' },
  ];

  const loadingCount = symbols.filter(s => rows[s]?.loading || !rows[s]).length;

  return (
    <Paper sx={{ p: { xs: 2, md: 3 }, my: 1.5 }}>
      <Typography variant='h6' sx={{ mb: 0.5 }}>My Watchlist</Typography>
      <Typography variant='body2' color='textSecondary' sx={{ mb: 2 }}>
        Track intrinsic value, upside, and quality across your stocks at a glance. Saved to this browser.
      </Typography>

      {/* Controls */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, mb: 2, alignItems: 'center' }}>
        <Autocomplete
          freeSolo
          sx={{ flex: '1 1 280px', minWidth: 240 }}
          options={searchResults}
          getOptionLabel={o => (typeof o === 'string' ? o : `${formatSymbolDisplay(o.symbol)} — ${o.name}`)}
          loading={searchLoading}
          inputValue={inputDisplay}
          onChange={(_, val) => {
            if (val && typeof val !== 'string') handleAdd(val.symbol);
            else if (typeof val === 'string' && val.trim()) handleAdd(val);
          }}
          onInputChange={(_, val, reason) => {
            if (reason === 'input') {
              setInputDisplay(val);
              if (searchTimeout.current) clearTimeout(searchTimeout.current);
              if (val.length >= 2) {
                setSearchLoading(true);
                searchTimeout.current = setTimeout(async () => {
                  setSearchResults(await searchSymbols(val));
                  setSearchLoading(false);
                }, 300);
              }
            } else if (reason === 'clear') {
              setInputDisplay('');
              setSearchResults([]);
            }
          }}
          filterOptions={x => x}
          renderInput={params => (
            <TextField {...params} size='small' label='Add a stock' placeholder='Search company or symbol…' />
          )}
        />
        <Button variant='outlined' size='small' startIcon={<UploadFileIcon />} onClick={() => fileInput.current?.click()}>
          Import CSV
        </Button>
        <input ref={fileInput} type='file' accept='.csv,text/csv' hidden onChange={handleImport} />
        <Button variant='outlined' size='small' startIcon={<DownloadIcon />} onClick={() => downloadCsv(symbols)} disabled={symbols.length === 0}>
          Export
        </Button>
        <Button variant='outlined' size='small' startIcon={<RefreshIcon />} onClick={handleRefreshAll} disabled={symbols.length === 0}>
          Refresh
        </Button>
      </Box>

      {importMsg && <Alert severity='info' sx={{ mb: 2 }} onClose={() => setImportMsg(null)}>{importMsg}</Alert>}
      {loadingCount > 0 && <LinearProgress sx={{ mb: 1 }} />}

      {symbols.length === 0 ? (
        <Alert severity='info'>
          Your watchlist is empty. Add stocks above or import a CSV (a single "Symbol" column works).
        </Alert>
      ) : (
        <Box sx={{ overflowX: 'auto' }}>
          <Table size='small' stickyHeader>
            <TableHead>
              <TableRow>
                {headers.map(h => (
                  <TableCell key={h.key} align={h.align}>
                    <TableSortLabel
                      active={sortKey === h.key}
                      direction={sortKey === h.key ? sortDir : 'desc'}
                      onClick={() => handleSort(h.key)}
                    >
                      {h.label}
                    </TableSortLabel>
                  </TableCell>
                ))}
                <TableCell align='right'>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {sortedSymbols.map(sym => {
                const r = rows[sym];
                if (!r || r.loading) {
                  return (
                    <TableRow key={sym}>
                      <TableCell>{formatSymbolDisplay(sym)}</TableCell>
                      <TableCell colSpan={7} align='center'>
                        <CircularProgress size={16} /> <Typography variant='caption' sx={{ ml: 1 }}>loading…</Typography>
                      </TableCell>
                      <TableCell align='right'>
                        <IconButton size='small' onClick={() => handleRemove(sym)}><DeleteOutlineIcon fontSize='small' /></IconButton>
                      </TableCell>
                    </TableRow>
                  );
                }
                if (r.error) {
                  return (
                    <TableRow key={sym}>
                      <TableCell>{formatSymbolDisplay(sym)}</TableCell>
                      <TableCell colSpan={7}><Typography variant='caption' color='error'>{r.error}</Typography></TableCell>
                      <TableCell align='right'>
                        <IconButton size='small' onClick={() => handleRemove(sym)}><DeleteOutlineIcon fontSize='small' /></IconButton>
                      </TableCell>
                    </TableRow>
                  );
                }
                const isBuy = r.verdict === 'BUY' || r.verdict === 'ACCUMULATE';
                return (
                  <TableRow
                    key={sym}
                    hover
                    sx={{ cursor: 'pointer', backgroundColor: isBuy ? 'rgba(46,125,50,0.06)' : undefined }}
                    onClick={() => navigate('/stock-intrinsic-value', { state: { symbol: sym } })}
                  >
                    <TableCell>
                      <Typography variant='body2' fontWeight={600}>{formatSymbolDisplay(sym)}</Typography>
                      {r.sector && <Typography variant='caption' color='textSecondary'>{r.sector}</Typography>}
                    </TableCell>
                    <TableCell align='right'>{money(r.price, r.currency)}</TableCell>
                    <TableCell align='right'>{money(r.intrinsicValue, r.currency)}</TableCell>
                    <TableCell align='right'>
                      <Typography variant='body2' fontWeight={700} sx={{ color: r.upsidePct >= 0 ? '#2e7d32' : '#c62828' }}>
                        {r.intrinsicValue > 0 ? `${r.upsidePct >= 0 ? '+' : ''}${(r.upsidePct * 100).toFixed(0)}%` : '—'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip label={r.verdict} size='small' sx={{ backgroundColor: verdictColor(r.verdict), color: '#fff', fontWeight: 600 }} />
                      {r.confidence !== 'high' && (
                        <Tooltip title={`${r.confidence} confidence estimate`}>
                          <Typography component='span' variant='caption' sx={{ ml: 0.5, color: '#f57c00' }}>!</Typography>
                        </Tooltip>
                      )}
                    </TableCell>
                    <TableCell align='right'>
                      <Tooltip title={r.qualityRating}>
                        <span>{r.qualityScore || '—'}</span>
                      </Tooltip>
                    </TableCell>
                    <TableCell align='right'>{r.peRatio ? r.peRatio.toFixed(1) : '—'}</TableCell>
                    <TableCell align='right'>{r.roe ? `${r.roe.toFixed(0)}%` : '—'}</TableCell>
                    <TableCell align='right' onClick={e => e.stopPropagation()}>
                      <IconButton size='small' onClick={() => handleRemove(sym)}><DeleteOutlineIcon fontSize='small' /></IconButton>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Box>
      )}

      <Typography variant='caption' color='textSecondary' sx={{ display: 'block', mt: 2 }}>
        Rows highlighted green are at or below their accumulation level (BUY/ACCUMULATE). A "!" marks lower-confidence
        estimates. Educational use only — not investment advice.
      </Typography>
    </Paper>
  );
};

export default WatchlistTable;
