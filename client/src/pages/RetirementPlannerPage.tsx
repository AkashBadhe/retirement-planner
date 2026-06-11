import React from 'react';
import { Grid } from '@mui/material';
import RetirementForm from '../components/RetirementForm';
import CalculatorSidebar from '../components/CalculatorSidebar';

const RetirementPlannerPage: React.FC = () => {
  return (
    <Grid container spacing={3}>
      <Grid item xs={12} md={8}>
        <RetirementForm />
      </Grid>
      <Grid item xs={12} md={4} sx={{ display: { xs: 'none', md: 'block' } }}>
        <CalculatorSidebar />
      </Grid>
    </Grid>
  );
};

export default RetirementPlannerPage;
