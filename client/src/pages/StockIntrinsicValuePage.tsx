import React from 'react';
import { Grid } from '@mui/material';
import StockIntrinsicValueForm from '../components/StockIntrinsicValueForm';
import CalculatorSidebar from '../components/CalculatorSidebar';

const StockIntrinsicValuePage: React.FC = () => {
  return (
    <Grid container spacing={3}>
      <Grid item xs={12} md={8}>
        <StockIntrinsicValueForm />
      </Grid>
      <Grid item xs={12} md={4} sx={{ display: { xs: 'none', md: 'block' } }}>
        <CalculatorSidebar />
      </Grid>
    </Grid>
  );
};

export default StockIntrinsicValuePage;
