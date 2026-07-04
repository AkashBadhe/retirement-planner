import React from 'react';
import { Box, Paper, Typography } from '@mui/material';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { YearValue } from '../../services/yahooFinance';

export type ValueFormat = 'currency' | 'percent' | 'ratio';

interface MetricChartProps {
  title: string;
  data: YearValue[];
  chartType: 'bar' | 'line';
  valueFormat: ValueFormat;
  currency: string;
  /** Optional header annotation (e.g. "CAGR 14.2%" or "+3.1pp"). */
  annotation?: string | null;
  positiveAnnotation?: boolean;
}

function compact(num: number, currency: string): string {
  const sym = currency === 'INR' ? '₹' : '$';
  const abs = Math.abs(num);
  if (currency === 'INR') {
    if (abs >= 1e7) return `${sym}${(num / 1e7).toFixed(1)}Cr`;
    if (abs >= 1e5) return `${sym}${(num / 1e5).toFixed(1)}L`;
  } else {
    if (abs >= 1e9) return `${sym}${(num / 1e9).toFixed(1)}B`;
    if (abs >= 1e6) return `${sym}${(num / 1e6).toFixed(1)}M`;
  }
  if (abs >= 1e3) return `${sym}${(num / 1e3).toFixed(1)}k`;
  return `${sym}${num.toFixed(0)}`;
}

export function formatValue(num: number, fmt: ValueFormat, currency: string): string {
  if (fmt === 'percent') return `${num.toFixed(1)}%`;
  if (fmt === 'ratio') return `${num.toFixed(1)}x`;
  return compact(num, currency);
}

const MetricChart: React.FC<MetricChartProps> = ({
  title,
  data,
  chartType,
  valueFormat,
  currency,
  annotation,
  positiveAnnotation,
}) => {
  if (!data || data.length === 0) return null;

  const latest = data[data.length - 1].value;
  const chartData = data.map(d => ({ year: `'${String(d.year).slice(2)}`, value: Math.round(d.value * 100) / 100 }));

  const axisFmt = (v: number) => {
    if (valueFormat === 'percent') return `${v.toFixed(0)}%`;
    if (valueFormat === 'ratio') return `${v.toFixed(0)}x`;
    return compact(v, currency).replace(currency === 'INR' ? '₹' : '$', '');
  };

  return (
    <Paper variant='outlined' sx={{ p: 2, height: '100%' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', mb: 1 }}>
        <Typography variant='subtitle2' fontWeight={600}>{title}</Typography>
        <Typography variant='body2' fontWeight={700} sx={{ color: '#1a2a3a' }}>
          {formatValue(latest, valueFormat, currency)}
        </Typography>
      </Box>
      {annotation && (
        <Typography
          variant='caption'
          sx={{ color: positiveAnnotation ? '#2e7d32' : '#c62828', display: 'block', mb: 0.5 }}
        >
          {annotation}
        </Typography>
      )}
      <ResponsiveContainer width='100%' height={150}>
        {chartType === 'bar' ? (
          <BarChart data={chartData} margin={{ top: 5, right: 4, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray='3 3' stroke='#eee' vertical={false} />
            <XAxis dataKey='year' tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} tickFormatter={axisFmt} width={44} />
            <Tooltip formatter={(v: number) => formatValue(v, valueFormat, currency)} contentStyle={{ fontSize: '0.8rem' }} />
            <Bar dataKey='value' fill='#3a7d6a' radius={[3, 3, 0, 0]} />
          </BarChart>
        ) : (
          <LineChart data={chartData} margin={{ top: 5, right: 4, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray='3 3' stroke='#eee' vertical={false} />
            <XAxis dataKey='year' tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} tickFormatter={axisFmt} width={44} />
            <Tooltip formatter={(v: number) => formatValue(v, valueFormat, currency)} contentStyle={{ fontSize: '0.8rem' }} />
            <Line type='monotone' dataKey='value' stroke='#1976d2' strokeWidth={2} dot={{ r: 2 }} />
          </LineChart>
        )}
      </ResponsiveContainer>
    </Paper>
  );
};

export default MetricChart;
