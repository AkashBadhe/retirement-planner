import React from 'react';
import { Grid } from '@mui/material';
import SipReturnsCalculatorForm from '../components/SipReturnsCalculatorForm';
import CalculatorSidebar from '../components/CalculatorSidebar';

const SipReturnsPage: React.FC = () => {
  return (
    <Grid container spacing={3}>
      <Grid item xs={12} md={8}>
        <SipReturnsCalculatorForm />
      </Grid>
      <Grid item xs={12} md={4} sx={{ display: { xs: 'none', md: 'block' } }}>
        <CalculatorSidebar />
      </Grid>
    </Grid>
  );
};

export default SipReturnsPage;
