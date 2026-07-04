import React from 'react';
import { Box, Typography } from '@mui/material';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import { YearValue } from '../../services/yahooFinance';
import { cagr, average, changeOverWindow } from '../../services/fundamentalsHistory';

interface HistorySummaryStripProps {
  revenue?: YearValue[];
  eps?: YearValue[];
  roe?: YearValue[];
  netMargin?: YearValue[];
}

interface Stat {
  label: string;
  value: string;
  positive: boolean | null;
}

const StatCard: React.FC<{ stat: Stat }> = ({ stat }) => (
  <Box sx={{ flex: 1, minWidth: 120, textAlign: 'center', p: 1.5, borderRadius: 2, backgroundColor: '#f5f7fa' }}>
    <Typography variant='caption' color='textSecondary' display='block'>{stat.label}</Typography>
    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
      {stat.positive === true && <ArrowUpwardIcon sx={{ fontSize: 16, color: '#2e7d32' }} />}
      {stat.positive === false && <ArrowDownwardIcon sx={{ fontSize: 16, color: '#c62828' }} />}
      <Typography
        variant='subtitle1'
        fontWeight={700}
        sx={{ color: stat.positive === true ? '#2e7d32' : stat.positive === false ? '#c62828' : '#1a2a3a' }}
      >
        {stat.value}
      </Typography>
    </Box>
  </Box>
);

const HistorySummaryStrip: React.FC<HistorySummaryStripProps> = ({ revenue, eps, roe, netMargin }) => {
  const revCagr = cagr(revenue || []);
  const epsCagr = cagr(eps || []);
  const avgRoe = average(roe || []);
  const marginTrend = changeOverWindow(netMargin || []);

  const stats: Stat[] = [
    {
      label: 'Revenue CAGR',
      value: revCagr == null ? 'N/A' : `${revCagr.toFixed(1)}%`,
      positive: revCagr == null ? null : revCagr >= 0,
    },
    {
      label: 'EPS CAGR',
      value: epsCagr == null ? 'N/A' : `${epsCagr.toFixed(1)}%`,
      positive: epsCagr == null ? null : epsCagr >= 0,
    },
    {
      label: 'Avg ROE',
      value: avgRoe == null ? 'N/A' : `${avgRoe.toFixed(1)}%`,
      positive: avgRoe == null ? null : avgRoe >= 12,
    },
    {
      label: 'Net Margin Trend',
      value: marginTrend == null ? 'N/A' : `${marginTrend >= 0 ? '+' : ''}${marginTrend.toFixed(1)}pp`,
      positive: marginTrend == null ? null : marginTrend >= 0,
    },
  ];

  return (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, mb: 2 }}>
      {stats.map(s => <StatCard key={s.label} stat={s} />)}
    </Box>
  );
};

export default HistorySummaryStrip;
