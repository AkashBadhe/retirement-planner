import React, { useState } from 'react';
import { Box, Typography, LinearProgress, Collapse, Link } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { QualityScore } from '../services/valuation';

interface QualityScoreCardProps {
  quality: QualityScore;
}

function ratingColor(rating: string): string {
  switch (rating) {
    case 'Excellent': return '#1b5e20';
    case 'Good': return '#2e7d32';
    case 'Fair': return '#ed6c02';
    default: return '#c62828';
  }
}

function factorColor(ratio: number): string {
  if (ratio >= 0.6) return '#2e7d32';
  if (ratio >= 0.3) return '#ed6c02';
  return '#c62828';
}

const QualityScoreCard: React.FC<QualityScoreCardProps> = ({ quality }) => {
  const [open, setOpen] = useState(false);
  const color = ratingColor(quality.rating);

  return (
    <Box sx={{ mb: 2, p: 2, borderRadius: 2, border: '1px solid #eceff1' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.25 }}>
        <Typography variant='overline' sx={{ color: '#78909c', letterSpacing: 0.5 }}>
          Business Quality
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.75 }}>
          <Typography variant='h5' fontWeight={700} sx={{ color, lineHeight: 1 }}>
            {quality.score}
          </Typography>
          <Typography variant='caption' color='textSecondary'>/100</Typography>
          <Box
            sx={{
              ml: 1, px: 1, py: 0.25, borderRadius: 1,
              backgroundColor: `${color}14`, color,
              fontSize: '0.72rem', fontWeight: 700,
            }}
          >
            {quality.rating}
          </Box>
        </Box>
      </Box>

      <LinearProgress
        variant='determinate'
        value={quality.score}
        sx={{
          height: 8, borderRadius: 4,
          backgroundColor: '#eceff1',
          '& .MuiLinearProgress-bar': { backgroundColor: color, borderRadius: 4 },
        }}
      />

      <Link
        component='button'
        underline='none'
        onClick={() => setOpen(o => !o)}
        sx={{
          mt: 1, display: 'inline-flex', alignItems: 'center', gap: 0.25,
          color: '#78909c', fontSize: '0.78rem',
        }}
      >
        {open ? 'Hide' : 'View'} factor breakdown
        <ExpandMoreIcon
          sx={{ fontSize: 16, transform: open ? 'rotate(180deg)' : 'none', transition: '0.2s' }}
        />
      </Link>

      <Collapse in={open}>
        <Box
          sx={{
            mt: 1.5,
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
            columnGap: 3,
            rowGap: 1.25,
          }}
        >
          {quality.breakdown.map(b => {
            const ratio = b.max > 0 ? b.points / b.max : 0;
            return (
              <Box key={b.label}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.4 }}>
                  <Typography variant='caption' color='textSecondary'>{b.label}</Typography>
                  <Typography variant='caption' fontWeight={600} sx={{ color: factorColor(ratio) }}>
                    {b.points}/{b.max}
                  </Typography>
                </Box>
                <LinearProgress
                  variant='determinate'
                  value={ratio * 100}
                  sx={{
                    height: 4, borderRadius: 2,
                    backgroundColor: '#eceff1',
                    '& .MuiLinearProgress-bar': { backgroundColor: factorColor(ratio), borderRadius: 2 },
                  }}
                />
              </Box>
            );
          })}
        </Box>
      </Collapse>
    </Box>
  );
};

export default QualityScoreCard;
