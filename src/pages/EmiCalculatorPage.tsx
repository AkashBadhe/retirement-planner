import React from 'react';
import { Grid } from '@mui/material';
import EmiCalculatorForm from '../components/EmiCalculatorForm';
import CalculatorSidebar from '../components/CalculatorSidebar';

const EmiCalculatorPage: React.FC = () => {
  return (
    <Grid container spacing={3}>
      <Grid item xs={12} md={8}>
        <EmiCalculatorForm />
      </Grid>
      <Grid item xs={12} md={4} sx={{ display: { xs: 'none', md: 'block' } }}>
        <CalculatorSidebar />
      </Grid>
    </Grid>
  );
};

export default EmiCalculatorPage;
