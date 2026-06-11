import React from 'react';
import { Grid } from '@mui/material';
import SipCalculatorForm from '../components/SipCalculatorForm';
import CalculatorSidebar from '../components/CalculatorSidebar';

const SipCalculatorPage: React.FC = () => {
  return (
    <Grid container spacing={3}>
      <Grid item xs={12} md={8}>
        <SipCalculatorForm />
      </Grid>
      <Grid item xs={12} md={4} sx={{ display: { xs: 'none', md: 'block' } }}>
        <CalculatorSidebar />
      </Grid>
    </Grid>
  );
};

export default SipCalculatorPage;
