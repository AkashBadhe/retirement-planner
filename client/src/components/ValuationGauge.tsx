import React from 'react';
import { Box, Typography } from '@mui/material';

interface ValuationGaugeProps {
  intrinsicValue: number;
  price: number;
  format: (n: number) => string;
}

/**
 * At-a-glance comparison of Intrinsic Value vs Market Price with an
 * under/overvaluation badge. Clean, low-clutter layout.
 */
const ValuationGauge: React.FC<ValuationGaugeProps> = ({ intrinsicValue, price, format }) => {
  const maxVal = Math.max(intrinsicValue, price, 1);
  const ivPct = (intrinsicValue / maxVal) * 100;
  const pricePct = (price / maxVal) * 100;

  const diffPct = intrinsicValue > 0 ? ((intrinsicValue - price) / intrinsicValue) * 100 : 0;
  const undervalued = diffPct >= 0;
  const accent = undervalued ? '#2e7d5b' : '#c0392b';
  const badge = `${undervalued ? 'Undervalued' : 'Overvalued'} ${Math.abs(diffPct).toFixed(0)}%`;

  const Row = ({ label, value, pct, barColor }: { label: string; value: number; pct: number; barColor: string }) => (
    <Box sx={{ mb: 1.25 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', mb: 0.5 }}>
        <Typography variant='caption' sx={{ color: '#78909c' }}>{label}</Typography>
        <Typography variant='body2' fontWeight={700} sx={{ color: '#263238' }}>{format(value)}</Typography>
      </Box>
      <Box sx={{ height: 8, borderRadius: 4, backgroundColor: '#eceff1', overflow: 'hidden' }}>
        <Box sx={{ height: '100%', width: `${pct}%`, backgroundColor: barColor, transition: 'width 0.4s ease' }} />
      </Box>
    </Box>
  );

  return (
    <Box sx={{ mb: 2, p: 2, borderRadius: 2, border: '1px solid #eceff1' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.25 }}>
        <Typography variant='overline' sx={{ color: '#78909c', letterSpacing: 0.5 }}>Valuation</Typography>
        <Box
          sx={{
            px: 1, py: 0.25, borderRadius: 1,
            backgroundColor: `${accent}14`, color: accent,
            fontSize: '0.72rem', fontWeight: 700,
          }}
        >
          {badge}
        </Box>
      </Box>
      <Row label='Intrinsic Value' value={intrinsicValue} pct={ivPct} barColor={accent} />
      <Row label='Market Price' value={price} pct={pricePct} barColor='#b0bec5' />
    </Box>
  );
};

export default ValuationGauge;
