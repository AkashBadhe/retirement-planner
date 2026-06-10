// Footer.tsx
import React from 'react';
import { Box, Typography } from '@mui/material';

const Footer = () => (
  <Box
    component='footer'
    sx={{
      bgcolor: 'primary.main',
      color: 'primary.contrastText',
      textAlign: 'center',
      p: 2,
      position: 'fixed',
      left: 0,
      bottom: 0,
      width: '100%',
    }}
  >
    <Typography variant='body2'>
      © {new Date().getFullYear()} Financial Calculators.
    </Typography>
    <Typography variant='body2'>Made with ❤️ by Akash & Amruta</Typography>
  </Box>
);

export default Footer;
