import React from 'react';
import { Grid } from '@mui/material';
import CagrCalculatorForm from '../components/CagrCalculatorForm';
import CalculatorSidebar from '../components/CalculatorSidebar';

const CagrCalculatorPage: React.FC = () => {
  return (
    <Grid container spacing={3}>
      <Grid item xs={12} md={8}>
        <CagrCalculatorForm />
      </Grid>
      <Grid item xs={12} md={4} sx={{ display: { xs: 'none', md: 'block' } }}>
        <CalculatorSidebar />
      </Grid>
    </Grid>
  );
};

export default CagrCalculatorPage;
